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
    console.log('🔍 Buscando usuários via endpoint dedicado...')
    
    const response = await fetch('/api/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    const users = await response.json();
    console.log('✅ Usuários carregados via endpoint dedicado:', users.length);
    
    return users;
    
  } catch (error: any) {
    console.error('❌ Erro ao buscar usuários via endpoint dedicado:', error);
    
    // Fallback para método antigo
    try {
      console.log('🔄 Tentando método de fallback...');
      
      const result = await query(`
        SELECT 
          id,
          email,
          nome,
          tipo,
          database_config_id,
          cracha_image_url,
          ativo,
          created_at,
          updated_at
        FROM usuarios
        ORDER BY created_at DESC
      `, [], true);
      
      console.log('✅ Fallback funcionou, usuários encontrados:', result.length);
      
      return result.map(user => ({
        ...user,
        database_config_nome: null // Simplificado para evitar erros
      }));
      
    } catch (fallbackError: any) {
      console.error('❌ Erro no fallback:', fallbackError);
      throw new Error(`Erro ao buscar usuários: ${fallbackError.message}`);
    }
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
    console.log('🔄 Atualizando usuário via API:', id);
    console.log('📝 Dados para atualização:', userData);
    
    // If there's a badge image, upload it first
    if (crachaImage) {
      console.log('📷 Fazendo upload da imagem do crachá...');
      const user = await queryOne('SELECT nome FROM usuarios WHERE id = $1', [id], true)
      if (user) {
        const imageUrl = await uploadCrachaImage(id, user.nome, crachaImage)
        userData.cracha_image_url = imageUrl;
        console.log('✅ Imagem do crachá enviada:', imageUrl);
      }
    }
    
    // Use dedicated endpoint for user updates
    const response = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      console.error('❌ Erro na resposta da API:', errorData);
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Usuário atualizado com sucesso via API:', result.user);
    
    return result.user;
  } catch (error: any) {
    console.error('❌ Error in updateUser:', error);
    
    // Re-throw com mensagem mais clara
    if (error.message.includes('Email já cadastrado')) {
      throw new Error('Email já cadastrado');
    }
    
    throw new Error(error.message || 'Erro ao atualizar usuário');
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