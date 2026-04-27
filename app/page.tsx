import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Factory,
  Building2,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Package,
  ArrowRight,
  Layers,
  Truck,
  ScanLine,
} from 'lucide-react'
import Link from 'next/link'
import { ProducaoSemanalChart, OpsStatusChart } from '@/components/dashboard/charts'

async function getDashboardData() {
  const supabase = await createServerSupabaseClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [obras, ops, solicitacoes, pecas, ncs, apontamentos, opsBlockedDetail] = await Promise.all([
    supabase.from('obras').select('status'),
    supabase.from('ordens_producao').select('status'),
    supabase.from('solicitacoes').select('status'),
    supabase.from('pecas').select('status'),
    supabase
      .from('nao_conformidades')
      .select('id, descricao, status, created_at')
      .in('status', ['aberta', 'em_analise', 'em_correcao'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('apontamentos_producao')
      .select('inicio, quantidade_ok, quantidade_refugo, quantidade_retrabalho')
      .gte('inicio', sevenDaysAgo),
    supabase
      .from('ordens_producao')
      .select('id, codigo_op, prazo, obras(nome)')
      .eq('status', 'bloqueada')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const obrasData = obras.data ?? []
  const opsData = ops.data ?? []
  const solData = solicitacoes.data ?? []
  const pecasData = pecas.data ?? []
  const apData = apontamentos.data ?? []

  // Daily production breakdown — last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })

  const dailyMap: Record<string, { ok: number; refugo: number; retrabalho: number }> = {}
  last7Days.forEach((day) => {
    dailyMap[day] = { ok: 0, refugo: 0, retrabalho: 0 }
  })

  apData.forEach((a) => {
    const day = new Date(a.inicio).toISOString().split('T')[0]
    if (dailyMap[day]) {
      dailyMap[day].ok += Number(a.quantidade_ok ?? 0)
      dailyMap[day].refugo += Number(a.quantidade_refugo ?? 0)
      dailyMap[day].retrabalho += Number(a.quantidade_retrabalho ?? 0)
    }
  })

  const producaoDiaria = last7Days.map((day) => {
    const date = new Date(day + 'T12:00:00')
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' })
    const dayNum = date.toLocaleDateString('pt-BR', { day: '2-digit' })
    return { day: `${weekday} ${dayNum}`, ...dailyMap[day] }
  })

  // OPs by status
  const countByStatus = (status: string) => opsData.filter((o) => o.status === status).length
  const opsStatusData = [
    { label: 'Em Produção', count: countByStatus('em_producao'), color: '#3b82f6' },
    { label: 'Planejada', count: countByStatus('planejada'), color: '#8b5cf6' },
    { label: 'Criada', count: countByStatus('criada'), color: '#9ca3af' },
    { label: 'Bloqueada', count: countByStatus('bloqueada'), color: '#ef4444' },
    { label: 'Concluída', count: countByStatus('concluida'), color: '#22c55e' },
    { label: 'Expedida', count: countByStatus('expedida'), color: '#14b8a6' },
    { label: 'Parcial', count: countByStatus('parcialmente_concluida'), color: '#f59e0b' },
  ]

  const totalQtdOk = apData.reduce((s, a) => s + Number(a.quantidade_ok ?? 0), 0)
  const totalRefugo = apData.reduce((s, a) => s + Number(a.quantidade_refugo ?? 0), 0)
  const taxaRefugo =
    totalQtdOk + totalRefugo > 0
      ? ((totalRefugo / (totalQtdOk + totalRefugo)) * 100).toFixed(1)
      : '0.0'
  const taxaRefugoNum = parseFloat(taxaRefugo)

  return {
    obrasAtivas: obrasData.filter((o) => o.status === 'ativa').length,
    obrasConcluidas: obrasData.filter((o) => o.status === 'concluida').length,
    opsEmProducao: countByStatus('em_producao'),
    opsBloqueadas: countByStatus('bloqueada'),
    opsTotal: opsData.length,
    opsExpedidas: countByStatus('expedida'),
    solicitacoesAbertas: solData.filter(
      (s) => s.status === 'aberta' || s.status === 'em_analise'
    ).length,
    solicitacoesTotal: solData.length,
    pecasEmRetrabalho: pecasData.filter((p) => p.status === 'retrabalho').length,
    pecasParadas: pecasData.filter((p) => p.status === 'parada').length,
    ncsAbertas: ncs.data?.length ?? 0,
    taxaRefugo,
    taxaRefugoNum,
    totalQtdOk,
    totalRefugo,
    producaoDiaria,
    opsStatusData,
    opsBlockedDetail: (opsBlockedDetail.data ?? []) as unknown as Array<{
      id: string
      codigo_op: string
      prazo: string | null
      obras: { nome: string } | null
    }>,
    ncsDetail: (ncs.data ?? []) as Array<{
      id: string
      descricao: string
      status: string
      created_at: string
    }>,
  }
}

async function OPStatusList() {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('ordens_producao')
    .select('id, codigo_op, status, prazo, obras(nome)')
    .order('created_at', { ascending: false })
    .limit(8)

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        Nenhuma ordem de produção ainda.
      </p>
    )
  }

  const statusColors: Record<string, string> = {
    criada: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    planejada: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    em_producao: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    parcialmente_concluida: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    concluida: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    bloqueada: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    cancelada: 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-500',
    expedida: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400',
  }

  const statusLabel: Record<string, string> = {
    criada: 'Criada',
    planejada: 'Planejada',
    em_producao: 'Em Produção',
    parcialmente_concluida: 'Parcial',
    concluida: 'Concluída',
    bloqueada: 'Bloqueada',
    cancelada: 'Cancelada',
    expedida: 'Expedida',
  }

  return (
    <div className="divide-y divide-gray-50 dark:divide-gray-800">
      {(data as any[]).map((op) => (
        <Link
          key={op.id}
          href={`/ordens-producao/${op.id}`}
          className="flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {op.codigo_op}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{op.obras?.nome ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {op.prazo && (
              <span className="text-xs text-gray-400 hidden sm:block">
                {new Date(op.prazo).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            )}
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                statusColors[op.status] ?? 'bg-gray-100 text-gray-600'
              }`}
            >
              {statusLabel[op.status] ?? op.status}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const taxaRefugoColor =
    data.taxaRefugoNum === 0
      ? 'text-gray-900 dark:text-gray-100'
      : data.taxaRefugoNum < 5
      ? 'text-green-600 dark:text-green-400'
      : data.taxaRefugoNum < 10
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400'

  const hasCritical = data.opsBloqueadas > 0 || data.ncsAbertas > 0

  const ncStatusLabel: Record<string, string> = {
    aberta: 'Aberta',
    em_analise: 'Em Análise',
    em_correcao: 'Em Correção',
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{hoje}</p>
        </div>
        <Link
          href="/ordens-producao"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-[#1A1A1A] dark:text-gray-300 border border-[#E0E0E0] dark:border-[#2C2C2C] rounded-lg px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Ver todas as OPs →
        </Link>
      </div>

      {/* ── Alerta crítico ── */}
      {hasCritical && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">
            <span className="font-semibold">Atenção:</span>
            {data.opsBloqueadas > 0 && (
              <> {data.opsBloqueadas} OP{data.opsBloqueadas > 1 ? 's' : ''} bloqueada{data.opsBloqueadas > 1 ? 's' : ''}</>
            )}
            {data.opsBloqueadas > 0 && data.ncsAbertas > 0 && ' ·'}
            {data.ncsAbertas > 0 && (
              <> {data.ncsAbertas} NC{data.ncsAbertas > 1 ? 's' : ''} aberta{data.ncsAbertas > 1 ? 's' : ''}</>
            )}
            {' '}requerem atenção imediata.
          </p>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Obras Ativas</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.obrasAtivas}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{data.obrasConcluidas} concluída{data.obrasConcluidas !== 1 ? 's' : ''}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">OPs em Produção</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.opsEmProducao}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {data.opsBloqueadas > 0
                    ? <span className="text-red-500 font-medium">{data.opsBloqueadas} bloqueada{data.opsBloqueadas > 1 ? 's' : ''}</span>
                    : `${data.opsTotal} no total`}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20">
                <Factory className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Aprovadas (7d)</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data.totalQtdOk}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{data.totalRefugo} refugada{data.totalRefugo !== 1 ? 's' : ''}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Taxa de Refugo (7d)</p>
                <p className={`text-3xl font-bold mt-1 ${taxaRefugoColor}`}>{data.taxaRefugo}%</p>
                <p className="text-xs text-gray-400 mt-1">
                  {data.taxaRefugoNum === 0
                    ? 'Sem refugo esta semana'
                    : data.taxaRefugoNum < 5
                    ? 'Dentro da meta'
                    : data.taxaRefugoNum < 10
                    ? 'Acima do ideal'
                    : 'Crítico — acima de 10%'}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${
                data.taxaRefugoNum === 0 ? 'bg-gray-50 dark:bg-gray-800' :
                data.taxaRefugoNum < 5 ? 'bg-green-50 dark:bg-green-900/20' :
                data.taxaRefugoNum < 10 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <TrendingUp className={`h-5 w-5 ${
                  data.taxaRefugoNum === 0 ? 'text-gray-400' :
                  data.taxaRefugoNum < 5 ? 'text-green-600' :
                  data.taxaRefugoNum < 10 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Funil de produção ── */}
      <Card>
        <CardContent className="py-4">
          <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-3">
            Funil de Produção
          </p>
          <div className="flex items-center gap-1 sm:gap-2">
            {[
              { label: 'Solicitações abertas', value: data.solicitacoesAbertas, href: '/solicitacoes', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' },
              { label: 'OPs planejadas', value: data.opsStatusData.find(s => s.label === 'Planejada')?.count ?? 0, href: '/ordens-producao', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
              { label: 'Em produção', value: data.opsEmProducao, href: '/ordens-producao', color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' },
              { label: 'Expedidas', value: data.opsExpedidas, href: '/expedicao', color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center flex-1 min-w-0">
                <Link
                  href={step.href}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-center hover:opacity-80 transition-opacity ${step.color}`}
                >
                  <p className="text-xl font-bold">{step.value}</p>
                  <p className="text-[11px] font-medium leading-tight mt-0.5 truncate">{step.label}</p>
                </Link>
                {i < 3 && (
                  <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0 mx-1" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="md:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Produção Semanal</CardTitle>
            <p className="text-xs text-gray-400">Peças aprovadas, refugadas e em retrabalho — últimos 7 dias</p>
          </CardHeader>
          <CardContent className="pt-3">
            <ProducaoSemanalChart data={data.producaoDiaria} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">OPs por Status</CardTitle>
            <p className="text-xs text-gray-400">Distribuição atual</p>
          </CardHeader>
          <CardContent className="pt-3">
            <OpsStatusChart data={data.opsStatusData} />
          </CardContent>
        </Card>
      </div>

      {/* ── Linha inferior: Itens críticos | Últimas OPs | Ações rápidas ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Itens críticos */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Itens Críticos</CardTitle>
              {hasCritical && (
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold px-2 py-0.5 rounded-full">
                  {data.opsBloqueadas + data.ncsAbertas}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!hasCritical ? (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <p className="text-sm text-gray-500 font-medium">Tudo em ordem</p>
                <p className="text-xs text-gray-400">Nenhuma OP bloqueada ou NC aberta</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.opsBlockedDetail.map((op) => (
                  <Link
                    key={op.id}
                    href={`/ordens-producao/${op.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-400">{op.codigo_op}</p>
                      <p className="text-xs text-red-500 dark:text-red-500 truncate">{op.obras?.nome ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {op.prazo && (
                        <span className="text-xs text-red-400 dark:text-red-500">
                          {new Date(op.prazo).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                      <span className="text-xs font-medium bg-red-200 dark:bg-red-900/50 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded">Bloqueada</span>
                    </div>
                  </Link>
                ))}
                {data.ncsDetail.map((nc) => (
                  <div
                    key={nc.id}
                    className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-orange-800 dark:text-orange-400 line-clamp-2 flex-1">{nc.descricao}</p>
                      <span className="text-xs font-medium bg-orange-200 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded shrink-0">
                        {ncStatusLabel[nc.status] ?? nc.status}
                      </span>
                    </div>
                    <p className="text-xs text-orange-400 dark:text-orange-600 mt-1">
                      {new Date(nc.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas OPs */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Últimas OPs</CardTitle>
              <Link
                href="/ordens-producao"
                className="text-xs text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                Ver todas →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <OPStatusList />
          </CardContent>
        </Card>

        {/* Ações rápidas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                {
                  href: '/solicitacoes',
                  icon: ClipboardList,
                  label: 'Nova Solicitação',
                  desc: 'Abrir pedido de produção',
                  color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
                },
                {
                  href: '/apontamento',
                  icon: Layers,
                  label: 'Apontar Produção',
                  desc: 'Registrar execução de etapa',
                  color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
                },
                {
                  href: '/rastreabilidade',
                  icon: ScanLine,
                  label: 'Rastrear Peça',
                  desc: 'Histórico por código ou QR',
                  color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
                },
                {
                  href: '/expedicao',
                  icon: Truck,
                  label: 'Expedição',
                  desc: 'Registrar saída de material',
                  color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20',
                },
                {
                  href: '/obras',
                  icon: Building2,
                  label: 'Obras',
                  desc: 'Gerenciar obras cadastradas',
                  color: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className={`p-2 rounded-lg shrink-0 ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 ml-auto shrink-0 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

