/**
 * Cadwork Import Parser
 * Suporta CSV (separador ; ou ,) e XML exportados pelo Cadwork.
 * Preserva o ID original (cadwork_id) de cada peça.
 */

export interface CadworkPeca {
  cadwork_id: string
  descricao: string
  quantidade: number
  comprimento: number | null
  largura: number | null
  altura: number | null
  espessura: number | null
  material: string | null
  grupo: string       // → Conjunto (Parede, Estrutura, etc.)
  modulo: string | null // → Módulo (agrupamento superior)
}

export interface CadworkImportResult {
  pecas: CadworkPeca[]
  grupos: string[]          // grupos únicos encontrados
  modulos: string[]         // módulos únicos encontrados
  totalPecas: number
  erros: string[]
}

// ─────────────────────────────────────────────────────────────
// Mapeamento de nomes de colunas (alemão / inglês / português)
// ─────────────────────────────────────────────────────────────
const COL_ID = ['pos', 'nr', 'no', 'id', 'numero', 'número', 'nummer', 'position', 'positionsnummer', 'artno', 'art_no', 'code', 'código', 'codigo']
const COL_DESC = ['bezeichnung', 'name', 'description', 'desc', 'descricao', 'descrição', 'artikel', 'item', 'bauteil', 'title', 'label']
const COL_QTY = ['anzahl', 'qty', 'quantity', 'menge', 'quant', 'qtd', 'quantidade', 'count', 'amount']
const COL_LEN = ['länge', 'laenge', 'length', 'l', 'comprimento', 'comp', 'lng']
const COL_WID = ['breite', 'width', 'w', 'largura', 'larg', 'wid']
const COL_HGT = ['höhe', 'hoehe', 'height', 'h', 'altura', 'alt', 'hgt']
const COL_THK = ['stärke', 'starke', 'dicke', 'thickness', 'espessura', 'esp', 'thk', 'tiefe', 'depth']
const COL_MAT = ['material', 'holz', 'wood', 'mat', 'timber', 'madeira', 'specie', 'species']
const COL_GRP = ['gruppe', 'group', 'grupo', 'assembly', 'bauteilgruppe', 'wall', 'parede', 'conjunto', 'set']
const COL_MOD = ['modul', 'module', 'modulo', 'módulo', 'module_name', 'layer', 'level', 'piso']

function normalizeKey(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
}

function matchColumn(header: string, candidates: string[]): boolean {
  const k = normalizeKey(header)
  return candidates.some(c => normalizeKey(c) === k)
}

function findCol(headers: string[], candidates: string[]): number {
  return headers.findIndex(h => matchColumn(h, candidates))
}

function parseNum(v: string | undefined): number | null {
  if (!v) return null
  const n = parseFloat(v.replace(',', '.').trim())
  return isNaN(n) ? null : n
}

// ─────────────────────────────────────────────────────────────
// CSV Parser
// ─────────────────────────────────────────────────────────────
export function parseCSV(content: string): CadworkImportResult {
  const erros: string[] = []
  const lines = content.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) {
    return { pecas: [], grupos: [], modulos: [], totalPecas: 0, erros: ['Arquivo CSV vazio ou inválido.'] }
  }

  // Detectar separador
  const firstLine = lines[0]
  const sep = firstLine.includes(';') ? ';' : ','

  const parseRow = (line: string): string[] =>
    line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''))

  const headers = parseRow(lines[0])
  const colId  = findCol(headers, COL_ID)
  const colDesc = findCol(headers, COL_DESC)
  const colQty  = findCol(headers, COL_QTY)
  const colLen  = findCol(headers, COL_LEN)
  const colWid  = findCol(headers, COL_WID)
  const colHgt  = findCol(headers, COL_HGT)
  const colThk  = findCol(headers, COL_THK)
  const colMat  = findCol(headers, COL_MAT)
  const colGrp  = findCol(headers, COL_GRP)
  const colMod  = findCol(headers, COL_MOD)

  if (colDesc === -1) {
    erros.push('Coluna de descrição/nome não encontrada. Verifique os cabeçalhos do CSV.')
  }

  const pecas: CadworkPeca[] = []
  let autoId = 1

  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i])
    if (row.every(c => !c)) continue // linha vazia

    const cadwork_id = colId >= 0 && row[colId] ? row[colId] : String(autoId++)
    const descricao  = (colDesc >= 0 ? row[colDesc] : '') || `Peça ${cadwork_id}`
    const grupo      = (colGrp >= 0 ? row[colGrp] : '') || 'Conjunto Geral'
    const modulo     = colMod >= 0 ? (row[colMod] || null) : null

    pecas.push({
      cadwork_id,
      descricao,
      quantidade: parseNum(colQty >= 0 ? row[colQty] : undefined) ?? 1,
      comprimento: parseNum(colLen >= 0 ? row[colLen] : undefined),
      largura:     parseNum(colWid >= 0 ? row[colWid] : undefined),
      altura:      parseNum(colHgt >= 0 ? row[colHgt] : undefined),
      espessura:   parseNum(colThk >= 0 ? row[colThk] : undefined),
      material:    colMat >= 0 ? (row[colMat] || null) : null,
      grupo,
      modulo,
    })
  }

  const grupos  = [...new Set(pecas.map(p => p.grupo))]
  const modulos = [...new Set(pecas.map(p => p.modulo).filter(Boolean))] as string[]

  return { pecas, grupos, modulos, totalPecas: pecas.length, erros }
}

