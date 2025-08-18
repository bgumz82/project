import { query } from '@/lib/db'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'

export interface ReportFilters {
  startDate: string
  endDate: string
  veiculoId?: string
}

export interface AbastecimentoReport {
  id: string
  data_abastecimento: string
  veiculo: {
    placa: string
    modelo: string
  }
  posto: {
    nome: string
  }
  tipo_combustivel: string
  litros: number
  valor_total: number
  operador_id: string
}

export interface ManutencaoReport {
  id: string
  veiculo: {
    placa: string
    modelo: string
  }
  tipo: string
  descricao: string
  data_prevista: string
  data_realizada: string | null
}

export interface ChecklistReport {
  id: string
  data_checklist: string
  veiculo: {
    placa: string
    modelo: string
  }
  operador_id: string
  itens: string
  observacoes: string | null
}

export async function getAbastecimentosReport(filters: ReportFilters): Promise<AbastecimentoReport[]> {
  try {
    console.log('🔍 Buscando relatório de abastecimentos com filtros:', filters)
    
    const result = await query(`
      SELECT 
        a.*,
        v.placa as veiculo_placa,
        v.modelo as veiculo_modelo,
        c.razao_social as posto_nome,
        u.nome as operador_nome,
        u.email as operador_email
      FROM abastecimentos a
      JOIN veiculos v ON a.veiculo_id = v.id
      JOIN cadastros c ON a.posto_id = c.id AND c.tipo = 'abastecimento'
      JOIN usuarios u ON a.operador_id = u.id
      WHERE a.data_abastecimento >= $1::date
      AND a.data_abastecimento <= $2::date + interval '1 day'
      ${filters.veiculoId ? 'AND a.veiculo_id = $3' : ''}
      ORDER BY a.data_abastecimento DESC
    `, [
      filters.startDate,
      filters.endDate,
      ...(filters.veiculoId ? [filters.veiculoId] : [])
    ])
    
    console.log('✅ Abastecimentos encontrados:', result.length)
    
    return result.map(item => ({
      id: item.id,
      data_abastecimento: item.data_abastecimento,
      veiculo: {
        placa: item.veiculo_placa,
        modelo: item.veiculo_modelo
      },
      posto: {
        nome: item.posto_nome
      },
      tipo_combustivel: item.tipo_combustivel,
      litros: item.litros,
      valor_total: item.valor_total,
      operador_id: item.operador_email || item.operador_nome
    }))
  } catch (error) {
    console.error('❌ Erro ao buscar relatório de abastecimentos:', error)
    throw error
  }
}

export async function getManutencoesReport(filters: ReportFilters): Promise<ManutencaoReport[]> {
  const result = await query(`
    SELECT 
      m.*,
      v.placa as veiculo_placa,
      v.modelo as veiculo_modelo
    FROM manutencoes m
    JOIN veiculos v ON m.veiculo_id = v.id
    WHERE m.data_prevista >= $1
    AND m.data_prevista <= $2
    ${filters.veiculoId ? 'AND m.veiculo_id = $3' : ''}
    ORDER BY m.data_prevista DESC
  `, [
    filters.startDate,
    filters.endDate,
    ...(filters.veiculoId ? [filters.veiculoId] : [])
  ])

  return result.map(item => ({
    id: item.id,
    tipo: item.tipo,
    descricao: item.descricao,
    data_prevista: item.data_prevista,
    data_realizada: item.data_realizada,
    veiculo: {
      placa: item.veiculo_placa,
      modelo: item.veiculo_modelo
    }
  }))
}

