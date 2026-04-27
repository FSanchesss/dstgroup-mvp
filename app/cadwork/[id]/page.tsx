'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import {
  ArrowLeft, Box, Maximize2, Minimize2, Package, Layers, Search,
  Building2, Factory, Calendar, ChevronDown, ChevronRight, Monitor,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { formatarData, STATUS_PECA_LABEL, STATUS_PECA_COR } from '@/lib/utils'

interface PecaRow {
  id: string
  codigo_peca: string
  descricao: string
  comprimento: number | null
  largura: number | null
  altura: number | null
  espessura: number | null
  quantidade: number
  unidade: string
  status: string
  cadwork_id: string | null
  created_at: string
}

interface ConjuntoComPecas {
  id: string
  nome: string
  codigo_conjunto: string
  modulo: string | null
  status: string
  pecas: PecaRow[]
}

interface ProjetoDetalhe {
  id: string
  nome: string
  descricao: string | null
  viewer_url: string | null
  total_pecas: number
  total_conjuntos: number
  status: string
  importado_em: string
  obras: { id: string; nome: string } | null
  ordens_producao: { id: string; codigo_op: string } | null
}

type Tab = 'viewer' | 'pecas'

const STATUS_LABEL: Record<string, string> = {
  importado: 'Importado',
  em_producao: 'Em Produção',
  concluido: 'Concluído',
}
const STATUS_COR: Record<string, string> = {
  importado: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  em_producao: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  concluido: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
}

