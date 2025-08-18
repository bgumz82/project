import { query, queryOne } from '@/lib/db'

// Tipos para Empresas Fiscais
export interface EmpresaFiscal {
  id: string
  razao_social: string
  cnpj: string
  ie: string | null
  endereco_completo: string
  rntrc: string | null
  status: 'ativo' | 'inativo' | 'suspenso'
  created_at: string
  updated_at: string
}

export interface EmpresaFiscalCreate {
  razao_social: string
  cnpj: string
  ie?: string | null
  endereco_completo: string
  rntrc?: string | null
  status?: 'ativo' | 'inativo' | 'suspenso'
}

// Tipos para CT-e
export interface CTeDocumento {
  id: string
  empresa_id: string
  numero_cte: string
  serie: string
  data_emissao: string
  status: 'pendente' | 'emitido' | 'cancelado'
  observacoes: string | null
  created_at: string
  updated_at: string
  empresa?: {
    razao_social: string
    cnpj: string
  }
}

export interface CTeDocumentoCreate {
  empresa_id: string
  numero_cte: string
  serie: string
  data_emissao: string
  status?: 'pendente' | 'emitido' | 'cancelado'
  observacoes?: string | null
}

// Tipos para MDF-e
export interface MDFeDocumento {
  id: string
  empresa_id: string
  numero_mdfe: string
  serie: string
  data_emissao: string
  status: 'pendente' | 'emitido' | 'cancelado' | 'encerrado'
  observacoes: string | null
  created_at: string
  updated_at: string
  empresa?: {
    razao_social: string
    cnpj: string
  }
}

export interface MDFeDocumentoCreate {
  empresa_id: string
  numero_mdfe: string
  serie: string
  data_emissao: string
  status?: 'pendente' | 'emitido' | 'cancelado' | 'encerrado'
  observacoes?: string | null
}

// ===== EMPRESAS FISCAIS =====

export async function getEmpresasFiscais(): Promise<EmpresaFiscal[]> {
  try {
    console.log('🔍 Buscando empresas fiscais')
    
    const result = await query(`
      SELECT *
      FROM empresas_fiscais
      ORDER BY razao_social
    `)
    
    console.log('✅ Empresas fiscais encontradas:', result.length)
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar empresas fiscais:', error)
    throw error
  }
}

export async function getEmpresaFiscal(id: string): Promise<EmpresaFiscal | null> {
  try {
    const result = await queryOne(`
      SELECT *
      FROM empresas_fiscais
      WHERE id = $1
    `, [id])
    
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar empresa fiscal:', error)
    throw error
  }
}

