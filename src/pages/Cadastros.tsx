import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { 
  getCadastros, 
  createCadastro, 
  updateCadastro, 
  deleteCadastro,
  type Cadastro,
  type CadastroCreate,
  type CadastroTipo
} from '@/lib/api/cadastros'

const TIPO_LABELS = {
  cliente: 'Cliente',
  fornecedor: 'Fornecedor',
  abastecimento: 'Posto de Abastecimento'
}

const TIPO_ICONS = {
  cliente: UserGroupIcon,
  fornecedor: BuildingOfficeIcon,
  abastecimento: BuildingStorefrontIcon
}

export default function Cadastros() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCadastro, setSelectedCadastro] = useState<Cadastro | null>(null)
  const [emails, setEmails] = useState<string[]>([''])
  const queryClient = useQueryClient()
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Estados para filtros
  const [filterTipo, setFilterTipo] = useState<CadastroTipo | 'todos'>('todos')
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [searchRazaoSocial, setSearchRazaoSocial] = useState('')
  const [searchCidade, setSearchCidade] = useState('')

  const { data: cadastros, isLoading } = useQuery({
    queryKey: ['cadastros'],
    queryFn: getCadastros,
    retry: 3,
    staleTime: 1000 * 60 * 5
  })

  // Reset página quando filtros mudam - SEMPRE deve ser chamado na mesma posição
  React.useEffect(() => {
    setCurrentPage(1)
  }, [filterTipo, filterStatus, searchRazaoSocial, searchCidade, itemsPerPage])

  const createMutation = useMutation({
    mutationFn: createCadastro,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadastros'] })
      toast.success('Cadastro criado com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error creating cadastro:', error)
      toast.error(error.message || 'Erro ao criar cadastro')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CadastroCreate> }) =>
      updateCadastro(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadastros'] })
      toast.success('Cadastro atualizado com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error updating cadastro:', error)
      toast.error(error.message || 'Erro ao atualizar cadastro')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCadastro,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadastros'] })
      toast.success('Cadastro excluído com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error deleting cadastro:', error)
      toast.error(error.message || 'Erro ao excluir cadastro')
    }
  })

  const resetForm = () => {
    setSelectedCadastro(null)
    setEmails([''])
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    // Filtrar emails vazios
    const validEmails = emails.filter(email => email.trim() !== '')
    
    if (validEmails.length === 0) {
      toast.error('Pelo menos um email é obrigatório')
      return
    }

    const cadastroData: CadastroCreate = {
      tipo: formData.get('tipo') as CadastroTipo,
      razao_social: formData.get('razao_social') as string,
      cnpj: formData.get('cnpj') as string || null,
      ie: formData.get('ie') as string || null,
      endereco: formData.get('endereco') as string,
      cidade: formData.get('cidade') as string,
      estado: formData.get('estado') as string,
      cep: formData.get('cep') as string,
      telefone: formData.get('telefone') as string || null,
      emails: validEmails,
      ativo: formData.get('ativo') === 'true'
    }

    if (selectedCadastro) {
      updateMutation.mutate({ id: selectedCadastro.id, data: cadastroData })
    } else {
      createMutation.mutate(cadastroData)
    }
  }

  const handleEdit = (cadastro: Cadastro) => {
    setSelectedCadastro(cadastro)
    setEmails(cadastro.emails.length > 0 ? cadastro.emails : [''])
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cadastro?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleAddEmail = () => {
    setEmails([...emails, ''])
  }

  const handleRemoveEmail = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index))
    }
  }

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)
  }

  // Aplicar filtros
  const filteredCadastros = cadastros?.filter(cadastro => {
    // Filtro por tipo
    if (filterTipo !== 'todos' && cadastro.tipo !== filterTipo) {
      return false
    }
    
    // Filtro por status
    if (filterStatus !== 'todos') {
      if (filterStatus === 'ativo' && !cadastro.ativo) {
        return false
      }
      if (filterStatus === 'inativo' && cadastro.ativo) {
        return false
      }
    }
    
    // Filtro por razão social
    if (searchRazaoSocial) {
      const searchTerm = searchRazaoSocial.toLowerCase()
      if (!cadastro.razao_social.toLowerCase().includes(searchTerm)) {
        return false
      }
    }
    
    // Filtro por cidade
    if (searchCidade) {
      const searchTerm = searchCidade.toLowerCase()
      if (!cadastro.cidade.toLowerCase().includes(searchTerm)) {
        return false
      }
    }
    
    return true
  }) || []

  // Aplicar paginação
  const totalItems = filteredCadastros.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCadastros = filteredCadastros.slice(startIndex, endIndex)

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
          <h1 className="text-2xl font-semibold text-gray-900">Cadastros</h1>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Novo Cadastro
          </button>
        </div>

        {/* Filtros */}
        <div className="mt-6 bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo:</label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value as CadastroTipo | 'todos')}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="todos">Todos</option>
                <option value="cliente">Clientes</option>
                <option value="fornecedor">Fornecedores</option>
                <option value="abastecimento">Postos de Abastecimento</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade:</label>
              <input
                type="text"
                value={searchCidade}
                onChange={(e) => setSearchCidade(e.target.value)}
                placeholder="Digite a cidade..."
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
            {(filterTipo !== 'todos' || filterStatus !== 'todos' || searchRazaoSocial || searchCidade) && (
              <button
                onClick={() => {
                  setFilterTipo('todos')
                  setFilterStatus('todos')
                  setSearchRazaoSocial('')
                  setSearchCidade('')
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
                        Tipo
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Razão Social
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        CNPJ
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Cidade/Estado
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Telefone
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
                    {paginatedCadastros?.map((cadastro) => {
                      const IconComponent = TIPO_ICONS[cadastro.tipo]
                      return (
                        <tr key={cadastro.id}>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <div className="flex items-center">
                              <IconComponent className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-gray-900">{TIPO_LABELS[cadastro.tipo]}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {cadastro.razao_social}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {cadastro.cnpj || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {cadastro.cidade}/{cadastro.estado}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {cadastro.telefone || '-'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              cadastro.ativo
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {cadastro.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button
                              onClick={() => handleEdit(cadastro)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                              title="Editar"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(cadastro.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Excluir"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
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
                {selectedCadastro ? 'Editar Cadastro' : 'Novo Cadastro'}
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
                    <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">
                      Tipo de Cadastro
                    </label>
                    <select
                      name="tipo"
                      id="tipo"
                      defaultValue={selectedCadastro?.tipo}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione o tipo</option>
                      <option value="cliente">Cliente</option>
                      <option value="fornecedor">Fornecedor</option>
                      <option value="abastecimento">Posto de Abastecimento</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="ativo" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      name="ativo"
                      id="ativo"
                      defaultValue={selectedCadastro?.ativo === false ? 'false' : 'true'}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="razao_social" className="block text-sm font-medium text-gray-700">
                    Razão Social *
                  </label>
                  <input
                    type="text"
                    name="razao_social"
                    id="razao_social"
                    defaultValue={selectedCadastro?.razao_social}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      name="cnpj"
                      id="cnpj"
                      defaultValue={selectedCadastro?.cnpj || ''}
                      placeholder="00.000.000/0000-00"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="ie" className="block text-sm font-medium text-gray-700">
                      Inscrição Estadual
                    </label>
                    <input
                      type="text"
                      name="ie"
                      id="ie"
                      defaultValue={selectedCadastro?.ie || ''}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
                    Endereço *
                  </label>
                  <input
                    type="text"
                    name="endereco"
                    id="endereco"
                    defaultValue={selectedCadastro?.endereco}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      name="cidade"
                      id="cidade"
                      defaultValue={selectedCadastro?.cidade}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
                      Estado *
                    </label>
                    <input
                      type="text"
                      name="estado"
                      id="estado"
                      defaultValue={selectedCadastro?.estado}
                      required
                      maxLength={2}
                      placeholder="SP"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="cep" className="block text-sm font-medium text-gray-700">
                      CEP *
                    </label>
                    <input
                      type="text"
                      name="cep"
                      id="cep"
                      defaultValue={selectedCadastro?.cep}
                      required
                      placeholder="00000-000"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    name="telefone"
                    id="telefone"
                    defaultValue={selectedCadastro?.telefone || ''}
                    placeholder="(11) 99999-9999"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mails *
                  </label>
                  <div className="space-y-2">
                    {emails.map((email, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => handleEmailChange(index, e.target.value)}
                          placeholder="email@exemplo.com"
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        {emails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddEmail}
                      className="text-sm text-indigo-600 hover:text-indigo-900"
                    >
                      + Adicionar outro email
                    </button>
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
                      {selectedCadastro ? 'Atualizando...' : 'Cadastrando...'}
                    </>
                  ) : (
                    selectedCadastro ? 'Atualizar' : 'Cadastrar'
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