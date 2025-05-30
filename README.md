# 🎤 Voice AI Assistant

A professional-grade voice chat application built with Next.js, OpenAI APIs, and modern web technologies. This application demonstrates enterprise-ready AI deployment capabilities with real-time voice processing, conversation context, and scalable architecture.

## 🚀 Features

- **Real-time Voice Processing**: Record, transcribe, and respond with natural voice interaction
- **Conversation Context**: Maintains chat history with localStorage persistence
- **Professional UI**: Modern, responsive design following industry best practices
- **OpenAI Integration**: Leverages Whisper for speech-to-text and GPT for intelligent responses
- **Text-to-Speech**: Natural voice responses using OpenAI's TTS models
- **Enterprise-Ready**: Built with TypeScript, proper error handling, and scalable architecture

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI Library**: Chakra UI with Framer Motion animations
- **AI Services**: OpenAI Whisper, GPT-3.5-turbo, TTS
- **Deployment**: Vercel
- **Styling**: Emotion CSS-in-JS

## 📋 Prerequisites

- Node.js 18+ 
- OpenAI API key
- Modern web browser with microphone access

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/voice-ai-assistant.git
cd voice-ai-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Add your OpenAI API key to `.env.local`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add your `OPENAI_API_KEY` to Vercel environment variables
4. Deploy automatically

### Manual Deployment

```bash
npm run build
npm run start
```

## 🎯 Use Cases

- **Customer Service**: Voice-enabled support systems
- **Meeting Assistance**: Real-time transcription and summarization
- **Language Learning**: Conversation practice with AI
- **Accessibility**: Voice-controlled interfaces
- **Content Creation**: Voice-to-text content generation

## 🏗 Architecture

```
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   ├── process-audio.ts    # Main voice processing endpoint
│   │   │   └── audio/[filename].ts # Audio file serving
│   │   ├── _app.tsx                # Chakra UI provider setup
│   │   └── index.tsx               # Main chat interface
│   ├── theme.ts                    # Custom Chakra UI theme
└── package.json
```

## 🔒 Security Features

- Environment variable protection
- Temporary file cleanup
- HTTPS enforcement
- Input validation and sanitization

## 📊 Performance

- Optimized audio processing
- Efficient file management
- Responsive design
- Production-ready build configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for providing the AI APIs
- Vercel for hosting and deployment
- Chakra UI team for the component library

## 📞 Contact

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

---

**Built with ❤️ to showcase enterprise AI deployment capabilities** 