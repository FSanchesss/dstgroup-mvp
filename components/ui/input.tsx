'use client'

import { cn } from '@/lib/utils'
import { forwardRef, useState, useRef, useEffect, Children, isValidElement } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-gray-900 dark:focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-500',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-gray-900 dark:focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-900 resize-none',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, value, onChange, disabled }, ref) => {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Parse <option> children into flat list
    const options: { value: string; label: string; disabled?: boolean }[] = []
    Children.forEach(children, (child) => {
      if (isValidElement(child) && child.type === 'option') {
        const p = child.props as { value?: string; children?: React.ReactNode; disabled?: boolean }
        options.push({ value: p.value ?? '', label: String(p.children ?? ''), disabled: p.disabled })
      }
    })

    const selected = options.find(o => o.value === value)

    useEffect(() => {
      function onMouseDown(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false)
        }
      }
      document.addEventListener('mousedown', onMouseDown)
      return () => document.removeEventListener('mousedown', onMouseDown)
    }, [])

    function pick(val: string) {
      if (onChange) {
        const fake = { target: { value: val } } as React.ChangeEvent<HTMLSelectElement>
        onChange(fake)
      }
      setOpen(false)
    }

    return (
      <div ref={containerRef} className={cn('relative', className)}>
        {/* Hidden native select for form compatibility */}
        <select ref={ref} value={value} onChange={onChange} disabled={disabled} className="sr-only" aria-hidden="true">
          {children}
        </select>

        {/* Trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(o => !o)}
          className={cn(
            'w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm text-left transition-colors',
            open
              ? 'border-gray-900 dark:border-gray-500 ring-1 ring-gray-900 dark:ring-gray-600 bg-white dark:bg-[#1A1A1A]'
              : 'border-gray-300 dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] hover:border-gray-400 dark:hover:border-[#3C3C3C]',
            disabled && 'opacity-50 cursor-not-allowed',
            !disabled && 'cursor-pointer',
            'text-gray-900 dark:text-gray-100'
          )}
        >
          <span className="truncate">{selected?.label ?? <span className="text-gray-400">Selecionar...</span>}</span>
          <ChevronDown className={cn('h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0 ml-2 transition-transform duration-150', open && 'rotate-180')} />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] shadow-xl overflow-hidden">
            <div className="max-h-60 overflow-y-auto py-1">
              {options.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => pick(opt.value)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors',
                      opt.disabled ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600' : 'cursor-pointer',
                      isSelected
                        ? 'bg-gray-50 dark:bg-[#242424] text-gray-900 dark:text-white font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222]'
                    )}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label className={cn('block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1', className)} {...props}>
      {children}
    </label>
  )
}

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function FormField({ label, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
