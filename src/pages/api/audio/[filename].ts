import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { filename } = req.query
  if (typeof filename !== 'string') {
    return res.status(400).json({ error: 'Invalid filename' })
  }

  const filePath = path.join(process.cwd(), 'temp', filename)

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
      fs.unlinkSync(filePath)
    })
  } catch (error) {
    console.error('Error serving audio file:', error)
    res.status(404).json({ error: 'File not found' })
  }
} 