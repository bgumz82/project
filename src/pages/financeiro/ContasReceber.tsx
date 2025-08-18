import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { getContasReceber, createContaReceber, updateContaReceber, deleteContaReceber, getCentrosCustoComVeiculos } from '@/lib/api/financeiro'
import { getClientes } from '@/lib/api/cadastros'
import type { ContaReceber, ContaReceberCreate } from '@/lib/api/financeiro'

export default function ContasReceber() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedConta, setSelectedConta] = useState<ContaReceber | null>(null)
  const queryClient = useQueryClient()

  const { 
    data: contas, 
    isLoading,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['contas-receber'],
    queryFn: getContasReceber,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // 1 minuto
    refetchOnWindowFocus: true
  })

  const { data: centrosCustoComVeiculos } = useQuery({
    queryKey: ['centros-custo-com-veiculos'],
    queryFn: getCentrosCustoComVeiculos
  })

  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: getClientes
  })

  // Efeito para atualizar os dados quando a página é montada
  useEffect(() => {
    refetch();
  }, [refetch]);

  const createMutation = useMutation({
    mutationFn: createContaReceber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] })
      toast.success('Conta a receber registrada com sucesso!')
      setIsModalOpen(false)
    },
    onError: (error: any) => {
      console.error('Error creating conta a receber:', error)
      toast.error(error.message || 'Erro ao registrar conta a receber')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContaReceberCreate> }) =>
      updateContaReceber(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] })
      toast.success('Conta a receber atualizada com sucesso!')
      setIsModalOpen(false)
    },
    onError: (error: any) => {
      console.error('Error updating conta a receber:', error)
      toast.error(error.message || 'Erro ao atualizar conta a receber')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteContaReceber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas-receber'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] })
      toast.success('Conta a receber excluída com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error deleting conta a receber:', error)
      toast.error(error.message || 'Erro ao excluir conta a receber')
    }
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const contaData: ContaReceberCreate = {
      descricao: formData.get('descricao') as string,
      valor: parseFloat(formData.get('valor') as string),
      data_vencimento: formData.get('data_vencimento') as string,
      data_recebimento: formData.get('data_recebimento') as string || null,
      centro_custo_id: formData.get('centro_custo_id') as string,
      cliente: formData.get('cliente') as string,
      status: formData.get('status') as 'pendente' | 'recebido' | 'cancelado',
      observacao: formData.get('observacao') as string || null
    }

    if (selectedConta) {
      updateMutation.mutate({ id: selectedConta.id, data: contaData })
    } else {
      createMutation.mutate(contaData)
    }
  }

  const handleEdit = (conta: ContaReceber) => {
    setSelectedConta(conta)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta a receber?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleMarkAsReceived = async (conta: ContaReceber) => {
    if (conta.status === 'recebido') return

    updateMutation.mutate({
      id: conta.id,
      data: {
        status: 'recebido',
        data_recebimento: new Date().toISOString().split('T')[0]
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
          <h1 className="text-2xl font-semibold text-gray-900">Contas a Receber</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isRefetching}
            >
              <ArrowPathIcon className={`-ml-0.5 mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              {isRefetching ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button
              onClick={() => {
                setSelectedConta(null)
                setIsModalOpen(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Nova Conta a Receber
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
                        Descrição
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Cliente
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Centro de Custo / Veículo
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Valor
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Vencimento
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
                    {contas?.map((conta) => (
                      <tr key={conta.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {conta.descricao}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {conta.cliente}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {conta.centro_custo?.nome}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(conta.valor)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {format(parseISO(conta.data_vencimento), 'dd/MM/yyyy')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            conta.status === 'recebido'
                              ? 'bg-green-100 text-green-800'
                              : conta.status === 'pendente'
                              ? parseISO(conta.data_vencimento) < new Date()
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {conta.status === 'recebido' ? 'Recebido' : 
                             conta.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          {conta.status === 'pendente' && (
                            <button
                              onClick={() => handleMarkAsReceived(conta)}
                              className="text-green-600 hover:text-green-900 mr-4"
                              title="Marcar como recebido"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(conta)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(conta.id)}
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

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-medium mb-4">
              {selectedConta ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <input
                    type="text"
                    name="descricao"
                    id="descricao"
                    defaultValue={selectedConta?.descricao}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="cliente" className="block text-sm font-medium text-gray-700">
                    Cliente
                  </label>
                  <select
                    name="cliente"
                    id="cliente"
                    defaultValue={selectedConta?.cliente}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes?.map((cliente) => (
                      <option key={cliente.id} value={cliente.razao_social}>
                        {cliente.razao_social}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="centro_custo_id" className="block text-sm font-medium text-gray-700">
                    Centro de Custo / Veículo
                  </label>
                  <select
                    name="centro_custo_id"
                    id="centro_custo_id"
                    defaultValue={selectedConta?.centro_custo_id}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecione um centro de custo ou veículo</option>
                    {centrosCustoComVeiculos?.map((opcao) => (
                      <option key={opcao.id} value={opcao.id}>
                        {opcao.nome} {opcao.tipo === 'veiculo' ? '(Veículo)' : '(Centro de Custo)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="valor" className="block text-sm font-medium text-gray-700">
                    Valor
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      name="valor"
                      id="valor"
                      step="0.01"
                      min="0"
                      defaultValue={selectedConta?.valor}
                      required
                      className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="data_vencimento" className="block text-sm font-medium text-gray-700">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    name="data_vencimento"
                    id="data_vencimento"
                    defaultValue={selectedConta?.data_vencimento.split('T')[0]}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="data_recebimento" className="block text-sm font-medium text-gray-700">
                    Data de Recebimento
                  </label>
                  <input
                    type="date"
                    name="data_recebimento"
                    id="data_recebimento"
                    defaultValue={selectedConta?.data_recebimento?.split('T')[0]}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    name="status"
                    id="status"
                    defaultValue={selectedConta?.status || 'pendente'}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="recebido">Recebido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="observacao" className="block text-sm font-medium text-gray-700">
                    Observação
                  </label>
                  <textarea
                    name="observacao"
                    id="observacao"
                    rows={3}
                    defaultValue={selectedConta?.observacao || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
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
                  {selectedConta ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}