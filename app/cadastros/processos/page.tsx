'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Processo } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormField } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Pencil, Settings } from 'lucide-react'
import { PageBanner } from '@/components/ui/page-banner'

export default function ProcessosPage() {
  const supabase = createClient()
  const [items, setItems] = useState<Processo[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: '', tipo: '', setor: '', ordem_padrao: '1',
    exige_foto: false, exige_inspecao: false, permite_retrabalho: true,
    tempo_medio_min: '', ativo: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('processos').select('*').order('ordem_padrao')
    setItems(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function openEdit(p: Processo) {
    setForm({
      nome: p.nome, tipo: p.tipo ?? '', setor: p.setor ?? '',
      ordem_padrao: String(p.ordem_padrao),
      exige_foto: p.exige_foto, exige_inspecao: p.exige_inspecao,
      permite_retrabalho: p.permite_retrabalho,
      tempo_medio_min: p.tempo_medio_min ? String(p.tempo_medio_min) : '',
      ativo: p.ativo,
    })
    setEditId(p.id)
    setOpen(true)
  }

  function resetForm() {
    setForm({ nome: '', tipo: '', setor: '', ordem_padrao: '1', exige_foto: false, exige_inspecao: false, permite_retrabalho: true, tempo_medio_min: '', ativo: true })
    setEditId(null)
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast('error', 'Nome obrigatório.'); return }
    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo || null,
      setor: form.setor || null,
      ordem_padrao: Number(form.ordem_padrao) || 1,
      exige_foto: form.exige_foto,
      exige_inspecao: form.exige_inspecao,
      permite_retrabalho: form.permite_retrabalho,
      tempo_medio_min: form.tempo_medio_min ? Number(form.tempo_medio_min) : null,
      ativo: form.ativo,
    }
    if (editId) {
      const { error } = await supabase.from('processos').update(payload).eq('id', editId)
      if (error) { toast('error', 'Erro ao atualizar.'); setSaving(false); return }
      toast('success', 'Processo atualizado.')
    } else {
      const { error } = await supabase.from('processos').insert(payload)
      if (error) { toast('error', 'Erro ao criar processo.'); setSaving(false); return }
      toast('success', 'Processo criado.')
    }
    setSaving(false); setOpen(false); load()
  }

  return (
    <div className="p-8">
      <PageBanner
        title="Processos"
        description="Gerencie as etapas do fluxo de produção. Cada processo define uma fase dentro da ordem de produção — com tempo médio estimado, setor responsável, exigências de foto, inspeção e possibilidade de retrabalho. Configure a ordem padrão para padronizar o roteiro produtivo de cada conjunto."
        illustration="/illustrations/pordução.png"
        illustrationAlt="Ilustração de produção"
      />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Processos cadastrados</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Etapas ativas no fluxo de produção</p>
        </div>
        <Button onClick={() => { resetForm(); setOpen(true) }}>
          <Plus className="h-4 w-4" /> Novo Processo
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum processo cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <Card key={p.id} className={!p.ativo ? 'opacity-50' : ''}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500 w-6">{p.ordem_padrao}.</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{p.nome}</p>
                    <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {p.tipo && <span>Tipo: {p.tipo}</span>}
                      {p.setor && <span>Setor: {p.setor}</span>}
                      {p.tempo_medio_min && <span>~{p.tempo_medio_min}min</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {p.exige_foto && <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">foto</span>}
                    {p.exige_inspecao && <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded">inspeção</span>}
                    {p.permite_retrabalho && <span className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded">retrabalho</span>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar Processo' : 'Novo Processo'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nome" required>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Corte Reto" />
            </FormField>
            <FormField label="Ordem">
              <Input type="number" value={form.ordem_padrao} onChange={(e) => setForm({ ...form, ordem_padrao: e.target.value })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tipo">
              <Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="corte, montagem..." />
            </FormField>
            <FormField label="Setor">
              <Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} placeholder="serra, montagem..." />
            </FormField>
          </div>
          <FormField label="Tempo médio (min)">
            <Input type="number" value={form.tempo_medio_min} onChange={(e) => setForm({ ...form, tempo_medio_min: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            {([
              { key: 'exige_foto', label: 'Exige foto' },
              { key: 'exige_inspecao', label: 'Exige inspeção' },
              { key: 'permite_retrabalho', label: 'Permite retrabalho' },
              { key: 'ativo', label: 'Ativo' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
