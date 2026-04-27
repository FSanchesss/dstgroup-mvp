'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Usuario, Empresa } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormField, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Pencil, Users } from 'lucide-react'
import { PageBanner } from '@/components/ui/page-banner'

const PERFIL_LABEL: Record<string, string> = {
  admin: 'Admin',
  pcp: 'PCP',
  engenharia: 'Engenharia',
  encarregado: 'Encarregado',
  operador: 'Operador',
  qualidade: 'Qualidade',
  expedicao: 'Expedição',
  solicitante: 'Solicitante',
}

export default function UsuariosPage() {
  const supabase = createClient()
  const [items, setItems] = useState<(Usuario & { empresas: { nome: string } | null })[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: '', email: '', empresa_id: '', tipo_vinculo: 'funcionario',
    perfil: 'operador', funcao: '', ativo: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [usersRes, empRes] = await Promise.all([
      supabase.from('usuarios').select('*, empresas(nome)').order('nome'),
      supabase.from('empresas').select('*').eq('ativo', true),
    ])
    setItems(usersRes.data as any ?? [])
    setEmpresas(empRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function openEdit(u: any) {
    setForm({
      nome: u.nome, email: u.email, empresa_id: u.empresa_id ?? '',
      tipo_vinculo: u.tipo_vinculo ?? 'funcionario',
      perfil: u.perfil, funcao: u.funcao ?? '', ativo: u.ativo,
    })
    setEditId(u.id)
    setOpen(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast('error', 'Nome obrigatório.'); return }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { toast('error', 'Email inválido.'); return }
    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      email: form.email.trim().toLowerCase() || null,
      empresa_id: form.empresa_id || null,
      tipo_vinculo: form.tipo_vinculo as Usuario['tipo_vinculo'],
      perfil: form.perfil as Usuario['perfil'],
      funcao: form.funcao || null,
      ativo: form.ativo,
    }
    if (editId) {
      const { error } = await supabase.from('usuarios').update(payload).eq('id', editId)
      if (error) { toast('error', 'Erro ao atualizar.'); setSaving(false); return }
      toast('success', 'UsuÃ¡rio atualizado.')
    } else {
      const { error } = await supabase.from('usuarios').insert(payload)
      if (error) { toast('error', error.message.includes('unique') ? 'Email já cadastrado.' : 'Erro ao criar.'); setSaving(false); return }
      toast('success', 'Usuário criado.')
    }
    setSaving(false); setOpen(false); load()
  }

  return (
    <div className="p-8">
      <PageBanner
        title="Usuários"
        description="Gerencie as pessoas com acesso ao sistema. Cada usuário possui um perfil de permissão — de operador a administrador — e pode ser vinculado a uma empresa parceira ou setor interno. O cadastro garante rastreabilidade completa sobre quem realizou cada operação, apontamento e aprovação no sistema."
        illustration="/illustrations/trabalhadores.png"
        illustrationAlt="Ilustração de trabalhadores"
      />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Usuários cadastrados</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Pessoas com acesso ao sistema</p>
        </div>
        <Button onClick={() => {
          setForm({ nome: '', email: '', empresa_id: '', tipo_vinculo: 'funcionario', perfil: 'operador', funcao: '', ativo: true })
          setEditId(null); setOpen(true)
        }}>
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum usuÃ¡rio cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((u: any) => (
            <Card key={u.id} className={!u.ativo ? 'opacity-50' : ''}>
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-sm shrink-0">
                    {u.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{u.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                    {u.empresas?.nome && <p className="text-xs text-gray-400 dark:text-gray-500">{u.empresas.nome}</p>}
                  </div>
                  <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{PERFIL_LABEL[u.perfil] ?? u.perfil}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar UsuÃ¡rio' : 'Novo UsuÃ¡rio'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nome" required>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Perfil">
              <Select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })}>
                {Object.entries(PERFIL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </FormField>
            <FormField label="VÃ­nculo">
              <Select value={form.tipo_vinculo} onChange={(e) => setForm({ ...form, tipo_vinculo: e.target.value })}>
                <option value="funcionario">FuncionÃ¡rio</option>
                <option value="terceirizado">Terceirizado</option>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Empresa">
              <Select value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}>
                <option value="">Nenhuma</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </Select>
            </FormField>
            <FormField label="FunÃ§Ã£o">
              <Input value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} placeholder="Ex: Operador de Serra" />
            </FormField>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} className="rounded border-gray-300 text-gray-900" />
            <span className="text-sm text-gray-700 dark:text-gray-300">UsuÃ¡rio ativo</span>
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
