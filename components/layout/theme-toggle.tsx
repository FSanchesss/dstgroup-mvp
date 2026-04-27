'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('dst-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('dst-theme', 'light')
    }
  }

  return (
    <button
      onClick={toggle}
      title={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      className={cn(
        'flex items-center gap-2.5 w-full rounded-md text-sm transition-colors',
        'text-gray-400 hover:bg-gray-100 hover:text-gray-700',
        'dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300',
        collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'
      )}
    >
      {dark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
      {!collapsed && <span>{dark ? 'Modo Claro' : 'Modo Escuro'}</span>}
    </button>
  )
}
