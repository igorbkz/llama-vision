import { useState, useRef } from 'react'
import { Send, Image as ImageIcon, Camera, X } from 'lucide-react'

interface ChatInputProps {
  onSendMessage: (message: string, imageUrl?: string) => void
  disabled?: boolean
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((input.trim() || imageUrl) && !disabled && !isProcessing) {
      onSendMessage(input.trim(), imageUrl || undefined)
      setInput('')
      setImageUrl(null)
      setError(null)
    }
  }

  const processImage = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 10MB')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Redimensionar a imagem antes de converter para base64
      const resizedImage = await resizeImage(file)
      const reader = new FileReader()
      
      reader.onloadend = () => {
        const base64 = reader.result as string
        setImageUrl(base64)
        setIsProcessing(false)
      }
      
      reader.onerror = () => {
        setError('Erro ao processar a imagem. Tente novamente.')
        setIsProcessing(false)
      }
      
      reader.readAsDataURL(resizedImage)
    } catch (error) {
      console.error('Error processing image:', error)
      setError('Erro ao processar a imagem. Tente novamente.')
      setImageUrl(null)
      setIsProcessing(false)
    }
  }

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img')
      const reader = new FileReader()

      reader.onload = (e) => {
        img.src = e.target?.result as string
        
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Mantém uma resolução mínima para garantir detalhes suficientes
          const minSize = 400
          const maxSize = 1024
          
          if (width < minSize && height < minSize) {
            // Se a imagem for muito pequena, mantém o tamanho original
            width = img.width
            height = img.height
          } else if (width > height && width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          } else if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
          
          // Garante que as dimensões sejam números inteiros
          width = Math.round(width)
          height = Math.round(height)
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Não foi possível criar o contexto do canvas'))
            return
          }
          
          // Aplica suavização para melhor qualidade
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          
          // Limpa o canvas antes de desenhar
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
          
          // Desenha a imagem
          ctx.drawImage(img, 0, 0, width, height)
          
          // Tenta manter a qualidade mais alta possível
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Se o blob for muito grande, reduz a qualidade gradualmente
                if (blob.size > 1024 * 1024 * 2) { // 2MB
                  canvas.toBlob(
                    (reducedBlob) => {
                      if (reducedBlob) {
                        resolve(reducedBlob)
                      } else {
                        reject(new Error('Erro ao comprimir imagem'))
                      }
                    },
                    'image/jpeg',
                    0.8
                  )
                } else {
                  resolve(blob)
                }
              } else {
                reject(new Error('Erro ao comprimir imagem'))
              }
            },
            'image/jpeg',
            0.95 // Alta qualidade inicial
          )
        }
        
        img.onerror = () => {
          reject(new Error('Erro ao carregar imagem'))
        }
      }

      reader.onerror = () => {
        reject(new Error('Erro ao ler arquivo'))
      }

      reader.readAsDataURL(file)
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processImage(file)
    }
  }

  return (
    <div className="space-y-2">
      {imageUrl && (
        <div className="relative w-24 h-24 mx-2">
          <div className="absolute inset-0">
            <img
              src={imageUrl}
              alt="Imagem anexada"
              className="object-cover w-full h-full rounded"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setImageUrl(null)
              setError(null)
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>
      )}
      
      {error && (
        <div className="text-red-500 text-sm px-2">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            disabled ? "Aguarde a resposta..." : 
            isProcessing ? "Processando imagem..." :
            "Digite sua mensagem..."
          }
          disabled={disabled || isProcessing}
          className="flex-grow p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
        />
        
        {/* Input para galeria */}
        <label className={`cursor-pointer p-2 rounded-full transition-colors ${
          disabled || isProcessing
            ? 'text-gray-400 bg-gray-100'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            disabled={disabled || isProcessing}
          />
          <ImageIcon size={20} />
        </label>

        {/* Input para câmera */}
        <label className={`cursor-pointer p-2 rounded-full transition-colors ${
          disabled || isProcessing
            ? 'text-gray-400 bg-gray-100'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            className="hidden"
            disabled={disabled || isProcessing}
          />
          <Camera size={20} />
        </label>

        <button
          type="submit"
          disabled={(!input.trim() && !imageUrl) || disabled || isProcessing}
          className="bg-blue-500 text-white p-2 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 ease-in-out hover:bg-blue-600"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}

