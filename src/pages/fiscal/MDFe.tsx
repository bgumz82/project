import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import React from 'react'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  TruckIcon,
  XMarkIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import {
  getMDFeDocumentos,
  createMDFeDocumento,
  updateMDFeDocumento,
  deleteMDFeDocumento,
  generateMDFeFiles,
  verificarArquivosMDFe,
  getEmpresasFiscais,
  getCTeEmitidosParaMDFe,
  formatCNPJ,
  formatChaveAcesso,
  type MDFeDocumento,
  type MDFeDocumentoCreate,
} from '@/lib/api/fiscal'

const STATUS_LABELS = {
  pendente: 'Pendente',
  aguardando: 'Aguardando Arquivos',
  emitido: 'Emitido',
  cancelado: 'Cancelado',
  encerrado: 'Encerrado'
}

const STATUS_COLORS = {
  pendente: 'bg-yellow-100 text-yellow-800',
  aguardando: 'bg-orange-100 text-orange-800',
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

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Estados para filtros
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [searchNumber, setSearchNumber] = useState('')

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

  const handleStatusChange = async (id: string, newStatus: 'pendente' | 'aguardando' | 'emitido' | 'cancelado' | 'encerrado') => {
    try {
      await updateMDFeDocumento(id, { status: newStatus })
      queryClient.invalidateQueries({ queryKey: ['mdfe-documentos'] })
      toast.success(`Status alterado para ${STATUS_LABELS[newStatus]}`)
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      toast.error('Erro ao alterar status do MDF-e')
    }
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
    // Tentar abrir o PDF se o path existir
    if (documento.pdf_path) {
      window.open(documento.pdf_path, '_blank')
    } else if (documento.chave_acesso && documento.empresa?.cnpj) {
      // Se não tiver pdf_path mas tiver chave de acesso e CNPJ, construir o caminho
      const pdfPath = `uploads/fiscal/${documento.empresa.cnpj}/mdfe/${documento.chave_acesso}-damdfe.pdf`
      window.open(pdfPath, '_blank')
    } else {
      toast.error('PDF não disponível para este documento')
    }
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

  // Aplicar filtros
  const filteredDocumentos = documentos?.filter(documento => {
    // Filtro por status
    if (filterStatus !== 'todos' && documento.status !== filterStatus) {
      return false
    }

    // Filtro por mês e ano
    if (filterMonth || filterYear) {
      const dataEmissao = new Date(documento.data_emissao)
      const mes = (dataEmissao.getMonth() + 1).toString().padStart(2, '0')
      const ano = dataEmissao.getFullYear().toString()

      if (filterMonth && mes !== filterMonth) {
        return false
      }

      if (filterYear && ano !== filterYear) {
        return false
      }
    }

    // Filtro por número do MDF-e
    if (searchNumber) {
      const numeroLimpo = searchNumber.replace(/\D/g, '')
      const numeroDocLimpo = documento.numero_mdfe.replace(/\D/g, '')
      if (!numeroDocLimpo.includes(numeroLimpo)) {
        return false
      }
    }

    return true
  }) || []

  // Aplicar paginação
  const totalItems = filteredDocumentos.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDocumentos = filteredDocumentos.slice(startIndex, endIndex)

  // Reset página quando filtros mudam
  React.useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, filterMonth, filterYear, searchNumber, itemsPerPage])

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
          <div className="flex space-x-2">
            <button
              onClick={async () => {
                console.log('🔄 Verificando arquivos e atualizando lista de MDF-e')
                try {
                  const result = await verificarArquivosMDFe()
                  queryClient.invalidateQueries({ queryKey: ['mdfe-documentos'] })
                  
                  if (result.atualizados > 0) {
                    toast.success(`${result.atualizados} documento(s) atualizado(s) para "Emitido"`)
                  } else {
                    toast.success('Lista atualizada. Nenhum arquivo novo encontrado.')
                  }
                } catch (error) {
                  console.error('Erro ao verificar arquivos:', error)
                  toast.error('Erro ao verificar arquivos')
                  queryClient.invalidateQueries({ queryKey: ['mdfe-documentos'] })
                }
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Atualizar Dados
            </button>
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
        </div>

        {/* Filtros */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendentes</option>
                <option value="emitido">Emitidos</option>
                <option value="encerrado">Encerrados</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês:</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Todos</option>
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                <option value="03">Março</option>
                <option value="04">Abril</option>
                <option value="05">Maio</option>
                <option value="06">Junho</option>
                <option value="07">Julho</option>
                <option value="08">Agosto</option>
                <option value="09">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano:</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Todos</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número MDF-e:</label>
              <input
                type="text"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                placeholder="Digite o número..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registros por página:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Informações dos filtros aplicados */}
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <div>
              Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} registros
            </div>
            {(filterStatus !== 'todos' || filterMonth || filterYear || searchNumber) && (
              <button
                onClick={() => {
                  setFilterStatus('todos')
                  setFilterMonth('')
                  setFilterYear('')
                  setSearchNumber('')
                }}
                className="text-indigo-600 hover:text-indigo-900 font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-3.5 text-left text-sm font-semibold text-gray-900 w-32">
                        Número MDF-e
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        CT-e Vinculado
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Empresa
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
                    {paginatedDocumentos?.map((documento) => (
                      <tr key={documento.id}>
                        <td className="px-2 py-4 text-sm">
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
                              {format(parseISO(documento.xml_gerado_em), 'dd/MM/ HH:mm')}
                            </div>
                          )}
                          {documento.xml_gerado && documento.xml_path && (
                            <div className="flex space-x-1 mt-1">
                              <a
                                href={`/${documento.xml_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                Ver XML
                              </a>
                              <a
                                href={`/${documento.xml_path}`}
                                download={`${documento.numero_mdfe}-mdfe.xml`}
                                className="text-xs text-green-600 hover:text-green-800 underline"
                              >
                                Baixar
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex items-center justify-end gap-2">
                            {((documento.pdf_gerado && documento.pdf_path) || 
                              (documento.status === 'emitido' && documento.chave_acesso) ||
                              (documento.status === 'aguardando' && documento.chave_acesso)) && (
                              <button
                                onClick={() => handleViewPDF(documento)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Visualizar PDF (DAMDFE)"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                            )}
                            {documento.status !== 'emitido' && documento.status !== 'encerrado' && (
                              <>
                                <button
                                  onClick={() => handleGenerateFiles(documento.id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Gerar arquivos"
                                  disabled={isGeneratingFiles}
                                >
                                  <DocumentArrowDownIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleEdit(documento)}
                                  className="text-indigo-600 hover:text-indigo-900"
                                  title="Editar"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                              </>
                            )}

                            {/* Status Change Buttons */}
                            <div className="flex items-center gap-1 ml-2 border-l pl-2">
                              {documento.status === 'pendente' && (
                                <button
                                  onClick={() => handleStatusChange(documento.id, 'aguardando')}
                                  disabled={!documento.xml_gerado}
                                  className={`${
                                    documento.xml_gerado
                                      ? 'text-orange-600 hover:text-orange-900'
                                      : 'text-gray-400 cursor-not-allowed'
                                  }`}
                                  title={documento.xml_gerado ? 'Aguardar arquivos do emissor' : 'Gere o XML primeiro para emitir'}
                                >
                                  <CheckCircleIcon className="h-5 w-5" />
                                </button>
                              )}
                              {(documento.status === 'emitido' || documento.status === 'pendente') && (
                                <button
                                  onClick={() => handleStatusChange(documento.id, 'cancelado')}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200"
                                  title="Cancelar MDF-e"
                                >
                                  ❌
                                </button>
                              )}
                              {(documento.status === 'cancelado' || documento.status === 'emitido') && (
                                <button
                                  onClick={() => handleStatusChange(documento.id, 'pendente')}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                  title="Marcar como pendente"
                                >
                                  ⚠️
                                </button>
                              )}
                              {documento.status === 'emitido' && (
                                <button
                                  onClick={() => handleStatusChange(documento.id, 'encerrado')}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                                  title="Encerrar MDF-e"
                                >
                                  ✅
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => handleDelete(documento)}
                              className="text-red-600 hover:text-red-900 ml-2"
                              title="Excluir"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-6 bg-white shadow rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Primeira
                </button>

                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>

                {/* Números das páginas */}
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const startPage = Math.max(1, currentPage - 2)
                    const pageNumber = startPage + i

                    if (pageNumber > totalPages) return null

                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`px-3 py-1 text-sm border rounded ${
                          currentPage === pageNumber
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Próxima
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Última
                </button>
              </div>
            </div>
          </div>
        )}
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
                                Chave: {cte.chave_acesso ? formatChaveAcesso(cte.chave_acesso) : 'N/A'}
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