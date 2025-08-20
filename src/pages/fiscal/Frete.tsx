
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  TruckIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import {
  getFreteDocumentos,
  createFreteDocumento,
  updateFreteDocumento,
  deleteFreteDocumento,
  getEmpresasFiscais,
  getClientesAtivos,
  formatCNPJ,
  type FreteDocumento,
  type FreteDocumentoCreate
} from '@/lib/api/fiscal'

const STATUS_LABELS = {
  pendente: 'Pendente',
  emitido: 'Emitido',
  cancelado: 'Cancelado'
}

const STATUS_COLORS = {
  pendente: 'bg-yellow-100 text-yellow-800',
  emitido: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800'
}

const TIPO_REBOQUE_LABELS = {
  vanderleia: 'Vanderléia',
  vanderleia_4_eixos: 'Vanderléia 4 Eixos',
  bi_trem: 'Bi-Trem',
  julieta: 'Julieta'
}

const TIPO_PRODUTO_LABELS = {
  LEITE: 'Leite',
  CREME: 'Creme',
  SORO: 'Soro'
}

const TOMADOR_FRETE_LABELS = {
  remetente: 'Remetente',
  destinatario: 'Destinatário'
}

export default function Frete() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDocumento, setSelectedDocumento] = useState<FreteDocumento | null>(null)
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'emitido' | 'cancelado'>('todos')
  const queryClient = useQueryClient()

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['frete-documentos'],
    queryFn: getFreteDocumentos,
    retry: 3,
    staleTime: 1000 * 60 * 5
  })

  const { data: empresas } = useQuery({
    queryKey: ['empresas-fiscais'],
    queryFn: getEmpresasFiscais
  })

  const { data: clientes } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: getClientesAtivos
  })

  const createMutation = useMutation({
    mutationFn: createFreteDocumento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frete-documentos'] })
      toast.success('Documento de frete criado com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error creating frete:', error)
      toast.error(error.message || 'Erro ao criar documento de frete')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FreteDocumentoCreate> }) =>
      updateFreteDocumento(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frete-documentos'] })
      toast.success('Documento de frete atualizado com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error updating frete:', error)
      toast.error(error.message || 'Erro ao atualizar documento de frete')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFreteDocumento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frete-documentos'] })
      toast.success('Documento de frete excluído com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error deleting frete:', error)
      toast.error(error.message || 'Erro ao excluir documento de frete')
    }
  })

  const resetForm = () => {
    setSelectedDocumento(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const documentoData: FreteDocumentoCreate = {
      empresa_id: formData.get('empresa_id') as string,
      cliente_origem_id: formData.get('cliente_origem_id') as string,
      cliente_destino_id: formData.get('cliente_destino_id') as string,
      cidade_origem_ibge: formData.get('cidade_origem_ibge') as string,
      cidade_destino_ibge: formData.get('cidade_destino_ibge') as string,
      valor_frete: parseFloat(formData.get('valor_frete') as string) || 0,
      valor_pedagio: parseFloat(formData.get('valor_pedagio') as string) || 0,
      valor_seguro: parseFloat(formData.get('valor_seguro') as string) || 0,
      valor_comissao: parseFloat(formData.get('valor_comissao') as string) || 0,
      km: parseInt(formData.get('km') as string) || 0,
      seguro_carga_id: (formData.get('seguro_carga_id') as string) || null,
      cobranca_pedagio: formData.get('cobranca_pedagio') === 'true',
      cobranca_seguro: formData.get('cobranca_seguro') === 'true',
      tomador_frete: formData.get('tomador_frete') as 'remetente' | 'destinatario',
      tipo_reboque: formData.get('tipo_reboque') as 'vanderleia' | 'vanderleia_4_eixos' | 'bi_trem' | 'julieta',
      tipo_produto: formData.get('tipo_produto') as 'LEITE' | 'CREME' | 'SORO',
      emissao_automatica: formData.get('emissao_automatica') === 'true',
      status: formData.get('status') as 'pendente' | 'emitido' | 'cancelado',
      observacoes: formData.get('observacoes') as string || null
    }

    if (selectedDocumento) {
      updateMutation.mutate({ id: selectedDocumento.id, data: documentoData })
    } else {
      createMutation.mutate(documentoData)
    }
  }

  const handleEdit = (documento: FreteDocumento) => {
    setSelectedDocumento(documento)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este documento de frete?')) {
      deleteMutation.mutate(id)
    }
  }

  const filteredDocumentos = filterStatus === 'todos' 
    ? documentos 
    : documentos?.filter(d => d.status === filterStatus)

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
            <TruckIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-2xl font-semibold text-gray-900">Controle de Frete</h1>
          </div>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Novo Frete
          </button>
        </div>

        {/* Filtros */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filtrar por status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="todos">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="emitido">Emitidos</option>
              <option value="cancelado">Cancelados</option>
            </select>
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
                        Empresa
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Origem → Destino
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Produto/Reboque
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Valores
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        KM
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
                    {filteredDocumentos?.map((documento) => (
                      <tr key={documento.id}>
                        <td className="px-3 py-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">
                              {documento.empresa?.razao_social}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              {formatCNPJ(documento.empresa?.cnpj || '')}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <div className="space-y-1">
                            <div className="flex items-center text-green-600">
                              <MapPinIcon className="h-4 w-4 mr-1" />
                              <span className="font-medium">{documento.cliente_origem?.razao_social}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {documento.cliente_origem?.cidade}/{documento.cliente_origem?.estado}
                              <span className="ml-1">({documento.cidade_origem_ibge})</span>
                            </div>
                            <div className="text-gray-400">↓</div>
                            <div className="flex items-center text-red-600">
                              <MapPinIcon className="h-4 w-4 mr-1" />
                              <span className="font-medium">{documento.cliente_destino?.razao_social}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {documento.cliente_destino?.cidade}/{documento.cliente_destino?.estado}
                              <span className="ml-1">({documento.cidade_destino_ibge})</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">
                              {TIPO_PRODUTO_LABELS[documento.tipo_produto]}
                            </div>
                            <div className="text-xs text-gray-500">
                              {TIPO_REBOQUE_LABELS[documento.tipo_reboque]}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              Tomador: {TOMADOR_FRETE_LABELS[documento.tomador_frete]}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <div className="space-y-1">
                            <div className="flex items-center">
                              <CurrencyDollarIcon className="h-4 w-4 text-green-500 mr-1" />
                              <span className="font-medium">
                                R$ {documento.valor_frete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            {documento.valor_pedagio > 0 && (
                              <div className="text-xs text-gray-600">
                                Pedágio: R$ {documento.valor_pedagio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            )}
                            {documento.valor_seguro > 0 && (
                              <div className="text-xs text-gray-600">
                                Seguro: R$ {documento.valor_seguro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            )}
                            {documento.valor_comissao > 0 && (
                              <div className="text-xs text-gray-600">
                                Comissão: R$ {documento.valor_comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-gray-900">
                          {documento.km.toLocaleString('pt-BR')} km
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            STATUS_COLORS[documento.status]
                          }`}>
                            {STATUS_LABELS[documento.status]}
                          </span>
                          <div className="flex items-center space-x-1 mt-1">
                            {documento.cobranca_pedagio && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pedágio
                              </span>
                            )}
                            {documento.cobranca_seguro && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Seguro
                              </span>
                            )}
                            {documento.emissao_automatica && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                Auto
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleEdit(documento)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(documento.id)}
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
          <div className="bg-white rounded-lg max-w-6xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">
                {selectedDocumento ? 'Editar Documento de Frete' : 'Novo Documento de Frete'}
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
                    <label htmlFor="empresa_id" className="block text-sm font-medium text-gray-700">
                      Empresa (Emissor) *
                    </label>
                    <select
                      name="empresa_id"
                      id="empresa_id"
                      defaultValue={selectedDocumento?.empresa_id}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione uma empresa</option>
                      {empresas?.filter(e => e.status === 'ativo').map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.razao_social} - {formatCNPJ(empresa.cnpj)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      name="status"
                      id="status"
                      defaultValue={selectedDocumento?.status || 'pendente'}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="emitido">Emitido</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                </div>

                {/* Origem e Destino */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Origem e Destino</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="cliente_origem_id" className="block text-sm font-medium text-gray-700">
                        Cliente (Origem) *
                      </label>
                      <select
                        name="cliente_origem_id"
                        id="cliente_origem_id"
                        defaultValue={selectedDocumento?.cliente_origem_id}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="">Selecione o cliente de origem</option>
                        {clientes?.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.razao_social} - {cliente.cidade}/{cliente.estado}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="cliente_destino_id" className="block text-sm font-medium text-gray-700">
                        Cliente (Destino) *
                      </label>
                      <select
                        name="cliente_destino_id"
                        id="cliente_destino_id"
                        defaultValue={selectedDocumento?.cliente_destino_id}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="">Selecione o cliente de destino</option>
                        {clientes?.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.razao_social} - {cliente.cidade}/{cliente.estado}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="cidade_origem_ibge" className="block text-sm font-medium text-gray-700">
                        Código IBGE Cidade Origem *
                      </label>
                      <input
                        type="text"
                        name="cidade_origem_ibge"
                        id="cidade_origem_ibge"
                        defaultValue={selectedDocumento?.cidade_origem_ibge}
                        placeholder="Ex: 3550308"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="cidade_destino_ibge" className="block text-sm font-medium text-gray-700">
                        Código IBGE Cidade Destino *
                      </label>
                      <input
                        type="text"
                        name="cidade_destino_ibge"
                        id="cidade_destino_ibge"
                        defaultValue={selectedDocumento?.cidade_destino_ibge}
                        placeholder="Ex: 3550308"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Valores */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Valores</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
                    <div>
                      <label htmlFor="valor_frete" className="block text-sm font-medium text-gray-700">
                        Valor Frete *
                      </label>
                      <input
                        type="number"
                        name="valor_frete"
                        id="valor_frete"
                        step="0.01"
                        min="0"
                        defaultValue={selectedDocumento?.valor_frete}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="valor_pedagio" className="block text-sm font-medium text-gray-700">
                        Valor Pedágio
                      </label>
                      <input
                        type="number"
                        name="valor_pedagio"
                        id="valor_pedagio"
                        step="0.01"
                        min="0"
                        defaultValue={selectedDocumento?.valor_pedagio || 0}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="valor_seguro" className="block text-sm font-medium text-gray-700">
                        Valor Seguro
                      </label>
                      <input
                        type="number"
                        name="valor_seguro"
                        id="valor_seguro"
                        step="0.01"
                        min="0"
                        defaultValue={selectedDocumento?.valor_seguro || 0}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="valor_comissao" className="block text-sm font-medium text-gray-700">
                        Valor Comissão
                      </label>
                      <input
                        type="number"
                        name="valor_comissao"
                        id="valor_comissao"
                        step="0.01"
                        min="0"
                        defaultValue={selectedDocumento?.valor_comissao || 0}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Detalhes do Frete */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Detalhes do Frete</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <label htmlFor="km" className="block text-sm font-medium text-gray-700">
                        KM *
                      </label>
                      <input
                        type="number"
                        name="km"
                        id="km"
                        min="0"
                        defaultValue={selectedDocumento?.km}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="tomador_frete" className="block text-sm font-medium text-gray-700">
                        Tomador do Frete *
                      </label>
                      <select
                        name="tomador_frete"
                        id="tomador_frete"
                        defaultValue={selectedDocumento?.tomador_frete || 'remetente'}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="remetente">Remetente</option>
                        <option value="destinatario">Destinatário</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="tipo_reboque" className="block text-sm font-medium text-gray-700">
                        Tipo de Reboque *
                      </label>
                      <select
                        name="tipo_reboque"
                        id="tipo_reboque"
                        defaultValue={selectedDocumento?.tipo_reboque || 'vanderleia'}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="vanderleia">Vanderléia</option>
                        <option value="vanderleia_4_eixos">Vanderléia 4 Eixos</option>
                        <option value="bi_trem">Bi-Trem</option>
                        <option value="julieta">Julieta</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="tipo_produto" className="block text-sm font-medium text-gray-700">
                        Tipo de Produto *
                      </label>
                      <select
                        name="tipo_produto"
                        id="tipo_produto"
                        defaultValue={selectedDocumento?.tipo_produto || 'LEITE'}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="LEITE">Leite</option>
                        <option value="CREME">Creme</option>
                        <option value="SORO">Soro</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="seguro_carga_id" className="block text-sm font-medium text-gray-700">
                        Seguro de Carga
                      </label>
                      <input
                        type="text"
                        name="seguro_carga_id"
                        id="seguro_carga_id"
                        defaultValue={selectedDocumento?.seguro_carga_id || ''}
                        placeholder="ID do seguro (futuro)"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Configurações */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Cobrança de Pedágio
                      </label>
                      <select
                        name="cobranca_pedagio"
                        defaultValue={selectedDocumento?.cobranca_pedagio !== false ? 'true' : 'false'}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Cobrança de Seguro
                      </label>
                      <select
                        name="cobranca_seguro"
                        defaultValue={selectedDocumento?.cobranca_seguro !== false ? 'true' : 'false'}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Emissão Automática
                      </label>
                      <select
                        name="emissao_automatica"
                        defaultValue={selectedDocumento?.emissao_automatica !== false ? 'true' : 'false'}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700">
                    Observações
                  </label>
                  <textarea
                    name="observacoes"
                    id="observacoes"
                    rows={3}
                    defaultValue={selectedDocumento?.observacoes || ''}
                    placeholder="Observações sobre o frete..."
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {selectedDocumento ? 'Atualizando...' : 'Cadastrando...'}
                    </>
                  ) : (
                    selectedDocumento ? 'Atualizar' : 'Cadastrar'
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
