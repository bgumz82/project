import { useRef, useState, useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

interface QRCodeScannerProps {
  onScan: (data: string) => void
}

export default function QRCodeScanner({ onScan }: QRCodeScannerProps) {
  const qrRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const startScanner = async () => {
      try {
        // Request camera permission explicitly
        await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { exact: "environment" } // Force rear camera
          } 
        })
          .then(stream => {
            stream.getTracks().forEach(track => track.stop())
          })
          .catch(() => {
            throw new Error('Permissão da câmera negada')
          })

        qrRef.current = new Html5Qrcode('qr-reader')

        const cameras = await Html5Qrcode.getCameras()
        if (cameras && cameras.length > 0) {
          // Find back camera
          const backCamera = cameras.find(camera => 
            camera.label.toLowerCase().includes('back') || 
            camera.label.toLowerCase().includes('traseira') ||
            camera.label.toLowerCase().includes('rear')
          ) || cameras[0]

          await qrRef.current.start(
            backCamera.id,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1
            },
            (decodedText) => {
              if (!decodedText.startsWith('vehicle_')) {
                toast.error('QR Code inválido')
                return
              }
              onScan(decodedText)
            },
            () => {
              // Ignore decoding errors
            }
          )
        } else {
          throw new Error('Nenhuma câmera encontrada')
        }
      } catch (error: any) {
        console.error('Camera error:', error)
        setError(error.message || 'Erro ao acessar a câmera')
        toast.error(error.message || 'Erro ao acessar a câmera')
      }
    }

    startScanner()

    return () => {
      if (qrRef.current) {
        // Verifica se o scanner está rodando antes de tentar parar
        if (qrRef.current.isScanning) {
          qrRef.current.stop().catch(console.error)
        }
        qrRef.current = null
      }
    }
  }, [onScan])

  const handleLogout = async () => {
    try {
      if (qrRef.current && qrRef.current.isScanning) {
        await qrRef.current.stop()
      }
      await signOut()
      navigate('/m/login')
    } catch (error) {
      console.error('Error during logout:', error)
      toast.error('Erro ao fazer logout')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative h-full">
        <button
          onClick={handleLogout}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white flex items-center space-x-2"
        >
          <span className="text-sm">Sair</span>
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="flex h-full flex-col items-center justify-center px-4">
          {error ? (
            <div className="text-center text-white">
              <p className="text-lg font-semibold mb-2">Erro</p>
              <p className="text-sm opacity-80">{error}</p>
              <button
                onClick={handleLogout}
                className="mt-4 px-4 py-2 bg-white/10 rounded-lg text-sm"
              >
                Sair
              </button>
            </div>
          ) : (
            <>
              <div
                id="qr-reader"
                className="w-full max-w-sm overflow-hidden rounded-lg bg-white"
              />
              <p className="mt-4 text-center text-sm text-white/80">
                Posicione o QR Code do veículo no centro da tela
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}