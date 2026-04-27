'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Box, Plus, Eye, Calendar, Package, Layers, Building2, Search } from 'lucide-react'
import { formatarData } from '@/lib/utils'
import Link from 'next/link'

interface CadworkProjetoRow {
  id: string
  nome: string
  descricao: string | null
  viewer_url: string | null
  total_pecas: number
  total_conjuntos: number
  status: string
  importado_em: string
  created_at: string
  obras: { nome: string } | null
  ordens_producao: { codigo_op: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  importado: 'Importado',
  em_producao: 'Em Produção',
  concluido: 'Concluído',
}

const STATUS_COR: Record<string, string> = {
  importado: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  em_producao: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  concluido: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
}

export default function CadworkPage() {
  const supabase = createClient()
  const [projetos, setProjetos] = useState<CadworkProjetoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cadwork_projetos')
      .select('*, obras(nome), ordens_producao(codigo_op)')
      .order('created_at', { ascending: false })
    setProjetos((data ?? []) as CadworkProjetoRow[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = projetos.filter(p =>
    !search ||
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.obras?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    p.ordens_producao?.codigo_op?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Box className="h-6 w-6" />
            Projetos Cadwork
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Importação de projetos 3D e lista de peças do Cadwork
          </p>
        </div>
        <Link href="/cadwork/novo">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Importar Projeto
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Box className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total de Projetos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projetos.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total de Peças</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {projetos.reduce((s, p) => s + p.total_pecas, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Layers className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total de Conjuntos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {projetos.reduce((s, p) => s + p.total_conjuntos, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Buscar projeto, obra, OP..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Box className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">
            {search ? 'Nenhum projeto encontrado.' : 'Nenhum projeto Cadwork importado ainda.'}
          </p>
          {!search && (
            <Link href="/cadwork/novo">
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Importar primeiro projeto
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                    {p.nome}
                  </CardTitle>
                  <Badge className={STATUS_COR[p.status] ?? STATUS_COR.importado}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                </div>
                {p.descricao && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{p.descricao}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Obra / OP */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  {p.obras && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {p.obras.nome}
                    </span>
                  )}
                  {p.ordens_producao && (
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {p.ordens_producao.codigo_op}
                    </span>
                  )}
                </div>

                {/* Counters */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{p.total_conjuntos}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Conjuntos</p>
                  </div>
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{p.total_pecas}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Peças</p>
                  </div>
                  <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                    <p className={`text-xs font-medium ${p.viewer_url ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      {p.viewer_url ? '3D' : 'Sem 3D'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Viewer</p>
                  </div>
                </div>

                {/* Date + action */}
                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatarData(p.importado_em)}
                  </span>
                  <Link href={`/cadwork/${p.id}`}>
                    <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                      <Eye className="h-3.5 w-3.5" />
                      Ver Projeto
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
