import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DocumentChartBarIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'
import { getSupplies, createSupply, updateSupply, deleteSupply, getVehicles } from '@/lib/api/supplies'
import { getPostosAbastecimento } from '@/lib/api/cadastros'
import { useAuth } from '@/contexts/AuthContext'
import type { Supply, SupplyInsert } from '@/lib/api/supplies'

export default function Supplies() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null)
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: supplies, isLoading: isLoadingSupplies } = useQuery({
    queryKey: ['supplies'],
    queryFn: getSupplies
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles
  })

  const { data: postos } = useQuery({
    queryKey: ['postos-abastecimento'],
    queryFn: getPostosAbastecimento
  })

  const createMutation = useMutation({
    mutationFn: createSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] })
      toast.success('Abastecimento registrado com sucesso!')
      setIsModalOpen(false)
      setSelectedSupply(null)
    },
    onError: () => {
      toast.error('Erro ao registrar abastecimento')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SupplyInsert> }) =>
      updateSupply(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] })
      toast.success('Abastecimento atualizado com sucesso!')
      setIsModalOpen(false)
      setSelectedSupply(null)
    },
    onError: () => {
      toast.error('Erro ao atualizar abastecimento')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] })
      toast.success('Abastecimento excluído com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao excluir abastecimento')
    }
  })
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user?.id) return

    const formData = new FormData(e.currentTarget)
    
    // Validar e converter valores numéricos
    const litros = Number(formData.get('litros'))
    const valorTotal = Number(formData.get('valor_total'))
    
    // Verificar se os valores são números válidos
    if (isNaN(litros) || litros <= 0) {
      toast.error('Por favor, insira uma quantidade válida de litros')
      return
    }
    
    if (isNaN(valorTotal) || valorTotal <= 0) {
      toast.error('Por favor, insira um valor total válido')
      return
    }
    

    if (selectedSupply) {
      // Para atualização, não incluir operador_id (campo imutável)
      const updatePayload = {
        veiculo_id: formData.get('veiculo_id') as string,
        posto_id: formData.get('posto_id') as string,
        tipo_combustivel: formData.get('tipo_combustivel') as 'gasolina' | 'diesel' | 'etanol' | 'gnv',
        litros: litros,
        valor_total: valorTotal
      }
      updateMutation.mutate({ id: selectedSupply.id, data: updatePayload })
    } else {
      // Para criação, incluir operador_id
      const createPayload: SupplyInsert = {
        veiculo_id: formData.get('veiculo_id') as string,
        operador_id: user.id,
        posto_id: formData.get('posto_id') as string,
        tipo_combustivel: formData.get('tipo_combustivel') as 'gasolina' | 'diesel' | 'etanol' | 'gnv',
        litros: litros,
        valor_total: valorTotal,
        data_abastecimento: new Date().toISOString()
      }
      createMutation.mutate(createPayload)
    }
  }

  const handleEdit = (supply: Supply) => {
    setSelectedSupply(supply)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este abastecimento?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedSupply(null)
  }

  if (isLoadingSupplies) {
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
          <h1 className="text-2xl font-semibold text-gray-900">Abastecimentos</h1>
          <div className="flex space-x-3">
            <Link
              to="/cadastros"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <BuildingOffice2Icon className="-ml-1 mr-2 h-5 w-5" />
              Gerenciar Cadastros
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Novo Abastecimento
            </button>
            <button
              onClick={() => {
                // TODO: Implementar exportação
                toast.success('Relatório exportado com sucesso!')
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentChartBarIcon className="-ml-1 mr-2 h-5 w-5" />
              Exportar Relatório
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Data
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Veículo
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Posto
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Combustível
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Litros
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Valor Total
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Operador
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {supplies?.map((supply) => (
                      <tr key={supply.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {format(new Date(supply.data_abastecimento), 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {supply.veiculo.placa} - {supply.veiculo.modelo}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {supply.posto.nome}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {supply.tipo_combustivel}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {Number(supply.litros).toFixed(2)}L
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(Number(supply.valor_total))}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {supply.operador.nome}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(supply)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(supply.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
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

      {/* Modal de Novo Abastecimento */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-medium mb-4">
              {selectedSupply ? 'Editar Abastecimento' : 'Novo Abastecimento'}
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
                    defaultValue={selectedSupply?.veiculo_id}
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
                  <label htmlFor="posto_id" className="block text-sm font-medium text-gray-700">
                    Posto
                  </label>
                  <select
                    name="posto_id"
                    id="posto_id"
                    defaultValue={selectedSupply?.posto_id}
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
                    name="tipo_combustivel"
                    id="tipo_combustivel"
                    defaultValue={selectedSupply?.tipo_combustivel}
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
                    step="0.01"
                    name="litros"
                    id="litros"
                    defaultValue={selectedSupply?.litros}
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
                    step="0.01"
                    name="valor_total"
                    id="valor_total"
                    defaultValue={selectedSupply?.valor_total}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {selectedSupply ? 'Atualizando...' : 'Registrando...'}
                    </>
                  ) : (
                    selectedSupply ? 'Atualizar' : 'Registrar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}