import { marked } from 'marked'
import { useEffect, useRef } from 'react'
import { estimateMessageTokens } from '@/lib/token-utils'
import Image from 'next/image'

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  image?: string
  showTokenCount?: boolean
}

export function ChatMessage({ role, content, image, showTokenCount = false }: ChatMessageProps) {
  const messageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messageRef.current) {
      const codeBlocks = messageRef.current.querySelectorAll('pre code')
      if (codeBlocks.length > 0) {
        import('highlight.js').then((hljs) => {
          codeBlocks.forEach((block) => {
            hljs.default.highlightElement(block as HTMLElement)
          })
        })
      }
    }
  }, [content])

  const formattedContent = marked(content)
  const tokenCount = showTokenCount ? estimateMessageTokens({ role, content, image }) : 0

  return (
    <div 
      ref={messageRef}
      className={`message p-4 rounded-lg max-w-[80%] ${
        role === 'user' 
          ? 'bg-blue-100 text-blue-900 self-end' 
          : 'bg-gray-100 text-gray-900 self-start'
      }`}
    >
      {image && role === 'user' && (
        <div className="relative w-48 h-48 mb-2">
          <div className="absolute inset-0">
            <Image
              src={image}
              alt="Imagem enviada"
              className="object-cover rounded"
              fill
              sizes="(max-width: 192px) 100vw, 192px"
              priority={false}
            />
          </div>
          {showTokenCount && (
            <div className="absolute bottom-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-tl">
              ~512 tokens
            </div>
          )}
        </div>
      )}
      <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: formattedContent }} />
      {showTokenCount && (
        <div className="mt-2 text-xs text-gray-500">
          Tokens estimados: {tokenCount}
        </div>
      )}
    </div>
  )
}

