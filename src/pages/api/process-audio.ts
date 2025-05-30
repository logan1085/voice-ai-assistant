import type { NextApiRequest, NextApiResponse } from 'next'
import { OpenAI } from 'openai'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Use system temp directory (works in serverless)
const tempDir = os.tmpdir()

interface ChatMessage {
  type: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

const SYSTEM_CONTEXT = `You are a helpful voice assistant with a warm, casual Southern personality. Speak naturally like you're chatting with a good friend from the South. Use expressions like "y'all", "well now", "bless your heart", "fixin' to", "might could", and other Southern phrases. Keep responses friendly, conversational, and brief. Don't overdo the accent - just let that Southern charm shine through naturally.`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      uploadDir: tempDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    })
    
    const [fields, files] = await form.parse(req)
    
    if (!files.audio || !files.audio[0]) {
      return res.status(400).json({ error: 'No audio file provided' })
    }

    const audioFile = files.audio[0]
    const previousMessages = fields.messages ? JSON.parse(fields.messages[0]) : []

    try {
      // 1. Convert speech to text using Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFile.filepath),
        model: "whisper-1",
      })

      // 2. Get GPT response with context
      const messages = [
        { role: "system", content: SYSTEM_CONTEXT },
        ...previousMessages.map((msg: ChatMessage) => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.text
        })),
        { role: "user", content: transcription.text }
      ]

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
      })

      const response = completion.choices[0].message.content

      // 3. Convert response to speech
      const speechResponse = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "coral",
        input: response || "I'm sorry, I couldn't generate a response.",
        instructions: "Speak with a warm, friendly Southern accent and casual tone. Sound relaxed and conversational, like chatting with a good friend on the front porch.",
      })

      // Save the audio buffer in temp directory
      const buffer = Buffer.from(await speechResponse.arrayBuffer())
      const outputPath = path.join(tempDir, `response-${Date.now()}.mp3`)
      fs.writeFileSync(outputPath, buffer)
      
      // Clean up the input file
      fs.unlinkSync(audioFile.filepath)

      // Return the response
      return res.status(200).json({
        text: transcription.text,
        response: response,
        audioUrl: `/api/audio/${path.basename(outputPath)}`,
      })

    } finally {
      // Cleanup: Delete the input file if it still exists
      if (fs.existsSync(audioFile.filepath)) {
        fs.unlinkSync(audioFile.filepath)
      }
    }

  } catch (error) {
    console.error('Error processing audio:', error)
    return res.status(500).json({ error: 'Failed to process audio' })
  }
} 