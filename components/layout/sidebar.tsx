'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Factory,
  Layers,
  Settings,
  ScanLine,
  Truck,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Cpu,
  Wrench,
  Building,
  MonitorCheck,
  Box,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { ThemeToggle } from './theme-toggle'

const cadastrosSubItems = [
  { href: '/cadastros/processos', label: 'Processos', icon: Cpu },
  { href: '/cadastros/maquinas', label: 'Máquinas', icon: Wrench },
  { href: '/usuarios', label: 'Usuários', icon: Users },
  { href: '/empresas', label: 'Empresas', icon: Building },
]

const navGroups = [
  {
    label: 'GERAL',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'PRODUÇÃO',
    items: [
      { href: '/obras', label: 'Obras', icon: Building2 },
      { href: '/solicitacoes', label: 'Solicitações', icon: ClipboardList },
      { href: '/ordens-producao', label: 'Ordens de Produção', icon: Factory },
      { href: '/cadwork', label: 'Projetos Cadwork', icon: Box },
      { href: '/painel', label: 'Painel do Operador', icon: MonitorCheck },
      { href: '/apontamento', label: 'Apontamento', icon: Layers },
    ],
  },
  {
    label: 'CONTROLE',
    items: [
      { href: '/rastreabilidade', label: 'Rastreabilidade', icon: ScanLine },
      { href: '/expedicao', label: 'Expedição', icon: Truck },
    ],
  },
  {
    label: 'ADMINISTRAÇÃO',
    items: [
      { href: '/cadastros', label: 'Cadastros', icon: Settings, expandable: true },
    ],
  },
  {
    label: 'SUPORTE',
    items: [
      { href: '/ajuda', label: 'Ajuda', icon: HelpCircle },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [cadastrosOpen, setCadastrosOpen] = useState(
    pathname.startsWith('/cadastros') || pathname.startsWith('/usuarios') || pathname.startsWith('/empresas')
  )

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-gray-100 dark:bg-[#141414] transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-gray-200 dark:border-[#1E1E1E] h-14',
        collapsed ? 'justify-center px-0' : 'justify-between px-5'
      )}>
        {!collapsed && (
          <span
            className="text-[19px] select-none"
            style={{ letterSpacing: '-0.05em' }}
          >
            <span className="font-bold text-gray-900 dark:text-white">dst</span>
            <span className="font-normal text-gray-500 dark:text-gray-500">group</span>
          </span>
        )}
        {collapsed && (
          <span
            className="text-[19px] font-bold text-gray-900 dark:text-white select-none"
            style={{ letterSpacing: '-0.05em' }}
          >
            d
          </span>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 dark:text-gray-600 tracking-widest uppercase">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon, expandable }: any) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href))

                if (expandable) {
                  const anySubActive = cadastrosSubItems.some(s => pathname.startsWith(s.href.split('?')[0]))
                  const isActive = active || anySubActive
                  return (
                    <div key={href}>
                      <button
                        onClick={() => { if (!collapsed) setCadastrosOpen(o => !o) }}
                        title={collapsed ? label : undefined}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                          isActive
                            ? 'bg-[#161618] dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
                            : 'text-[#1A1A1A] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-[#161618] dark:hover:text-gray-100',
                          collapsed && 'justify-center px-0'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">{label}</span>
                            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', cadastrosOpen && 'rotate-180')} />
                          </>
                        )}
                      </button>
                      {cadastrosOpen && !collapsed && (
                        <div className="mt-1 ml-3 pl-3 border-l border-gray-200 dark:border-gray-700 space-y-1">
                          {cadastrosSubItems.map(({ href: subHref, label: subLabel, icon: SubIcon }) => {
                            const subActive = pathname.startsWith(subHref.split('?')[0])
                            return (
                              <Link
                                key={subHref}
                                href={subHref}
                                className={cn(
                                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                                  subActive
                                    ? 'bg-[#161618] dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
                                    : 'text-[#1A1A1A] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-[#161618] dark:hover:text-gray-100'
                                )}
                              >
                                <SubIcon className="h-3.5 w-3.5 shrink-0" />
                                <span>{subLabel}</span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <Link
                    key={href}
                    href={href}
                    title={collapsed ? label : undefined}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                      active
                        ? 'bg-[#161618] dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
                        : 'text-[#1A1A1A] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-[#161618] dark:hover:text-gray-100',
                      collapsed && 'justify-center px-0'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Theme toggle */}
      <div className={cn('px-2 pb-1', collapsed && 'px-2')}>
        <ThemeToggle collapsed={collapsed} />
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="px-2 pb-3">
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center w-full py-2 rounded-md text-gray-400 dark:text-gray-600 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="px-5 py-4 border-t border-gray-200 dark:border-[#1E1E1E]">
          <p className="text-[11px] text-gray-400 dark:text-gray-600" style={{ letterSpacing: '-0.03em' }}>
            <span className="font-semibold text-gray-500 dark:text-gray-500">dst</span>group · MVP v1.0
          </p>
        </div>
      )}
    </aside>
  )
}

