import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn('rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] dark:shadow-none', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={cn('px-5 py-3.5 border-b border-gray-200 dark:border-gray-800', className)}>{children}</div>
}

export function CardTitle({ children, className }: CardProps) {
  return <h3 className={cn('text-sm font-semibold text-gray-800 dark:text-gray-100', className)}>{children}</h3>
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}

export function CardFooter({ children, className }: CardProps) {
  return <div className={cn('px-5 py-3.5 border-t border-gray-200 dark:border-gray-800', className)}>{children}</div>
}
