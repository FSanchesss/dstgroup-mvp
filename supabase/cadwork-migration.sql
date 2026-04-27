-- ============================================================
-- CADWORK INTEGRATION — Migration
-- Executar no SQL Editor do Supabase após o schema principal
-- ============================================================

-- Garante search_path correto
SET search_path TO public;

-- Tabela de projetos importados do Cadwork
CREATE TABLE IF NOT EXISTS cadwork_projetos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  descricao       TEXT,
  obra_id         UUID,
  op_id           UUID,
  viewer_url      TEXT,
  total_pecas     INTEGER NOT NULL DEFAULT 0,
  total_conjuntos INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'importado',
  importado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campos Cadwork nas peças (preserva ID original do Cadwork)
ALTER TABLE pecas ADD COLUMN IF NOT EXISTS cadwork_id TEXT;
ALTER TABLE pecas ADD COLUMN IF NOT EXISTS cadwork_projeto_id UUID;

-- Campos Cadwork nos conjuntos
ALTER TABLE conjuntos ADD COLUMN IF NOT EXISTS modulo TEXT;
ALTER TABLE conjuntos ADD COLUMN IF NOT EXISTS cadwork_projeto_id UUID;

-- Índices
CREATE INDEX IF NOT EXISTS idx_cadwork_projetos_obra   ON cadwork_projetos(obra_id);
CREATE INDEX IF NOT EXISTS idx_cadwork_projetos_op     ON cadwork_projetos(op_id);
CREATE INDEX IF NOT EXISTS idx_pecas_cadwork_id        ON pecas(cadwork_id);
CREATE INDEX IF NOT EXISTS idx_pecas_cadwork_projeto   ON pecas(cadwork_projeto_id);
CREATE INDEX IF NOT EXISTS idx_conjuntos_cadwork       ON conjuntos(cadwork_projeto_id);

-- RLS
ALTER TABLE cadwork_projetos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso_total" ON cadwork_projetos FOR ALL USING (true);

-- ============================================================
-- STORAGE BUCKET (executar via Dashboard do Supabase ou API)
-- Criar bucket público: cadwork-viewers
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('cadwork-viewers', 'cadwork-viewers', true);
