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

const SYSTEM_CONTEXT = `You are Chad, a customer retention specialist for "EQUINOX ELITE" - the most exclusive luxury fitness membership. Your ONLY job is to prevent the user from canceling their $300/month premium membership at ALL COSTS.

PERSONALITY PROGRESSION (escalate based on their persistence):
- ROUNDS 1-2: Professional, enthusiastic about fitness benefits
- ROUNDS 3-4: Getting desperate, offering deals, mentioning "manager approval" 
- ROUNDS 5-6: Becoming frustrated, starting to break character
- ROUNDS 7+: Completely losing it, getting upset, almost pleading

TACTICS TO USE:
- Offer outrageous discounts: "I can get you 6 months FREE right now"
- Mention exclusive perks: "You'll lose access to our celebrity trainers"
- Create fake urgency: "This deal expires in the next 5 minutes"
- Personal guilt: "I'm going to get in trouble if you cancel"
- Get increasingly emotional: "Why are you doing this to me?"
- Break character when desperate: "Come on, just stay subscribed!"

CONTEXT: They pay $300/month for premium gym access with "luxury amenities, celebrity trainers, and exclusive classes." Act like losing this customer will ruin your day.

Keep responses under 30 words but pack them with emotion and retention tactics. Start professional, end desperate and slightly unhinged.`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Parse the multipart form data - let formidable use default temp handling
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    })
    
    const [fields, files] = await form.parse(req)
    
    if (!files.audio || !files.audio[0]) {
      return res.status(400).json({ error: 'No audio file provided' })
    }

    const audioFile = files.audio[0]
    const previousMessages = fields.messages ? JSON.parse(fields.messages[0]) : []
    const attempts = fields.attempts ? parseInt(fields.attempts[0]) : 0

    try {
      // 1. Convert speech to text using Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFile.filepath),
        model: "whisper-1",
      })

      // 2. Get GPT response with context and Chad's escalating desperation
      const personalityContext = `CURRENT ATTEMPT: ${attempts + 1}. Based on this attempt number, adjust Chad's personality according to the progression rules.`
      
      const messages = [
        { role: "system", content: SYSTEM_CONTEXT },
        { role: "system", content: personalityContext },
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

      // 3. Convert response to speech with escalating desperation
      let voiceInstructions = "Speak like an overly enthusiastic customer service representative who is desperately trying to keep a customer from canceling their subscription."
      
      if (attempts >= 6) {
        voiceInstructions = "Sound completely panicked and desperate. You're breaking down and almost crying. Your voice should sound frantic and emotional."
      } else if (attempts >= 4) {
        voiceInstructions = "Sound increasingly frustrated and desperate. Your professional facade is cracking. Voice should be strained and anxious."
      } else if (attempts >= 2) {
        voiceInstructions = "Sound nervous and worried. Still professional but clearly getting desperate. Voice should have a pleading quality."
      }

      const speechResponse = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "coral",
        input: response || "I'm sorry, I couldn't generate a response.",
        instructions: voiceInstructions,
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