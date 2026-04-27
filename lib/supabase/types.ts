export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type StatusObra = 'ativa' | 'concluida' | 'pausada' | 'cancelada'
export type StatusSolicitacao = 'aberta' | 'em_analise' | 'aprovada' | 'cancelada' | 'convertida_em_op'
export type StatusOP = 'criada' | 'planejada' | 'em_producao' | 'parcialmente_concluida' | 'concluida' | 'bloqueada' | 'cancelada' | 'expedida'
export type StatusPeca = 'aguardando_producao' | 'em_processo' | 'parada' | 'retrabalho' | 'inspecao' | 'aprovada' | 'rejeitada' | 'expedida'
export type StatusEtapa = 'pendente' | 'em_andamento' | 'concluida' | 'bloqueada' | 'pulada'
export type StatusNC = 'aberta' | 'em_analise' | 'em_correcao' | 'resolvida' | 'descartada'
export type PrioridadeSolicitacao = 'baixa' | 'normal' | 'alta' | 'urgente'
export type TipoVinculo = 'funcionario' | 'terceirizado'
export type TipoPerfil = 'admin' | 'pcp' | 'engenharia' | 'encarregado' | 'operador' | 'qualidade' | 'expedicao' | 'solicitante'
export type TipoEmpresa = 'dst' | 'divisao_dst' | 'terceirizada'

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string
          nome: string
          tipo: TipoEmpresa
          ativo: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['empresas']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['empresas']['Insert']>
      }
      usuarios: {
        Row: {
          id: string
          nome: string
          email: string
          empresa_id: string | null
          tipo_vinculo: TipoVinculo | null
          perfil: TipoPerfil
          funcao: string | null
          ativo: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['usuarios']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['usuarios']['Insert']>
      }
      obras: {
        Row: {
          id: string
          nome: string
          tipo: string | null
          cliente: string | null
          localizacao: string | null
          status: StatusObra
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['obras']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['obras']['Insert']>
      }
      processos: {
        Row: {
          id: string
          nome: string
          tipo: string | null
          setor: string | null
          ordem_padrao: number
          ativo: boolean
          exige_foto: boolean
          exige_inspecao: boolean
          permite_retrabalho: boolean
          tempo_medio_min: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['processos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['processos']['Insert']>
      }
      maquinas: {
        Row: {
          id: string
          nome: string
          setor: string | null
          processo_id: string | null
          ativa: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['maquinas']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['maquinas']['Insert']>
      }
      materiais: {
        Row: {
          id: string
          nome: string
          unidade: string
          descricao: string | null
          ativo: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['materiais']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['materiais']['Insert']>
      }
      solicitacoes: {
        Row: {
          id: string
          codigo: string
          obra_id: string
          solicitante_id: string | null
          prioridade: PrioridadeSolicitacao
          prazo: string | null
          descricao: string | null
          status: StatusSolicitacao
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['solicitacoes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['solicitacoes']['Insert']>
      }
      ordens_producao: {
        Row: {
          id: string
          codigo_op: string
          solicitacao_id: string | null
          obra_id: string
          encarregado_id: string | null
          prioridade: PrioridadeSolicitacao
          prazo: string | null
          status: StatusOP
          observacoes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ordens_producao']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['ordens_producao']['Insert']>
      }
      conjuntos: {
        Row: {
          id: string
          op_id: string
          codigo_conjunto: string
          nome: string
          descricao: string | null
          local_aplicacao: string | null
          desenho_url: string | null
          status: StatusPeca
          modulo: string | null
          cadwork_projeto_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['conjuntos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['conjuntos']['Insert']>
      }
      pecas: {
        Row: {
          id: string
          conjunto_id: string
          codigo_peca: string
          descricao: string
          comprimento: number | null
          largura: number | null
          altura: number | null
          espessura: number | null
          material_id: string | null
          quantidade: number
          unidade: string
          status: StatusPeca
          localizacao_atual: string | null
          qr_code: string | null
          cadwork_id: string | null
          cadwork_projeto_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['pecas']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pecas']['Insert']>
      }
      roteiro_producao: {
        Row: {
          id: string
          peca_id: string | null
          conjunto_id: string | null
          processo_id: string
          maquina_id: string | null
          sequencia: number
          obrigatorio: boolean
          status: StatusEtapa
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['roteiro_producao']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['roteiro_producao']['Insert']>
      }
      apontamentos_producao: {
        Row: {
          id: string
          roteiro_id: string
          operador_id: string | null
          empresa_id: string | null
          inicio: string
          fim: string | null
          quantidade_ok: number
          quantidade_refugo: number
          quantidade_retrabalho: number
          observacoes: string | null
          problema_reportado: string | null
          foto_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['apontamentos_producao']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['apontamentos_producao']['Insert']>
      }
      movimentacoes: {
        Row: {
          id: string
          peca_id: string | null
          conjunto_id: string | null
          origem: string
          destino: string
          data_hora: string
          responsavel_id: string | null
          observacao: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['movimentacoes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['movimentacoes']['Insert']>
      }
      nao_conformidades: {
        Row: {
          id: string
          peca_id: string | null
          conjunto_id: string | null
          roteiro_id: string | null
          descricao: string
          responsavel_registro_id: string | null
          acao_corretiva: string | null
          status: StatusNC
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['nao_conformidades']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['nao_conformidades']['Insert']>
      }
      expedicoes: {
        Row: {
          id: string
          op_id: string
          obra_id: string
          responsavel_id: string | null
          data_saida: string
          observacoes: string | null
          completo: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['expedicoes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['expedicoes']['Insert']>
      }
      cadwork_projetos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          obra_id: string | null
          op_id: string | null
          viewer_url: string | null
          total_pecas: number
          total_conjuntos: number
          status: string
          importado_em: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['cadwork_projetos']['Row'], 'id' | 'created_at' | 'importado_em'>
        Update: Partial<Database['public']['Tables']['cadwork_projetos']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience types
export type Empresa = Database['public']['Tables']['empresas']['Row']
export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type Obra = Database['public']['Tables']['obras']['Row']
export type Processo = Database['public']['Tables']['processos']['Row']
export type Maquina = Database['public']['Tables']['maquinas']['Row']
export type Material = Database['public']['Tables']['materiais']['Row']
export type Solicitacao = Database['public']['Tables']['solicitacoes']['Row']
export type OrdemProducao = Database['public']['Tables']['ordens_producao']['Row']
export type Conjunto = Database['public']['Tables']['conjuntos']['Row']
export type Peca = Database['public']['Tables']['pecas']['Row']
export type RoteiroProducao = Database['public']['Tables']['roteiro_producao']['Row']
export type ApontamentoProducao = Database['public']['Tables']['apontamentos_producao']['Row']
export type Movimentacao = Database['public']['Tables']['movimentacoes']['Row']
export type NaoConformidade = Database['public']['Tables']['nao_conformidades']['Row']
export type Expedicao = Database['public']['Tables']['expedicoes']['Row']
export type CadworkProjeto = Database['public']['Tables']['cadwork_projetos']['Row']