export async function createEmpresaFiscal(empresa: EmpresaFiscalCreate): Promise<EmpresaFiscal> {
  try {
    console.log('📝 Criando nova empresa fiscal:', empresa)
    
    // Limpar e validar CNPJ
    const cnpjLimpo = empresa.cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ deve conter exatamente 14 dígitos')
    }
    
    // Verificar se CNPJ já existe
    const existingEmpresa = await queryOne(`
      SELECT id FROM empresas_fiscais WHERE cnpj = $1
    `, [cnpjLimpo])
    
    if (existingEmpresa) {
      throw new Error('CNPJ já cadastrado no sistema')
    }
    
    const result = await queryOne(`
      INSERT INTO empresas_fiscais (
        razao_social,
        cnpj,
        ie,
        endereco_completo,
        rntrc,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [
      empresa.razao_social,
      cnpjLimpo,
      empresa.ie,
      empresa.endereco_completo,
      empresa.rntrc,
      empresa.status || 'ativo'
    ])

    if (!result) {
      throw new Error('Erro ao criar empresa fiscal')
    }

    console.log('✅ Empresa fiscal criada com sucesso:', result.id)
    return result
  } catch (error) {
    console.error('❌ Erro ao criar empresa fiscal:', error)
    throw error
  }
}

export async function updateEmpresaFiscal(id: string, empresa: Partial<EmpresaFiscalCreate>): Promise<EmpresaFiscal> {
  try {
    console.log('📝 Atualizando empresa fiscal:', id, empresa)
    
    let cnpjLimpo: string | undefined
    
    // Limpar e validar CNPJ se fornecido
    if (empresa.cnpj) {
      cnpjLimpo = empresa.cnpj.replace(/\D/g, '')
      if (cnpjLimpo.length !== 14) {
        throw new Error('CNPJ deve conter exatamente 14 dígitos')
      }
      
      // Verificar se CNPJ já existe em outra empresa
      const existingEmpresa = await queryOne(`
        SELECT id FROM empresas_fiscais WHERE cnpj = $1 AND id != $2
      `, [cnpjLimpo, id])
      
      if (existingEmpresa) {
        throw new Error('CNPJ já cadastrado em outra empresa')
      }
    }
    
    // Construir query dinamicamente
    const updates: string[] = []
    const values: any[] = [id]
    let paramIndex = 2

    if (empresa.razao_social !== undefined) {
      updates.push(`razao_social = $${paramIndex}`)
      values.push(empresa.razao_social)
      paramIndex++
    }

    if (cnpjLimpo !== undefined) {
      updates.push(`cnpj = $${paramIndex}`)
      values.push(cnpjLimpo)
      paramIndex++
    }

    if (empresa.ie !== undefined) {
      updates.push(`ie = $${paramIndex}`)
      values.push(empresa.ie)
      paramIndex++
    }

    if (empresa.endereco_completo !== undefined) {
      updates.push(`endereco_completo = $${paramIndex}`)
      values.push(empresa.endereco_completo)
      paramIndex++
    }

    if (empresa.rntrc !== undefined) {
      updates.push(`rntrc = $${paramIndex}`)
      values.push(empresa.rntrc)
      paramIndex++
    }

    if (empresa.status !== undefined) {
      updates.push(`status = $${paramIndex}`)
      values.push(empresa.status)
      paramIndex++
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) { // Apenas updated_at
      throw new Error('Nenhum campo para atualizar')
    }

    const result = await queryOne(`
      UPDATE empresas_fiscais
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values)

    if (!result) {
      throw new Error('Empresa fiscal não encontrada')
    }

    console.log('✅ Empresa fiscal atualizada com sucesso:', result.id)
    return result
  } catch (error) {
    console.error('❌ Erro ao atualizar empresa fiscal:', error)
    throw error
  }
}

export async function deleteEmpresaFiscal(id: string): Promise<void> {
  try {
    console.log('🗑️ Excluindo empresa fiscal:', id)
    
    // Verificar se há documentos vinculados
    const cteCount = await queryOne(`
      SELECT COUNT(*) as count FROM cte_documentos WHERE empresa_id = $1
    `, [id])
    
    const mdfeCount = await queryOne(`
      SELECT COUNT(*) as count FROM mdfe_documentos WHERE empresa_id = $1
    `, [id])
    
    if ((cteCount && parseInt(cteCount.count) > 0) || (mdfeCount && parseInt(mdfeCount.count) > 0)) {
      throw new Error('Não é possível excluir empresa com documentos fiscais vinculados')
    }
    
    await query('DELETE FROM empresas_fiscais WHERE id = $1', [id])
    console.log('✅ Empresa fiscal excluída com sucesso')
  } catch (error) {
    console.error('❌ Erro ao excluir empresa fiscal:', error)
    throw error
  }
}

// ===== CT-e DOCUMENTOS =====

export async function getCTeDocumentos(): Promise<CTeDocumento[]> {
  try {
    console.log('🔍 Buscando documentos CT-e')
    
    const result = await query(`
      SELECT 
        c.*,
        e.razao_social as empresa_razao_social,
        e.cnpj as empresa_cnpj
      FROM cte_documentos c
      JOIN empresas_fiscais e ON c.empresa_id = e.id
      ORDER BY c.data_emissao DESC, c.numero_cte DESC
    `)
    
    console.log('✅ Documentos CT-e encontrados:', result.length)
    
    return result.map(doc => ({
      ...doc,
      empresa: {
        razao_social: doc.empresa_razao_social,
        cnpj: doc.empresa_cnpj
      }
    }))
  } catch (error) {
    console.error('❌ Erro ao buscar documentos CT-e:', error)
    throw error
  }
}

