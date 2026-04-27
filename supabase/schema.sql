-- ============================================================
-- ZETWOOD DST MVP - Schema do Banco de Dados
-- Executar no SQL Editor do Supabase
-- ============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE status_obra AS ENUM ('ativa','concluida','pausada','cancelada');
CREATE TYPE status_solicitacao AS ENUM ('aberta','em_analise','aprovada','cancelada','convertida_em_op');
CREATE TYPE status_op AS ENUM ('criada','planejada','em_producao','parcialmente_concluida','concluida','bloqueada','cancelada','expedida');
CREATE TYPE status_peca AS ENUM ('aguardando_producao','em_processo','parada','retrabalho','inspecao','aprovada','rejeitada','expedida');
CREATE TYPE status_etapa AS ENUM ('pendente','em_andamento','concluida','bloqueada','pulada');
CREATE TYPE status_nc AS ENUM ('aberta','em_analise','em_correcao','resolvida','descartada');
CREATE TYPE prioridade AS ENUM ('baixa','normal','alta','urgente');
CREATE TYPE tipo_vinculo AS ENUM ('funcionario','terceirizado');
CREATE TYPE tipo_perfil AS ENUM ('admin','pcp','engenharia','encarregado','operador','qualidade','expedicao','solicitante');
CREATE TYPE tipo_empresa AS ENUM ('dst','divisao_dst','terceirizada');

