'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { CheckCircle2, PlayCircle, Clock, Wrench, Cpu, Package, AlertCircle, User, Eye, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusEtapa = 'pendente' | 'em_andamento' | 'concluida' | 'bloqueada' | 'pulada'

interface RoteiroItem {
  id: string
  sequencia: number
  status: StatusEtapa
  processo_id: string
  maquina_id: string | null
  processos: { nome: string } | null
  maquinas: { nome: string } | null
  pecas: {
    codigo_peca: string
    descricao: string
    quantidade: number
    unidade: string
    conjuntos: {
      nome: string
      codigo_conjunto: string
      ordens_producao: {
        codigo_op: string
        obras: { nome: string } | null
      } | null
    } | null
  } | null
  conjuntos: {
    nome: string
    codigo_conjunto: string
    ordens_producao: {
      codigo_op: string
      obras: { nome: string } | null
    } | null
  } | null
  apontamentos_producao: {
    fim: string | null
    usuarios: { nome: string } | null
  }[]
}

const STATUS_CONFIG: Record<StatusEtapa, { label: string; color: string; icon: React.ElementType }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: PlayCircle },
  concluida: { label: 'Concluída', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  bloqueada: { label: 'Bloqueada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
  pulada: { label: 'Pulada', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: Clock },
}

export default function PainelPage() {
  const supabase = createClient()
  const [processos, setProcessos] = useState<{ id: string; nome: string }[]>([])
  const [maquinas, setMaquinas] = useState<{ id: string; nome: string; processo_id: string | null }[]>([])
  const [selectedProcesso, setSelectedProcesso] = useState('')
  const [selectedMaquina, setSelectedMaquina] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'pendente' | 'em_andamento' | 'todos'>('pendente')
  const [items, setItems] = useState<RoteiroItem[]>([])
  const [operadores, setOperadores] = useState<{ id: string; nome: string; funcao: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  // Modal iniciar
  const [iniciarModal, setIniciarModal] = useState(false)
  const [iniciarItem, setIniciarItem] = useState<RoteiroItem | null>(null)
  const [operadorSelecionado, setOperadorSelecionado] = useState('')

  // Modal detalhes
  const [detalheModal, setDetalheModal] = useState(false)
  const [detalheItem, setDetalheItem] = useState<RoteiroItem | null>(null)
  const [detalheRoteiro, setDetalheRoteiro] = useState<{
    id: string; sequencia: number; status: StatusEtapa
    processos: { nome: string } | null
    maquinas: { nome: string } | null
    apontamentos_producao: { fim: string | null; inicio: string; usuarios: { nome: string } | null }[]
  }[]>([])
  const [detalheLoading, setDetalheLoading] = useState(false)

  useEffect(() => {
    async function loadFiltros() {
      const [procRes, maqRes, opRes] = await Promise.all([
        supabase.from('processos').select('id, nome').eq('ativo', true).order('ordem_padrao'),
        supabase.from('maquinas').select('id, nome, processo_id').eq('ativa', true).order('nome'),
        supabase.from('usuarios').select('id, nome, funcao').eq('ativo', true).in('perfil', ['operador', 'encarregado']).order('nome'),
      ])
      setProcessos(procRes.data ?? [])
      setMaquinas(maqRes.data ?? [])
      setOperadores(opRes.data ?? [])
    }
    loadFiltros()
  }, [supabase])

  // Máquinas filtradas pelo processo selecionado
  const maquinasFiltradas = selectedProcesso
    ? maquinas.filter((m) => m.processo_id === selectedProcesso)
    : maquinas

  const load = useCallback(async () => {
    if (!selectedProcesso && !selectedMaquina) { setItems([]); return }
    setLoading(true)

    let query = supabase
      .from('roteiro_producao')
      .select(`
        id, sequencia, status, processo_id, maquina_id,
        processos(nome),
        maquinas(nome),
        pecas(
          codigo_peca, descricao, quantidade, unidade,
          conjuntos(
            nome, codigo_conjunto,
            ordens_producao(codigo_op, obras(nome))
          )
        ),
        conjuntos(
          nome, codigo_conjunto,
          ordens_producao(codigo_op, obras(nome))
        ),
        apontamentos_producao(fim, usuarios(nome))
      `)
      .order('sequencia')

    if (selectedMaquina) {
      query = query.eq('maquina_id', selectedMaquina)
    } else if (selectedProcesso) {
      query = query.eq('processo_id', selectedProcesso)
    }

    if (filtroStatus !== 'todos') {
      query = query.eq('status', filtroStatus)
    } else {
      query = query.in('status', ['pendente', 'em_andamento'])
    }

    const { data, error } = await query
    if (error) { toast('error', 'Erro ao carregar itens.') }
    setItems((data as unknown as RoteiroItem[]) ?? [])
    setLoading(false)
  }, [supabase, selectedProcesso, selectedMaquina, filtroStatus])

  useEffect(() => { load() }, [load])

  function abrirIniciarModal(item: RoteiroItem) {
    setIniciarItem(item)
    setOperadorSelecionado('')
    setIniciarModal(true)
  }

  async function abrirDetalhe(item: RoteiroItem) {
    setDetalheItem(item)
    setDetalheModal(true)
    setDetalheLoading(true)

    // Busca o peca_id ou conjunto_id do item
    const { data: ref } = await supabase
      .from('roteiro_producao')
      .select('peca_id, conjunto_id')
      .eq('id', item.id)
      .single()

    if (!ref) { setDetalheLoading(false); return }

    const field = ref.peca_id ? 'peca_id' : 'conjunto_id'
    const value = ref.peca_id ?? ref.conjunto_id

    const { data } = await supabase
      .from('roteiro_producao')
      .select(`
        id, sequencia, status,
        processos(nome),
        maquinas(nome),
        apontamentos_producao(inicio, fim, usuarios(nome))
      `)
      .eq(field, value)
      .order('sequencia')

    setDetalheRoteiro((data as any) ?? [])
    setDetalheLoading(false)
  }

  async function confirmarIniciar() {
    if (!iniciarItem) return
    if (!operadorSelecionado) { toast('error', 'Selecione o operador responsável.'); return }
    setUpdating(iniciarItem.id)

    const { error: apError } = await supabase.from('apontamentos_producao').insert({
      roteiro_id: iniciarItem.id,
      operador_id: operadorSelecionado,
      inicio: new Date().toISOString(),
      quantidade_ok: 0,
      quantidade_refugo: 0,
      quantidade_retrabalho: 0,
    })
    if (apError) { toast('error', 'Erro ao registrar apontamento.'); setUpdating(null); return }

    const { error } = await supabase.from('roteiro_producao').update({ status: 'em_andamento' }).eq('id', iniciarItem.id)
    if (error) { toast('error', 'Erro ao atualizar status.') }
    else { toast('success', 'Processo iniciado!') }

    setUpdating(null)
    setIniciarModal(false)
    setIniciarItem(null)
    load()
  }

  async function concluir(id: string) {
    setUpdating(id)
    const { error } = await supabase.from('roteiro_producao').update({ status: 'concluida' }).eq('id', id)
    if (error) { toast('error', 'Erro ao concluir.') }
    else { toast('success', 'Concluído!' ) }
    setUpdating(null)
    load()
  }

  async function mudarStatusEtapa(id: string, novoStatus: StatusEtapa) {
    const { error } = await supabase.from('roteiro_producao').update({ status: novoStatus }).eq('id', id)
    if (error) { toast('error', 'Erro ao alterar etapa.'); return }
    toast('success', 'Etapa atualizada.')
    // Recarrega o roteiro do detalhe
    if (detalheItem) {
      const { data: ref } = await supabase.from('roteiro_producao').select('peca_id, conjunto_id').eq('id', detalheItem.id).single()
      if (ref) {
        const field = ref.peca_id ? 'peca_id' : 'conjunto_id'
        const value = ref.peca_id ?? ref.conjunto_id
        const { data } = await supabase.from('roteiro_producao').select(`
          id, sequencia, status, processos(nome), maquinas(nome),
          apontamentos_producao(inicio, fim, usuarios(nome))
        `).eq(field, value).order('sequencia')
        setDetalheRoteiro((data as any) ?? [])
      }
    }
    load()
  }

  function getItemInfo(item: RoteiroItem) {
    if (item.pecas) {
      return {
        codigo: item.pecas.codigo_peca,
        nome: item.pecas.descricao,
        conjunto: item.pecas.conjuntos?.nome ?? '-',
        op: item.pecas.conjuntos?.ordens_producao?.codigo_op ?? '-',
        obra: item.pecas.conjuntos?.ordens_producao?.obras?.nome ?? '-',
        qtd: `${item.pecas.quantidade} ${item.pecas.unidade}`,
        tipo: 'Peça',
      }
    }
    if (item.conjuntos) {
      return {
        codigo: item.conjuntos.codigo_conjunto,
        nome: item.conjuntos.nome,
        conjunto: '-',
        op: item.conjuntos.ordens_producao?.codigo_op ?? '-',
        obra: item.conjuntos.ordens_producao?.obras?.nome ?? '-',
        qtd: '1 conj.',
        tipo: 'Conjunto',
      }
    }
    return null
  }

  const temFiltro = selectedProcesso || selectedMaquina

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Painel do Operador</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Selecione seu processo ou máquina para ver os itens da fila</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 rounded-2xl bg-white dark:bg-[#141414] border border-[#E0E0E0] dark:border-[#2C2C2C]">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5" /> Processo
          </label>
          <Select
            value={selectedProcesso}
            onChange={(e) => { setSelectedProcesso(e.target.value); setSelectedMaquina('') }}
          >
            <option value="">Todos os processos</option>
            {processos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" /> Máquina
          </label>
          <Select
            value={selectedMaquina}
            onChange={(e) => setSelectedMaquina(e.target.value)}
          >
            <option value="">Todas as máquinas</option>
            {maquinasFiltradas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </Select>
        </div>

        {/* Tabs de status */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Mostrar</label>
          <div className="flex rounded-xl border border-[#E0E0E0] dark:border-[#2C2C2C] overflow-hidden">
            {(['pendente', 'em_andamento', 'todos'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={cn(
                  'flex-1 text-xs font-medium py-2.5 px-2 transition-colors',
                  filtroStatus === s
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-[#FAFAFA] dark:bg-[#1A1A1A] text-gray-500 hover:bg-gray-100 dark:hover:bg-[#222]'
                )}
              >
                {s === 'pendente' ? 'Pendentes' : s === 'em_andamento' ? 'Em Andamento' : 'Todos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {!temFiltro ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Selecione um processo ou máquina</p>
          <p className="text-sm mt-1">Os itens da fila aparecerão aqui</p>
        </div>
      ) : loading ? (
        <div className="text-center py-20 text-gray-400">
          <div className="h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" />
          <p>Carregando...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum item na fila</p>
          <p className="text-sm mt-1">Tudo em dia por aqui!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {items.length} {items.length === 1 ? 'item' : 'itens'} encontrado{items.length !== 1 ? 's' : ''}
          </p>
          {items.map((item) => {
            const info = getItemInfo(item)
            if (!info) return null
            const statusCfg = STATUS_CONFIG[item.status]
            const StatusIcon = statusCfg.icon

            return (
              <div
                key={item.id}
                className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-[#141414] border border-[#E0E0E0] dark:border-[#2C2C2C] hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                {/* Sequência */}
                <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300">
                  {item.sequencia}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500">{info.codigo}</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{info.tipo}</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white text-base leading-tight truncate">{info.nome}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{info.op}</span>
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{info.obra}</span>
                    {info.conjunto !== '-' && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="text-sm text-gray-400 dark:text-gray-500 truncate">{info.conjunto}</span>
                      </>
                    )}
                  </div>
                  {item.status === 'em_andamento' && (() => {
                    const ap = item.apontamentos_producao?.find((a) => a.fim === null)
                    return ap?.usuarios?.nome ? (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{ap.usuarios.nome}</span>
                      </div>
                    ) : null
                  })()}
                </div>

                {/* Qtd */}
                <div className="shrink-0 text-right hidden sm:block">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Qtd.</p>
                  <p className="text-base font-bold text-gray-800 dark:text-gray-200">{info.qtd}</p>
                </div>

                {/* Status badge */}
                <div className={cn('shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium', statusCfg.color)}>
                  <StatusIcon className="h-4 w-4" />
                  <span className="hidden md:inline">{statusCfg.label}</span>
                </div>

                {/* Ações */}
                <div className="shrink-0 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirDetalhe(item)}
                    className="text-gray-500 hover:text-gray-900 dark:hover:text-white px-2"
                    title="Ver todo o processo"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {item.status === 'pendente' && (
                    <Button
                      size="sm"
                      disabled={updating === item.id}
                      onClick={() => abrirIniciarModal(item)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4"
                    >
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Iniciar
                    </Button>
                  )}
                  {item.status === 'em_andamento' && (
                    <Button
                      size="sm"
                      disabled={updating === item.id}
                      onClick={() => concluir(item.id)}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm px-4"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Concluir
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Detalhes do processo completo */}
      <Modal
        open={detalheModal}
        onClose={() => setDetalheModal(false)}
        title="Processo completo"
        size="lg"
      >
        {detalheItem && (() => {
          const info = getItemInfo(detalheItem)
          return info ? (
            <div className="mb-5 p-4 rounded-xl bg-gray-50 dark:bg-[#1A1A1A] border border-[#E0E0E0] dark:border-[#2C2C2C]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-gray-400">{info.codigo}</span>
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{info.tipo}</span>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white text-lg">{info.nome}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{info.op} · {info.obra}{info.conjunto !== '-' ? ` · ${info.conjunto}` : ''}</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">Qtd: {info.qtd}</p>
            </div>
          ) : null
        })()}

        {detalheLoading ? (
          <div className="text-center py-10 text-gray-400">
            <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Carregando etapas...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {detalheRoteiro.map((etapa, idx) => {
              const scfg = STATUS_CONFIG[etapa.status]
              const SIcon = scfg.icon
              const ap = etapa.apontamentos_producao?.find((a) => a.fim === null) ?? etapa.apontamentos_producao?.[etapa.apontamentos_producao.length - 1]
              const isCurrent = etapa.id === detalheItem?.id
              return (
                <div key={etapa.id} className={cn(
                  'flex items-start gap-3 p-4 rounded-xl border transition-colors',
                  isCurrent
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10'
                    : 'border-[#E0E0E0] dark:border-[#2C2C2C] bg-white dark:bg-[#141414]'
                )}>
                  {/* Linha de sequência */}
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      etapa.status === 'concluida' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      etapa.status === 'em_andamento' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    )}>
                      {etapa.sequencia}
                    </div>
                    {idx < detalheRoteiro.length - 1 && (
                      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {etapa.processos?.nome ?? '—'}
                      </p>
                      {etapa.maquinas?.nome && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Wrench className="h-3 w-3" />{etapa.maquinas.nome}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">Etapa atual</span>
                      )}
                    </div>
                    {ap?.usuarios?.nome && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{ap.usuarios.nome}</span>
                        {ap.fim && <span className="text-xs text-green-600 dark:text-green-400">· concluído</span>}
                        {!ap.fim && ap.inicio && <span className="text-xs text-blue-600 dark:text-blue-400">· em andamento</span>}
                      </div>
                    )}
                  </div>

                  <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0', scfg.color)}>
                    <SIcon className="h-3.5 w-3.5" />
                    <span>{scfg.label}</span>
                  </div>

                  {/* Controles de status */}
                  <div className="flex gap-1 shrink-0">
                    {etapa.status !== 'pendente' && (
                      <button
                        onClick={() => mudarStatusEtapa(etapa.id, 'pendente')}
                        title="Voltar para Pendente"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {etapa.status === 'pendente' && (
                      <button
                        onClick={() => mudarStatusEtapa(etapa.id, 'em_andamento')}
                        title="Marcar Em Andamento"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {etapa.status === 'em_andamento' && (
                      <button
                        onClick={() => mudarStatusEtapa(etapa.id, 'concluida')}
                        title="Marcar Concluída"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {etapa.status === 'concluida' && (
                      <button
                        onClick={() => mudarStatusEtapa(etapa.id, 'em_andamento')}
                        title="Reverter para Em Andamento"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      {/* Modal: Quem está iniciando */}
      <Modal
        open={iniciarModal}
        onClose={() => setIniciarModal(false)}
        title="Quem vai executar este processo?"
      >
        {iniciarItem && (() => {
          const info = getItemInfo(iniciarItem)
          return info ? (
            <div className="mb-5 p-4 rounded-xl bg-gray-50 dark:bg-[#1A1A1A] border border-[#E0E0E0] dark:border-[#2C2C2C]">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-0.5">{info.codigo}</p>
              <p className="font-semibold text-gray-900 dark:text-white">{info.nome}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{info.op} · {info.obra}</p>
            </div>
          ) : null
        })()}

        <div className="mb-6">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <User className="h-4 w-4" /> Operador responsável
          </label>
          {operadores.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nenhum operador cadastrado. Cadastre em Usuários.</p>
          ) : (
            <Select
              value={operadorSelecionado}
              onChange={(e) => setOperadorSelecionado(e.target.value)}
            >
              <option value="">Selecione o operador...</option>
              {operadores.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.nome}{op.funcao ? ` — ${op.funcao}` : ''}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIniciarModal(false)}>Cancelar</Button>
          <Button
            onClick={confirmarIniciar}
            disabled={!operadorSelecionado || updating === iniciarItem?.id}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <PlayCircle className="h-4 w-4 mr-1" />
            Confirmar Início
          </Button>
        </div>
      </Modal>
    </div>
  )
}
