import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import QRCodeScanner from './QRCodeScanner'
import CameraCapture from '@/components/mobile/CameraCapture'
import { getVehicleByQRCode } from '@/lib/api/vehicles'
import { createChecklist, uploadChecklistPhoto, getDefaultChecklistItems } from '@/lib/api/checklists'
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { ChecklistItem } from '@/lib/api/checklists'

export default function MobileChecklist() {
  const [started, setStarted] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [vehicle, setVehicle] = useState<any>(null)
  const [items, setItems] = useState<ChecklistItem[]>(getDefaultChecklistItems())
  const [showCamera, setShowCamera] = useState<string | null>(null)
  const [photos, setPhotos] = useState<{ [key: string]: string }>({})
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/m/login')
    } catch (error) {
      console.error('Error during logout:', error)
      toast.error('Erro ao fazer logout')
    }
  }

  const handleScan = async (qrcode: string) => {
    try {
      const vehicle = await getVehicleByQRCode(qrcode)
      if (!vehicle) {
        toast.error('Veículo não encontrado')
        return
      }
      setVehicle(vehicle)
      setScanning(false)
    } catch (error) {
      console.error('Error scanning QR code:', error)
      toast.error('Erro ao ler QR Code')
    }
  }

  const handleItemChange = (itemId: string, field: 'status' | 'observacao', value: string) => {
    setItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, [field]: value }
          : item
      )
    )
  }

  const handleSubmit = async () => {
    if (!user?.id || !vehicle) return

    try {
      // Create checklist
      const checklist = await createChecklist({
        veiculo_id: vehicle.id,
        operador_id: user.id,
        data_checklist: new Date().toISOString(),
        itens: items,
        observacoes: ''
      })

      // Upload photos
      const photoTypes = ['frente', 'lateral_direita', 'lateral_esquerda', 'traseira']
      for (const type of photoTypes) {
        if (photos[type]) {
          try {
            const response = await fetch(photos[type])
            const blob = await response.blob()
            const file = new File([blob], `${type}.jpg`, { type: 'image/jpeg' })
            await uploadChecklistPhoto(checklist.id, type, file)
          } catch (error) {
            console.error(`Error uploading ${type} photo:`, error)
            toast.error(`Erro ao enviar foto ${type}`)
          }
        }
      }

      toast.success('Checklist registrado com sucesso!')
      setVehicle(null)
      setItems(getDefaultChecklistItems())
      setPhotos({})
      setScanning(false)
      setStarted(false)
    } catch (error) {
      console.error('Error submitting checklist:', error)
      toast.error('Erro ao registrar checklist')
    }
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-indigo-600" />
            <h2 className="mt-2 text-lg font-medium text-gray-900">Realizar Checklist</h2>
            <p className="mt-1 text-sm text-gray-500">
              Clique no botão abaixo para começar o processo de checklist do veículo
            </p>
          </div>
          <button
            onClick={() => {
              setStarted(true)
              setScanning(true)
            }}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Começar
          </button>
        </div>
        {/* Botão de sair fixo */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
        >
          Sair
        </button>
      </div>
      </div>
    )
  }

  if (scanning) {
    return <QRCodeScanner onScan={handleScan} />
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            Checklist - {vehicle?.placa}
          </h2>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {['frente', 'lateral_direita', 'lateral_esquerda', 'traseira'].map((type) => (
                <div key={type} className="flex flex-col items-center">
                  <button
                    onClick={() => setShowCamera(type)}
                    className={`w-full h-32 rounded-lg border-2 border-dashed flex items-center justify-center ${
                      photos[type] ? 'border-green-500' : 'border-gray-300'
                    }`}
                  >
                    {photos[type] ? (
                      <img
                        src={photos[type]}
                        alt={type}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span className="text-sm text-gray-500">
                        Tirar foto {type.replace('_', ' ')}
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {item.nome}
                  </label>
                  <select
                    value={item.status}
                    onChange={(e) => handleItemChange(item.id, 'status', e.target.value as 'ok' | 'nao_ok' | 'na')}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="ok">OK</option>
                    <option value="nao_ok">Não OK</option>
                    <option value="na">N/A</option>
                  </select>
                  {item.status === 'nao_ok' && (
                    <input
                      type="text"
                      value={item.observacao || ''}
                      onChange={(e) => handleItemChange(item.id, 'observacao', e.target.value)}
                      placeholder="Observação"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setVehicle(null)
                  setItems(getDefaultChecklistItems())
                  setPhotos({})
                  setScanning(false)
                  setStarted(false)
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Botão de sair fixo */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
        >
          Sair
        </button>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={(photo) => {
            setPhotos(prev => ({ ...prev, [showCamera]: photo }))
            setShowCamera(null)
          }}
          onClose={() => setShowCamera(null)}
          label={`Foto ${showCamera.replace('_', ' ')}`}
        />
      )}
    </div>
  )
}