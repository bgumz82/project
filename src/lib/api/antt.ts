import { query, queryOne } from '@/lib/db'

export interface RegistroANTT {
  id: string
  veiculo_id: string
  cnpj: string
  antt: string
  razao_social_proprietario: string
  inscricao_estadual: string | null
  uf_registro: string
  empresa_proprietario: boolean
  ativo: boolean
  created_at: string
  updated_at: string
  veiculo?: {
    placa: string
    modelo: string
    marca: string
  }
}

export interface RegistroANTTCreate {
  veiculo_id: string
  cnpj: string
  antt: string
  razao_social_proprietario: string
  inscricao_estadual?: string | null
  uf_registro: string
  empresa_proprietario: boolean
  ativo?: boolean
}

export async function getRegistrosANTT(): Promise<RegistroANTT[]> {
  try {
    console.log('🔍 Buscando registros ANTT')
    
    const result = await query(`
      SELECT 
        ra.*,
        v.placa as veiculo_placa,
        v.modelo as veiculo_modelo,
        v.marca as veiculo_marca
      FROM registros_antt ra
      JOIN veiculos v ON ra.veiculo_id = v.id
      ORDER BY v.placa, ra.created_at DESC
    `)
    
    console.log('✅ Registros ANTT encontrados:', result.length)
    
    return result.map(registro => ({
      ...registro,
      veiculo: {
        placa: registro.veiculo_placa,
        modelo: registro.veiculo_modelo,
        marca: registro.veiculo_marca
      }
    }))
  } catch (error) {
    console.error('❌ Erro ao buscar registros ANTT:', error)
    throw error
  }
}

export async function getRegistroANTT(id: string): Promise<RegistroANTT | null> {
  try {
    const result = await queryOne(`
      SELECT 
        ra.*,
        v.placa as veiculo_placa,
        v.modelo as veiculo_modelo,
        v.marca as veiculo_marca
      FROM registros_antt ra
      JOIN veiculos v ON ra.veiculo_id = v.id
      WHERE ra.id = $1
    `, [id])
    
    if (!result) return null
    
    return {
      ...result,
      veiculo: {
        placa: result.veiculo_placa,
        modelo: result.veiculo_modelo,
        marca: result.veiculo_marca
      }
    }
  } catch (error) {
    console.error('❌ Erro ao buscar registro ANTT:', error)
    throw error
  }
}

export async function getRegistroANTTByVeiculo(veiculoId: string): Promise<RegistroANTT | null> {
  try {
    const result = await queryOne(`
      SELECT 
        ra.*,
        v.placa as veiculo_placa,
        v.modelo as veiculo_modelo,
        v.marca as veiculo_marca
      FROM registros_antt ra
      JOIN veiculos v ON ra.veiculo_id = v.id
      WHERE ra.veiculo_id = $1 AND ra.ativo = true
    `, [veiculoId])
    
    if (!result) return null
    
    return {
      ...result,
      veiculo: {
        placa: result.veiculo_placa,
        modelo: result.veiculo_modelo,
        marca: result.veiculo_marca
      }
    }
  } catch (error) {
    console.error('❌ Erro ao buscar registro ANTT por veículo:', error)
    throw error
  }
}

