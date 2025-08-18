import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { getMaintenances, createMaintenance, updateMaintenance, deleteMaintenance } from '@/lib/api/maintenance'
import { getVehicles } from '@/lib/api/vehicles'
import type { Maintenance } from '@/lib/api/maintenance'

export default function Maintenance() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null)
  const queryClient = useQueryClient()

  const { data: maintenances, isLoading } = useQuery({
    queryKey: ['maintenances'],
    queryFn: getMaintenances
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles
  })

  const createMutation = useMutation({
    mutationFn: createMaintenance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] })
      toast.success('Manutenção agendada com sucesso!')
      setIsModalOpen(false)
    },
    onError: () => {
      toast.error('Erro ao agendar manutenção')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Maintenance> }) =>
      updateMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] })
      toast.success('Manutenção atualizada com sucesso!')
      setIsModalOpen(false)
    },
    onError: () => {
      toast.error('Erro ao atualizar manutenção')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMaintenance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] })
      toast.success('Manutenção excluída com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao excluir manutenção')
    }
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const maintenanceData = {
      veiculo_id: formData.get('veiculo_id') as string,
      tipo: formData.get('tipo') as string,
      descricao: formData.get('descricao') as string,
      data_prevista: formData.get('data_prevista') as string,
      data_realizada: formData.get('data_realizada') as string || null,
    }

    if (selectedMaintenance) {
      updateMutation.mutate({ id: selectedMaintenance.id, data: maintenanceData })
    } else {
      createMutation.mutate(maintenanceData)
    }
  }

  const handleEdit = (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta manutenção?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleComplete = async (maintenance: Maintenance) => {
    updateMutation.mutate({
      id: maintenance.id,
      data: {
        data_realizada: new Date().toISOString()
      }
    })
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
          <h1 className="text-2xl font-semibold text-gray-900">Manutenções</h1>
          <button
            onClick={() => {
              setSelectedMaintenance(null)
              setIsModalOpen(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Nova Manutenção
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
                        Veículo
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Tipo
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Descrição
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Data Prevista
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {maintenances?.map((maintenance) => (
                      <tr key={maintenance.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {maintenance.veiculo.placa} - {maintenance.veiculo.modelo}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {maintenance.tipo === 'troca_oleo' && 'Troca de Óleo'}
                          {maintenance.tipo === 'revisao_freios' && 'Revisão de Freios'}
                          {maintenance.tipo === 'alinhamento' && 'Alinhamento'}
                          {maintenance.tipo === 'balanceamento' && 'Balanceamento'}
                          {maintenance.tipo === 'troca_pneus' && 'Troca de Pneus'}
                          {maintenance.tipo === 'revisao_geral' && 'Revisão Geral'}
                          {!['troca_oleo', 'revisao_freios', 'alinhamento', 'balanceamento', 'troca_pneus', 'revisao_geral'].includes(maintenance.tipo) && maintenance.tipo}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {maintenance.descricao}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {format(parseISO(maintenance.data_prevista), 'dd/MM/yyyy')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {maintenance.data_realizada ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                              Realizada
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-yellow-100 px-2 text-xs font-semibold leading-5 text-yellow-800">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          {!maintenance.data_realizada && (
                            <button
                              onClick={() => handleComplete(maintenance)}
                              className="text-green-600 hover:text-green-900 mr-4"
                              title="Marcar como realizada"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(maintenance)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(maintenance.id)}
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
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-medium mb-4">
              {selectedMaintenance ? 'Editar Manutenção' : 'Nova Manutenção'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="veiculo_id" className="block text-sm font-medium text-gray-700">
                    Veículo
                  </label>
                  <select
                    name="veiculo_id"
                    id="veiculo_id"
                    defaultValue={selectedMaintenance?.veiculo_id}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecione um veículo</option>
                    {vehicles?.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.placa} - {vehicle.modelo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">
                    Tipo
                  </label>
                  <select
                    name="tipo"
                    id="tipo"
                    defaultValue={selectedMaintenance?.tipo}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="troca_oleo">Troca de Óleo</option>
                    <option value="revisao_freios">Revisão de Freios</option>
                    <option value="alinhamento">Alinhamento</option>
                    <option value="balanceamento">Balanceamento</option>
                    <option value="troca_pneus">Troca de Pneus</option>
                    <option value="revisao_geral">Revisão Geral</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <textarea
                    name="descricao"
                    id="descricao"
                    rows={3}
                    defaultValue={selectedMaintenance?.descricao}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="data_prevista" className="block text-sm font-medium text-gray-700">
                    Data Prevista
                  </label>
                  <input
                    type="date"
                    name="data_prevista"
                    id="data_prevista"
                    defaultValue={selectedMaintenance?.data_prevista.split('T')[0]}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                {selectedMaintenance && (
                  <div>
                    <label htmlFor="data_realizada" className="block text-sm font-medium text-gray-700">
                      Data Realizada
                    </label>
                    <input
                      type="date"
                      name="data_realizada"
                      id="data_realizada"
                      defaultValue={selectedMaintenance.data_realizada?.split('T')[0]}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                )}
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
                  {selectedMaintenance ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}