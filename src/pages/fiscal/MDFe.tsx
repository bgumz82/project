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
  EyeIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline'
import { 
  getMDFeDocumentos, 
  createMDFeDocumento, 
  updateMDFeDocumento, 
  deleteMDFeDocumento,
  getEmpresasFiscais,
  getCTeEmitidosParaMDFe,
  updateDocumentFiles,
  generateMDFeFiles,
  formatCNPJ,
  formatChaveAcesso,
  getUFFromCode,
  type MDFeDocumento,
  type MDFeDocumentoCreate,
  type CTeDocumento
} from '@/lib/api/fiscal'

const STATUS_LABELS = {
  pendente: 'Pendente',
  emitido: 'Emitido',
  cancelado: 'Cancelado',
  encerrado: 'Encerrado'
}

const STATUS_COLORS = {
  pendente: 'bg-yellow-100 text-yellow-800',
  emitido: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
  encerrado: 'bg-blue-100 text-blue-800'
}

export default function MDFe() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDocumento, setSelectedDocumento] = useState<MDFeDocumento | null>(null)
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'emitido' | 'cancelado' | 'encerrado'>('todos')
  const [selectedCTes, setSelectedCTes] = useState<string[]>([])
  const [showCTeSelection, setShowCTeSelection] = useState(false)
  const [isGeneratingFiles, setIsGeneratingFiles] = useState(false)
  const queryClient = useQueryClient()

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['mdfe-documentos'],
    queryFn: getMDFeDocumentos,
    retry: 3,
    staleTime: 1000 * 60 * 5
  })

  const { data: empresas } = useQuery({
    queryKey: ['empresas-fiscais'],
    queryFn: getEmpresasFiscais
  })

  const { data: ctesEmitidos, isLoading: loadingCTes } = useQuery({
    queryKey: ['ctes-emitidos-mdfe'],
    queryFn: getCTeEmitidosParaMDFe,
    enabled: showCTeSelection
  })

  const createMutation = useMutation({
    mutationFn: createMDFeDocumento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mdfe-documentos'] })
      queryClient.invalidateQueries({ queryKey: ['empresas-fiscais'] }) // Atualizar numeração
      toast.success('Documento MDF-e criado com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error creating MDF-e:', error)
      toast.error(error.message || 'Erro ao criar documento MDF-e')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MDFeDocumentoCreate> }) =>
      updateMDFeDocumento(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mdfe-documentos'] })
      toast.success('Documento MDF-e atualizado com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error updating MDF-e:', error)
      toast.error(error.message || 'Erro ao atualizar documento MDF-e')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMDFeDocumento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mdfe-documentos'] })
      queryClient.invalidateQueries({ queryKey: ['ctes-emitidos-mdfe'] }) // Atualizar CT-es disponíveis
      toast.success('Documento MDF-e excluído com sucesso! CT-es relacionados foram liberados para novo agrupamento.')
    },
    onError: (error: any) => {
      console.error('Error deleting MDF-e:', error)
      toast.error(error.message || 'Erro ao excluir documento MDF-e')
    }
  })

  const resetForm = () => {
    setSelectedDocumento(null)
    setSelectedCTes([])
    setShowCTeSelection(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    // Validar CT-es selecionados para novos documentos
    if (!selectedDocumento && selectedCTes.length === 0) {
      toast.error('É necessário selecionar pelo menos um CT-e emitido para criar o MDF-e')
      return
    }
    
    const documentoData: MDFeDocumentoCreate = {
      empresa_id: formData.get('empresa_id') as string,
      numero_mdfe: formData.get('numero_mdfe') as string || undefined,
      serie: formData.get('serie') as string || undefined,
      data_emissao: formData.get('data_emissao') as string,
      forma_emissao: 1, // MDF-e sempre forma normal
      status: formData.get('status') as 'pendente' | 'emitido' | 'cancelado' | 'encerrado',
      observacoes: formData.get('observacoes') as string || null,
      cte_ids: selectedDocumento ? undefined : selectedCTes, // Só para novos documentos
    }

    if (selectedDocumento) {
      updateMutation.mutate({ id: selectedDocumento.id, data: documentoData })
    } else {
      createMutation.mutate(documentoData)
    }
  }

  const toggleCTeSelection = (cteId: string) => {
    setSelectedCTes(prev => 
      prev.includes(cteId) 
        ? prev.filter(id => id !== cteId)
        : [...prev, cteId]
    )
  }

  const handleEdit = (documento: MDFeDocumento) => {
    setSelectedDocumento(documento)
    setIsModalOpen(true)
  }

  const handleDelete = async (documento: MDFeDocumento) => {
    // Verificar status antes de permitir exclusão
    if (documento.status === 'emitido' || documento.status === 'encerrado') {
      toast.error(`Não é possível excluir MDF-e ${documento.numero_mdfe.padStart(9, '0')} pois está ${documento.status}. Apenas MDF-es pendentes ou cancelados podem ser excluídos.`)
      return
    }

    const message = `Tem certeza que deseja excluir o MDF-e ${documento.numero_mdfe.padStart(9, '0')}?\n\nEsta ação irá:\n• Remover o documento MDF-e\n• Liberar os CT-es relacionados para novo agrupamento\n\nEsta ação não pode ser desfeita.`
    
    if (window.confirm(message)) {
      deleteMutation.mutate(documento.id)
    }
  }

  const handleViewPDF = (documento: MDFeDocumento) => {
    if (documento.pdf_path && documento.pdf_gerado) {
      // Abrir PDF em nova aba
      window.open(documento.pdf_path, '_blank')
    } else {
      toast.error('PDF não disponível para este documento')
    }
  }

  const handleCopyChaveAcesso = (chave: string) => {
    navigator.clipboard.writeText(chave)
    toast.success('Chave de acesso copiada!')
  }

  const handleGenerateFiles = async (id: string) => {
    setIsGeneratingFiles(true)
    try {
      // Verifica se o documento já tem XML gerado
      const documento = documentos?.find(d => d.id === id)

      if (documento?.xml_gerado) {
        // Se já tem XML gerado, altera status para pendente antes de gerar novamente
        await updateMDFeDocumento(id, { status: 'pendente' })
        console.log('📝 Status alterado para pendente - regenerando arquivos para documento:', id)
      }

      // Chama a função para gerar os arquivos
      await generateMDFeFiles(id)
      // Invalida a query para atualizar a lista de documentos com os novos status
      queryClient.invalidateQueries({ queryKey: ['mdfe-documentos'] })
      toast.success('Arquivos XML e PDF gerados com sucesso!')
    } catch (error) {
      console.error('❌ Erro ao gerar arquivos MDF-e:', error)
      console.error('❌ Detalhes do erro:', {
        tipo: typeof error,
        mensagem: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'Sem stack'
      })
      // Exibe mensagem de erro específica
      const errorMessage = error instanceof Error 
        ? error.message 
        : `Erro ao gerar arquivos MDF-e: ${String(error)}`;
      toast.error(errorMessage)
    } finally {
      setIsGeneratingFiles(false) // Finaliza o estado de carregamento
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
            <h1 className="text-2xl font-semibold text-gray-900">Documentos MDF-e</h1>
          </div>
          <button
            onClick={() => {
              console.log("🚀 Abrindo modal MDF-e - vai carregar CT-es emitidos...")
              resetForm()
              setIsModalOpen(true)
              setShowCTeSelection(true) // Ativar busca de CT-es
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Novo MDF-e
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
              <option value="encerrado">Encerrados</option>
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
                        Número MDF-e
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        CT-e Vinculado
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Empresa
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Chave de Acesso
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Data Emissão
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Arquivos
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
                          <div className="font-mono font-medium text-gray-900">
                            {documento.numero_mdfe.padStart(9, '0')}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div className="space-y-1">
                            {documento.ctes_vinculados && documento.ctes_vinculados.length > 0 ? (
                              <div className="space-y-1">
                                {documento.ctes_vinculados.map((cte) => (
                                  <div key={cte.id} className="font-mono font-medium text-gray-900">
                                    {String(cte.numero_cte).padStart(9, '0')}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400">
                                Nenhum CT-e vinculado
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div>
                            <div className="font-medium">{documento.empresa?.razao_social}</div>
                            <div className="text-xs text-gray-400 font-mono">{formatCNPJ(documento.empresa?.cnpj || '')}</div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          {documento.chave_acesso ? (
                            <div className="group">
                              <button
                                onClick={() => handleCopyChaveAcesso(documento.chave_acesso!)}
                                className="font-mono text-xs text-gray-600 hover:text-indigo-600 cursor-pointer break-all"
                                title="Clique para copiar"
                              >
                                {formatChaveAcesso(documento.chave_acesso)}
                              </button>
                              <div className="text-xs text-gray-400 mt-1">
                                DV: {documento.dv}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Chave não gerada</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {format(parseISO(documento.data_emissao), 'dd/MM/yyyy')}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            STATUS_COLORS[documento.status]
                          }`}>
                            {STATUS_LABELS[documento.status]}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                              documento.xml_gerado 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              XML {documento.xml_gerado ? '✓' : '○'}
                            </span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                              documento.pdf_gerado 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              PDF {documento.pdf_gerado ? '✓' : '○'}
                            </span>
                          </div>
                          {documento.xml_gerado && documento.xml_gerado_em && (
                            <div className="text-xs text-gray-400 mt-1">
                              {format(parseISO(documento.xml_gerado_em), 'dd/MM HH:mm')}
                            </div>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          {documento.pdf_gerado && documento.pdf_path && (
                            <button
                              onClick={() => handleViewPDF(documento)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                              title="Visualizar PDF"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleGenerateFiles(documento.id)}
                            className="text-green-600 hover:text-green-900 mr-4"
                            title="Gerar arquivos"
                            disabled={isGeneratingFiles}
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(documento)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(documento)}
                            className={`${
                              documento.status === 'emitido' || documento.status === 'encerrado'
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-red-600 hover:text-red-900'
                            }`}
                            title={
                              documento.status === 'emitido' || documento.status === 'encerrado'
                                ? `Não é possível excluir MDF-e ${documento.status}`
                                : 'Excluir'
                            }
                            disabled={documento.status === 'emitido' || documento.status === 'encerrado'}
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
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">
                {selectedDocumento ? 'Editar Documento MDF-e' : 'Novo Documento MDF-e'}
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
                <div>
                  <label htmlFor="empresa_id" className="block text-sm font-medium text-gray-700">
                    Empresa *
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

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <label htmlFor="numero_mdfe" className="block text-sm font-medium text-gray-700">
                      Número MDF-e
                    </label>
                    <input
                      type="text"
                      name="numero_mdfe"
                      id="numero_mdfe"
                      defaultValue={selectedDocumento?.numero_mdfe}
                      placeholder="AUTO"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Deixe vazio ou "AUTO" para numeração automática
                    </p>
                  </div>

                  <div>
                    <label htmlFor="serie" className="block text-sm font-medium text-gray-700">
                      Série
                    </label>
                    <input
                      type="text"
                      name="serie"
                      id="serie"
                      defaultValue={selectedDocumento?.serie}
                      placeholder="Série padrão"
                      maxLength={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Deixe vazio para usar série padrão da empresa
                    </p>
                  </div>

                </div>

                <div>
                  <label htmlFor="data_emissao" className="block text-sm font-medium text-gray-700">
                    Data de Emissão *
                  </label>
                  <input
                    type="date"
                    name="data_emissao"
                    id="data_emissao"
                    defaultValue={selectedDocumento?.data_emissao.split('T')[0] || format(new Date(), 'yyyy-MM-dd')}
                    required
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
                    defaultValue={selectedDocumento?.status || 'pendente'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="emitido">Emitido</option>
                    <option value="encerrado">Encerrado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
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
                    placeholder="Observações sobre o documento..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                {/* Seleção de CT-es para novos documentos */}
                {!selectedDocumento && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center mb-4">
                      <TruckIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <h4 className="text-sm font-medium text-blue-900">
                        CT-es Emitidos para Incluir no MDF-e *
                      </h4>
                    </div>
                    
                    {loadingCTes ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-blue-600 mt-2">Carregando CT-es emitidos...</p>
                      </div>
                    ) : ctesEmitidos && ctesEmitidos.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {ctesEmitidos.map((cte) => (
                          <label key={cte.id} className="flex items-center p-3 bg-white rounded-md border hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCTes.includes(cte.id)}
                              onChange={() => toggleCTeSelection(cte.id)}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-medium text-gray-900">
                                    CT-e #{cte.numero_cte} - Série {cte.serie}
                                  </span>
                                  <span className="ml-2 text-xs text-gray-500">
                                    {format(parseISO(cte.data_emissao), 'dd/MM/yyyy')}
                                  </span>
                                </div>
                                <span className="text-sm text-green-600 font-medium">
                                  R$ {Number(cte.valor_prestacao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Chave: {formatChaveAcesso(cte.chave_acesso)}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <ClipboardDocumentIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          Nenhum CT-e emitido disponível para incluir no MDF-e
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          CT-es devem estar com status "emitido" e não podem estar vinculados a outro MDF-e
                        </p>
                      </div>
                    )}
                    
                    {selectedCTes.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-100 rounded-md">
                        <p className="text-xs text-blue-800">
                          <strong>{selectedCTes.length}</strong> CT-e(s) selecionado(s) para o MDF-e
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Informações da Chave de Acesso */}
                {selectedDocumento?.chave_acesso && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Informações da Chave de Acesso</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="font-medium">Chave Completa:</span>
                        <div className="font-mono mt-1 break-all">{selectedDocumento.chave_acesso}</div>
                      </div>
                      <div>
                        <span className="font-medium">Arquivos Gerados:</span>
                        <div className="mt-1 space-y-1">
                          {selectedDocumento.xml_proc_path && (
                            <div className="font-mono text-gray-600">{selectedDocumento.xml_proc_path.split('/').pop()}</div>
                          )}
                          {selectedDocumento.xml_path && (
                            <div className="font-mono text-gray-600">{selectedDocumento.xml_path.split('/').pop()}</div>
                          )}
                          {selectedDocumento.pdf_path && (
                            <div className="font-mono text-gray-600">{selectedDocumento.pdf_path.split('/').pop()}</div>
                          )}
                        </div>
                      </div>
                    </div>
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