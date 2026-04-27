'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

let toastQueue: Toast[] = []
let listeners: ((toasts: Toast[]) => void)[] = []

export function toast(type: ToastType, message: string) {
  const id = Math.random().toString(36).slice(2)
  toastQueue = [...toastQueue, { id, type, message }]
  listeners.forEach((l) => l(toastQueue))
  setTimeout(() => {
    toastQueue = toastQueue.filter((t) => t.id !== id)
    listeners.forEach((l) => l(toastQueue))
  }, 4000)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (t: Toast[]) => setToasts([...t])
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />,
    error: <XCircle className="h-5 w-5 text-red-500 shrink-0" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
  }

  const colors: Record<ToastType, string> = {
    success: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950',
    error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950',
    warning: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950',
    info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950',
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm text-gray-800 dark:text-gray-200',
            colors[t.type]
          )}
        >
          {icons[t.type]}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => {
              toastQueue = toastQueue.filter((q) => q.id !== t.id)
              listeners.forEach((l) => l(toastQueue))
            }}
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      ))}
    </div>
  )
}
