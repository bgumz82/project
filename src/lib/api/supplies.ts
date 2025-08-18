import { query, queryOne } from '@/lib/db'

export interface Supply {
  id: string
  veiculo_id: string
  operador_id: string
  posto_id: string
  tipo_combustivel: 'gasolina' | 'diesel' | 'etanol' | 'gnv'
  litros: number
  valor_total: number
  data_abastecimento: string
  created_at: string
  veiculo?: {
    placa: string
    modelo: string
  }
  posto?: {
    nome: string
  }
  operador?: {
    nome: string
  }
}

export interface SupplyInsert {
  veiculo_id: string
  operador_id: string
  posto_id: string
  tipo_combustivel: 'gasolina' | 'diesel' | 'etanol' | 'gnv'
  litros: number
  valor_total: number
  data_abastecimento: string
}

export async function getSupplies() {
  try {
    console.log('🔍 Buscando abastecimentos...')
    
  const supplies = await query(`
    SELECT 
      a.*,
      v.placa as veiculo_placa,
      v.modelo as veiculo_modelo,
      c.razao_social as posto_nome,
      u.nome as operador_nome
    FROM abastecimentos a
    JOIN veiculos v ON a.veiculo_id = v.id
    JOIN cadastros c ON a.posto_id = c.id AND c.tipo = 'abastecimento'
    JOIN usuarios u ON a.operador_id = u.id
    ORDER BY a.data_abastecimento DESC
  `)

  return supplies.map(supply => ({
    ...supply,
    veiculo: {
      placa: supply.veiculo_placa,
      modelo: supply.veiculo_modelo
    },
    posto: {
      nome: supply.posto_nome
    },
    operador: {
      nome: supply.operador_nome
    }
  }))

  } catch (error) {
    console.error('❌ Erro ao buscar abastecimentos:', error)
    throw error
  }
}

export async function createSupply(supply: SupplyInsert) {
  try {
    console.log('📝 Criando novo abastecimento:', supply)
    
  const result = await queryOne(`
    INSERT INTO abastecimentos (
      veiculo_id,
      operador_id,
      posto_id,
      tipo_combustivel,
      litros,
      valor_total,
      data_abastecimento
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    supply.veiculo_id,
    supply.operador_id,
    supply.posto_id,
    supply.tipo_combustivel,
    supply.litros,
    supply.valor_total,
    supply.data_abastecimento
  ])

    if (!result) {
      throw new Error('Erro ao criar abastecimento')
    }

    console.log('✅ Abastecimento criado com sucesso:', result.id)

  return result

  } catch (error) {
    console.error('❌ Erro ao criar abastecimento:', error)
    throw error
  }
}

export async function updateSupply(id: string, supply: Partial<SupplyInsert>) {
  try {
    console.log('📝 Atualizando abastecimento:', id, supply)
    
  // Validação de dados antes de enviar ao banco
  if (supply.veiculo_id !== undefined) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(supply.veiculo_id)) {
      throw new Error('ID do veículo deve ser um UUID válido')
    }
  }

  if (supply.posto_id !== undefined) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(supply.posto_id)) {
      throw new Error('ID do posto deve ser um UUID válido')
    }
  }

  if (supply.litros !== undefined) {
    const litros = Number(supply.litros)
    if (isNaN(litros) || litros <= 0) {
      throw new Error('Litros deve ser um número positivo')
    }
    supply.litros = litros
  }

  if (supply.valor_total !== undefined) {
    const valor = Number(supply.valor_total)
    if (isNaN(valor) || valor <= 0) {
      throw new Error('Valor total deve ser um número positivo')
    }
    supply.valor_total = valor
  }

  // Construir query dinamicamente baseada nos campos fornecidos
  const updates: string[] = []
  const values: any[] = [id] // ID sempre como primeiro parâmetro
  let paramIndex = 2 // Começar do parâmetro 2

  if (supply.veiculo_id !== undefined) {
    updates.push(`veiculo_id = $${paramIndex}`)
    values.push(supply.veiculo_id)
    paramIndex++
  }

  if (supply.posto_id !== undefined) {
    updates.push(`posto_id = $${paramIndex}`)
    values.push(supply.posto_id)
    paramIndex++
  }

  if (supply.tipo_combustivel !== undefined) {
    updates.push(`tipo_combustivel = $${paramIndex}`)
    values.push(supply.tipo_combustivel)
    paramIndex++
  }

  if (supply.litros !== undefined) {
    updates.push(`litros = $${paramIndex}`)
    values.push(supply.litros)
    paramIndex++
  }

  if (supply.valor_total !== undefined) {
    updates.push(`valor_total = $${paramIndex}`)
    values.push(supply.valor_total)
    paramIndex++
  }

  // Sempre atualizar updated_at
  // Remover updated_at pois a coluna não existe na tabela abastecimentos

  if (updates.length === 0) { // Nenhum campo para atualizar
    throw new Error('Nenhum campo para atualizar')
  }

  const result = await queryOne(`
    UPDATE abastecimentos
    SET ${updates.join(', ')}
    WHERE id = $1
    RETURNING *
  `, values)

  if (!result) {
    throw new Error('Abastecimento não encontrado')
  }

  console.log('✅ Abastecimento atualizado com sucesso:', result.id)

  return result

  } catch (error) {
    console.error('❌ Erro ao atualizar abastecimento:', error)
    throw error
  }
}

export async function deleteSupply(id: string) {
  try {
    console.log('🗑️ Excluindo abastecimento:', id)

  await query('DELETE FROM abastecimentos WHERE id = $1', [id])

    console.log('✅ Abastecimento excluído com sucesso')
  } catch (error) {
    console.error('❌ Erro ao excluir abastecimento:', error)
    throw error
  }
}

export async function getVehicles() {
  try {
    console.log('🚗 Buscando veículos...')
    const result = await query(`
      SELECT id, placa, modelo
      FROM veiculos
      WHERE ativo = true
      ORDER BY placa
    `)
    console.log('✅ Veículos encontrados:', result.length)
    
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar veículos:', error)
    // Retornar array vazio em caso de erro para não quebrar a interface
    return []
  }
}
