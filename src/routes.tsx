import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { usePermissions } from './contexts/PermissionsContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import Supplies from './pages/Supplies'
import Maintenance from './pages/Maintenance'
import Checklists from './pages/Checklists'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Funcionarios from './pages/Funcionarios'
import UserPermissions from './pages/UserPermissions'
import Cadastros from './pages/Cadastros'
import RegistrosANTT from './pages/RegistrosANTT'
import FleetAssociations from './pages/FleetAssociations'
import DatabaseConfig from './pages/DatabaseConfig'
import Layout from './components/Layout'

// Financeiro
import DashboardFinanceiro from './pages/financeiro/Dashboard'
import CentrosCusto from './pages/financeiro/CentrosCusto'
import ContasPagar from './pages/financeiro/ContasPagar'
import ContasReceber from './pages/financeiro/ContasReceber'
import RelatoriosFinanceiros from './pages/financeiro/Relatorios'

// Fiscal
import DashboardFiscal from './pages/fiscal/Dashboard'
import EmpresasFiscais from './pages/fiscal/EmpresasFiscais'
import CTe from './pages/fiscal/CTe'
import NovoCtEAuto from './pages/fiscal/NovoCtEAuto'
import MDFe from './pages/fiscal/MDFe'
import Frete from './pages/fiscal/Frete'
import ApolicesSeguro from './pages/fiscal/ApolicesSeguro'

// Mobile Routes
import MobileLogin from './pages/mobile/Login'
import MobileHome from './pages/mobile/Home'
import MobileChecklist from './pages/mobile/Checklist'
import MobileSupply from './pages/mobile/Supply'

function ProtectedRoute({
  children,
  moduleKey,
  action = 'access'
}: {
  children: React.ReactNode
  moduleKey?: string
  action?: 'access' | 'create' | 'edit' | 'delete'
}) {
  const { userType, loading: authLoading } = useAuth()
  const { hasPermission, loading: permissionsLoading } = usePermissions()

  if (authLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!userType) {
    return <Navigate to="/login" replace />
  }

  // Se não especificou módulo, permite acesso (para rotas administrativas)
  if (!moduleKey) {
    return <>{children}</>
  }

  // Verifica permissão específica do módulo
  if (!hasPermission(moduleKey as any, action)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function MobileProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { userType, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!userType || !allowedRoles.includes(userType)) {
    return <Navigate to="/m/login" replace />
  }

  return <>{children}</>
}

function isMobileDevice() {
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    window.navigator.userAgent.toLowerCase()
  )
}

