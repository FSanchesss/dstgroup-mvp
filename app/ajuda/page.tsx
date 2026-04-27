'use client'

import { useState } from 'react'
import {
  BookOpen, Workflow, Factory, Package, Layers, ScanLine,
  ChevronRight, CheckCircle, Clock, AlertCircle, XCircle,
  ArrowRight, User, Building2, ClipboardList, Truck,
  RotateCcw, Pencil, QrCode, Route, Play, ListChecks,
  Info, Lightbulb, Hash, PrinterIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIAS = [
  { id: 'processo', label: 'Como funciona o processo', icon: Workflow },
  { id: 'solicitacoes', label: 'Solicitações', icon: ClipboardList },
  { id: 'ordens', label: 'Ordens de Produção', icon: Factory },
  { id: 'pecas', label: 'Peças e Conjuntos', icon: Package },
  { id: 'roteiro', label: 'Roteiro de Produção', icon: Route },
  { id: 'apontamento', label: 'Apontamento', icon: Layers },
  { id: 'rastreabilidade', label: 'Rastreabilidade', icon: ScanLine },
  { id: 'nomenclatura', label: 'Nomenclatura e Códigos', icon: Hash },
]

/* ─── helpers visuais ─── */
function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', color)}>
      {children}
    </span>
  )
}

function StepCard({ number, icon: Icon, title, description, color = 'bg-gray-900' }: {
  number: number; icon: React.ElementType; title: string; description: string; color?: string
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className={cn('flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-bold shrink-0', color)}>
        {number}
      </div>
      <div className="flex-1 pt-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{title}</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function InfoBox({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'tip' | 'warn' }) {
  const styles = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',
    tip: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
    warn: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
  }
  const Icon = type === 'tip' ? Lightbulb : type === 'warn' ? AlertCircle : Info
  return (
    <div className={cn('flex gap-2.5 rounded-lg border px-4 py-3 text-sm', styles[type])}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}

function MockCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden', className)}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{children}</h2>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 mt-6 uppercase tracking-wide">{children}</h3>
  )
}

/* ──────────────────────────────────────────────
   SEÇÕES
────────────────────────────────────────────── */

