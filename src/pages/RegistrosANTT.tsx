import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { 
  getRegistrosANTT, 
  createRegistroANTT, 
  updateRegistroANTT, 
  deleteRegistroANTT,
  ESTADOS_BRASIL,
  type RegistroANTT,
  type RegistroANTTCreate
} from '@/lib/api/antt'
import { getVehicles } from '@/lib/api/vehicles'

export default function RegistrosANTT() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroANTT | null>(null)
  const queryClient = useQueryClient()

  const { data: registros, isLoading } = useQuery({
    queryKey: ['registros-antt'],
    queryFn: getRegistrosANTT,
    retry: 3,
    staleTime: 1000 * 60 * 5
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles
  })

  const createMutation = useMutation({
    mutationFn: createRegistroANTT,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-antt'] })
      toast.success('Registro ANTT criado com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error creating registro ANTT:', error)
      toast.error(error.message || 'Erro ao criar registro ANTT')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RegistroANTTCreate> }) =>
      updateRegistroANTT(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-antt'] })
      toast.success('Registro ANTT atualizado com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error updating registro ANTT:', error)
      toast.error(error.message || 'Erro ao atualizar registro ANTT')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRegistroANTT,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-antt'] })
      toast.success('Registro ANTT excluído com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error deleting registro ANTT:', error)
      toast.error(error.message || 'Erro ao excluir registro ANTT')
    }
  })

  const resetForm = () => {
    setSelectedRegistro(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const registroData: RegistroANTTCreate = {
      veiculo_id: formData.get('veiculo_id') as string,
      cnpj: formData.get('cnpj') as string,
      antt: formData.get('antt') as string,
      razao_social_proprietario: formData.get('razao_social_proprietario') as string,
      inscricao_estadual: formData.get('inscricao_estadual') as string || null,
      uf_registro: formData.get('uf_registro') as string,
      empresa_proprietario: formData.get('empresa_proprietario') === 'true',
      ativo: formData.get('ativo') === 'true'
    }

    if (selectedRegistro) {
      updateMutation.mutate({ id: selectedRegistro.id, data: registroData })
    } else {
      createMutation.mutate(registroData)
    }
  }

  const handleEdit = (registro: RegistroANTT) => {
    setSelectedRegistro(registro)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro ANTT?')) {
      deleteMutation.mutate(id)
    }
  }

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
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
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-2xl font-semibold text-gray-900">Registros ANTT</h1>
          </div>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Novo Registro ANTT
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
                        ANTT
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        CNPJ
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Razão Social
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        UF
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Empresa Proprietário
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
                    {registros?.map((registro) => (
                      <tr key={registro.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{registro.veiculo?.placa}</div>
                            <div className="text-gray-500">{registro.veiculo?.marca} {registro.veiculo?.modelo}</div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-mono">
                          {registro.antt}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono">
                          {formatCNPJ(registro.cnpj)}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {registro.razao_social_proprietario}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {registro.uf_registro}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            registro.empresa_proprietario
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {registro.empresa_proprietario ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            registro.ativo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {registro.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(registro)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(registro.id)}
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">
                {selectedRegistro ? 'Editar Registro ANTT' : 'Novo Registro ANTT'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="veiculo_id" className="block text-sm font-medium text-gray-700">
                      Veículo *
                    </label>
                    <select
                      name="veiculo_id"
                      id="veiculo_id"
                      defaultValue={selectedRegistro?.veiculo_id}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione um veículo</option>
                      {vehicles?.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.placa} - {vehicle.marca} {vehicle.modelo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="antt" className="block text-sm font-medium text-gray-700">
                      ANTT (8 dígitos) *
                    </label>
                    <input
                      type="text"
                      name="antt"
                      id="antt"
                      defaultValue={selectedRegistro?.antt}
                      required
                      maxLength={8}
                      pattern="\d{8}"
                      placeholder="12345678"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
                      CNPJ *
                    </label>
                    <input
                      type="text"
                      name="cnpj"
                      id="cnpj"
                      defaultValue={selectedRegistro?.cnpj}
                      required
                      placeholder="00.000.000/0000-00"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="inscricao_estadual" className="block text-sm font-medium text-gray-700">
                      Inscrição Estadual
                    </label>
                    <input
                      type="text"
                      name="inscricao_estadual"
                      id="inscricao_estadual"
                      defaultValue={selectedRegistro?.inscricao_estadual || ''}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="razao_social_proprietario" className="block text-sm font-medium text-gray-700">
                    Razão Social do Proprietário *
                  </label>
                  <input
                    type="text"
                    name="razao_social_proprietario"
                    id="razao_social_proprietario"
                    defaultValue={selectedRegistro?.razao_social_proprietario}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <label htmlFor="uf_registro" className="block text-sm font-medium text-gray-700">
                      UF de Registro *
                    </label>
                    <select
                      name="uf_registro"
                      id="uf_registro"
                      defaultValue={selectedRegistro?.uf_registro}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione a UF</option>
                      {ESTADOS_BRASIL.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="empresa_proprietario" className="block text-sm font-medium text-gray-700">
                      Empresa Proprietário *
                    </label>
                    <select
                      name="empresa_proprietario"
                      id="empresa_proprietario"
                      defaultValue={selectedRegistro?.empresa_proprietario === false ? 'false' : 'true'}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="ativo" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      name="ativo"
                      id="ativo"
                      defaultValue={selectedRegistro?.ativo === false ? 'false' : 'true'}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {selectedRegistro ? 'Atualizando...' : 'Cadastrando...'}
                    </>
                  ) : (
                    selectedRegistro ? 'Atualizar' : 'Cadastrar'
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