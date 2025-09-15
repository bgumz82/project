import axios from 'axios'

// Helper function for queries
export async function query<T = any>(text: string, params: any[] = [], useMainDb: boolean = false): Promise<any[]> {
  try {
    const endpoint = useMainDb ? '/api/db/query-main' : '/api/db/query'
    console.log('🔍 Executando query:', text)
    console.log('📋 Parâmetros:', params)

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

    // Verificar se a resposta tem a estrutura esperada
    if (!response.data || typeof response.data.rows === 'undefined') {
      console.error('❌ Resposta do servidor não tem estrutura esperada:', response.data)
      throw new Error('Resposta inválida do servidor')
    }

    console.log('📊 Query rows:', response.data.rows)

    return response.data.rows || []
  } catch (error: any) {
    console.error('❌ Erro na consulta ao banco de dados:', error)

    // Log mais detalhado do erro
    if (error.response) {
      console.error('❌ Status:', error.response.status)
      console.error('❌ Response data:', error.response.data)
      console.error('❌ Response headers:', error.response.headers)
    } else if (error.request) {
      console.error('❌ Request error:', error.request)
    } else {
      console.error('❌ Error message:', error.message)
    }

    // Re-throw com mensagem mais clara
    if (error.response?.status === 500) {
      throw new Error(`Erro interno do servidor: ${error.response.data?.details || error.message}`)
    } else if (error.response?.status === 404) {
      throw new Error('Endpoint não encontrado')
    } else if (error.response?.status >= 400) {
      throw new Error(`Erro do cliente (${error.response.status}): ${error.response.data?.error || error.message}`)
    } else {
      throw new Error(`Erro de conexão: ${error.message}`)
    }
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