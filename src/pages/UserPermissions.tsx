import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import axios from 'axios'
import {
  UserGroupIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { 
  getAllUserPermissions, 
  updateUserPermission, 
  AVAILABLE_MODULES,
  type UserPermissionUpdate 
} from '@/lib/api/permissions'
import { getUsers } from '@/lib/api/users'

export default function UserPermissions() {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const queryClient = useQueryClient()

  const { 
    data: permissions, 
    isLoading: isLoadingPermissions,
    refetch: refetchPermissions,
    isRefetching
  } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: getAllUserPermissions,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    refetchOnWindowFocus: true
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  })

  useEffect(() => {
    refetchPermissions()
  }, [refetchPermissions])

  const updatePermissionMutation = useMutation({
    mutationFn: updateUserPermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] })
      toast.success('Permissão atualizada com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error updating permission:', error)
      toast.error(error.message || 'Erro ao atualizar permissão')
    }
  })

  const cleanupPermissionsMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await axios.delete(`/api/user-permissions/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
        }
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] })
      toast.success('Permissões órfãs removidas com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error cleaning up permissions:', error)
      toast.error('Erro ao remover permissões órfãs')
    }
  })
  const handlePermissionChange = (
    userId: string, 
    module: string, 
    action: 'can_access' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    const updateData: UserPermissionUpdate = {
      user_id: userId,
      module,
      [action]: value
    }

    updatePermissionMutation.mutate(updateData)
  }

  const handleCleanupOrphanedPermissions = async (userId: string) => {
    if (window.confirm('Tem certeza que deseja remover todas as permissões deste usuário órfão? Esta ação não pode ser desfeita.')) {
      cleanupPermissionsMutation.mutate(userId)
    }
  }
  const filteredPermissions = selectedUserId 
    ? permissions?.filter(p => p.user_id === selectedUserId)
    : permissions

  const groupedPermissions = filteredPermissions?.reduce((acc, permission) => {
    const key = `${permission.user_id}-${permission.user_name || 'unknown'}`
    if (!acc[key]) {
      acc[key] = {
        user_id: permission.user_id,
        user_name: permission.user_name,
        user_email: permission.user_email,
        user_missing: permission.user_missing || false,
        permissions: []
      }
    }
    acc[key].permissions.push(permission)
    return acc
  }, {} as Record<string, {
    user_id: string
    user_name: string
    user_email: string
    user_missing: boolean
    permissions: any[]
  }>)

  if (isLoadingPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-2xl font-semibold text-gray-900">Permissões de Usuários</h1>
          </div>
          <button
            onClick={() => refetchPermissions()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isRefetching}
          >
            <ArrowPathIcon className={`-ml-0.5 mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>

        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700">
              Filtrar por usuário
            </label>
            <select
              id="user-filter"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Todos os usuários</option>
              {users?.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.nome} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-8">
            {Object.values(groupedPermissions || {}).map((userGroup) => (
              <div key={userGroup.user_id} className={`border rounded-lg p-6 ${
                userGroup.user_missing 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-200'
              }`}>
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-medium ${
                        userGroup.user_missing ? 'text-red-900' : 'text-gray-900'
                      }`}>
                        {userGroup.user_name}
                        {userGroup.user_missing && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Usuário não encontrado
                          </span>
                        )}
                      </h3>
                      <p className={`text-sm ${
                        userGroup.user_missing ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {userGroup.user_email}
                      </p>
                    </div>
                    {userGroup.user_missing && (
                      <button
                        onClick={() => handleCleanupOrphanedPermissions(userGroup.user_id)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        Remover Permissões
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Módulo
                        </th>
                        <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                          Acessar
                        </th>
                        <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                          Criar
                        </th>
                        <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                          Editar
                        </th>
                        <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                          Excluir
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {AVAILABLE_MODULES.map((module) => {
                        const permission = userGroup.permissions.find(p => p.module === module.key)
                        
                        return (
                          <tr key={module.key}>
                            <td className="px-3 py-4 text-sm">
                              <div>
                                <div className="font-medium text-gray-900">{module.name}</div>
                                <div className="text-gray-500 text-xs">{module.description}</div>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-center">
                              <button
                                onClick={() => handlePermissionChange(
                                  userGroup.user_id, 
                                  module.key, 
                                  'can_access', 
                                  !permission?.can_access
                                )}
                                className={`inline-flex items-center p-1 rounded-full ${
                                  permission?.can_access 
                                    ? 'text-green-600 bg-green-100 hover:bg-green-200' 
                                    : 'text-red-600 bg-red-100 hover:bg-red-200'
                                }`}
                              >
                                {permission?.can_access ? (
                                  <CheckIcon className="h-4 w-4" />
                                ) : (
                                  <XMarkIcon className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                            <td className="px-3 py-4 text-center">
                              <button
                                onClick={() => handlePermissionChange(
                                  userGroup.user_id, 
                                  module.key, 
                                  'can_create', 
                                  !permission?.can_create
                                )}
                                className={`inline-flex items-center p-1 rounded-full ${
                                  permission?.can_create 
                                    ? 'text-green-600 bg-green-100 hover:bg-green-200' 
                                    : 'text-red-600 bg-red-100 hover:bg-red-200'
                                }`}
                                disabled={!permission?.can_access}
                              >
                                {permission?.can_create ? (
                                  <CheckIcon className="h-4 w-4" />
                                ) : (
                                  <XMarkIcon className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                            <td className="px-3 py-4 text-center">
                              <button
                                onClick={() => handlePermissionChange(
                                  userGroup.user_id, 
                                  module.key, 
                                  'can_edit', 
                                  !permission?.can_edit
                                )}
                                className={`inline-flex items-center p-1 rounded-full ${
                                  permission?.can_edit 
                                    ? 'text-green-600 bg-green-100 hover:bg-green-200' 
                                    : 'text-red-600 bg-red-100 hover:bg-red-200'
                                }`}
                                disabled={!permission?.can_access}
                              >
                                {permission?.can_edit ? (
                                  <CheckIcon className="h-4 w-4" />
                                ) : (
                                  <XMarkIcon className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                            <td className="px-3 py-4 text-center">
                              <button
                                onClick={() => handlePermissionChange(
                                  userGroup.user_id, 
                                  module.key, 
                                  'can_delete', 
                                  !permission?.can_delete
                                )}
                                className={`inline-flex items-center p-1 rounded-full ${
                                  permission?.can_delete 
                                    ? 'text-green-600 bg-green-100 hover:bg-green-200' 
                                    : 'text-red-600 bg-red-100 hover:bg-red-200'
                                }`}
                                disabled={!permission?.can_access}
                              >
                                {permission?.can_delete ? (
                                  <CheckIcon className="h-4 w-4" />
                                ) : (
                                  <XMarkIcon className="h-4 w-4" />
                                )}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {(!groupedPermissions || Object.keys(groupedPermissions).length === 0) && (
            <div className="text-center py-12 text-gray-500">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">Nenhuma permissão encontrada.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}