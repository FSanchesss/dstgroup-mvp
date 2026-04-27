'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormField, Select, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { ScanLine, PlayCircle, CheckCircle, AlertCircle, Search, ArrowLeft, RotateCcw, Layers } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatarDataHora, STATUS_PECA_COR, STATUS_PECA_LABEL } from '@/lib/utils'

type Step = 'buscar' | 'etapa' | 'executar' | 'concluido'

interface PecaInfo {
  id: string
  codigo_peca: string
  descricao: string
  status: string
  conjunto: { codigo_conjunto: string; nome: string; op: { codigo_op: string; obras: { nome: string } } }
  roteiro: RoteiroItem[]
}

interface RoteiroItem {
  id: string
  sequencia: number
  status: string
  obrigatorio: boolean
  processos: { id: string; nome: string; exige_foto: boolean }
  maquinas: { id: string; nome: string } | null
}

export default function ApontamentoPage() {
  const supabase = createClient()
  const [step, setStep] = useState<Step>('buscar')
  const [codigo, setCodigo] = useState('')
  const [pecaInfo, setPecaInfo] = useState<PecaInfo | null>(null)
  const [etapaId, setEtapaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [operadores, setOperadores] = useState<{ id: string; nome: string; perfil: string }[]>([])

  useEffect(() => {
    supabase.from('usuarios').select('id, nome, perfil').order('nome').then(({ data }) => {
      setOperadores(data ?? [])
    })
  }, [supabase])

  // Form apontamento
  const [operadorId, setOperadorId] = useState('')
  const [qtdOk, setQtdOk] = useState('1')
  const [qtdRefugo, setQtdRefugo] = useState('0')
  const [qtdRetrabalho, setQtdRetrabalho] = useState('0')
  const [observacoes, setObservacoes] = useState('')
  const [problema, setProblema] = useState('')
  const [inicio, setInicio] = useState('')
  const [saving, setSaving] = useState(false)

  // Apontamento por conjunto
  const [conjuntoId, setConjuntoId] = useState('')
  const [conjuntoPecas, setConjuntoPecas] = useState<any[]>([])
  const [conjuntoNome, setConjuntoNome] = useState('')
  const [openApontConj, setOpenApontConj] = useState(false)
  const [apontEtapaId, setApontEtapaId] = useState('')
  const [apontOperador, setApontOperador] = useState('')
  const [apontQtdMap, setApontQtdMap] = useState<Record<string, string>>({})
  const [apontObs, setApontObs] = useState('')
  const [savingApoint, setSavingApoint] = useState(false)

  const buscarPeca = useCallback(async () => {
    if (!codigo.trim()) { toast('error', 'Informe o código da peça.'); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('pecas')
      .select(`
        id, codigo_peca, descricao, status,
        conjuntos!inner(
          id, codigo_conjunto, nome,
          ordens_producao!inner(
            codigo_op,
            obras!inner(nome)
          )
        ),
        roteiro_producao(
          id, sequencia, status, obrigatorio,
          processos(id, nome, exige_foto),
          maquinas(id, nome)
        )
      `)
      .eq('codigo_peca', codigo.trim().toUpperCase())
      .single()

    if (error || !data) {
      toast('error', 'Peça não encontrada. Verifique o código.')
      setLoading(false)
      return
    }

    const conj = (data as any).conjuntos
    const op = conj?.ordens_producao
    const obra = op?.obras

    setPecaInfo({
      id: data.id,
      codigo_peca: data.codigo_peca,
      descricao: data.descricao,
      status: data.status,
      conjunto: {
        codigo_conjunto: conj?.codigo_conjunto ?? '',
        nome: conj?.nome ?? '',
        op: {
          codigo_op: op?.codigo_op ?? '',
          obras: { nome: obra?.nome ?? '' },
        },
      },
      roteiro: ((data as any).roteiro_producao ?? []).sort(
        (a: RoteiroItem, b: RoteiroItem) => a.sequencia - b.sequencia
      ),
    })

    // Buscar todas as peças do mesmo conjunto
    if (conj?.id) {
      setConjuntoId(conj.id)
      setConjuntoNome(conj.nome ?? '')
      const { data: cpData } = await supabase
        .from('pecas')
        .select('id, codigo_peca, descricao, quantidade, unidade, status, roteiro_producao(id, sequencia, status, obrigatorio, processos(id, nome), maquinas(id, nome))')
        .eq('conjunto_id', conj.id)
        .order('created_at', { ascending: true })
      setConjuntoPecas(cpData ?? [])
    }

    setStep('etapa')
    setLoading(false)
  }, [codigo, supabase])

  function selecionarEtapa(id: string) {
    setEtapaId(id)
    setInicio(new Date().toISOString())
    setQtdOk('1')
    setQtdRefugo('0')
    setQtdRetrabalho('0')
    setObservacoes('')
    setProblema('')
    setStep('executar')
  }

  async function handleConcluir() {
    if (!etapaId) return
    setSaving(true)

    // Buscar ou criar usuário pelo nome
    const operadorIdFinal: string | null = operadorId || null

    const { error: apError } = await supabase.from('apontamentos_producao').insert({
      roteiro_id: etapaId,
      operador_id: operadorIdFinal,
      inicio: inicio,
      fim: new Date().toISOString(),
      quantidade_ok: Number(qtdOk) || 0,
      quantidade_refugo: Number(qtdRefugo) || 0,
      quantidade_retrabalho: Number(qtdRetrabalho) || 0,
      observacoes: observacoes || null,
      problema_reportado: problema || null,
    })

    if (apError) { toast('error', 'Erro ao registrar apontamento.'); setSaving(false); return }

    // Atualizar status da etapa
    const novoStatus = problema ? 'bloqueada' : 'concluida'
    await supabase.from('roteiro_producao').update({ status: novoStatus }).eq('id', etapaId)

    // Atualizar status da peça
    const novoStatusPeca = problema ? 'retrabalho' : 'em_processo'
    await supabase.from('pecas').update({ status: novoStatusPeca }).eq('id', pecaInfo!.id)

    // Registrar movimentação
    const etapa = pecaInfo!.roteiro.find((r) => r.id === etapaId)
    if (etapa) {
      await supabase.from('movimentacoes').insert({
        peca_id: pecaInfo!.id,
        origem: 'processo anterior',
        destino: etapa.processos.nome,
        responsavel_id: operadorIdFinal,
      })
    }

    toast('success', 'Apontamento registrado com sucesso.')
    setSaving(false)
    setStep('concluido')
  }

  async function handleApontarConjunto() {
    if (!apontEtapaId) { toast('error', 'Selecione uma etapa.'); return }
    const pecasComEtapa = conjuntoPecas.filter((p: any) =>
      p.roteiro_producao?.some((e: any) => e.processos?.id === apontEtapaId)
    )
    if (pecasComEtapa.length === 0) { toast('error', 'Nenhuma peça com essa etapa no roteiro.'); return }
    setSavingApoint(true)
    const operadorApontId: string | null = apontOperador || null
    const agora = new Date().toISOString()
    const rows: any[] = []
    const pecaIds: string[] = []
    for (const peca of pecasComEtapa) {
      const etapaRef = peca.roteiro_producao?.find((e: any) => e.processos?.id === apontEtapaId)
      if (!etapaRef) continue
      rows.push({
        roteiro_id: etapaRef.id,
        operador_id: operadorApontId,
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
    toast('success', `Apontamento registrado para ${rows.length} peça(s) do conjunto.`)
    setSavingApoint(false)
    setOpenApontConj(false)
    setApontEtapaId('')
    setApontOperador('')
    setApontQtdMap({})
    setApontObs('')
    // Atualizar dados do conjunto e peça atual
    const { data: cpData } = await supabase
      .from('pecas').select('id, codigo_peca, descricao, quantidade, unidade, status, roteiro_producao(id, sequencia, status, obrigatorio, processos(id, nome), maquinas(id, nome))')
      .eq('conjunto_id', conjuntoId).order('created_at', { ascending: true })
    setConjuntoPecas(cpData ?? [])
    const updatedSelf = (cpData ?? []).find((p: any) => p.id === pecaInfo?.id)
    if (updatedSelf) {
      setPecaInfo((prev) => prev ? {
        ...prev,
        status: updatedSelf.status,
        roteiro: (updatedSelf.roteiro_producao ?? []).sort((a: any, b: any) => a.sequencia - b.sequencia) as unknown as RoteiroItem[],
      } : prev)
    }
  }

  function reiniciar() {
    setPecaInfo(null)
    setEtapaId('')
    setOperadorId('')
    setConjuntoPecas([])
    setConjuntoId('')
    setConjuntoNome('')
    setApontEtapaId('')
    setApontOperador('')
    setApontQtdMap({})
    setApontObs('')
    setStep('buscar')
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Apontamento de Produção</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-0.5">Chão de fábrica — registrar execução de etapa</p>
      </div>

      {/* Step: Buscar Peça */}
      {step === 'buscar' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-gray-500" />
              Identificar Peça
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Digite o código da peça ou escaneie o QR Code.
            </p>
            <div className="flex gap-3">
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ex: ZW-OP-ABCDEF-0001-CJ001-PC001"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && buscarPeca()}
              />
              <Button onClick={buscarPeca} disabled={loading}>
                <Search className="h-4 w-4" />
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Selecionar Etapa */}
      {step === 'etapa' && pecaInfo && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono font-bold text-gray-900 dark:text-gray-100 text-lg">{pecaInfo.codigo_peca}</p>
                  <p className="text-gray-700 dark:text-gray-300">{pecaInfo.descricao}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {pecaInfo.conjunto.op.codigo_op} — {pecaInfo.conjunto.op.obras.nome}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Conjunto: {pecaInfo.conjunto.codigo_conjunto} — {pecaInfo.conjunto.nome}
                  </p>
                </div>
                <Badge className={STATUS_PECA_COR[pecaInfo.status]}>
                  {STATUS_PECA_LABEL[pecaInfo.status]}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selecionar Etapa a Executar</CardTitle>
            </CardHeader>
            <CardContent>
              {pecaInfo.roteiro.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm">Nenhum roteiro definido para esta peça.</p>
                  <p className="text-gray-400 text-xs mt-1">Adicione um roteiro na Ordem de Produção.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pecaInfo.roteiro.map((etapa) => (
                    <button
                      key={etapa.id}
                      onClick={() => etapa.status === 'pendente' && selecionarEtapa(etapa.id)}
                      disabled={etapa.status !== 'pendente'}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                        etapa.status === 'pendente'
                          ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                          : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono w-6">{etapa.sequencia}.</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{etapa.processos.nome}</span>
                          {etapa.maquinas && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">— {etapa.maquinas.nome}</span>
                          )}
                          {!etapa.obrigatorio && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">(opcional)</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        etapa.status === 'concluida'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : etapa.status === 'bloqueada'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : etapa.status === 'em_andamento'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {etapa.status === 'concluida' ? 'Concluída' :
                         etapa.status === 'bloqueada' ? 'Bloqueada' :
                         etapa.status === 'em_andamento' ? 'Em andamento' : 'Pendente'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Button variant="outline" onClick={reiniciar} size="sm">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Buscar outra peça
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card: Apontar Conjunto */}
          {conjuntoPecas.length > 0 && (
            <Card className="border-dashed border-gray-300 dark:border-gray-700">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      <Layers className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Apontar Conjunto Inteiro</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{conjuntoNome}</span> · {conjuntoPecas.length} peça(s)
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setApontEtapaId('')
                      setApontOperador('')
                      setApontQtdMap({})
                      setApontObs('')
                      setOpenApontConj(true)
                    }}
                  >
                    <Layers className="h-3.5 w-3.5" /> Apontar Conjunto
                  </Button>
                </div>
                {/* Resumo de status das peças */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {conjuntoPecas.map((p: any) => (
                    <span
                      key={p.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_PECA_COR[p.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      <span className="font-mono">{p.codigo_peca}</span>
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step: Executar */}
      {step === 'executar' && pecaInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-gray-500" />
              Registrar Execução
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{pecaInfo.codigo_peca}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {pecaInfo.roteiro.find((r) => r.id === etapaId)?.processos.nome}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Iniciado: {new Date(inicio).toLocaleTimeString('pt-BR')}
              </p>
            </div>

            <div className="space-y-4">
              <FormField label="Operador">
                <Select value={operadorId} onChange={(e) => setOperadorId(e.target.value)}>
                  <option value="">Selecione o operador…</option>
                  {operadores.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}{u.perfil === 'operador' ? '' : ` (${u.perfil})`}
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Qtd OK">
                  <Input type="number" min="0" value={qtdOk} onChange={(e) => setQtdOk(e.target.value)} />
                </FormField>
                <FormField label="Refugo">
                  <Input type="number" min="0" value={qtdRefugo} onChange={(e) => setQtdRefugo(e.target.value)} />
                </FormField>
                <FormField label="Retrabalho">
                  <Input type="number" min="0" value={qtdRetrabalho} onChange={(e) => setQtdRetrabalho(e.target.value)} />
                </FormField>
              </div>
              <FormField label="Observações">
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações sobre a execução..."
                  rows={2}
                />
              </FormField>
              <FormField label="Problema reportado">
                <Textarea
                  value={problema}
                  onChange={(e) => setProblema(e.target.value)}
                  placeholder="Descreva se houve algum problema (deixe vazio se OK)..."
                  rows={2}
                  className={problema ? 'border-red-300 focus:ring-red-400' : ''}
                />
              </FormField>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep('etapa')}><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                <Button onClick={handleConcluir} disabled={saving} className="flex-1">
                  <CheckCircle className="h-4 w-4" />
                  {saving ? 'Registrando...' : 'Concluir Etapa'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Concluído */}
      {step === 'concluido' && (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Apontamento Registrado!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Etapa concluída para <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{pecaInfo?.codigo_peca}</span>
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setStep('etapa') }}>
                Outra etapa desta peça
              </Button>
              <Button onClick={reiniciar}>
                Nova peça
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal: Apontamento por Conjunto */}
      <Modal
        open={openApontConj}
        onClose={() => setOpenApontConj(false)}
        title={`Apontar Conjunto — ${conjuntoNome}`}
        size="lg"
      >
        {(() => {
          const processosMap = new Map<string, string>()
          for (const peca of conjuntoPecas) {
            for (const etapa of (peca.roteiro_producao ?? [])) {
              if (etapa.processos?.id) processosMap.set(etapa.processos.id, etapa.processos.nome)
            }
          }
          const processoOptions = Array.from(processosMap.entries())
          const pecasComEtapa = apontEtapaId
            ? conjuntoPecas.filter((p: any) => p.roteiro_producao?.some((e: any) => e.processos?.id === apontEtapaId))
            : []
          return (
            <div className="space-y-5">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{conjuntoPecas.length} peça(s)</span> no conjunto.
                Selecione o processo para registrar como concluído em todas as peças de uma vez.
              </div>

              <FormField label="Processo / Etapa do Roteiro" required>
                <Select value={apontEtapaId} onChange={(e) => setApontEtapaId(e.target.value)}>
                  <option value="">Selecione o processo…</option>
                  {processoOptions.map(([pid, pnome]) => (
                    <option key={pid} value={pid}>{pnome}</option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Operador">
                <Select value={apontOperador} onChange={(e) => setApontOperador(e.target.value)}>
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
                    <p className="px-4 py-3 text-xs text-amber-600">Nenhuma peça possui esse processo no roteiro.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                        <span>Peça</span><span className="w-20 text-center">Prev.</span><span className="w-20 text-center">Feito</span><span className="w-6" />
                      </div>
                      <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                        {pecasComEtapa.map((p: any) => {
                          const val = apontQtdMap[p.id] ?? String(p.quantidade ?? 1)
                          const feito = Number(val) || 0
                          const completo = feito >= (p.quantidade ?? 1)
                          return (
                            <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-4 py-2.5">
                              <div>
                                <span className="font-mono text-xs font-semibold text-gray-900">{p.codigo_peca}</span>
                                <span className="text-xs text-gray-400 ml-2">{p.descricao}</span>
                              </div>
                              <span className="w-20 text-center text-xs text-gray-400">{p.quantidade} {p.unidade}</span>
                              <div className="w-20">
                                <input type="number" min="0" max={p.quantidade ?? 1} value={val}
                                  onChange={(e) => setApontQtdMap((m) => ({ ...m, [p.id]: e.target.value }))}
                                  className="w-full text-center text-xs rounded border border-gray-200 px-1 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400" />
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
                      <div className="px-4 py-2 border-t border-gray-100 flex justify-end">
                        <button type="button"
                          onClick={() => {
                            const map: Record<string, string> = {}
                            pecasComEtapa.forEach((p: any) => { map[p.id] = String(p.quantidade ?? 1) })
                            setApontQtdMap(map)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-200 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                          Preencher todas com qtd. prevista
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <FormField label="Observações">
                <Input value={apontObs} onChange={(e) => setApontObs(e.target.value)} placeholder="Opcional…" />
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
    </div>
  )
}
