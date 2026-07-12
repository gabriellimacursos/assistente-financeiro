// ─── Sistema de erros estruturado ──────────────────────────────────────────
// Cada código segue o padrão CATEGORIA-NNN para fácil identificação.

export type ErrorCode =
  // Lançamentos
  | 'TX-001' | 'TX-002' | 'TX-003'
  // Cartões
  | 'CARD-001' | 'CARD-002' | 'CARD-003'
  // Recorrências
  | 'REC-001' | 'REC-002' | 'REC-003' | 'REC-004'
  // Categorias
  | 'CAT-001' | 'CAT-002'
  // Perfis
  | 'PROF-001' | 'PROF-002' | 'PROF-003'
  // Autenticação
  | 'AUTH-001' | 'AUTH-002' | 'AUTH-003' | 'AUTH-004'
  // Sincronização
  | 'SYNC-001' | 'SYNC-002'
  // Interpretação de IA
  | 'AI-001' | 'AI-002'
  // Permissões
  | 'PERM-001' | 'PERM-002'
  // Administração
  | 'ADM-001' | 'ADM-002' | 'ADM-003' | 'ADM-004'
  // Pagamento de cartão
  | 'PAY-001'
  // Orçamentos
  | 'BUD-001' | 'BUD-002' | 'BUD-003'

interface ErrorDef {
  title: string
  description: string
  action: string
  severity: 'error' | 'warning'
}

