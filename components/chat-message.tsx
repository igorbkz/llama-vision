import { marked } from 'marked'
import { useEffect, useRef } from 'react'

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  image?: string
}

export function ChatMessage({ role, content, image }: ChatMessageProps) {
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
            <img
              src={image}
              alt="Imagem enviada"
              className="object-cover w-full h-full rounded"
            />
          </div>
        </div>
      )}
      <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: formattedContent }} />
    </div>
  )
}

