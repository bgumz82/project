import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  BuildingOfficeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { 
  getEmpresasFiscais, 
  createEmpresaFiscal, 
  updateEmpresaFiscal, 
  deleteEmpresaFiscal,
  formatCNPJ,
  CODIGOS_UF,
  type EmpresaFiscal,
  type EmpresaFiscalCreate
} from '@/lib/api/fiscal'

const STATUS_LABELS = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  suspenso: 'Suspenso'
}

const STATUS_COLORS = {
  ativo: 'bg-green-100 text-green-800',
  inativo: 'bg-red-100 text-red-800',
  suspenso: 'bg-yellow-100 text-yellow-800'
}

export default function EmpresasFiscais() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaFiscal | null>(null)
  const queryClient = useQueryClient()

  const { data: empresas, isLoading } = useQuery({
    queryKey: ['empresas-fiscais'],
    queryFn: getEmpresasFiscais,
    retry: 3,
    staleTime: 1000 * 60 * 5
  })

  const createMutation = useMutation({
    mutationFn: createEmpresaFiscal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-fiscais'] })
      toast.success('Empresa fiscal criada com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error creating empresa fiscal:', error)
      toast.error(error.message || 'Erro ao criar empresa fiscal')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmpresaFiscalCreate> }) =>
      updateEmpresaFiscal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-fiscais'] })
      toast.success('Empresa fiscal atualizada com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error updating empresa fiscal:', error)
      toast.error(error.message || 'Erro ao atualizar empresa fiscal')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEmpresaFiscal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas-fiscais'] })
      toast.success('Empresa fiscal excluída com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error deleting empresa fiscal:', error)
      toast.error(error.message || 'Erro ao excluir empresa fiscal')
    }
  })

  const resetForm = () => {
    setSelectedEmpresa(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const empresaData: EmpresaFiscalCreate = {
      razao_social: formData.get('razao_social') as string,
      cnpj: formData.get('cnpj') as string,
      ie: formData.get('ie') as string || null,
      endereco_completo: formData.get('endereco_completo') as string,
      codigo_uf: formData.get('codigo_uf') as string || '35',
      rntrc: formData.get('rntrc') as string || null,
      status: formData.get('status') as 'ativo' | 'inativo' | 'suspenso',
      proximo_numero_cte: parseInt(formData.get('proximo_numero_cte') as string) || 1,
      proximo_numero_mdfe: parseInt(formData.get('proximo_numero_mdfe') as string) || 1,
      serie_padrao_cte: formData.get('serie_padrao_cte') as string || '001',
      serie_padrao_mdfe: formData.get('serie_padrao_mdfe') as string || '001',
      path_arquivos: formData.get('path_arquivos') as string || null
    }

    if (selectedEmpresa) {
      updateMutation.mutate({ id: selectedEmpresa.id, data: empresaData })
    } else {
      createMutation.mutate(empresaData)
    }
  }

  const handleEdit = (empresa: EmpresaFiscal) => {
    setSelectedEmpresa(empresa)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta empresa fiscal? Esta ação não pode ser desfeita.')) {
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
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-2xl font-semibold text-gray-900">Empresas Fiscais</h1>
          </div>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Nova Empresa
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
                        Razão Social
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        CNPJ
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        UF/IE
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        RNTRC
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Numeração
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
                    {empresas?.map((empresa) => (
                      <tr key={empresa.id}>
                        <td className="px-3 py-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">{empresa.razao_social}</div>
                            <div className="text-gray-500 text-xs truncate max-w-xs">
                              {empresa.endereco_completo}
                            </div>
                            {empresa.path_arquivos && (
                              <div className="text-gray-400 text-xs mt-1 font-mono">
                                📁 {empresa.path_arquivos}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-mono">
                          {formatCNPJ(empresa.cnpj)}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div>
                            <div className="font-medium">UF: {empresa.codigo_uf}</div>
                            <div className="text-xs">{empresa.ie || 'IE não informada'}</div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {empresa.rntrc || '-'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div className="space-y-1">
                            <div className="text-xs">
                              <span className="font-medium">CT-e:</span> {empresa.proximo_numero_cte || 1} (Série {empresa.serie_padrao_cte || '001'})
                            </div>
                            <div className="text-xs">
                              <span className="font-medium">MDF-e:</span> {empresa.proximo_numero_mdfe || 1} (Série {empresa.serie_padrao_mdfe || '001'})
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            STATUS_COLORS[empresa.status]
                          }`}>
                            {STATUS_LABELS[empresa.status]}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(empresa)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(empresa.id)}
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
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">
                {selectedEmpresa ? 'Editar Empresa Fiscal' : 'Nova Empresa Fiscal'}
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
                {/* Informações da Empresa */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informações da Empresa</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="razao_social" className="block text-sm font-medium text-gray-700">
                        Razão Social *
                      </label>
                      <input
                        type="text"
                        name="razao_social"
                        id="razao_social"
                        defaultValue={selectedEmpresa?.razao_social}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
                          CNPJ *
                        </label>
                        <input
                          type="text"
                          name="cnpj"
                          id="cnpj"
                          defaultValue={selectedEmpresa?.cnpj}
                          required
                          placeholder="00.000.000/0000-00"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="codigo_uf" className="block text-sm font-medium text-gray-700">
                          UF *
                        </label>
                        <select
                          name="codigo_uf"
                          id="codigo_uf"
                          defaultValue={selectedEmpresa?.codigo_uf || '35'}
                          required
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          {Object.entries(CODIGOS_UF).map(([uf, codigo]) => (
                            <option key={codigo} value={codigo}>
                              {uf} ({codigo})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="ie" className="block text-sm font-medium text-gray-700">
                          Inscrição Estadual
                        </label>
                        <input
                          type="text"
                          name="ie"
                          id="ie"
                          defaultValue={selectedEmpresa?.ie || ''}
                          placeholder="000.000.000.000"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="endereco_completo" className="block text-sm font-medium text-gray-700">
                        Endereço Completo *
                      </label>
                      <textarea
                        name="endereco_completo"
                        id="endereco_completo"
                        rows={3}
                        defaultValue={selectedEmpresa?.endereco_completo}
                        required
                        placeholder="Rua, número, bairro, cidade, estado, CEP"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="rntrc" className="block text-sm font-medium text-gray-700">
                          RNTRC
                        </label>
                        <input
                          type="text"
                          name="rntrc"
                          id="rntrc"
                          defaultValue={selectedEmpresa?.rntrc || ''}
                          placeholder="12345678"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Registro Nacional de Transportadores Rodoviários de Cargas
                        </p>
                      </div>

                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          name="status"
                          id="status"
                          defaultValue={selectedEmpresa?.status || 'ativo'}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="ativo">Ativo</option>
                          <option value="inativo">Inativo</option>
                          <option value="suspenso">Suspenso</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configurações de Numeração */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações de Numeração</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="proximo_numero_cte" className="block text-sm font-medium text-gray-700">
                        Próximo Número CT-e
                      </label>
                      <input
                        type="number"
                        name="proximo_numero_cte"
                        id="proximo_numero_cte"
                        defaultValue={selectedEmpresa?.proximo_numero_cte || 1}
                        min="1"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Próximo número que será usado para CT-e
                      </p>
                    </div>

                    <div>
                      <label htmlFor="proximo_numero_mdfe" className="block text-sm font-medium text-gray-700">
                        Próximo Número MDF-e
                      </label>
                      <input
                        type="number"
                        name="proximo_numero_mdfe"
                        id="proximo_numero_mdfe"
                        defaultValue={selectedEmpresa?.proximo_numero_mdfe || 1}
                        min="1"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Próximo número que será usado para MDF-e
                      </p>
                    </div>

                    <div>
                      <label htmlFor="serie_padrao_cte" className="block text-sm font-medium text-gray-700">
                        Série Padrão CT-e
                      </label>
                      <input
                        type="text"
                        name="serie_padrao_cte"
                        id="serie_padrao_cte"
                        defaultValue={selectedEmpresa?.serie_padrao_cte || '001'}
                        maxLength={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Série padrão para documentos CT-e (3 dígitos)
                      </p>
                    </div>

                    <div>
                      <label htmlFor="serie_padrao_mdfe" className="block text-sm font-medium text-gray-700">
                        Série Padrão MDF-e
                      </label>
                      <input
                        type="text"
                        name="serie_padrao_mdfe"
                        id="serie_padrao_mdfe"
                        defaultValue={selectedEmpresa?.serie_padrao_mdfe || '001'}
                        maxLength={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Série padrão para documentos MDF-e (3 dígitos)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Configurações de Arquivos */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações de Arquivos</h3>
                  <div>
                    <label htmlFor="path_arquivos" className="block text-sm font-medium text-gray-700">
                      Path Base para Arquivos
                    </label>
                    <input
                      type="text"
                      name="path_arquivos"
                      id="path_arquivos"
                      defaultValue={selectedEmpresa?.path_arquivos || ''}
                      placeholder="/uploads/fiscal/empresa_id"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Caminho onde serão salvos os arquivos XML e PDF dos documentos fiscais.
                      Se vazio, será usado: /uploads/fiscal/[id_empresa]
                    </p>
                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
                      <p className="font-medium mb-1">Estrutura de arquivos gerada:</p>
                      <p className="font-mono">• {'{chave_acesso}'}-procCTe.xml</p>
                      <p className="font-mono">• {'{chave_acesso}'}-cte.xml</p>
                      <p className="font-mono">• {'{chave_acesso}'}-dacte.pdf</p>
                      <p className="font-mono">• {'{chave_acesso}'}-procMDFe.xml</p>
                      <p className="font-mono">• {'{chave_acesso}'}-mdfe.xml</p>
                      <p className="font-mono">• {'{chave_acesso}'}-damdfe.pdf</p>
                    </div>
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
                      {selectedEmpresa ? 'Atualizando...' : 'Cadastrando...'}
                    </>
                  ) : (
                    selectedEmpresa ? 'Atualizar' : 'Cadastrar'
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