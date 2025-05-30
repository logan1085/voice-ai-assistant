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
  Badge,
  HStack,
  Progress,
  Divider,
  Stack,
  Spinner,
  Avatar,
} from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { FaMicrophone, FaStop, FaTwitter, FaUser, FaHeadset } from 'react-icons/fa'
import { motion } from 'framer-motion'

const MotionCircle = motion(Circle)
const MotionBox = motion(Box)

interface ChatMessage {
  type: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

const STORAGE_KEY = 'equinox_cancellation_game'
const SCORE_KEY = 'equinox_game_score'

const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`

const typingAnimation = keyframes`
  0%, 20% { opacity: 0.3; }
  50% { opacity: 1; }
  80%, 100% { opacity: 0.3; }
`

const difficultyColors: { [key: number]: string } = {
  1: 'green',
  2: 'yellow', 
  3: 'orange',
  4: 'red',
  5: 'purple'
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [currentUserInput, setCurrentUserInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [gameScore, setGameScore] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [difficulty, setDifficulty] = useState(1)
  const [gameWon, setGameWon] = useState(false)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  // Equinox luxury theme colors
  const bgColor = 'black'
  const containerBg = useColorModeValue('gray.900', 'gray.900')
  const headerBg = 'black'
  const userMsgBg = '#FFD700' // Gold
  const assistantMsgBg = useColorModeValue('gray.800', 'gray.700')
  const assistantTextColor = 'white'
  const goldAccent = '#FFD700'

  // Load game state from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY)
    const savedScore = localStorage.getItem(SCORE_KEY)
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages)
        setMessages(parsedMessages)
        setTimeout(scrollToBottom, 100)
      } catch (error) {
        console.error('Error parsing saved messages:', error)
      }
    }
    if (savedScore) {
      setGameScore(parseInt(savedScore))
    }
  }, [])

  // Save game state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    localStorage.setItem(SCORE_KEY, gameScore.toString())
  }, [messages, gameScore])

  // Update difficulty based on attempts
  useEffect(() => {
    setDifficulty(Math.min(5, Math.floor(attempts / 2) + 1))
  }, [attempts])

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  const checkForWin = (userMessage: string) => {
    const winPhrases = [
      'cancel',
      'unsubscribe',
      'end membership',
      'stop service',
      'terminate',
      'quit'
    ]
    return winPhrases.some(phrase => userMessage.toLowerCase().includes(phrase))
  }

  const shareToTwitter = () => {
    const text = `I just tried to cancel my Equinox membership and Chad lost his mind after ${attempts} attempts! 💪😤 Can you escape the gym? #EquinoxEscape`
    const url = window.location.href
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
  }

  const newGame = () => {
    setMessages([])
    setGameScore(0)
    setAttempts(0)
    setDifficulty(1)
    setGameWon(false)
    setCurrentUserInput('')
    setIsTyping(false)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(SCORE_KEY)
    toast({
      title: 'New Cancellation Attempt',
      description: 'Good luck!',
      status: 'info',
      duration: 2000,
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
        title: 'Microphone Access Required',
        description: 'Please allow microphone access',
        status: 'error',
        duration: 3000,
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
      formData.append('messages', JSON.stringify(messages))
      formData.append('difficulty', difficulty.toString())
      formData.append('attempts', attempts.toString())

      const response = await fetch('/api/process-audio', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process audio')
      }

      const data = await response.json()
      
      // Add user message first
      setCurrentUserInput(data.text)
      setMessages(prev => [...prev, { type: 'user', text: data.text, timestamp: Date.now() }])
      
      // Show typing indicator
      setIsTyping(true)
      setTimeout(scrollToBottom, 100)
      
      // Add assistant response after a delay
      setTimeout(() => {
        setMessages(prev => [...prev, { type: 'assistant', text: data.response, timestamp: Date.now() }])
        setIsTyping(false)
        setCurrentUserInput('')
        setTimeout(scrollToBottom, 100)
      }, 1500)

      setAttempts(prev => prev + 1)
      
      if (checkForWin(data.text)) {
        setGameScore(prev => prev + 15)
      } else {
        setGameScore(prev => prev + 5)
      }

      if (data.audioUrl) {
        // Play audio after the typing delay
        setTimeout(() => {
          const audio = new Audio(data.audioUrl)
          audio.play()
        }, 1500)
      }

    } catch (error) {
      console.error('Error processing audio:', error)
      toast({
        title: 'Connection Error',
        description: 'Unable to connect to retention specialist',
        status: 'error',
        duration: 3000,
        position: 'top-right',
      })
      setIsTyping(false)
      setCurrentUserInput('')
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

  const getChadMoodEmoji = () => {
    if (attempts <= 2) return '😊'
    if (attempts <= 4) return '😅'
    if (attempts <= 6) return '😰'
    if (attempts <= 8) return '😡'
    return '🤯'
  }

  return (
    <Box h="100vh" bg="white" overflow="hidden">
      <Flex h="100vh">
        {/* Left Side - Equinox Branding */}
        <Box flex="1" bg="black" color="white" display="flex" flexDirection="column">
          {/* Header */}
          <Box p={6} borderBottom="1px solid" borderColor="gray.700">
            <Heading 
              fontSize="2xl" 
              fontWeight="400" 
              letterSpacing="0.2em"
              textTransform="uppercase"
            >
              EQUINOX
            </Heading>
          </Box>

          {/* Main Content */}
          <Flex flex="1" align="center" justify="center" p={8}>
            <VStack spacing={8} textAlign="center" maxW="md">
              <VStack spacing={4}>
                <Heading 
                  fontSize="4xl" 
                  fontWeight="300" 
                  letterSpacing="0.1em"
                  textTransform="uppercase"
                  lineHeight="0.9"
                >
                  THE <Text as="span" textDecoration="line-through">MEMBERSHIP</Text>
                </Heading>
                <Heading 
                  fontSize="4xl" 
                  fontWeight="300" 
                  letterSpacing="0.1em"
                  textTransform="uppercase"
                >
                  CANCELLATION
                </Heading>
                <Text fontSize="lg" fontWeight="300" mt={4} opacity={0.8}>
                  Try to cancel your membership.<br />
                  Chad won't make it easy.
                </Text>
              </VStack>

              {/* Game Stats */}
              <VStack spacing={6} pt={8}>
                <HStack spacing={8}>
                  <VStack spacing={1}>
                    <Text fontSize="xs" opacity={0.6} textTransform="uppercase" letterSpacing="wider">Chad's Mood</Text>
                    <Text fontSize="2xl">{getChadMoodEmoji()}</Text>
                  </VStack>
                  <VStack spacing={1}>
                    <Text fontSize="xs" opacity={0.6} textTransform="uppercase" letterSpacing="wider">Score</Text>
                    <Text fontSize="xl" fontWeight="300">{gameScore}</Text>
                  </VStack>
                  <VStack spacing={1}>
                    <Text fontSize="xs" opacity={0.6} textTransform="uppercase" letterSpacing="wider">Attempts</Text>
                    <Text fontSize="xl" fontWeight="300">{attempts}</Text>
                  </VStack>
                </HStack>

                {/* Progress Bar */}
                {attempts > 0 && (
                  <VStack spacing={2} w="full">
                    <Text fontSize="xs" textTransform="uppercase" letterSpacing="wide" opacity={0.6}>
                      Desperation Level
                    </Text>
                    <Progress 
                      value={difficulty * 20} 
                      size="sm" 
                      bg="gray.800"
                      sx={{
                        '& > div': {
                          background: difficulty >= 4 ? 'red.500' : difficulty >= 2 ? 'yellow.500' : 'green.500'
                        }
                      }}
                      w="full"
                    />
                  </VStack>
                )}
              </VStack>

              {/* Action Buttons */}
              <VStack spacing={3} pt={4} w="full">
                <Button 
                  onClick={shareToTwitter}
                  size="lg"
                  bg="white"
                  color="black"
                  _hover={{ bg: "gray.100" }}
                  textTransform="uppercase"
                  letterSpacing="wide"
                  fontWeight="400"
                  w="full"
                  isDisabled={attempts === 0}
                >
                  Share Progress
                </Button>
                <Button 
                  onClick={newGame}
                  size="lg"
                  variant="outline"
                  borderColor="white"
                  color="white"
                  _hover={{ bg: "whiteAlpha.100" }}
                  textTransform="uppercase"
                  letterSpacing="wide"
                  fontWeight="400"
                  w="full"
                >
                  New Attempt
                </Button>
              </VStack>
            </VStack>
          </Flex>
        </Box>

        {/* Right Side - Chat Interface */}
        <Box flex="1" bg="white" display="flex" flexDirection="column" borderLeft="1px solid" borderColor="gray.200">
          {/* Chat Header */}
          <Box p={4} borderBottom="1px solid" borderColor="gray.200" bg="gray.50">
            <HStack spacing={3}>
              <Avatar size="sm" bg="blue.500" icon={<FaHeadset />} />
              <VStack align="start" spacing={0}>
                <Text fontSize="sm" fontWeight="500">Chad - Retention Specialist</Text>
                <Text fontSize="xs" color="gray.600">
                  {isTyping ? 'Typing...' : 'Online'}
                </Text>
              </VStack>
            </HStack>
          </Box>

          {/* Chat Messages */}
          <Box 
            ref={chatContainerRef}
            flex="1"
            overflowY="auto"
            p={4}
            css={{
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#E2E8F0',
                borderRadius: '2px',
              },
            }}
          >
            <VStack spacing={4} align="stretch">
              {messages.length === 0 && (
                <VStack spacing={4} py={8} textAlign="center" color="gray.500">
                  <Text fontSize="4xl">💬</Text>
                  <VStack spacing={2}>
                    <Text fontWeight="500">Welcome to Equinox Customer Service</Text>
                    <Text fontSize="sm">Press the microphone to speak with Chad</Text>
                    <Text fontSize="xs" color="gray.400">
                      Your mission: Try to cancel your membership
                    </Text>
                  </VStack>
                </VStack>
              )}

              {messages.map((message, index) => (
                <MotionBox
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Flex justify={message.type === 'user' ? 'flex-end' : 'flex-start'} mb={2}>
                    <VStack 
                      align={message.type === 'user' ? 'flex-end' : 'flex-start'} 
                      spacing={1}
                      maxW="80%"
                    >
                      <Text fontSize="xs" color="gray.500">
                        {message.type === 'user' ? 'You' : 'Chad'} • {formatTimestamp(message.timestamp)}
                      </Text>
                      <Box
                        bg={message.type === 'user' ? 'blue.500' : 'gray.100'}
                        color={message.type === 'user' ? 'white' : 'black'}
                        px={4}
                        py={3}
                        borderRadius="lg"
                        borderBottomRightRadius={message.type === 'user' ? '4px' : 'lg'}
                        borderBottomLeftRadius={message.type === 'assistant' ? '4px' : 'lg'}
                      >
                        <Text fontSize="sm" lineHeight="1.4">
                          {message.text}
                        </Text>
                      </Box>
                    </VStack>
                  </Flex>
                </MotionBox>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <MotionBox
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Flex justify="flex-start" mb={2}>
                    <VStack align="flex-start" spacing={1} maxW="80%">
                      <Text fontSize="xs" color="gray.500">Chad • typing...</Text>
                      <Box bg="gray.100" px={4} py={3} borderRadius="lg" borderBottomLeftRadius="4px">
                        <HStack spacing={1}>
                          <Box
                            w="8px"
                            h="8px"
                            bg="gray.400"
                            borderRadius="full"
                            animation={`${typingAnimation} 1.4s infinite ease-in-out`}
                          />
                          <Box
                            w="8px"
                            h="8px"
                            bg="gray.400"
                            borderRadius="full"
                            animation={`${typingAnimation} 1.4s infinite ease-in-out 0.2s`}
                          />
                          <Box
                            w="8px"
                            h="8px"
                            bg="gray.400"
                            borderRadius="full"
                            animation={`${typingAnimation} 1.4s infinite ease-in-out 0.4s`}
                          />
                        </HStack>
                      </Box>
                    </VStack>
                  </Flex>
                </MotionBox>
              )}
            </VStack>
          </Box>

          {/* Recording Controls */}
          <Box p={4} borderTop="1px solid" borderColor="gray.200" bg="gray.50">
            <VStack spacing={3}>
              <HStack spacing={4} w="full" justify="center">
                <MotionCircle
                  size="60px"
                  bg={isRecording ? "red.500" : "blue.500"}
                  color="white"
                  cursor="pointer"
                  onClick={isRecording ? stopRecording : startRecording}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animation={isRecording ? `${pulseAnimation} 1.5s infinite` : undefined}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  isDisabled={isProcessing || isTyping}
                  opacity={isProcessing || isTyping ? 0.5 : 1}
                >
                  {isProcessing ? (
                    <Spinner size="sm" />
                  ) : (
                    <Icon 
                      as={isRecording ? FaStop : FaMicrophone} 
                      w={5} 
                      h={5} 
                    />
                  )}
                </MotionCircle>
              </HStack>
              <Text fontSize="xs" color="gray.600" textAlign="center">
                {isProcessing ? "Processing..." : isRecording ? "Recording - Click to stop" : "Hold to speak"}
              </Text>
            </VStack>
          </Box>
        </Box>
      </Flex>
    </Box>
  )
} 