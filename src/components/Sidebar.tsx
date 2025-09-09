import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  HomeIcon,
  TruckIcon,
  WrenchIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  UserGroupIcon,
  UserIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ReceiptRefundIcon,
  DocumentChartBarIcon,
  ShieldCheckIcon,
  BuildingOffice2Icon,
  DocumentTextIcon,
  ServerIcon,
  CalculatorIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { usePermissions } from '@/contexts/PermissionsContext'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  submenu?: NavigationItem[]
  moduleKey?: string
}

export default function Sidebar() {
  const location = useLocation()
  const { hasPermission } = usePermissions()
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())

  console.log('🔧 Sidebar renderizando. hasPermission disponível:', typeof hasPermission)

  const toggleMenu = (menuName: string) => {
    const newExpanded = new Set(expandedMenus)
    if (newExpanded.has(menuName)) {
      newExpanded.delete(menuName)
    } else {
      newExpanded.add(menuName)
    }
    setExpandedMenus(newExpanded)
  }

  // Define navigation items based on user permissions
  const getNavigationItems = (): NavigationItem[] => {
    const items: NavigationItem[] = []

    console.log('🔍 Verificando permissões para construir navegação')

    // Se a função hasPermission não está disponível, retornar array vazio
    if (typeof hasPermission !== 'function') {
      console.log('❌ hasPermission não é uma função')
      return items
    }

    // Dashboard - sempre visível se tiver acesso
    if (hasPermission('dashboard')) {
      items.push({ name: 'Dashboard', href: '/', icon: HomeIcon, moduleKey: 'dashboard' })
    }

    // Veículos
    if (hasPermission('veiculos')) {
      const submenuItems = [
        { name: 'Gerenciar Veículos', href: '/veiculos', icon: TruckIcon }
      ]

      // Só adicionar Registros ANTT se o usuário tiver permissão específica
      if (hasPermission('antt')) {
        submenuItems.push({ name: 'Registros ANTT', href: '/veiculos/antt', icon: DocumentTextIcon })
      }

      // Só adicionar Associações de Frota se o usuário tiver permissão específica
      if (hasPermission('associacoes_frota')) {
        submenuItems.push({ name: 'Associações de Frota', href: '/veiculos/associacoes', icon: UserGroupIcon })
      }

      items.push({ 
        name: 'Veículos', 
        href: '/veiculos', 
        icon: TruckIcon, 
        moduleKey: 'veiculos',
        submenu: submenuItems.length > 1 ? submenuItems : undefined
      })
    }

    // Abastecimentos
    if (hasPermission('abastecimentos')) {
      items.push({ name: 'Abastecimentos', href: '/abastecimentos', icon: WrenchIcon, moduleKey: 'abastecimentos' })
    }

    // Cadastros
    if (hasPermission('cadastros')) {
      items.push({ name: 'Cadastros', href: '/cadastros', icon: BuildingOffice2Icon, moduleKey: 'cadastros' })
    }

    // Manutenções
    if (hasPermission('manutencoes')) {
      items.push({ name: 'Manutenções', href: '/manutencoes', icon: WrenchIcon, moduleKey: 'manutencoes' })
    }

    // Checklists
    if (hasPermission('checklists')) {
      items.push({ name: 'Checklists', href: '/checklists', icon: ClipboardDocumentCheckIcon, moduleKey: 'checklists' })
    }

    // Funcionários
    if (hasPermission('funcionarios')) {
      items.push({ name: 'Funcionários', href: '/funcionarios', icon: UserIcon, moduleKey: 'funcionarios' })
    }

    // Usuários
    if (hasPermission('usuarios')) {
      items.push({ name: 'Usuários', href: '/usuarios', icon: UserGroupIcon, moduleKey: 'usuarios' })
    }

    // Permissões de Usuários
    if (hasPermission('permissoes')) {
      items.push({ name: 'Permissões', href: '/permissoes', icon: ShieldCheckIcon })
    }

    // Configurações de Banco
    if (hasPermission('configuracoes_banco')) {
      items.push({ name: 'Config. Banco', href: '/configuracoes-banco', icon: ServerIcon })
    }

    // Financeiro
    if (hasPermission('financeiro')) {
      items.push({ 
        name: 'Financeiro', 
        href: '/financeiro/dashboard', 
        icon: BanknotesIcon,
        moduleKey: 'financeiro',
        submenu: [
          { name: 'Dashboard', href: '/financeiro/dashboard', icon: ChartBarIcon },
          { name: 'Centros de Custo', href: '/financeiro/centros-custo', icon: CurrencyDollarIcon },
          { name: 'Contas a Pagar', href: '/financeiro/contas-pagar', icon: ReceiptRefundIcon },
          { name: 'Contas a Receber', href: '/financeiro/contas-receber', icon: BanknotesIcon },
          { name: 'Relatórios', href: '/financeiro/relatorios', icon: DocumentChartBarIcon },
        ]
      })
    }

    // Fiscal
    if (hasPermission('fiscal')) {
      items.push({ 
        name: 'Fiscal', 
        href: '/fiscal/dashboard', 
        icon: CalculatorIcon,
        moduleKey: 'fiscal',
        submenu: [
          { name: 'Dashboard', href: '/fiscal/dashboard', icon: ChartBarIcon },
          { name: 'Empresas', href: '/fiscal/empresas', icon: BuildingOffice2Icon },
          { name: 'CT-e', href: '/fiscal/cte', icon: DocumentTextIcon },
          { name: 'MDF-e', href: '/fiscal/mdfe', icon: TruckIcon },
          { name: 'Frete', href: '/fiscal/frete', icon: CurrencyDollarIcon },
        ]
      })
    }

    // Relatórios
    if (hasPermission('relatorios')) {
      items.push({ name: 'Relatórios', href: '/relatorios', icon: ChartBarIcon, moduleKey: 'relatorios' })
    }

    return items
  }

  const navigation = getNavigationItems()

  // Auto-expand menu if current page is in submenu
  const isInSubmenu = (item: NavigationItem) => {
    return item.submenu?.some(subitem => location.pathname === subitem.href) || false
  }

  return (
    <div className="flex flex-col w-56 bg-gray-800 h-[calc(100vh-4rem)] overflow-y-auto">
      <nav className="mt-3 flex-1 space-y-1 px-2 pb-3">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          const hasActiveSubmenu = isInSubmenu(item)
          const isExpanded = expandedMenus.has(item.name) || hasActiveSubmenu

          return (
            <div key={item.name}>
              {item.submenu ? (
                <div>
                  {/* Menu Principal com Seta */}
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`${
                      isActive || hasActiveSubmenu
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    } group flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium rounded-md transition-colors duration-200`}
                  >
                    <div className="flex items-center">
                      <item.icon
                        className={`${
                          isActive || hasActiveSubmenu ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-300'
                        } mr-2 flex-shrink-0 h-4 w-4`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </div>
                    {isExpanded ? (
                      <ChevronDownIcon className="h-3 w-3 text-gray-400 transition-transform duration-200" />
                    ) : (
                      <ChevronRightIcon className="h-3 w-3 text-gray-400 transition-transform duration-200" />
                    )}
                  </button>

                  {/* Submenu Colapsável */}
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-600 pl-3">
                      {item.submenu.map((subitem) => {
                        const isSubActive = location.pathname === subitem.href
                        return (
                          <Link
                            key={subitem.name}
                            to={subitem.href}
                            className={`${
                              isSubActive
                                ? 'bg-gray-900 text-white border-l-2 border-indigo-500'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white border-l-2 border-transparent hover:border-gray-500'
                            } group flex items-center px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200`}
                          >
                            <subitem.icon
                              className={`${
                                isSubActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-300'
                              } mr-2 flex-shrink-0 h-3 w-3`}
                              aria-hidden="true"
                            />
                            <span className="truncate">{subitem.name}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  to={item.href}
                  className={`${
                    isActive
                      ? 'bg-gray-900 text-white border-r-2 border-indigo-500'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white border-r-2 border-transparent hover:border-gray-500'
                  } group flex items-center px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200`}
                >
                  <item.icon
                    className={`${
                      isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-300'
                    } mr-2 flex-shrink-0 h-4 w-4`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )
}