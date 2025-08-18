import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import {
  DocumentChartBarIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { getCentrosCustoComVeiculos } from '@/lib/api/financeiro'
import { generateExcel, generatePDF } from '@/lib/api/relatorios-financeiros'

type ReportType = 'contas-pagar' | 'contas-receber' | 'fluxo-caixa' | 'centro-custo'

interface ReportFilters {
  startDate: string
  endDate: string
  dateType: 'vencimento' | 'pagamento' | 'recebimento'
  centroCustoId?: string
  status?: 'todos' | 'pendente' | 'pago' | 'recebido' | 'cancelado'
}

export default function RelatoriosFinanceiros() {
  const [reportType, setReportType] = useState<ReportType>('contas-pagar')
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    dateType: 'vencimento',
    status: 'todos'
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Atualizar tipo de data quando mudar o tipo de relatório
  const handleReportTypeChange = (newReportType: ReportType) => {
    setReportType(newReportType)
    
    // Atualizar o tipo de data baseado no relatório
    let newDateType: 'vencimento' | 'pagamento' | 'recebimento' = 'vencimento'
    
    if (newReportType === 'contas-pagar') {
      newDateType = 'vencimento' // Padrão para contas a pagar
    } else if (newReportType === 'contas-receber') {
      newDateType = 'vencimento' // Padrão para contas a receber
    }
    
    setFilters(prev => ({ ...prev, dateType: newDateType }))
  }

  // Obter opções de data baseadas no tipo de relatório
  const getDateTypeOptions = () => {
    switch (reportType) {
      case 'contas-pagar':
        return [
          { value: 'vencimento', label: 'Data de Vencimento' },
          { value: 'pagamento', label: 'Data de Pagamento' }
        ]
      case 'contas-receber':
        return [
          { value: 'vencimento', label: 'Data de Vencimento' },
          { value: 'recebimento', label: 'Data de Recebimento' }
        ]
      default:
        return [
          { value: 'vencimento', label: 'Data' }
        ]
    }
  }

  // Obter label para os campos de data
  const getDateFieldLabel = () => {
    const options = getDateTypeOptions()
    const selected = options.find(opt => opt.value === filters.dateType)
    return selected ? selected.label : 'Data'
  }
  const { 
    data: reportData, 
    isLoading, 
    refetch,
    isRefetching,
    error
  } = useQuery({
    queryKey: ['relatorio-financeiro', reportType, filters],
    queryFn: async () => {
      console.log('Executando consulta com filtros:', filters)
      console.log('Tipo de relatório:', reportType)

      try {
        const queryText = getQueryForReportType(reportType, filters)
        const params = getParamsForReportType(filters)
        
        console.log('Query SQL:', queryText)
        console.log('Parâmetros:', params)
        
        const response = await fetch('/api/db/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
          },
          body: JSON.stringify({
            query: queryText,
            params: params
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Erro na resposta:', response.status, errorText)
          throw new Error(`Erro na consulta: ${response.status} - ${errorText}`)
        }
        
        const data = await response.json();
        console.log('Dados retornados:', data)
        console.log('Número de registros:', data.rows?.length || 0)
        
        return data.rows || [];
      } catch (error) {
        console.error('Erro na consulta:', error)
        throw error
      }
    },
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // 1 minuto
  })

  const { data: centrosCustoComVeiculos } = useQuery({
    queryKey: ['centros-custo-com-veiculos'],
    queryFn: getCentrosCustoComVeiculos
  })

  // Efeito para atualizar os dados quando a página é montada
  useEffect(() => {
    refetch();
  }, [refetch]);

  const getQueryForReportType = (reportType: ReportType, filters: ReportFilters): string => {
    const { centroCustoId, status, dateType } = filters;
    
    console.log('Gerando query para:', reportType, 'com filtros:', filters)
    
    switch (reportType) {
      case 'contas-pagar':
        return `
          SELECT 
            cp.*,
            CASE 
              WHEN cp.centro_custo_id LIKE 'veiculo_%' THEN 
                (v.placa || ' - ' || v.modelo || ' (Veículo)')
              ELSE 
                COALESCE(cc.nome, 'Centro não encontrado')
            END as centro_custo_nome
          FROM contas_pagar cp
          LEFT JOIN centros_custo cc ON cp.centro_custo_id = cc.id::text
          LEFT JOIN veiculos v ON cp.centro_custo_id = ('veiculo_' || v.id)
          WHERE ${dateType === 'pagamento' 
            ? 'cp.data_pagamento IS NOT NULL AND DATE(cp.data_pagamento) >= $1 AND DATE(cp.data_pagamento) <= $2'
            : 'DATE(cp.data_vencimento) >= $1 AND DATE(cp.data_vencimento) <= $2'
          }
          ${centroCustoId ? 'AND cp.centro_custo_id = $3' : ''}
          ${status && status !== 'todos' ? (centroCustoId ? 'AND cp.status = $4' : 'AND cp.status = $3') : ''}
          ORDER BY cp.data_vencimento DESC
        `;
      
      case 'contas-receber':
        return `
          SELECT 
            cr.*,
            CASE 
              WHEN cr.centro_custo_id LIKE 'veiculo_%' THEN 
                (v.placa || ' - ' || v.modelo || ' (Veículo)')
              ELSE 
                COALESCE(cc.nome, 'Centro não encontrado')
            END as centro_custo_nome
          FROM contas_receber cr
          LEFT JOIN centros_custo cc ON cr.centro_custo_id = cc.id::text
          LEFT JOIN veiculos v ON cr.centro_custo_id = ('veiculo_' || v.id)
          WHERE ${dateType === 'recebimento' 
            ? 'cr.data_recebimento IS NOT NULL AND DATE(cr.data_recebimento) >= $1 AND DATE(cr.data_recebimento) <= $2'
            : 'DATE(cr.data_vencimento) >= $1 AND DATE(cr.data_vencimento) <= $2'
          }
          ${centroCustoId ? 'AND cr.centro_custo_id = $3' : ''}
          ${status && status !== 'todos' ? (centroCustoId ? 'AND cr.status = $4' : 'AND cr.status = $3') : ''}
          ORDER BY cr.data_vencimento DESC
        `;
      
      case 'fluxo-caixa':
        return `
          WITH dias AS (
            SELECT generate_series(
              $1,
              $2,
              '1 day'::interval
            )::date as dia
          ),
          entradas AS (
            SELECT 
              DATE(COALESCE(data_recebimento, data_vencimento)) as dia,
              SUM(valor) as valor
            FROM contas_receber
            WHERE status != 'cancelado'
            AND DATE(COALESCE(data_recebimento, data_vencimento)) >= $1
            AND DATE(COALESCE(data_recebimento, data_vencimento)) <= $2
            ${centroCustoId ? 'AND centro_custo_id = $3' : ''}
            GROUP BY dia
          ),
          saidas AS (
            SELECT 
              DATE(COALESCE(data_pagamento, data_vencimento)) as dia,
              SUM(valor) as valor
            FROM contas_pagar
            WHERE status != 'cancelado'
            AND DATE(COALESCE(data_pagamento, data_vencimento)) >= $1
            AND DATE(COALESCE(data_pagamento, data_vencimento)) <= $2
            ${centroCustoId ? 'AND centro_custo_id = $3' : ''}
            GROUP BY dia
          )
          SELECT 
            d.dia,
            COALESCE(e.valor, 0) as entradas,
            COALESCE(s.valor, 0) as saidas,
            COALESCE(e.valor, 0) - COALESCE(s.valor, 0) as saldo
          FROM dias d
          LEFT JOIN entradas e ON d.dia = e.dia
          LEFT JOIN saidas s ON d.dia = s.dia
          ORDER BY d.dia
        `;
      
      case 'centro-custo':
        return `
          WITH centro_custo_pagar AS (
            SELECT 
              cp.centro_custo_id as id,
              CASE 
                WHEN cp.centro_custo_id LIKE 'veiculo_%' THEN 
                  (v.placa || ' - ' || v.modelo || ' (Veículo)')
                ELSE 
                  cc.nome
              END as nome,
              COALESCE(SUM(cp.valor), 0) as total_pagar
            FROM contas_pagar cp
            LEFT JOIN centros_custo cc ON cp.centro_custo_id = cc.id::text
            LEFT JOIN veiculos v ON cp.centro_custo_id = ('veiculo_' || v.id)
            WHERE DATE(cp.data_vencimento) >= $1 AND DATE(cp.data_vencimento) <= $2
            ${status && status !== 'todos' ? 'AND cp.status = $3' : ''}
            GROUP BY cp.centro_custo_id, cc.nome, v.placa, v.modelo
          ),
          centro_custo_receber AS (
            SELECT 
              cr.centro_custo_id as id,
              COALESCE(SUM(cr.valor), 0) as total_receber
            FROM contas_receber cr
            WHERE DATE(cr.data_vencimento) >= $1 AND DATE(cr.data_vencimento) <= $2
            ${status && status !== 'todos' ? 'AND cr.status = $3' : ''}
            GROUP BY cr.centro_custo_id
          )
          SELECT 
            p.id,
            p.nome,
            p.total_pagar,
            COALESCE(r.total_receber, 0) as total_receber,
            COALESCE(r.total_receber, 0) - p.total_pagar as saldo
          FROM centro_custo_pagar p
          LEFT JOIN centro_custo_receber r ON p.id = r.id
          ${centroCustoId ? (status && status !== 'todos' ? 'WHERE p.id = $4' : 'WHERE p.id = $3') : ''}
          ORDER BY p.nome
        `;
      
      default:
        return '';
    }
  };

  const getParamsForReportType = (filters: ReportFilters): any[] => {
    const { centroCustoId, status } = filters;
    const params: any[] = [filters.startDate, filters.endDate];
    
    console.log('Parâmetros da consulta:', params)
    
    if (centroCustoId) {
      params.push(centroCustoId);
      console.log('Adicionado centro de custo:', centroCustoId)
    }
    
    if (status && status !== 'todos') {
      let statusValue = status;
      
      // Ajustar status para contas a receber
      if (reportType === 'contas-receber' && status === 'pago') {
        statusValue = 'recebido';
      }
      
      params.push(statusValue);
      console.log('Adicionado status:', statusValue)
    }
    
    console.log('Parâmetros finais:', params)
    return params;
  };

  const handleExportExcel = async () => {
    if (!reportData || !reportData.length) {
      toast.error('Não há dados para exportar');
      return;
    }

    try {
      setIsGenerating(true);
      const buffer = await generateExcel(reportData, reportType, filters);
      
      if (!buffer) {
        toast.error('Erro ao gerar relatório');
        return;
      }

      // Create blob and download
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${reportType}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData || !reportData.length) {
      toast.error('Não há dados para exportar');
      return;
    }

    try {
      setIsGenerating(true);
      const doc = await generatePDF(reportData, reportType, filters);
      const filename = `relatorio_${reportType}_${format(new Date(), 'dd-MM-yyyy')}.pdf`;
      doc.save(filename);
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTable = () => {
    if (!reportData) return null;

    switch (reportType) {
      case 'contas-pagar':
        return (
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Descrição</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fornecedor</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Centro de Custo / Veículo</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Valor</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Vencimento</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Pagamento</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {reportData.map((item: any) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {item.descricao}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {item.fornecedor}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {item.centro_custo_nome}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(item.valor)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {format(parseISO(item.data_vencimento), 'dd/MM/yyyy')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {item.data_pagamento ? format(parseISO(item.data_pagamento), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      item.status === 'pago'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'pendente'
                        ? parseISO(item.data_vencimento) < new Date()
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status === 'pago' ? 'Pago' : 
                       item.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'contas-receber':
        return (
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Descrição</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Cliente</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Centro de Custo / Veículo</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Valor</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Vencimento</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Recebimento</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {reportData.map((item: any) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {item.descricao}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {item.cliente}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {item.centro_custo_nome}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(item.valor)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {format(parseISO(item.data_vencimento), 'dd/MM/yyyy')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {item.data_recebimento ? format(parseISO(item.data_recebimento), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      item.status === 'recebido'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'pendente'
                        ? parseISO(item.data_vencimento) < new Date()
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status === 'recebido' ? 'Recebido' : 
                       item.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'fluxo-caixa':
        return (
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Data</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Entradas</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Saídas</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {reportData.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {format(parseISO(item.dia), 'dd/MM/yyyy')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600 font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(item.entradas)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600 font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(item.saidas)}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-4 text-sm font-medium ${
                    parseFloat(item.saldo) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(item.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'centro-custo':
        return (
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Centro de Custo / Veículo</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total a Pagar</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total a Receber</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {reportData.map((item: any) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {item.nome}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600 font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(item.total_pagar)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600 font-medium">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(item.total_receber)}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-4 text-sm font-medium ${
                    parseFloat(item.saldo) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(item.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return null;
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Relatórios Financeiros</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={isRefetching}
            >
              <ArrowPathIcon className={`-ml-0.5 mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              {isRefetching ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isGenerating || !reportData?.length}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DocumentChartBarIcon className="-ml-1 mr-2 h-5 w-5" />
              {isGenerating ? 'Gerando...' : 'Exportar Excel'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isGenerating || !reportData?.length}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
              {isGenerating ? 'Gerando...' : 'Exportar PDF'}
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
                onChange={(e) => handleReportTypeChange(e.target.value as ReportType)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="contas-pagar">Contas a Pagar</option>
                <option value="contas-receber">Contas a Receber</option>
                <option value="fluxo-caixa">Fluxo de Caixa</option>
                <option value="centro-custo">Análise por Centro de Custo / Veículo</option>
              </select>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FunnelIcon className="-ml-1 mr-1 h-4 w-4" />
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {(reportType === 'contas-pagar' || reportType === 'contas-receber') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tipo de Data
                    </label>
                    <select
                      value={filters.dateType}
                      onChange={(e) => setFilters({ ...filters, dateType: e.target.value as any })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      {getDateTypeOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {getDateFieldLabel()} - Inicial
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
                    {getDateFieldLabel()} - Final
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
                    Centro de Custo / Veículo
                  </label>
                  <select
                    value={filters.centroCustoId || ''}
                    onChange={(e) => setFilters({ ...filters, centroCustoId: e.target.value || undefined })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Todos</option>
                    {centrosCustoComVeiculos?.map((opcao) => (
                      <option key={opcao.id} value={opcao.id}>
                        {opcao.nome} {opcao.tipo === 'veiculo' ? '(Veículo)' : '(Centro de Custo)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={filters.status || 'todos'}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="todos">Todos</option>
                    <option value="pendente">Pendentes</option>
                    {reportType === 'contas-pagar' && <option value="pago">Pagos</option>}
                    {reportType === 'contas-receber' && <option value="recebido">Recebidos</option>}
                    <option value="cancelado">Cancelados</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erro ao carregar relatório
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error.message}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {isLoading || isRefetching ? (
            <div className="flex justify-center items-center h-64">
              <ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin" />
            </div>
          ) : reportData?.length ? (
            <div className="shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-x-auto">
              {renderTable()}
            </div>
          ) : (
            <div className="text-center py-12">
              <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum dado encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Não há registros para os filtros selecionados.
              </p>
              <div className="mt-4 text-xs text-gray-400">
                <p>Período: {format(new Date(filters.startDate), 'dd/MM/yyyy')} a {format(new Date(filters.endDate), 'dd/MM/yyyy')}</p>
                <p>Tipo de data: {getDateFieldLabel()}</p>
                {filters.status && filters.status !== 'todos' && <p>Status: {filters.status}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}