export const ERROR_CATALOG: Record<ErrorCode, ErrorDef> = {
  // ── Lançamentos ──
  'TX-001': {
    title: 'Falha ao registrar lançamento',
    description: 'Não foi possível salvar o novo lançamento no banco de dados.',
    action: 'Verifique sua conexão com a internet e tente novamente.',
    severity: 'error',
  },
  'TX-002': {
    title: 'Falha ao atualizar lançamento',
    description: 'Não foi possível salvar as alterações do lançamento.',
    action: 'Verifique sua conexão e tente novamente. As alterações foram revertidas.',
    severity: 'error',
  },
  'TX-003': {
    title: 'Falha ao excluir lançamento',
    description: 'Não foi possível excluir o lançamento do banco de dados.',
    action: 'Verifique sua conexão e tente novamente. O lançamento foi restaurado.',
    severity: 'error',
  },

  // ── Cartões ──
  'CARD-001': {
    title: 'Falha ao adicionar cartão',
    description: 'Não foi possível salvar o novo cartão de crédito.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },
  'CARD-002': {
    title: 'Falha ao atualizar cartão',
    description: 'Não foi possível salvar as alterações do cartão.',
    action: 'Verifique sua conexão e tente novamente. As alterações foram revertidas.',
    severity: 'error',
  },
  'CARD-003': {
    title: 'Falha ao remover cartão',
    description: 'Não foi possível excluir o cartão do banco de dados.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },

  // ── Recorrências ──
  'REC-001': {
    title: 'Falha ao criar recorrência',
    description: 'Não foi possível salvar o novo pagamento recorrente.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },
  'REC-002': {
    title: 'Falha ao atualizar recorrência',
    description: 'Não foi possível salvar as alterações da recorrência.',
    action: 'Verifique sua conexão e tente novamente. As alterações foram revertidas.',
    severity: 'error',
  },
  'REC-003': {
    title: 'Falha ao excluir recorrência',
    description: 'Não foi possível remover a recorrência do banco de dados.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },
  'REC-004': {
    title: 'Falha ao pausar/ativar recorrência',
    description: 'Não foi possível alterar o status da recorrência.',
    action: 'Verifique sua conexão e tente novamente. O status foi restaurado.',
    severity: 'error',
  },

  // ── Categorias ──
  'CAT-001': {
    title: 'Falha ao adicionar categoria',
    description: 'Não foi possível salvar a nova categoria.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },
  'CAT-002': {
    title: 'Falha ao remover categoria',
    description: 'Não foi possível excluir a categoria.',
    action: 'Verifique sua conexão e tente novamente. A categoria foi restaurada.',
    severity: 'error',
  },

  // ── Perfis ──
  'PROF-001': {
    title: 'Falha ao criar perfil',
    description: 'Não foi possível salvar o novo perfil.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },
  'PROF-002': {
    title: 'Falha ao atualizar perfil',
    description: 'Não foi possível salvar as alterações do perfil.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },
  'PROF-003': {
    title: 'Falha ao remover perfil',
    description: 'Não foi possível excluir o perfil.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },

  // ── Autenticação ──
  'AUTH-001': {
    title: 'Falha no login',
    description: 'Não foi possível realizar o login com as credenciais fornecidas.',
    action: 'Verifique seu e-mail e senha e tente novamente.',
    severity: 'error',
  },
  'AUTH-002': {
    title: 'Falha ao sair da conta',
    description: 'Não foi possível encerrar a sessão corretamente.',
    action: 'Tente novamente ou feche e reabra o aplicativo.',
    severity: 'warning',
  },
  'AUTH-003': {
    title: 'Falha ao redefinir senha',
    description: 'Não foi possível enviar o e-mail de redefinição de senha.',
    action: 'Verifique se o e-mail está correto e tente novamente.',
    severity: 'error',
  },
  'AUTH-004': {
    title: 'Sessão expirada',
    description: 'Sua sessão expirou e você foi desconectado automaticamente.',
    action: 'Faça login novamente para continuar.',
    severity: 'warning',
  },

  // ── Sincronização ──
  'SYNC-001': {
    title: 'Falha ao carregar dados',
    description: 'Não foi possível sincronizar os dados com o servidor.',
    action: 'Verifique sua conexão com a internet e recarregue a página.',
    severity: 'error',
  },
  'SYNC-002': {
    title: 'Dados desatualizados',
    description: 'Os dados exibidos podem não estar atualizados.',
    action: 'Recarregue a página para obter os dados mais recentes.',
    severity: 'warning',
  },

  // ── IA / Interpretação ──
  'AI-001': {
    title: 'Falha na interpretação',
    description: 'Não foi possível interpretar o comando de voz ou texto.',
    action: 'Tente reformular o comando com mais detalhes. Ex: "Gastei 50 reais com alimentação".',
    severity: 'warning',
  },
  'AI-002': {
    title: 'Serviço de IA indisponível',
    description: 'O serviço de inteligência artificial está temporariamente fora do ar.',
    action: 'Tente novamente em alguns minutos ou use os campos manuais.',
    severity: 'error',
  },

  // ── Permissões ──
  'PERM-001': {
    title: 'Ação não permitida',
    description: 'Seu perfil não tem permissão para realizar esta ação.',
    action: 'Solicite ao administrador que atualize suas permissões em Configurações → Perfis.',
    severity: 'warning',
  },
  'PERM-002': {
    title: 'Acesso restrito',
    description: 'Esta área é acessível apenas pelo perfil principal (dono).',
    action: 'Troque para o perfil principal para ter acesso completo.',
    severity: 'warning',
  },

  // ── Administração ──
  'ADM-001': {
    title: 'Falha ao aprovar usuário',
    description: 'Não foi possível alterar o status do usuário.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },
  'ADM-002': {
    title: 'Falha ao suspender usuário',
    description: 'Não foi possível suspender o acesso do usuário.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },
  'ADM-003': {
    title: 'Falha ao excluir usuário',
    description: 'Não foi possível excluir permanentemente o usuário e seus dados.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },
  'ADM-004': {
    title: 'Falha ao enviar reset de senha',
    description: 'Não foi possível enviar o e-mail de redefinição de senha.',
    action: 'Verifique se o e-mail do usuário está correto e tente novamente.',
    severity: 'error',
  },

  // ── Pagamento de cartão ──
  'PAY-001': {
    title: 'Falha ao marcar fatura como paga',
    description: 'Não foi possível registrar o pagamento da fatura do cartão.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },

  // ── Orçamentos ──
  'BUD-001': {
    title: 'Falha ao atualizar orçamento',
    description: 'Não foi possível salvar o limite mensal da categoria.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },
  'BUD-002': {
    title: 'Falha ao criar orçamento',
    description: 'Não foi possível salvar o novo orçamento mensal.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },
  'BUD-003': {
    title: 'Falha ao remover orçamento',
    description: 'Não foi possível excluir o orçamento.',
    action: 'Verifique sua conexão e tente novamente.',
    severity: 'error',
  },
}

// ─── Classe de erro estruturado ─────────────────────────────────────────────

export class AppError extends Error {
  code: ErrorCode
  details?: string

  constructor(code: ErrorCode, details?: string) {
    const def = ERROR_CATALOG[code]
    super(def.title)
    this.code = code
    this.details = details
    this.name = 'AppError'
  }
}

// ─── Helper para formatar mensagem de erro para o usuário ───────────────────

export function formatError(err: unknown): { code?: ErrorCode; title: string; description: string; action: string; severity: 'error' | 'warning' } {
  if (err instanceof AppError) {
    const def = ERROR_CATALOG[err.code]
    return {
      code: err.code,
      title: def.title,
      description: err.details ? `${def.description} (${err.details})` : def.description,
      action: def.action,
      severity: def.severity,
    }
  }

  if (err instanceof Error) {
    return {
      title: 'Erro inesperado',
      description: err.message || 'Ocorreu um erro desconhecido.',
      action: 'Recarregue a página e tente novamente.',
      severity: 'error',
    }
  }

  return {
    title: 'Erro desconhecido',
    description: 'Ocorreu um erro inesperado no sistema.',
    action: 'Recarregue a página e tente novamente.',
    severity: 'error',
  }
}
