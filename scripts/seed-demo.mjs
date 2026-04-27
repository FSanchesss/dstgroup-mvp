/**
 * Seed de demonstração — Obra "Edifício Residencial Veredas do Sol"
 * Executa: node scripts/seed-demo.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cvnmxhwvueysrhmhmkgz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2bm14aHd2dWV5c3JobWhta2d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNjg0OTYsImV4cCI6MjA1NTc0NDQ5Nn0.PSPxpnCs6gHqFtYA7VHktqbcHD83MMk1Eeze9V0s840'

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function log(msg) { console.log(`  ✓ ${msg}`) }
function err(msg, e) { console.error(`  ✗ ${msg}:`, e?.message ?? e) }

async function insert(table, data, returnCol = 'id') {
  const { data: res, error } = await db.from(table).insert(data).select(returnCol).single()
  if (error) { err(`insert ${table}`, error); process.exit(1) }
  return res[returnCol]
}

async function insertMany(table, rows) {
  const { data: res, error } = await db.from(table).insert(rows).select('id')
  if (error) { err(`insertMany ${table}`, error); process.exit(1) }
  return res.map(r => r.id)
}

// ──────────────────────────────────────────────────────────
console.log('\n🏗  DST Group — Seed de Demonstração')
console.log('   Obra: Edifício Residencial Veredas do Sol\n')

// ── 1. EMPRESA ─────────────────────────────────────────────
const empresaId = await insert('empresas', {
  nome: 'Construtora Horizonte Ltda',
  tipo: 'terceirizada',
  ativo: true,
})
log('Empresa: Construtora Horizonte Ltda')

// ── 2. USUÁRIOS ─────────────────────────────────────────────
const usuarios = [
  { nome: 'Rafael Mendes',   email: 'rafael.mendes@dst.com',    perfil: 'pcp',           funcao: 'Planejador de Produção', tipo_vinculo: 'funcionario', empresa_id: empresaId },
  { nome: 'Sandra Lima',     email: 'sandra.lima@horizonte.com', perfil: 'solicitante',   funcao: 'Gerente de Obra',       tipo_vinculo: 'terceirizado', empresa_id: empresaId },
  { nome: 'Carlos Oliveira', email: 'carlos.oliveira@dst.com',  perfil: 'encarregado',   funcao: 'Encarregado de Produção', tipo_vinculo: 'funcionario', empresa_id: empresaId },
  { nome: 'Pedro Alves',     email: 'pedro.alves@dst.com',      perfil: 'operador',      funcao: 'Operador de Serra',     tipo_vinculo: 'funcionario', empresa_id: empresaId },
  { nome: 'Marcos Souza',    email: 'marcos.souza@dst.com',     perfil: 'operador',      funcao: 'Operador de Furação',   tipo_vinculo: 'funcionario', empresa_id: empresaId },
  { nome: 'Fernanda Costa',  email: 'fernanda.costa@dst.com',   perfil: 'qualidade',     funcao: 'Inspetora de Qualidade', tipo_vinculo: 'funcionario', empresa_id: empresaId },
  { nome: 'Thiago Ramos',    email: 'thiago.ramos@dst.com',     perfil: 'expedicao',     funcao: 'Responsável Expedição', tipo_vinculo: 'funcionario', empresa_id: empresaId },
]
const { data: usersData, error: usersErr } = await db.from('usuarios').insert(usuarios).select('id, nome, perfil')
if (usersErr) { err('insert usuarios', usersErr); process.exit(1) }
const uMap = {}
for (const u of usersData) uMap[u.perfil] = u.id
// Encarregado e operadores separados por nome
const uByNome = {}
for (const u of usersData) uByNome[u.nome.split(' ')[0]] = u.id
log(`Usuários criados: ${usersData.map(u => u.nome).join(', ')}`)

// ── 3. OBRA ─────────────────────────────────────────────────
const obraId = await insert('obras', {
  nome: 'Edifício Residencial Veredas do Sol',
  tipo: 'Residencial Multifamiliar',
  cliente: 'Construtora Horizonte Ltda',
  localizacao: 'Av. das Palmeiras, 1200 — Belo Horizonte/MG',
  status: 'ativa',
})
log('Obra: Edifício Residencial Veredas do Sol')

// ── 4. PROCESSOS ────────────────────────────────────────────
const processos = [
  { nome: 'Corte',        setor: 'Serraria',   ordem_padrao: 1, tempo_medio_min: 15, ativo: true, exige_foto: false, exige_inspecao: false, permite_retrabalho: true },
  { nome: 'Furação',      setor: 'Furação',    ordem_padrao: 2, tempo_medio_min: 20, ativo: true, exige_foto: false, exige_inspecao: false, permite_retrabalho: true },
  { nome: 'Lixamento',    setor: 'Acabamento', ordem_padrao: 3, tempo_medio_min: 10, ativo: true, exige_foto: false, exige_inspecao: false, permite_retrabalho: true },
  { nome: 'Montagem',     setor: 'Montagem',   ordem_padrao: 4, tempo_medio_min: 45, ativo: true, exige_foto: false, exige_inspecao: false, permite_retrabalho: true },
  { nome: 'Inspeção CQ',  setor: 'Qualidade',  ordem_padrao: 5, tempo_medio_min: 15, ativo: true, exige_foto: false, exige_inspecao: true,  permite_retrabalho: false },
  { nome: 'Pintura',      setor: 'Acabamento', ordem_padrao: 6, tempo_medio_min: 30, ativo: true, exige_foto: false, exige_inspecao: false, permite_retrabalho: true },
]
const procIds = await insertMany('processos', processos)
const pMap = {}
processos.forEach((p, i) => pMap[p.nome] = procIds[i])
log(`Processos: ${processos.map(p => p.nome).join(', ')}`)

// ── 5. MÁQUINAS ─────────────────────────────────────────────
const maquinas = [
  { nome: 'Serra Circular SC-01',    setor: 'Serraria',   processo_id: pMap['Corte'],     ativa: true },
  { nome: 'Serra Fita SF-02',        setor: 'Serraria',   processo_id: pMap['Corte'],     ativa: true },
  { nome: 'Furadeira de Bancada FB-01', setor: 'Furação', processo_id: pMap['Furação'],  ativa: true },
  { nome: 'CNC Furação CNC-01',      setor: 'Furação',    processo_id: pMap['Furação'],  ativa: true },
  { nome: 'Lixadeira L-01',          setor: 'Acabamento', processo_id: pMap['Lixamento'], ativa: true },
  { nome: 'Bancada Montagem M-01',   setor: 'Montagem',   processo_id: pMap['Montagem'],  ativa: true },
  { nome: 'Bancada Montagem M-02',   setor: 'Montagem',   processo_id: pMap['Montagem'],  ativa: true },
  { nome: 'Cabine de Pintura P-01',  setor: 'Acabamento', processo_id: pMap['Pintura'],   ativa: true },
]
const maqIds = await insertMany('maquinas', maquinas)
const maqMap = {}
maquinas.forEach((m, i) => maqMap[m.nome] = maqIds[i])
log(`Máquinas: ${maquinas.map(m => m.nome).join(', ')}`)

// ── 6. SOLICITAÇÃO ──────────────────────────────────────────
const solId = await insert('solicitacoes', {
  codigo: 'SOL-2026-0018',
  obra_id: obraId,
  solicitante_id: uMap['solicitante'],
  prioridade: 'alta',
  prazo: '2026-05-15',
  descricao: 'Produção das estruturas de Steel Frame para o Bloco A — Pavimentos 1 a 3. Incluir paredes externas, divisórias e estrutura do telhado.',
  status: 'convertida_em_op',
})
log('Solicitação: SOL-2026-0018 (convertida em OP)')

// ── 7. ORDEM DE PRODUÇÃO ────────────────────────────────────
const opId = await insert('ordens_producao', {
  codigo_op: 'OP-2026-0018',
  solicitacao_id: solId,
  obra_id: obraId,
  encarregado_id: uMap['encarregado'],
  prioridade: 'alta',
  prazo: '2026-05-15',
  status: 'em_producao',
  observacoes: 'Estruturas Steel Frame — Bloco A. Priorizar paredes externas (PA) antes das divisórias internas (DI).',
})
log('Ordem de Produção: OP-2026-0018 — Em Produção')

// ── 8. CONJUNTOS ────────────────────────────────────────────
const conjuntos = [
  { op_id: opId, codigo_conjunto: 'OP-2026-0018-CJ001', nome: 'Parede Externa A1', local_aplicacao: 'Bloco A — Fachada Norte', status: 'em_processo' },
  { op_id: opId, codigo_conjunto: 'OP-2026-0018-CJ002', nome: 'Parede Externa A2', local_aplicacao: 'Bloco A — Fachada Sul', status: 'aguardando_producao' },
  { op_id: opId, codigo_conjunto: 'OP-2026-0018-CJ003', nome: 'Divisória Interna D1', local_aplicacao: 'Bloco A — Pav. 1, Apto 101-104', status: 'aguardando_producao' },
  { op_id: opId, codigo_conjunto: 'OP-2026-0018-CJ004', nome: 'Estrutura Telhado T1', local_aplicacao: 'Bloco A — Cobertura', status: 'aguardando_producao' },
]
const conjIds = await insertMany('conjuntos', conjuntos)
const [cj1, cj2, cj3, cj4] = conjIds
log(`Conjuntos: ${conjuntos.map(c => c.nome).join(', ')}`)

// Prefixo: E (Edifício) + C (Construtora) + S (Sandra) + C (Carlos) = ECSC
const prefix = 'ECSC'

// ── 9. PEÇAS ────────────────────────────────────────────────

// CJ001 — Parede Externa A1 (10 peças, mix de status — em andamento)
const pecasCJ1 = [
  { conjunto_id: cj1, codigo_peca: `${prefix}-0001`, descricao: 'Montante Vertical 90×40mm', comprimento: 2800, largura: 90, espessura: 40, quantidade: 12, unidade: 'un', status: 'aprovada' },
  { conjunto_id: cj1, codigo_peca: `${prefix}-0002`, descricao: 'Montante Vertical 90×40mm (janela)', comprimento: 1200, largura: 90, espessura: 40, quantidade: 6, unidade: 'un', status: 'aprovada' },
  { conjunto_id: cj1, codigo_peca: `${prefix}-0003`, descricao: 'Guia Superior 90×40mm', comprimento: 4800, largura: 90, espessura: 40, quantidade: 3, unidade: 'un', status: 'aprovada' },
  { conjunto_id: cj1, codigo_peca: `${prefix}-0004`, descricao: 'Guia Inferior 90×40mm', comprimento: 4800, largura: 90, espessura: 40, quantidade: 3, unidade: 'un', status: 'em_processo' },
  { conjunto_id: cj1, codigo_peca: `${prefix}-0005`, descricao: 'Travessa Horizontal 90×40mm', comprimento: 1200, largura: 90, espessura: 40, quantidade: 8, unidade: 'un', status: 'em_processo' },
  { conjunto_id: cj1, codigo_peca: `${prefix}-0006`, descricao: 'Chapa OSB 15mm Ext.', comprimento: 2800, largura: 1200, espessura: 15, quantidade: 10, unidade: 'un', status: 'inspecao' },
  { conjunto_id: cj1, codigo_peca: `${prefix}-0007`, descricao: 'Reforço Angular L50×50', comprimento: 400, largura: 50, espessura: 4, quantidade: 24, unidade: 'un', status: 'aprovada' },
  { conjunto_id: cj1, codigo_peca: `${prefix}-0008`, descricao: 'Verga Metálica Janela', comprimento: 1400, largura: 90, espessura: 40, quantidade: 4, unidade: 'un', status: 'retrabalho' },
]
const pecasIdsCJ1 = await insertMany('pecas', pecasCJ1)
log(`CJ001 — Parede Externa A1: ${pecasCJ1.length} peças`)

// CJ002 — Parede Externa A2 (peças aguardando)
const pecasCJ2 = [
  { conjunto_id: cj2, codigo_peca: `${prefix}-0009`,  descricao: 'Montante Vertical 90×40mm', comprimento: 2800, largura: 90, espessura: 40, quantidade: 14, unidade: 'un', status: 'aguardando_producao' },
  { conjunto_id: cj2, codigo_peca: `${prefix}-0010`, descricao: 'Guia Superior 90×40mm', comprimento: 5200, largura: 90, espessura: 40, quantidade: 3, unidade: 'un', status: 'aguardando_producao' },
  { conjunto_id: cj2, codigo_peca: `${prefix}-0011`, descricao: 'Guia Inferior 90×40mm', comprimento: 5200, largura: 90, espessura: 40, quantidade: 3, unidade: 'un', status: 'aguardando_producao' },
  { conjunto_id: cj2, codigo_peca: `${prefix}-0012`, descricao: 'Chapa OSB 15mm Ext.', comprimento: 2800, largura: 1200, espessura: 15, quantidade: 12, unidade: 'un', status: 'aguardando_producao' },
  { conjunto_id: cj2, codigo_peca: `${prefix}-0013`, descricao: 'Reforço Angular L50×50', comprimento: 400, largura: 50, espessura: 4, quantidade: 28, unidade: 'un', status: 'aguardando_producao' },
]
const pecasIdsCJ2 = await insertMany('pecas', pecasCJ2)
log(`CJ002 — Parede Externa A2: ${pecasCJ2.length} peças`)

// CJ003 — Divisória Interna D1
const pecasCJ3 = [
  { conjunto_id: cj3, codigo_peca: `${prefix}-0014`, descricao: 'Montante Drywall 70×40mm', comprimento: 2600, largura: 70, espessura: 40, quantidade: 20, unidade: 'un', status: 'aguardando_producao' },
  { conjunto_id: cj3, codigo_peca: `${prefix}-0015`, descricao: 'Guia Drywall 70×40mm', comprimento: 3600, largura: 70, espessura: 40, quantidade: 8, unidade: 'un', status: 'aguardando_producao' },
  { conjunto_id: cj3, codigo_peca: `${prefix}-0016`, descricao: 'Chapa Gesso Acartonado 12,5mm', comprimento: 2600, largura: 1200, espessura: 13, quantidade: 30, unidade: 'un', status: 'aguardando_producao' },
]
const pecasIdsCJ3 = await insertMany('pecas', pecasCJ3)
log(`CJ003 — Divisória Interna D1: ${pecasCJ3.length} peças`)

// CJ004 — Estrutura Telhado
const pecasCJ4 = [
  { conjunto_id: cj4, codigo_peca: `${prefix}-0017`, descricao: 'Terça Metálica U 150×60', comprimento: 6000, largura: 150, espessura: 60, quantidade: 8, unidade: 'un', status: 'aguardando_producao' },
  { conjunto_id: cj4, codigo_peca: `${prefix}-0018`, descricao: 'Ripa Metálica 50×30mm', comprimento: 4000, largura: 50, espessura: 30, quantidade: 40, unidade: 'un', status: 'aguardando_producao' },
  { conjunto_id: cj4, codigo_peca: `${prefix}-0019`, descricao: 'Cumeeira Metálica', comprimento: 8000, largura: 200, espessura: 60, quantidade: 2, unidade: 'un', status: 'aguardando_producao' },
]
const pecasIdsCJ4 = await insertMany('pecas', pecasCJ4)
log(`CJ004 — Estrutura Telhado: ${pecasCJ4.length} peças`)

// ── 10. ROTEIRO DE PRODUÇÃO ─────────────────────────────────
// Roteiro padrão para peças metálicas: Corte → Furação → Lixamento → Montagem → Inspeção CQ
// Roteiro chapas: Corte → Lixamento → Inspeção CQ
// Roteiro estrutura telhado: Corte → Furação → Montagem → Pintura → Inspeção CQ

const roteiroMetal = (pecaId) => [
  { peca_id: pecaId, processo_id: pMap['Corte'],       maquina_id: maqMap['Serra Circular SC-01'],    sequencia: 1, obrigatorio: true,  status: 'concluida' },
  { peca_id: pecaId, processo_id: pMap['Furação'],     maquina_id: maqMap['Furadeira de Bancada FB-01'], sequencia: 2, obrigatorio: true,  status: 'concluida' },
  { peca_id: pecaId, processo_id: pMap['Lixamento'],   maquina_id: maqMap['Lixadeira L-01'],          sequencia: 3, obrigatorio: false, status: 'concluida' },
  { peca_id: pecaId, processo_id: pMap['Montagem'],    maquina_id: maqMap['Bancada Montagem M-01'],   sequencia: 4, obrigatorio: true,  status: 'pendente' },
  { peca_id: pecaId, processo_id: pMap['Inspeção CQ'], maquina_id: null,                              sequencia: 5, obrigatorio: true,  status: 'pendente' },
]
const roteiroChapa = (pecaId) => [
  { peca_id: pecaId, processo_id: pMap['Corte'],       maquina_id: maqMap['Serra Fita SF-02'],        sequencia: 1, obrigatorio: true,  status: 'concluida' },
  { peca_id: pecaId, processo_id: pMap['Lixamento'],   maquina_id: maqMap['Lixadeira L-01'],          sequencia: 2, obrigatorio: false, status: 'pendente' },
  { peca_id: pecaId, processo_id: pMap['Inspeção CQ'], maquina_id: null,                              sequencia: 3, obrigatorio: true,  status: 'pendente' },
]
const roteiroTelhado = (pecaId) => [
  { peca_id: pecaId, processo_id: pMap['Corte'],       maquina_id: maqMap['Serra Circular SC-01'],    sequencia: 1, obrigatorio: true,  status: 'pendente' },
  { peca_id: pecaId, processo_id: pMap['Furação'],     maquina_id: maqMap['CNC Furação CNC-01'],      sequencia: 2, obrigatorio: true,  status: 'pendente' },
  { peca_id: pecaId, processo_id: pMap['Montagem'],    maquina_id: maqMap['Bancada Montagem M-02'],   sequencia: 3, obrigatorio: true,  status: 'pendente' },
  { peca_id: pecaId, processo_id: pMap['Pintura'],     maquina_id: maqMap['Cabine de Pintura P-01'],  sequencia: 4, obrigatorio: true,  status: 'pendente' },
  { peca_id: pecaId, processo_id: pMap['Inspeção CQ'], maquina_id: null,                              sequencia: 5, obrigatorio: true,  status: 'pendente' },
]

// CJ001 — mix de roteiros
const roteiroRows = []
const pecaDescMap = {}
pecasCJ1.forEach((p, i) => pecaDescMap[pecasIdsCJ1[i]] = p.descricao)
pecasCJ2.forEach((p, i) => pecaDescMap[pecasIdsCJ2[i]] = p.descricao)

// Montantes e guias: roteiroMetal
for (const pid of [pecasIdsCJ1[0], pecasIdsCJ1[1], pecasIdsCJ1[2], pecasIdsCJ1[3], pecasIdsCJ1[4], pecasIdsCJ1[6], pecasIdsCJ1[7]]) {
  roteiroRows.push(...roteiroMetal(pid))
}
// Chapas: roteiroChapa
roteiroRows.push(...roteiroChapa(pecasIdsCJ1[5]))

// CJ002 — todos aguardando, roteiro simples
for (const pid of [...pecasIdsCJ2.slice(0,3)]) {
  roteiroRows.push(...[
    { peca_id: pid, processo_id: pMap['Corte'],       maquina_id: maqMap['Serra Circular SC-01'],  sequencia: 1, obrigatorio: true, status: 'pendente' },
    { peca_id: pid, processo_id: pMap['Furação'],     maquina_id: maqMap['Furadeira de Bancada FB-01'], sequencia: 2, obrigatorio: true, status: 'pendente' },
    { peca_id: pid, processo_id: pMap['Montagem'],    maquina_id: maqMap['Bancada Montagem M-01'], sequencia: 3, obrigatorio: true, status: 'pendente' },
    { peca_id: pid, processo_id: pMap['Inspeção CQ'], maquina_id: null,                            sequencia: 4, obrigatorio: true, status: 'pendente' },
  ])
}
for (const pid of [pecasIdsCJ2[3], pecasIdsCJ2[4]]) {
  roteiroRows.push(...roteiroChapa(pid))
}

// CJ003 — Drywall: Corte → Inspeção CQ
for (const pid of pecasIdsCJ3) {
  roteiroRows.push(
    { peca_id: pid, processo_id: pMap['Corte'],       maquina_id: maqMap['Serra Fita SF-02'], sequencia: 1, obrigatorio: true, status: 'pendente' },
    { peca_id: pid, processo_id: pMap['Inspeção CQ'], maquina_id: null,                       sequencia: 2, obrigatorio: true, status: 'pendente' },
  )
}

// CJ004 — Telhado: roteiroTelhado
for (const pid of pecasIdsCJ4) {
  roteiroRows.push(...roteiroTelhado(pid))
}

const { error: roteiroErr } = await db.from('roteiro_producao').insert(roteiroRows)
if (roteiroErr) { err('insert roteiro_producao', roteiroErr); process.exit(1) }
log(`Roteiros criados: ${roteiroRows.length} etapas`)

// ── 11. APONTAMENTOS (histórico de produção do CJ001) ───────
// Buscar roteiro IDs das peças aprovadas do CJ001
const { data: roteiroData } = await db
  .from('roteiro_producao')
  .select('id, peca_id, processo_id, sequencia, status')
  .in('peca_id', pecasIdsCJ1)
  .eq('status', 'concluida')

const apontamentos = []
const now = new Date()
const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString()

for (const etapa of (roteiroData ?? [])) {
  const operador = etapa.processo_id === pMap['Corte']    ? uByNome['Pedro']  :
                   etapa.processo_id === pMap['Furação']  ? uByNome['Marcos'] :
                   etapa.processo_id === pMap['Lixamento'] ? uByNome['Pedro'] : uByNome['Carlos']
  apontamentos.push({
    roteiro_id: etapa.id,
    operador_id: operador,
    inicio: daysAgo(3),
    fim: daysAgo(3),
    quantidade_ok: 1,
    quantidade_refugo: 0,
    quantidade_retrabalho: 0,
    observacoes: 'Executado conforme especificação.',
  })
}

if (apontamentos.length > 0) {
  const { error: apErr } = await db.from('apontamentos_producao').insert(apontamentos)
  if (apErr) { err('insert apontamentos', apErr) } else { log(`Apontamentos registrados: ${apontamentos.length}`) }
}

// ── 12. MOVIMENTAÇÕES ───────────────────────────────────────
const movs = pecasIdsCJ1.slice(0, 3).map(pid => ({
  peca_id: pid,
  origem: 'Serraria',
  destino: 'Área de Montagem',
  responsavel_id: uByNome['Carlos'],
  observacao: 'Transferência pós-corte e furação',
}))
const { error: movErr } = await db.from('movimentacoes').insert(movs)
if (movErr) { err('insert movimentacoes', movErr) } else { log(`Movimentações registradas: ${movs.length}`) }

// ── 13. NÃO CONFORMIDADE (peça em retrabalho) ───────────────
const pecaRetrabalhoId = pecasIdsCJ1[7] // Verga Metálica — status retrabalho
const { data: roteiroRetrabalho } = await db
  .from('roteiro_producao')
  .select('id')
  .eq('peca_id', pecaRetrabalhoId)
  .eq('sequencia', 1)
  .single()

if (roteiroRetrabalho) {
  await db.from('nao_conformidades').insert({
    peca_id: pecaRetrabalhoId,
    roteiro_id: roteiroRetrabalho.id,
    descricao: 'Dimensionamento fora da tolerância: comprimento 1420mm (especificado 1400mm ±5mm). Peça precisa ser reaproveitada ou substituída.',
    responsavel_registro_id: uMap['qualidade'],
    acao_corretiva: 'Rearrandar nas extremidades para ajuste dimensional.',
    status: 'em_correcao',
  })
  log('Não Conformidade registrada: Verga Metálica Janela — dimensionamento fora de tolerância')
}

// ── RESUMO ──────────────────────────────────────────────────
console.log('\n' + '─'.repeat(55))
console.log('  RESUMO DA SIMULAÇÃO')
console.log('─'.repeat(55))
console.log(`  Obra         : Edifício Residencial Veredas do Sol`)
console.log(`  Cliente      : Construtora Horizonte Ltda`)
console.log(`  Solicitante  : Sandra Lima (Gerente de Obra)`)
console.log(`  Encarregado  : Carlos Oliveira`)
console.log(`  OP           : OP-2026-0018 — Em Produção`)
console.log(`  Conjuntos    : 4`)
console.log(`  Peças totais : ${pecasCJ1.length + pecasCJ2.length + pecasCJ3.length + pecasCJ4.length}`)
console.log(`  Etapas roteiro: ${roteiroRows.length}`)
console.log(`  Apontamentos : ${apontamentos.length}`)
console.log()
console.log('  Status das peças:')
console.log('   • CJ001 Parede Externa A1 — Em andamento (mix aprovada/processo/inspeção/retrabalho)')
console.log('   • CJ002 Parede Externa A2 — Aguardando produção')
console.log('   • CJ003 Divisória Interna  — Aguardando produção')
console.log('   • CJ004 Estrutura Telhado  — Aguardando produção')
console.log('─'.repeat(55))
console.log('  ✅ Seed concluído!\n')
