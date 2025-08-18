import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import {
  DocumentChartBarIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { getVehicles } from '@/lib/api/vehicles'
import { usePermissions } from '@/contexts/PermissionsContext'
import {
  getAbastecimentosReport,
  getManutencoesReport,
  getChecklistsReport,
  generateExcel,
  generatePDF,
  type ReportFilters,
  type AbastecimentoReport,
  type ManutencaoReport,
  type ChecklistReport
} from '@/lib/api/reports'

type ReportType = 'abastecimentos' | 'manutencoes' | 'checklists'

type ReportData = AbastecimentoReport[] | ManutencaoReport[] | ChecklistReport[]

export default function Reports() {
  const { hasPermission } = usePermissions()
  
  // Determinar tipos de relatório disponíveis baseado nas permissões
  const getAvailableReportTypes = () => {
    const types: { value: ReportType; label: string }[] = []
    
    if (hasPermission('abastecimentos')) {
      types.push({ value: 'abastecimentos', label: 'Abastecimentos' })
    }
    if (hasPermission('manutencoes')) {
      types.push({ value: 'manutencoes', label: 'Manutenções' })
    }
    if (hasPermission('checklists')) {
      types.push({ value: 'checklists', label: 'Checklists' })
    }
    
    return types
  }
  
  const availableReportTypes = getAvailableReportTypes()
  
  // Se não tem nenhum módulo habilitado, usar o primeiro disponível ou 'abastecimentos' como fallback
  const [reportType, setReportType] = useState<ReportType>('abastecimentos')
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })

  // Atualizar reportType se o atual não estiver disponível
  useEffect(() => {
    if (availableReportTypes.length > 0 && !availableReportTypes.some(type => type.value === reportType)) {
      setReportType(availableReportTypes[0].value)
    }
  }, [availableReportTypes, reportType])

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles
  })

  const { data: reportData, isLoading } = useQuery<ReportData, Error, ReportData, [string, ReportType, ReportFilters]>({
    queryKey: ['report', reportType, filters],
    queryFn: async () => {
      // Verificar se o usuário tem permissão para o tipo de relatório atual
      if (!hasPermission(reportType)) {
        throw new Error('Sem permissão para este tipo de relatório')
      }
      
      switch (reportType) {
        case 'abastecimentos':
          return await getAbastecimentosReport(filters)
        case 'manutencoes':
          return await getManutencoesReport(filters)
        case 'checklists':
          return await getChecklistsReport(filters)
        default:
          return [] as ReportData
      }
    },
    enabled: availableReportTypes.length > 0 && hasPermission(reportType)
  })

  const handleExportExcel = async () => {
    if (!reportData || !reportData.length) return

    try {
      const buffer = await generateExcel(reportData as any[], reportType)
      if (!buffer) {
        toast.error('Erro ao gerar relatório')
        return
      }

      // Create blob and download
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio_${reportType}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Relatório exportado com sucesso!')
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Erro ao exportar relatório')
    }
  }

  const handleExportPDF = async () => {
    if (!reportData || !reportData.length) return

    try {
      const doc = await generatePDF(reportData as any[], reportType, filters)
      const filename = `relatorio_${reportType}_${format(new Date(), 'dd-MM-yyyy')}.pdf`
      doc.save(filename)
      toast.success('Relatório exportado com sucesso!')
    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error('Erro ao exportar relatório')
    }
  }

  // Se não tem nenhum módulo habilitado para relatórios
  if (availableReportTypes.length === 0) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Relatórios</h1>
          
          <div className="mt-8 text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              Nenhum módulo habilitado para relatórios
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Você não tem permissão para acessar nenhum módulo que gera relatórios.
              Entre em contato com o administrador para solicitar acesso.
            </p>
          </div>
        </div>
      </div>
    )
  }
  const renderTable = () => {
    if (!reportData) return null

    switch (reportType) {
      case 'abastecimentos':
        return (
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Data</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Veículo</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Posto</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Combustível</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Litros</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Valor Total</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Operador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {(reportData as AbastecimentoReport[]).map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {format(new Date(item.data_abastecimento), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {item.veiculo.placa} - {item.veiculo.modelo}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {item.posto.nome}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {item.tipo_combustivel}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {Number(item.litros).toFixed(2)}L
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(Number(item.valor_total))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {item.operador_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )

      case 'manutencoes':
        return (
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Veículo</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tipo</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Descrição</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Data Prevista</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {(reportData as ManutencaoReport[]).map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {item.veiculo.placa} - {item.veiculo.modelo}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {item.tipo}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500">
                    {item.descricao}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {format(new Date(item.data_prevista), 'dd/MM/yyyy')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      item.data_realizada
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.data_realizada ? 'Realizada' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )

      case 'checklists':
        return (
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Data</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Veículo</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Operador</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {(reportData as ChecklistReport[]).map((item) => {
                const itens = typeof item.itens === 'string' ? JSON.parse(item.itens) : item.itens
                const hasIssues = Array.isArray(itens) && itens.some((i: any) => i.status === 'nao_ok')

                return (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      {format(new Date(item.data_checklist), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      {item.veiculo.placa} - {item.veiculo.modelo}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {item.operador_id}
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
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {item.observacoes || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )

      default:
        return null
    }
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Relatórios</h1>
          <div className="flex space-x-3">
            <button
              onClick={handleExportExcel}
              disabled={!reportData?.length}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DocumentChartBarIcon className="-ml-1 mr-2 h-5 w-5" />
              Exportar Excel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!reportData?.length}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
              Exportar PDF
            </button>
          </div>
        </div>

        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tipo de Relatório
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {availableReportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Data Final
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Veículo
                </label>
                <select
                  value={filters.veiculoId || ''}
                  onChange={(e) => setFilters({ ...filters, veiculoId: e.target.value || undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Todos os veículos</option>
                  {vehicles?.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.placa} - {vehicle.modelo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin" />
            </div>
          ) : reportData?.length ? (
            <div className="shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-x-auto">
              {renderTable()}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Nenhum dado encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}