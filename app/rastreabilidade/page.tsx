'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/toast'
import { ScanLine, Search, Clock, User, Wrench, MapPin, AlertTriangle } from 'lucide-react'
import { formatarDataHora, STATUS_PECA_COR, STATUS_PECA_LABEL } from '@/lib/utils'
import QRCode from 'react-qr-code'

interface PecaRastreio {
  id: string
  codigo_peca: string
  descricao: string
  status: string
  localizacao_atual: string | null
  qr_code: string | null
  conjuntos: {
    codigo_conjunto: string
    nome: string
    ordens_producao: {
      codigo_op: string
      obras: { nome: string }
    }
  }
  roteiro_producao: {
    id: string
    sequencia: number
    status: string
    processos: { nome: string }
    maquinas: { nome: string } | null
    apontamentos_producao: {
      id: string
      inicio: string
      fim: string | null
      quantidade_ok: number
      quantidade_refugo: number
      quantidade_retrabalho: number
      observacoes: string | null
      problema_reportado: string | null
      usuarios: { nome: string } | null
      empresas: { nome: string } | null
    }[]
  }[]
  movimentacoes: {
    id: string
    origem: string
    destino: string
    data_hora: string
    usuarios: { nome: string } | null
  }[]
  nao_conformidades: {
    id: string
    descricao: string
    status: string
    acao_corretiva: string | null
    created_at: string
  }[]
}