function SecProcesso() {
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Como funciona o processo</SectionTitle>
        <p className="text-sm text-gray-500">Visão completa do fluxo de produção, do pedido até a expedição.</p>
      </div>

      {/* Fluxo visual principal */}
      <div className="grid grid-cols-7 gap-1 items-center text-center">
        {[
          { label: 'Solicitação', icon: ClipboardList, color: 'bg-blue-100 text-blue-700' },
          null,
          { label: 'Ordem de Produção', icon: Factory, color: 'bg-violet-100 text-violet-700' },
          null,
          { label: 'Produção', icon: Layers, color: 'bg-amber-100 text-amber-700' },
          null,
          { label: 'Expedição', icon: Truck, color: 'bg-green-100 text-green-700' },
        ].map((item, i) =>
          item === null ? (
            <ArrowRight key={i} className="h-5 w-5 text-gray-300 mx-auto" />
          ) : (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', item.color)}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-gray-600 leading-tight">{item.label}</span>
            </div>
          )
        )}
      </div>

      {/* Passos detalhados */}
      <div className="space-y-6">
        <SubTitle>Passo a passo detalhado</SubTitle>
        <div className="space-y-5">
          <StepCard number={1} icon={ClipboardList} title="Solicitação de produção é criada"
            description="Um solicitante (engenharia ou gerência de obra) abre uma solicitação informando a obra, prioridade e prazo desejado. A solicitação entra com status Aberta."
            color="bg-blue-600" />
          <StepCard number={2} icon={CheckCircle} title="PCP analisa e aprova a solicitação"
            description="O PCP revisa a demanda e pode aprovar ou reprovar. Ao aprovar, a solicitação muda para Aprovada e fica pronta para virar uma OP."
            color="bg-violet-600" />
          <StepCard number={3} icon={Factory} title="Ordem de Produção é gerada"
            description='O PCP clica em "Gerar OP" na solicitação aprovada. O sistema pré-preenche os dados e abre o formulário de criação da OP com prazo e prioridade já definidos.'
            color="bg-gray-900" />
          <StepCard number={4} icon={Package} title="Conjuntos e Peças são cadastrados na OP"
            description="Dentro da OP, o encarregado ou PCP cria os conjuntos (ex: Parede A, Módulo 3) e as peças de cada conjunto. Cada peça recebe um código único gerado automaticamente."
            color="bg-orange-500" />
          <StepCard number={5} icon={Route} title="Roteiro de produção é definido por peça"
            description="Para cada peça (ou em massa para várias de uma vez), define-se o roteiro: quais processos e máquinas ela vai passar, em qual sequência. Ex: Corte → Furação → Montagem."
            color="bg-teal-600" />
          <StepCard number={6} icon={Layers} title="Operador aponta a produção"
            description="Na tela de Apontamento, o operador busca o código da peça (ou lê o QR code), seleciona a etapa do roteiro e inicia. Ao concluir, a peça avança no processo."
            color="bg-amber-500" />
          <StepCard number={7} icon={CheckCircle} title="Inspeção e aprovação"
            description="Peças concluídas passam por inspeção de qualidade. Aprovadas seguem para expedição; rejeitadas voltam para retrabalho."
            color="bg-green-600" />
          <StepCard number={8} icon={Truck} title="Expedição"
            description="Peças aprovadas são separadas e expedidas para a obra. O sistema registra a saída e mantém o histórico completo."
            color="bg-emerald-700" />
        </div>
      </div>

      {/* Status das peças */}
      <div>
        <SubTitle>Status possíveis de uma peça</SubTitle>
        <div className="grid grid-cols-2 gap-3">
          {[
            { status: 'Aguardando Produção', color: 'bg-gray-100 text-gray-600', desc: 'Peça cadastrada, ainda não iniciada' },
            { status: 'Em Processo', color: 'bg-blue-100 text-blue-700', desc: 'Operador está trabalhando na peça agora' },
            { status: 'Parada', color: 'bg-amber-100 text-amber-700', desc: 'Produção interrompida (falta material, máquina parada…)' },
            { status: 'Retrabalho', color: 'bg-orange-100 text-orange-700', desc: 'Peça precisou voltar para correção' },
            { status: 'Inspeção', color: 'bg-purple-100 text-purple-700', desc: 'Aguardando validação de qualidade' },
            { status: 'Aprovada', color: 'bg-green-100 text-green-700', desc: 'Passou na inspeção, pronta para expedir' },
            { status: 'Rejeitada', color: 'bg-red-100 text-red-700', desc: 'Não passou na inspeção, descartada ou refeita' },
            { status: 'Expedida', color: 'bg-emerald-100 text-emerald-700', desc: 'Saiu para a obra' },
          ].map((s) => (
            <div key={s.status} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 mt-0.5', s.color)}>
                {s.status}
              </span>
              <span className="text-xs text-gray-500">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Responsáveis */}
      <div>
        <SubTitle>Quem faz o quê</SubTitle>
        <div className="space-y-2">
          {[
            { perfil: 'Solicitante', acao: 'Abre solicitações de produção' },
            { perfil: 'PCP', acao: 'Analisa solicitações, cria OPs, define roteiros, monitora andamento' },
            { perfil: 'Encarregado', acao: 'Cadastra peças/conjuntos, define roteiro, supervisiona a produção' },
            { perfil: 'Operador', acao: 'Aponta início e conclusão de cada etapa no chão de fábrica' },
            { perfil: 'Qualidade', acao: 'Aprova ou rejeita peças concluídas' },
            { perfil: 'Expedição', acao: 'Registra saída das peças aprovadas para a obra' },
          ].map((r) => (
            <div key={r.perfil} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-100">
              <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="text-xs font-semibold text-gray-700 w-28 shrink-0">{r.perfil}</span>
              <span className="text-xs text-gray-500">{r.acao}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SecSolicitacoes() {
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Solicitações de Produção</SectionTitle>
        <p className="text-sm text-gray-500">Como criar, analisar e converter uma solicitação em Ordem de Produção.</p>
      </div>

      <InfoBox type="info">
        Solicitações são o ponto de entrada do sistema. Toda demanda de produção começa aqui antes de virar uma OP.
      </InfoBox>

      <SubTitle>Ciclo de vida da solicitação</SubTitle>
      <div className="flex flex-wrap gap-2 items-center">
        {[
          { s: 'Aberta', c: 'bg-gray-100 text-gray-700' },
          { s: '→', c: '' },
          { s: 'Em Análise', c: 'bg-blue-100 text-blue-700' },
          { s: '→', c: '' },
          { s: 'Aprovada', c: 'bg-green-100 text-green-700' },
          { s: '→', c: '' },
          { s: 'Convertida em OP', c: 'bg-violet-100 text-violet-700' },
        ].map((item, i) =>
          item.s === '→'
            ? <ArrowRight key={i} className="h-4 w-4 text-gray-300" />
            : <span key={i} className={cn('px-2.5 py-1 rounded-full text-xs font-medium', item.c)}>{item.s}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-center mt-2">
        <span className="text-xs text-gray-400 mr-1">Ou:</span>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Em Análise</span>
        <ArrowRight className="h-4 w-4 text-gray-300" />
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Reprovada</span>
      </div>

      <SubTitle>Como criar uma solicitação</SubTitle>
      <div className="space-y-3">
        <MockCard>
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nova Solicitação</div>
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Obra <span className="text-red-500">*</span></label>
              <div className="h-8 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-xs text-gray-400">Selecione a obra…</div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Solicitante</label>
              <div className="h-8 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-xs text-gray-400">Selecione o solicitante…</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Prioridade</label>
                <div className="h-8 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-xs text-gray-400">Normal</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Prazo</label>
                <div className="h-8 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-xs text-gray-400">dd/mm/aaaa</div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Descrição / Observações</label>
              <div className="h-16 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-400">Descreva o que precisa ser produzido…</div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <div className="h-8 px-4 rounded-lg border border-gray-200 flex items-center text-xs text-gray-500">Cancelar</div>
              <div className="h-8 px-4 rounded-lg bg-gray-900 flex items-center text-xs text-white font-medium">Salvar</div>
            </div>
          </div>
        </MockCard>
      </div>

      <InfoBox type="tip">
        Ao clicar em <strong>Gerar OP</strong> numa solicitação aprovada, o sistema abre o formulário de nova Ordem de Produção já com os dados pré-preenchidos (obra, prioridade e prazo).
      </InfoBox>

      <SubTitle>Ações disponíveis por status</SubTitle>
      <div className="space-y-2">
        {[
          { status: 'Aberta', acoes: ['Analisar → muda para Em Análise'] },
          { status: 'Em Análise', acoes: ['Aprovar → muda para Aprovada', 'Reprovar → muda para Reprovada'] },
          { status: 'Aprovada', acoes: ['Gerar OP → cria OP e marca como Convertida em OP'] },
        ].map((row) => (
          <div key={row.status} className="p-3 rounded-lg border border-gray-100">
            <div className="text-xs font-semibold text-gray-700 mb-1.5">{row.status}</div>
            <div className="space-y-1">
              {row.acoes.map((a) => (
                <div key={a} className="flex items-center gap-2 text-xs text-gray-500">
                  <ChevronRight className="h-3 w-3 text-gray-300 shrink-0" />{a}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SecOrdens() {
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Ordens de Produção (OP)</SectionTitle>
        <p className="text-sm text-gray-500">A OP é o documento central que organiza tudo o que será produzido para uma obra.</p>
      </div>

      <SubTitle>Status de uma OP</SubTitle>
      <div className="flex flex-wrap gap-2">
        {[
          { s: 'Criada', c: 'bg-gray-100 text-gray-700' },
          { s: 'Em Produção', c: 'bg-blue-100 text-blue-700' },
          { s: 'Concluída', c: 'bg-green-100 text-green-700' },
          { s: 'Cancelada', c: 'bg-red-100 text-red-700' },
        ].map((item) => (
          <span key={item.s} className={cn('px-2.5 py-1 rounded-full text-xs font-medium', item.c)}>{item.s}</span>
        ))}
      </div>

      <SubTitle>Como é o card de uma OP na listagem</SubTitle>
      <MockCard>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-gray-900">OP-2026-0042</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Em Produção</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">🔴 Urgente</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Building2 className="h-3 w-3" />
                <span>Residencial Aurora — <span className="text-gray-700 font-medium">Grupo Horizonte Ltda</span></span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Prazo</div>
              <div className="text-sm font-semibold text-red-600">30/04/2026</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Encarregado: <span className="text-gray-700 font-medium">João Silva</span></span>
            <span>3 conjuntos · 24 peças</span>
          </div>
        </div>
      </MockCard>

      <SubTitle>Dentro de uma OP — estrutura</SubTitle>
      <MockCard>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Parede A — PA001</span>
          <div className="flex gap-2">
            <span className="text-xs text-gray-400">4 peças</span>
            <span className="text-xs text-blue-600 cursor-pointer hover:underline">+ Nova Peça</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {[
            { cod: 'RGSJ-0001', desc: 'Montante vertical esquerdo', dim: '89×38×2980mm', status: 'Em Processo', statusC: 'bg-blue-100 text-blue-700' },
            { cod: 'RGSJ-0002', desc: 'Montante vertical direito', dim: '89×38×2980mm', status: 'Aguardando Produção', statusC: 'bg-gray-100 text-gray-600' },
            { cod: 'RGSJ-0003', desc: 'Guia superior', dim: '89×38×3600mm', status: 'Aprovada', statusC: 'bg-green-100 text-green-700' },
          ].map((p) => (
            <div key={p.cod} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input type="checkbox" className="rounded border-gray-300" readOnly />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-gray-900">{p.cod}</span>
                      <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium', p.statusC)}>{p.status}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{p.desc} · <span className="font-mono">{p.dim}</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <QrCode className="h-3.5 w-3.5 hover:text-gray-700 cursor-pointer" />
                  <Pencil className="h-3.5 w-3.5 hover:text-gray-700 cursor-pointer" />
                  <PrinterIcon className="h-3.5 w-3.5 hover:text-gray-700 cursor-pointer" />
                </div>
              </div>
              <div className="mt-1.5 ml-8 flex items-center gap-1.5 text-[11px] text-teal-600">
                <Route className="h-3 w-3" />
                <span>Corte → Furação → Montagem</span>
              </div>
            </div>
          ))}
        </div>
      </MockCard>

      <InfoBox type="tip">
        Você pode selecionar várias peças e clicar em <strong>Roteiro em Massa</strong> para definir o mesmo roteiro para todas de uma vez.
      </InfoBox>

      <SubTitle>Botões de ação na OP</SubTitle>
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Play, label: 'Iniciar Produção', desc: 'Muda status da OP de Criada para Em Produção' },
          { icon: CheckCircle, label: 'Concluir OP', desc: 'Marca a OP como Concluída após todas as peças finalizadas' },
          { icon: ListChecks, label: 'Roteiro em Massa', desc: 'Aparece quando peças estão selecionadas; aplica o mesmo roteiro a todas' },
          { icon: Package, label: 'Novo Conjunto', desc: 'Adiciona um novo agrupamento de peças (parede, módulo, estrutura…)' },
        ].map((b) => (
          <div key={b.label} className="flex gap-3 p-3 rounded-lg border border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <b.icon className="h-4 w-4 text-gray-700" />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-900">{b.label}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{b.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SecPecas() {
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Peças e Conjuntos</SectionTitle>
        <p className="text-sm text-gray-500">Como organizar a estrutura de produção dentro de uma Ordem de Produção.</p>
      </div>

      <InfoBox type="info">
        <strong>Conjunto</strong> é um agrupamento lógico de peças (ex: Parede A, Módulo 3, Estrutura Cobertura). Toda peça precisa estar dentro de um conjunto.
      </InfoBox>

      <SubTitle>Criando um conjunto</SubTitle>
      <MockCard>
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">Novo Conjunto</div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Nome <span className="text-red-500">*</span></label>
            <div className="h-8 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-xs text-gray-400">Ex: Parede A, Módulo 3…</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Local de Aplicação</label>
            <div className="h-8 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-xs text-gray-400">Ex: Pavimento 2, Bloco B…</div>
          </div>
          <div className="flex justify-end">
            <div className="h-8 px-4 rounded-lg bg-gray-900 flex items-center text-xs text-white font-medium">Criar Conjunto</div>
          </div>
        </div>
      </MockCard>

      <SubTitle>Criando uma peça</SubTitle>
      <MockCard>
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nova Peça</div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-gray-700">Código da Peça <span className="text-red-500">*</span></label>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
                ? nomenclatura
              </span>
            </div>
            <div className="flex gap-2">
              <div className="h-8 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 flex items-center font-mono text-xs text-gray-500">
                RGSJ-0004
              </div>
              <div className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
            </div>
            <p className="text-[10px] text-gray-400">Código gerado automaticamente — clique no cadeado para editar.</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Descrição <span className="text-red-500">*</span></label>
            <div className="h-8 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-xs text-gray-400">Ex: Montante vertical, Guia superior…</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {['Comprimento', 'Largura', 'Altura', 'Espessura'].map((d) => (
              <div key={d} className="space-y-1">
                <label className="text-[10px] font-medium text-gray-600">{d} (mm)</label>
                <div className="h-7 rounded border border-gray-200 bg-white px-2 flex items-center text-[10px] text-gray-400">0</div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <div className="h-8 px-4 rounded-lg bg-gray-900 flex items-center text-xs text-white font-medium">Adicionar Peça</div>
          </div>
        </div>
      </MockCard>

      <InfoBox type="tip">
        O cadeado ao lado do código da peça permite editar o código manualmente. Use isso quando precisar manter uma numeração específica ou corrigir um código gerado.
      </InfoBox>

      <SubTitle>QR Code da peça</SubTitle>
      <div className="flex gap-4 items-start">
        <MockCard className="w-40 shrink-0">
          <div className="p-4 flex flex-col items-center gap-2">
            <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">
              <QrCode className="h-12 w-12 text-gray-300" />
            </div>
            <span className="font-mono text-xs font-bold text-gray-700">RGSJ-0001</span>
            <span className="text-[10px] text-gray-400 text-center">Montante vertical esq.</span>
          </div>
        </MockCard>
        <div className="flex-1 space-y-2 text-sm text-gray-600 pt-2">
          <p>Cada peça possui um QR Code único. Ao clicar no ícone <QrCode className="h-3.5 w-3.5 inline mx-0.5 text-gray-500" /> na linha da peça, o sistema exibe o QR Code para impressão.</p>
          <p className="text-xs text-gray-500">Na tela de Apontamento, o operador pode escanear o QR Code para buscar a peça sem precisar digitar o código manualmente.</p>
        </div>
      </div>
    </div>
  )
}

function SecRoteiro() {
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Roteiro de Produção</SectionTitle>
        <p className="text-sm text-gray-500">O roteiro define por quais processos e máquinas cada peça vai passar, em qual sequência.</p>
      </div>

      <InfoBox type="info">
        Sem roteiro definido, o operador não consegue apontar produção para a peça. <strong>Sempre defina o roteiro antes de iniciar a produção.</strong>
      </InfoBox>

      <SubTitle>Exemplo de roteiro</SubTitle>
      <div className="flex flex-wrap gap-2 items-center">
        {['1. Corte (Serra Circular)', '2. Furação (Furadeira de Bancada)', '3. Montagem (Bancada M3)', '4. Inspeção'].map((step, i, arr) => (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs">
              <span className="font-semibold text-gray-900">{step}</span>
            </div>
            {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />}
          </div>
        ))}
      </div>

      <SubTitle>Como definir roteiro de uma peça</SubTitle>
      <MockCard>
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">Roteiro — RGSJ-0001 / Montante vertical esq.</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Etapas cadastradas</div>
            {[
              { seq: 1, proc: 'Corte', maq: 'Serra Circular SC-01', obrig: true },
              { seq: 2, proc: 'Furação', maq: 'Furadeira FB-02', obrig: true },
              { seq: 3, proc: 'Montagem', maq: 'Bancada M3', obrig: false },
            ].map((e) => (
              <div key={e.seq} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50 text-xs">
                <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">{e.seq}</span>
                <span className="font-medium text-gray-800 flex-1">{e.proc}</span>
                <span className="text-gray-500">{e.maq}</span>
                {e.obrig ? <span className="px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-medium">Obrigatório</span>
                  : <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px]">Opcional</span>}
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Adicionar etapa</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-7 rounded border border-gray-200 bg-white px-2 flex items-center text-[10px] text-gray-400">Processo…</div>
              <div className="h-7 rounded border border-gray-200 bg-white px-2 flex items-center text-[10px] text-gray-400">Máquina…</div>
              <div className="h-7 px-3 rounded bg-gray-900 flex items-center text-[10px] text-white font-medium justify-center">+ Adicionar</div>
            </div>
          </div>
        </div>
      </MockCard>

      <SubTitle>Roteiro em Massa</SubTitle>
      <p className="text-sm text-gray-500">Para aplicar o mesmo roteiro a várias peças de uma vez:</p>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">1</div>
          <p className="text-sm text-gray-600">Marque as caixas de seleção (<input type="checkbox" checked readOnly className="rounded inline mx-1" />) nas peças desejadas</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">2</div>
          <p className="text-sm text-gray-600">O botão <strong className="font-semibold">Roteiro em Massa</strong> aparece no topo da lista de peças</p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">3</div>
          <p className="text-sm text-gray-600">Monte o roteiro no modal e clique em <strong>Aplicar</strong> — todas as peças selecionadas recebem o mesmo roteiro</p>
        </div>
      </div>

      <InfoBox type="tip">
        Use <strong>Roteiro em Massa</strong> quando várias peças do mesmo conjunto passam pelos mesmos processos. Economiza muito tempo.
      </InfoBox>
    </div>
  )
}

function SecApontamento() {
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Apontamento de Produção</SectionTitle>
        <p className="text-sm text-gray-500">Tela usada pelo operador no chão de fábrica para registrar o andamento da produção.</p>
      </div>

      <InfoBox type="info">
        O apontamento é a ligação entre o planejado (OP/roteiro) e o realizado na fábrica. Cada evento fica registrado com data, hora e operador.
      </InfoBox>

      <SubTitle>Fluxo de uso pelo operador</SubTitle>
      <div className="space-y-4">
        <StepCard number={1} icon={QrCode} title="Buscar a peça"
          description="O operador digita o código da peça ou escaneia o QR Code da etiqueta colada na peça. O sistema mostra os dados e as etapas do roteiro."
          color="bg-gray-900" />
        <StepCard number={2} icon={Route} title="Selecionar a etapa"
          description="O sistema exibe as etapas do roteiro. O operador seleciona a etapa que vai executar (ex: Corte, Furação, Montagem)."
          color="bg-blue-600" />
        <StepCard number={3} icon={Play} title="Iniciar a etapa"
          description='Clica em "Iniciar". O sistema registra o horário de início e muda o status da peça para Em Processo.'
          color="bg-amber-500" />
        <StepCard number={4} icon={CheckCircle} title="Concluir a etapa"
          description='Ao terminar, clica em "Concluir". O sistema registra o tempo gasto e avança o status da peça no roteiro.'
          color="bg-green-600" />
      </div>

      <SubTitle>Tela de apontamento — visual</SubTitle>
      <MockCard>
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">Apontamento de Produção</div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 h-9 rounded-lg border border-gray-200 bg-white px-3 flex items-center font-mono text-xs text-gray-700">RGSJ-0001</div>
            <div className="h-9 px-4 rounded-lg bg-gray-900 flex items-center text-xs text-white font-medium">Buscar</div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="font-mono text-sm font-bold text-gray-900 mb-0.5">RGSJ-0001</div>
            <div className="text-xs text-gray-500">Montante vertical esquerdo</div>
            <div className="text-xs text-gray-400 mt-1">Parede A · OP-2026-0042 · Residencial Aurora</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Em Processo</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2">Etapas do Roteiro</div>
            <div className="space-y-1.5">
              {[
                { step: '1. Corte', status: 'Concluída', c: 'bg-green-100 text-green-700' },
                { step: '2. Furação', status: 'Em Andamento', c: 'bg-blue-100 text-blue-700' },
                { step: '3. Montagem', status: 'Pendente', c: 'bg-gray-100 text-gray-500' },
              ].map((e) => (
                <div key={e.step} className="flex items-center justify-between px-3 py-2 rounded border border-gray-100 bg-white text-xs">
                  <span className="font-medium text-gray-800">{e.step}</span>
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', e.c)}>{e.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-8 px-3 rounded-lg border border-gray-200 flex items-center justify-center gap-1.5 text-xs text-gray-600">
              <RotateCcw className="h-3 w-3" /> Buscar outra peça
            </div>
            <div className="flex-1 h-8 px-3 rounded-lg bg-gray-900 flex items-center justify-center gap-1.5 text-xs text-white font-medium">
              <CheckCircle className="h-3 w-3" /> Concluir Etapa
            </div>
          </div>
        </div>
      </MockCard>

      <InfoBox type="warn">
        Se o operador parar a produção sem concluir, deve registrar o status <strong>Parada</strong> e informar o motivo para que o PCP possa tomar providências.
      </InfoBox>
    </div>
  )
}

function SecRastreabilidade() {
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Rastreabilidade</SectionTitle>
        <p className="text-sm text-gray-500">Consulte o histórico completo de qualquer peça desde a criação até a expedição.</p>
      </div>

      <InfoBox type="info">
        A rastreabilidade permite saber exatamente onde cada peça está, quem tocou nela e quanto tempo levou em cada etapa.
      </InfoBox>

      <SubTitle>O que é possível consultar</SubTitle>
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: ClipboardList, label: 'OP de origem', desc: 'Qual OP gerou a peça e quando' },
          { icon: Building2, label: 'Obra e cliente', desc: 'Para qual obra a peça é destinada' },
          { icon: Route, label: 'Roteiro percorrido', desc: 'Cada etapa concluída com data/hora' },
          { icon: User, label: 'Operadores', desc: 'Quem realizou cada etapa de produção' },
          { icon: Clock, label: 'Tempos de processo', desc: 'Quanto tempo cada etapa levou' },
          { icon: Truck, label: 'Data de expedição', desc: 'Quando e para onde foi expedida' },
        ].map((item) => (
          <div key={item.label} className="flex gap-3 p-3 rounded-lg border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <item.icon className="h-3.5 w-3.5 text-gray-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-900">{item.label}</div>
              <div className="text-[11px] text-gray-500">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <SubTitle>Como consultar</SubTitle>
      <div className="space-y-3">
        <MockCard>
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 h-9 rounded-lg border border-gray-200 bg-white px-3 flex items-center font-mono text-xs text-gray-700">RGSJ-0001</div>
              <div className="h-9 px-4 rounded-lg bg-gray-900 flex items-center text-xs text-white font-medium">Rastrear</div>
            </div>
            <div className="space-y-2 pt-1">
              {[
                { label: 'Criada em OP-2026-0042', time: '22/04/2026 08:12', icon: Factory, done: true },
                { label: 'Corte concluído — Operador: Carlos', time: '22/04/2026 10:45', icon: CheckCircle, done: true },
                { label: 'Furação em andamento — Operador: Maria', time: '23/04/2026 09:30', icon: Play, done: false },
              ].map((ev) => (
                <div key={ev.label} className="flex gap-3 items-start">
                  <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5', ev.done ? 'bg-green-100' : 'bg-blue-100')}>
                    <ev.icon className={cn('h-3 w-3', ev.done ? 'text-green-600' : 'text-blue-600')} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-800">{ev.label}</div>
                    <div className="text-[11px] text-gray-400">{ev.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MockCard>
      </div>
    </div>
  )
}

function SecNomenclatura() {
  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Nomenclatura e Códigos</SectionTitle>
        <p className="text-sm text-gray-500">Entenda como são formados os códigos de cada entidade do sistema.</p>
      </div>

      <SubTitle>Código da Peça</SubTitle>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2.5">Posição</th>
              <th className="px-4 py-2.5">Referência</th>
              <th className="px-4 py-2.5">Exemplo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              { pos: '1ª letra', ref: 'Nome da Obra', ex: 'Residencial Aurora → R' },
              { pos: '2ª letra', ref: 'Nome do Cliente', ex: 'Grupo Horizonte → G' },
              { pos: '3ª letra', ref: 'Nome do Solicitante', ex: 'Maria Souza → M' },
              { pos: '4ª letra', ref: 'Nome do Encarregado', ex: 'João Silva → J' },
              { pos: 'Número', ref: 'Sequência por prefixo', ex: '1ª peça desse prefixo → 0001' },
            ].map((r) => (
              <tr key={r.pos}>
                <td className="px-4 py-2.5 font-mono font-bold text-gray-900 text-xs">{r.pos}</td>
                <td className="px-4 py-2.5 text-xs text-gray-700">{r.ref}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{r.ex}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-50 rounded-xl px-6 py-4 font-mono text-xl text-center tracking-[0.25em] text-gray-900 font-bold border border-gray-200">
        R G M J - 0 0 0 1
      </div>
      <InfoBox type="tip">
        Artigos e preposições (de, da, do, das, dos…) são ignorados na leitura do nome. Se algum campo não estiver preenchido, a posição recebe <strong>0</strong>.
      </InfoBox>

      <SubTitle>Código da OP</SubTitle>
      <div className="space-y-3 text-sm text-gray-600">
        <p>As Ordens de Produção recebem um código sequencial no formato:</p>
        <div className="bg-gray-50 rounded-xl px-6 py-4 font-mono text-xl text-center tracking-[0.15em] text-gray-900 font-bold border border-gray-200">
          OP - 2026 - 0042
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg border border-gray-100">
            <div className="font-mono font-bold text-gray-900 text-sm">OP</div>
            <div className="text-xs text-gray-500 mt-1">Prefixo fixo</div>
          </div>
          <div className="p-3 rounded-lg border border-gray-100">
            <div className="font-mono font-bold text-gray-900 text-sm">2026</div>
            <div className="text-xs text-gray-500 mt-1">Ano de criação</div>
          </div>
          <div className="p-3 rounded-lg border border-gray-100">
            <div className="font-mono font-bold text-gray-900 text-sm">0042</div>
            <div className="text-xs text-gray-500 mt-1">Sequência global</div>
          </div>
        </div>
      </div>

      <SubTitle>Código do Conjunto</SubTitle>
      <div className="space-y-3 text-sm text-gray-600">
        <p>Os conjuntos herdam o código da OP e recebem um sufixo sequencial:</p>
        <div className="bg-gray-50 rounded-xl px-6 py-4 font-mono text-xl text-center tracking-[0.15em] text-gray-900 font-bold border border-gray-200">
          OP-2026-0042 - CJ001
        </div>
      </div>
    </div>
  )
}

const SECOES: Record<string, React.FC> = {
  processo: SecProcesso,
  solicitacoes: SecSolicitacoes,
  ordens: SecOrdens,
  pecas: SecPecas,
  roteiro: SecRoteiro,
  apontamento: SecApontamento,
  rastreabilidade: SecRastreabilidade,
  nomenclatura: SecNomenclatura,
}

/* ─── Página principal ─── */
export default function AjudaPage() {
  const [ativa, setAtiva] = useState('processo')
  const Secao = SECOES[ativa] ?? SecProcesso

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Sidebar de categorias */}
      <aside className="w-60 shrink-0 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-y-auto">
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Ajuda</span>
          </div>
          <div className="space-y-0.5">
            {CATEGORIAS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setAtiva(id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                  ativa === id
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="leading-snug">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <Secao />
        </div>
      </main>
    </div>
  )
}
