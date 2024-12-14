interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  image?: string
  timestamp: number
}

/**
 * Estimativa aproximada de tokens baseada em caracteres
 * Esta é uma estimativa simples, não é 100% precisa mas serve como base
 */
export function estimateTokenCount(text: string): number {
  // Em média, 1 token = ~3 caracteres em português (sendo mais conservador)
  return Math.ceil(text.length / 3)
}

/**
 * Estima tokens para uma mensagem completa incluindo imagem
 */
export function estimateMessageTokens(message: Message): number {
  let total = estimateTokenCount(message.content)
  
  // Uma imagem consome aproximadamente 512 tokens no modelo Llama Vision
  // Adicionamos uma margem de segurança para metadados e processamento
  if (message.image) {
    total += 650
  }
  
  // Adiciona tokens para role e outros metadados
  total += 4
  
  return total
}

// Limite máximo de tokens para o contexto (Llama Vision suporta ~4096 tokens)
export const MAX_CONTEXT_TOKENS = 4000

/**
 * Seleciona mensagens para manter no contexto respeitando o limite de tokens
 * Mantém sempre as mensagens mais recentes
 */
export function selectMessagesForContext(
  messages: Message[],
  systemPromptTokens: number
): Message[] {
  let totalTokens = systemPromptTokens
  const selectedMessages: Message[] = []
  
  // Itera do mais recente para o mais antigo
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    const messageTokens = estimateMessageTokens(message)
    
    // Mantém uma margem de segurança de 15% do limite para evitar colapso
    const safeLimit = MAX_CONTEXT_TOKENS * 0.85
    
    // Verifica se adicionar esta mensagem excederia o limite
    if (totalTokens + messageTokens > safeLimit) {
      break
    }
    
    totalTokens += messageTokens
    selectedMessages.unshift(message) // Adiciona no início para manter a ordem cronológica
  }
  
  return selectedMessages
} 