export function AppRoutes() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const isMobile = isMobileDevice()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Handle unauthenticated users
  if (!session) {
    // Redirect to appropriate login based on device type
    if (isMobile && !location.pathname.startsWith('/m/')) {
      return <Navigate to="/m/login" replace />
    }
    if (!isMobile && location.pathname.startsWith('/m/')) {
      return <Navigate to="/login" replace />
    }

    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/m/login" element={<MobileLogin />} />
        <Route path="*" element={<Navigate to={isMobile ? "/m/login" : "/login"} replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      {/* Desktop Routes */}
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <ProtectedRoute moduleKey="dashboard">
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/veiculos"
          element={
            <ProtectedRoute moduleKey="veiculos">
              <Vehicles />
            </ProtectedRoute>
          }
        />

        <Route
          path="/veiculos/antt"
          element={
            <ProtectedRoute moduleKey="veiculos">
              <RegistrosANTT />
            </ProtectedRoute>
          }
        />

        <Route
          path="/veiculos/associacoes"
          element={
            <ProtectedRoute moduleKey="associacoes_frota">
              <FleetAssociations />
            </ProtectedRoute>
          }
        />

        <Route
          path="/abastecimentos"
          element={
            <ProtectedRoute moduleKey="abastecimentos">
              <Supplies />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cadastros"
          element={
            <ProtectedRoute moduleKey="cadastros">
              <Cadastros />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manutencoes"
          element={
            <ProtectedRoute moduleKey="manutencoes">
              <Maintenance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checklists"
          element={
            <ProtectedRoute moduleKey="checklists">
              <Checklists />
            </ProtectedRoute>
          }
        />

        <Route
          path="/relatorios"
          element={
            <ProtectedRoute moduleKey="relatorios">
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/usuarios"
          element={
            <ProtectedRoute moduleKey="usuarios">
              <Users />
            </ProtectedRoute>
          }
        />

        <Route
          path="/funcionarios"
          element={
            <ProtectedRoute moduleKey="funcionarios">
              <Funcionarios />
            </ProtectedRoute>
          }
        />

        <Route
          path="/permissoes"
          element={
            <ProtectedRoute moduleKey="permissoes">
              <UserPermissions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/configuracoes-banco"
          element={
            <ProtectedRoute moduleKey="configuracoes_banco">
              <DatabaseConfig />
            </ProtectedRoute>
          }
        />
        {/* Rotas do Financeiro */}
        <Route
          path="/financeiro/dashboard"
          element={
            <ProtectedRoute moduleKey="financeiro">
              <DashboardFinanceiro />
            </ProtectedRoute>
          }
        />

        <Route
          path="/financeiro/centros-custo"
          element={
            <ProtectedRoute moduleKey="financeiro">
              <CentrosCusto />
            </ProtectedRoute>
          }
        />

        <Route
          path="/financeiro/contas-pagar"
          element={
            <ProtectedRoute moduleKey="financeiro">
              <ContasPagar />
            </ProtectedRoute>
          }
        />

        <Route
          path="/financeiro/contas-receber"
          element={
            <ProtectedRoute moduleKey="financeiro">
              <ContasReceber />
            </ProtectedRoute>
          }
        />

        <Route
          path="/financeiro/relatorios"
          element={
            <ProtectedRoute moduleKey="financeiro">
              <RelatoriosFinanceiros />
            </ProtectedRoute>
          }
        />

        {/* Rotas do Fiscal */}
        <Route
          path="/fiscal"
          element={
            <ProtectedRoute moduleKey="fiscal">
              <DashboardFiscal />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/fiscal/dashboard"
          element={
            <ProtectedRoute moduleKey="fiscal">
              <DashboardFiscal />
            </ProtectedRoute>
          }
        />

        <Route
          path="/fiscal/empresas"
          element={
            <ProtectedRoute moduleKey="empresas_fiscais">
              <EmpresasFiscais />
            </ProtectedRoute>
          }
        />

        <Route
          path="/fiscal/cte"
          element={
            <ProtectedRoute moduleKey="cte">
              <CTe />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/fiscal/cte-auto"
          element={<NovoCtEAuto />}
        />

        <Route
          path="/fiscal/mdfe"
          element={
            <ProtectedRoute moduleKey="mdfe">
              <MDFe />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fiscal/frete"
          element={
            <ProtectedRoute moduleKey="fiscal">
              <Frete />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/fiscal/apolices-seguro"
          element={
            <ProtectedRoute moduleKey="fiscal">
              <ApolicesSeguro />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Mobile Routes */}
      <Route
        path="/m/home"
        element={
          <MobileProtectedRoute allowedRoles={['operador_checklist', 'operador_abastecimento']}>
            <MobileHome />
          </MobileProtectedRoute>
        }
      />

      <Route
        path="/m/checklist"
        element={
          <MobileProtectedRoute allowedRoles={['operador_checklist']}>
            <MobileChecklist />
          </MobileProtectedRoute>
        }
      />

      <Route
        path="/m/abastecimento"
        element={
          <MobileProtectedRoute allowedRoles={['operador_abastecimento']}>
            <MobileSupply />
          </MobileProtectedRoute>
        }
      />

      {/* Fallback route */}
      <Route path="*" element={<Navigate to={isMobile ? "/m/home" : "/"} replace />} />
    </Routes>
  )
}