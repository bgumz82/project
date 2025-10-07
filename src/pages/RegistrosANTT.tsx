
import React, { useState } from 'react'
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

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Estados para filtros
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [filterUF, setFilterUF] = useState('')
  const [searchPlaca, setSearchPlaca] = useState('')
  const [searchRazaoSocial, setSearchRazaoSocial] = useState('')
  const [searchCNPJ, setSearchCNPJ] = useState('')
  const [searchANTT, setSearchANTT] = useState('')
  const [filterEmpresaProprietario, setFilterEmpresaProprietario] = useState<'todos' | 'sim' | 'nao'>('todos')

  const queryClient = useQueryClient()

  const { data: registros, isLoading, refetch } = useQuery({
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

  // Aplicar filtros
  const filteredRegistros = registros?.filter(registro => {
    // Filtro por status
    if (filterStatus !== 'todos' && 
        ((filterStatus === 'ativo' && !registro.ativo) || 
         (filterStatus === 'inativo' && registro.ativo))) {
      return false
    }

    // Filtro por UF
    if (filterUF && registro.uf_registro !== filterUF) {
      return false
    }

    // Filtro por empresa proprietário
    if (filterEmpresaProprietario !== 'todos' &&
        ((filterEmpresaProprietario === 'sim' && !registro.empresa_proprietario) ||
         (filterEmpresaProprietario === 'nao' && registro.empresa_proprietario))) {
      return false
    }

    // Filtro por placa
    if (searchPlaca) {
      const placaLimpa = searchPlaca.replace(/[^\w]/g, '')
      const placaRegistroLimpa = registro.veiculo?.placa?.replace(/[^\w]/g, '') || ''
      if (!placaRegistroLimpa.toLowerCase().includes(placaLimpa.toLowerCase())) {
        return false
      }
    }

    // Filtro por razão social
    if (searchRazaoSocial && !registro.razao_social_proprietario.toLowerCase().includes(searchRazaoSocial.toLowerCase())) {
      return false
    }

    // Filtro por CNPJ
    if (searchCNPJ) {
      const cnpjLimpo = searchCNPJ.replace(/[^\d]/g, '')
      const cnpjRegistroLimpo = registro.cnpj.replace(/[^\d]/g, '')
      if (!cnpjRegistroLimpo.includes(cnpjLimpo)) {
        return false
      }
    }

    // Filtro por ANTT
    if (searchANTT && !registro.antt.includes(searchANTT)) {
      return false
    }

    return true
  }) || []

  // Aplicar paginação
  const totalItems = filteredRegistros.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRegistros = filteredRegistros.slice(startIndex, endIndex)

  // Reset página quando filtros mudam
  React.useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, filterUF, filterEmpresaProprietario, searchPlaca, searchRazaoSocial, searchCNPJ, searchANTT, itemsPerPage])

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
          <div className="flex space-x-2">
            <button
              onClick={() => {
                console.log('🔄 Atualizando lista de registros ANTT manualmente')
                refetch()
                toast.success('Lista de registros ANTT atualizada!')
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
                resetForm()
                setIsModalOpen(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Novo Registro ANTT
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UF:</label>
              <select
                value={filterUF}
                onChange={(e) => setFilterUF(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Todas</option>
                {ESTADOS_BRASIL.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa Proprietário:</label>
              <select
                value={filterEmpresaProprietario}
                onChange={(e) => setFilterEmpresaProprietario(e.target.value as any)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="todos">Todos</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
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

          {/* Segunda linha de filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placa:</label>
              <input
                type="text"
                value={searchPlaca}
                onChange={(e) => setSearchPlaca(e.target.value)}
                placeholder="Digite a placa..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social:</label>
              <input
                type="text"
                value={searchRazaoSocial}
                onChange={(e) => setSearchRazaoSocial(e.target.value)}
                placeholder="Digite a razão social..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ:</label>
              <input
                type="text"
                value={searchCNPJ}
                onChange={(e) => setSearchCNPJ(e.target.value)}
                placeholder="Digite o CNPJ..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ANTT:</label>
              <input
                type="text"
                value={searchANTT}
                onChange={(e) => setSearchANTT(e.target.value)}
                placeholder="Digite o ANTT..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Informações dos filtros aplicados */}
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <div>
              Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} registros
            </div>
            {(filterStatus !== 'todos' || filterUF || filterEmpresaProprietario !== 'todos' || searchPlaca || searchRazaoSocial || searchCNPJ || searchANTT) && (
              <button
                onClick={() => {
                  setFilterStatus('todos')
                  setFilterUF('')
                  setFilterEmpresaProprietario('todos')
                  setSearchPlaca('')
                  setSearchRazaoSocial('')
                  setSearchCNPJ('')
                  setSearchANTT('')
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
                    {paginatedRegistros?.map((registro) => (
                      <tr key={registro.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium font-mono">{registro.veiculo?.placa}</div>
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