export async function createRegistroANTT(registro: RegistroANTTCreate): Promise<RegistroANTT> {
  try {
    console.log('📝 Criando novo registro ANTT:', registro)
    
    // Validar ANTT (8 dígitos)
    if (!/^\d{8}$/.test(registro.antt)) {
      throw new Error('ANTT deve conter exatamente 8 dígitos')
    }
    
    // Validar UF (2 caracteres)
    if (!/^[A-Z]{2}$/.test(registro.uf_registro)) {
      throw new Error('UF deve conter exatamente 2 letras maiúsculas')
    }
    
    // Verificar se ANTT já existe
    const existingANTT = await queryOne(`
      SELECT id FROM registros_antt WHERE antt = $1
    `, [registro.antt])
    
    if (existingANTT) {
      throw new Error('Número ANTT já cadastrado no sistema')
    }
    
    // Verificar se veículo já tem registro ANTT ativo
    const existingVehicleANTT = await queryOne(`
      SELECT id FROM registros_antt WHERE veiculo_id = $1 AND ativo = true
    `, [registro.veiculo_id])
    
    if (existingVehicleANTT) {
      throw new Error('Este veículo já possui um registro ANTT ativo')
    }
    
    const result = await queryOne(`
      INSERT INTO registros_antt (
        veiculo_id,
        cnpj,
        antt,
        razao_social_proprietario,
        inscricao_estadual,
        uf_registro,
        empresa_proprietario,
        ativo,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      registro.veiculo_id,
      registro.cnpj,
      registro.antt,
      registro.razao_social_proprietario,
      registro.inscricao_estadual,
      registro.uf_registro,
      registro.empresa_proprietario,
      registro.ativo !== undefined ? registro.ativo : true
    ])

    if (!result) {
      throw new Error('Erro ao criar registro ANTT')
    }

    console.log('✅ Registro ANTT criado com sucesso:', result.id)
    
    return result
  } catch (error) {
    console.error('❌ Erro ao criar registro ANTT:', error)
    throw error
  }
}

export async function updateRegistroANTT(id: string, registro: Partial<RegistroANTTCreate>): Promise<RegistroANTT> {
  try {
    console.log('📝 Atualizando registro ANTT:', id, registro)
    
    // Validar ANTT se fornecido
    if (registro.antt && !/^\d{8}$/.test(registro.antt)) {
      throw new Error('ANTT deve conter exatamente 8 dígitos')
    }
    
    // Validar UF se fornecido
    if (registro.uf_registro && !/^[A-Z]{2}$/.test(registro.uf_registro)) {
      throw new Error('UF deve conter exatamente 2 letras maiúsculas')
    }
    
    // Verificar se ANTT já existe em outro registro
    if (registro.antt) {
      const existingANTT = await queryOne(`
        SELECT id FROM registros_antt WHERE antt = $1 AND id != $2
      `, [registro.antt, id])
      
      if (existingANTT) {
        throw new Error('Número ANTT já cadastrado em outro registro')
      }
    }
    
    // Construir query dinamicamente
    const updates: string[] = []
    const values: any[] = [id]
    let paramIndex = 2

    if (registro.veiculo_id !== undefined) {
      updates.push(`veiculo_id = $${paramIndex}`)
      values.push(registro.veiculo_id)
      paramIndex++
    }

    if (registro.cnpj !== undefined) {
      updates.push(`cnpj = $${paramIndex}`)
      values.push(registro.cnpj)
      paramIndex++
    }

    if (registro.antt !== undefined) {
      updates.push(`antt = $${paramIndex}`)
      values.push(registro.antt)
      paramIndex++
    }

    if (registro.razao_social_proprietario !== undefined) {
      updates.push(`razao_social_proprietario = $${paramIndex}`)
      values.push(registro.razao_social_proprietario)
      paramIndex++
    }

    if (registro.inscricao_estadual !== undefined) {
      updates.push(`inscricao_estadual = $${paramIndex}`)
      values.push(registro.inscricao_estadual)
      paramIndex++
    }

    if (registro.uf_registro !== undefined) {
      updates.push(`uf_registro = $${paramIndex}`)
      values.push(registro.uf_registro)
      paramIndex++
    }

    if (registro.empresa_proprietario !== undefined) {
      updates.push(`empresa_proprietario = $${paramIndex}`)
      values.push(registro.empresa_proprietario)
      paramIndex++
    }

    if (registro.ativo !== undefined) {
      updates.push(`ativo = $${paramIndex}`)
      values.push(registro.ativo)
      paramIndex++
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) { // Apenas updated_at
      throw new Error('Nenhum campo para atualizar')
    }

    const result = await queryOne(`
      UPDATE registros_antt
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values)

    if (!result) {
      throw new Error('Registro ANTT não encontrado')
    }

    console.log('✅ Registro ANTT atualizado com sucesso:', result.id)

    return result
  } catch (error) {
    console.error('❌ Erro ao atualizar registro ANTT:', error)
    throw error
  }
}

export async function deleteRegistroANTT(id: string): Promise<void> {
  try {
    console.log('🗑️ Excluindo registro ANTT:', id)
    
    await query('DELETE FROM registros_antt WHERE id = $1', [id])
    console.log('✅ Registro ANTT excluído com sucesso')
  } catch (error) {
    console.error('❌ Erro ao excluir registro ANTT:', error)
    throw error
  }
}

// Estados brasileiros para seleção
export const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]