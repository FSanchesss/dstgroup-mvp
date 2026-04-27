'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Processo, Maquina } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormField, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Pencil, Settings, Wrench, CheckCircle, XCircle } from 'lucide-react'

export default function CadastrosPage() {
  const [tab, setTab] = useState<'processos' | 'maquinas'>('processos')
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cadastros</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-0.5">Processos, máquinas e configurações</p>
      </div>
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800">
        {(['processos', 'maquinas'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === t
                ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t === 'processos' ? 'Processos' : 'Máquinas'}
          </button>
        ))}
      </div>
      {tab === 'processos' ? <ProcessosTab /> : <MaquinasTab />}
    </div>
  )
}

function ProcessosTab() {
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

  function resetForm() {
    setForm({ nome: '', tipo: '', setor: '', ordem_padrao: '1', exige_foto: false, exige_inspecao: false, permite_retrabalho: true, tempo_medio_min: '', ativo: true })
    setEditId(null)
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { resetForm(); setOpen(true) }}>
          <Plus className="h-4 w-4" /> Novo Processo
        </Button>
      </div>
      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
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
    </>
  )
}

function MaquinasTab() {
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
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setForm({ nome: '', setor: '', processo_id: '', ativa: true }); setEditId(null); setOpen(true) }}>
          <Plus className="h-4 w-4" /> Nova Máquina
        </Button>
      </div>
      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
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
    </>
  )
}
