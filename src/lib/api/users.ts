import { query, queryOne } from '@/lib/db'
import { signUp } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

export interface User {
  id: string
  email: string
  nome: string
  tipo: 'admin' | 'operador_abastecimento' | 'operador_checklist'
  database_config_id: string | null
  database_config_nome?: string
  cracha_image_url?: string
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
        u.cracha_image_url,
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
}, crachaImage?: File) {
  try {
    // Create user through the backend API - this handles both auth and usuarios table
    const user = await signUp(userData.email, userData.password, userData.nome, userData.tipo)
    
    // If there's a badge image, upload it
    if (crachaImage && user.id) {
      await uploadCrachaImage(user.id, userData.nome, crachaImage)
    }
    
    return user
  } catch (error) {
    console.error('Error in createUser:', error)
    throw error
  }
}

export async function updateUser(id: string, userData: Partial<User>, crachaImage?: File) {
  try {
    // If there's a badge image, upload it first
    if (crachaImage) {
      const user = await queryOne('SELECT nome FROM usuarios WHERE id = $1', [id], true)
      if (user) {
        await uploadCrachaImage(id, user.nome, crachaImage)
      }
    }
    
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

async function uploadCrachaImage(userId: string, userName: string, image: File) {
  try {
    // Create uploads/cracha directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'cracha')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Generate filename based on user name (sanitized)
    const sanitizedName = userName.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
    
    const fileExtension = path.extname(image.name) || '.jpg'
    const fileName = `${sanitizedName}_${Date.now()}${fileExtension}`
    const filePath = path.join(uploadDir, fileName)
    
    // Save file to disk
    const buffer = Buffer.from(await image.arrayBuffer())
    fs.writeFileSync(filePath, buffer)
    
    // Update user record with image URL
    const imageUrl = `/uploads/cracha/${fileName}`
    await queryOne(
      'UPDATE usuarios SET cracha_image_url = $1, updated_at = NOW() WHERE id = $2',
      [imageUrl, userId],
      true
    )
    
    console.log(`✅ Badge image uploaded for user ${userName}: ${imageUrl}`)
    return imageUrl
  } catch (error) {
    console.error('Error uploading badge image:', error)
    throw new Error('Erro ao fazer upload da imagem do crachá')
  }
}