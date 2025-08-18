import { query, queryOne } from '@/lib/db'
import { signUp } from '@/lib/auth'

export interface User {
  id: string
  email: string
  nome: string
  tipo: 'admin' | 'operador_abastecimento' | 'operador_checklist'
  database_config_id: string | null
  database_config_nome?: string
  ativo: boolean
  created_at: string
  updated_at: string
}

export async function getUsers() {
  try {
    console.log('🔍 Buscando usuários...')
    
    const result = await query(`
      SELECT 
        u.id,
        u.email,
        u.nome,
        u.tipo,
        u.database_config_id,
        u.ativo,
        u.created_at,
        u.updated_at,
        dc.nome_empresa as database_config_nome
      FROM usuarios u
      LEFT JOIN database_configurations dc ON u.database_config_id = dc.id
      ORDER BY u.created_at DESC
    `, [], true) // Usar banco principal
    
    console.log('✅ Usuários encontrados:', result.length)
    return result
    
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error)
    throw error
  }
}

export async function createUser(userData: { 
  email: string;
  password: string;
  nome: string;
  tipo: 'admin' | 'operador_abastecimento' | 'operador_checklist';
  database_config_id?: string | null;
}) {
  try {
    // Create user through the backend API - this handles both auth and usuarios table
    const user = await signUp(userData.email, userData.password, userData.nome, userData.tipo)
    
    return user
  } catch (error) {
    console.error('Error in createUser:', error)
    throw error
  }
}

export async function updateUser(id: string, userData: Partial<User>) {
  try {
    const fields = Object.keys(userData)
    const values = Object.values(userData)
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ')
    
    const result = await queryOne(
      `UPDATE usuarios 
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, ...values],
      true // Usar banco principal
    )

    return result
  } catch (error) {
    console.error('Error in updateUser:', error)
    throw error
  }
}

export async function deleteUser(id: string) {
  try {
    await query(`
      DELETE FROM usuarios WHERE id = $1
    `, [id], true) // Usar banco principal
  } catch (error: any) {
    console.error('Error in deleteUser:', error)
    throw error
  }
}