import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'

export interface ReportFilters {
  startDate: string
  endDate: string
  centroCustoId?: string
  status?: string
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-'
  try {
    return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR })
  } catch (error) {
    return dateString
  }
}

export function generateExcelData(data: any[], type: string) {
  if (type === 'contas-pagar') {
    return data.map(item => ({
      'Descrição': item.descricao,
      'Fornecedor': item.fornecedor,
      'Centro de Custo': item.centro_custo_nome,
      'Valor': formatCurrency(item.valor),
      'Vencimento': formatDate(item.data_vencimento),
      'Pagamento': item.data_pagamento ? formatDate(item.data_pagamento) : '-',
      'Status': item.status === 'pago' ? 'Pago' : 
                item.status === 'pendente' ? 'Pendente' : 'Cancelado'
    }))
  }

  if (type === 'contas-receber') {
    return data.map(item => ({
      'Descrição': item.descricao,
      'Cliente': item.cliente,
      'Centro de Custo': item.centro_custo_nome,
      'Valor': formatCurrency(item.valor),
      'Vencimento': formatDate(item.data_vencimento),
      'Recebimento': item.data_recebimento ? formatDate(item.data_recebimento) : '-',
      'Status': item.status === 'recebido' ? 'Recebido' : 
                item.status === 'pendente' ? 'Pendente' : 'Cancelado'
    }))
  }

  if (type === 'fluxo-caixa') {
    return data.map(item => ({
      'Data': formatDate(item.dia),
      'Entradas': formatCurrency(item.entradas),
      'Saídas': formatCurrency(item.saidas),
      'Saldo': formatCurrency(item.saldo)
    }))
  }

  if (type === 'centro-custo') {
    return data.map(item => ({
      'Centro de Custo': item.nome,
      'Total a Pagar': formatCurrency(item.total_pagar),
      'Total a Receber': formatCurrency(item.total_receber),
      'Saldo': formatCurrency(item.saldo)
    }))
  }

  return []
}

export async function generateExcel(data: any[], type: string, filters: ReportFilters) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Relatório')
  
  const reportData = generateExcelData(data, type)
  if (reportData.length === 0) return null

  // Add title
  const titleRow = worksheet.addRow([getReportTitle(type)])
  titleRow.font = { bold: true, size: 16 }
  worksheet.mergeCells(`A1:${String.fromCharCode(64 + Object.keys(reportData[0]).length)}1`)
  
  // Add period
  const periodRow = worksheet.addRow([`Período: ${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}`])
  periodRow.font = { bold: true, size: 12 }
  worksheet.mergeCells(`A2:${String.fromCharCode(64 + Object.keys(reportData[0]).length)}2`)
  
  // Add filter info
  if (filters.centroCustoId) {
    const centroCustoRow = worksheet.addRow(['Filtro: Centro de Custo específico'])
    centroCustoRow.font = { italic: true }
    worksheet.mergeCells(`A3:${String.fromCharCode(64 + Object.keys(reportData[0]).length)}3`)
  }
  
  // Add empty row
  worksheet.addRow([])

  // Add headers
  const headers = Object.keys(reportData[0])
  const headerRow = worksheet.addRow(headers)
  headerRow.font = { bold: true }
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  })

  // Add data
  reportData.forEach(row => {
    worksheet.addRow(Object.values(row))
  })

  // Style the worksheet
  worksheet.columns.forEach(column => {
    column.width = 20
  })

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return buffer
}

export async function generatePDF(data: any[], type: string, filters: ReportFilters) {
  const doc = new jsPDF()
  const reportDate = format(new Date(), 'dd/MM/yyyy HH:mm')
  const period = `${formatDate(filters.startDate)} a ${formatDate(filters.endDate)}`

  // Add header
  doc.setFontSize(16)
  doc.text('Sistema de Gerenciamento de Frota', 14, 20)
  
  doc.setFontSize(14)
  doc.text(getReportTitle(type), 14, 30)
  
  doc.setFontSize(12)
  doc.text(`Período: ${period}`, 14, 40)
  doc.text(`Gerado em: ${reportDate}`, 14, 50)
  
  if (filters.centroCustoId) {
    doc.text('Filtro: Centro de Custo específico', 14, 60)
  }

  // Add table
  const tableData = generateExcelData(data, type)
  const headers = Object.keys(tableData[0] || {})
  const rows = tableData.map(item => Object.values(item))

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: filters.centroCustoId ? 70 : 60,
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

function getReportTitle(type: string): string {
  switch (type) {
    case 'contas-pagar':
      return 'Relatório de Contas a Pagar'
    case 'contas-receber':
      return 'Relatório de Contas a Receber'
    case 'fluxo-caixa':
      return 'Relatório de Fluxo de Caixa'
    case 'centro-custo':
      return 'Relatório por Centro de Custo'
    default:
      return 'Relatório Financeiro'
  }
}