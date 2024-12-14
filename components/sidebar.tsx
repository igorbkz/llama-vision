import React, { useState } from 'react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  onClearChat: (percentage: number) => void
  onToggleDarkMode: () => void
  isDarkMode: boolean
  messageCount: number
}

export function Sidebar({ isOpen, onClose, onClearChat, onToggleDarkMode, isDarkMode, messageCount }: SidebarProps) {
  const [clearPercentage, setClearPercentage] = useState(100)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleClearConfirm = () => {
    onClearChat(clearPercentage)
    setShowClearConfirm(false)
    setClearPercentage(100)
  }

  const messagesToRemove = Math.ceil((messageCount * clearPercentage) / 100)

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity z-20 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed left-0 top-0 bottom-0 w-64 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-lg transform transition-transform z-30 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Menu
            </h2>
            <button
              onClick={onClose}
              className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            {messageCount > 0 && (
              <div className={`p-4 rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-700' 
                  : 'bg-gray-100'
              }`}>
                <div className={`text-sm mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Limpar histórico ({clearPercentage}%)
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={clearPercentage}
                  onChange={(e) => setClearPercentage(Number(e.target.value))}
                  className="w-full"
                />
                <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {messagesToRemove} mensagens mais antigas serão removidas
                </div>
                {!showClearConfirm ? (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className={`mt-2 w-full px-4 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-red-900/20 text-red-300 hover:bg-red-900/30' 
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    }`}
                  >
                    Limpar {clearPercentage}% do histórico
                  </button>
                ) : (
                  <div className="mt-2 space-y-2">
                    <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Confirma a remoção?
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleClearConfirm}
                        className={`flex-1 px-4 py-2 rounded-lg ${
                          isDarkMode 
                            ? 'bg-red-900/20 text-red-300 hover:bg-red-900/30' 
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className={`flex-1 px-4 py-2 rounded-lg ${
                          isDarkMode 
                            ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' 
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onToggleDarkMode}
              className={`w-full px-4 py-2 rounded-lg flex items-center space-x-2 ${
                isDarkMode 
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isDarkMode ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span>Modo Escuro</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

