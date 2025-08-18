import axios from 'axios'

export async function signIn(email: string, password: string) {
  try {
    const response = await axios.post('/api/auth/login', {
      email: email.trim(),
      password: password.trim()
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.data || !response.data.user) {
      throw new Error('Resposta inválida do servidor')
    }
    
    return response.data
  } catch (error: any) {
    console.error('Erro de autenticação:', {
      message: error.response?.data?.error || error.message,
      name: error.name,
      code: error.code,
      status: error.response?.status
    })
    
    if (error.response?.status === 404) {
      throw new Error('Serviço de autenticação indisponível')
    }
    
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error)
    }
    
    if (error.response?.status === 401) {
      throw new Error('Email ou senha incorretos')
    }
    
    throw new Error('Erro ao fazer login. Tente novamente.')
  }
}

export async function signUp(email: string, password: string, nome: string, tipo: 'admin' | 'operador_abastecimento' | 'operador_checklist') {
  try {
    const response = await axios.post('/api/auth/signup', {
      email: email.trim(),
      password: password.trim(),
      nome: nome.trim(),
      tipo: tipo
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.data || !response.data.user) {
      throw new Error('Resposta inválida do servidor')
    }
    
    return response.data.user
  } catch (error: any) {
    console.error('Erro ao criar conta:', {
      message: error.response?.data?.error || error.message,
      name: error.name,
      code: error.code,
      status: error.response?.status
    })
    
    if (error.response?.status === 404) {
      throw new Error('Serviço de autenticação indisponível')
    }
    
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error)
    }
    
    if (error.response?.status === 409) {
      throw new Error('Email já cadastrado')
    }
    
    throw new Error('Erro ao criar conta. Tente novamente.')
  }
}

export async function getCurrentUser(token: string) {
  try {
    if (!token) return null
    
    const response = await axios.post('/api/auth/verify', 
      { token },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    )
    
    if (!response.data || !response.data.id) {
      return null
    }
    
    return response.data
  } catch (error: any) {
    console.error('Erro ao obter usuário atual:', error)
    return null
  }
}