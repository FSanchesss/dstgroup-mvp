'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormField, Select, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import {
  Plus, ArrowLeft, Layers, Package, QrCode, ChevronDown, ChevronRight, ListChecks, Route,
  Play, CheckCircle, Pencil, Printer, HelpCircle,
} from 'lucide-react'
import {
  formatarData,
  STATUS_OP_LABEL, STATUS_OP_COR,
  PRIORIDADE_LABEL, PRIORIDADE_COR,
  STATUS_PECA_LABEL, STATUS_PECA_COR,
} from '@/lib/utils'
import QRCode from 'react-qr-code'
import Link from 'next/link'

export default function OPDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [op, setOp] = useState<any>(null)
  const [conjuntos, setConjuntos] = useState<any[]>([])
  const [processos, setProcessos] = useState<any[]>([])
  const [maquinas, setMaquinas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedConj, setExpandedConj] = useState<string[]>([])

  // Modal conjuntos
  const [openConj, setOpenConj] = useState(false)
  const [formConj, setFormConj] = useState({ nome: '', descricao: '', local_aplicacao: '' })
  const [savingConj, setSavingConj] = useState(false)

  // Modal peças
  const [openPeca, setOpenPeca] = useState(false)
  const [pecaConjuntoId, setPecaConjuntoId] = useState('')
  const [formPeca, setFormPeca] = useState({
    descricao: '', comprimento: '', largura: '', altura: '', espessura: '',
    quantidade: '1', unidade: 'un',
  })
  const [codigoPecaCustom, setCodigoPecaCustom] = useState('')
  const [editandoCodigo, setEditandoCodigo] = useState(false)
  const [savingPeca, setSavingPeca] = useState(false)
  const [openNomenclaturaHelp, setOpenNomenclaturaHelp] = useState(false)

  // QR Code modal
  const [qrPeca, setQrPeca] = useState<{ codigo: string; descricao: string } | null>(null)

  // Modal roteiro individual
  const [openRoteiro, setOpenRoteiro] = useState(false)
  const [roteiroPeca, setRoteiroPeca] = useState<{ id: string; codigo: string; descricao: string } | null>(null)
  const [roteiroSteps, setRoteiroSteps] = useState<any[]>([])
  const [formRoteiro, setFormRoteiro] = useState({ processo_id: '', maquina_id: '', obrigatorio: true })
  const [savingRoteiro, setSavingRoteiro] = useState(false)

  // Seleção múltipla + roteiro em massa
  const [selectedPecas, setSelectedPecas] = useState<string[]>([])
  const [openRoteiroMassa, setOpenRoteiroMassa] = useState(false)
  const [massaSteps, setMassaSteps] = useState<{ processo_id: string; maquina_id: string; obrigatorio: boolean }[]>([])
  const [formMassa, setFormMassa] = useState({ processo_id: '', maquina_id: '', obrigatorio: true })
  const [savingMassa, setSavingMassa] = useState(false)

  // Apontamento por conjunto
  const [openApontConj, setOpenApontConj] = useState(false)
  const [conjApoint, setConjApoint] = useState<any>(null)
  const [apontEtapaId, setApontEtapaId] = useState('')
  const [apontOperador, setApontOperador] = useState('')
  const [apontQtdMap, setApontQtdMap] = useState<Record<string, string>>({})
  const [apontObs, setApontObs] = useState('')
  const [savingApoint, setSavingApoint] = useState(false)
  const [operadores, setOperadores] = useState<{ id: string; nome: string; perfil: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const [opRes, conjRes, procRes, maqRes] = await Promise.all([
      supabase
        .from('ordens_producao')
        .select('*, obras(nome, cliente), usuarios(nome), solicitacoes(usuarios!solicitante_id(nome))')
        .eq('id', id)
        .single(),
      supabase
        .from('conjuntos')
        .select('*, pecas(*, roteiro_producao(id, sequencia, status, obrigatorio, processos(id, nome), maquinas(id, nome)))')
        .eq('op_id', id)
        .order('created_at', { ascending: true }),
      supabase.from('processos').select('id, nome').eq('ativo', true).order('ordem_padrao'),
      supabase.from('maquinas').select('id, nome').eq('ativa', true),
    ])
    setOp(opRes.data)
    setConjuntos(conjRes.data ?? [])
    setProcessos(procRes.data ?? [])
    setMaquinas(maqRes.data ?? [])
    setLoading(false)
  }, [id, supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    supabase.from('usuarios').select('id, nome, perfil').order('nome').then(({ data }) => {
      setOperadores(data ?? [])
    })
  }, [supabase])

  async function gerarCodigoConjunto(opCodigo: string): Promise<string> {
    const { count } = await supabase
      .from('conjuntos')
      .select('*', { count: 'exact', head: true })
      .eq('op_id', id)
    const seq = String((count ?? 0) + 1).padStart(3, '0')
    return `${opCodigo}-CJ${seq}`
  }

  async function gerarCodigoPeca(): Promise<string> {
    // Palavras ignoradas em nomes compostos
    const stopWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'as', 'os'])
    function inicial(nome: string | null | undefined): string {
      if (!nome) return '0'
      const palavras = nome.toUpperCase().replace(/[^A-Z\s]/g, '').split(/\s+/).filter((p) => !stopWords.has(p.toLowerCase()) && p.length > 0)
      return palavras[0]?.[0] ?? '0'
    }
    const o = inicial(op.obras?.nome)                      // Obra
    const cl = inicial(op.obras?.cliente)                 // Cliente
    const s = inicial(op.solicitacoes?.usuarios?.nome)    // Solicitante
    const e = inicial(op.usuarios?.nome)                  // Encarregado
    const prefix = `${o}${cl}${s}${e}`
    const { count } = await supabase
      .from('pecas')
      .select('*', { count: 'exact', head: true })
      .like('codigo_peca', `${prefix}-%`)
    const seq = String((count ?? 0) + 1).padStart(4, '0')
    return `${prefix}-${seq}`
  }

  async function handleSaveConjunto() {
    if (!formConj.nome.trim()) { toast('error', 'Nome obrigatório.'); return }
    setSavingConj(true)
    const codigo = await gerarCodigoConjunto(op.codigo_op)
    const { error } = await supabase.from('conjuntos').insert({
      op_id: id,
      codigo_conjunto: codigo,
      nome: formConj.nome.trim(),
      descricao: formConj.descricao || null,
      local_aplicacao: formConj.local_aplicacao || null,
      status: 'aguardando_producao',
    })
    if (error) { toast('error', 'Erro ao criar conjunto.'); setSavingConj(false); return }
    toast('success', `Conjunto ${codigo} criado.`)
    setSavingConj(false)
    setOpenConj(false)
    setFormConj({ nome: '', descricao: '', local_aplicacao: '' })
    load()
  }

  async function handleSavePeca() {
    if (!formPeca.descricao.trim()) { toast('error', 'Descrição obrigatória.'); return }
    const codigoFinal = codigoPecaCustom.trim().toUpperCase()
    if (!codigoFinal) { toast('error', 'Código obrigatório.'); return }
    // Verificar unicidade se foi customizado
    const { count } = await supabase.from('pecas').select('*', { count: 'exact', head: true }).eq('codigo_peca', codigoFinal)
    if ((count ?? 0) > 0) { toast('error', 'Esse código já está em uso. Escolha outro.'); return }
    setSavingPeca(true)
    const conjunto = conjuntos.find((c) => c.id === pecaConjuntoId)
    if (!conjunto) { toast('error', 'Conjunto não encontrado.'); setSavingPeca(false); return }
    const qrCode = `ZETWOOD|${codigoFinal}`
    const { error } = await supabase.from('pecas').insert({
      conjunto_id: pecaConjuntoId,
      codigo_peca: codigoFinal,
      descricao: formPeca.descricao.trim(),
      comprimento: formPeca.comprimento ? Number(formPeca.comprimento) : null,
      largura: formPeca.largura ? Number(formPeca.largura) : null,
      altura: formPeca.altura ? Number(formPeca.altura) : null,
      espessura: formPeca.espessura ? Number(formPeca.espessura) : null,
      quantidade: Number(formPeca.quantidade) || 1,
      unidade: formPeca.unidade,
      status: 'aguardando_producao',
      qr_code: qrCode,
    })
    if (error) { toast('error', 'Erro ao criar peça.'); setSavingPeca(false); return }
    toast('success', `Peça ${codigoFinal} criada.`)
    setSavingPeca(false)
    setOpenPeca(false)
    setFormPeca({ descricao: '', comprimento: '', largura: '', altura: '', espessura: '', quantidade: '1', unidade: 'un' })
    setCodigoPecaCustom('')
    setEditandoCodigo(false)
    load()
  }

  async function atualizarStatusOP(status: string) {
    const { error } = await supabase
      .from('ordens_producao')
      .update({ status })
      .eq('id', id)
    if (error) { toast('error', 'Erro ao atualizar status.'); return }
    toast('success', 'Status atualizado.')
    load()
  }

  function abrirRoteiro(peca: any) {
    const steps = (peca.roteiro_producao ?? []).sort((a: any, b: any) => a.sequencia - b.sequencia)
    setRoteiroSteps(steps)
    setRoteiroPeca({ id: peca.id, codigo: peca.codigo_peca, descricao: peca.descricao })
    setFormRoteiro({ processo_id: '', maquina_id: '', obrigatorio: true })
    setOpenRoteiro(true)
  }

  async function handleAddEtapaRoteiro() {
    if (!formRoteiro.processo_id) { toast('error', 'Selecione o processo.'); return }
    if (!roteiroPeca) return
    setSavingRoteiro(true)
    const nextSeq = roteiroSteps.length + 1
    const { error } = await supabase.from('roteiro_producao').insert({
      peca_id: roteiroPeca.id,
      processo_id: formRoteiro.processo_id,
      maquina_id: formRoteiro.maquina_id || null,
      sequencia: nextSeq,
      obrigatorio: formRoteiro.obrigatorio,
      status: 'pendente',
    })
    if (error) { toast('error', 'Erro ao adicionar etapa.'); setSavingRoteiro(false); return }
    setSavingRoteiro(false)
    setFormRoteiro({ processo_id: '', maquina_id: '', obrigatorio: true })
    // Refresh roteiro steps from DB
    const { data } = await supabase
      .from('roteiro_producao')
      .select('id, sequencia, status, obrigatorio, processos(id, nome), maquinas(id, nome)')
      .eq('peca_id', roteiroPeca.id)
      .order('sequencia', { ascending: true })
    setRoteiroSteps(data ?? [])
    load()
  }

  async function handleRemoverEtapa(etapaId: string) {
    await supabase.from('roteiro_producao').delete().eq('id', etapaId)
    setRoteiroSteps((prev) => prev.filter((e) => e.id !== etapaId))
    load()
  }

  function toggleSelectPeca(pecaId: string) {
    setSelectedPecas((prev) =>
      prev.includes(pecaId) ? prev.filter((x) => x !== pecaId) : [...prev, pecaId]
    )
  }

  function toggleSelectAllInConj(pecas: any[]) {
    const ids = pecas.map((p: any) => p.id)
    const allSelected = ids.every((id) => selectedPecas.includes(id))
    if (allSelected) {
      setSelectedPecas((prev) => prev.filter((x) => !ids.includes(x)))
    } else {
      setSelectedPecas((prev) => Array.from(new Set([...prev, ...ids])))
    }
  }

  async function handleSalvarRoteiroMassa() {
    if (selectedPecas.length === 0) return
    if (massaSteps.length === 0) { toast('error', 'Adicione pelo menos uma etapa.'); return }
    setSavingMassa(true)
    const rows: any[] = []
    for (const pecaId of selectedPecas) {
      massaSteps.forEach((step, idx) => {
        rows.push({
          peca_id: pecaId,
          processo_id: step.processo_id,
          maquina_id: step.maquina_id || null,
          sequencia: idx + 1,
          obrigatorio: step.obrigatorio,
          status: 'pendente',
        })
      })
    }
    const { error } = await supabase.from('roteiro_producao').insert(rows)
    if (error) { toast('error', 'Erro ao salvar roteiro em massa.'); setSavingMassa(false); return }
    toast('success', `Roteiro aplicado em ${selectedPecas.length} peça(s).`)
    setSavingMassa(false)
    setOpenRoteiroMassa(false)
    setMassaSteps([])
    setSelectedPecas([])
    load()
  }

  async function handleApontarConjunto() {
    if (!conjApoint || !apontEtapaId) { toast('error', 'Selecione uma etapa do roteiro.'); return }
    const pecas: any[] = conjApoint.pecas ?? []
    if (pecas.length === 0) { toast('error', 'Nenhuma peça neste conjunto.'); return }
    setSavingApoint(true)

    // Use selected operador ID directly
    const operadorId: string | null = apontOperador || null

    const agora = new Date().toISOString()
    const rows: any[] = []
    const pecaIds: string[] = []

    for (const peca of pecas) {
      // Encontrar a etapa de mesmo processo em cada peça
      const etapaProcesso = (peca.roteiro_producao ?? []).find(
        (e: any) => e.id === apontEtapaId || e.processo_id === apontEtapaId
      )
      // Busca pela etapa que corresponde ao processo selecionado
      const etapaRef = (peca.roteiro_producao ?? []).find(
        (e: any) => e.processos?.id === apontEtapaId
      )
      if (!etapaRef) continue
      rows.push({
        roteiro_id: etapaRef.id,
        operador_id: operadorId,
        inicio: agora,
        fim: agora,
        quantidade_ok: Number(apontQtdMap[peca.id] ?? peca.quantidade ?? 1),
        quantidade_refugo: 0,
        quantidade_retrabalho: 0,
        observacoes: apontObs || null,
      })
      pecaIds.push(peca.id)
      await supabase.from('roteiro_producao').update({ status: 'concluida' }).eq('id', etapaRef.id)
    }

    if (rows.length > 0) {
      await supabase.from('apontamentos_producao').insert(rows)
      await supabase.from('pecas').update({ status: 'em_processo' }).in('id', pecaIds)
    }

    toast('success', `Apontamento registrado para ${rows.length} peça(s).`)
    setSavingApoint(false)
    setOpenApontConj(false)
    setConjApoint(null)
    setApontEtapaId('')
    setApontOperador('')
    setApontQtdMap({})
    setApontObs('')
    load()
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>
  if (!op) return <div className="p-8 text-center text-gray-400">OP não encontrada.</div>

  const totalPecas = conjuntos.reduce((s: number, c: any) => s + (c.pecas?.length ?? 0), 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/ordens-producao">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{op.codigo_op}</h1>
            <Badge className={STATUS_OP_COR[op.status]}>{STATUS_OP_LABEL[op.status]}</Badge>
            <Badge className={PRIORIDADE_COR[op.prioridade]}>{PRIORIDADE_LABEL[op.prioridade]}</Badge>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">{op.obras?.nome}</p>
        </div>
        <div className="flex gap-2">
          {op.status === 'criada' && (
            <Button variant="outline" size="sm" onClick={() => atualizarStatusOP('em_producao')}>
              <Play className="h-3.5 w-3.5" />
              Iniciar Produção
            </Button>
          )}
          {op.status === 'em_producao' && (
            <Button variant="outline" size="sm" onClick={() => atualizarStatusOP('concluida')}>
              <CheckCircle className="h-3.5 w-3.5" />
              Concluir OP
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Obra', value: op.obras?.nome ?? '-' },
          { label: 'Cliente', value: op.obras?.cliente ?? '-' },
          { label: 'Encarregado', value: op.usuarios?.nome ?? '-' },
          { label: 'Prazo', value: op.prazo ? formatarData(op.prazo) : '-' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conjuntos e Peças */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Conjuntos e Peças</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {conjuntos.length} conjunto(s) · {totalPecas} peça(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedPecas.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setMassaSteps([]); setOpenRoteiroMassa(true) }}
            >
              <ListChecks className="h-3.5 w-3.5" />
              Roteiro em Massa ({selectedPecas.length})
            </Button>
          )}
          <Button onClick={() => setOpenConj(true)}>
            <Plus className="h-4 w-4" /> Novo Conjunto
          </Button>
        </div>
      </div>

      {conjuntos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Layers className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="text-gray-400 text-sm">Nenhum conjunto adicionado.</p>
            <Button className="mt-4" onClick={() => setOpenConj(true)}>
              <Plus className="h-4 w-4" /> Adicionar Conjunto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conjuntos.map((conj: any) => {
            const isExpanded = expandedConj.includes(conj.id)
            const pecas = conj.pecas ?? []
            const allSelected = pecas.length > 0 && pecas.every((p: any) => selectedPecas.includes(p.id))
            return (
              <Card key={conj.id}>
                <div
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() =>
                    setExpandedConj((prev) =>
                      isExpanded ? prev.filter((x) => x !== conj.id) : [...prev, conj.id]
                    )
                  }
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {conj.codigo_conjunto}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{conj.nome}</span>
                      <Badge className={STATUS_PECA_COR[conj.status]}>
                        {STATUS_PECA_LABEL[conj.status]}
                      </Badge>
                    </div>
                    {conj.local_aplicacao && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{conj.local_aplicacao}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    {pecas.length} peça(s)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setConjApoint(conj)
                      setApontEtapaId('')
                      setApontOperador('')
                      setApontQtdMap({})
                      setApontObs('')
                      setOpenApontConj(true)
                    }}
                  >
                    <Layers className="h-3.5 w-3.5" /> Apontar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation()
                      setPecaConjuntoId(conj.id)
                      const c = await gerarCodigoPeca()
                      setCodigoPecaCustom(c)
                      setEditandoCodigo(false)
                      setOpenPeca(true)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Peça
                  </Button>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800">
                    {pecas.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">
                        Nenhuma peça neste conjunto.
                      </p>
                    ) : (
                      <>
                        {/* Header da lista de peças */}
                        <div className="flex items-center gap-3 px-5 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleSelectAllInConj(pecas)}
                            className="accent-gray-900 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                            title="Selecionar todas as peças deste conjunto"
                          />
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-1">Código / Descrição</span>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-32 text-right">Dimensões (mm)</span>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16 text-right">Qtd</span>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 text-center">Status</span>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 text-center">QR</span>
                        </div>

                        {/* Linhas de peça */}
                        {pecas.map((peca: any) => {
                          const nEtapas = peca.roteiro_producao?.length ?? 0
                          const semRoteiro = nEtapas === 0
                          const isChecked = selectedPecas.includes(peca.id)
                          return (
                            <div key={peca.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                              {/* Linha principal */}
                              <div className={`flex items-center gap-3 px-5 py-2.5 transition-colors ${isChecked ? 'bg-gray-50 dark:bg-gray-800/40' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/20'}`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectPeca(peca.id)}
                                  className="accent-gray-900 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
                                      {peca.codigo_peca}
                                    </span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{peca.descricao}</span>
                                  </div>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 w-32 text-right shrink-0">
                                  {[peca.comprimento, peca.largura, peca.altura].filter(Boolean).join(' × ') || '—'}
                                </span>
                                <span className="text-sm text-gray-700 dark:text-gray-300 w-16 text-right shrink-0">
                                  {peca.quantidade} {peca.unidade}
                                </span>
                                <span className="w-24 text-center shrink-0">
                                  <Badge className={STATUS_PECA_COR[peca.status]}>
                                    {STATUS_PECA_LABEL[peca.status]}
                                  </Badge>
                                </span>
                                <span className="w-8 text-center shrink-0">
                                  <button
                                    onClick={() => setQrPeca({ codigo: peca.codigo_peca, descricao: peca.descricao })}
                                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                  >
                                    <QrCode className="h-4 w-4" />
                                  </button>
                                </span>
                              </div>

                              {/* Sub-linha: Roteiro */}
                              <div className="flex items-center gap-2 px-5 py-1.5 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100/80 dark:border-gray-800">
                                <Route className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                                {semRoteiro ? (
                                  <>
                                    <span className="text-xs text-amber-600 font-medium">Sem roteiro definido</span>
                                    <span className="text-gray-300 mx-1">·</span>
                                    <button
                                      onClick={() => abrirRoteiro(peca)}
                                      className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 underline underline-offset-2 transition-colors"
                                    >
                                      <Pencil className="h-3 w-3" />
                                      Definir roteiro
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs text-gray-500">
                                      {(peca.roteiro_producao as any[])
                                        .sort((a, b) => a.sequencia - b.sequencia)
                                        .map((e: any) => e.processos?.nome)
                                        .join(' → ')}
                                    </span>
                                    <span className="text-gray-300 mx-1">·</span>
                                    <button
                                      onClick={() => abrirRoteiro(peca)}
                                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors"
                                    >
                                      <Pencil className="h-3 w-3" />
                                      Editar
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal: Novo Conjunto */}
      <Modal open={openConj} onClose={() => setOpenConj(false)} title="Novo Conjunto">
        <div className="space-y-4">
          <FormField label="Nome do Conjunto" required>
            <Input
              value={formConj.nome}
              onChange={(e) => setFormConj({ ...formConj, nome: e.target.value })}
              placeholder="Ex: Parede P-01, Módulo M-07..."
            />
          </FormField>
          <FormField label="Local de Aplicação">
            <Input
              value={formConj.local_aplicacao}
              onChange={(e) => setFormConj({ ...formConj, local_aplicacao: e.target.value })}
              placeholder="Ex: Bloco A, 2º andar, Ala norte..."
            />
          </FormField>
          <FormField label="Descrição">
            <Textarea
              value={formConj.descricao}
              onChange={(e) => setFormConj({ ...formConj, descricao: e.target.value })}
              rows={2}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpenConj(false)}>Cancelar</Button>
            <Button onClick={handleSaveConjunto} disabled={savingConj}>
              {savingConj ? 'Salvando...' : 'Criar Conjunto'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Nova Peça */}
      <Modal open={openPeca} onClose={() => setOpenPeca(false)} title="Nova Peça" size="lg">
        <div className="space-y-4">
          {/* Código */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Código da Peça <span className="text-red-500">*</span></label>
              <button
                type="button"
                onClick={() => setOpenNomenclaturaHelp(true)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                title="Como é gerado o código?"
              >
                <HelpCircle className="h-3 w-3" />
                nomenclatura
              </button>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={codigoPecaCustom}
                  onChange={(e) => setCodigoPecaCustom(e.target.value.toUpperCase())}
                  disabled={!editandoCodigo}
                  className={`font-mono pr-10 ${!editandoCodigo ? 'bg-gray-50 text-gray-500 cursor-default select-none' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setEditandoCodigo((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  title={editandoCodigo ? 'Bloquear código' : 'Editar código manualmente'}
                >
                  {editandoCodigo
                    ? <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                  }
                </button>
              </div>
              {editandoCodigo && (
                <button
                  type="button"
                  onClick={async () => { const c = await gerarCodigoPeca(); setCodigoPecaCustom(c) }}
                  className="shrink-0 px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors text-xs font-medium"
                  title="Gerar novo código aleatório"
                >
                  ↺ Gerar
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {editandoCodigo ? 'Editando manualmente — clique no cadeado para bloquear.' : 'Código gerado automaticamente — clique no cadeado para editar.'}
            </p>
          </div>

          <FormField label="Descrição" required>
            <Input
              value={formPeca.descricao}
              onChange={(e) => setFormPeca({ ...formPeca, descricao: e.target.value })}
              placeholder="Ex: Viga lateral, Placa OSB, Reforço angular..."
            />
          </FormField>
          <div className="grid grid-cols-4 gap-3">
            {(['comprimento', 'largura', 'altura', 'espessura'] as const).map((dim) => (
              <FormField key={dim} label={dim.charAt(0).toUpperCase() + dim.slice(1) + ' (mm)'}>
                <Input
                  type="number"
                  value={formPeca[dim]}
                  onChange={(e) => setFormPeca({ ...formPeca, [dim]: e.target.value })}
                  placeholder="0"
                />
              </FormField>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Quantidade">
              <Input
                type="number"
                value={formPeca.quantidade}
                onChange={(e) => setFormPeca({ ...formPeca, quantidade: e.target.value })}
                min="1"
              />
            </FormField>
            <FormField label="Unidade">
              <Select
                value={formPeca.unidade}
                onChange={(e) => setFormPeca({ ...formPeca, unidade: e.target.value })}
              >
                <option value="un">un</option>
                <option value="m">m</option>
                <option value="m²">m²</option>
                <option value="m³">m³</option>
                <option value="kg">kg</option>
              </Select>
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpenPeca(false)}>Cancelar</Button>
            <Button onClick={handleSavePeca} disabled={savingPeca}>
              {savingPeca ? 'Salvando...' : 'Criar Peça'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Apontamento por Conjunto */}
      <Modal
        open={openApontConj}
        onClose={() => setOpenApontConj(false)}
        title={`Apontar Conjunto — ${conjApoint?.nome ?? ''}`}
        size="lg"
      >
        {conjApoint && (() => {
          const pecas: any[] = conjApoint.pecas ?? []
          // Coletar todos os processos únicos presentes nos roteiros das peças
          const processosMap = new Map<string, string>()
          for (const peca of pecas) {
            for (const etapa of (peca.roteiro_producao ?? [])) {
              if (etapa.processos?.id) processosMap.set(etapa.processos.id, etapa.processos.nome)
            }
          }
          const processoOptions = Array.from(processosMap.entries())
          const pecasComEtapa = apontEtapaId
            ? pecas.filter((p: any) => p.roteiro_producao?.some((e: any) => e.processos?.id === apontEtapaId))
            : []

          return (
            <div className="space-y-5">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{pecas.length} peça(s)</span> neste conjunto.
                Selecione o processo que deseja registrar como concluído para todas as peças de uma vez.
              </div>

              <FormField label="Processo / Etapa do Roteiro" required>
                <Select
                  value={apontEtapaId}
                  onChange={(e) => setApontEtapaId(e.target.value)}
                >
                  <option value="">Selecione o processo…</option>
                  {processoOptions.map(([pid, pnome]) => (
                    <option key={pid} value={pid}>{pnome}</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Operador">
                <Select
                  value={apontOperador}
                  onChange={(e) => setApontOperador(e.target.value)}
                >
                  <option value="">Selecione o operador…</option>
                  {operadores.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}{u.perfil === 'operador' ? '' : ` (${u.perfil})`}
                    </option>
                  ))}
                </Select>
              </FormField>

              {apontEtapaId && (
                <div className="rounded-lg border border-gray-200 overflow-hidden text-sm">
                  <div className="px-4 py-2.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide flex justify-between items-center">
                    <span>Quantidade produzida por peça</span>
                    <span className="text-gray-400 normal-case font-normal">{pecasComEtapa.length} peça(s)</span>
                  </div>
                  {pecasComEtapa.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-amber-600">
                      Nenhuma peça possui o processo "{processosMap.get(apontEtapaId)}" no roteiro.
                    </p>
                  ) : (
                    <>
                      {/* Cabeçalho */}
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                        <span>Peça</span>
                        <span className="w-20 text-center">Prev.</span>
                        <span className="w-20 text-center">Feito</span>
                        <span className="w-6"></span>
                      </div>
                      <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                        {pecasComEtapa.map((p: any) => {
                          const val = apontQtdMap[p.id] ?? String(p.quantidade ?? 1)
                          const prev = p.quantidade ?? 1
                          const feito = Number(val) || 0
                          const completo = feito >= prev
                          return (
                            <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-4 py-2.5">
                              <div>
                                <span className="font-mono text-xs font-semibold text-gray-900">{p.codigo_peca}</span>
                                <span className="text-xs text-gray-400 ml-2">{p.descricao}</span>
                              </div>
                              <span className="w-20 text-center text-xs text-gray-400">{prev} {p.unidade}</span>
                              <div className="w-20">
                                <input
                                  type="number"
                                  min="0"
                                  max={prev}
                                  value={val}
                                  onChange={(e) => setApontQtdMap((m) => ({ ...m, [p.id]: e.target.value }))}
                                  className="w-full text-center text-xs rounded border border-gray-200 px-1 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400"
                                />
                              </div>
                              <div className="w-6 flex justify-center">
                                {completo
                                  ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                  : <span className="h-3.5 w-3.5 rounded-full border-2 border-gray-200 inline-block" />}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {/* Ação rápida: preencher tudo com a quantidade prevista */}
                      <div className="px-4 py-2 border-t border-gray-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const map: Record<string, string> = {}
                            pecasComEtapa.forEach((p: any) => { map[p.id] = String(p.quantidade ?? 1) })
                            setApontQtdMap(map)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                          Preencher todas com qtd. prevista
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <FormField label="Observações">
                <Input
                  value={apontObs}
                  onChange={(e) => setApontObs(e.target.value)}
                  placeholder="Opcional…"
                />
              </FormField>

              <div className="flex justify-end gap-3 pt-1">
                <Button variant="outline" onClick={() => setOpenApontConj(false)}>Cancelar</Button>
                <Button
                  onClick={handleApontarConjunto}
                  disabled={savingApoint || !apontEtapaId || pecasComEtapa.length === 0}
                >
                  {savingApoint ? 'Registrando…' : `Registrar Apontamento (${pecasComEtapa.length} peças)`}
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Modal: Nomenclatura */}
      <Modal open={openNomenclaturaHelp} onClose={() => setOpenNomenclaturaHelp(false)} title="Como é gerado o código da peça?" size="md">
        <div className="space-y-4 text-sm text-gray-700">
          <p>O código é formado pelas <strong>iniciais de 4 referências</strong> da ordem de produção, seguidas de uma <strong>sequência numérica de 4 dígitos</strong>:</p>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Posição</th>
                  <th className="px-4 py-2">Referência</th>
                  <th className="px-4 py-2">Exemplo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr><td className="px-4 py-2 font-mono font-bold text-gray-900">1ª letra</td><td className="px-4 py-2">Nome da <strong>Obra</strong></td><td className="px-4 py-2 text-gray-500">Residencial Aurora → <span className="font-mono font-semibold">R</span></td></tr>
                <tr><td className="px-4 py-2 font-mono font-bold text-gray-900">2ª letra</td><td className="px-4 py-2">Nome do <strong>Cliente</strong></td><td className="px-4 py-2 text-gray-500">Grupo Horizonte → <span className="font-mono font-semibold">G</span></td></tr>
                <tr><td className="px-4 py-2 font-mono font-bold text-gray-900">3ª letra</td><td className="px-4 py-2">Nome do <strong>Solicitante</strong></td><td className="px-4 py-2 text-gray-500">Maria Souza → <span className="font-mono font-semibold">M</span></td></tr>
                <tr><td className="px-4 py-2 font-mono font-bold text-gray-900">4ª letra</td><td className="px-4 py-2">Nome do <strong>Encarregado</strong></td><td className="px-4 py-2 text-gray-500">João Silva → <span className="font-mono font-semibold">J</span></td></tr>
                <tr><td className="px-4 py-2 font-mono font-bold text-gray-900">Número</td><td className="px-4 py-2">Sequência por prefixo</td><td className="px-4 py-2 text-gray-500">1ª peça → <span className="font-mono font-semibold">0001</span></td></tr>
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 rounded-lg px-4 py-3 font-mono text-base text-center tracking-widest text-gray-900">
            R G M J - 0 0 0 1
          </div>
          <p className="text-xs text-gray-400">Artigos e preposições (de, da, do…) são ignorados na leitura do nome. Se algum campo não estiver preenchido, a posição recebe o valor <strong>0</strong>.</p>
        </div>
      </Modal>

      {/* Modal: QR Code */}
      <Modal
        open={!!qrPeca}
        onClose={() => setQrPeca(null)}
        title="QR Code da Peça"
        size="sm"
      >
        {qrPeca && (
          <div className="flex flex-col items-center gap-4 py-4">
            <QRCode value={`ZETWOOD|${qrPeca.codigo}`} size={180} />
            <div className="text-center">
              <p className="font-mono font-bold text-gray-900 text-lg">{qrPeca.codigo}</p>
              <p className="text-sm text-gray-500">{qrPeca.descricao}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Imprimir Etiqueta
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal: Roteiro da Peça */}
      <Modal
        open={openRoteiro}
        onClose={() => setOpenRoteiro(false)}
        title={roteiroPeca ? `Roteiro — ${roteiroPeca.codigo}` : 'Roteiro'}
        size="lg"
      >
        {roteiroPeca && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{roteiroPeca.descricao}</p>

            {/* Etapas existentes */}
            {roteiroSteps.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
                Nenhuma etapa definida. Adicione abaixo.
              </div>
            ) : (
              <div className="space-y-1">
                {roteiroSteps.map((etapa: any) => (
                  <div key={etapa.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 bg-gray-50">
                    <span className="text-xs font-mono text-gray-400 w-5">{etapa.sequencia}.</span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">{etapa.processos?.nome}</span>
                      {etapa.maquinas && (
                        <span className="text-xs text-gray-500 ml-2">— {etapa.maquinas.nome}</span>
                      )}
                      {!etapa.obrigatorio && (
                        <span className="text-xs text-gray-400 ml-2">(opcional)</span>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      etapa.status === 'concluida' ? 'bg-green-100 text-green-700' :
                      etapa.status === 'bloqueada' ? 'bg-red-100 text-red-700' :
                      etapa.status === 'em_andamento' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {etapa.status === 'concluida' ? 'Concluída' :
                       etapa.status === 'bloqueada' ? 'Bloqueada' :
                       etapa.status === 'em_andamento' ? 'Em andamento' : 'Pendente'}
                    </span>
                    {etapa.status === 'pendente' && (
                      <button
                        onClick={() => handleRemoverEtapa(etapa.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors text-xs ml-1"
                        title="Remover etapa"
                      >✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar nova etapa */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Adicionar Etapa</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Processo" required>
                  <Select
                    value={formRoteiro.processo_id}
                    onChange={(e) => setFormRoteiro({ ...formRoteiro, processo_id: e.target.value })}
                  >
                    <option value="">Selecione o processo</option>
                    {processos.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Máquina">
                  <Select
                    value={formRoteiro.maquina_id}
                    onChange={(e) => setFormRoteiro({ ...formRoteiro, maquina_id: e.target.value })}
                  >
                    <option value="">Qualquer / N/A</option>
                    {maquinas.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </Select>
                </FormField>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="obrigatorio"
                  checked={formRoteiro.obrigatorio}
                  onChange={(e) => setFormRoteiro({ ...formRoteiro, obrigatorio: e.target.checked })}
                  className="accent-gray-900"
                />
                <label htmlFor="obrigatorio" className="text-sm text-gray-700">Etapa obrigatória</label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setOpenRoteiro(false)}>Fechar</Button>
              <Button onClick={handleAddEtapaRoteiro} disabled={savingRoteiro}>
                {savingRoteiro ? 'Adicionando...' : '+ Adicionar Etapa'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Roteiro em Massa */}
      <Modal
        open={openRoteiroMassa}
        onClose={() => setOpenRoteiroMassa(false)}
        title={`Roteiro em Massa — ${selectedPecas.length} peça(s)`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Monte a sequência de etapas abaixo. O mesmo roteiro será aplicado a todas as peças selecionadas.
          </p>

          {/* Etapas montadas */}
          {massaSteps.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              Nenhuma etapa adicionada ainda.
            </div>
          ) : (
            <div className="space-y-1">
              {massaSteps.map((step, idx) => {
                const proc = processos.find((p: any) => p.id === step.processo_id)
                const maq = maquinas.find((m: any) => m.id === step.maquina_id)
                return (
                  <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 bg-gray-50">
                    <span className="text-xs font-mono text-gray-400 w-5">{idx + 1}.</span>
                    <div className="flex-1 text-sm font-medium text-gray-900">
                      {proc?.nome ?? '—'}
                      {maq && <span className="text-xs text-gray-500 ml-2">— {maq.nome}</span>}
                      {!step.obrigatorio && <span className="text-xs text-gray-400 ml-2">(opcional)</span>}
                    </div>
                    <button
                      onClick={() => setMassaSteps((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-gray-300 hover:text-red-500 transition-colors text-xs"
                    >✕</button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Adicionar etapa ao roteiro em massa */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Adicionar Etapa</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Processo" required>
                <Select
                  value={formMassa.processo_id}
                  onChange={(e) => setFormMassa({ ...formMassa, processo_id: e.target.value })}
                >
                  <option value="">Selecione o processo</option>
                  {processos.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Máquina">
                <Select
                  value={formMassa.maquina_id}
                  onChange={(e) => setFormMassa({ ...formMassa, maquina_id: e.target.value })}
                >
                  <option value="">Qualquer / N/A</option>
                  {maquinas.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </Select>
              </FormField>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="massa_obrigatorio"
                checked={formMassa.obrigatorio}
                onChange={(e) => setFormMassa({ ...formMassa, obrigatorio: e.target.checked })}
                className="accent-gray-900"
              />
              <label htmlFor="massa_obrigatorio" className="text-sm text-gray-700">Etapa obrigatória</label>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  if (!formMassa.processo_id) { toast('error', 'Selecione o processo.'); return }
                  setMassaSteps((prev) => [...prev, { ...formMassa }])
                  setFormMassa({ processo_id: '', maquina_id: '', obrigatorio: true })
                }}
              >
                + Etapa
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpenRoteiroMassa(false)}>Cancelar</Button>
            <Button onClick={handleSalvarRoteiroMassa} disabled={savingMassa || massaSteps.length === 0}>
              {savingMassa ? 'Aplicando...' : `Aplicar a ${selectedPecas.length} peça(s)`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