export default function CadworkProjetoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [projeto, setProjeto] = useState<ProjetoDetalhe | null>(null)
  const [conjuntos, setConjuntos] = useState<ConjuntoComPecas[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('viewer')
  const [viewerExpanded, setViewerExpanded] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedConj, setExpandedConj] = useState<string[]>([])
  const [deletingPeca, setDeletingPeca] = useState<string | null>(null)
  const [deletingConj, setDeletingConj] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'peca' | 'conj'; id: string; nome: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [projRes, conjRes] = await Promise.all([
      supabase
        .from('cadwork_projetos')
        .select('*, obras(id, nome), ordens_producao(id, codigo_op)')
        .eq('id', id)
        .single(),
      supabase
        .from('conjuntos')
        .select('id, nome, codigo_conjunto, modulo, status, pecas(id, codigo_peca, descricao, comprimento, largura, altura, espessura, quantidade, unidade, status, cadwork_id, created_at)')
        .eq('cadwork_projeto_id', id)
        .order('nome'),
    ])

    if (projRes.error || !projRes.data) {
      toast('error', 'Projeto não encontrado.')
      router.push('/cadwork')
      return
    }

    setProjeto(projRes.data as ProjetoDetalhe)
    setConjuntos((conjRes.data ?? []) as ConjuntoComPecas[])
    setLoading(false)
  }, [id, supabase, router])

  useEffect(() => { load() }, [load])

  // Auto-switch to pieces tab if no viewer
  useEffect(() => {
    if (projeto && !projeto.viewer_url) setTab('pecas')
  }, [projeto])

  // Default expand first conjunto
  useEffect(() => {
    if (conjuntos.length > 0 && expandedConj.length === 0) {
      setExpandedConj([conjuntos[0].id])
    }
  }, [conjuntos])

  const toggleConj = (conjId: string) =>
    setExpandedConj(prev =>
      prev.includes(conjId) ? prev.filter(x => x !== conjId) : [...prev, conjId]
    )

  async function handleDeletePeca(pecaId: string) {
    setDeletingPeca(pecaId)
    const { error } = await supabase.from('pecas').delete().eq('id', pecaId)
    if (error) {
      toast('error', 'Erro ao excluir peça.')
    } else {
      toast('success', 'Peça excluída.')
      await load()
    }
    setDeletingPeca(null)
    setConfirmDelete(null)
  }

  async function handleDeleteConj(conjId: string) {
    setDeletingConj(conjId)
    // Exclui peças primeiro (cascade pode não estar ativo sem FK)
    await supabase.from('pecas').delete().eq('conjunto_id', conjId)
    const { error } = await supabase.from('conjuntos').delete().eq('id', conjId)
    if (error) {
      toast('error', 'Erro ao excluir conjunto.')
    } else {
      toast('success', 'Conjunto excluído.')
      await load()
    }
    setDeletingConj(null)
    setConfirmDelete(null)
  }

  // Filtered view
  const filteredConjuntos = conjuntos.map(c => ({
    ...c,
    pecas: search
      ? c.pecas.filter(p =>
          p.descricao.toLowerCase().includes(search.toLowerCase()) ||
          (p.cadwork_id ?? '').toLowerCase().includes(search.toLowerCase()) ||
          p.codigo_peca.toLowerCase().includes(search.toLowerCase())
        )
      : c.pecas,
  })).filter(c => !search || c.pecas.length > 0 || c.nome.toLowerCase().includes(search.toLowerCase()))

  const totalPecasFiltradas = filteredConjuntos.reduce((s, c) => s + c.pecas.length, 0)

  // Modulos únicos
  const modulos = [...new Set(conjuntos.map(c => c.modulo).filter(Boolean))] as string[]

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>
  }

  if (!projeto) return null

  return (
    <div className="p-6 space-y-5">
      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {confirmDelete.type === 'peca' ? 'Excluir peça?' : 'Excluir conjunto?'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {confirmDelete.type === 'conj'
                ? <>Isso excluirá o conjunto <strong>{confirmDelete.nome}</strong> e <strong>todas as suas peças</strong>. Esta ação não pode ser desfeita.</>
                : <>Excluir <strong>{confirmDelete.nome}</strong>? Esta ação não pode ser desfeita.</>
              }
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() =>
                  confirmDelete.type === 'peca'
                    ? handleDeletePeca(confirmDelete.id)
                    : handleDeleteConj(confirmDelete.id)
                }
                disabled={deletingPeca === confirmDelete.id || deletingConj === confirmDelete.id}
              >
                {(deletingPeca === confirmDelete.id || deletingConj === confirmDelete.id) ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/cadwork">
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 truncate">
              <Box className="h-5 w-5 shrink-0" />
              {projeto.nome}
            </h1>
            <Badge className={STATUS_COR[projeto.status] ?? STATUS_COR.importado}>
              {STATUS_LABEL[projeto.status] ?? projeto.status}
            </Badge>
          </div>
          {projeto.descricao && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{projeto.descricao}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
            {projeto.obras && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {projeto.obras.nome}
              </span>
            )}
            {projeto.ordens_producao && (
              <Link href={`/ordens-producao/${projeto.ordens_producao.id}`}>
                <span className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <Factory className="h-3.5 w-3.5" />
                  {projeto.ordens_producao.codigo_op}
                </span>
              </Link>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Importado em {formatarData(projeto.importado_em)}
            </span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projeto.total_conjuntos}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Conjuntos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projeto.total_pecas}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Peças</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{modulos.length || '–'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Módulos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className={`text-sm font-bold ${projeto.viewer_url ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
              {projeto.viewer_url ? 'Disponível' : 'Não enviado'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Viewer 3D</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setTab('viewer')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            tab === 'viewer'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Monitor className="h-4 w-4" />
          Visualizador 3D
        </button>
        <button
          onClick={() => setTab('pecas')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            tab === 'pecas'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Package className="h-4 w-4" />
          Lista de Peças
          <span className="ml-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full px-1.5 py-0.5 text-xs">
            {projeto.total_pecas}
          </span>
        </button>
      </div>

      {/* ── TAB: 3D VIEWER ─────────────────────────────── */}
      {tab === 'viewer' && (
        <div className="space-y-3">
          {projeto.viewer_url ? (
            <Card className="overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-blue-500" />
                    Modelo 3D — {projeto.nome}
                  </CardTitle>
                  <div className="flex gap-2">
                    <a
                      href={projeto.viewer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                        <Maximize2 className="h-3.5 w-3.5" />
                        Tela cheia
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-7 text-xs"
                      onClick={() => setViewerExpanded(v => !v)}
                    >
                      {viewerExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                      {viewerExpanded ? 'Reduzir' : 'Expandir'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <iframe
                  src={projeto.viewer_url}
                  title={`Visualizador 3D — ${projeto.nome}`}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  className={`w-full border-0 transition-all duration-300 ${viewerExpanded ? 'h-[80vh]' : 'h-[60vh]'}`}
                  loading="lazy"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
              <Monitor className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">Visualizador 3D não disponível</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Nenhum arquivo HTML foi enviado para este projeto.
              </p>
              <p className="text-xs text-gray-400 mt-3">
                Para adicionar o viewer, exporte o HTML WebViewer do Cadwork e reimporte o projeto.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PEÇAS ─────────────────────────────────── */}
      {tab === 'pecas' && (
        <div className="space-y-4">
          {/* Search + summary */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Buscar por ID Cadwork, descrição, código..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {search && (
              <span className="text-xs text-gray-500">
                {totalPecasFiltradas} resultado{totalPecasFiltradas !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Módulos filter (se existir) */}
          {modulos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400 self-center">Módulos:</span>
              {modulos.map(m => (
                <Badge key={m} className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs cursor-default">
                  {m}
                </Badge>
              ))}
            </div>
          )}

          {/* Conjuntos + Peças */}
          {filteredConjuntos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Nenhuma peça encontrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredConjuntos.map(conj => {
                const isExpanded = expandedConj.includes(conj.id)
                const pecasAguardando = conj.pecas.filter(p => p.status === 'aguardando_producao').length
                const pecasEmProcesso = conj.pecas.filter(p => p.status === 'em_processo').length

                return (
                  <Card key={conj.id} className="overflow-hidden">
                    {/* Conjunto header */}
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => toggleConj(conj.id)}
                        className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                        }
                        <Layers className="h-4 w-4 text-purple-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{conj.nome}</span>
                            <span className="text-xs text-gray-400 font-mono">{conj.codigo_conjunto}</span>
                            {conj.modulo && (
                              <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs">
                                {conj.modulo}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {pecasEmProcesso > 0 && (
                            <span className="text-xs text-blue-600 dark:text-blue-400">{pecasEmProcesso} em processo</span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">{conj.pecas.length} peças</span>
                        </div>
                      </button>
                      {/* Botão excluir conjunto */}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setConfirmDelete({ type: 'conj', id: conj.id, nome: conj.nome }) }}
                        className="px-3 py-3 text-gray-400 hover:text-red-500 transition-colors"
                        title="Excluir conjunto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Peças table */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50">
                              <th className="text-left px-4 py-2 text-gray-500 font-medium">ID Cadwork</th>
                              <th className="text-left px-3 py-2 text-gray-500 font-medium">Código Sistema</th>
                              <th className="text-left px-3 py-2 text-gray-500 font-medium">Descrição</th>
                              <th className="text-right px-3 py-2 text-gray-500 font-medium">Qtd</th>
                              <th className="text-right px-3 py-2 text-gray-500 font-medium">Comp (mm)</th>
                              <th className="text-right px-3 py-2 text-gray-500 font-medium">Larg (mm)</th>
                              <th className="text-right px-3 py-2 text-gray-500 font-medium">Alt (mm)</th>
                              <th className="text-left px-3 py-2 text-gray-500 font-medium">Status</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {conj.pecas.map(peca => (
                              <tr
                                key={peca.id}
                                className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                              >
                                <td className="px-4 py-2 font-mono text-blue-600 dark:text-blue-400 font-medium">
                                  {peca.cadwork_id ?? '—'}
                                </td>
                                <td className="px-3 py-2 font-mono text-gray-500 text-xs">{peca.codigo_peca}</td>
                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                                  {peca.descricao}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{peca.quantidade}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{peca.comprimento ?? '–'}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{peca.largura ?? '–'}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{peca.altura ?? '–'}</td>
                                <td className="px-3 py-2">
                                  <Badge className={`${STATUS_PECA_COR[peca.status] ?? ''} text-xs`}>
                                    {STATUS_PECA_LABEL[peca.status] ?? peca.status}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDelete({ type: 'peca', id: peca.id, nome: peca.descricao })}
                                    disabled={deletingPeca === peca.id}
                                    className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    title="Excluir peça"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {conj.pecas.length === 0 && (
                          <p className="text-center py-4 text-xs text-gray-400">Nenhuma peça neste conjunto.</p>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
