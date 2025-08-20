import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { query } from '@/lib/db'

export type ModuleKey = 'dashboard' | 'veiculos' | 'antt' | 'associacoes_frota' | 'abastecimentos' | 'cadastros' | 'manutencoes' | 'checklists' | 'funcionarios' | 'usuarios' | 'permissoes' | 'configuracoes_banco' | 'financeiro' | 'fiscal' | 'empresas_fiscais' | 'cte' | 'mdfe' | 'frete' | 'relatorios'

export interface ModulePermission {
  module: string
  can_access: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

async function getUserModulePermissions(userId: string): Promise<Record<ModuleKey, ModulePermission>> {
  try {
    const permissions = await query(`
      SELECT module, can_access, can_create, can_edit, can_delete
      FROM user_permissions
      WHERE user_id = $1
      ORDER BY module
    `, [userId])

    const modulePermissions: Record<string, ModulePermission> = {}
    
    permissions.forEach((permission: any) => {
      modulePermissions[permission.module] = permission
    })

    return modulePermissions as Record<ModuleKey, ModulePermission>
  } catch (error) {
    console.error('Error getting user module permissions:', error)
    throw error
  }
}

interface PermissionsContextType {
  permissions: Record<ModuleKey, ModulePermission> | null
  loading: boolean
  hasPermission: (module: ModuleKey, action?: 'access' | 'create' | 'edit' | 'delete') => boolean
  refreshPermissions: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<Record<ModuleKey, ModulePermission> | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const loadPermissions = async () => {
    console.log('🔐 Carregando permissões para usuário:', user?.id)
    
    if (!user?.id) {
      console.log('❌ Usuário não encontrado, limpando permissões')
      setPermissions(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('📡 Buscando permissões do usuário:', user.id)
      const userPermissions = await getUserModulePermissions(user.id)
      console.log('✅ Permissões carregadas:', userPermissions)
      setPermissions(userPermissions)
    } catch (error) {
      console.error('❌ Erro ao carregar permissões:', error)
      setPermissions(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPermissions()
  }, [user?.id])

  const hasPermission = (module: ModuleKey, action: 'access' | 'create' | 'edit' | 'delete' = 'access'): boolean => {
    if (!permissions || !permissions[module]) {
      return false
    }

    const modulePermission = permissions[module]
    
    switch (action) {
      case 'access':
        return modulePermission.can_access
      case 'create':
        return modulePermission.can_create
      case 'edit':
        return modulePermission.can_edit
      case 'delete':
        return modulePermission.can_delete
      default:
        return false
    }
  }

  const refreshPermissions = async () => {
    await loadPermissions()
  }

  const value = {
    permissions,
    loading,
    hasPermission,
    refreshPermissions
  }

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return context
}