-- ============================================================
-- EMPRESAS
-- ============================================================
CREATE TABLE empresas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  tipo        tipo_empresa NOT NULL DEFAULT 'dst',
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USUARIOS
-- ============================================================
CREATE TABLE usuarios (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome         TEXT NOT NULL,
  email        TEXT UNIQUE,
  empresa_id   UUID REFERENCES empresas(id),
  tipo_vinculo tipo_vinculo,
  perfil       tipo_perfil NOT NULL DEFAULT 'operador',
  funcao       TEXT,
  ativo        BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- OBRAS
-- ============================================================
CREATE TABLE obras (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  tipo        TEXT,
  cliente     TEXT,
  localizacao TEXT,
  status      status_obra NOT NULL DEFAULT 'ativa',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROCESSOS
-- ============================================================
CREATE TABLE processos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome              TEXT NOT NULL,
  tipo              TEXT,
  setor             TEXT,
  ordem_padrao      INTEGER NOT NULL DEFAULT 1,
  ativo             BOOLEAN NOT NULL DEFAULT true,
  exige_foto        BOOLEAN NOT NULL DEFAULT false,
  exige_inspecao    BOOLEAN NOT NULL DEFAULT false,
  permite_retrabalho BOOLEAN NOT NULL DEFAULT true,
  tempo_medio_min   INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MAQUINAS
-- ============================================================
CREATE TABLE maquinas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  setor       TEXT,
  processo_id UUID REFERENCES processos(id),
  ativa       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MATERIAIS
-- ============================================================
CREATE TABLE materiais (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT NOT NULL,
  unidade     TEXT NOT NULL DEFAULT 'un',
  descricao   TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SOLICITAÇÕES
-- ============================================================
CREATE TABLE solicitacoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo          TEXT NOT NULL UNIQUE,
  obra_id         UUID NOT NULL REFERENCES obras(id),
  solicitante_id  UUID REFERENCES usuarios(id),
  prioridade      prioridade NOT NULL DEFAULT 'normal',
  prazo           DATE,
  descricao       TEXT,
  status          status_solicitacao NOT NULL DEFAULT 'aberta',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ORDENS DE PRODUÇÃO
-- ============================================================
CREATE TABLE ordens_producao (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_op       TEXT NOT NULL UNIQUE,
  solicitacao_id  UUID REFERENCES solicitacoes(id),
  obra_id         UUID NOT NULL REFERENCES obras(id),
  encarregado_id  UUID REFERENCES usuarios(id),
  prioridade      prioridade NOT NULL DEFAULT 'normal',
  prazo           DATE,
  status          status_op NOT NULL DEFAULT 'criada',
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CONJUNTOS (parede, módulo, estrutura)
-- ============================================================
CREATE TABLE conjuntos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  op_id            UUID NOT NULL REFERENCES ordens_producao(id) ON DELETE CASCADE,
  codigo_conjunto  TEXT NOT NULL UNIQUE,
  nome             TEXT NOT NULL,
  descricao        TEXT,
  local_aplicacao  TEXT,
  desenho_url      TEXT,
  status           status_peca NOT NULL DEFAULT 'aguardando_producao',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PEÇAS
-- ============================================================
CREATE TABLE pecas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conjunto_id     UUID NOT NULL REFERENCES conjuntos(id) ON DELETE CASCADE,
  codigo_peca     TEXT NOT NULL UNIQUE,
  descricao       TEXT NOT NULL,
  comprimento     NUMERIC(10,2),
  largura         NUMERIC(10,2),
  altura          NUMERIC(10,2),
  espessura       NUMERIC(10,2),
  material_id     UUID REFERENCES materiais(id),
  quantidade      NUMERIC(10,2) NOT NULL DEFAULT 1,
  unidade         TEXT NOT NULL DEFAULT 'un',
  status          status_peca NOT NULL DEFAULT 'aguardando_producao',
  localizacao_atual TEXT,
  qr_code         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROTEIRO DE PRODUÇÃO (quais etapas cada peça/conjunto passa)
-- ============================================================
CREATE TABLE roteiro_producao (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  peca_id      UUID REFERENCES pecas(id) ON DELETE CASCADE,
  conjunto_id  UUID REFERENCES conjuntos(id) ON DELETE CASCADE,
  processo_id  UUID NOT NULL REFERENCES processos(id),
  maquina_id   UUID REFERENCES maquinas(id),
  sequencia    INTEGER NOT NULL DEFAULT 1,
  obrigatorio  BOOLEAN NOT NULL DEFAULT true,
  status       status_etapa NOT NULL DEFAULT 'pendente',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (peca_id IS NOT NULL OR conjunto_id IS NOT NULL)
);

-- ============================================================
-- APONTAMENTOS DE PRODUÇÃO (rastreabilidade real)
-- ============================================================
CREATE TABLE apontamentos_producao (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roteiro_id            UUID NOT NULL REFERENCES roteiro_producao(id),
  operador_id           UUID REFERENCES usuarios(id),
  empresa_id            UUID REFERENCES empresas(id),
  inicio                TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim                   TIMESTAMPTZ,
  quantidade_ok         NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantidade_refugo     NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantidade_retrabalho NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacoes           TEXT,
  problema_reportado    TEXT,
  foto_url              TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MOVIMENTAÇÕES (onde a peça está no barracão)
-- ============================================================
CREATE TABLE movimentacoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  peca_id         UUID REFERENCES pecas(id),
  conjunto_id     UUID REFERENCES conjuntos(id),
  origem          TEXT NOT NULL,
  destino         TEXT NOT NULL,
  data_hora       TIMESTAMPTZ NOT NULL DEFAULT now(),
  responsavel_id  UUID REFERENCES usuarios(id),
  observacao      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- NÃO CONFORMIDADES
-- ============================================================
CREATE TABLE nao_conformidades (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  peca_id                 UUID REFERENCES pecas(id),
  conjunto_id             UUID REFERENCES conjuntos(id),
  roteiro_id              UUID REFERENCES roteiro_producao(id),
  descricao               TEXT NOT NULL,
  responsavel_registro_id UUID REFERENCES usuarios(id),
  acao_corretiva          TEXT,
  status                  status_nc NOT NULL DEFAULT 'aberta',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- EXPEDIÇÕES
-- ============================================================
CREATE TABLE expedicoes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  op_id           UUID NOT NULL REFERENCES ordens_producao(id),
  obra_id         UUID NOT NULL REFERENCES obras(id),
  responsavel_id  UUID REFERENCES usuarios(id),
  data_saida      TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacoes     TEXT,
  completo        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
CREATE INDEX idx_solicitacoes_obra ON solicitacoes(obra_id);
CREATE INDEX idx_op_obra ON ordens_producao(obra_id);
CREATE INDEX idx_op_status ON ordens_producao(status);
CREATE INDEX idx_conjuntos_op ON conjuntos(op_id);
CREATE INDEX idx_pecas_conjunto ON pecas(conjunto_id);
CREATE INDEX idx_pecas_status ON pecas(status);
CREATE INDEX idx_pecas_codigo ON pecas(codigo_peca);
CREATE INDEX idx_roteiro_peca ON roteiro_producao(peca_id);
CREATE INDEX idx_roteiro_conjunto ON roteiro_producao(conjunto_id);
CREATE INDEX idx_apontamentos_roteiro ON apontamentos_producao(roteiro_id);
CREATE INDEX idx_apontamentos_operador ON apontamentos_producao(operador_id);
CREATE INDEX idx_nc_peca ON nao_conformidades(peca_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - desabilitado para MVP
-- Habilitar e configurar políticas antes de produção
-- ============================================================
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE conjuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE roteiro_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE apontamentos_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nao_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE expedicoes ENABLE ROW LEVEL SECURITY;

-- Políticas abertas para MVP (acesso total autenticado)
CREATE POLICY "acesso_total" ON empresas FOR ALL USING (true);
CREATE POLICY "acesso_total" ON usuarios FOR ALL USING (true);
CREATE POLICY "acesso_total" ON obras FOR ALL USING (true);
CREATE POLICY "acesso_total" ON processos FOR ALL USING (true);
CREATE POLICY "acesso_total" ON maquinas FOR ALL USING (true);
CREATE POLICY "acesso_total" ON materiais FOR ALL USING (true);
CREATE POLICY "acesso_total" ON solicitacoes FOR ALL USING (true);
CREATE POLICY "acesso_total" ON ordens_producao FOR ALL USING (true);
CREATE POLICY "acesso_total" ON conjuntos FOR ALL USING (true);
CREATE POLICY "acesso_total" ON pecas FOR ALL USING (true);
CREATE POLICY "acesso_total" ON roteiro_producao FOR ALL USING (true);
CREATE POLICY "acesso_total" ON apontamentos_producao FOR ALL USING (true);
CREATE POLICY "acesso_total" ON movimentacoes FOR ALL USING (true);
CREATE POLICY "acesso_total" ON nao_conformidades FOR ALL USING (true);
CREATE POLICY "acesso_total" ON expedicoes FOR ALL USING (true);

-- ============================================================
-- DADOS INICIAIS - ZETWOOD
-- ============================================================
INSERT INTO empresas (nome, tipo) VALUES
  ('DST - Grupo', 'dst'),
  ('ZETWOOD', 'divisao_dst');

INSERT INTO processos (nome, tipo, setor, ordem_padrao, exige_foto, exige_inspecao, permite_retrabalho, tempo_medio_min) VALUES
  ('Recebimento de Material', 'recebimento', 'almoxarifado', 1, false, false, false, 30),
  ('Corte Reto', 'corte', 'serra', 2, false, false, true, 15),
  ('Corte Complexo', 'corte', 'cnc', 3, true, false, true, 30),
  ('Plaina', 'usinagem', 'plaina', 4, false, false, true, 20),
  ('Usinagem CNC', 'usinagem', 'cnc', 5, true, true, true, 45),
  ('Montagem de Estrutura', 'montagem', 'montagem', 6, true, true, true, 60),
  ('Fixação de Placas', 'montagem', 'montagem', 7, true, false, true, 45),
  ('Acabamento', 'acabamento', 'acabamento', 8, true, false, true, 30),
  ('Pintura', 'pintura', 'pintura', 9, true, true, false, 60),
  ('Inspeção Final', 'inspecao', 'qualidade', 10, true, true, false, 20),
  ('Expedição', 'expedicao', 'expedição', 11, false, false, false, 30);
