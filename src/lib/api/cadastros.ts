import { query, queryOne } from '@/lib/db'

export type CadastroTipo = 'cliente' | 'fornecedor' | 'abastecimento'

export interface Cadastro {
  id: string
  tipo: CadastroTipo
  razao_social: string
  cnpj: string | null
  ie: string | null
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone: string | null
  emails: string[] // Changed to string[] to align with the backend storage
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface CadastroInsert {
  tipo: CadastroTipo
  razao_social: string
  cnpj?: string | null
  ie?: string | null
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone?: string | null
  emails: string[] // Changed to string[] to align with the backend storage
  ativo?: boolean
}

export interface CadastroCreate {
  tipo: CadastroTipo
  razao_social: string
  cnpj?: string | null
  ie?: string | null
  endereco: string
  cidade: string
  estado: string
  cep: string
  telefone?: string | null
  emails: string[] // Changed to string[] to align with the backend storage
  ativo?: boolean
}

// Helper function to parse emails from a string, JSON string or array
const parseEmails = (emailsData: string | string[] | undefined | null): string[] => {
  if (!emailsData) {
    return [];
  }
  
  // Se for array, retorna direto
  if (Array.isArray(emailsData)) {
    return emailsData;
  }
  
  if (typeof emailsData === 'string') {
    // Tenta fazer parse como JSON primeiro
    try {
      const parsed = JSON.parse(emailsData);
      
      // Se for objeto com propriedade email
      if (parsed && typeof parsed === 'object' && parsed.email) {
        return parsed.email.split(',').map((email: string) => email.trim()).filter((email: string) => email.length > 0);
      }
      
      // Se for array
      if (Array.isArray(parsed)) {
        return parsed;
      }
      
      // Se for string dentro do JSON
      if (typeof parsed === 'string') {
        return parsed.split(',').map(email => email.trim()).filter(email => email.length > 0);
      }
    } catch (e) {
      // Se não conseguir fazer parse, trata como string simples
      return emailsData.split(',').map(email => email.trim()).filter(email => email.length > 0);
    }
  }
  
  return [];
};

export async function getCadastros(): Promise<Cadastro[]> {
  try {
    console.log('🔍 Buscando todos os cadastros')

    const result = await query(`
      SELECT 
        id,
        tipo,
        razao_social,
        cnpj,
        ie,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        emails,
        ativo,
        created_at,
        updated_at
      FROM cadastros 
      ORDER BY razao_social
    `)

    console.log('✅ Cadastros encontrados:', result.length)

    return result.map(cadastro => ({
      ...cadastro,
      emails: parseEmails(cadastro.emails)
    }))
  } catch (error) {
    console.error('❌ Erro ao buscar cadastros:', error)
    throw error
  }
}

// Função para verificar se cliente existe por CNPJ
export async function verificarClientePorCNPJ(cnpj: string): Promise<Cadastro | null> {
  try {
    console.log('🔍 Verificando cliente por CNPJ:', cnpj)

    const result = await queryOne(`
      SELECT 
        id,
        tipo,
        razao_social,
        cnpj,
        ie,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        emails,
        ativo,
        created_at,
        updated_at
      FROM cadastros 
      WHERE cnpj = $1 AND tipo = 'cliente' AND ativo = true
    `, [cnpj])

    if (result) {
      console.log('✅ Cliente encontrado:', result.razao_social)
      return {
        ...result,
        emails: parseEmails(result.emails)
      }
    }

    console.log('❌ Cliente não encontrado para CNPJ:', cnpj)
    return null
  } catch (error) {
    console.error('❌ Erro ao verificar cliente por CNPJ:', error)
    throw error
  }
}

export async function getCadastrosByTipo(tipo: CadastroTipo): Promise<Cadastro[]> {
  try {
    console.log('🔍 Buscando cadastros por tipo:', tipo)

    const result = await query(`
      SELECT 
        id,
        tipo,
        razao_social,
        cnpj,
        ie,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        emails,
        ativo,
        created_at,
        updated_at
      FROM cadastros 
      WHERE tipo = $1 AND ativo = true
      ORDER BY razao_social
    `, [tipo])

    console.log(`✅ Cadastros do tipo ${tipo} encontrados:`, result.length)

    return result.map(cadastro => ({
      ...cadastro,
      emails: parseEmails(cadastro.emails)
    }))
  } catch (error) {
    console.error(`❌ Erro ao buscar cadastros do tipo ${tipo}:`, error)
    throw error
  }
}

export async function getCadastro(id: string): Promise<Cadastro | null> {
  try {
    const result = await queryOne(`
      SELECT *
      FROM cadastros
      WHERE id = $1
    `, [id])

    if (!result) return null

    return {
      ...result,
      emails: parseEmails(result.emails)
    }
  } catch (error) {
    console.error('❌ Erro ao buscar cadastro:', error)
    throw error
  }
}

export async function createCadastro(cadastro: CadastroCreate): Promise<Cadastro> {
  try {
    console.log('📝 Criando novo cadastro:', cadastro)

    // Validar emails
    if (!cadastro.emails || cadastro.emails.length === 0) {
      throw new Error('Pelo menos um email é obrigatório')
    }

    // Validar CNPJ se fornecido
    if (cadastro.cnpj) {
      const existingCadastro = await queryOne(`
        SELECT id FROM cadastros WHERE cnpj = $1
      `, [cadastro.cnpj])

      if (existingCadastro) {
        throw new Error('CNPJ já cadastrado no sistema')
      }
    }

    const result = await queryOne(`
      INSERT INTO cadastros (
        tipo,
        razao_social,
        cnpj,
        ie,
        endereco,
        cidade,
        estado,
        cep,
        telefone,
        emails,
        ativo,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      cadastro.tipo,
      cadastro.razao_social,
      cadastro.cnpj,
      cadastro.ie,
      cadastro.endereco,
      cadastro.cidade,
      cadastro.estado,
      cadastro.cep,
      cadastro.telefone,
      JSON.stringify({ email: cadastro.emails.join(',') }), // Store emails as JSON with comma-separated string
      cadastro.ativo !== undefined ? cadastro.ativo : true
    ])

    if (!result) {
      throw new Error('Erro ao criar cadastro')
    }

    console.log('✅ Cadastro criado com sucesso:', result.id)

    return {
      ...result,
      emails: parseEmails(result.emails)
    }
  } catch (error) {
    console.error('❌ Erro ao criar cadastro:', error)
    throw error
  }
}

export async function updateCadastro(id: string, cadastro: Partial<CadastroCreate>): Promise<Cadastro> {
  try {
    console.log('📝 Atualizando cadastro:', id, cadastro)

    // Validar CNPJ se fornecido e diferente do atual
    if (cadastro.cnpj) {
      const existingCadastro = await queryOne(`
        SELECT id FROM cadastros WHERE cnpj = $1 AND id != $2
      `, [cadastro.cnpj, id])

      if (existingCadastro) {
        throw new Error('CNPJ já cadastrado em outro registro')
      }
    }

    // Construir query dinamicamente
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (cadastro.tipo !== undefined) {
      updates.push(`tipo = $${paramIndex}`)
      values.push(cadastro.tipo)
      paramIndex++
    }

    if (cadastro.razao_social !== undefined) {
      updates.push(`razao_social = $${paramIndex}`)
      values.push(cadastro.razao_social)
      paramIndex++
    }

    if (cadastro.cnpj !== undefined) {
      updates.push(`cnpj = $${paramIndex}`)
      values.push(cadastro.cnpj)
      paramIndex++
    }

    if (cadastro.ie !== undefined) {
      updates.push(`ie = $${paramIndex}`)
      values.push(cadastro.ie)
      paramIndex++
    }

    if (cadastro.endereco !== undefined) {
      updates.push(`endereco = $${paramIndex}`)
      values.push(cadastro.endereco)
      paramIndex++
    }

    if (cadastro.cidade !== undefined) {
      updates.push(`cidade = $${paramIndex}`)
      values.push(cadastro.cidade)
      paramIndex++
    }

    if (cadastro.estado !== undefined) {
      updates.push(`estado = $${paramIndex}`)
      values.push(cadastro.estado)
      paramIndex++
    }

    if (cadastro.cep !== undefined) {
      updates.push(`cep = $${paramIndex}`)
      values.push(cadastro.cep)
      paramIndex++
    }

    if (cadastro.telefone !== undefined) {
      updates.push(`telefone = $${paramIndex}`)
      values.push(cadastro.telefone)
      paramIndex++
    }

    if (cadastro.emails !== undefined) {
      updates.push(`emails = $${paramIndex}`)
      values.push(JSON.stringify({ email: cadastro.emails.join(',') })) // Store emails as JSON with comma-separated string
      paramIndex++
    }

    if (cadastro.ativo !== undefined) {
      updates.push(`ativo = $${paramIndex}`)
      values.push(cadastro.ativo)
      paramIndex++
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) { // Apenas updated_at
      throw new Error('Nenhum campo para atualizar')
    }

    // Adicionar ID como último parâmetro
    values.push(id)

    const result = await queryOne(`
      UPDATE cadastros
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values)

    if (!result) {
      throw new Error('Cadastro não encontrado')
    }

    console.log('✅ Cadastro atualizado com sucesso:', result.id)

    return {
      ...result,
      emails: parseEmails(result.emails)
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar cadastro:', error)
    throw error
  }
}

export async function deleteCadastro(id: string): Promise<void> {
  try {
    console.log('🗑️ Excluindo cadastro:', id)

    // Verificar se o cadastro está sendo usado em abastecimentos
    const abastecimentosCount = await queryOne(`
      SELECT COUNT(*) as count
      FROM abastecimentos a
      JOIN cadastros c ON a.posto_id::text = c.id::text
      WHERE c.id = $1
    `, [id])

    if (abastecimentosCount && parseInt(abastecimentosCount.count) > 0) {
      throw new Error('Não é possível excluir este cadastro pois ele possui abastecimentos vinculados')
    }

    await query('DELETE FROM cadastros WHERE id = $1', [id])
    console.log('✅ Cadastro excluído com sucesso')
  } catch (error) {
    console.error('❌ Erro ao excluir cadastro:', error)
    throw error
  }
}

// Função específica para buscar postos de abastecimento (substitui a antiga getStations)
export async function getPostosAbastecimento(): Promise<Cadastro[]> {
  return getCadastrosByTipo('abastecimento')
}

// Função específica para buscar fornecedores
export async function getFornecedores(): Promise<Cadastro[]> {
  return getCadastrosByTipo('fornecedor')
}

// Função específica para buscar clientes
export async function getClientes(): Promise<Cadastro[]> {
  return getCadastrosByTipo('cliente')
}