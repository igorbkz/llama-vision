import React from 'react'
import { estimateMessageTokens } from '@/lib/token-utils'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  image?: string
  showTokenCount?: boolean
  isDarkMode?: boolean
}

export function ChatMessage({ role, content, image, showTokenCount, isDarkMode }: ChatMessageProps) {
  const isUser = role === 'user'
  const tokenCount = showTokenCount ? estimateMessageTokens({ role, content, image, timestamp: Date.now() }) : null

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`message ${
        isUser 
          ? isDarkMode
            ? 'bg-blue-900/30 text-blue-100'
            : 'bg-blue-100 text-blue-900'
          : isDarkMode
            ? 'bg-gray-800 text-gray-100'
            : 'bg-gray-100 text-gray-900'
      } p-4 rounded-lg max-w-[80%] relative`}>
        <div className="prose prose-sm">
          {image && (
            <div className="mb-2">
              <img 
                src={image} 
                alt="Imagem enviada pelo usuário" 
                className="max-w-full rounded-lg"
                style={{ maxHeight: '300px', objectFit: 'contain' }}
              />
            </div>
          )}
          {content && (
            <div className="whitespace-pre-wrap">{content}</div>
          )}
          {tokenCount && (
            <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {tokenCount} tokens
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

