import { query, queryOne } from '@/lib/db'

export interface CentroCusto {
  id: string
  nome: string
  descricao: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface ContaPagar {
  id: string
  descricao: string
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  centro_custo_id: string
  fornecedor: string
  status: 'pendente' | 'pago' | 'cancelado'
  observacao: string | null
  created_at: string
  updated_at: string
  centro_custo?: {
    nome: string
  }
}

export interface ContaReceber {
  id: string
  descricao: string
  valor: number
  data_vencimento: string
  data_recebimento: string | null
  centro_custo_id: string
  cliente: string
  status: 'pendente' | 'recebido' | 'cancelado'
  observacao: string | null
  created_at: string
  updated_at: string
  centro_custo?: {
    nome: string
  }
}

export interface CentroCustoCreate {
  nome: string
  descricao?: string | null
  ativo?: boolean
}

export interface ContaPagarCreate {
  descricao: string
  valor: number
  data_vencimento: string
  data_pagamento?: string | null
  centro_custo_id: string
  fornecedor: string
  status?: 'pendente' | 'pago' | 'cancelado'
  observacao?: string | null
}

export interface ContaReceberCreate {
  descricao: string
  valor: number
  data_vencimento: string
  data_recebimento?: string | null
  centro_custo_id: string
  cliente: string
  status?: 'pendente' | 'recebido' | 'cancelado'
  observacao?: string | null
}

// Interface para centros de custo combinados (centros + veículos)
export interface CentroCustoOption {
  id: string
  nome: string
  tipo: 'centro_custo' | 'veiculo'
  descricao?: string | null
}

// Centro de Custo
export async function getCentrosCusto(): Promise<CentroCusto[]> {
  return await query(`
    SELECT *
    FROM centros_custo
    ORDER BY nome
  `)
}

// Função para obter centros de custo + veículos para seleção
export async function getCentrosCustoComVeiculos(): Promise<CentroCustoOption[]> {
  try {
    // Buscar centros de custo ativos
    const centrosCusto = await query(`
      SELECT id, nome, descricao
      FROM centros_custo
      WHERE ativo = true
      ORDER BY nome
    `)

    // Buscar veículos
    const veiculos = await query(`
      SELECT id, placa, modelo
      FROM veiculos
      ORDER BY placa
    `)

    // Combinar os resultados
    const opcoes: CentroCustoOption[] = [
      // Centros de custo
      ...centrosCusto.map(centro => ({
        id: centro.id,
        nome: centro.nome,
        tipo: 'centro_custo' as const,
        descricao: centro.descricao
      })),
      // Veículos
      ...veiculos.map(veiculo => ({
        id: `veiculo_${veiculo.id}`,
        nome: `${veiculo.placa} - ${veiculo.modelo}`,
        tipo: 'veiculo' as const,
        descricao: 'Veículo da frota'
      }))
    ]

    return opcoes
  } catch (error) {
    console.error('Erro ao buscar centros de custo e veículos:', error)
    throw error
  }
}

export async function getCentroCusto(id: string): Promise<CentroCusto | null> {
  return await queryOne(`
    SELECT *
    FROM centros_custo
    WHERE id = $1
  `, [id])
}

export async function createCentroCusto(data: CentroCustoCreate): Promise<CentroCusto> {
  const result = await queryOne(`
    INSERT INTO centros_custo (
      nome,
      descricao,
      ativo
    ) VALUES ($1, $2, $3)
    RETURNING *
  `, [
    data.nome,
    data.descricao,
    data.ativo !== undefined ? data.ativo : true
  ])

  if (!result) {
    throw new Error('Erro ao criar centro de custo')
  }

  return result
}

export async function updateCentroCusto(id: string, data: Partial<CentroCustoCreate>): Promise<CentroCusto> {
  const result = await queryOne(`
    UPDATE centros_custo
    SET
      nome = COALESCE($1, nome),
      descricao = $2,
      ativo = COALESCE($3, ativo),
      updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `, [
    data.nome,
    data.descricao,
    data.ativo,
    id
  ])

  if (!result) {
    throw new Error('Centro de custo não encontrado')
  }

  return result
}

export async function deleteCentroCusto(id: string): Promise<void> {
  await query('DELETE FROM centros_custo WHERE id = $1', [id])
}

// Função auxiliar para resolver nome do centro de custo/veículo
async function resolverNomeCentroCusto(centroCustoId: string): Promise<string> {
  if (!centroCustoId) {
    return 'Não informado'
  }

  if (centroCustoId.startsWith('veiculo_')) {
    const veiculoId = centroCustoId.replace('veiculo_', '')
    const veiculo = await queryOne(`
      SELECT placa, modelo
      FROM veiculos
      WHERE id = $1
    `, [veiculoId])
    
    if (veiculo) {
      return `${veiculo.placa} - ${veiculo.modelo} (Veículo)`
    }
    return 'Veículo não encontrado'
  } else {
    const centro = await queryOne(`
      SELECT nome
      FROM centros_custo
      WHERE id = $1
    `, [centroCustoId])
    
    if (centro) {
      return centro.nome
    }
    return 'Centro de custo não encontrado'
  }
}

// Contas a Pagar
export async function getContasPagar(): Promise<ContaPagar[]> {
  const contas = await query(`
    SELECT *
    FROM contas_pagar
    ORDER BY data_vencimento
  `)

  // Resolver nomes dos centros de custo/veículos
  const contasComNomes = await Promise.all(
    contas.map(async (conta) => {
      const nomeResolucao = await resolverNomeCentroCusto(conta.centro_custo_id)
      return {
        ...conta,
        centro_custo: {
          nome: nomeResolucao
        }
      }
    })
  )

  return contasComNomes
}

export async function getContaPagar(id: string): Promise<ContaPagar | null> {
  const conta = await queryOne(`
    SELECT *
    FROM contas_pagar
    WHERE id = $1
  `, [id])

  if (!conta) return null

  const nomeResolucao = await resolverNomeCentroCusto(conta.centro_custo_id)
  
  return {
    ...conta,
    centro_custo: {
      nome: nomeResolucao
    }
  }
}

export async function createContaPagar(data: ContaPagarCreate): Promise<ContaPagar> {
  const result = await queryOne(`
    INSERT INTO contas_pagar (
      descricao,
      valor,
      data_vencimento,
      data_pagamento,
      centro_custo_id,
      fornecedor,
      status,
      observacao
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    data.descricao,
    data.valor,
    data.data_vencimento,
    data.data_pagamento,
    data.centro_custo_id,
    data.fornecedor,
    data.status || 'pendente',
    data.observacao
  ])

  if (!result) {
    throw new Error('Erro ao criar conta a pagar')
  }

  return result
}

export async function updateContaPagar(id: string, data: Partial<ContaPagarCreate>): Promise<ContaPagar> {
  // Construir a query dinamicamente baseada nos campos fornecidos
  const updates: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (data.descricao !== undefined) {
    updates.push(`descricao = $${paramIndex}`)
    values.push(data.descricao)
    paramIndex++
  }

  if (data.valor !== undefined) {
    updates.push(`valor = $${paramIndex}`)
    values.push(data.valor)
    paramIndex++
  }

  if (data.data_vencimento !== undefined) {
    updates.push(`data_vencimento = $${paramIndex}`)
    values.push(data.data_vencimento)
    paramIndex++
  }

  if (data.data_pagamento !== undefined) {
    updates.push(`data_pagamento = $${paramIndex}`)
    values.push(data.data_pagamento)
    paramIndex++
  }

  if (data.centro_custo_id !== undefined) {
    updates.push(`centro_custo_id = $${paramIndex}`)
    values.push(data.centro_custo_id)
    paramIndex++
  }

  if (data.fornecedor !== undefined) {
    updates.push(`fornecedor = $${paramIndex}`)
    values.push(data.fornecedor)
    paramIndex++
  }

  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex}`)
    values.push(data.status)
    paramIndex++
  }

