import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BuildingOfficeIcon,
  DocumentTextIcon,
  TruckIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { getEmpresasFiscais, getCTeDocumentos, getMDFeDocumentos, getFreteDocumentos } from '@/lib/api/fiscal'

export default function DashboardFiscal() {
  const { 
    data: empresas, 
    isLoading: isLoadingEmpresas,
    error: empresasError,
    refetch: refetchEmpresas
  } = useQuery({
    queryKey: ['empresas-fiscais'],
    queryFn: getEmpresasFiscais,
    staleTime: 1000 * 60 * 2,
    retry: 3
  })

  const { 
    data: cteDocumentos,
    isLoading: isLoadingCTe
  } = useQuery({
    queryKey: ['cte-documentos'],
    queryFn: getCTeDocumentos,
    staleTime: 1000 * 60 * 2,
    retry: 3
  })

  const { 
    data: mdfeDocumentos,
    isLoading: isLoadingMDFe
  } = useQuery({
    queryKey: ['mdfe-documentos'],
    queryFn: getMDFeDocumentos,
    staleTime: 1000 * 60 * 2,
    retry: 3
  })

  const { 
    data: freteDocumentos,
    isLoading: isLoadingFrete
  } = useQuery({
    queryKey: ['frete-documentos'],
    queryFn: getFreteDocumentos,
    staleTime: 1000 * 60 * 2,
    retry: 3
  })

  const isLoading = isLoadingEmpresas || isLoadingCTe || isLoadingMDFe || isLoadingFrete
  const hasError = empresasError

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
            Erro ao carregar dados fiscais
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Por favor, tente novamente mais tarde.
          </p>
          <div className="mt-6">
            <button
              onClick={() => refetchEmpresas()}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <ArrowPathIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  const empresasAtivas = empresas?.filter(e => e.status === 'ativo').length || 0
  const ctesPendentes = cteDocumentos?.filter(c => c.status === 'pendente').length || 0
  const mdfesPendentes = mdfeDocumentos?.filter(m => m.status === 'pendente').length || 0
  const fretesPendentes = freteDocumentos?.filter(f => f.status === 'pendente').length || 0
  const totalDocumentos = (cteDocumentos?.length || 0) + (mdfeDocumentos?.length || 0) + (freteDocumentos?.length || 0)

  return (
    <div className="py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard Fiscal</h1>
          <button
            onClick={() => refetchEmpresas()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="mt-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card - Empresas Fiscais */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BuildingOfficeIcon className="h-6 w-6 text-blue-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Empresas Fiscais
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {empresas?.length || 0}
                        </div>
                        <div className="ml-2 text-sm text-green-600">
                          {empresasAtivas} ativas
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <Link
                    to="/fiscal/empresas"
                    className="font-medium text-indigo-600 hover:text-indigo-900"
                  >
                    Gerenciar empresas
                  </Link>
                </div>
              </div>
            </div>

            {/* Card - CT-e */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-6 w-6 text-green-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Documentos CT-e
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {cteDocumentos?.length || 0}
                        </div>
                        {ctesPendentes > 0 && (
                          <div className="ml-2 text-sm text-yellow-600">
                            {ctesPendentes} pendentes
                          </div>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <Link
                    to="/fiscal/cte"
                    className="font-medium text-indigo-600 hover:text-indigo-900"
                  >
                    Gerenciar CT-e
                  </Link>
                </div>
              </div>
            </div>

            {/* Card - MDF-e */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TruckIcon className="h-6 w-6 text-purple-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Documentos MDF-e
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {mdfeDocumentos?.length || 0}
                        </div>
                        {mdfesPendentes > 0 && (
                          <div className="ml-2 text-sm text-yellow-600">
                            {mdfesPendentes} pendentes
                          </div>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <Link
                    to="/fiscal/mdfe"
                    className="font-medium text-indigo-600 hover:text-indigo-900"
                  >
                    Gerenciar MDF-e
                  </Link>
                </div>
              </div>
            </div>

            {/* Card - Controle de Frete */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-orange-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Controle de Frete
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {freteDocumentos?.length || 0}
                        </div>
                        {fretesPendentes > 0 && (
                          <div className="ml-2 text-sm text-yellow-600">
                            {fretesPendentes} pendentes
                          </div>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <Link
                    to="/fiscal/frete"
                    className="font-medium text-indigo-600 hover:text-indigo-900"
                  >
                    Gerenciar Frete
                  </Link>
                </div>
              </div>
            </div>

            {/* Card - Total de Documentos */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-indigo-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total de Documentos
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {totalDocumentos}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <Link
                    to="/fiscal/relatorios"
                    className="font-medium text-indigo-600 hover:text-indigo-900"
                  >
                    Ver relatórios
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Documentos Recentes */}
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* CT-e Recentes */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <DocumentTextIcon className="h-6 w-6 text-green-600 mr-2" />
                  CT-e Recentes
                </h3>
                <Link
                  to="/fiscal/cte"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                >
                  Ver todos
                </Link>
              </div>
              {cteDocumentos && cteDocumentos.length > 0 ? (
                <div className="space-y-3">
                  {cteDocumentos.slice(0, 5).map((cte) => (
                    <div key={cte.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          CT-e {cte.numero_cte} - Série {cte.serie}
                        </p>
                        <p className="text-xs text-gray-500">
                          {cte.empresa?.razao_social}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        cte.status === 'emitido'
                          ? 'bg-green-100 text-green-800'
                          : cte.status === 'pendente'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {cte.status === 'emitido' ? 'Emitido' : 
                         cte.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <DocumentTextIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2">Nenhum documento CT-e encontrado</p>
                </div>
              )}
            </div>

            {/* MDF-e Recentes */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <TruckIcon className="h-6 w-6 text-purple-600 mr-2" />
                  MDF-e Recentes
                </h3>
                <Link
                  to="/fiscal/mdfe"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                >
                  Ver todos
                </Link>
              </div>
              {mdfeDocumentos && mdfeDocumentos.length > 0 ? (
                <div className="space-y-3">
                  {mdfeDocumentos.slice(0, 5).map((mdfe) => (
                    <div key={mdfe.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          MDF-e {mdfe.numero_mdfe} - Série {mdfe.serie}
                        </p>
                        <p className="text-xs text-gray-500">
                          {mdfe.empresa?.razao_social}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        mdfe.status === 'emitido'
                          ? 'bg-green-100 text-green-800'
                          : mdfe.status === 'encerrado'
                          ? 'bg-blue-100 text-blue-800'
                          : mdfe.status === 'pendente'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {mdfe.status === 'emitido' ? 'Emitido' : 
                         mdfe.status === 'encerrado' ? 'Encerrado' :
                         mdfe.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <TruckIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2">Nenhum documento MDF-e encontrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}