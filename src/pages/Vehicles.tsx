import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline'
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/lib/api/vehicles'
import type { VehicleInsert } from '@/lib/api/vehicles'

// Interface completa do Vehicle para uso na página
interface Vehicle {
  id: string
  placa: string
  tipo: 'carro' | 'caminhao' | 'maquina_pesada' | 'implementos' | 'onibus' | 'bi_trem_1_reboque' | 'bi_trem_2_reboque' | 'vanderleia_3_eixos' | 'vanderleia_4_eixos' | 'julieta'
  marca: string
  modelo: string
  ano: number
  qrcode_data: string
  renavam?: string | null
  chassis?: string | null
  uf_registro?: string
  cor?: string
  tara_kg?: number | null
  carga_kg?: number | null
  status?: string
  tipo_combustivel?: string
  validade_tacografo?: string | null
  ativo?: boolean
  created_at: string
  updated_at: string
}

export default function Vehicles() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [qrVehicle, setQrVehicle] = useState<Vehicle | null>(null)

  const queryClient = useQueryClient()

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles
  })

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Veículo cadastrado com sucesso!')
      setIsModalOpen(false)
    },
    onError: () => {
      toast.error('Erro ao cadastrar veículo')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleInsert> }) =>
      updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Veículo atualizado com sucesso!')
      setIsModalOpen(false)
    },
    onError: () => {
      toast.error('Erro ao atualizar veículo')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      toast.success('Veículo excluído com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao excluir veículo')
    }
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const vehicleData = {
      placa: formData.get('placa') as string,
      tipo: formData.get('tipo') as 'carro' | 'caminhao' | 'maquina_pesada' | 'implementos' | 'onibus',
      marca: formData.get('marca') as string,
      modelo: formData.get('modelo') as string,
      ano: parseInt(formData.get('ano') as string),
      renavam: formData.get('renavam') as string || null,
      chassis: formData.get('chassis') as string || null,
      uf_registro: formData.get('uf_registro') as string,
      cor: formData.get('cor') as string,
      tara_kg: formData.get('tara_kg') ? parseFloat(formData.get('tara_kg') as string) : null,
      carga_kg: formData.get('carga_kg') ? parseFloat(formData.get('carga_kg') as string) : null,
      status: formData.get('status') as string,
      tipo_combustivel: formData.get('tipo_combustivel') as string,
      validade_tacografo: formData.get('validade_tacografo') as string || null,
      qrcode_data: `vehicle_${formData.get('placa')}`
    }

    if (selectedVehicle) {
      updateMutation.mutate({ id: selectedVehicle.id, data: vehicleData })
    } else {
      createMutation.mutate(vehicleData as VehicleInsert)
    }
  }

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este veículo?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleShowQR = (vehicle: Vehicle) => {
    setQrVehicle(vehicle)
    setIsQRModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Veículos</h1>
          <button
            onClick={() => {
              setSelectedVehicle(null)
              setIsModalOpen(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Novo Veículo
          </button>
        </div>

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Placa
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Tipo
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Marca/Modelo
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Ano
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {vehicles?.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {vehicle.placa}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {vehicle.tipo === 'carro' && 'Carro'}
                          {vehicle.tipo === 'caminhao' && 'Caminhão'}
                          {vehicle.tipo === 'maquina_pesada' && 'Máquina Pesada'}
                          {vehicle.tipo === 'implementos' && 'Implementos'}
                          {vehicle.tipo === 'onibus' && 'Ônibus'}
                          {vehicle.tipo === 'bi_trem_1_reboque' && 'Bi-Trem - 1º Reboque'}
                          {vehicle.tipo === 'bi_trem_2_reboque' && 'Bi-Trem - 2º Reboque'}
                          {vehicle.tipo === 'vanderleia_3_eixos' && 'Vanderleia - 3 Eixos'}
                          {vehicle.tipo === 'vanderleia_4_eixos' && 'Vanderleia - 4 Eixos'}
                          {vehicle.tipo === 'julieta' && 'Julieta'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {vehicle.marca} {vehicle.modelo}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {vehicle.ano}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleShowQR(vehicle)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <QrCodeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(vehicle)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(vehicle.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-medium mb-4">
              {selectedVehicle ? 'Editar Veículo' : 'Novo Veículo'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="placa" className="block text-sm font-medium text-gray-700">
                        Placa *
                      </label>
                      <input
                        type="text"
                        name="placa"
                        id="placa"
                        defaultValue={selectedVehicle?.placa}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">
                        Tipo *
                      </label>
                      <select
                        name="tipo"
                        id="tipo"
                        defaultValue={selectedVehicle?.tipo}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="carro">Carro</option>
                        <option value="caminhao">Caminhão</option>
                        <option value="maquina_pesada">Máquina Pesada</option>
                        <option value="implementos">Implementos</option>
                        <option value="onibus">Ônibus</option>
                        <option value="bi_trem_1_reboque">Bi-Trem - 1º Reboque</option>
                        <option value="bi_trem_2_reboque">Bi-Trem - 2º Reboque</option>
                        <option value="vanderleia_3_eixos">Vanderleia - 3 Eixos</option>
                        <option value="vanderleia_4_eixos">Vanderleia - 4 Eixos</option>
                        <option value="julieta">Julieta</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="marca" className="block text-sm font-medium text-gray-700">
                        Marca *
                      </label>
                      <input
                        type="text"
                        name="marca"
                        id="marca"
                        defaultValue={selectedVehicle?.marca}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="modelo" className="block text-sm font-medium text-gray-700">
                        Modelo *
                      </label>
                      <input
                        type="text"
                        name="modelo"
                        id="modelo"
                        defaultValue={selectedVehicle?.modelo}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="ano" className="block text-sm font-medium text-gray-700">
                        Ano *
                      </label>
                      <input
                        type="number"
                        name="ano"
                        id="ano"
                        defaultValue={selectedVehicle?.ano}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="cor" className="block text-sm font-medium text-gray-700">
                        Cor *
                      </label>
                      <input
                        type="text"
                        name="cor"
                        id="cor"
                        defaultValue={selectedVehicle?.cor}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Documentação */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Documentação</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="renavam" className="block text-sm font-medium text-gray-700">
                        RENAVAM
                      </label>
                      <input
                        type="text"
                        name="renavam"
                        id="renavam"
                        defaultValue={selectedVehicle?.renavam || ''}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="chassis" className="block text-sm font-medium text-gray-700">
                        Chassis
                      </label>
                      <input
                        type="text"
                        name="chassis"
                        id="chassis"
                        defaultValue={selectedVehicle?.chassis || ''}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="uf_registro" className="block text-sm font-medium text-gray-700">
                        UF de Registro *
                      </label>
                      <select
                        name="uf_registro"
                        id="uf_registro"
                        defaultValue={selectedVehicle?.uf_registro || 'SP'}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="AC">AC</option>
                        <option value="AL">AL</option>
                        <option value="AP">AP</option>
                        <option value="AM">AM</option>
                        <option value="BA">BA</option>
                        <option value="CE">CE</option>
                        <option value="DF">DF</option>
                        <option value="ES">ES</option>
                        <option value="GO">GO</option>
                        <option value="MA">MA</option>
                        <option value="MT">MT</option>
                        <option value="MS">MS</option>
                        <option value="MG">MG</option>
                        <option value="PA">PA</option>
                        <option value="PB">PB</option>
                        <option value="PR">PR</option>
                        <option value="PE">PE</option>
                        <option value="PI">PI</option>
                        <option value="RJ">RJ</option>
                        <option value="RN">RN</option>
                        <option value="RS">RS</option>
                        <option value="RO">RO</option>
                        <option value="RR">RR</option>
                        <option value="SC">SC</option>
                        <option value="SP">SP</option>
                        <option value="SE">SE</option>
                        <option value="TO">TO</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="validade_tacografo" className="block text-sm font-medium text-gray-700">
                        Validade Tacógrafo
                      </label>
                      <input
                        type="date"
                        name="validade_tacografo"
                        id="validade_tacografo"
                        defaultValue={selectedVehicle?.validade_tacografo?.split('T')[0]}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Especificações Técnicas */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Especificações Técnicas</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="tara_kg" className="block text-sm font-medium text-gray-700">
                        Tara (Kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="tara_kg"
                        id="tara_kg"
                        defaultValue={selectedVehicle?.tara_kg || ''}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="carga_kg" className="block text-sm font-medium text-gray-700">
                        Capacidade de Carga (Kg)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="carga_kg"
                        id="carga_kg"
                        defaultValue={selectedVehicle?.carga_kg || ''}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="tipo_combustivel" className="block text-sm font-medium text-gray-700">
                        Tipo de Combustível *
                      </label>
                      <select
                        name="tipo_combustivel"
                        id="tipo_combustivel"
                        defaultValue={selectedVehicle?.tipo_combustivel || 'diesel'}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="diesel">Diesel</option>
                        <option value="diesel_s10">Diesel S10</option>
                        <option value="diesel_s500">Diesel S500</option>
                        <option value="gasolina">Gasolina</option>
                        <option value="etanol">Etanol</option>
                        <option value="flex">Flex</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status do Veículo *
                    </label>
                    <select
                      name="status"
                      id="status"
                      defaultValue={selectedVehicle?.status || 'ativo'}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                      <option value="manutencao">Em Manutenção</option>
                      <option value="vendido">Vendido</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                >
                  {selectedVehicle ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal do QR Code */}
      {isQRModalOpen && qrVehicle && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-medium mb-4">QR Code - {qrVehicle.placa}</h2>
            <div className="flex justify-center mb-4">
              <QRCodeSVG
                value={qrVehicle.qrcode_data}
                size={200}
                level="H"
                includeMargin
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setIsQRModalOpen(false)}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}