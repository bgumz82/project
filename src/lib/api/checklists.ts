import { query, queryOne } from '@/lib/db'

export interface ChecklistItem {
  id: string
  nome: string
  status: 'ok' | 'nao_ok' | 'na'
  observacao?: string
}

export interface Checklist {
  id: string
  veiculo_id: string
  operador_id: string
  data_checklist: string
  itens: string
  observacoes?: string | null
  email_enviado: boolean
  created_at: string
  veiculo_placa?: string
  veiculo_modelo?: string
  operador_email?: string
}

export interface ChecklistCreate {
  veiculo_id: string
  operador_id: string
  data_checklist: string
  itens: ChecklistItem[]
  observacoes?: string
}

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'freios', nome: 'Sistema de Freios', status: 'na' },
  { id: 'pneus', nome: 'Condição dos Pneus', status: 'na' },
  { id: 'luzes', nome: 'Sistema de Iluminação', status: 'na' },
  { id: 'oleo', nome: 'Nível de Óleo', status: 'na' },
  { id: 'agua', nome: 'Nível de Água', status: 'na' },
  { id: 'combustivel', nome: 'Nível de Combustível', status: 'na' },
  { id: 'limpeza', nome: 'Limpeza Geral', status: 'na' },
  { id: 'documentos', nome: 'Documentação', status: 'na' },
  { id: 'extintor', nome: 'Extintor de Incêndio', status: 'na' },
  { id: 'triangulo', nome: 'Triângulo de Sinalização', status: 'na' }
]

export async function getChecklists(): Promise<Checklist[]> {
  try {
    const checklists = await query(`
      SELECT 
        c.*,
        v.placa as veiculo_placa,
        v.modelo as veiculo_modelo,
        u.email as operador_email
      FROM checklists c
      JOIN veiculos v ON c.veiculo_id = v.id
      JOIN usuarios u ON c.operador_id = u.id
      ORDER BY c.data_checklist DESC
    `)

    return checklists.map(checklist => ({
      ...checklist,
      operador: {
        nome: checklist.operador_email || 'Usuário não encontrado'
      }
    }))
  } catch (error) {
    console.error('Error fetching checklists:', error)
    throw error
  }
}

export async function getChecklist(id: string): Promise<Checklist | null> {
  const checklist = await queryOne(`
    SELECT 
      c.*,
      v.placa as veiculo_placa,
      v.modelo as veiculo_modelo,
      u.email as operador_email
    FROM checklists c
    JOIN veiculos v ON c.veiculo_id = v.id
    JOIN usuarios u ON c.operador_id = u.id
    WHERE c.id = $1
  `, [id])

  if (!checklist) return null

  return {
    ...checklist,
    operador: {
      nome: checklist.operador_email || 'Usuário não encontrado'
    }
  }
}

export async function createChecklist(checklist: ChecklistCreate): Promise<Checklist> {
  try {
    // Validate input
    if (!checklist.veiculo_id || !checklist.operador_id || !checklist.itens) {
      throw new Error('Dados do checklist inválidos')
    }

    // Create the checklist
    const result = await queryOne(`
      INSERT INTO checklists (
        veiculo_id,
        operador_id,
        data_checklist,
        itens,
        observacoes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      checklist.veiculo_id,
      checklist.operador_id,
      checklist.data_checklist,
      JSON.stringify(checklist.itens),
      checklist.observacoes
    ])

    if (!result) {
      throw new Error('Checklist não foi criado')
    }

    return result
  } catch (error) {
    console.error('Error in createChecklist:', error)
    throw error
  }
}

export async function deleteChecklist(id: string): Promise<boolean> {
  try {
    await query('DELETE FROM checklists WHERE id = $1', [id])
    return true
  } catch (error) {
    console.error('Error in deleteChecklist:', error)
    throw error
  }
}

export async function uploadChecklistPhoto(checklistId: string, tipo: string, file: File): Promise<string> {
  try {
    // Convert File to base64 string
    const base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const result = await queryOne(`
      INSERT INTO checklist_fotos (
        checklist_id,
        tipo,
        url
      ) VALUES ($1, $2, $3)
      RETURNING url
    `, [checklistId, tipo, base64String])

    if (!result?.url) {
      throw new Error('Failed to save photo')
    }

    return result.url
  } catch (error) {
    console.error(`Error saving photo ${tipo}:`, error)
    throw error
  }
}

export async function getChecklistPhotos(checklistId: string): Promise<any[]> {
  try {
    return await query(`
      SELECT *
      FROM checklist_fotos
      WHERE checklist_id = $1
      ORDER BY created_at
    `, [checklistId])
  } catch (error) {
    console.error('Error fetching checklist photos:', error)
    throw error
  }
}

export function getDefaultChecklistItems(): ChecklistItem[] {
  return DEFAULT_CHECKLIST_ITEMS.map(item => ({ ...item }))
}

export function parseChecklistItems(itens: string | null): ChecklistItem[] {
  if (!itens) return []
  try {
    const parsed = typeof itens === 'string' ? JSON.parse(itens) : itens
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Error parsing checklist items:', error)
    return []
  }
}