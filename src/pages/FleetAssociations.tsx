import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  UserIcon,
  TruckIcon,
  CalendarIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { 
  getAssociacoesFrota, 
  createAssociacaoFrota, 
  updateAssociacaoFrota, 
  deleteAssociacaoFrota,
  finalizarAssociacaoFrota,
  getMotoristasDisponiveis,
  getCaminhoesDisponiveis,
  getReboquesDisponiveis,
  getImplementosDisponiveis,
  type AssociacaoFrota,
  type AssociacaoFrotaCreate
} from '@/lib/api/fleet-associations'

const TIPO_LABELS = {
  caminhao: 'Caminhão',
  bi_trem_1_reboque: 'Bi-Trem - 1º Reboque',
  bi_trem_2_reboque: 'Bi-Trem - 2º Reboque',
  vanderleia_3_eixos: 'Vanderleia - 3 Eixos',
  vanderleia_4_eixos: 'Vanderleia - 4 Eixos',
  julieta: 'Julieta'
}

export default function FleetAssociations() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAssociacao, setSelectedAssociacao] = useState<AssociacaoFrota | null>(null)
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'finalizado'>('todos')
  const queryClient = useQueryClient()

  const { data: associacoes, isLoading } = useQuery({
    queryKey: ['associacoes-frota'],
    queryFn: getAssociacoesFrota,
    retry: 3,
    staleTime: 1000 * 60 * 5
  })

  const { data: motoristasDisponiveis } = useQuery({
    queryKey: ['motoristas-disponiveis'],
    queryFn: getMotoristasDisponiveis
  })

  const { data: caminhoesDisponiveis } = useQuery({
    queryKey: ['caminhoes-disponiveis'],
    queryFn: getCaminhoesDisponiveis
  })

  const { data: reboquesDisponiveis } = useQuery({
    queryKey: ['reboques-disponiveis'],
    queryFn: getReboquesDisponiveis
  })

  const { data: implementosDisponiveis } = useQuery({
    queryKey: ['implementos-disponiveis'],
    queryFn: getImplementosDisponiveis
  })

  const createMutation = useMutation({
    mutationFn: createAssociacaoFrota,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associacoes-frota'] })
      queryClient.invalidateQueries({ queryKey: ['motoristas-disponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['caminhoes-disponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['reboques-disponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['implementos-disponiveis'] })
      toast.success('Associação criada com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error creating associacao:', error)
      toast.error(error.message || 'Erro ao criar associação')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssociacaoFrotaCreate> }) =>
      updateAssociacaoFrota(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associacoes-frota'] })
      queryClient.invalidateQueries({ queryKey: ['motoristas-disponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['caminhoes-disponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['reboques-disponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['implementos-disponiveis'] })
      toast.success('Associação atualizada com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error updating associacao:', error)
      toast.error(error.message || 'Erro ao atualizar associação')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAssociacaoFrota,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associacoes-frota'] })
      queryClient.invalidateQueries({ queryKey: ['motoristas-disponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['caminhoes-disponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['reboques-disponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['implementos-disponiveis'] })
      toast.success('Associação excluída com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error deleting associacao:', error)
      toast.error(error.message || 'Erro ao excluir associação')
    }
  })

  const finalizarMutation = useMutation({
    mutationFn: ({ id, dataFim }: { id: string; dataFim: string }) =>
      finalizarAssociacaoFrota(id, dataFim),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associacoes-frota'] })
      queryClient.invalidateQueries({ queryKey: ['motoristas-disponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['caminhoes-disponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['reboques-disponiveis'] })
      queryClient.invalidateQueries({ queryKey: ['implementos-disponiveis'] })
      toast.success('Associação finalizada com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error finalizing associacao:', error)
      toast.error(error.message || 'Erro ao finalizar associação')
    }
  })

  const resetForm = () => {
    setSelectedAssociacao(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const associacaoData: AssociacaoFrotaCreate = {
      funcionario_id: formData.get('funcionario_id') as string,
      veiculo_principal_id: formData.get('veiculo_principal_id') as string,
      veiculo_reboque1_id: formData.get('veiculo_reboque1_id') as string || null,
      veiculo_reboque2_id: formData.get('veiculo_reboque2_id') as string || null,
      veiculo_implemento_id: formData.get('veiculo_implemento_id') as string || null,
      data_inicio: formData.get('data_inicio') as string,
      data_fim: formData.get('data_fim') as string || null,
      ativo: formData.get('ativo') === 'true',
      observacoes: formData.get('observacoes') as string || null
    }

    if (selectedAssociacao) {
      updateMutation.mutate({ id: selectedAssociacao.id, data: associacaoData })
    } else {
      createMutation.mutate(associacaoData)
    }
  }

  const handleEdit = (associacao: AssociacaoFrota) => {
    setSelectedAssociacao(associacao)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta associação?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleFinalizar = async (associacao: AssociacaoFrota) => {
    const dataFim = prompt('Digite a data de finalização (YYYY-MM-DD):', format(new Date(), 'yyyy-MM-dd'))
    if (dataFim) {
      finalizarMutation.mutate({ id: associacao.id, dataFim })
    }
  }

  const filteredAssociacoes = associacoes?.filter(associacao => {
    if (filterStatus === 'todos') return true
    if (filterStatus === 'ativo') return associacao.ativo && !associacao.data_fim
    if (filterStatus === 'finalizado') return !associacao.ativo || associacao.data_fim
    return true
  })

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
            <h1 className="text-2xl font-semibold text-gray-900">Associações de Frota</h1>
          </div>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Nova Associação
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
              <option value="todos">Todas</option>
              <option value="ativo">Ativas</option>
              <option value="finalizado">Finalizadas</option>
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
                        Motorista
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Veículo
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Período
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Observações
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredAssociacoes?.map((associacao) => (
                      <tr key={associacao.id}>
                        <td className="px-3 py-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">
                              {associacao.funcionario?.nome || 'Nome não informado'}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Mat: {associacao.funcionario?.matricula || 'N/A'} • CNH: {associacao.funcionario?.cnh || 'N/A'}
                            </div>
                            {associacao.funcionario?.validade_cnh && (
                              <div className="text-gray-500 text-xs">
                                Válida até: {format(parseISO(associacao.funcionario.validade_cnh), 'dd/MM/yyyy')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">
                              {associacao.veiculo_principal?.placa || 'Placa não informada'}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {associacao.veiculo_principal?.marca || 'Marca N/A'} {associacao.veiculo_principal?.modelo || 'Modelo N/A'}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Caminhão Principal
                            </div>
                            {associacao.veiculo_reboque1 && (
                              <div className="text-blue-600 text-xs">
                                + {associacao.veiculo_reboque1.placa} (1º Reboque)
                              </div>
                            )}
                            {associacao.veiculo_reboque2 && (
                              <div className="text-blue-600 text-xs">
                                + {associacao.veiculo_reboque2.placa} (2º Reboque)
                              </div>
                            )}
                            {associacao.veiculo_implemento && (
                              <div className="text-purple-600 text-xs">
                                + {associacao.veiculo_implemento.placa} ({TIPO_LABELS[associacao.veiculo_implemento.tipo as keyof typeof TIPO_LABELS] || associacao.veiculo_implemento.tipo})
                              </div>
                            )}
                            </div>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div>
                            <div>Início: {format(parseISO(associacao.data_inicio), 'dd/MM/yyyy')}</div>
                            {associacao.data_fim && (
                              <div>Fim: {format(parseISO(associacao.data_fim), 'dd/MM/yyyy')}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            associacao.ativo && !associacao.data_fim
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {associacao.ativo && !associacao.data_fim ? 'Ativa' : 'Finalizada'}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {associacao.observacoes || '-'}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          {associacao.ativo && !associacao.data_fim && (
                            <button
                              onClick={() => handleFinalizar(associacao)}
                              className="text-orange-600 hover:text-orange-900 mr-4"
                              title="Finalizar associação"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(associacao)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(associacao.id)}
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
                {selectedAssociacao ? 'Editar Associação' : 'Nova Associação de Frota'}
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
                {/* Seleção de Motorista */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <UserIcon className="h-5 w-5 text-indigo-600 mr-2" />
                    Motorista
                  </h3>
                  <div>
                    <label htmlFor="funcionario_id" className="block text-sm font-medium text-gray-700">
                      Selecionar Motorista *
                    </label>
                    <select
                      name="funcionario_id"
                      id="funcionario_id"
                      defaultValue={selectedAssociacao?.funcionario_id}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione um motorista</option>
                      {motoristasDisponiveis?.map((motorista) => (
                        <option key={motorista.id} value={motorista.id}>
                          {motorista.nome} - Mat: {motorista.matricula} - CNH: {motorista.cnh}
                          {motorista.validade_cnh && ` (Válida até: ${format(parseISO(motorista.validade_cnh), 'dd/MM/yyyy')})`}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Apenas motoristas ativos com CNH válida aparecem na lista
                    </p>
                  </div>
                </div>

                {/* Seleção de Veículo */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <TruckIcon className="h-5 w-5 text-indigo-600 mr-2" />
                    Veículos da Composição
                  </h3>
                  
                  {/* Caminhão Principal (Obrigatório) */}
                  <div className="mb-4">
                    <label htmlFor="veiculo_principal_id" className="block text-sm font-medium text-gray-700">
                      Caminhão Principal *
                    </label>
                    <select
                      name="veiculo_principal_id"
                      id="veiculo_principal_id"
                      defaultValue={selectedAssociacao?.veiculo_principal_id}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione um caminhão</option>
                      {caminhoesDisponiveis?.map((veiculo) => (
                        <option key={veiculo.id} value={veiculo.id}>
                          {veiculo.placa} - {veiculo.marca} {veiculo.modelo}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Caminhão é obrigatório como veículo principal
                    </p>
                  </div>

                  {/* Reboques (Opcionais) */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                    <div>
                      <label htmlFor="veiculo_reboque1_id" className="block text-sm font-medium text-gray-700">
                        1º Reboque (Opcional)
                      </label>
                      <select
                        name="veiculo_reboque1_id"
                        id="veiculo_reboque1_id"
                        defaultValue={selectedAssociacao?.veiculo_reboque1_id || ''}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="">Nenhum</option>
                        {reboquesDisponiveis?.filter(v => v.tipo === 'bi_trem_1_reboque').map((veiculo) => (
                          <option key={veiculo.id} value={veiculo.id}>
                            {veiculo.placa} - {veiculo.marca} {veiculo.modelo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="veiculo_reboque2_id" className="block text-sm font-medium text-gray-700">
                        2º Reboque (Opcional)
                      </label>
                      <select
                        name="veiculo_reboque2_id"
                        id="veiculo_reboque2_id"
                        defaultValue={selectedAssociacao?.veiculo_reboque2_id || ''}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="">Nenhum</option>
                        {reboquesDisponiveis?.filter(v => v.tipo === 'bi_trem_2_reboque').map((veiculo) => (
                          <option key={veiculo.id} value={veiculo.id}>
                            {veiculo.placa} - {veiculo.marca} {veiculo.modelo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Implemento (Opcional) */}
                  <div>
                    <label htmlFor="veiculo_implemento_id" className="block text-sm font-medium text-gray-700">
                      Implemento (Opcional)
                    </label>
                    <select
                      name="veiculo_implemento_id"
                      id="veiculo_implemento_id"
                      defaultValue={selectedAssociacao?.veiculo_implemento_id || ''}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Nenhum</option>
                      {implementosDisponiveis?.map((veiculo) => (
                        <option key={veiculo.id} value={veiculo.id}>
                          {veiculo.placa} - {veiculo.marca} {veiculo.modelo} ({TIPO_LABELS[veiculo.tipo as keyof typeof TIPO_LABELS]})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Vanderleia (3 ou 4 eixos) ou Julieta
                    </p>
                  </div>
                </div>

                {/* Período */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <CalendarIcon className="h-5 w-5 text-indigo-600 mr-2" />
                    Período da Associação
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="data_inicio" className="block text-sm font-medium text-gray-700">
                        Data de Início *
                      </label>
                      <input
                        type="date"
                        name="data_inicio"
                        id="data_inicio"
                        defaultValue={selectedAssociacao?.data_inicio.split('T')[0] || format(new Date(), 'yyyy-MM-dd')}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="data_fim" className="block text-sm font-medium text-gray-700">
                        Data de Fim
                      </label>
                      <input
                        type="date"
                        name="data_fim"
                        id="data_fim"
                        defaultValue={selectedAssociacao?.data_fim?.split('T')[0]}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Deixe em branco para associação ativa
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status e Observações */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Detalhes</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="ativo" className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        name="ativo"
                        id="ativo"
                        defaultValue={selectedAssociacao?.ativo === false ? 'false' : 'true'}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="true">Ativa</option>
                        <option value="false">Inativa</option>
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
                        defaultValue={selectedAssociacao?.observacoes || ''}
                        placeholder="Observações sobre esta associação..."
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
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
                      {selectedAssociacao ? 'Atualizando...' : 'Criando...'}
                    </>
                  ) : (
                    selectedAssociacao ? 'Atualizar' : 'Criar Associação'
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