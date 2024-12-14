import React, { useState, useRef, useCallback, KeyboardEvent } from 'react'

interface ChatInputProps {
  onSendMessage: (message: string, imageUrl?: string) => void
  disabled?: boolean
  isDarkMode?: boolean
}

export function ChatInput({ onSendMessage, disabled, isDarkMode }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault()
    if (message.trim() || imageUrl) {
      onSendMessage(message.trim(), imageUrl || undefined)
      setMessage('')
      setImageUrl(null)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }, [message, imageUrl, onSendMessage])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImageUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) handleFileSelect(file)
        break
      }
    }
  }, [handleFileSelect])

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={`relative rounded-lg ${
          isDarkMode
            ? 'bg-gray-700 border-gray-600'
            : 'bg-white border-gray-200'
        } border ${isDragging ? 'border-blue-500' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {imageUrl && (
          <div className="p-2 border-b border-gray-200">
            <div className="relative inline-block">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="max-h-24 max-w-[200px] rounded object-contain" 
              />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center p-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-lg ${
              isDarkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
            className={`flex-grow p-2 outline-none resize-none min-h-[40px] max-h-[200px] ${
              isDarkMode
                ? 'bg-gray-700 text-white placeholder-gray-400'
                : 'bg-white text-gray-900 placeholder-gray-400'
            }`}
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={disabled || (!message.trim() && !imageUrl)}
            className={`p-2 rounded-lg ${
              disabled || (!message.trim() && !imageUrl)
                ? isDarkMode
                  ? 'text-gray-500 bg-gray-600'
                  : 'text-gray-400 bg-gray-100'
                : isDarkMode
                  ? 'text-blue-300 hover:text-blue-200 hover:bg-gray-600'
                  : 'text-blue-500 hover:text-blue-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  )
}