  if (data.observacao !== undefined) {
    updates.push(`observacao = $${paramIndex}`)
    values.push(data.observacao)
    paramIndex++
  }

  // Sempre atualizar o timestamp
  updates.push(`updated_at = NOW()`)

  if (updates.length === 1) { // Apenas o updated_at
    throw new Error('Nenhum campo para atualizar')
  }

  // Adicionar o ID como último parâmetro
  values.push(id)

  const result = await queryOne(`
    UPDATE contas_pagar
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values)

  if (!result) {
    throw new Error('Conta a pagar não encontrada')
  }

  return result
}

export async function deleteContaPagar(id: string): Promise<void> {
  await query('DELETE FROM contas_pagar WHERE id = $1', [id])
}

// Contas a Receber
export async function getContasReceber(): Promise<ContaReceber[]> {
  const contas = await query(`
    SELECT *
    FROM contas_receber
    ORDER BY data_vencimento
  `)

  // Resolver nomes dos centros de custo/veículos
  const contasComNomes = await Promise.all(
    contas.map(async (conta) => {
      const nomeResolucao = await resolverNomeCentroCusto(conta.centro_custo_id)
      return {
        ...conta,
        centro_custo: {
          nome: nomeResolucao
        }
      }
    })
  )

  return contasComNomes
}

export async function getContaReceber(id: string): Promise<ContaReceber | null> {
  const conta = await queryOne(`
    SELECT *
    FROM contas_receber
    WHERE id = $1
  `, [id])

  if (!conta) return null

  const nomeResolucao = await resolverNomeCentroCusto(conta.centro_custo_id)

  return {
    ...conta,
    centro_custo: {
      nome: nomeResolucao
    }
  }
}

export async function createContaReceber(data: ContaReceberCreate): Promise<ContaReceber> {
  const result = await queryOne(`
    INSERT INTO contas_receber (
      descricao,
      valor,
      data_vencimento,
      data_recebimento,
      centro_custo_id,
      cliente,
      status,
      observacao
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    data.descricao,
    data.valor,
    data.data_vencimento,
    data.data_recebimento,
    data.centro_custo_id,
    data.cliente,
    data.status || 'pendente',
    data.observacao
  ])

