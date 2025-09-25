import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/contexts/PermissionsContext'
import {
  TruckIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  WrenchScrewdriverIcon,
  PlusIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { getDashboardStats, getProximasManutencoes, getConsumoMensal, getAssociacoesFrotaAtivas } from '@/lib/api/dashboard'

export default function Dashboard() {
  const { userType } = useAuth()
  const { hasPermission } = usePermissions()
  
  console.log('📊 Dashboard renderizando. UserType:', userType)

  const { data: stats, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!userType // Só executar se userType estiver disponível
  })

  // Log de erros e sucessos usando useEffect
  useEffect(() => {
    if (statsError) {
      console.error('❌ Erro ao carregar stats do dashboard:', statsError)
    }
  }, [statsError])

  useEffect(() => {
    if (stats) {
      console.log('✅ Stats do dashboard carregadas:', stats)
    }
  }, [stats])

  const { data: proximasManutencoes, isLoading: isLoadingManutencoes, error: manutencoesError } = useQuery({
    queryKey: ['proximas-manutencoes'],
    queryFn: getProximasManutencoes,
    staleTime: 1000 * 60 * 2,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!userType && hasPermission('manutencoes')
  })

  const { data: consumoMensal, isLoading: isLoadingConsumo, error: consumoError } = useQuery({
    queryKey: ['consumo-mensal'],
    queryFn: getConsumoMensal,
    staleTime: 1000 * 60 * 2,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!userType && hasPermission('abastecimentos')
  })

  const { data: associacoesAtivas, isLoading: isLoadingAssociacoes, error: associacoesError } = useQuery({
    queryKey: ['associacoes-frota-ativas'],
    queryFn: getAssociacoesFrotaAtivas,
    staleTime: 1000 * 60 * 2,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!userType && hasPermission('veiculos')
  })

  const isLoading = isLoadingStats || isLoadingManutencoes || isLoadingConsumo || isLoadingAssociacoes
  const hasError = statsError || manutencoesError || consumoError || associacoesError

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            Erro ao carregar dados
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Por favor, tente novamente mais tarde.
          </p>
          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  const showEmptyState = !stats?.totalVeiculos && hasPermission('veiculos')

  return (
    <div className="py-4">
      <div className="mx-auto max-w-6xl px-3 sm:px-4 md:px-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
      </div>
      <div className="mx-auto max-w-6xl px-3 sm:px-4 md:px-6">
        {showEmptyState ? (
          <div className="mt-6 text-center">
            <TruckIcon className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-2 text-xs font-semibold text-gray-900">
              Nenhum veículo cadastrado
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Comece cadastrando seu primeiro veículo para visualizar as estatísticas.
            </p>
            <div className="mt-4">
              <Link
                to="/veiculos"
                className="inline-flex items-center rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                <PlusIcon className="-ml-0.5 mr-1 h-4 w-4" />
                Cadastrar Veículo
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card - Total de Veículos - Só mostra se tem permissão */}
              {hasPermission('veiculos') && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TruckIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <dl>
                          <dt className="text-xs font-medium text-gray-500 truncate">
                            Total de Veículos
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-lg font-semibold text-gray-900">
                              {stats?.totalVeiculos ?? 0}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card - Manutenções Pendentes - Só mostra se tem permissão */}
              {hasPermission('manutencoes') && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ExclamationTriangleIcon 
                          className={`h-5 w-5 ${
                            (stats?.manutencoesPendentes ?? 0) > 0 ? 'text-red-400' : 'text-yellow-400'
                          }`} 
                          aria-hidden="true" 
                        />
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <dl>
                          <dt className="text-xs font-medium text-gray-500 truncate">
                            Manutenções Pendentes
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-lg font-semibold text-gray-900">
                              {stats?.manutencoesPendentes ?? 0}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card - Checklists Hoje - Só mostra se tem permissão */}
              {hasPermission('checklists') && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ClipboardDocumentCheckIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <dl>
                          <dt className="text-xs font-medium text-gray-500 truncate">
                            Checklists Hoje
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-lg font-semibold text-gray-900">
                              {stats?.checklistsHoje ?? 0}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card - Abastecimentos Hoje - Só mostra se tem permissão */}
              {hasPermission('abastecimentos') && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <WrenchScrewdriverIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <dl>
                          <dt className="text-xs font-medium text-gray-500 truncate">
                            Abastecimentos Hoje
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-lg font-semibold text-gray-900">
                              {stats?.abastecimentosHoje ?? 0}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card - Total de Cadastros - Só mostra se tem permissão */}
              {hasPermission('cadastros') && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <BuildingOffice2Icon className="h-5 w-5 text-purple-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <dl>
                          <dt className="text-xs font-medium text-gray-500 truncate">
                            Total de Cadastros
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-lg font-semibold text-gray-900">
                              {stats?.totalCadastros?.total ?? 0}
                            </div>
                          </dd>
                          <dd className="mt-0.5 text-xs text-gray-500">
                            {stats?.totalCadastros?.clientes ?? 0} clientes • {' '}
                            {stats?.totalCadastros?.fornecedores ?? 0} fornecedores • {' '}
                            {stats?.totalCadastros?.postos ?? 0} postos
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-3 py-2">
                    <div className="text-xs">
                      <Link
                        to="/cadastros"
                        className="font-medium text-indigo-600 hover:text-indigo-900"
                      >
                        Ver todos os cadastros
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Card - Total de Funcionários - Só mostra se tem permissão */}
              {hasPermission('funcionarios') && (
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserGroupIcon className="h-5 w-5 text-orange-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <dl>
                          <dt className="text-xs font-medium text-gray-500 truncate">
                            Total de Funcionários
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-lg font-semibold text-gray-900">
                              {stats?.totalFuncionarios?.total ?? 0}
                            </div>
                          </dd>
                          <dd className="mt-0.5 text-xs text-gray-500">
                            {stats?.totalFuncionarios?.administrativo ?? 0} admin • {' '}
                            {stats?.totalFuncionarios?.motorista ?? 0} motorista • {' '}
                            {stats?.totalFuncionarios?.motorista_carreta ?? 0} carreta • {' '}
                            {stats?.totalFuncionarios?.motorista_julieta ?? 0} julieta • {' '}
                            {stats?.totalFuncionarios?.gerente ?? 0} gerente
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-3 py-2">
                    <div className="text-xs">
                      <Link
                        to="/funcionarios"
                        className="font-medium text-indigo-600 hover:text-indigo-900"
                      >
                        Ver todos os funcionários
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card de Associações de Frota Ativas - Só mostra se tem permissão */}
            {hasPermission('associacoes_frota') && (stats?.associacoesAtivas ?? 0) > 0 && (
              <div className="mt-6 bg-white shadow rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-gray-900 flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-indigo-600 mr-2" />
                    Associações de Frota Ativas
                  </h3>
                  <Link
                    to="/veiculos/associacoes"
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-900"
                  >
                    Ver todas
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {associacoesAtivas?.map((associacao) => (
                    <div key={associacao.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <UserGroupIcon className="h-4 w-4 text-indigo-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {associacao.motorista_nome}
                          </p>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <span className="font-mono">{associacao.veiculo_principal_placa}</span>
                            {associacao.veiculo_implemento_placa && (
                              <>
                                <span>+</span>
                                <span className="font-mono">{associacao.veiculo_implemento_placa}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {(associacoesAtivas?.length ?? 0) === 0 && (
                  <div className="text-center py-4 text-gray-500 text-xs">
                    <p>Nenhuma associação ativa no momento.</p>
                  </div>
                )}
              </div>
            )}

            {/* Área para gráficos e tabelas */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Gráfico de Consumo de Combustível - Só mostra se tem permissão */}
              {hasPermission('abastecimentos') && (
                <div className="bg-white shadow rounded-lg p-4">
                  <h3 className="text-base font-medium text-gray-900">Consumo de Combustível</h3>
                  {(consumoMensal?.length ?? 0) > 0 ? (
                    <div className="mt-3">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Mês
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Litros
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Valor Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {consumoMensal?.map((consumo, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                {consumo.mes}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                {consumo.total_litros.toFixed(2)}L
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(consumo.valor_total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="mt-3 text-center py-8 text-gray-500 text-xs">
                      <p>Nenhum registro de abastecimento encontrado.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Lista de Manutenções Próximas - Só mostra se tem permissão */}
              {hasPermission('manutencoes') && (
                <div className="bg-white shadow rounded-lg p-4">
                  <h3 className="text-base font-medium text-gray-900">Próximas Manutenções</h3>
                  {(proximasManutencoes?.length ?? 0) > 0 ? (
                    <div className="mt-3">
                      <div className="flow-root">
                        <ul role="list" className="-my-3 divide-y divide-gray-200">
                          {proximasManutencoes?.map((manutencao) => (
                            <li key={manutencao.id} className="py-3">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-900 truncate">
                                    {manutencao.veiculo.placa} - {manutencao.veiculo.modelo}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {manutencao.tipo}
                                  </p>
                                </div>
                                <div>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    {format(parseISO(manutencao.data_prevista), "dd/MM/yyyy")}
                                  </span>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-center py-8 text-gray-500 text-xs">
                      <p>Nenhuma manutenção agendada.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}