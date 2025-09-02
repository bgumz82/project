import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react'
// Original code used this import: import { getUserModulePermissions } from '../lib/api/permissions'
// The changes snippet uses the original query function, so we revert to that.
import { query } from '@/lib/db'
import { useAuth } from './AuthContext'

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
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  const loadPermissions = useCallback(async () => {
    if (isLoadingPermissions) {
      console.log('⏳ Carregamento de permissões já em andamento, ignorando...')
      return
    }

    console.log('🔐 Carregando permissões para usuário:', user?.id)

    if (!user?.id) {
      console.log('❌ Usuário não encontrado, limpando permissões')
      setPermissions(null)
      setLoading(false)
      setIsLoadingPermissions(false)
      return
    }

    try {
      setIsLoadingPermissions(true)
      setLoading(true)
      console.log('📡 Buscando permissões do usuário:', user.id)
      const userPermissions = await getUserModulePermissions(user.id)

      console.log('✅ Permissões carregadas:', userPermissions)
      setPermissions(userPermissions)
    } catch (error) {
      console.error('Error loading permissions:', error)
      setPermissions(null)
    } finally {
      setLoading(false)
      setIsLoadingPermissions(false)
    }
  }, [user?.id, isLoadingPermissions])

  useEffect(() => {
    if (!user?.id) {
      setPermissions(null)
      setLoading(false)
      setIsLoadingPermissions(false)
      return
    }

    if (isLoadingPermissions) {
      return
    }

    const timeoutId = setTimeout(async () => {
      if (!isLoadingPermissions) {
        await loadPermissions()
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [user?.id])

  const hasPermission = useCallback((module: ModuleKey, action: 'access' | 'create' | 'edit' | 'delete' = 'access'): boolean => {
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
  }, [permissions])

  const value = useMemo(() => ({
    permissions,
    loading,
    hasPermission,
    loadPermissions
  }), [permissions, loading, hasPermission, loadPermissions])

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