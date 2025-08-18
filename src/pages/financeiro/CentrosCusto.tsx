import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { getCentrosCusto, createCentroCusto, updateCentroCusto, deleteCentroCusto } from '@/lib/api/financeiro'
import type { CentroCusto, CentroCustoCreate } from '@/lib/api/financeiro'

export default function CentrosCusto() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCentroCusto, setSelectedCentroCusto] = useState<CentroCusto | null>(null)
  const queryClient = useQueryClient()

  const { 
    data: centrosCusto, 
    isLoading,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['centros-custo'],
    queryFn: getCentrosCusto,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // 1 minuto
    refetchOnWindowFocus: true
  })

  // Efeito para atualizar os dados quando a página é montada
  useEffect(() => {
    refetch();
  }, [refetch]);

  const createMutation = useMutation({
    mutationFn: createCentroCusto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros-custo'] })
      toast.success('Centro de custo criado com sucesso!')
      setIsModalOpen(false)
    },
    onError: (error: any) => {
      console.error('Error creating centro de custo:', error)
      toast.error(error.message || 'Erro ao criar centro de custo')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CentroCustoCreate> }) =>
      updateCentroCusto(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros-custo'] })
      toast.success('Centro de custo atualizado com sucesso!')
      setIsModalOpen(false)
    },
    onError: (error: any) => {
      console.error('Error updating centro de custo:', error)
      toast.error(error.message || 'Erro ao atualizar centro de custo')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCentroCusto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['centros-custo'] })
      toast.success('Centro de custo excluído com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error deleting centro de custo:', error)
      toast.error(error.message || 'Erro ao excluir centro de custo')
    }
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const centroCustoData: CentroCustoCreate = {
      nome: formData.get('nome') as string,
      descricao: formData.get('descricao') as string || null,
      ativo: formData.get('ativo') === 'true'
    }

    if (selectedCentroCusto) {
      updateMutation.mutate({ id: selectedCentroCusto.id, data: centroCustoData })
    } else {
      createMutation.mutate(centroCustoData)
    }
  }

  const handleEdit = (centroCusto: CentroCusto) => {
    setSelectedCentroCusto(centroCusto)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este centro de custo?')) {
      deleteMutation.mutate(id)
    }
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
          <h1 className="text-2xl font-semibold text-gray-900">Centros de Custo</h1>
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
                setSelectedCentroCusto(null)
                setIsModalOpen(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Novo Centro de Custo
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
                        Nome
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Descrição
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
                    {centrosCusto?.map((centroCusto) => (
                      <tr key={centroCusto.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {centroCusto.nome}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {centroCusto.descricao || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            centroCusto.ativo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {centroCusto.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(centroCusto)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(centroCusto.id)}
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
              {selectedCentroCusto ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
                    Nome
                  </label>
                  <input
                    type="text"
                    name="nome"
                    id="nome"
                    defaultValue={selectedCentroCusto?.nome}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <textarea
                    name="descricao"
                    id="descricao"
                    rows={3}
                    defaultValue={selectedCentroCusto?.descricao || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="ativo" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    name="ativo"
                    id="ativo"
                    defaultValue={selectedCentroCusto?.ativo === false ? 'false' : 'true'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
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
                  {selectedCentroCusto ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}