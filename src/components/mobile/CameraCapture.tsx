import { useCallback, useRef, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import { XMarkIcon, CameraIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface CameraCaptureProps {
  onCapture: (photo: string) => void
  onClose: () => void
  label: string
}

export default function CameraCapture({ onCapture, onClose, label }: CameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setIsInitializing(true)
        setError(null)

        // Primeiro tenta com a câmera traseira
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { exact: "environment" } }
          })
          stream.getTracks().forEach(track => track.stop())
          setHasPermission(true)
        } catch (error) {
          console.log('Trying fallback camera...')
          // Se falhar, tenta com qualquer câmera
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" }
          })
          stream.getTracks().forEach(track => track.stop())
          setHasPermission(true)
        }
      } catch (error: any) {
        console.error('Camera access error:', error)
        setError('Erro ao acessar a câmera. Por favor, verifique as permissões do navegador e tente novamente.')
        setHasPermission(false)
        toast.error('Erro ao acessar a câmera')
      } finally {
        setIsInitializing(false)
      }
    }

    checkPermissions()

    return () => {
      if (webcamRef.current) {
        const stream = webcamRef.current.video?.srcObject as MediaStream
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
        }
      }
    }
  }, [])

  const videoConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    facingMode: { exact: "environment" }
  }

  const capture = useCallback(() => {
    try {
      if (!webcamRef.current) {
        throw new Error('Camera não inicializada')
      }

      const imageSrc = webcamRef.current.getScreenshot()
      if (!imageSrc) {
        throw new Error('Erro ao capturar foto')
      }

      onCapture(imageSrc)
    } catch (error: any) {
      console.error('Error capturing photo:', error)
      toast.error(error.message || 'Erro ao capturar foto. Tente novamente.')
    }
  }, [onCapture])

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white mb-4" />
          <p>Inicializando câmera...</p>
        </div>
      </div>
    )
  }

  if (error || !hasPermission) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-center text-white p-4">
          <p className="text-lg font-semibold mb-2">Erro ao acessar a câmera</p>
          <p className="text-sm opacity-80 mb-4">{error || 'Permissão da câmera negada'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 rounded-lg text-sm"
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="relative h-full flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between p-4">
            <span className="text-white font-medium">{label}</span>
            <button
              onClick={onClose}
              className="rounded-full bg-white/10 p-2 text-white"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 relative">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="absolute inset-0 w-full h-full object-cover"
            imageSmoothing={true}
            screenshotQuality={0.92}
            mirrored={false}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center bg-gradient-to-t from-black/50 to-transparent">
          <button
            onClick={capture}
            className="rounded-full bg-white p-4 active:bg-gray-200 transition-colors"
          >
            <CameraIcon className="h-8 w-8 text-black" />
          </button>
        </div>
      </div>
    </div>
  )
}