export async function getChecklistsReport(filters: ReportFilters): Promise<ChecklistReport[]> {
  const result = await query(`
    SELECT 
      c.*,
      v.placa as veiculo_placa,
      v.modelo as veiculo_modelo,
      u.email as operador_email
    FROM checklists c
    JOIN veiculos v ON c.veiculo_id = v.id
    JOIN auth.users u ON c.operador_id = u.id
    WHERE c.data_checklist >= $1
    AND c.data_checklist <= $2
    ${filters.veiculoId ? 'AND c.veiculo_id = $3' : ''}
    ORDER BY c.data_checklist DESC
  `, [
    filters.startDate,
    filters.endDate,
    ...(filters.veiculoId ? [filters.veiculoId] : [])
  ])

  return result.map(item => ({
    id: item.id,
    data_checklist: item.data_checklist,
    veiculo: {
      placa: item.veiculo_placa,
      modelo: item.veiculo_modelo
    },
    operador_id: item.operador_email,
    itens: item.itens,
    observacoes: item.observacoes
  }))
}

export function generateExcelData(data: any[], type: 'abastecimentos' | 'manutencoes' | 'checklists') {
  if (type === 'abastecimentos') {
    return data.map(item => ({
      'Data': format(new Date(item.data_abastecimento), 'dd/MM/yyyy HH:mm'),
      'Veículo': `${item.veiculo.placa} - ${item.veiculo.modelo}`,
      'Posto': item.posto.nome,
      'Combustível': item.tipo_combustivel,
      'Litros': item.litros,
      'Valor Total': item.valor_total,
      'Operador': item.operador_id
    }))
  }

  if (type === 'manutencoes') {
    return data.map(item => ({
      'Veículo': `${item.veiculo.placa} - ${item.veiculo.modelo}`,
      'Tipo': item.tipo,
      'Descrição': item.descricao,
      'Data Prevista': format(new Date(item.data_prevista), 'dd/MM/yyyy'),
      'Data Realizada': item.data_realizada ? format(new Date(item.data_realizada), 'dd/MM/yyyy') : 'Pendente'
    }))
  }

  if (type === 'checklists') {
    return data.map(item => ({
      'Data': format(new Date(item.data_checklist), 'dd/MM/yyyy HH:mm'),
      'Veículo': `${item.veiculo.placa} - ${item.veiculo.modelo}`,
      'Operador': item.operador_id,
      'Status': JSON.parse(item.itens).some((i: any) => i.status === 'nao_ok') ? 'Problemas Encontrados' : 'OK',
      'Observações': item.observacoes || '-'
    }))
  }

  return []
}

export async function generateExcel(data: any[], type: 'abastecimentos' | 'manutencoes' | 'checklists') {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Report')
  
  const reportData = generateExcelData(data, type)
  if (reportData.length === 0) return null

  // Add headers
  const headers = Object.keys(reportData[0])
  worksheet.addRow(headers)

  // Add data
  reportData.forEach(row => {
    worksheet.addRow(Object.values(row))
  })

  // Style the worksheet
  worksheet.getRow(1).font = { bold: true }
  worksheet.columns.forEach(column => {
    column.width = 15
  })

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return buffer
}

export async function generatePDF(data: any[], type: 'abastecimentos' | 'manutencoes' | 'checklists', filters: ReportFilters) {
  const doc = new jsPDF()
  const reportDate = format(new Date(), 'dd/MM/yyyy HH:mm')
  const period = `${format(new Date(filters.startDate), 'dd/MM/yyyy')} a ${format(new Date(filters.endDate), 'dd/MM/yyyy')}`

  // Add header
  doc.setFontSize(16)
  doc.text('Sistema de Gerenciamento de Frota', 14, 20)
  
  doc.setFontSize(12)
  doc.text(`Relatório de ${type.charAt(0).toUpperCase() + type.slice(1)}`, 14, 30)
  doc.text(`Período: ${period}`, 14, 40)
  doc.text(`Gerado em: ${reportDate}`, 14, 50)

  // Add table
  const tableData = generateExcelData(data, type)
  const headers = Object.keys(tableData[0] || {})
  const rows = tableData.map(item => Object.values(item))

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 60,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [63, 81, 181],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold'
    }
  })

  // Add footer with page number
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10)
  }

  return doc
}