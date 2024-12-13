/**
 * Redimensiona uma imagem mantendo a proporção e otimizando a qualidade
 * @param file Arquivo de imagem a ser redimensionado
 * @returns Promise com o Blob da imagem redimensionada
 */
export const resizeImage = (file: File): Promise<Blob> => {
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