'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import { TypingIndicator } from '@/components/typing-indicator'
import { Sidebar } from '@/components/sidebar'
import { HfInference } from "@huggingface/inference"
import { estimateTokenCount, selectMessagesForContext } from '@/lib/token-utils'

type MessageRole = 'user' | 'assistant' | 'system'
type Message = {
  role: MessageRole
  content: string
  image?: string
  timestamp: number
}

const MAX_MESSAGE_LENGTH = 900
const SYSTEM_PROMPT = `Você é uma inteligência artificial criada no Brasil.
Você mantém um contexto contínuo da conversa`

const SYSTEM_PROMPT_TOKENS = estimateTokenCount(SYSTEM_PROMPT)

// Inicialize o cliente HfInference fora do componente para evitar recriações desnecessárias
const client = new HfInference(process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY)

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentResponse, setCurrentResponse] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Add dark mode effect
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true'
    setIsDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newValue = !prev
      localStorage.setItem('darkMode', String(newValue))
      if (newValue) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return newValue
    })
  }, [])

  const loadConversationHistory = useCallback(() => {
    try {
      const storedHistory = localStorage.getItem('conversationHistory')
      if (storedHistory) {
        setMessages(JSON.parse(storedHistory))
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    }
  }, [])

  const saveConversationHistory = useCallback((messages: Message[]) => {
    try {
      localStorage.setItem('conversationHistory', JSON.stringify(messages))
    } catch (error) {
      console.error('Erro ao salvar histórico:', error)
    }
  }, [])

  useEffect(() => {
    loadConversationHistory()
  }, [loadConversationHistory])

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentResponse])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const streamResponse = useCallback(async (message: string, history: Message[], currentImageUrl?: string): Promise<string> => {
    if (!process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY) {
      throw new Error('API key não encontrada. Configure NEXT_PUBLIC_HUGGINGFACE_API_KEY no arquivo .env')
    }

    // Prepare messages with proper image handling
    const formattedMessages: any[] = [{ 
      role: 'system', 
      content: SYSTEM_PROMPT 
    }]
    
    // Seleciona mensagens do histórico respeitando o limite de tokens
    const selectedMessages = selectMessagesForContext(
      history.filter(msg => msg.role !== 'system'),
      SYSTEM_PROMPT_TOKENS
    )

    // Process selected messages
    for (const msg of selectedMessages) {
      if (msg.role === 'user') {
        if (msg.image) {
          formattedMessages.push({
            role: 'user',
            content: [
              { type: 'text', text: msg.content || 'Descreva esta imagem em detalhes.' },
              {
                type: 'image_url',
                image_url: {
                  url: msg.image.startsWith('data:') ? msg.image : `data:image/jpeg;base64,${msg.image}`
                }
              }
            ]
          })
        } else {
          formattedMessages.push({
            role: 'user',
            content: msg.content
          })
        }
      } else if (msg.role === 'assistant') {
        formattedMessages.push({
          role: 'assistant',
          content: msg.content
        })
      }
    }

    // Add current message with image if present
    if (currentImageUrl) {
      formattedMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: message || 'Descreva esta imagem em detalhes.' },
          {
            type: 'image_url',
            image_url: {
              url: currentImageUrl.startsWith('data:') ? currentImageUrl : `data:image/jpeg;base64,${currentImageUrl}`
            }
          }
        ]
      })
    } else if (message) {
      formattedMessages.push({
        role: 'user',
        content: message
      })
    }

    try {
      // Definir um timeout para a requisição
      const timeoutMs = 30000 // 30 segundos
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      console.log('Enviando mensagens para API:', JSON.stringify(formattedMessages, null, 2))

      let fullResponse = ''
      const stream = await client.chatCompletionStream({
        model: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
        messages: formattedMessages,
        max_tokens: 900,
        temperature: 0.9,
        top_p: 0.95,
        stream: true,
        signal: controller.signal
      })

      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices.length > 0 && chunk.choices[0].delta?.content) {
          const newContent = chunk.choices[0].delta.content
          fullResponse += newContent
          setCurrentResponse(fullResponse.trim())
        }
      }

      clearTimeout(timeoutId)
      return fullResponse.trim()

    } catch (error) {
      console.error('Erro detalhado na chamada da API:', error)
      
      if (error instanceof Error) {
        console.error('Mensagem de erro:', error.message)
        
        if (error.name === 'AbortError') {
          throw new Error('A requisição demorou muito tempo. Por favor, tente novamente.')
        }
        
        if (error.message.includes('timeout') || error.message.includes('network')) {
          throw new Error('Erro de conexão. Verifique sua internet e tente novamente.')
        }

        if (error.message.includes('image')) {
          throw new Error('Erro ao processar a imagem. Por favor, tente enviar uma imagem menor ou em outro formato.')
        }
      }
      
      throw new Error('Erro ao processar resposta da API. Por favor, tente novamente.')
    }
  }, [])

  const handleSendMessage = useCallback(async (message: string, imageUrl?: string) => {
    setError(null)
    
    if (!message.trim() && !imageUrl) {
      setError('Forneça uma mensagem ou uma imagem')
      return
    }
    
    if (isTyping) {
      setError('Aguarde a resposta anterior ser concluída')
      return
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      setError(`A mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres`)
      return
    }

    const newUserMessage: Message = { 
      role: 'user',
      content: message.trim(),
      image: imageUrl,
      timestamp: Date.now()
    }
    
    // Limpa imagens antigas e seleciona mensagens dentro do limite de contexto
    const cleanedMessages = messages.map(msg => ({
      ...msg,
      image: msg.timestamp < Date.now() - 1800000 ? undefined : msg.image
    }))
    
    const selectedMessages = selectMessagesForContext([...cleanedMessages, newUserMessage], SYSTEM_PROMPT_TOKENS)
    setMessages(selectedMessages)
    setIsTyping(true)
    setCurrentResponse('')
    
    try {
      const finalResponse = await streamResponse(message, selectedMessages, imageUrl)
      
      const newAssistantMessage: Message = { 
        role: 'assistant',
        content: finalResponse.trim(),
        timestamp: Date.now()
      }
      
      // Atualiza mensagens mantendo apenas as que cabem no contexto
      const updatedMessages = selectMessagesForContext([...selectedMessages, newAssistantMessage], SYSTEM_PROMPT_TOKENS)
      setMessages(updatedMessages)
      saveConversationHistory(updatedMessages)
      
    } catch (error) {
      console.error('Erro detalhado:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido'
      setError(errorMessage)
      const errorResponse: Message = { 
        role: 'assistant',
        content: `Desculpe, ocorreu um erro ao processar sua mensagem. ${
          imageUrl ? 'Isso pode ter acontecido devido a um problema com a imagem. ' : ''
        }Por favor, tente novamente.`,
        timestamp: Date.now()
      }
      
      const updatedMessages = selectMessagesForContext([...selectedMessages, errorResponse], SYSTEM_PROMPT_TOKENS)
      setMessages(updatedMessages)
      saveConversationHistory(updatedMessages)
    } finally {
      setIsTyping(false)
      setCurrentResponse('')
    }
  }, [messages, isTyping, saveConversationHistory, streamResponse])

  const handleClearChat = useCallback((percentage: number) => {
    setMessages(prevMessages => {
      if (percentage === 100) {
        localStorage.removeItem('conversationHistory')
        return []
      }
      const messagesToKeep = Math.floor(prevMessages.length * (1 - percentage / 100))
      const newMessages = prevMessages.slice(-messagesToKeep)
      localStorage.setItem('conversationHistory', JSON.stringify(newMessages))
      return newMessages
    })
    setError(null)
  }, [])

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        onClearChat={handleClearChat}
        onToggleDarkMode={toggleDarkMode}
        isDarkMode={isDarkMode}
        messageCount={messages.length}
      />
      <div className="flex flex-col flex-grow">
        <header className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b p-4 flex justify-between items-center`}>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className={`${isDarkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-500 hover:text-gray-700'} focus:outline-none`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
            {messages.length} mensagens
          </div>
        </header>
        <div className={`flex-grow overflow-auto p-4 space-y-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`} id="messages">
          {messages
            .filter((message): message is Message & { role: 'user' | 'assistant' } => 
              message.role === 'user' || message.role === 'assistant'
            )
            .map((message, index) => (
              <ChatMessage 
                key={index} 
                role={message.role} 
                content={message.content}
                image={message.image}
                showTokenCount={true}
                isDarkMode={isDarkMode}
              />
            ))}
          {isTyping && (
            <div className={`message ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-900'} self-start p-4 rounded-lg max-w-[80%]`}>
              <div className="prose prose-sm">
                {currentResponse || <TypingIndicator />}
              </div>
            </div>
          )}
          {error && (
            <div className={`text-red-500 text-sm p-2 ${isDarkMode ? 'bg-red-900/20' : 'bg-red-50'} rounded`}>
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className={`border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} p-4`}>
          <ChatInput 
            onSendMessage={handleSendMessage}
            disabled={isTyping}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  )
}
          
