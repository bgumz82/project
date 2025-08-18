import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  ClipboardDocumentCheckIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'

export default function MobileHome() {
  const { userType } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!userType) return

    if (userType === 'operador_checklist') {
      navigate('/m/checklist', { replace: true })
    } else if (userType === 'operador_abastecimento') {
      navigate('/m/abastecimento', { replace: true })
    }
  }, [userType, navigate])

  // Show loading state while checking user type
  if (!userType || userType === 'operador_checklist' || userType === 'operador_abastecimento') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-indigo-600 pb-32">
        <header className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Sistema de Frota
            </h1>
          </div>
        </header>
      </div>

      <main className="-mt-32">
        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-white px-5 py-6 shadow sm:px-6">
            <div className="grid grid-cols-1 gap-6">
              <button
                onClick={() => navigate('/m/checklist')}
                className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400"
              >
                <div className="flex-shrink-0">
                  <ClipboardDocumentCheckIcon className="h-10 w-10 text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Checklist</p>
                  <p className="truncate text-sm text-gray-500">
                    Realizar checklist do veículo
                  </p>
                </div>
              </button>

              <button
                onClick={() => navigate('/m/abastecimento')}
                className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400"
              >
                <div className="flex-shrink-0">
                  <WrenchScrewdriverIcon className="h-10 w-10 text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Abastecimento</p>
                  <p className="truncate text-sm text-gray-500">
                    Registrar abastecimento
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}