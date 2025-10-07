import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { getMaintenances, createMaintenance, updateMaintenance, deleteMaintenance } from '@/lib/api/maintenance'
import { getVehicles } from '@/lib/api/vehicles'
import type { Maintenance } from '@/lib/api/maintenance'

export default function MaintenancePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null)
  const queryClient = useQueryClient()

  // Estados para filtros e paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const itemsPerPage = 10

  // Debounce para busca
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, filterType, filterStatus])

  const {
    data: maintenancesData,
    isLoading: isLoadingMaintenances, // Renamed to avoid conflict with mutation loading state
    error,
    refetch
  } = useQuery({
    queryKey: ['maintenances', currentPage, debouncedSearchTerm, filterType, filterStatus],
    queryFn: () => getMaintenances(currentPage, itemsPerPage, debouncedSearchTerm, filterType, filterStatus),
    placeholderData: (previousData) => previousData
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles
  })

  const createMutation = useMutation({
    mutationFn: createMaintenance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] })
      toast.success('Manutenção agendada com sucesso!')
      setIsModalOpen(false)
    },
    onError: () => {
      toast.error('Erro ao agendar manutenção')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Maintenance> }) =>
      updateMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] })
      toast.success('Manutenção atualizada com sucesso!')
      setIsModalOpen(false)
    },
    onError: () => {
      toast.error('Erro ao atualizar manutenção')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMaintenance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] })
      toast.success('Manutenção excluída com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao excluir manutenção')
    }
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const maintenanceData = {
      veiculo_id: formData.get('veiculo_id') as string,
      tipo: formData.get('tipo') as string,
      descricao: formData.get('descricao') as string,
      data_prevista: formData.get('data_prevista') as string,
      data_realizada: formData.get('data_realizada') as string || null,
    }

    if (selectedMaintenance) {
      updateMutation.mutate({ id: selectedMaintenance.id, data: maintenanceData })
    } else {
      createMutation.mutate(maintenanceData)
    }
  }

  const handleEdit = (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta manutenção?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleComplete = async (maintenance: Maintenance) => {
    updateMutation.mutate({
      id: maintenance.id,
      data: {
        data_realizada: new Date().toISOString()
      }
    })
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterType('')
    setFilterStatus('')
    setCurrentPage(1)
  }

  if (isLoadingMaintenances && !maintenancesData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erro ao carregar manutenções</p>
          <button
            onClick={() => refetch()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const maintenances = maintenancesData?.maintenances || []
  const total = maintenancesData?.total || 0
  const totalPages = maintenancesData?.totalPages || 0

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Manutenções</h1>
            <p className="text-sm text-gray-600">
              {total} {total === 1 ? 'manutenção encontrada' : 'manutenções encontradas'}
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedMaintenance(null)
              setIsModalOpen(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Nova Manutenção
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Campo de busca */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por placa ou modelo..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro por tipo */}
            <div className="relative">
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">Todos os tipos</option>
                <option value="troca_oleo">Troca de Óleo</option>
                <option value="revisao_freios">Revisão de Freios</option>
                <option value="alinhamento">Alinhamento</option>
                <option value="balanceamento">Balanceamento</option>
                <option value="troca_pneus">Troca de Pneus</option>
                <option value="revisao_geral">Revisão Geral</option>
              </select>
            </div>

            {/* Filtro por status */}
            <div className="relative">
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="realizada">Realizada</option>
              </select>
            </div>

            {/* Botões de ação */}
            <div className="flex space-x-2">
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FunnelIcon className="h-4 w-4 mr-1" />
                Limpar
              </button>
              <button
                onClick={() => refetch()}
                disabled={isLoadingMaintenances}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-4 w-4 mr-1 ${isLoadingMaintenances ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
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
                    Veículo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Prevista
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {maintenances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      Nenhuma manutenção encontrada
                    </td>
                  </tr>
                ) : (
                  maintenances.map((maintenance: Maintenance) => (
                    <tr key={maintenance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {maintenance.veiculo.placa} - {maintenance.veiculo.modelo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {maintenance.tipo === 'troca_oleo' && 'Troca de Óleo'}
                        {maintenance.tipo === 'revisao_freios' && 'Revisão de Freios'}
                        {maintenance.tipo === 'alinhamento' && 'Alinhamento'}
                        {maintenance.tipo === 'balanceamento' && 'Balanceamento'}
                        {maintenance.tipo === 'troca_pneus' && 'Troca de Pneus'}
                        {maintenance.tipo === 'revisao_geral' && 'Revisão Geral'}
                        {!['troca_oleo', 'revisao_freios', 'alinhamento', 'balanceamento', 'troca_pneus', 'revisao_geral'].includes(maintenance.tipo) && maintenance.tipo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {maintenance.descricao}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(parseISO(maintenance.data_prevista), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {maintenance.data_realizada ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Realizada
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {!maintenance.data_realizada && (
                            <button
                              onClick={() => handleComplete(maintenance)}
                              className="text-green-600 hover:text-green-900"
                              title="Marcar como realizada"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(maintenance)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(maintenance.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando{' '}
                  <span className="font-medium">
                    {Math.min((currentPage - 1) * itemsPerPage + 1, total)}
                  </span>{' '}
                  até{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, total)}
                  </span>{' '}
                  de{' '}
                  <span className="font-medium">{total}</span>{' '}
                  resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Anterior</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* Números das páginas */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Próximo</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-medium mb-4">
              {selectedMaintenance ? 'Editar Manutenção' : 'Nova Manutenção'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="veiculo_id" className="block text-sm font-medium text-gray-700">
                    Veículo
                  </label>
                  <select
                    name="veiculo_id"
                    id="veiculo_id"
                    defaultValue={selectedMaintenance?.veiculo_id}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecione um veículo</option>
                    {vehicles?.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.placa} - {vehicle.modelo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">
                    Tipo
                  </label>
                  <select
                    name="tipo"
                    id="tipo"
                    defaultValue={selectedMaintenance?.tipo}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="troca_oleo">Troca de Óleo</option>
                    <option value="revisao_freios">Revisão de Freios</option>
                    <option value="alinhamento">Alinhamento</option>
                    <option value="balanceamento">Balanceamento</option>
                    <option value="troca_pneus">Troca de Pneus</option>
                    <option value="revisao_geral">Revisão Geral</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
                    Descrição
                  </label>
                  <textarea
                    name="descricao"
                    id="descricao"
                    rows={3}
                    defaultValue={selectedMaintenance?.descricao}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="data_prevista" className="block text-sm font-medium text-gray-700">
                    Data Prevista
                  </label>
                  <input
                    type="date"
                    name="data_prevista"
                    id="data_prevista"
                    defaultValue={selectedMaintenance?.data_prevista.split('T')[0]}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                {selectedMaintenance && (
                  <div>
                    <label htmlFor="data_realizada" className="block text-sm font-medium text-gray-700">
                      Data Realizada
                    </label>
                    <input
                      type="date"
                      name="data_realizada"
                      id="data_realizada"
                      defaultValue={selectedMaintenance.data_realizada?.split('T')[0]}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
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
                  {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : (selectedMaintenance ? 'Atualizar' : 'Cadastrar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}