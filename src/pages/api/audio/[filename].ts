import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import os from 'os'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { filename } = req.query
  if (typeof filename !== 'string') {
    return res.status(400).json({ error: 'Invalid filename' })
  }

  // Use system temp directory
  const filePath = path.join(os.tmpdir(), filename)

  try {
    const stat = fs.statSync(filePath)
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': stat.size,
    })
    const readStream = fs.createReadStream(filePath)
    readStream.pipe(res)
    
    // Delete the file after it's been sent
    readStream.on('end', () => {
      try {
        fs.unlinkSync(filePath)
      } catch (error) {
        console.error('Error deleting temp file:', error)
      }
    })
  } catch (error) {
    console.error('Error serving audio file:', error)
    res.status(404).json({ error: 'File not found' })
  }
} 