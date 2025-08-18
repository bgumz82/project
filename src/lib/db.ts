import axios from 'axios'

// Helper function for queries
export async function query<T = any>(text: string, params?: any[], useMainDatabase?: boolean): Promise<T[]> {
  try {
    console.log('🔍 Executando query:', text)
    console.log('📋 Parâmetros:', params)
    
    const endpoint = useMainDatabase ? '/api/db/query-main' : '/api/db/query';
    
    const response = await axios.post(endpoint, {
      query: text,
      params
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
      }
    })
    
    console.log('✅ Query response:', response.data)
    console.log('📊 Query rows:', response.data.rows || response.data)
    
    // Verificar se a resposta tem o formato correto
    if (response.data && Array.isArray(response.data)) {
      return response.data
    } else if (response.data && response.data.rows && Array.isArray(response.data.rows)) {
      return response.data.rows
    } else {
      console.warn('⚠️ Formato de resposta inesperado:', response.data)
      return []
    }
  } catch (error: any) {
    console.error('❌ Erro na consulta ao banco de dados:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    })
    throw error
  }
}

// Get single row or null
export async function queryOne<T = any>(text: string, params?: any[], useMainDatabase?: boolean): Promise<T | null> {
  try {
    const rows = await query<T>(text, params, useMainDatabase)
    return rows[0] || null
  } catch (error) {
    console.error('Erro na consulta ao banco de dados:', error)
    throw error
  }
}

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const response = await axios.get('/api/health', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth.token')}`
      }
    })
    return response.data.status === 'ok'
  } catch (error) {
    console.error('Erro na conexão com o banco de dados:', error)
    return false
  }
}