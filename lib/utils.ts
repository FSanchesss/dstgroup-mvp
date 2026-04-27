import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function gerarCodigoSolicitacao(obraId: string, sequencia: number): string {
  const seq = String(sequencia).padStart(4, '0')
  const obraRef = obraId.slice(0, 6).toUpperCase()
  return `ZW-SOL-${obraRef}-${seq}`
}

export function gerarCodigoOP(obraId: string, sequencia: number): string {
  const seq = String(sequencia).padStart(4, '0')
  const obraRef = obraId.slice(0, 6).toUpperCase()
  return `ZW-OP-${obraRef}-${seq}`
}

export function gerarCodigoConjunto(opCodigo: string, sequencia: number): string {
  const seq = String(sequencia).padStart(3, '0')
  return `${opCodigo}-CJ${seq}`
}

export function gerarCodigoPeca(conjuntoCodigo: string, sequencia: number): string {
  const seq = String(sequencia).padStart(3, '0')
  return `${conjuntoCodigo}-PC${seq}`
}

export function formatarData(data: string | null): string {
  if (!data) return '-'
  return new Date(data).toLocaleDateString('pt-BR')
}

export function formatarDataHora(data: string | null): string {
  if (!data) return '-'
  return new Date(data).toLocaleString('pt-BR')
}

export const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const PRIORIDADE_COR: Record<string, string> = {
  baixa: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  normal: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  alta: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  urgente: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

export const STATUS_OP_LABEL: Record<string, string> = {
  criada: 'Criada',
  planejada: 'Planejada',
  em_producao: 'Em Produção',
  parcialmente_concluida: 'Parcial',
  concluida: 'Concluída',
  bloqueada: 'Bloqueada',
  cancelada: 'Cancelada',
  expedida: 'Expedida',
}

export const STATUS_OP_COR: Record<string, string> = {
  criada: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  planejada: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  em_producao: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  parcialmente_concluida: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  concluida: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  bloqueada: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  cancelada: 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-500',
  expedida: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
}

export const STATUS_PECA_LABEL: Record<string, string> = {
  aguardando_producao: 'Aguardando',
  em_processo: 'Em Processo',
  parada: 'Parada',
  retrabalho: 'Retrabalho',
  inspecao: 'Inspeção',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  expedida: 'Expedida',
}

export const STATUS_PECA_COR: Record<string, string> = {
  aguardando_producao: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  em_processo: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  parada: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  retrabalho: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  inspecao: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  aprovada: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  rejeitada: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  expedida: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
}

export const STATUS_SOL_LABEL: Record<string, string> = {
  aberta: 'Aberta',
  em_analise: 'Em Análise',
  aprovada: 'Aprovada',
  cancelada: 'Cancelada',
  convertida_em_op: 'Convertida em OP',
}

export const STATUS_SOL_COR: Record<string, string> = {
  aberta: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  em_analise: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  aprovada: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  cancelada: 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-500',
  convertida_em_op: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
}
