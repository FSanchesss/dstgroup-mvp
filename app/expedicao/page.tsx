'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormField, Select, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Truck, Plus, CheckCircle } from 'lucide-react'
import { formatarDataHora, STATUS_OP_COR, STATUS_OP_LABEL } from '@/lib/utils'

export default function ExpedicaoPage() {
  const supabase = createClient()
  const [expedicoes, setExpedicoes] = useState<any[]>([])
  const [ops, setOps] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    op_id: '',
    responsavel_id: '',
    observacoes: '',
    completo: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [expRes, opsRes, usersRes] = await Promise.all([
      supabase
        .from('expedicoes')
        .select('*, ordens_producao(codigo_op), obras(nome), usuarios(nome)')
        .order('created_at', { ascending: false }),
      supabase
        .from('ordens_producao')
        .select('id, codigo_op, obra_id, status, obras(nome)')
        .in('status', ['concluida', 'em_producao', 'parcialmente_concluida']),
      supabase.from('usuarios').select('id, nome').eq('ativo', true),
    ])
    setExpedicoes(expRes.data ?? [])
    setOps(opsRes.data ?? [])
    setUsuarios(usersRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!form.op_id) { toast('error', 'Selecione a OP.'); return }
    setSaving(true)
    const op = ops.find((o) => o.id === form.op_id)
    if (!op) { toast('error', 'OP não encontrada.'); setSaving(false); return }

    const { error } = await supabase.from('expedicoes').insert({
      op_id: form.op_id,
      obra_id: op.obra_id,
      responsavel_id: form.responsavel_id || null,
      data_saida: new Date().toISOString(),
      observacoes: form.observacoes || null,
      completo: form.completo,
    })
    if (error) { toast('error', 'Erro ao registrar expedição.'); setSaving(false); return }

    // Atualiza status da OP para expedida
    await supabase.from('ordens_producao').update({ status: 'expedida' }).eq('id', form.op_id)

    toast('success', 'Expedição registrada com sucesso.')
    setSaving(false)
    setOpen(false)
    setForm({ op_id: '', responsavel_id: '', observacoes: '', completo: true })
    load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expedição</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">Registro de saída para obra</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Registrar Expedição
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">Carregando...</div>
      ) : expedicoes.length === 0 ? (
        <div className="text-center py-16 text-gray-300 dark:text-gray-600">
          <Truck className="h-12 w-12 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500">Nenhuma expedição registrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expedicoes.map((exp: any) => (
            <Card key={exp.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                    <Truck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {exp.ordens_producao?.codigo_op}
                      </span>
                      <Badge className={exp.completo ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}>
                        {exp.completo ? 'Completo' : 'Parcial'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{exp.obras?.nome}</p>
                    {exp.observacoes && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{exp.observacoes}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    <p>{formatarDataHora(exp.data_saida)}</p>
                    {exp.usuarios?.nome && <p>{exp.usuarios.nome}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Registrar Expedição">
        <div className="space-y-4">
          <FormField label="Ordem de Produção" required>
            <Select value={form.op_id} onChange={(e) => setForm({ ...form, op_id: e.target.value })}>
              <option value="">Selecione a OP</option>
              {ops.map((op: any) => (
                <option key={op.id} value={op.id}>
                  {op.codigo_op} — {op.obras?.nome}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Responsável">
            <Select value={form.responsavel_id} onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}>
              <option value="">Selecione (opcional)</option>
              {usuarios.map((u: any) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </Select>
          </FormField>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.completo}
              onChange={(e) => setForm({ ...form, completo: e.target.checked })}
              className="rounded border-gray-300 text-gray-900"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Saída completa (todos os itens)</span>
          </label>
          <FormField label="Observações">
            <Textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Número do caminhão, responsável na obra..."
              rows={3}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              <CheckCircle className="h-4 w-4" />
              {saving ? 'Registrando...' : 'Confirmar Expedição'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
