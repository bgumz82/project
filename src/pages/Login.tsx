import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'
import systemtruckLogo from '@/pages/images/systemtruck_logo.png'

export default function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const success = await signIn(email, password)
      if (success) {
        navigate('/')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Erro ao fazer login. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 via-blue-900 to-gray-900">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      <div className="absolute h-full w-full">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,rgba(120,119,198,0.3),transparent)]" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center">
            <div className="relative flex h-64 w-64 items-center justify-center">
              <img src={systemtruckLogo} alt="SystemTruck Logo" className="h-full w-full object-contain" />
            </div>
          </div>
          <h1 className="mt-5 bg-gradient-to-t from-[#6d6d6d] to-white bg-clip-text text-2xl font-bold text-transparent md:text-3xl lg:text-4xl">
            Sistema de Frota
          </h1>
          <p className="mt-2 text-sm text-blue-200/80">
            Faça login para acessar o sistema
          </p>
        </div>

        <div className="mt-8 w-full max-w-sm">
          <div className="rounded-2xl backdrop-blur-sm bg-white/[0.02] border border-white/[0.05] p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="text-sm text-blue-200">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-blue-200/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="text-sm text-blue-200">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-blue-200/50 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative w-full rounded-lg border border-white/10 bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:from-blue-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50"
              >
                <div className="relative flex items-center justify-center space-x-2">
                  {loading && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  )}
                  <span>{loading ? 'Entrando...' : 'Entrar no Sistema'}</span>
                </div>
              </button>
            </form>
          </div>

          <div className="mt-8 text-center text-sm text-blue-200/60">
            Versão 1.0 • Desenvolvimento SYSTEMTRUCK
          </div>
        </div>
      </div>
    </div>
  )
}