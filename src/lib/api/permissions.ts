import { query, queryOne } from '@/lib/db'

export interface UserPermission {
  id: string
  user_id: string
  module: string
  can_access: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  created_at: string
  updated_at: string
  user_name?: string
  user_email?: string
  user_missing?: boolean
}

export interface ModulePermission {
  module: string
  can_access: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export interface UserPermissionUpdate {
  user_id: string
  module: string
  can_access?: boolean
  can_create?: boolean
  can_edit?: boolean
  can_delete?: boolean
}

// Módulos disponíveis no sistema
export const AVAILABLE_MODULES = [
  { key: 'dashboard', name: 'Dashboard', description: 'Página inicial com estatísticas' },
  { key: 'veiculos', name: 'Veículos', description: 'Gerenciamento da frota de veículos' },
  { key: 'associacoes_frota', name: 'Associações de Frota', description: 'Associação de motoristas com veículos' },
  { key: 'abastecimentos', name: 'Abastecimentos', description: 'Registro de abastecimentos' },
  { key: 'cadastros', name: 'Cadastros', description: 'Cadastro de clientes, fornecedores e postos' },
  { key: 'antt', name: 'Registros ANTT', description: 'Registros ANTT dos veículos' },
  { key: 'manutencoes', name: 'Manutenções', description: 'Controle de manutenções' },
  { key: 'checklists', name: 'Checklists', description: 'Checklists de inspeção' },
  { key: 'funcionarios', name: 'Funcionários', description: 'Cadastro de funcionários' },
  { key: 'usuarios', name: 'Usuários', description: 'Gerenciamento de usuários do sistema' },
  { key: 'permissoes', name: 'Permissões', description: 'Controle de permissões de usuários' },
  { key: 'configuracoes_banco', name: 'Config. Banco', description: 'Configurações de banco de dados' },
  { key: 'financeiro', name: 'Financeiro', description: 'Módulo financeiro completo' },
  { key: 'fiscal', name: 'Fiscal', description: 'Módulo fiscal completo' },
  { key: 'empresas_fiscais', name: 'Empresas Fiscais', description: 'Cadastro de empresas para documentos fiscais' },
  { key: 'cte', name: 'CT-e', description: 'Conhecimento de Transporte Eletrônico' },
  { key: 'mdfe', name: 'MDF-e', description: 'Manifesto Eletrônico de Documentos Fiscais' },
  { key: 'relatorios', name: 'Relatórios', description: 'Relatórios e exportações' }
] as const

export type ModuleKey = typeof AVAILABLE_MODULES[number]['key']

// Obter permissões de um usuário
export async function getUserPermissions(userId: string): Promise<ModulePermission[]> {
  try {
    const permissions = await query(`
      SELECT module, can_access, can_create, can_edit, can_delete
      FROM user_permissions
      WHERE user_id = $1
      ORDER BY module
    `, [userId], true) // Usar banco principal

    return permissions
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    throw error
  }
}

// Obter permissões de todos os usuários (para admin)
export async function getAllUserPermissions(): Promise<(UserPermission & { user_name: string, user_email: string })[]> {
  try {
    const permissions = await query(`
      SELECT 
        up.*,
        COALESCE(u.nome, 'Usuário não encontrado') as user_name,
        COALESCE(u.email, 'Email não encontrado') as user_email,
        CASE WHEN u.id IS NULL THEN true ELSE false END as user_missing
      FROM user_permissions up
      LEFT JOIN usuarios u ON up.user_id = u.id
      ORDER BY u.nome, up.module
    `, [], true) // Usar banco principal

    return permissions
  } catch (error) {
    console.error('Error fetching all user permissions:', error)
    throw error
  }
}

// Atualizar permissão específica
export async function updateUserPermission(data: UserPermissionUpdate): Promise<UserPermission> {
  try {
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.can_access !== undefined) {
      updates.push(`can_access = $${paramIndex}`)
      values.push(data.can_access)
      paramIndex++
    }

    if (data.can_create !== undefined) {
      updates.push(`can_create = $${paramIndex}`)
      values.push(data.can_create)
      paramIndex++
    }

    if (data.can_edit !== undefined) {
      updates.push(`can_edit = $${paramIndex}`)
      values.push(data.can_edit)
      paramIndex++
    }

    if (data.can_delete !== undefined) {
      updates.push(`can_delete = $${paramIndex}`)
      values.push(data.can_delete)
      paramIndex++
    }

    if (updates.length === 0) {
      throw new Error('Nenhuma permissão para atualizar')
    }

    updates.push(`updated_at = NOW()`)
    values.push(data.user_id, data.module)

    const result = await queryOne(`
      UPDATE user_permissions
      SET ${updates.join(', ')}
      WHERE user_id = $${paramIndex} AND module = $${paramIndex + 1}
      RETURNING *
    `, values, true) // Usar banco principal

    if (!result) {
      throw new Error('Permissão não encontrada')
    }

    return result
  } catch (error) {
    console.error('Error updating user permission:', error)
    throw error
  }
}

// Verificar se usuário tem permissão para um módulo
export async function checkUserPermission(
  userId: string, 
  module: ModuleKey, 
  action: 'access' | 'create' | 'edit' | 'delete' = 'access'
): Promise<boolean> {
  try {
    const columnMap = {
      access: 'can_access',
      create: 'can_create',
      edit: 'can_edit',
      delete: 'can_delete'
    }

    const result = await queryOne(`
      SELECT ${columnMap[action]} as has_permission
      FROM user_permissions
      WHERE user_id = $1 AND module = $2
    `, [userId, module], true) // Usar banco principal

    return result?.has_permission || false
  } catch (error) {
    console.error('Error checking user permission:', error)
    return false
  }
}

// Criar permissões padrão para um usuário
export async function createDefaultPermissions(userId: string, userType: string): Promise<void> {
  try {
    await query(`
      SELECT create_default_permissions($1, $2)
    `, [userId, userType], true) // Usar banco principal
  } catch (error) {
    console.error('Error creating default permissions:', error)
    throw error
  }
}

// Obter permissões de um usuário por módulo (para uso no frontend)
export async function getUserModulePermissions(userId: string): Promise<Record<ModuleKey, ModulePermission>> {
  try {
    const permissions = await getUserPermissions(userId) // Já usa banco principal
    
    const modulePermissions: Record<string, ModulePermission> = {}
    
    permissions.forEach(permission => {
      modulePermissions[permission.module] = permission
    })

    return modulePermissions as Record<ModuleKey, ModulePermission>
  } catch (error) {
    console.error('Error getting user module permissions:', error)
    throw error
  }
}