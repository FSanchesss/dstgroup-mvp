'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Solicitacao, Obra, Usuario } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormField, Select, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import {
  Plus, ClipboardList, Eye, ArrowRight, Search as SearchIcon, CheckCircle, MoreVertical, Trash2, Pencil,
} from 'lucide-react'
import {
  formatarData,
  STATUS_SOL_LABEL, STATUS_SOL_COR,
  PRIORIDADE_LABEL, PRIORIDADE_COR,
} from '@/lib/utils'

type SolicitacaoComRelacoes = Solicitacao & {
  obras: { nome: string } | null
  usuarios: { nome: string } | null
}

interface Form {
  obra_id: string
  solicitante_id: string
  prioridade: string
  prazo: string
  descricao: string
}

const EMPTY: Form = { obra_id: '', solicitante_id: '', prioridade: 'normal', prazo: '', descricao: '' }

export default function SolicitacoesPage() {
  const supabase = createClient()
  const [items, setItems] = useState<SolicitacaoComRelacoes[]>([])
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([])
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewItem, setViewItem] = useState<SolicitacaoComRelacoes | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [solRes, obrasRes, usersRes] = await Promise.all([
      supabase
        .from('solicitacoes')
        .select('*, obras(nome), usuarios(nome)')
        .order('created_at', { ascending: false }),
      supabase.from('obras').select('id, nome').eq('status', 'ativa'),
      supabase.from('usuarios').select('id, nome').eq('ativo', true),
    ])
    setItems((solRes.data ?? []) as SolicitacaoComRelacoes[])
    setObras(obrasRes.data ?? [])
    setUsuarios(usersRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function gerarCodigo(obraId: string): Promise<string> {
    const { count } = await supabase
      .from('solicitacoes')
      .select('*', { count: 'exact', head: true })
      .eq('obra_id', obraId)
    const seq = String((count ?? 0) + 1).padStart(4, '0')
    const ref = obraId.slice(0, 6).toUpperCase()
    return `ZW-SOL-${ref}-${seq}`
  }

  function openEdit(sol: SolicitacaoComRelacoes) {
    setMenuId(null)
    setForm({
      obra_id: sol.obra_id ?? '',
      solicitante_id: sol.solicitante_id ?? '',
      prioridade: sol.prioridade,
      prazo: sol.prazo ?? '',
      descricao: sol.descricao ?? '',
    })
    setEditId(sol.id)
    setOpen(true)
  }

  async function handleSave() {
    if (!form.obra_id) { toast('error', 'Selecione a obra.'); return }
    setSaving(true)
    if (editId) {
      const { error } = await supabase.from('solicitacoes').update({
        obra_id: form.obra_id,
        solicitante_id: form.solicitante_id || null,
        prioridade: form.prioridade as Solicitacao['prioridade'],
        prazo: form.prazo || null,
        descricao: form.descricao || null,
      }).eq('id', editId)
      if (error) { toast('error', 'Erro ao atualizar.'); setSaving(false); return }
      toast('success', 'Solicitação atualizada.')
    } else {
      const codigo = await gerarCodigo(form.obra_id)
      const { error } = await supabase.from('solicitacoes').insert({
        codigo,
        obra_id: form.obra_id,
        solicitante_id: form.solicitante_id || null,
        prioridade: form.prioridade as Solicitacao['prioridade'],
        prazo: form.prazo || null,
        descricao: form.descricao || null,
        status: 'aberta',
      })
      if (error) { toast('error', 'Erro ao criar solicitação.'); setSaving(false); return }
      toast('success', `Solicitação criada.`)
    }
    setSaving(false)
    setOpen(false)
    setEditId(null)
    load()
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const { error } = await supabase.from('solicitacoes').delete().eq('id', deleteId)
    if (error) { toast('error', 'Erro ao excluir solicitação.'); setDeleting(false); return }
    toast('success', 'Solicitação excluída.')
    setDeleting(false)
    setDeleteId(null)
    load()
  }

  async function atualizarStatus(id: string, status: Solicitacao['status']) {
    const { error } = await supabase.from('solicitacoes').update({ status }).eq('id', id)
    if (error) { toast('error', 'Erro ao atualizar.'); return }
    toast('success', 'Status atualizado.')
    load()
  }

  const filtered = items.filter((i) => {
    const matchSearch =
      i.codigo.toLowerCase().includes(search.toLowerCase()) ||
      (i.obras?.nome ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus ? i.status === filterStatus : true
    return matchSearch && matchStatus
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Solicitações</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5">Pedidos de produção</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setEditId(null); setOpen(true) }}>
          <Plus className="h-4 w-4" /> Nova Solicitação
        </Button>
      </div>

      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Buscar código ou obra..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="max-w-xs">
          <option value="">Todos os status</option>
          <option value="aberta">Aberta</option>
          <option value="em_analise">Em Análise</option>
          <option value="aprovada">Aprovada</option>
          <option value="cancelada">Cancelada</option>
          <option value="convertida_em_op">Convertida em OP</option>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma solicitação encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sol) => (
            <Card key={sol.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{sol.codigo}</span>
                      <Badge className={STATUS_SOL_COR[sol.status]}>{STATUS_SOL_LABEL[sol.status]}</Badge>
                      <Badge className={PRIORIDADE_COR[sol.prioridade]}>{PRIORIDADE_LABEL[sol.prioridade]}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{sol.obras?.nome ?? '-'}</p>
                    {sol.descricao && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{sol.descricao}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {sol.prazo ? `Prazo: ${formatarData(sol.prazo)}` : 'Sem prazo'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{sol.usuarios?.nome ?? '-'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sol.status === 'aberta' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => atualizarStatus(sol.id, 'em_analise')}
                      >
                        <SearchIcon className="h-3.5 w-3.5" />
                        Analisar
                      </Button>
                    )}
                    {sol.status === 'em_analise' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => atualizarStatus(sol.id, 'aprovada')}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Aprovar
                      </Button>
                    )}
                    {sol.status === 'aprovada' && (
                      <a href={`/ordens-producao?nova=1&solicitacao=${sol.id}`}>
                        <Button size="sm">
                          <ArrowRight className="h-3.5 w-3.5" />
                          Gerar OP
                        </Button>
                      </a>
                    )}
                    {/* Menu três pontos */}
                    <div className="relative">
                      <button
                        onClick={() => setMenuId(menuId === sol.id ? null : sol.id)}
                        className="p-1.5 rounded-md border border-gray-200 dark:border-[#2C2C2C] text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {menuId === sol.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                          <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-gray-200 dark:border-[#2C2C2C] bg-white dark:bg-[#1A1A1A] shadow-lg py-1">
                            <button
                              onClick={() => { setMenuId(null); setViewItem(sol) }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Visualizar
                            </button>
                            <button
                              onClick={() => openEdit(sol)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                            <button
                              onClick={() => { setDeleteId(sol.id); setMenuId(null) }}
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditId(null) }} title={editId ? 'Editar Solicitação' : 'Nova Solicitação'}>
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
          <FormField label="Solicitante">
            <Select
              value={form.solicitante_id}
              onChange={(e) => setForm({ ...form, solicitante_id: e.target.value })}
            >
              <option value="">Selecione (opcional)</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Descrição">
            <Textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descreva o que precisa ser produzido..."
              rows={4}
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editId ? 'Salvar' : 'Criar Solicitação'}
            </Button>
          </div>
        </div>
      </Modal>
      {/* Modal Visualizar */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Detalhes da Solicitação" size="lg">
        {viewItem && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">{viewItem.codigo}</span>
              <Badge className={STATUS_SOL_COR[viewItem.status]}>{STATUS_SOL_LABEL[viewItem.status]}</Badge>
              <Badge className={PRIORIDADE_COR[viewItem.prioridade]}>{PRIORIDADE_LABEL[viewItem.prioridade]}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Obra</p>
                <p className="text-gray-900 dark:text-gray-100">{viewItem.obras?.nome ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Solicitante</p>
                <p className="text-gray-900 dark:text-gray-100">{viewItem.usuarios?.nome ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Prazo</p>
                <p className="text-gray-900 dark:text-gray-100">{viewItem.prazo ? formatarData(viewItem.prazo) : 'Sem prazo'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">Criada em</p>
                <p className="text-gray-900 dark:text-gray-100">{formatarData(viewItem.created_at)}</p>
              </div>
            </div>
            {viewItem.descricao && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descrição</p>
                <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#141414] rounded-lg p-3 whitespace-pre-wrap">{viewItem.descricao}</p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewItem(null)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Excluir Solicitação">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
