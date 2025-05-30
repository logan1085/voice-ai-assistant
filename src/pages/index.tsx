import { useState, useRef, useEffect } from 'react'
import {
  Box,
  Container,
  Heading,
  Text,
  useToast,
  Circle,
  Flex,
  VStack,
  useColorModeValue,
  Icon,
  Button,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { FaMicrophone, FaStop, FaTrash } from 'react-icons/fa'
import { motion } from 'framer-motion'

const MotionCircle = motion(Circle)

interface ChatMessage {
  type: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

const STORAGE_KEY = 'voice_assistant_messages'
const SYSTEM_CONTEXT = `You are a helpful voice assistant. Keep responses natural and brief. You have context of our previous conversation.`

const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`

export default function Home() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  // Theme colors
  const bgColor = useColorModeValue('gray.50', 'gray.900')
  const containerBg = useColorModeValue('white', 'gray.800')
  const userMsgBg = useColorModeValue('blue.500', 'blue.400')
  const assistantMsgBg = useColorModeValue('gray.100', 'gray.700')
  const assistantTextColor = useColorModeValue('gray.800', 'white')

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY)
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages)
        setMessages(parsedMessages)
        setTimeout(scrollToBottom, 100)
      } catch (error) {
        console.error('Error parsing saved messages:', error)
      }
    }
  }, [])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  const clearConversation = () => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
    toast({
      title: 'Conversation Cleared',
      status: 'success',
      duration: 2000,
      isClosable: true,
      position: 'top-right',
    })
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.current = new MediaRecorder(stream)
      audioChunks.current = []

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data)
      }

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' })
        await processAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.current.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      toast({
        title: 'Microphone Access Error',
        description: 'Please check your microphone permissions and try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop()
      setIsRecording(false)
      setIsProcessing(true)
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.wav')
      // Add conversation context
      formData.append('messages', JSON.stringify(messages))

      const response = await fetch('/api/process-audio', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process audio')
      }

      const data = await response.json()
      
      const newMessages: ChatMessage[] = [
        { type: 'user', text: data.text, timestamp: Date.now() },
        { type: 'assistant', text: data.response, timestamp: Date.now() }
      ]
      
      setMessages(prev => [...prev, ...newMessages])

      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl)
        audio.play()
      }

      setTimeout(scrollToBottom, 100)

    } catch (error) {
      console.error('Error processing audio:', error)
      toast({
        title: 'Processing Error',
        description: 'Unable to process your message. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  return (
    <Box minH="100vh" bg={bgColor} py={[4, 8]} px={[4, 0]}>
      <Container 
        maxW="container.md" 
        h={["100vh", "90vh"]} 
        bg={containerBg}
        borderRadius={["none", "2xl"]}
        boxShadow={["none", "2xl"]}
        overflow="hidden"
        p={0}
      >
        {/* Header */}
        <Flex 
          p={6} 
          borderBottom="1px" 
          borderColor="gray.200"
          bg={containerBg}
          align="center"
          justify="space-between"
        >
          <Heading 
            size="lg" 
            fontWeight="semibold"
            bgGradient="linear(to-r, blue.400, purple.500)"
            bgClip="text"
          >
            Voice Assistant
          </Heading>
          <Flex align="center" gap={4}>
            {isProcessing && (
              <Text fontSize="sm" color="gray.500">
                Processing...
              </Text>
            )}
            {messages.length > 0 && (
              <Button
                size="sm"
                leftIcon={<FaTrash />}
                colorScheme="red"
                variant="ghost"
                onClick={clearConversation}
              >
                Clear
              </Button>
            )}
          </Flex>
        </Flex>

        {/* Chat Messages */}
        <Box 
          ref={chatContainerRef}
          flex="1"
          overflowY="auto"
          p={6}
          h="calc(100% - 180px)"
          css={{
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              width: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#cbd5e0',
              borderRadius: '24px',
            },
          }}
        >
          <VStack spacing={4} align="stretch">
            {messages.length === 0 && (
              <Flex 
                direction="column" 
                align="center" 
                justify="center" 
                h="100%" 
                color="gray.500"
                textAlign="center"
                py={10}
              >
                <Icon as={FaMicrophone} w={10} h={10} mb={4} />
                <Text fontSize="lg" fontWeight="medium">Start a Conversation</Text>
                <Text fontSize="sm">Click the microphone button and start speaking</Text>
              </Flex>
            )}
            {messages.map((message, index) => (
              <Flex
                key={index}
                direction="column"
                align={message.type === 'user' ? 'flex-end' : 'flex-start'}
              >
                <Text 
                  fontSize="xs" 
                  color="gray.500" 
                  mb={1}
                  mr={message.type === 'user' ? 2 : 0}
                  ml={message.type === 'assistant' ? 2 : 0}
                >
                  {formatTimestamp(message.timestamp)}
                </Text>
                <Box
                  maxW="80%"
                  bg={message.type === 'user' ? userMsgBg : assistantMsgBg}
                  color={message.type === 'user' ? 'white' : assistantTextColor}
                  px={4}
                  py={3}
                  borderRadius="2xl"
                  borderBottomRightRadius={message.type === 'user' ? '4px' : '2xl'}
                  borderBottomLeftRadius={message.type === 'assistant' ? '4px' : '2xl'}
                  boxShadow="sm"
                >
                  <Text fontSize="md" lineHeight="tall">
                    {message.text}
                  </Text>
                </Box>
              </Flex>
            ))}
          </VStack>
        </Box>

        {/* Recording Controls */}
        <Flex 
          h="100px" 
          justify="center" 
          align="center"
          borderTop="1px"
          borderColor="gray.200"
          bg={containerBg}
          position="relative"
        >
          <MotionCircle
            size="64px"
            bg={isRecording ? "red.500" : "blue.500"}
            color="white"
            cursor="pointer"
            onClick={isRecording ? stopRecording : startRecording}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animation={isRecording ? `${pulseAnimation} 2s infinite` : undefined}
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="lg"
          >
            <Icon 
              as={isRecording ? FaStop : FaMicrophone} 
              w={6} 
              h={6} 
            />
          </MotionCircle>
        </Flex>
      </Container>
    </Box>
  )
} 