export async function createCTeDocumento(documento: CTeDocumentoCreate): Promise<CTeDocumento> {
  try {
    console.log('📝 Criando novo documento CT-e:', documento)
    
    // Verificar se empresa existe
    const empresa = await queryOne(`
      SELECT id FROM empresas_fiscais WHERE id = $1
    `, [documento.empresa_id])
    
    if (!empresa) {
      throw new Error('Empresa fiscal não encontrada')
    }
    
    // Verificar se número/série já existe para esta empresa
    const existingDoc = await queryOne(`
      SELECT id FROM cte_documentos 
      WHERE empresa_id = $1 AND numero_cte = $2 AND serie = $3
    `, [documento.empresa_id, documento.numero_cte, documento.serie])
    
    if (existingDoc) {
      throw new Error('Número CT-e e série já existem para esta empresa')
    }
    
    const result = await queryOne(`
      INSERT INTO cte_documentos (
        empresa_id,
        numero_cte,
        serie,
        data_emissao,
        status,
        observacoes,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [
      documento.empresa_id,
      documento.numero_cte,
      documento.serie,
      documento.data_emissao,
      documento.status || 'pendente',
      documento.observacoes
    ])

    if (!result) {
      throw new Error('Erro ao criar documento CT-e')
    }

    console.log('✅ Documento CT-e criado com sucesso:', result.id)
    return result
  } catch (error) {
    console.error('❌ Erro ao criar documento CT-e:', error)
    throw error
  }
}

export async function updateCTeDocumento(id: string, documento: Partial<CTeDocumentoCreate>): Promise<CTeDocumento> {
  try {
    console.log('📝 Atualizando documento CT-e:', id, documento)
    
    // Construir query dinamicamente
    const updates: string[] = []
    const values: any[] = [id]
    let paramIndex = 2

    if (documento.empresa_id !== undefined) {
      updates.push(`empresa_id = $${paramIndex}`)
      values.push(documento.empresa_id)
      paramIndex++
    }

    if (documento.numero_cte !== undefined) {
      updates.push(`numero_cte = $${paramIndex}`)
      values.push(documento.numero_cte)
      paramIndex++
    }

    if (documento.serie !== undefined) {
      updates.push(`serie = $${paramIndex}`)
      values.push(documento.serie)
      paramIndex++
    }

    if (documento.data_emissao !== undefined) {
      updates.push(`data_emissao = $${paramIndex}`)
      values.push(documento.data_emissao)
      paramIndex++
    }

    if (documento.status !== undefined) {
      updates.push(`status = $${paramIndex}`)
      values.push(documento.status)
      paramIndex++
    }

    if (documento.observacoes !== undefined) {
      updates.push(`observacoes = $${paramIndex}`)
      values.push(documento.observacoes)
      paramIndex++
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) { // Apenas updated_at
      throw new Error('Nenhum campo para atualizar')
    }

    const result = await queryOne(`
      UPDATE cte_documentos
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values)

    if (!result) {
      throw new Error('Documento CT-e não encontrado')
    }

    console.log('✅ Documento CT-e atualizado com sucesso:', result.id)
    return result
  } catch (error) {
    console.error('❌ Erro ao atualizar documento CT-e:', error)
    throw error
  }
}

export async function deleteCTeDocumento(id: string): Promise<void> {
  try {
    console.log('🗑️ Excluindo documento CT-e:', id)
    
    await query('DELETE FROM cte_documentos WHERE id = $1', [id])
    console.log('✅ Documento CT-e excluído com sucesso')
  } catch (error) {
    console.error('❌ Erro ao excluir documento CT-e:', error)
    throw error
  }
}

// ===== MDF-e DOCUMENTOS =====

export async function getMDFeDocumentos(): Promise<MDFeDocumento[]> {
  try {
    console.log('🔍 Buscando documentos MDF-e')
    
    const result = await query(`
      SELECT 
        m.*,
        e.razao_social as empresa_razao_social,
        e.cnpj as empresa_cnpj
      FROM mdfe_documentos m
      JOIN empresas_fiscais e ON m.empresa_id = e.id
      ORDER BY m.data_emissao DESC, m.numero_mdfe DESC
    `)
    
    console.log('✅ Documentos MDF-e encontrados:', result.length)
    
    return result.map(doc => ({
      ...doc,
      empresa: {
        razao_social: doc.empresa_razao_social,
        cnpj: doc.empresa_cnpj
      }
    }))
  } catch (error) {
    console.error('❌ Erro ao buscar documentos MDF-e:', error)
    throw error
  }
}