  if (!result) {
    throw new Error('Erro ao criar conta a receber')
  }

  return result
}

export async function updateContaReceber(id: string, data: Partial<ContaReceberCreate>): Promise<ContaReceber> {
  // Construir a query dinamicamente baseada nos campos fornecidos
  const updates: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (data.descricao !== undefined) {
    updates.push(`descricao = $${paramIndex}`)
    values.push(data.descricao)
    paramIndex++
  }

  if (data.valor !== undefined) {
    updates.push(`valor = $${paramIndex}`)
    values.push(data.valor)
    paramIndex++
  }

  if (data.data_vencimento !== undefined) {
    updates.push(`data_vencimento = $${paramIndex}`)
    values.push(data.data_vencimento)
    paramIndex++
  }

  if (data.data_recebimento !== undefined) {
    updates.push(`data_recebimento = $${paramIndex}`)
    values.push(data.data_recebimento)
    paramIndex++
  }

  if (data.centro_custo_id !== undefined) {
    updates.push(`centro_custo_id = $${paramIndex}`)
    values.push(data.centro_custo_id)
    paramIndex++
  }

  if (data.cliente !== undefined) {
    updates.push(`cliente = $${paramIndex}`)
    values.push(data.cliente)
    paramIndex++
  }

  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex}`)
    values.push(data.status)
    paramIndex++
  }

  if (data.observacao !== undefined) {
    updates.push(`observacao = $${paramIndex}`)
    values.push(data.observacao)
    paramIndex++
  }

  // Sempre atualizar o timestamp
  updates.push(`updated_at = NOW()`)

  if (updates.length === 1) { // Apenas o updated_at
    throw new Error('Nenhum campo para atualizar')
  }

  // Adicionar o ID como último parâmetro
  values.push(id)

  const result = await queryOne(`
    UPDATE contas_receber
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `, values)

  if (!result) {
    throw new Error('Conta a receber não encontrada')
  }

  return result
}

export async function deleteContaReceber(id: string): Promise<void> {
  await query('DELETE FROM contas_receber WHERE id = $1', [id])
}

// Dashboard Financeiro
export interface DashboardFinanceiro {
  totalContasPagar: number
  totalContasReceber: number
  saldoPrevisto: number
  contasPagarVencidas: number
  contasReceberVencidas: number
  fluxoCaixa: FluxoCaixaItem[]
}

export interface FluxoCaixaItem {
  mes: string
  entradas: number
  saidas: number
  saldo: number
}

export async function getDashboardFinanceiro(): Promise<DashboardFinanceiro> {
  try {
    // Obter totais de contas a pagar e receber
    const [
      totalContasPagar,
      totalContasReceber,
      contasPagarVencidas,
      contasReceberVencidas,
      fluxoCaixa
    ] = await Promise.all([
      query(`
        SELECT COALESCE(SUM(valor), 0) as total
        FROM contas_pagar
        WHERE status = 'pendente'
      `),
      query(`
        SELECT COALESCE(SUM(valor), 0) as total
        FROM contas_receber
        WHERE status = 'pendente'
      `),
      query(`
        SELECT COUNT(*) as total
        FROM contas_pagar
        WHERE status = 'pendente'
        AND data_vencimento < CURRENT_DATE
      `),
      query(`
        SELECT COUNT(*) as total
        FROM contas_receber
        WHERE status = 'pendente'
        AND data_vencimento < CURRENT_DATE
      `),
      query(`
        WITH meses AS (
          SELECT generate_series(
            date_trunc('month', CURRENT_DATE - interval '5 months'),
            date_trunc('month', CURRENT_DATE + interval '1 month'),
            '1 month'::interval
          ) as mes
        ),
        entradas AS (
          SELECT 
            date_trunc('month', COALESCE(data_recebimento, data_vencimento)) as mes,
            COALESCE(SUM(valor), 0) as valor
          FROM contas_receber
          WHERE status != 'cancelado'
          GROUP BY mes
        ),
        saidas AS (
          SELECT 
            date_trunc('month', COALESCE(data_pagamento, data_vencimento)) as mes,
            COALESCE(SUM(valor), 0) as valor
          FROM contas_pagar
          WHERE status != 'cancelado'
          GROUP BY mes
        )
        SELECT 
          TO_CHAR(m.mes, 'YYYY-MM') as mes,
          COALESCE(e.valor, 0) as entradas,
          COALESCE(s.valor, 0) as saidas,
          COALESCE(e.valor, 0) - COALESCE(s.valor, 0) as saldo
        FROM meses m
        LEFT JOIN entradas e ON date_trunc('month', e.mes) = m.mes
        LEFT JOIN saidas s ON date_trunc('month', s.mes) = m.mes
        ORDER BY m.mes
      `)
    ])

    const totalPagar = parseFloat(totalContasPagar[0]?.total || '0')
    const totalReceber = parseFloat(totalContasReceber[0]?.total || '0')
    
    return {
      totalContasPagar: totalPagar,
      totalContasReceber: totalReceber,
      saldoPrevisto: totalReceber - totalPagar,
      contasPagarVencidas: parseInt(contasPagarVencidas[0]?.total || '0'),
      contasReceberVencidas: parseInt(contasReceberVencidas[0]?.total || '0'),
      fluxoCaixa: fluxoCaixa.map(item => ({
        mes: item.mes,
        entradas: parseFloat(item.entradas),
        saidas: parseFloat(item.saidas),
        saldo: parseFloat(item.saldo)
      }))
    }
  } catch (error) {
    console.error('Erro ao obter dados do dashboard financeiro:', error)
    throw error
  }
}