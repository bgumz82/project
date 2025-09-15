import { query } from '@/lib/db'
import { signUp } from '@/lib/auth'

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
      
      // Buscar usuários e configurações de banco separadamente
      const [users, configs] = await Promise.all([
        query(`
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
        `, [], true),
        query(`
          SELECT id, nome_empresa
          FROM database_configurations
          WHERE ativo = true
        `, [], true)
      ]);
      
      console.log('✅ Fallback funcionou, usuários encontrados:', users.length);
      
      // Mapear usuários com nomes das configurações
      return users.map(user => {
        const config = configs.find(c => c.id === user.database_config_id);
        return {
          ...user,
          database_config_nome: config?.nome_empresa || null
        };
      });
      
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
    
    let updatedUser = user;
    
    // Se há imagem do crachá, fazer upload separadamente
    if (crachaImage && user.id) {
      console.log('🖼️ Fazendo upload da imagem do crachá para novo usuário...');
      
      const formData = new FormData();
      formData.append('crachaImage', crachaImage);
      
      const uploadResponse = await fetch(`/api/users/${user.id}/upload-cracha`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json().catch(() => ({ error: 'Erro no upload' }));
        console.error('❌ Erro no upload da imagem:', uploadError);
        // Não vamos falhar a criação do usuário por causa do upload
        console.warn('⚠️ Usuário criado, mas erro no upload da imagem');
      } else {
        const uploadResult = await uploadResponse.json();
        console.log('✅ Imagem do crachá enviada com sucesso:', uploadResult.cracha_image_url);
        
        // Atualizar o objeto do usuário com a nova URL da imagem
        updatedUser.cracha_image_url = uploadResult.cracha_image_url;
      }
    }
    
    return updatedUser;
  } catch (error) {
    console.error('Error in createUser:', error)
    throw error
  }
}

export async function updateUser(id: string, userData: Partial<User>, crachaImage?: File) {
  try {
    console.log('🔄 Atualizando usuário via API:', id);
    console.log('📝 Dados para atualização:', userData);
    
    // Primeiro, atualizar os dados do usuário
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
    
    let updatedUser = result.user;
    
    // Se há imagem do crachá, fazer upload separadamente
    if (crachaImage) {
      console.log('🖼️ Fazendo upload da imagem do crachá...');
      
      const formData = new FormData();
      formData.append('crachaImage', crachaImage);
      
      const uploadResponse = await fetch(`/api/users/${id}/upload-cracha`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json().catch(() => ({ error: 'Erro no upload' }));
        console.error('❌ Erro no upload da imagem:', uploadError);
        throw new Error(uploadError.error || 'Erro ao fazer upload da imagem');
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ Imagem do crachá enviada com sucesso:', uploadResult.cracha_image_url);
      
      // Atualizar o objeto do usuário com a nova URL da imagem
      updatedUser.cracha_image_url = uploadResult.cracha_image_url;
    }
    
    return updatedUser;
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

// TODO: Implementar upload de imagem futuramente quando necessário
// async function uploadCrachaImage(userId: string, userName: string, image: File) { ... }