export async function createMDFeDocumento(documento: MDFeDocumentoCreate): Promise<MDFeDocumento> {
  try {
    console.log('📝 Criando novo documento MDF-e:', documento)
    
    // Verificar se empresa existe
    const empresa = await queryOne(`
      SELECT id FROM empresas_fiscais WHERE id = $1
    `, [documento.empresa_id])
    
    if (!empresa) {
      throw new Error('Empresa fiscal não encontrada')
    }
    
    // Verificar se número/série já existe para esta empresa
    const existingDoc = await queryOne(`
      SELECT id FROM mdfe_documentos 
      WHERE empresa_id = $1 AND numero_mdfe = $2 AND serie = $3
    `, [documento.empresa_id, documento.numero_mdfe, documento.serie])
    
    if (existingDoc) {
      throw new Error('Número MDF-e e série já existem para esta empresa')
    }
    
    const result = await queryOne(`
      INSERT INTO mdfe_documentos (
        empresa_id,
        numero_mdfe,
        serie,
        data_emissao,
        status,
        observacoes,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [
      documento.empresa_id,
      documento.numero_mdfe,
      documento.serie,
      documento.data_emissao,
      documento.status || 'pendente',
      documento.observacoes
    ])

    if (!result) {
      throw new Error('Erro ao criar documento MDF-e')
    }

    console.log('✅ Documento MDF-e criado com sucesso:', result.id)
    return result
  } catch (error) {
    console.error('❌ Erro ao criar documento MDF-e:', error)
    throw error
  }
}

export async function updateMDFeDocumento(id: string, documento: Partial<MDFeDocumentoCreate>): Promise<MDFeDocumento> {
  try {
    console.log('📝 Atualizando documento MDF-e:', id, documento)
    
    // Construir query dinamicamente
    const updates: string[] = []
    const values: any[] = [id]
    let paramIndex = 2

    if (documento.empresa_id !== undefined) {
      updates.push(`empresa_id = $${paramIndex}`)
      values.push(documento.empresa_id)
      paramIndex++
    }

    if (documento.numero_mdfe !== undefined) {
      updates.push(`numero_mdfe = $${paramIndex}`)
      values.push(documento.numero_mdfe)
      paramIndex++
    }

    if (documento.serie !== undefined) {
      updates.push(`serie = $${paramIndex}`)
      values.push(documento.serie)
      paramIndex++
    }

    if (documento.data_emissao !== undefined) {
      updates.push(`data_emissao = $${paramIndex}`)
      values.push(documento.data_emissao)
      paramIndex++
    }

    if (documento.status !== undefined) {
      updates.push(`status = $${paramIndex}`)
      values.push(documento.status)
      paramIndex++
    }

    if (documento.observacoes !== undefined) {
      updates.push(`observacoes = $${paramIndex}`)
      values.push(documento.observacoes)
      paramIndex++
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) { // Apenas updated_at
      throw new Error('Nenhum campo para atualizar')
    }

    const result = await queryOne(`
      UPDATE mdfe_documentos
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `, values)

    if (!result) {
      throw new Error('Documento MDF-e não encontrado')
    }

    console.log('✅ Documento MDF-e atualizado com sucesso:', result.id)
    return result
  } catch (error) {
    console.error('❌ Erro ao atualizar documento MDF-e:', error)
    throw error
  }
}

export async function deleteMDFeDocumento(id: string): Promise<void> {
  try {
    console.log('🗑️ Excluindo documento MDF-e:', id)
    
    await query('DELETE FROM mdfe_documentos WHERE id = $1', [id])
    console.log('✅ Documento MDF-e excluído com sucesso')
  } catch (error) {
    console.error('❌ Erro ao excluir documento MDF-e:', error)
    throw error
  }
}

// ===== FUNÇÕES AUXILIARES =====

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/[^\d]/g, '')
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/[^\d]/g, '')
  return cleaned.length === 14
}