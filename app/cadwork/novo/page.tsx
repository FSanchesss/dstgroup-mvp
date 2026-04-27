'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormField, Select, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import {
  ArrowLeft, Box, Upload, FileText, Check, ChevronRight,
  AlertCircle, Layers, Package, X, FileCode,
} from 'lucide-react'
import Link from 'next/link'
import { parseCadworkFile } from '@/lib/cadwork-parser'
import type { CadworkImportResult, CadworkPeca } from '@/lib/cadwork-parser'
import { gerarCodigoConjunto, gerarCodigoPeca } from '@/lib/utils'

type Step = 'info' | 'files' | 'preview' | 'importing'

export default function CadworkNovoPage() {
  const router = useRouter()
  const supabase = createClient()

  // Step control
  const [step, setStep] = useState<Step>('info')

  // Step 1 — info
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([])
  const [ops, setOps] = useState<{ id: string; codigo_op: string }[]>([])
  const [obraId, setObraId] = useState('')
  const [opId, setOpId] = useState('')

  // Step 2 — files
  const htmlFileRef = useRef<HTMLInputElement>(null)
  const csvFileRef = useRef<HTMLInputElement>(null)
  const [htmlFile, setHtmlFile] = useState<File | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)

  // Step 3 — preview
  const [importResult, setImportResult] = useState<CadworkImportResult | null>(null)

  // Step 4 — importing
  const [importing, setImporting] = useState(false)
  const [importLog, setImportLog] = useState<string[]>([])

  // Load obras/ops on mount
  useEffect(() => {
    async function loadInfo() {
      const [obrasRes, opsRes] = await Promise.all([
        supabase.from('obras').select('id, nome').eq('status', 'ativa').order('nome'),
        supabase.from('ordens_producao').select('id, codigo_op').order('created_at', { ascending: false }),
      ])
      setObras(obrasRes.data ?? [])
      setOps(opsRes.data ?? [])
    }
    loadInfo()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter ops by obra
  const filteredOps = obraId
    ? ops.filter(o => o.codigo_op.includes(obraId.slice(0, 6).toUpperCase()))
    : ops

  // Step 1 → 2
  async function goToFiles() {
    if (!nome.trim()) { toast('error', 'Informe o nome do projeto.'); return }
    setStep('files')
  }

  // Step 2 → 3
  async function goToPreview() {
    if (!csvFile) { toast('error', 'Selecione o arquivo CSV ou XML com a lista de peças.'); return }
    setParsing(true)
    try {
      const result = await parseCadworkFile(csvFile)
      if (result.totalPecas === 0) {
        toast('error', 'Nenhuma peça encontrada no arquivo. Verifique o formato.')
        setParsing(false)
        return
      }
      setImportResult(result)
      setStep('preview')
    } catch (e) {
      toast('error', `Erro ao ler arquivo: ${e}`)
    } finally {
      setParsing(false)
    }
  }

  // Step 3 → import
  async function doImport() {
    if (!importResult || !nome.trim()) return
    setImporting(true)
    setStep('importing')
    const log: string[] = []
    const addLog = (msg: string) => { log.push(msg); setImportLog([...log]) }

    try {
      // 1. Upload HTML viewer (opcional)
      let viewerUrl: string | null = null
      if (htmlFile) {
        addLog('Fazendo upload do visualizador 3D...')
        const fileName = `${Date.now()}-${htmlFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dstgroup')
          .upload(`cadwork-viewers/${fileName}`, htmlFile, { upsert: false })
        if (uploadError) {
          addLog(`⚠️ Aviso: falha no upload do 3D (${uploadError.message}). Importando sem viewer.`)
        } else {
          const { data: publicData } = supabase.storage
            .from('dstgroup')
            .getPublicUrl(uploadData.path)
          viewerUrl = publicData.publicUrl
          addLog('✓ Visualizador 3D salvo.')
        }
      }

      // 2. Criar registro cadwork_projeto
      addLog('Criando registro do projeto...')
      const { data: projeto, error: projErr } = await supabase
        .from('cadwork_projetos')
        .insert({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          obra_id: obraId || null,
          op_id: opId || null,
          viewer_url: viewerUrl,
          total_pecas: importResult.totalPecas,
          total_conjuntos: importResult.grupos.length,
          status: 'importado',
        })
        .select('id')
        .single()

      if (projErr || !projeto) {
        const detail = projErr
          ? `${projErr.message ?? ''} | code: ${(projErr as any).code ?? ''} | hint: ${(projErr as any).hint ?? ''} | details: ${(projErr as any).details ?? ''}`
          : 'sem dados retornados'
        throw new Error(`Falha ao criar projeto: ${detail}`)
      }
      const projetoId = projeto.id
      addLog(`✓ Projeto criado (ID: ${projetoId.slice(0, 8)}...)`)

      // 3. Agrupar peças por grupo (conjunto)
      const grupos = new Map<string, CadworkPeca[]>()
      importResult.pecas.forEach(p => {
        const arr = grupos.get(p.grupo) ?? []
        arr.push(p)
        grupos.set(p.grupo, arr)
      })

      // 4. Obter OP vinculada (ou usar a selecionada)
      let opVinculadaId = opId || null

      // 5. Para cada grupo → criar conjunto + peças
      let conjuntoSeq = 1
      for (const [grupoNome, pecasDoGrupo] of grupos.entries()) {
        addLog(`Importando conjunto: ${grupoNome} (${pecasDoGrupo.length} peças)...`)

        // Gera código do conjunto
        const opRef = opVinculadaId ? (opVinculadaId.slice(0, 6).toUpperCase()) : 'CW'
        const codigoConjunto = `ZW-CW-${opRef}-CJ${String(conjuntoSeq).padStart(3, '0')}`
        conjuntoSeq++

        // Módulo do primeiro item (se existir)
        const modulo = pecasDoGrupo[0]?.modulo ?? null

        const { data: conj, error: conjErr } = await supabase
          .from('conjuntos')
          .insert({
            op_id: opVinculadaId ?? '00000000-0000-0000-0000-000000000000', // placeholder se sem OP
            codigo_conjunto: codigoConjunto,
            nome: grupoNome,
            modulo,
            cadwork_projeto_id: projetoId,
            status: 'aguardando_producao',
          } as any)
          .select('id')
          .single()

        if (conjErr || !conj) {
          addLog(`⚠️ Falha ao criar conjunto "${grupoNome}": ${conjErr?.message}`)
          continue
        }

        // Criar peças do conjunto
        let pecaSeq = 1
        const pecasInsert = pecasDoGrupo.map(p => {
          const codigoPeca = `${codigoConjunto}-PC${String(pecaSeq++).padStart(3, '0')}`
          return {
            conjunto_id: conj.id,
            codigo_peca: codigoPeca,
            descricao: p.descricao,
            comprimento: p.comprimento,
            largura: p.largura,
            altura: p.altura,
            espessura: p.espessura,
            quantidade: p.quantidade,
            unidade: 'un',
            status: 'aguardando_producao' as const,
            cadwork_id: p.cadwork_id,
            cadwork_projeto_id: projetoId,
          }
        })

        const { error: pecasErr } = await supabase.from('pecas').insert(pecasInsert as any)
        if (pecasErr) {
          addLog(`⚠️ Falha ao inserir peças do conjunto "${grupoNome}": ${pecasErr.message}`)
        } else {
          addLog(`  ✓ ${pecasInsert.length} peças criadas.`)
        }
      }

      addLog('✓ Importação concluída!')
      toast('success', `Projeto "${nome}" importado com sucesso!`)
      setTimeout(() => router.push(`/cadwork/${projetoId}`), 1500)
    } catch (e) {
      addLog(`✗ Erro: ${e}`)
      toast('error', `Erro na importação: ${e}`)
      setImporting(false)
    }
  }

  // ─────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────
  const StepIndicator = ({ current }: { current: Step }) => {
    const steps: { key: Step; label: string }[] = [
      { key: 'info', label: 'Informações' },
      { key: 'files', label: 'Arquivos' },
      { key: 'preview', label: 'Revisão' },
      { key: 'importing', label: 'Importando' },
    ]
    const idx = steps.findIndex(s => s.key === current)
    return (
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < idx ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
              : i === idx ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}>
              {i < idx ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:inline ${i === idx ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600" />}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/cadwork">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Box className="h-5 w-5" />
            Importar Projeto Cadwork
          </h1>
        </div>
        <StepIndicator current={step} />
      </div>

      {/* ── STEP 1: INFO ─────────────────────────────── */}
      {step === 'info' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Nome do Projeto" required>
              <Input
                placeholder="Ex: Casa Modular M3 — Bloco A"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </FormField>
            <FormField label="Descrição">
              <Textarea
                placeholder="Observações sobre o projeto..."
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                rows={3}
              />
            </FormField>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Vincular a obra / ordem de produção (opcional — pode configurar depois)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Obra">
                  <Select
                    value={obraId}
                    onChange={e => { setObraId(e.target.value); setOpId('') }}
                  >
                    <option value="">Selecionar obra...</option>
                    {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                  </Select>
                </FormField>
                <FormField label="Ordem de Produção">
                  <Select value={opId} onChange={e => setOpId(e.target.value)}>
                    <option value="">Selecionar OP...</option>
                    {filteredOps.map(o => <option key={o.id} value={o.id}>{o.codigo_op}</option>)}
                  </Select>
                </FormField>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={goToFiles} className="gap-2">
                Próximo: Arquivos
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: FILES ────────────────────────────── */}
      {step === 'files' && (
        <div className="space-y-4">
          {/* HTML Viewer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Box className="h-4 w-4 text-blue-500" />
                Visualizador 3D (opcional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Arquivo HTML exportado pelo Cadwork WebViewer. Permite visualizar o modelo 3D diretamente no sistema.
              </p>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  htmlFile
                    ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                }`}
                onClick={() => htmlFileRef.current?.click()}
              >
                <input
                  ref={htmlFileRef}
                  type="file"
                  accept=".html,.htm"
                  className="hidden"
                  onChange={e => setHtmlFile(e.target.files?.[0] ?? null)}
                />
                {htmlFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileCode className="h-8 w-8 text-green-500" />
                    <div className="text-left">
                      <p className="font-medium text-green-700 dark:text-green-400 text-sm">{htmlFile.name}</p>
                      <p className="text-xs text-gray-500">{(htmlFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setHtmlFile(null) }}
                      className="ml-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Clique para selecionar o arquivo HTML</p>
                    <p className="text-xs text-gray-400 mt-1">Formato: .html ou .htm</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CSV / XML */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                Lista de Peças — BOM <span className="text-red-500">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Arquivo CSV ou XML com a lista de materiais (BOM) exportado pelo Cadwork. Contém IDs, dimensões e materiais das peças.
              </p>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  csvFile
                    ? 'border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                }`}
                onClick={() => csvFileRef.current?.click()}
              >
                <input
                  ref={csvFileRef}
                  type="file"
                  accept=".csv,.xml,.btlx"
                  className="hidden"
                  onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
                />
                {csvFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-purple-500" />
                    <div className="text-left">
                      <p className="font-medium text-purple-700 dark:text-purple-400 text-sm">{csvFile.name}</p>
                      <p className="text-xs text-gray-500">{(csvFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setCsvFile(null) }}
                      className="ml-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Clique para selecionar o arquivo BOM</p>
                    <p className="text-xs text-gray-400 mt-1">Formatos: .csv, .xml, .btlx</p>
                  </>
                )}
              </div>

              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Colunas reconhecidas automaticamente:
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  ID/Pos · Descrição/Bezeichnung · Qtd/Anzahl · Comprimento/Länge · Largura/Breite · Altura/Höhe · Material · Grupo/Gruppe
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('info')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
            </Button>
            <Button onClick={goToPreview} disabled={!csvFile || parsing} className="gap-2">
              {parsing ? 'Lendo arquivo...' : 'Próximo: Revisar'}
              {!parsing && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: PREVIEW ──────────────────────────── */}
      {step === 'preview' && importResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{importResult.totalPecas}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Peças</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{importResult.grupos.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Conjuntos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {importResult.modulos.length || '–'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Módulos</p>
              </CardContent>
            </Card>
          </div>

          {/* Erros */}
          {importResult.erros.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Avisos do parser:
              </p>
              {importResult.erros.map((e, i) => (
                <p key={i} className="text-xs text-yellow-600 dark:text-yellow-300">{e}</p>
              ))}
            </div>
          )}

          {/* Grupos preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Conjuntos encontrados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto">
              {importResult.grupos.map(g => {
                const count = importResult.pecas.filter(p => p.grupo === g).length
                return (
                  <div key={g} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{g}</span>
                    </div>
                    <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs">
                      {count} peça{count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Peças preview (top 10) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Prévia das peças (primeiras 10)
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-2 pr-3 text-gray-500 font-medium">ID Cadwork</th>
                    <th className="text-left py-2 pr-3 text-gray-500 font-medium">Descrição</th>
                    <th className="text-left py-2 pr-3 text-gray-500 font-medium">Grupo</th>
                    <th className="text-right py-2 pr-3 text-gray-500 font-medium">Qtd</th>
                    <th className="text-right py-2 text-gray-500 font-medium">Comp (mm)</th>
                  </tr>
                </thead>
                <tbody>
                  {importResult.pecas.slice(0, 10).map((p, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-gray-900">
                      <td className="py-1.5 pr-3 font-mono text-blue-600 dark:text-blue-400">{p.cadwork_id}</td>
                      <td className="py-1.5 pr-3 text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{p.descricao}</td>
                      <td className="py-1.5 pr-3 text-gray-500">{p.grupo}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-700 dark:text-gray-300">{p.quantidade}</td>
                      <td className="py-1.5 text-right text-gray-500">{p.comprimento ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importResult.totalPecas > 10 && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  ... e mais {importResult.totalPecas - 10} peças
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('files')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
            </Button>
            <Button onClick={doImport} className="gap-2">
              <Check className="h-4 w-4" />
              Confirmar Importação
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: IMPORTING ─────────────────────────── */}
      {step === 'importing' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Box className="h-4 w-4 text-blue-500 animate-pulse" />
              {importing ? 'Importando projeto...' : 'Importação concluída!'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
              {importLog.map((line, i) => (
                <p
                  key={i}
                  className={
                    line.startsWith('✓') ? 'text-green-600 dark:text-green-400'
                    : line.startsWith('✗') ? 'text-red-500'
                    : line.startsWith('⚠️') ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-gray-600 dark:text-gray-400'
                  }
                >
                  {line}
                </p>
              ))}
              {importing && (
                <p className="text-blue-500 animate-pulse">Processando...</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
