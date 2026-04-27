'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { OrdemProducao, Obra, Usuario } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormField, Select, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Factory, Eye } from 'lucide-react'
import {
  formatarData,
  STATUS_OP_LABEL, STATUS_OP_COR,
  PRIORIDADE_LABEL, PRIORIDADE_COR,
} from '@/lib/utils'
import Link from 'next/link'

type OPComRelacoes = OrdemProducao & {
  obras: { nome: string } | null
  usuarios: { nome: string } | null
}

interface Form {
  obra_id: string
  encarregado_id: string
  prioridade: string
  prazo: string
  observacoes: string
}

const EMPTY: Form = {
  obra_id: '',
  encarregado_id: '',
  prioridade: 'normal',
  prazo: '',
  observacoes: '',
}

function OrdensProducaoPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [ops, setOps] = useState<OPComRelacoes[]>([])
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([])
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [solicitacaoOrigem, setSolicitacaoOrigem] = useState<string | null>(null)
  const initDone = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [opsRes, obrasRes, usersRes] = await Promise.all([
      supabase
        .from('ordens_producao')
        .select('*, obras(nome), usuarios(nome)')
        .order('created_at', { ascending: false }),
      supabase.from('obras').select('id, nome').eq('status', 'ativa'),
      supabase.from('usuarios').select('id, nome').eq('ativo', true),
    ])
    setOps((opsRes.data ?? []) as OPComRelacoes[])
    setObras(obrasRes.data ?? [])
    setUsuarios(usersRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Auto-abre modal quando vindo de solicitação aprovada
  useEffect(() => {
    if (initDone.current) return
    const nova = searchParams.get('nova')
    const solId = searchParams.get('solicitacao')
    if (nova !== '1') return
    initDone.current = true
    setSolicitacaoOrigem(solId)
    if (solId) {
      supabase
        .from('solicitacoes')
        .select('obra_id, prioridade, prazo')
        .eq('id', solId)
        .single()
        .then(({ data }) => {
          if (data) {
            setForm((f) => ({
              ...f,
              obra_id: data.obra_id ?? '',
              prioridade: data.prioridade ?? 'normal',
              prazo: data.prazo ?? '',
            }))
          }
          setOpen(true)
        })
    } else {
      setOpen(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  async function gerarCodigoOP(obraId: string): Promise<string> {
    const { count } = await supabase
      .from('ordens_producao')
      .select('*', { count: 'exact', head: true })
      .eq('obra_id', obraId)
    const seq = String((count ?? 0) + 1).padStart(4, '0')
    const ref = obraId.slice(0, 6).toUpperCase()
    return `ZW-OP-${ref}-${seq}`
  }

  async function handleSave() {
    if (!form.obra_id) { toast('error', 'Selecione a obra.'); return }
    setSaving(true)
    const codigoOP = await gerarCodigoOP(form.obra_id)
    const { error } = await supabase.from('ordens_producao').insert({
      codigo_op: codigoOP,
      obra_id: form.obra_id,
      encarregado_id: form.encarregado_id || null,
      prioridade: form.prioridade as OrdemProducao['prioridade'],
      prazo: form.prazo || null,
      observacoes: form.observacoes || null,
      status: 'criada',
    })
    if (error) { toast('error', 'Erro ao criar OP.'); setSaving(false); return }
    // Vincular solicitação de origem
    if (solicitacaoOrigem) {
      await supabase
        .from('solicitacoes')
        .update({ status: 'convertida_em_op' })
        .eq('id', solicitacaoOrigem)
      setSolicitacaoOrigem(null)
    }
    toast('success', `Ordem ${codigoOP} criada.`)
    setSaving(false)
    setOpen(false)
    load()
  }

  const filtered = ops.filter((op) => {
    const matchSearch =
      op.codigo_op.toLowerCase().includes(search.toLowerCase()) ||
      (op.obras?.nome ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus ? op.status === filterStatus : true
    return matchSearch && matchStatus
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ordens de Produção</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">Gestão das ordens de produção</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setOpen(true) }}>
          <Plus className="h-4 w-4" /> Nova OP
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Buscar OP ou obra..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="max-w-xs">
          <option value="">Todos os status</option>
          <option value="criada">Criada</option>
          <option value="planejada">Planejada</option>
          <option value="em_producao">Em Produção</option>
          <option value="parcialmente_concluida">Parcialmente Concluída</option>
          <option value="concluida">Concluída</option>
          <option value="bloqueada">Bloqueada</option>
          <option value="expedida">Expedida</option>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Factory className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma ordem de produção encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((op) => (
            <Card key={op.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">{op.codigo_op}</span>
                      <Badge className={STATUS_OP_COR[op.status]}>{STATUS_OP_LABEL[op.status]}</Badge>
                      <Badge className={PRIORIDADE_COR[op.prioridade]}>{PRIORIDADE_LABEL[op.prioridade]}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{op.obras?.nome ?? '-'}</p>
                    {op.usuarios && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">Encarregado: {op.usuarios.nome}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {op.prazo ? `Prazo: ${formatarData(op.prazo)}` : 'Sem prazo'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatarData(op.created_at)}</p>
                  </div>
                  <Link href={`/ordens-producao/${op.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3.5 w-3.5" /> Abrir
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova Ordem de Produção" size="lg">
        <div className="space-y-4">
          <FormField label="Obra" required>
            <Select
              value={form.obra_id}
              onChange={(e) => setForm({ ...form, obra_id: e.target.value })}
            >
              <option value="">Selecione a obra</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>{o.nome}</option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Prioridade">
              <Select
                value={form.prioridade}
                onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
              >
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </Select>
            </FormField>
            <FormField label="Prazo">
              <input
                type="date"
                value={form.prazo}
                onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </FormField>
          </div>
          <FormField label="Encarregado">
            <Select
              value={form.encarregado_id}
              onChange={(e) => setForm({ ...form, encarregado_id: e.target.value })}
            >
              <option value="">Selecione (opcional)</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Observações">
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Criando...' : 'Criar Ordem'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function OrdensProducaoPageWrapper() {
  return (
    <Suspense>
      <OrdensProducaoPage />
    </Suspense>
  )
}
