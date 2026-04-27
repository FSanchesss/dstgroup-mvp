'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  ArrowLeft, Building2, MapPin, User, Calendar, ClipboardList,
  Factory, Package, AlertCircle, CheckCircle2, Clock, TrendingUp,
} from 'lucide-react'
import {
  formatarData,
  STATUS_OP_LABEL, STATUS_OP_COR,
  PRIORIDADE_LABEL, PRIORIDADE_COR,
} from '@/lib/utils'

const STATUS_OBRA_LABEL: Record<string, string> = {
  ativa: 'Ativa',
  concluida: 'Concluída',
  pausada: 'Pausada',
  cancelada: 'Cancelada',
}

const STATUS_OBRA_COR: Record<string, string> = {
  ativa: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  concluida: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  pausada: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  cancelada: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

const STATUS_SOL_LABEL: Record<string, string> = {
  aberta: 'Aberta',
  em_analise: 'Em Análise',
  aprovada: 'Aprovada',
  cancelada: 'Cancelada',
  convertida_em_op: 'Convertida em OP',
}

const STATUS_SOL_COR: Record<string, string> = {
  aberta: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  em_analise: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  aprovada: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  cancelada: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500',
  convertida_em_op: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
}

export default function ObraDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [obra, setObra] = useState<any>(null)
  const [solicitacoes, setSolicitacoes] = useState<any[]>([])
  const [ops, setOps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [obraRes, solRes, opsRes] = await Promise.all([
      supabase.from('obras').select('*').eq('id', id).single(),
      supabase.from('solicitacoes').select('*').eq('obra_id', id).order('created_at', { ascending: false }),
      supabase.from('ordens_producao').select('*, conjuntos(id), pecas:conjuntos(pecas(id))').eq('obra_id', id).order('created_at', { ascending: false }),
    ])
    setObra(obraRes.data)
    setSolicitacoes(solRes.data ?? [])
    setOps(opsRes.data ?? [])
    setLoading(false)
  }, [id, supabase])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Carregando...
      </div>
    )
  }

  if (!obra) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>Obra não encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/obras')}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>
    )
  }

  // KPIs
  const totalOPs = ops.length
  const opsAtivas = ops.filter(o => o.status === 'em_producao').length
  const opsConcluidas = ops.filter(o => o.status === 'concluida' || o.status === 'expedida').length
  const solicitacoesAbertas = solicitacoes.filter(s => s.status === 'aberta' || s.status === 'em_analise').length

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/obras')}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Obras
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{obra.nome}</h1>
              <Badge className={STATUS_OBRA_COR[obra.status]}>{STATUS_OBRA_LABEL[obra.status]}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {obra.tipo && <span>{obra.tipo}</span>}
              {obra.cliente && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {obra.cliente}
                </span>
              )}
              {obra.localizacao && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {obra.localizacao}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Criada em {formatarData(obra.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Factory className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalOPs}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">OPs Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{opsAtivas}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Em Produção</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{opsConcluidas}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{solicitacoesAbertas}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sol. Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ordens de Produção */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-gray-400" />
                Ordens de Produção
              </CardTitle>
              <Link href="/ordens-producao">
                <Button variant="ghost" size="sm" className="text-xs">Ver todas</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-0 pb-0">
            {ops.length === 0 ? (
              <div className="py-10 text-center text-gray-400 dark:text-gray-600 text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhuma OP vinculada a esta obra.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {ops.map((op: any) => (
                  <Link
                    key={op.id}
                    href={`/ordens-producao/${op.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {op.codigo_op}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className={`${PRIORIDADE_COR[op.prioridade]} text-[10px] px-1.5 py-0`}>
                          {PRIORIDADE_LABEL[op.prioridade]}
                        </Badge>
                        {op.prazo && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Prazo: {formatarData(op.prazo)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className={STATUS_OP_COR[op.status]}>{STATUS_OP_LABEL[op.status]}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Solicitações */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-gray-400" />
                Solicitações
              </CardTitle>
              <Link href="/solicitacoes">
                <Button variant="ghost" size="sm" className="text-xs">Ver todas</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-0 pb-0">
            {solicitacoes.length === 0 ? (
              <div className="py-10 text-center text-gray-400 dark:text-gray-600 text-sm">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhuma solicitação para esta obra.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {solicitacoes.map((sol: any) => (
                  <div
                    key={sol.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {sol.codigo}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className={`${PRIORIDADE_COR[sol.prioridade]} text-[10px] px-1.5 py-0`}>
                          {PRIORIDADE_LABEL[sol.prioridade]}
                        </Badge>
                        {sol.prazo && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Prazo: {formatarData(sol.prazo)}
                          </span>
                        )}
                      </div>
                      {sol.descricao && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 truncate max-w-[220px]">
                          {sol.descricao}
                        </p>
                      )}
                    </div>
                    <Badge className={STATUS_SOL_COR[sol.status]}>{STATUS_SOL_LABEL[sol.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
