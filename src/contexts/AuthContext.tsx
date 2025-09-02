import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { signIn, getCurrentUser } from '../lib/auth'
import { getVehicles } from '../lib/api/vehicles'
import { clearAppCache, saveAuthToCache, getAuthFromCache } from '../lib/cache'
import toast from 'react-hot-toast'

interface AuthContextType {
  session: any | null
  user: any | null
  userType: string | null
  signIn: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(null)
  const [user, setUser] = useState<any | null>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)

  const syncVehicles = useCallback(async () => {
    try {
      await getVehicles()
    } catch (error) {
      console.error('Error syncing vehicles:', error)
    }
  }, [])

  const clearAuthState = useCallback(() => {
    setSession(null)
    setUser(null)
    setUserType(null)
    localStorage.removeItem('auth.token')
  }, [])

  const updateUserState = useCallback(async (authData: any) => {
    try {
      console.log('🔄 Atualizando estado do usuário:', authData)
      
      if (!authData?.user) {
        console.log('❌ Dados de autenticação inválidos')
        clearAuthState()
        return
      }

      setSession(authData.session)
      setUser(authData.user)
      setUserType(authData.user.tipo)
      
      console.log('✅ Estado do usuário atualizado:', {
        id: authData.user.id,
        email: authData.user.email,
        tipo: authData.user.tipo
      })

      // Salvar no cache com timestamp
      saveAuthToCache({
        session: authData.session,
        user: authData.user,
        userType: authData.user.tipo,
        timestamp: Date.now()
      })

      if (authData.user.tipo === 'operador_checklist' || authData.user.tipo === 'operador_abastecimento') {
        await syncVehicles()
      }
    } catch (error) {
      console.error('Error updating user state:', error)
      clearAuthState()
    }
  }, [clearAuthState, syncVehicles])

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (initialized) return
        setLoading(true)
        
        const token = localStorage.getItem('auth.token')
        
        if (token) {
          const user = await getCurrentUser(token)
          if (user) {
            await updateUserState({
              session: { access_token: token },
              user
            })
          } else {
            clearAuthState()
          }
        } else if (!navigator.onLine) {
          const cachedAuth = getAuthFromCache()
          if (cachedAuth) {
            setSession(cachedAuth.session)
            setUser(cachedAuth.user)
            setUserType(cachedAuth.userType)
          } else {
            clearAuthState()
          }
        } else {
          clearAuthState()
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        clearAuthState()
      } finally {
        setLoading(false)
        setInitialized(true)
      }
    }

    initAuth()
  }, [updateUserState, clearAuthState, initialized])

  const handleSignIn = async (email: string, password: string): Promise<boolean> => {
    try {
      if (!navigator.onLine) {
        const cachedAuth = getAuthFromCache()
        if (cachedAuth?.user?.email === email) {
          // Verificar se o cache não expirou (24 horas)
          const cacheAge = Date.now() - (cachedAuth.timestamp || 0)
          if (cacheAge > 24 * 60 * 60 * 1000) {
            throw new Error('Cache expirado. É necessário conexão com a internet para fazer login.')
          }
          
          setSession(cachedAuth.session)
          setUser(cachedAuth.user)
          setUserType(cachedAuth.userType)
          return true
        }
        throw new Error('Não é possível fazer login offline sem cache prévio')
      }

      const authData = await signIn(email, password)
      if (!authData) {
        throw new Error('Erro ao fazer login')
      }

      localStorage.setItem('auth.token', authData.session.access_token)
      await updateUserState(authData)
      return true
    } catch (error: any) {
      console.error('Authentication error:', error)
      throw error
    }
  }

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('auth.token')
      await clearAppCache()
      clearAuthState()
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('Erro ao fazer logout')
      clearAuthState()
    }
  }

  const value = useMemo(() => ({
    session,
    user,
    userType,
    signIn: handleSignIn,
    signOut: handleSignOut,
    loading
  }), [session, user, userType, handleSignIn, handleSignOut, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}