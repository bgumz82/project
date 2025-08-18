import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import QRCodeScanner from './QRCodeScanner'
import { getVehicleByQRCode } from '@/lib/api/vehicles'
import { createSupply } from '@/lib/api/supplies'
import { getPostosAbastecimento } from '@/lib/api/cadastros'
import { useQuery } from '@tanstack/react-query'
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function MobileSupply() {
  const [started, setStarted] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [vehicle, setVehicle] = useState<any>(null)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const { data: postos } = useQuery({
    queryKey: ['postos-abastecimento'],
    queryFn: getPostosAbastecimento
  })

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user?.id || !vehicle) return

    try {
      const formData = new FormData(e.currentTarget)
      
      // Garantir que estamos usando o ID do usuário logado
      const supplyData = {
        veiculo_id: vehicle.id,
        operador_id: user.id, // ID do usuário atual
        posto_id: formData.get('posto_id') as string,
        tipo_combustivel: formData.get('tipo_combustivel') as any,
        litros: Number(formData.get('litros')),
        valor_total: Number(formData.get('valor_total')),
        data_abastecimento: new Date().toISOString()
      }

      console.log('Registrando abastecimento com operador:', user.id) // Debug
      await createSupply(supplyData)

      toast.success('Abastecimento registrado com sucesso!')
      setVehicle(null)
      setScanning(false)
      setStarted(false)
    } catch (error) {
      console.error('Error submitting supply:', error)
      toast.error('Erro ao registrar abastecimento')
    }
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-indigo-600" />
            <h2 className="mt-2 text-lg font-medium text-gray-900">Registrar Abastecimento</h2>
            <p className="mt-1 text-sm text-gray-500">
              Clique no botão abaixo para começar o processo de registro de abastecimento
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            Abastecimento - {vehicle?.placa}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="posto_id" className="block text-sm font-medium text-gray-700">
                Posto
              </label>
              <select
                id="posto_id"
                name="posto_id"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Selecione um posto</option>
                {postos?.map((posto) => (
                  <option key={posto.id} value={posto.id}>
                    {posto.razao_social}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tipo_combustivel" className="block text-sm font-medium text-gray-700">
                Tipo de Combustível
              </label>
              <select
                id="tipo_combustivel"
                name="tipo_combustivel"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Selecione o combustível</option>
                <option value="diesel">Diesel</option>
                <option value="gasolina">Gasolina</option>
                <option value="etanol">Etanol</option>
                <option value="gnv">GNV</option>
              </select>
            </div>

            <div>
              <label htmlFor="litros" className="block text-sm font-medium text-gray-700">
                Litros
              </label>
              <input
                type="number"
                id="litros"
                name="litros"
                step="0.01"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="valor_total" className="block text-sm font-medium text-gray-700">
                Valor Total
              </label>
              <input
                type="number"
                id="valor_total"
                name="valor_total"
                step="0.01"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setVehicle(null)
                  setScanning(false)
                  setStarted(false)
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}