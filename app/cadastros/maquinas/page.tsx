'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Maquina } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormField, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Pencil, Wrench } from 'lucide-react'
import { PageBanner } from '@/components/ui/page-banner'

export default function MaquinasPage() {
  const supabase = createClient()
  const [items, setItems] = useState<Maquina[]>([])
  const [processos, setProcessos] = useState<{ id: string; nome: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', setor: '', processo_id: '', ativa: true })

  const load = useCallback(async () => {
    setLoading(true)
    const [maqRes, procRes] = await Promise.all([
      supabase.from('maquinas').select('*').order('nome'),
      supabase.from('processos').select('id, nome').eq('ativo', true).order('ordem_padrao'),
    ])
    setItems(maqRes.data ?? [])
    setProcessos(procRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function openEdit(m: Maquina) {
    setForm({ nome: m.nome, setor: m.setor ?? '', processo_id: m.processo_id ?? '', ativa: m.ativa })
    setEditId(m.id)
    setOpen(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast('error', 'Nome obrigatório.'); return }
    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      setor: form.setor || null,
      processo_id: form.processo_id || null,
      ativa: form.ativa,
    }
    if (editId) {
      const { error } = await supabase.from('maquinas').update(payload).eq('id', editId)
      if (error) { toast('error', 'Erro ao atualizar.'); setSaving(false); return }
      toast('success', 'Máquina atualizada.')
    } else {
      const { error } = await supabase.from('maquinas').insert(payload)
      if (error) { toast('error', 'Erro ao criar máquina.'); setSaving(false); return }
      toast('success', 'Máquina criada.')
    }
    setSaving(false); setOpen(false); load()
  }

  return (
    <div className="p-8">
      <PageBanner
        title="Máquinas"
        description="Cadastre e gerencie os equipamentos disponíveis no barracão. Associe cada máquina a um processo específico e ao setor onde ela opera. Manter o cadastro atualizado permite rastrear qual equipamento foi utilizado em cada apontamento de produção, facilitando a análise de capacidade e manutenção preventiva."
        illustration="/illustrations/maquina-cerra.png"
        illustrationAlt="Ilustração de máquina serra"
      />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Máquinas cadastradas</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Equipamentos disponíveis no barracão</p>
        </div>
        <Button onClick={() => { setForm({ nome: '', setor: '', processo_id: '', ativa: true }); setEditId(null); setOpen(true) }}>
          <Plus className="h-4 w-4" /> Nova Máquina
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma máquina cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((m) => (
            <Card key={m.id} className={!m.ativa ? 'opacity-50' : ''}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <Wrench className="h-4 w-4 text-gray-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{m.nome}</p>
                    {m.setor && <p className="text-xs text-gray-500 dark:text-gray-400">Setor: {m.setor}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.ativa ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                    {m.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar Máquina' : 'Nova Máquina'}>
        <div className="space-y-4">
          <FormField label="Nome" required>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Serra Circular 01" />
          </FormField>
          <FormField label="Setor">
            <Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} />
          </FormField>
          <FormField label="Processo vinculado">
            <Select value={form.processo_id} onChange={(e) => setForm({ ...form, processo_id: e.target.value })}>
              <option value="">Nenhum</option>
              {processos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          </FormField>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativa} onChange={(e) => setForm({ ...form, ativa: e.target.checked })} className="rounded border-gray-300 text-gray-900" />
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
