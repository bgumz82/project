// Cache keys
const AUTH_CACHE_KEY = 'auth_cache'
const VEHICLES_CACHE_KEY = 'vehicles_cache'
const CACHE_VERSION = '1.0.0'

// Função para salvar dados de autenticação no cache
export const saveAuthToCache = (authData: {
  session: any
  user: any
  userType: string
  timestamp: number
}) => {
  try {
    const cacheData = {
      version: CACHE_VERSION,
      timestamp: authData.timestamp,
      data: authData
    }
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cacheData))
    return true
  } catch (error) {
    console.error('Erro ao salvar autenticação no cache:', error)
    return false
  }
}

// Função para obter dados de autenticação do cache
export const getAuthFromCache = () => {
  try {
    const cached = localStorage.getItem(AUTH_CACHE_KEY)
    if (!cached) return null

    const cacheData = JSON.parse(cached)
    
    if (cacheData.version !== CACHE_VERSION) {
      localStorage.removeItem(AUTH_CACHE_KEY)
      return null
    }

    // Verificar se o cache expirou (24 horas)
    if (Date.now() - cacheData.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(AUTH_CACHE_KEY)
      return null
    }

    return cacheData.data
  } catch (error) {
    console.error('Erro ao obter autenticação do cache:', error)
    return null
  }
}

// Função para verificar se há dados offline
export const hasOfflineData = () => {
  try {
    const vehicles = localStorage.getItem(VEHICLES_CACHE_KEY)
    return !!vehicles
  } catch (error) {
    console.error('Erro ao verificar dados offline:', error)
    return false
  }
}

// Função para limpar o cache
export const clearAppCache = async () => {
  try {
    localStorage.clear()
    sessionStorage.clear()

    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
    }

    return true
  } catch (error) {
    console.error('Erro ao limpar cache:', error)
    return false
  }
}

// Função para verificar e limpar cache antigo
export const checkAndCleanCache = () => {
  try {
    const cacheVersion = localStorage.getItem('cache_version')
    if (cacheVersion !== CACHE_VERSION) {
      clearAppCache()
      localStorage.setItem('cache_version', CACHE_VERSION)
    }
  } catch (error) {
    console.error('Erro ao verificar versão do cache:', error)
  }
}