export default function RastreabilidadePage() {
  const supabase = createClient()
  const [codigo, setCodigo] = useState('')
  const [peca, setPeca] = useState<PecaRastreio | null>(null)
  const [loading, setLoading] = useState(false)

  async function buscar() {
    if (!codigo.trim()) { toast('error', 'Informe o código da peça.'); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('pecas')
      .select(`
        id, codigo_peca, descricao, status, localizacao_atual, qr_code,
        conjuntos(
          codigo_conjunto, nome,
          ordens_producao(codigo_op, obras(nome))
        ),
        roteiro_producao(
          id, sequencia, status,
          processos(nome),
          maquinas(nome),
          apontamentos_producao(
            id, inicio, fim,
            quantidade_ok, quantidade_refugo, quantidade_retrabalho,
            observacoes, problema_reportado,
            usuarios(nome),
            empresas(nome)
          )
        ),
        movimentacoes(
          id, origem, destino, data_hora,
          usuarios(nome)
        ),
        nao_conformidades(id, descricao, status, acao_corretiva, created_at)
      `)
      .eq('codigo_peca', codigo.trim().toUpperCase())
      .single()

    if (error || !data) {
      toast('error', 'Peça não encontrada.')
      setLoading(false)
      return
    }
    setPeca(data as unknown as PecaRastreio)
    setLoading(false)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rastreabilidade</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-0.5">Histórico completo de qualquer peça</p>
      </div>

      <div className="flex gap-3 mb-8 max-w-lg">
        <Input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Digite o código da peça..."
          onKeyDown={(e) => e.key === 'Enter' && buscar()}
        />
        <Button onClick={buscar} disabled={loading}>
          <Search className="h-4 w-4" />
          {loading ? 'Buscando...' : 'Rastrear'}
        </Button>
      </div>

      {!peca && !loading && (
        <div className="text-center py-16 text-gray-300">
          <ScanLine className="h-16 w-16 mx-auto mb-3" />
          <p className="text-gray-400">Digite o código ou escaneie o QR Code da peça</p>
        </div>
      )}

      {peca && (
        <div className="space-y-6">
          {/* Header da peça */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">{peca.codigo_peca}</span>
                    <Badge className={STATUS_PECA_COR[peca.status]}>
                      {STATUS_PECA_LABEL[peca.status]}
                    </Badge>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 font-medium">{peca.descricao}</p>
                  <div className="mt-3 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <p>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Obra:</span>{' '}
                      {(peca.conjuntos as any)?.ordens_producao?.obras?.nome ?? '-'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700 dark:text-gray-300">OP:</span>{' '}
                      {(peca.conjuntos as any)?.ordens_producao?.codigo_op ?? '-'}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Conjunto:</span>{' '}
                      {(peca.conjuntos as any)?.codigo_conjunto} —{' '}
                      {(peca.conjuntos as any)?.nome}
                    </p>
                    {peca.localizacao_atual && (
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">Localização:</span>{' '}
                        {peca.localizacao_atual}
                      </p>
                    )}
                  </div>
                </div>
                {peca.qr_code && (
                  <div className="shrink-0">
                    <QRCode value={peca.qr_code} size={100} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Roteiro de produção */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-gray-500" />
                Roteiro de Produção
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!peca.roteiro_producao || peca.roteiro_producao.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum roteiro registrado.</p>
              ) : (
                <div className="space-y-4">
                  {[...peca.roteiro_producao]
                    .sort((a, b) => a.sequencia - b.sequencia)
                    .map((etapa) => (
                      <div
                        key={etapa.id}
                        className={`rounded-lg border p-4 ${
                          etapa.status === 'concluida'
                            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                            : etapa.status === 'bloqueada'
                            ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                            : etapa.status === 'em_andamento'
                            ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{etapa.sequencia}.</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{(etapa.processos as any)?.nome}</span>
                          {(etapa.maquinas as any)?.nome && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">— {(etapa.maquinas as any).nome}</span>
                          )}
                          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                            etapa.status === 'concluida'
                              ? 'bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-400'
                              : etapa.status === 'bloqueada'
                              ? 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-400'
                              : etapa.status === 'em_andamento'
                              ? 'bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {etapa.status === 'concluida' ? 'Concluída' :
                             etapa.status === 'bloqueada' ? 'Bloqueada' :
                             etapa.status === 'em_andamento' ? 'Em andamento' : 'Pendente'}
                          </span>
                        </div>

                        {(etapa.apontamentos_producao as any[])?.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {(etapa.apontamentos_producao as any[]).map((ap) => (
                              <div key={ap.id} className="bg-white dark:bg-gray-800 rounded p-3 text-sm border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                  <User className="h-3.5 w-3.5" />
                                  <span>{ap.usuarios?.nome ?? 'Operador não identificado'}</span>
                                  {ap.empresas?.nome && (
                                    <span className="text-gray-400">— {ap.empresas.nome}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 text-xs mb-2">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatarDataHora(ap.inicio)}</span>
                                  {ap.fim && <span>→ {formatarDataHora(ap.fim)}</span>}
                                </div>
                                <div className="flex gap-4 text-xs">
                                  <span className="text-green-700">✓ OK: {ap.quantidade_ok}</span>
                                  {ap.quantidade_refugo > 0 && (
                                    <span className="text-red-700">✗ Refugo: {ap.quantidade_refugo}</span>
                                  )}
                                  {ap.quantidade_retrabalho > 0 && (
                                    <span className="text-yellow-700">↺ Retrabalho: {ap.quantidade_retrabalho}</span>
                                  )}
                                </div>
                                {ap.observacoes && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ap.observacoes}</p>
                                )}
                                {ap.problema_reportado && (
                                  <div className="mt-1 flex items-start gap-1 text-xs text-red-600">
                                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                    {ap.problema_reportado}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Movimentações */}
          {peca.movimentacoes && peca.movimentacoes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  Movimentações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...peca.movimentacoes]
                    .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime())
                    .map((mov) => (
                      <div key={mov.id} className="flex items-center gap-3 text-sm py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                        <div className="flex-1">
                          <span className="text-gray-600 dark:text-gray-400">{mov.origem}</span>
                          <span className="text-gray-400 dark:text-gray-500 mx-2">→</span>
                          <span className="text-gray-900 dark:text-gray-100 font-medium">{mov.destino}</span>
                        </div>
                        <div className="text-right text-xs text-gray-400 dark:text-gray-500">
                          <p>{formatarDataHora(mov.data_hora)}</p>
                          {(mov.usuarios as any)?.nome && (
                            <p>{(mov.usuarios as any).nome}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Não Conformidades */}
          {peca.nao_conformidades && peca.nao_conformidades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  Não Conformidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {peca.nao_conformidades.map((nc) => (
                    <div key={nc.id} className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-red-800 dark:text-red-300">{nc.descricao}</p>
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium ml-2 shrink-0">{nc.status}</span>
                      </div>
                      {nc.acao_corretiva && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          <span className="font-medium">Ação:</span> {nc.acao_corretiva}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
