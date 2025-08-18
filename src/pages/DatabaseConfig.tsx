import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ServerIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  LinkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { 
  getDatabaseConfigurations, 
  createDatabaseConfiguration, 
  updateDatabaseConfiguration, 
  deleteDatabaseConfiguration,
  testDatabaseConnection,
  getUsersWithoutDatabaseConfig,
  assignDatabaseConfigToUser,
  type DatabaseConfiguration,
  type DatabaseConfigurationCreate
} from '@/lib/api/database-config'

export default function DatabaseConfig() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<DatabaseConfiguration | null>(null)
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({})
  const [testingConnection, setTestingConnection] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: configurations, isLoading } = useQuery({
    queryKey: ['database-configurations'],
    queryFn: getDatabaseConfigurations,
    retry: 3,
    staleTime: 1000 * 60 * 5
  })

  const { data: usersWithoutConfig } = useQuery({
    queryKey: ['users-without-database-config'],
    queryFn: getUsersWithoutDatabaseConfig,
    retry: 3,
    staleTime: 1000 * 60 * 2
  })

  const createMutation = useMutation({
    mutationFn: createDatabaseConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database-configurations'] })
      queryClient.invalidateQueries({ queryKey: ['users-without-database-config'] })
      toast.success('Configuração de banco criada com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error creating database config:', error)
      toast.error(error.message || 'Erro ao criar configuração de banco')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DatabaseConfigurationCreate }) =>
      updateDatabaseConfiguration(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database-configurations'] })
      toast.success('Configuração de banco atualizada com sucesso!')
      setIsModalOpen(false)
      resetForm()
    },
    onError: (error: any) => {
      console.error('Error updating database config:', error)
      toast.error(error.message || 'Erro ao atualizar configuração de banco')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDatabaseConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database-configurations'] })
      queryClient.invalidateQueries({ queryKey: ['users-without-database-config'] })
      toast.success('Configuração de banco excluída com sucesso!')
    },
    onError: (error: any) => {
      console.error('Error deleting database config:', error)
      toast.error(error.message || 'Erro ao excluir configuração de banco')
    }
  })

  const assignMutation = useMutation({
    mutationFn: ({ userId, configId }: { userId: string; configId: string }) =>
      assignDatabaseConfigToUser(userId, configId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-without-database-config'] })
      toast.success('Usuário vinculado à configuração com sucesso!')
      setIsAssignModalOpen(false)
    },
    onError: (error: any) => {
      console.error('Error assigning database config:', error)
      toast.error(error.message || 'Erro ao vincular usuário')
    }
  })

  const resetForm = () => {
    setSelectedConfig(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const configData: DatabaseConfigurationCreate = {
      nome_empresa: formData.get('nome_empresa') as string,
      codigo_empresa: formData.get('codigo_empresa') as string,
      host: formData.get('host') as string,
      port: parseInt(formData.get('port') as string),
      database_name: formData.get('database_name') as string,
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      ssl_enabled: formData.get('ssl_enabled') === 'true',
      max_connections: parseInt(formData.get('max_connections') as string) || 10,
      timeout_seconds: parseInt(formData.get('timeout_seconds') as string) || 30,
      ativo: formData.get('ativo') === 'true'
    }

    if (selectedConfig) {
      updateMutation.mutate({ id: selectedConfig.id, data: configData })
    } else {
      createMutation.mutate(configData)
    }
  }

  const handleEdit = (config: DatabaseConfiguration) => {
    setSelectedConfig(config)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta configuração de banco? Esta ação não pode ser desfeita.')) {
      deleteMutation.mutate(id)
    }
  }

  const handleTestConnection = async (config: DatabaseConfiguration) => {
    setTestingConnection(config.id)
    try {
      const success = await testDatabaseConnection({
        nome_empresa: config.nome_empresa,
        codigo_empresa: config.codigo_empresa,
        host: config.host,
        port: config.port,
        database_name: config.database_name,
        username: config.username,
        password: config.password,
        ssl_enabled: config.ssl_enabled,
        max_connections: config.max_connections,
        timeout_seconds: config.timeout_seconds,
        ativo: config.ativo
      })
      
      if (success) {
        toast.success('Conexão testada e estrutura verificada com sucesso!')
      } else {
        toast.error('Falha ao testar conexão')
      }
    } catch (error: any) {
      console.error('Erro ao testar conexão:', error)
      toast.error(error.message || 'Erro ao testar conexão com o banco de dados')
    } finally {
      setTestingConnection(null)
    }
  }

  const togglePasswordVisibility = (configId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [configId]: !prev[configId]
    }))
  }

  const handleAssignConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    assignMutation.mutate({
      userId: formData.get('user_id') as string,
      configId: formData.get('config_id') as string
    })
  }

  if (isLoading) {
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
            <ServerIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <h1 className="text-2xl font-semibold text-gray-900">Configurações de Banco de Dados</h1>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <LinkIcon className="-ml-1 mr-2 h-5 w-5" />
              Vincular Usuários
            </button>
            <button
              onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Nova Configuração
            </button>
          </div>
        </div>

        {/* Alerta para usuários sem configuração */}
        {usersWithoutConfig && usersWithoutConfig.length > 0 && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Usuários sem configuração de banco
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    {usersWithoutConfig.length} usuário(s) não têm configuração de banco vinculada.
                    <button
                      onClick={() => setIsAssignModalOpen(true)}
                      className="ml-2 font-medium underline hover:text-yellow-600"
                    >
                      Vincular agora
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Empresa
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Código
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Servidor
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Banco
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Usuário
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Senha
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {configurations?.map((config) => (
                      <tr key={config.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900">{config.nome_empresa}</div>
                            <div className="text-gray-500 text-xs">
                              {config.max_connections} conexões • {config.timeout_seconds}s timeout
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-mono">
                          {config.codigo_empresa}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div>
                            <div>{config.host}:{config.port}</div>
                            <div className="text-xs">
                              {config.ssl_enabled ? (
                                <span className="text-green-600">SSL Habilitado</span>
                              ) : (
                                <span className="text-red-600">SSL Desabilitado</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono">
                          {config.database_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono">
                          {config.username}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono">
                              {showPassword[config.id] ? config.password : '••••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(config.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {showPassword[config.id] ? (
                                <EyeSlashIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            config.ativo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {config.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleTestConnection(config)}
                            disabled={testingConnection === config.id}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                            title="Testar conexão"
                          >
                            {testingConnection === config.id ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                            ) : (
                              <CheckCircleIcon className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(config)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">
                {selectedConfig ? 'Editar Configuração de Banco' : 'Nova Configuração de Banco'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Informações da Empresa */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Informações da Empresa</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="nome_empresa" className="block text-sm font-medium text-gray-700">
                        Nome da Empresa *
                      </label>
                      <input
                        type="text"
                        name="nome_empresa"
                        id="nome_empresa"
                        defaultValue={selectedConfig?.nome_empresa}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="codigo_empresa" className="block text-sm font-medium text-gray-700">
                        Código da Empresa *
                      </label>
                      <input
                        type="text"
                        name="codigo_empresa"
                        id="codigo_empresa"
                        defaultValue={selectedConfig?.codigo_empresa}
                        required
                        placeholder="EX: EMPRESA_001"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Configurações de Conexão */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações de Conexão</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="host" className="block text-sm font-medium text-gray-700">
                        Host *
                      </label>
                      <input
                        type="text"
                        name="host"
                        id="host"
                        defaultValue={selectedConfig?.host}
                        required
                        placeholder="localhost ou IP do servidor"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="port" className="block text-sm font-medium text-gray-700">
                        Porta *
                      </label>
                      <input
                        type="number"
                        name="port"
                        id="port"
                        defaultValue={selectedConfig?.port || 5432}
                        required
                        min="1"
                        max="65535"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="database_name" className="block text-sm font-medium text-gray-700">
                        Nome do Banco *
                      </label>
                      <input
                        type="text"
                        name="database_name"
                        id="database_name"
                        defaultValue={selectedConfig?.database_name}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Usuário *
                      </label>
                      <input
                        type="text"
                        name="username"
                        id="username"
                        defaultValue={selectedConfig?.username}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Senha *
                      </label>
                      <input
                        type="password"
                        name="password"
                        id="password"
                        defaultValue={selectedConfig?.password}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="ssl_enabled" className="block text-sm font-medium text-gray-700">
                        SSL
                      </label>
                      <select
                        name="ssl_enabled"
                        id="ssl_enabled"
                        defaultValue={selectedConfig?.ssl_enabled === false ? 'false' : 'true'}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="true">Habilitado</option>
                        <option value="false">Desabilitado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Configurações Avançadas */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações Avançadas</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label htmlFor="max_connections" className="block text-sm font-medium text-gray-700">
                        Máx. Conexões
                      </label>
                      <input
                        type="number"
                        name="max_connections"
                        id="max_connections"
                        defaultValue={selectedConfig?.max_connections || 10}
                        min="1"
                        max="100"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="timeout_seconds" className="block text-sm font-medium text-gray-700">
                        Timeout (seg)
                      </label>
                      <input
                        type="number"
                        name="timeout_seconds"
                        id="timeout_seconds"
                        defaultValue={selectedConfig?.timeout_seconds || 30}
                        min="1"
                        max="300"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="ativo" className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        name="ativo"
                        id="ativo"
                        defaultValue={selectedConfig?.ativo === false ? 'false' : 'true'}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {selectedConfig ? 'Atualizando...' : 'Cadastrando...'}
                    </>
                  ) : (
                    selectedConfig ? 'Atualizar' : 'Cadastrar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Vinculação de Usuários */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">Vincular Usuário ao Banco</h2>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAssignConfig}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="user_id" className="block text-sm font-medium text-gray-700">
                    Usuário
                  </label>
                  <select
                    name="user_id"
                    id="user_id"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecione um usuário</option>
                    {usersWithoutConfig?.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.nome} ({user.email}) - {user.tipo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="config_id" className="block text-sm font-medium text-gray-700">
                    Configuração de Banco
                  </label>
                  <select
                    name="config_id"
                    id="config_id"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecione uma configuração</option>
                    {configurations?.filter(c => c.ativo).map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.nome_empresa} ({config.codigo_empresa})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {assignMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Vinculando...
                    </>
                  ) : (
                    'Vincular'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}