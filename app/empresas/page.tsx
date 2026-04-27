'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Empresa } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormField, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Pencil, Building } from 'lucide-react'
import { PageBanner } from '@/components/ui/page-banner'

const TIPO_LABEL: Record<string, string> = {
  dst: 'DST',
  divisao_dst: 'Divisão DST',
  terceirizada: 'Terceirizada',
}

export default function EmpresasPage() {
  const supabase = createClient()
  const [items, setItems] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'terceirizada', ativo: true })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('empresas').select('*').order('nome')
    setItems(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!form.nome.trim()) { toast('error', 'Nome obrigatório.'); return }
    setSaving(true)
    const payload = { nome: form.nome.trim(), tipo: form.tipo as Empresa['tipo'], ativo: form.ativo }
    if (editId) {
      const { error } = await supabase.from('empresas').update(payload).eq('id', editId)
      if (error) { toast('error', 'Erro ao atualizar.'); setSaving(false); return }
      toast('success', 'Empresa atualizada.')
    } else {
      const { error } = await supabase.from('empresas').insert(payload)
      if (error) { toast('error', 'Erro ao criar empresa.'); setSaving(false); return }
      toast('success', 'Empresa criada.')
    }
    setSaving(false); setOpen(false); load()
  }

  return (
    <div className="p-8">
      <PageBanner
        title="Empresas"
        description="Cadastre as empresas e parceiros envolvidos no processo produtivo. Diferencie entre unidades internas da DST, divisões e empresas terceirizadas. O vínculo entre empresa e usuário permite identificar a origem de cada operação registrada no sistema, garantindo rastreabilidade e controle sobre cada etapa."
        illustration="/illustrations/empresa.png"
        illustrationAlt="Ilustração de empresa"
      />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Empresas cadastradas</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Parceiros e unidades do grupo</p>
        </div>
        <Button onClick={() => { setForm({ nome: '', tipo: 'terceirizada', ativo: true }); setEditId(null); setOpen(true) }}>
          <Plus className="h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Building className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma empresa cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <Card key={e.id} className={!e.ativo ? 'opacity-50' : ''}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{e.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{TIPO_LABEL[e.tipo] ?? e.tipo}</p>
                  </div>
                  <Badge className={e.ativo ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'}>
                    {e.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => { setForm({ nome: e.nome, tipo: e.tipo, ativo: e.ativo }); setEditId(e.id); setOpen(true) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar Empresa' : 'Nova Empresa'}>
        <div className="space-y-4">
          <FormField label="Nome" required>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </FormField>
          <FormField label="Tipo">
            <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="dst">DST</option>
              <option value="divisao_dst">Divisão DST</option>
              <option value="terceirizada">Terceirizada</option>
            </Select>
          </FormField>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} className="rounded border-gray-300 text-gray-900" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Ativa</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
