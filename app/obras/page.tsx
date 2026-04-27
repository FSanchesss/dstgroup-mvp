'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Obra } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, FormField, Select, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { Plus, Pencil, Building2, MapPin, User, MoreVertical, Trash2, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatarData } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  ativa: 'Ativa',
  concluida: 'Concluída',
  pausada: 'Pausada',
  cancelada: 'Cancelada',
}

const STATUS_COR: Record<string, string> = {
  ativa: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  concluida: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  pausada: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  cancelada: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

interface ObraForm {
  nome: string
  tipo: string
  cliente: string
  localizacao: string
  status: string
}

const EMPTY: ObraForm = { nome: '', tipo: '', cliente: '', localizacao: '', status: 'ativa' }

export default function ObrasPage() {
  const supabase = createClient()
  const router = useRouter()
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ObraForm>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('obras').select('*').order('created_at', { ascending: false })
    setObras(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function openNew() {
    setForm(EMPTY)
    setEditId(null)
    setOpen(true)
  }

  function openEdit(obra: Obra) {
    setMenuId(null)
    setForm({
      nome: obra.nome,
      tipo: obra.tipo ?? '',
      cliente: obra.cliente ?? '',
      localizacao: obra.localizacao ?? '',
      status: obra.status,
    })
    setEditId(obra.id)
    setOpen(true)
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      // 1. Buscar OPs da obra
      const { data: ops } = await supabase.from('ordens_producao').select('id').eq('obra_id', deleteId)
      const opIds = (ops ?? []).map((o: any) => o.id)

      if (opIds.length > 0) {
        // 2. Buscar conjuntos das OPs
        const { data: conjuntos } = await supabase.from('conjuntos').select('id').in('op_id', opIds)
        const conjuntoIds = (conjuntos ?? []).map((c: any) => c.id)

        if (conjuntoIds.length > 0) {
          // 3. Buscar peças dos conjuntos
          const { data: pecas } = await supabase.from('pecas').select('id').in('conjunto_id', conjuntoIds)
          const pecaIds = (pecas ?? []).map((p: any) => p.id)

          // 4. Buscar roteiros (peças + conjuntos)
          const roteirosQuery = supabase.from('roteiro_producao').select('id')
          const { data: roteiros } = pecaIds.length > 0
            ? await roteirosQuery.or(`peca_id.in.(${pecaIds.join(',')}),conjunto_id.in.(${conjuntoIds.join(',')})`)
            : await roteirosQuery.in('conjunto_id', conjuntoIds)
          const roteiroIds = (roteiros ?? []).map((r: any) => r.id)

          // 5. Deletar apontamentos
          if (roteiroIds.length > 0) {
            await supabase.from('apontamentos_producao').delete().in('roteiro_id', roteiroIds)
          }

          // 6. Deletar não conformidades
          if (pecaIds.length > 0) {
            await supabase.from('nao_conformidades').delete().in('peca_id', pecaIds)
          }
          await supabase.from('nao_conformidades').delete().in('conjunto_id', conjuntoIds)
          if (roteiroIds.length > 0) {
            await supabase.from('nao_conformidades').delete().in('roteiro_id', roteiroIds)
          }

          // 7. Deletar movimentações
          if (pecaIds.length > 0) {
            await supabase.from('movimentacoes').delete().in('peca_id', pecaIds)
          }
          await supabase.from('movimentacoes').delete().in('conjunto_id', conjuntoIds)
        }

        // 8. Deletar expedições
        await supabase.from('expedicoes').delete().in('op_id', opIds)
      }

      // 9. Deletar expedições da obra diretamente
      await supabase.from('expedicoes').delete().eq('obra_id', deleteId)

      // 10. Deletar OPs (cascade: conjuntos → peças → roteiros)
      if (opIds.length > 0) {
        await supabase.from('ordens_producao').delete().in('id', opIds)
      }

      // 11. Deletar solicitações
      await supabase.from('solicitacoes').delete().eq('obra_id', deleteId)

      // 12. Deletar a obra
      const { error } = await supabase.from('obras').delete().eq('id', deleteId)
      if (error) throw error

      toast('success', 'Obra e todos os dados relacionados foram excluídos.')
    } catch {
      toast('error', 'Erro ao excluir obra.')
    }
    setDeleting(false)
    setDeleteId(null)
    load()
  }

  async function handleSave() {
    if (!form.nome.trim()) {
      toast('error', 'Nome da obra é obrigatório.')
      return
    }
    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      tipo: form.tipo || null,
      cliente: form.cliente || null,
      localizacao: form.localizacao || null,
      status: form.status as Obra['status'],
    }
    if (editId) {
      const { error } = await supabase.from('obras').update(payload).eq('id', editId)
      if (error) { toast('error', 'Erro ao atualizar obra.'); setSaving(false); return }
      toast('success', 'Obra atualizada.')
    } else {
      const { error } = await supabase.from('obras').insert(payload)
      if (error) { toast('error', 'Erro ao salvar obra.'); setSaving(false); return }
      toast('success', 'Obra criada.')
    }
    setSaving(false)
    setOpen(false)
    load()
  }

  const filtered = obras.filter(
    (o) =>
      o.nome.toLowerCase().includes(search.toLowerCase()) ||
      (o.cliente ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Obras</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">Cadastro de obras e projetos</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Nova Obra
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar obra ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma obra encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((obra) => (
            <Card key={obra.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{obra.nome}</h3>
                    <div className="mt-1.5">
                      <Badge className={STATUS_COR[obra.status]}>{STATUS_LABEL[obra.status]}</Badge>
                    </div>
                  </div>
                  {/* Menu três pontos */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setMenuId(menuId === obra.id ? null : obra.id)}
                      className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      <MoreVertical className="h-4.5 w-4.5" />
                    </button>
                    {menuId === obra.id && (
                      <>
                        {/* overlay para fechar ao clicar fora */}
                        <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                        <div className="absolute right-0 top-7 z-20 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1">
                          <button
                            onClick={() => { setMenuId(null); router.push(`/obras/${obra.id}`) }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Visualizar
                          </button>
                          <button
                            onClick={() => openEdit(obra)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                          <button
                            onClick={() => { setDeleteId(obra.id); setMenuId(null) }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {obra.tipo && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span className="font-medium">Tipo:</span> {obra.tipo}
                  </p>
                )}
                {obra.cliente && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <User className="h-3 w-3" />
                    {obra.cliente}
                  </div>
                )}
                {obra.localizacao && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin className="h-3 w-3" />
                    {obra.localizacao}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-400 dark:text-gray-500">{formatarData(obra.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar Obra' : 'Nova Obra'}>
        <div className="space-y-4">
          <FormField label="Nome da Obra" required>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Hotel Braga — Torre A"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tipo">
              <Input
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                placeholder="Ex: Hotel, Residencial..."
              />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ativa">Ativa</option>
                <option value="concluida">Concluída</option>
                <option value="pausada">Pausada</option>
                <option value="cancelada">Cancelada</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Cliente">
            <Input
              value={form.cliente}
              onChange={(e) => setForm({ ...form, cliente: e.target.value })}
              placeholder="Nome do cliente"
            />
          </FormField>
          <FormField label="Localização">
            <Input
              value={form.localizacao}
              onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
              placeholder="Cidade, endereço..."
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Excluir Obra">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir esta obra? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