// ─────────────────────────────────────────────────────────────
// XML Parser (suporta múltiplos formatos de export do Cadwork)
// ─────────────────────────────────────────────────────────────
export function parseXML(content: string): CadworkImportResult {
  const erros: string[] = []

  let doc: Document
  try {
    const parser = new DOMParser()
    doc = parser.parseFromString(content, 'application/xml')
    const parseErr = doc.querySelector('parsererror')
    if (parseErr) throw new Error(parseErr.textContent ?? 'XML inválido')
  } catch (e) {
    return { pecas: [], grupos: [], modulos: [], totalPecas: 0, erros: [`Erro ao parsear XML: ${e}`] }
  }

  const text = (el: Element | null, ...tags: string[]): string | null => {
    if (!el) return null
    for (const tag of tags) {
      const found = el.querySelector(tag)
      if (found?.textContent?.trim()) return found.textContent.trim()
    }
    return null
  }

  const attr = (el: Element | null, ...attrs: string[]): string | null => {
    if (!el) return null
    for (const a of attrs) {
      const v = el.getAttribute(a)
      if (v) return v
    }
    return null
  }

  const pecas: CadworkPeca[] = []
  let autoId = 1

  // Tenta selectors comuns do Cadwork XML / BTLx
  const elementSelectors = ['element', 'Timber', 'timber', 'Part', 'part', 'Item', 'item', 'Piece', 'piece', 'Row', 'row']
  let elements: NodeListOf<Element> | Element[] = []

  for (const sel of elementSelectors) {
    const found = doc.querySelectorAll(sel)
    if (found.length > 0) { elements = found; break }
  }

  if (elements.length === 0) {
    erros.push('Nenhum elemento encontrado no XML. Tente exportar como CSV.')
    return { pecas: [], grupos: [], modulos: [], totalPecas: 0, erros }
  }

  elements.forEach((el) => {
    const cadwork_id =
      attr(el, 'id', 'Id', 'ID', 'nr', 'Nr', 'pos', 'Pos') ||
      text(el, 'id', 'Id', 'ID', 'nr', 'Nr', 'pos', 'Pos', 'Nummer', 'nummer', 'Code', 'code') ||
      String(autoId++)

    const descricao =
      text(el, 'Bezeichnung', 'bezeichnung', 'Name', 'name', 'Description', 'description',
           'Comment', 'comment', 'Descricao', 'descricao', 'Title', 'title') ||
      `Peça ${cadwork_id}`

    const grupo =
      text(el, 'Gruppe', 'gruppe', 'Group', 'group', 'Grupo', 'grupo',
           'Assembly', 'assembly', 'Conjunto', 'conjunto') ||
      attr(el, 'group', 'grupo', 'assembly') ||
      'Conjunto Geral'

    const modulo =
      text(el, 'Modul', 'modul', 'Module', 'module', 'Modulo', 'modulo') ||
      attr(el, 'module', 'modulo') ||
      null

    const qty = parseNum(
      text(el, 'Anzahl', 'anzahl', 'Quantity', 'quantity', 'Qty', 'qty',
           'Menge', 'menge', 'Quantidade', 'quantidade', 'Count', 'count') ?? undefined
    ) ?? 1

    const crossSectionEl = el.querySelector('CrossSection, crosssection, Section, section')
    const comprimento = parseNum(
      text(el, 'LengthWork', 'Laenge', 'laenge', 'Length', 'length', 'Comprimento', 'comprimento', 'L') ??
      attr(crossSectionEl, 'Length', 'length') ?? undefined
    )
    const largura = parseNum(
      text(el, 'Breite', 'breite', 'Width', 'width', 'Largura', 'largura', 'W') ??
      attr(crossSectionEl, 'Width', 'width') ?? undefined
    )
    const altura = parseNum(
      text(el, 'Hoehe', 'hoehe', 'Height', 'height', 'Altura', 'altura', 'H') ??
      attr(crossSectionEl, 'Height', 'height') ?? undefined
    )
    const espessura = parseNum(
      text(el, 'Staerke', 'staerke', 'Dicke', 'dicke', 'Thickness', 'thickness',
           'Espessura', 'espessura', 'Depth', 'depth') ?? undefined
    )

    const material =
      text(el, 'Material', 'material', 'Holz', 'holz', 'Timber', 'timber', 'Madeira', 'madeira') || null

    pecas.push({ cadwork_id, descricao, quantidade: qty, comprimento, largura, altura, espessura, material, grupo, modulo })
  })

  const grupos  = [...new Set(pecas.map(p => p.grupo))]
  const modulos = [...new Set(pecas.map(p => p.modulo).filter(Boolean))] as string[]

  return { pecas, grupos, modulos, totalPecas: pecas.length, erros }
}

// ─────────────────────────────────────────────────────────────
// Entry point — detecta tipo de arquivo automaticamente
// ─────────────────────────────────────────────────────────────
export async function parseCadworkFile(file: File): Promise<CadworkImportResult> {
  const content = await file.text()
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.xml') || lower.endsWith('.btlx')) {
    return parseXML(content)
  }
  return parseCSV(content)
}
