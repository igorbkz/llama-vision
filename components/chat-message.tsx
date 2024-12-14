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
  const tokenCount = showTokenCount ? estimateMessageTokens({ role, content, image }) : null

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`message p-4 rounded-lg max-w-[80%] ${
          isUser
            ? isDarkMode
              ? 'bg-blue-900/30 text-blue-100'
              : 'bg-blue-100 text-blue-900'
            : isDarkMode
              ? 'bg-gray-800 text-gray-100'
              : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="prose prose-sm">
          {image && (
            <div className="mb-2 max-w-[240px]">
              <img 
                src={image} 
                alt="Uploaded content" 
                className="max-h-32 w-full rounded object-contain bg-white" 
              />
            </div>
          )}
          {content.split('\n').map((line, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {line}
            </p>
          ))}
          {showTokenCount && tokenCount && (
            <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {tokenCount} tokens
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

