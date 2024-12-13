'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import { TypingIndicator } from '@/components/typing-indicator'
import { ClearChatButton } from '@/components/clear-chat-button'
import { Sidebar } from '@/components/sidebar'
import { HfInference } from "@huggingface/inference"
import { estimateTokenCount, estimateMessageTokens, selectMessagesForContext, MAX_CONTEXT_TOKENS } from '@/lib/token-utils'

type MessageRole = 'user' | 'assistant' | 'system'
type Message = {
  role: MessageRole
  content: string
  image?: string
  timestamp: number
}

const MAX_MESSAGE_LENGTH = 900
const SYSTEM_PROMPT = `Hendrix, você é um assistente de IA criado no Brasil.

Você mantém um contexto contínuo da conversa, mas o usuário pode apagar ele para reiniciar o histórico.
Responda de forma clara e direta em português, e use o contexto atual para personalizar suas respostas.`

const SYSTEM_PROMPT_TOKENS = estimateTokenCount(SYSTEM_PROMPT)

// Inicialize o cliente HfInference fora do componente para evitar recriações desnecessárias
const client = new HfInference(process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY)

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentResponse, setCurrentResponse] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [contextTokens, setContextTokens] = useState(SYSTEM_PROMPT_TOKENS)

  useEffect(() => {
    loadConversationHistory()
  }, [loadConversationHistory])

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentResponse])

  useEffect(() => {
    const tokens = messages.reduce((total, msg) => 
      total + estimateMessageTokens(msg), SYSTEM_PROMPT_TOKENS)
    setContextTokens(tokens)
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

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
    
    setMessages(prevMessages => [...prevMessages, newUserMessage])
    setIsTyping(true)
    setCurrentResponse('')
    
    try {
      const finalResponse = await streamResponse(message, messages, imageUrl)
      
      const newAssistantMessage: Message = { 
        role: 'assistant',
        content: finalResponse.trim(),
        timestamp: Date.now()
      }
      
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, newAssistantMessage].slice(-MAX_CONTEXT_TOKENS)
        saveConversationHistory(updatedMessages)
        return updatedMessages
      })
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
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages, errorResponse]
        saveConversationHistory(updatedMessages)
        return updatedMessages
      })
    } finally {
      setIsTyping(false)
      setCurrentResponse('')
    }
  }, [messages, isTyping, saveConversationHistory, streamResponse])

  const streamResponse = useCallback(async (message: string, history: Message[], currentImageUrl?: string): Promise<string> => {
    if (!process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY) {
      throw new Error('API key não encontrada. Configure NEXT_PUBLIC_HUGGINGFACE_API_KEY no arquivo .env')
    }

    // Prepare messages with proper image handling
    const formattedMessages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }]
    
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
              { type: 'text', text: msg.content || 'Analise esta imagem por favor.' },
              { 
                type: 'image_url',
                image_url: {
                  url: msg.image,
                  detail: 'high'
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
          role: msg.role,
          content: msg.content
        })
      }
    }

    // Add current message with image if present
    if (currentImageUrl) {
      formattedMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: message || 'Analise esta imagem por favor.' },
          { 
            type: 'image_url',
            image_url: {
              url: currentImageUrl,
              detail: 'high'
            }
          }
        ]
      })
    } else {
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

      let fullResponse = ''
      const stream = await client.chatCompletionStream({
        model: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
        messages: formattedMessages,
        max_tokens: 1000,
        temperature: 0.7,
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

  const handleClearChat = useCallback(() => {
    setMessages([])
    setError(null)
    localStorage.removeItem('conversationHistory')
  }, [])

  const loadConversationHistory = useCallback(() => {
    try {
      const storedHistory = localStorage.getItem('conversationHistory')
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory)
        if (Array.isArray(parsedHistory)) {
          setMessages(parsedHistory.slice(-MAX_CONTEXT_TOKENS))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
      localStorage.removeItem('conversationHistory')
    }
  }, [])

  const saveConversationHistory = useCallback((history: Message[]) => {
    try {
      localStorage.setItem('conversationHistory', JSON.stringify(history.slice(-MAX_CONTEXT_TOKENS)))
    } catch (error) {
      console.error('Erro ao salvar histórico:', error)
    }
  }, [])

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col flex-grow">
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-sm text-gray-500">
            Contexto: {contextTokens}/{MAX_CONTEXT_TOKENS} tokens
          </div>
        </header>
        <div className="flex-grow overflow-auto p-4 space-y-4" id="messages">
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
              />
            ))}
          {isTyping && (
            <div className="message bg-gray-100 text-gray-900 self-start p-4 rounded-lg max-w-[80%]">
              <div className="prose prose-sm">
                {currentResponse || <TypingIndicator />}
              </div>
            </div>
          )}
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t border-gray-200 p-4">
          <ChatInput 
            onSendMessage={handleSendMessage}
            disabled={isTyping} 
          />
          <div className="mt-2 flex justify-center space-x-4">
            <ClearChatButton onClearChat={handleClearChat} />
            {contextTokens > MAX_CONTEXT_TOKENS * 0.9 && (
              <div className="text-yellow-600 text-sm">
                Contexto próximo do limite. Considere limpar o histórico.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
          
