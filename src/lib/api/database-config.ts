import { query, queryOne } from '@/lib/db'

export interface DatabaseConfiguration {
  id: string
  nome_empresa: string
  codigo_empresa: string
  host: string
  port: number
  database_name: string
  username: string
  password: string
  ssl_enabled: boolean
  connection_string: string
  max_connections: number
  timeout_seconds: number
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseConfigurationCreate {
  nome_empresa: string
  codigo_empresa: string
  host: string
  port: number
  database_name: string
  username: string
  password: string
  ssl_enabled?: boolean
  max_connections?: number
  timeout_seconds?: number
  ativo?: boolean
}

export interface DatabaseConfigurationUpdate {
  nome_empresa?: string
  codigo_empresa?: string
  host?: string
  port?: number
  database_name?: string
  username?: string
  password?: string
  ssl_enabled?: boolean
  max_connections?: number
  timeout_seconds?: number
  ativo?: boolean
}

export async function getDatabaseConfigurations(): Promise<DatabaseConfiguration[]> {
  try {
    console.log('🔍 Buscando configurações de banco de dados')
    
    const result = await query(`
      SELECT 
        id,
        nome_empresa,
        codigo_empresa,
        host,
        port,
        database_name,
        username,
        password,
        ssl_enabled,
        connection_string,
        max_connections,
        timeout_seconds,
        ativo,
        created_at,
        updated_at
      FROM database_configurations 
      ORDER BY nome_empresa
    `, [], true) // Usar banco principal
    
    console.log('✅ Configurações de banco encontradas:', result.length)
    
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar configurações de banco:', error)
    throw error
  }
}

export async function getDatabaseConfiguration(id: string): Promise<DatabaseConfiguration | null> {
  try {
    const result = await queryOne(`
      SELECT *
      FROM database_configurations
      WHERE id = $1
    `, [id], true) // Usar banco principal
    
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar configuração de banco:', error)
    throw error
  }
}

export async function getDatabaseConfigurationByCode(codigo: string): Promise<DatabaseConfiguration | null> {
  try {
    const result = await queryOne(`
      SELECT *
      FROM database_configurations
      WHERE codigo_empresa = $1 AND ativo = true
    `, [codigo], true) // Usar banco principal
    
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar configuração por código:', error)
    throw error
  }
}

export async function createDatabaseConfiguration(config: DatabaseConfigurationCreate): Promise<DatabaseConfiguration> {
  try {
    console.log('📝 Criando nova configuração de banco:', config.nome_empresa)
    
    // Validar código único
    const existingConfig = await queryOne(`
      SELECT id FROM database_configurations WHERE codigo_empresa = $1
    `, [config.codigo_empresa], true) // Usar banco principal
    
    if (existingConfig) {
      throw new Error('Código da empresa já existe no sistema')
    }
    
    // Validar porta
    if (config.port < 1 || config.port > 65535) {
      throw new Error('Porta deve estar entre 1 e 65535')
    }
    
    // Validar conexões máximas
    if (config.max_connections && (config.max_connections < 1 || config.max_connections > 100)) {
      throw new Error('Máximo de conexões deve estar entre 1 e 100')
    }
    
    // Validar timeout
    if (config.timeout_seconds && (config.timeout_seconds < 1 || config.timeout_seconds > 300)) {
      throw new Error('Timeout deve estar entre 1 e 300 segundos')
    }
    
    const result = await queryOne(`
      INSERT INTO database_configurations (
        nome_empresa,
        codigo_empresa,
        host,
        port,
        database_name,
        username,
        password,
        ssl_enabled,
        max_connections,
        timeout_seconds,
        ativo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      config.nome_empresa,
      config.codigo_empresa,
      config.host,
      config.port,
      config.database_name,
      config.username,
      config.password, // TODO: Criptografar na aplicação
      config.ssl_enabled !== undefined ? config.ssl_enabled : true,
      config.max_connections || 10,
      config.timeout_seconds || 30,
      config.ativo !== undefined ? config.ativo : true
    ], true) // Usar banco principal

    if (!result) {
      throw new Error('Erro ao criar configuração de banco')
    }

    console.log('✅ Configuração de banco criada com sucesso:', result.id)
    
    return result
  } catch (error) {
    console.error('❌ Erro ao criar configuração de banco:', error)
    throw error
  }
}

export async function updateDatabaseConfiguration(id: string, config: DatabaseConfigurationUpdate): Promise<DatabaseConfiguration> {
  try {
    console.log('📝 Atualizando configuração de banco:', id)
    
    // Validar código único se fornecido
    if (config.codigo_empresa) {
      const existingConfig = await queryOne(`
        SELECT id FROM database_configurations WHERE codigo_empresa = $1 AND id != $2
      `, [config.codigo_empresa, id], true) // Usar banco principal
      
      if (existingConfig) {
        throw new Error('Código da empresa já existe em outra configuração')
      }
    }
    
    // Validar porta se fornecida
    if (config.port && (config.port < 1 || config.port > 65535)) {
      throw new Error('Porta deve estar entre 1 e 65535')
    }
    
    // Validar conexões máximas se fornecidas
    if (config.max_connections && (config.max_connections < 1 || config.max_connections > 100)) {
      throw new Error('Máximo de conexões deve estar entre 1 e 100')
    }
    
    // Validar timeout se fornecido
    if (config.timeout_seconds && (config.timeout_seconds < 1 || config.timeout_seconds > 300)) {
      throw new Error('Timeout deve estar entre 1 e 300 segundos')
    }
    
    // Construir query dinamicamente
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (config.nome_empresa !== undefined) {
      updates.push(`nome_empresa = $${paramIndex}`)
      values.push(config.nome_empresa)
      paramIndex++
    }

    if (config.codigo_empresa !== undefined) {
      updates.push(`codigo_empresa = $${paramIndex}`)
      values.push(config.codigo_empresa)
      paramIndex++
    }

    if (config.host !== undefined) {
      updates.push(`host = $${paramIndex}`)
      values.push(config.host)
      paramIndex++
    }

    if (config.port !== undefined) {
      updates.push(`port = $${paramIndex}`)
      values.push(config.port)
      paramIndex++
    }

    if (config.database_name !== undefined) {
      updates.push(`database_name = $${paramIndex}`)
      values.push(config.database_name)
      paramIndex++
    }

    if (config.username !== undefined) {
      updates.push(`username = $${paramIndex}`)
      values.push(config.username)
      paramIndex++
    }

    if (config.password !== undefined) {
      updates.push(`password = $${paramIndex}`)
      values.push(config.password) // TODO: Criptografar na aplicação
      paramIndex++
    }

    if (config.ssl_enabled !== undefined) {
      updates.push(`ssl_enabled = $${paramIndex}`)
      values.push(config.ssl_enabled)
      paramIndex++
    }

    if (config.max_connections !== undefined) {
      updates.push(`max_connections = $${paramIndex}`)
      values.push(config.max_connections)
      paramIndex++
    }

    if (config.timeout_seconds !== undefined) {
      updates.push(`timeout_seconds = $${paramIndex}`)
      values.push(config.timeout_seconds)
      paramIndex++
    }

    if (config.ativo !== undefined) {
      updates.push(`ativo = $${paramIndex}`)
      values.push(config.ativo)
      paramIndex++
    }

    // Sempre atualizar updated_at
    updates.push(`updated_at = NOW()`)

    if (updates.length === 1) { // Apenas updated_at
      throw new Error('Nenhum campo para atualizar')
    }

    // Adicionar ID como último parâmetro
    values.push(id)

    const result = await queryOne(`
      UPDATE database_configurations
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values, true) // Usar banco principal

    if (!result) {
      throw new Error('Configuração de banco não encontrada')
    }

    console.log('✅ Configuração de banco atualizada com sucesso:', result.id)

    return result
  } catch (error) {
    console.error('❌ Erro ao atualizar configuração de banco:', error)
    throw error
  }
}

export async function deleteDatabaseConfiguration(id: string): Promise<void> {
  try {
    console.log('🗑️ Excluindo configuração de banco:', id)
    
    // Verificar se há usuários usando esta configuração
    const usersCount = await queryOne(`
      SELECT COUNT(*) as count
      FROM usuarios
      WHERE database_config_id = $1
    `, [id], true) // Usar banco principal
    
    if (usersCount && parseInt(usersCount.count) > 0) {
      throw new Error('Não é possível excluir esta configuração pois há usuários vinculados a ela')
    }
    
    await query('DELETE FROM database_configurations WHERE id = $1', [id], true) // Usar banco principal
    console.log('✅ Configuração de banco excluída com sucesso')
  } catch (error) {
    console.error('❌ Erro ao excluir configuração de banco:', error)
    throw error
  }
}

export async function testDatabaseConnection(config: DatabaseConfigurationCreate): Promise<boolean> {
  try {
    console.log('🔍 Testando conexão com banco de dados:', config.host)
    
    // Fazer chamada para o backend para testar conexão
    const response = await fetch('/api/database-config/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
      },
      body: JSON.stringify(config)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Erro ao testar conexão')
    }

    const result = await response.json()
    console.log('✅ Teste de conexão realizado com sucesso')
    return result.success
  } catch (error) {
    console.error('❌ Erro no teste de conexão:', error)
    throw error
  }
}

export async function getUsersWithoutDatabaseConfig(): Promise<any[]> {
  try {
    const result = await query(`
      SELECT id, email, nome, tipo
      FROM usuarios
      WHERE database_config_id IS NULL
      ORDER BY nome
    `, [], true) // Usar banco principal
    
    return result
  } catch (error) {
    console.error('❌ Erro ao buscar usuários sem configuração de banco:', error)
    throw error
  }
}

export async function assignDatabaseConfigToUser(userId: string, configId: string): Promise<void> {
  try {
    console.log('🔗 Vinculando usuário ao banco de dados:', userId, configId)
    
    await query(`
      UPDATE usuarios 
      SET database_config_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [configId, userId], true) // Usar banco principal
    
    console.log('✅ Usuário vinculado à configuração de banco com sucesso')
  } catch (error) {
    console.error('❌ Erro ao vincular usuário à configuração de banco:', error)
    throw error
  }
}