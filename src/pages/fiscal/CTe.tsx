
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import {
  getCTeDocumentos,
  createCTeDocumento,
  updateCTeDocumento,
  deleteCTeDocumento,
  generateCTeFiles,
  getEmpresasFiscais,
  getCadastrosClientes,
  getCTeProdutos,
  getAssociacoesAtivasParaCTe,
  formatCNPJ,
  formatChaveAcesso,
  type CTeDocumento,
  type CTeDocumentoCreate,
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

export default function CTe() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDocumento, setSelectedDocumento] = useState<CTeDocumento | null>(null)
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'emitido' | 'cancelado'>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [isGeneratingFiles, setIsGeneratingFiles] = useState(false)
  
  const queryClient = useQueryClient()

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['cte-documentos'],
    queryFn: getCTeDocumentos,
    retry: 3,
    staleTime: 1000 * 60 * 5
  })

  const { data: empresas } = useQuery({
    queryKey: ['empresas-fiscais'],
    queryFn: getEmpresasFiscais
  })

  const { data: clientes } = useQuery({
    queryKey: ['cadastros-clientes'],
    queryFn: getCadastrosClientes
  })

  const { data: produtos } = useQuery({
    queryKey: ['cte-produtos'],
    queryFn: getCTeProdutos
  })

  const { data: associacoes } = useQuery({
    queryKey: ['associacoes-ativas-cte'],
    queryFn: getAssociacoesAtivasParaCTe
  })

  // Filtrar e paginar documentos
  const filteredDocumentos = useMemo(() => {
    if (!documentos) return []

    return documentos.filter(doc => {
      // Filtro por status
      if (filterStatus !== 'todos' && doc.status !== filterStatus) {
        return false
      }

      // Filtro por número do CT-e
      if (searchTerm && !doc.numero_cte.toString().includes(searchTerm)) {
        return false
      }

      // Filtro por mês e ano
      if (filterMonth || filterYear) {
        const docDate = parseISO(doc.data_emissao)
        
        if (filterYear && docDate.getFullYear().toString() !== filterYear) {
          return false
        }
        
        if (filterMonth && (docDate.getMonth() + 1).toString().padStart(2, '0') !== filterMonth) {
          return false
        }
      }

      return true
    })
  }, [documentos, filterStatus, searchTerm, filterMonth, filterYear])

  // Calcular paginação
  const totalPages = Math.ceil(filteredDocumentos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedDocumentos = filteredDocumentos.slice(startIndex, startIndex + itemsPerPage)

  // Reset da página quando filtros mudam
  const handleFilterChange = () => {
    setCurrentPage(1)
  }

  // Gerar anos para o filtro
  const availableYears = useMemo(() => {
    if (!documentos) return []
    const years = [...new Set(documentos.map(doc => parseISO(doc.data_emissao).getFullYear()))]
    return years.sort((a, b) => b - a)
  }, [documentos])

  const createMutation = useMutation({
    mutationFn: createCTeDocumento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cte-documentos'] })
      toast.success('CT-e criado com sucesso!')
      setIsModalOpen(false)
    },
    onError: () => {
      toast.error('Erro ao criar CT-e')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CTeDocumentoCreate> }) =>
      updateCTeDocumento(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cte-documentos'] })
      toast.success('CT-e atualizado com sucesso!')
      setIsModalOpen(false)
    },
    onError: () => {
      toast.error('Erro ao atualizar CT-e')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCTeDocumento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cte-documentos'] })
      toast.success('CT-e excluído com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao excluir CT-e')
    }
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const cteData = {
      empresa_id: formData.get('empresa_id') as string,
      remetente_id: formData.get('remetente_id') as string,
      destinatario_id: formData.get('destinatario_id') as string,
      produto_predominante_id: formData.get('produto_predominante_id') as string,
      valor_prestacao: parseFloat(formData.get('valor_prestacao') as string),
      valor_carga: parseFloat(formData.get('valor_carga') as string),
      quantidade_carga: parseFloat(formData.get('quantidade_carga') as string),
      observacoes: formData.get('observacoes') as string,
    }

    if (selectedDocumento) {
      updateMutation.mutate({ id: selectedDocumento.id, data: cteData })
    } else {
      createMutation.mutate(cteData as CTeDocumentoCreate)
    }
  }

  const handleEdit = (documento: CTeDocumento) => {
    setSelectedDocumento(documento)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este CT-e?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleGenerateFiles = async (documento: CTeDocumento) => {
    setIsGeneratingFiles(true)
    try {
      await generateCTeFiles(documento.id)
      toast.success('Arquivos do CT-e gerados com sucesso!')
    } catch (error) {
      toast.error('Erro ao gerar arquivos do CT-e')
    } finally {
      setIsGeneratingFiles(false)
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Documentos CT-e</h1>
          <button
            onClick={() => {
              setSelectedDocumento(null)
              setIsModalOpen(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Novo CT-e
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white shadow rounded-lg mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Busca por número */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar por Número
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    handleFilterChange()
                  }}
                  placeholder="Digite o número do CT-e"
                  className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Filtro por ano */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ano
              </label>
              <select
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(e.target.value)
                  handleFilterChange()
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Todos os anos</option>
                {availableYears.map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>

            {/* Filtro por mês */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mês
              </label>
              <select
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value)
                  handleFilterChange()
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Todos os meses</option>
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

            {/* Filtro por status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as any)
                  handleFilterChange()
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="emitido">Emitido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            {/* Registros por página */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registros por página
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value))
                  setCurrentPage(1)
                }}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Emissão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Prestação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chave de Acesso
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedDocumentos.map((documento) => (
                  <tr key={documento.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {documento.numero_cte}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(documento.data_emissao), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[documento.status]}`}>
                        {STATUS_LABELS[documento.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      R$ {documento.valor_prestacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {documento.chave_acesso ? formatChaveAcesso(documento.chave_acesso) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleGenerateFiles(documento)}
                        disabled={isGeneratingFiles}
                        className="text-green-600 hover:text-green-900"
                        title="Gerar Arquivos"
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

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Próximo
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                    <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredDocumentos.length)}</span> de{' '}
                    <span className="font-medium">{filteredDocumentos.length}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber
                      if (totalPages <= 5) {
                        pageNumber = i + 1
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i
                      } else {
                        pageNumber = currentPage - 2 + i
                      }
                      
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === pageNumber
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      )
                    })}

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {filteredDocumentos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum documento CT-e encontrado.</p>
          </div>
        )}
      </div>

      {/* Modal será implementado posteriormente */}
    </div>
  )
}
