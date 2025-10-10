
import { query, queryOne } from '@/lib/db'

export type TipoDocumentoFiscal = 'cte' | 'mdfe'

export interface XmlTagGrupo {
  id: string
  nome: string
  descricao: string | null
  tipo_documento: TipoDocumentoFiscal
  ordem: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface XmlTagControle {
  id: string
  empresa_id: string
  tipo_documento: TipoDocumentoFiscal
  grupo_id: string | null
  tag_nome: string
  tag_path: string
  valor_padrao: string | null
  obrigatoria: boolean
  ordem: number
  ativo: boolean
  observacoes: string | null
  created_at: string
  updated_at: string
  grupo?: XmlTagGrupo
}

export interface XmlTagValor {
  id: string
  tag_controle_id: string
  documento_id: string
  tipo_documento: TipoDocumentoFiscal
  valor: string | null
  created_at: string
  updated_at: string
}

export interface XmlTagTemplate {
  id: string
  nome: string
  descricao: string | null
  tipo_documento: TipoDocumentoFiscal
  tags_json: any
  publico: boolean
  created_at: string
  updated_at: string
}

// ===== GRUPOS =====

export async function getXmlTagGrupos(tipoDocumento?: TipoDocumentoFiscal): Promise<XmlTagGrupo[]> {
  try {
    const sql = tipoDocumento 
      ? `SELECT * FROM xml_tag_grupos WHERE tipo_documento = $1 ORDER BY ordem, nome`
      : `SELECT * FROM xml_tag_grupos ORDER BY tipo_documento, ordem, nome`
    
    const params = tipoDocumento ? [tipoDocumento] : []
    const result = await query(sql, params)
    return result
  } catch (error) {
    console.error('Erro ao buscar grupos de tags XML:', error)
    throw error
  }
}

export async function createXmlTagGrupo(grupo: Omit<XmlTagGrupo, 'id' | 'created_at' | 'updated_at'>): Promise<XmlTagGrupo> {
  try {
    const result = await queryOne(`
      INSERT INTO xml_tag_grupos (nome, descricao, tipo_documento, ordem, ativo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [grupo.nome, grupo.descricao, grupo.tipo_documento, grupo.ordem, grupo.ativo])
    
    return result
  } catch (error) {
    console.error('Erro ao criar grupo de tags XML:', error)
    throw error
  }
}

// ===== TAGS DE CONTROLE =====

export async function getXmlTagsControle(empresaId: string, tipoDocumento: TipoDocumentoFiscal): Promise<XmlTagControle[]> {
  try {
    const result = await query(`
      SELECT 
        tc.*,
        g.nome as grupo_nome,
        g.descricao as grupo_descricao
      FROM xml_tags_controle tc
      LEFT JOIN xml_tag_grupos g ON tc.grupo_id = g.id
      WHERE tc.empresa_id = $1 AND tc.tipo_documento = $2
      ORDER BY tc.ordem, tc.tag_nome
    `, [empresaId, tipoDocumento])
    
    return result
  } catch (error) {
    console.error('Erro ao buscar tags de controle:', error)
    throw error
  }
}

export async function createXmlTagControle(tag: Omit<XmlTagControle, 'id' | 'created_at' | 'updated_at'>): Promise<XmlTagControle> {
  try {
    const result = await queryOne(`
      INSERT INTO xml_tags_controle (
        empresa_id, tipo_documento, grupo_id, tag_nome, tag_path,
        valor_padrao, obrigatoria, ordem, ativo, observacoes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      tag.empresa_id, tag.tipo_documento, tag.grupo_id, tag.tag_nome,
      tag.tag_path, tag.valor_padrao, tag.obrigatoria, tag.ordem,
      tag.ativo, tag.observacoes
    ])
    
    return result
  } catch (error) {
    console.error('Erro ao criar tag de controle:', error)
    throw error
  }
}

export async function updateXmlTagControle(id: string, tag: Partial<XmlTagControle>): Promise<XmlTagControle> {
  try {
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (tag.grupo_id !== undefined) {
      updates.push(`grupo_id = $${paramIndex}`)
      values.push(tag.grupo_id)
      paramIndex++
    }

    if (tag.tag_nome !== undefined) {
      updates.push(`tag_nome = $${paramIndex}`)
      values.push(tag.tag_nome)
      paramIndex++
    }

    if (tag.tag_path !== undefined) {
      updates.push(`tag_path = $${paramIndex}`)
      values.push(tag.tag_path)
      paramIndex++
    }

    if (tag.valor_padrao !== undefined) {
      updates.push(`valor_padrao = $${paramIndex}`)
      values.push(tag.valor_padrao)
      paramIndex++
    }

    if (tag.obrigatoria !== undefined) {
      updates.push(`obrigatoria = $${paramIndex}`)
      values.push(tag.obrigatoria)
      paramIndex++
    }

    if (tag.ordem !== undefined) {
      updates.push(`ordem = $${paramIndex}`)
      values.push(tag.ordem)
      paramIndex++
    }

    if (tag.ativo !== undefined) {
      updates.push(`ativo = $${paramIndex}`)
      values.push(tag.ativo)
      paramIndex++
    }

    if (tag.observacoes !== undefined) {
      updates.push(`observacoes = $${paramIndex}`)
      values.push(tag.observacoes)
      paramIndex++
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const result = await queryOne(`
      UPDATE xml_tags_controle
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values)

    return result
  } catch (error) {
    console.error('Erro ao atualizar tag de controle:', error)
    throw error
  }
}

export async function deleteXmlTagControle(id: string): Promise<void> {
  try {
    await query('DELETE FROM xml_tags_controle WHERE id = $1', [id])
  } catch (error) {
    console.error('Erro ao excluir tag de controle:', error)
    throw error
  }
}

// ===== VALORES CUSTOMIZADOS =====

export async function getXmlTagValores(documentoId: string, tipoDocumento: TipoDocumentoFiscal): Promise<XmlTagValor[]> {
  try {
    const result = await query(`
      SELECT v.*, tc.tag_nome, tc.tag_path
      FROM xml_tags_valores v
      JOIN xml_tags_controle tc ON v.tag_controle_id = tc.id
      WHERE v.documento_id = $1 AND v.tipo_documento = $2
    `, [documentoId, tipoDocumento])
    
    return result
  } catch (error) {
    console.error('Erro ao buscar valores de tags:', error)
    throw error
  }
}

export async function setXmlTagValor(
  tagControleId: string,
  documentoId: string,
  tipoDocumento: TipoDocumentoFiscal,
  valor: string | null
): Promise<XmlTagValor> {
  try {
    const result = await queryOne(`
      INSERT INTO xml_tags_valores (tag_controle_id, documento_id, tipo_documento, valor)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (tag_controle_id, documento_id)
      DO UPDATE SET valor = $4, updated_at = NOW()
      RETURNING *
    `, [tagControleId, documentoId, tipoDocumento, valor])
    
    return result
  } catch (error) {
    console.error('Erro ao definir valor de tag:', error)
    throw error
  }
}

// ===== TEMPLATES =====

export async function getXmlTagTemplates(tipoDocumento?: TipoDocumentoFiscal): Promise<XmlTagTemplate[]> {
  try {
    const sql = tipoDocumento
      ? `SELECT * FROM xml_tags_templates WHERE tipo_documento = $1 OR publico = true ORDER BY nome`
      : `SELECT * FROM xml_tags_templates WHERE publico = true ORDER BY tipo_documento, nome`
    
    const params = tipoDocumento ? [tipoDocumento] : []
    const result = await query(sql, params)
    return result
  } catch (error) {
    console.error('Erro ao buscar templates:', error)
    throw error
  }
}

export async function aplicarTemplate(empresaId: string, templateId: string): Promise<void> {
  try {
    const template = await queryOne(
      'SELECT * FROM xml_tags_templates WHERE id = $1',
      [templateId]
    )

    if (!template) {
      throw new Error('Template não encontrado')
    }

    const tags = template.tags_json as any[]

    for (const tag of tags) {
      await queryOne(`
        INSERT INTO xml_tags_controle (
          empresa_id, tipo_documento, grupo_id, tag_nome, tag_path,
          valor_padrao, obrigatoria, ordem, ativo, observacoes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (empresa_id, tipo_documento, tag_path) DO UPDATE
        SET tag_nome = $4, grupo_id = $3, valor_padrao = $6, 
            obrigatoria = $7, ordem = $8, ativo = $9, observacoes = $10
      `, [
        empresaId, template.tipo_documento, tag.grupo_id, tag.tag_nome,
        tag.tag_path, tag.valor_padrao, tag.obrigatoria, tag.ordem,
        tag.ativo, tag.observacoes
      ])
    }
  } catch (error) {
    console.error('Erro ao aplicar template:', error)
    throw error
  }
}
