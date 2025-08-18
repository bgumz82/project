import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  EyeIcon,
  DocumentChartBarIcon,
  PhotoIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { getChecklists, createChecklist, deleteChecklist, getDefaultChecklistItems, getChecklistPhotos } from '@/lib/api/checklists'
import { getVehicles } from '@/lib/api/vehicles'
import { useAuth } from '@/contexts/AuthContext'
import type { ChecklistItem } from '@/lib/api/checklists'

export default function Checklists() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false)
  const [selectedChecklist, setSelectedChecklist] = useState<any>(null)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(getDefaultChecklistItems())
  const { user, userType } = useAuth()
  const queryClient = useQueryClient()

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['checklists'],
    queryFn: getChecklists
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles
  })

  const { data: photos, isLoading: isLoadingPhotos } = useQuery({
    queryKey: ['checklist-photos', selectedChecklist?.id],
    queryFn: () => selectedChecklist ? getChecklistPhotos(selectedChecklist.id) : null,
    enabled: !!selectedChecklist && isPhotosModalOpen
  })

  const createMutation = useMutation({
    mutationFn: createChecklist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] })
      toast.success('Checklist registrado com sucesso!')
      setIsModalOpen(false)
    },
    onError: (error) => {
      console.error('Error creating checklist:', error)
      toast.error('Erro ao registrar checklist')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteChecklist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists'] })
      toast.success('Checklist excluído com sucesso!')
    },
    onError: (error) => {
      console.error('Error deleting checklist:', error)
      toast.error('Erro ao excluir checklist')
    }
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user?.id) {
      toast.error('Usuário não autenticado')
      return
    }

    const formData = new FormData(e.currentTarget)
    
    const checklistData = {
      veiculo_id: formData.get('veiculo_id') as string,
      operador_id: user.id,
      data_checklist: new Date().toISOString(),
      itens: checklistItems,
      observacoes: formData.get('observacoes') as string
    }

    createMutation.mutate(checklistData)
  }

  const handleItemChange = (itemId: string, field: 'status' | 'observacao', value: string) => {
    setChecklistItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, [field]: value }
          : item
      )
    )
  }

  const handleView = (checklist: any) => {
    setSelectedChecklist(checklist)
    setIsViewModalOpen(true)
  }

  const handleViewPhotos = (checklist: any) => {
    setSelectedChecklist(checklist)
    setIsPhotosModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este checklist?')) {
      deleteMutation.mutate(id)
    }
  }

  const parseChecklistItems = (itens: string | null): ChecklistItem[] => {
    if (!itens) return []
    try {
      const parsed = typeof itens === 'string' ? JSON.parse(itens) : itens
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('Error parsing checklist items:', error)
      return []
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
          <h1 className="text-2xl font-semibold text-gray-900">Checklists</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setChecklistItems(getDefaultChecklistItems())
                setIsModalOpen(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Novo Checklist
            </button>
            <button
              onClick={() => {
                // TODO: Implementar exportação
                toast.success('Relatório exportado com sucesso!')
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentChartBarIcon className="-ml-1 mr-2 h-5 w-5" />
              Exportar Relatório
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
                        Data
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Veículo
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Operador
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
                    {checklists?.map((checklist) => {
                      const items = parseChecklistItems(checklist.itens)
                      const hasIssues = items.some(item => item.status === 'nao_ok')

                      return (
                        <tr key={checklist.id}>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {format(parseISO(checklist.data_checklist), 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                            {checklist.veiculo_placa} - {checklist.veiculo_modelo}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {checklist.operador_email}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              hasIssues
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {hasIssues ? 'Problemas Encontrados' : 'OK'}
                            </span>
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button
                              onClick={() => handleViewPhotos(checklist)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                              title="Ver fotos"
                            >
                              <PhotoIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleView(checklist)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                              title="Ver detalhes"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            {userType === 'admin' && (
                              <button
                                onClick={() => handleDelete(checklist.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Excluir checklist"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
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
      </div>

      {/* Modal de Novo Checklist */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6">
            <h2 className="text-lg font-medium mb-4">Novo Checklist</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="veiculo_id" className="block text-sm font-medium text-gray-700">
                    Veículo
                  </label>
                  <select
                    name="veiculo_id"
                    id="veiculo_id"
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

                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-4">Itens do Checklist</h3>
                  <div className="space-y-4">
                    {checklistItems.map((item) => (
                      <div key={item.id} className="flex items-start space-x-4">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700">
                            {item.nome}
                          </label>
                        </div>
                        <div className="w-32">
                          <select
                            value={item.status}
                            onChange={(e) => handleItemChange(item.id, 'status', e.target.value as 'ok' | 'nao_ok' | 'na')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="ok">OK</option>
                            <option value="nao_ok">Não OK</option>
                            <option value="na">N/A</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.observacao || ''}
                            onChange={(e) => handleItemChange(item.id, 'observacao', e.target.value)}
                            placeholder="Observação"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700">
                    Observações Gerais
                  </label>
                  <textarea
                    name="observacoes"
                    id="observacoes"
                    rows={3}
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
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {isViewModalOpen && selectedChecklist && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-medium">
                  Checklist - {selectedChecklist.veiculo_placa}
                </h2>
                <p className="text-sm text-gray-500">
                  Realizado em {format(parseISO(selectedChecklist.data_checklist), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Fechar</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">Informações do Veículo</h3>
              <dl className="mt-2 divide-y divide-gray-200">
                <div className="py-3 flex justify-between text-sm">
                  <dt className="text-gray-500">Placa</dt>
                  <dd className="text-gray-900">{selectedChecklist.veiculo_placa}</dd>
                </div>
                <div className="py-3 flex justify-between text-sm">
                  <dt className="text-gray-500">Modelo</dt>
                  <dd className="text-gray-900">{selectedChecklist.veiculo_modelo}</dd>
                </div>
                <div className="py-3 flex justify-between text-sm">
                  <dt className="text-gray-500">Operador</dt>
                  <dd className="text-gray-900">{selectedChecklist.operador_email}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">Itens Verificados</h3>
              <div className="mt-2 divide-y divide-gray-200">
                {parseChecklistItems(selectedChecklist.itens).map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <p className="text-gray-900">{item.nome}</p>
                      {item.observacao && (
                        <p className="text-gray-500 text-xs mt-1">{item.observacao}</p>
                      )}
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        item.status === 'ok'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'nao_ok'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status === 'ok' ? 'OK' : item.status === 'nao_ok' ? 'Não OK' : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedChecklist.observacoes && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900">Observações Gerais</h3>
                <p className="mt-2 text-sm text-gray-500">{selectedChecklist.observacoes}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Fotos */}
      {isPhotosModalOpen && selectedChecklist && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-medium">
                  Fotos do Checklist - {selectedChecklist.veiculo_placa}
                </h2>
                <p className="text-sm text-gray-500">
                  Realizado em {format(parseISO(selectedChecklist.data_checklist), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
              <button
                onClick={() => setIsPhotosModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Fechar</span>
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-6">
              {isLoadingPhotos ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : photos && photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={photo.url}
                        alt={photo.tipo.replace('_', ' ')}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                        <p className="text-sm font-medium text-center">
                          {photo.tipo.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2">Nenhuma foto encontrada para este checklist.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPhotosModalOpen(false)}
                className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}