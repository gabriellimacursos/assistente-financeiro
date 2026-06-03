import type { AIInterpretation, Mode, UserProfile } from '@/types'

// ─── Category options by type ─────────────────────────────────────────────
export function getCategoryOptions(type: 'income' | 'expense', mode: Mode): string[] {
  if (type === 'income') {
    return mode === 'business'
      ? ['Curso Online', 'Curso Presencial', 'Assistência Técnica', 'Consultoria', 'Investimento', 'Outros']
      : ['Salário', 'Freelance', 'Venda', 'Aluguel recebido', 'Investimento', 'Outros']
  }
  return mode === 'business'
    ? ['Ferramentas', 'Marketing', 'Tráfego Pago', 'Plataforma', 'Impostos', 'Outros']
    : ['Alimentação', 'Combustível', 'Casa', 'Saúde', 'Lazer', 'Outros']
}

// ─── Mock fallback ────────────────────────────────────────────────────────
const INCOME_KEYWORDS = [
  'recebi', 'ganhei', 'entrou', 'faturei', 'cobrei', 'vendi',
  'receita', 'entrada', 'lucro', 'rendimento', 'pagamento recebido',
]
const EXPENSE_KEYWORDS = [
  'gastei', 'paguei', 'comprei', 'saiu', 'debitou', 'despesa',
  'parcelei', 'financiei', 'boleto', 'fatura', 'investi', 'compra',
]
const AMBIGUOUS_KEYWORDS = [
  'salário', 'salario', 'serviço', 'servico', 'assistência', 'assistencia',
  'manutenção', 'manutencao', 'conserto', 'reparo', 'parcela', 'mensalidade',
  'aluguel', 'professor', 'parceiro', 'comissão', 'comissao',
]
const CATEGORY_MAP: { keywords: string[]; category: string; mode?: Mode }[] = [
  { keywords: ['gasolina', 'combustível', 'combustivel', 'álcool', 'etanol', 'posto'], category: 'Combustível' },
  { keywords: ['mercado', 'supermercado', 'feira', 'açougue', 'hortifruti'], category: 'Mercado' },
  { keywords: ['restaurante', 'lanche', 'pizza', 'hamburguer', 'almoço', 'jantar', 'café', 'ifood', 'delivery', 'alimentação'], category: 'Alimentação' },
  { keywords: ['aluguel recebido', 'recebi aluguel', 'aluguel do imóvel'], category: 'Aluguel recebido' },
  { keywords: ['aluguel', 'aluguer'], category: 'Aluguel' },
  { keywords: ['internet', 'wifi', 'banda larga', 'net', 'vivo', 'claro', 'tim'], category: 'Conta Fixa' },
  { keywords: ['luz', 'energia', 'eletricidade', 'enel', 'celpe', 'coelba'], category: 'Conta Fixa' },
  { keywords: ['água', 'agua', 'saneamento'], category: 'Conta Fixa' },
  { keywords: ['farmácia', 'farmacia', 'remédio', 'remedio', 'medicamento', 'hospital', 'médico', 'medico', 'consulta', 'exame', 'plano de saúde', 'saude'], category: 'Saúde' },
  { keywords: ['academia', 'gym', 'musculação', 'personal trainer', 'luta', 'bjj'], category: 'Academia' },
  { keywords: ['netflix', 'spotify', 'amazon', 'prime', 'disney', 'assinatura'], category: 'Assinaturas' },
  { keywords: ['uber', 'táxi', 'taxi', 'ônibus', 'onibus', 'metrô', 'metro', 'passagem'], category: 'Transporte' },
  { keywords: ['curso online', 'ead', 'aula online', 'mentoria online', 'hotmart', 'kiwify', 'eduzz'], category: 'Curso Online', mode: 'business' },
  { keywords: ['curso presencial', 'aula presencial', 'turma presencial', 'turma'], category: 'Curso Presencial', mode: 'business' },
  { keywords: ['assistência técnica', 'assistencia tecnica', 'conserto', 'reparo', 'manutenção', 'manutencao'], category: 'Assistência Técnica', mode: 'business' },
  { keywords: ['ferramenta', 'equipamento', 'máquina', 'maquina'], category: 'Ferramentas', mode: 'business' },
  { keywords: ['peça', 'peca', 'componente', 'material'], category: 'Materiais', mode: 'business' },
  { keywords: ['tráfego', 'trafego', 'anúncio', 'anuncio', 'facebook ads', 'google ads', 'marketing', 'publicidade'], category: 'Tráfego Pago', mode: 'business' },
  { keywords: ['imposto', 'das', 'simples', 'inss', 'irpf', 'irpj', 'tributo'], category: 'Impostos', mode: 'business' },
  { keywords: ['professor', 'parceiro', 'colaborador'], category: 'Professor/Parceiro', mode: 'business' },
  { keywords: ['pro-labore', 'pró-labore', 'prolabore', 'retirada', 'pró labore'], category: 'Pró-labore', mode: 'business' },
  { keywords: ['cartão', 'cartao', 'fatura', 'crédito', 'credito'], category: 'Cartão' },
  { keywords: ['casa', 'móveis', 'moveis', 'eletrodoméstico', 'reforma'], category: 'Casa' },
  { keywords: ['família', 'familia', 'filho', 'filha', 'esposa', 'esposo', 'pensão'], category: 'Família' },
  { keywords: ['lazer', 'cinema', 'show', 'viagem', 'hotel', 'passeio', 'entretenimento'], category: 'Lazer' },
  { keywords: ['salário', 'salario'], category: 'Salário' },
  { keywords: ['freelance', 'freela', 'bico', 'trampo', 'trabalho extra'], category: 'Freelance' },
  { keywords: ['venda', 'vendi', 'produto vendido', 'receita de venda'], category: 'Venda' },
  { keywords: ['dividendo', 'rendimento', 'juros', 'investimento', 'fundo', 'ação', 'cdb', 'tesouro'], category: 'Investimento' },
  { keywords: ['consultoria', 'mentoria', 'assessoria'], category: 'Consultoria' },
]
const RECURRENCE_TRIGGERS = [
  'aluguel', 'internet', 'telefone', 'mensalidade', 'assinatura',
  'professor', 'salário', 'salario', 'pro-labore', 'pró-labore', 'parcela',
  'financiamento', 'luz', 'água', 'energia', 'netflix', 'spotify',
  'amazon', 'plano', 'escola', 'academia',
]

function extractAmount(text: string): number | null {
  const patterns = [
    /r\$\s*(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/i,
    /(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*reais/i,
    /(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*r\$/i,
    /(\d+(?:[.,]\d{3})*)\s*(?:conto|contos|real)/i,
    /(\d+(?:[.,]\d{3})*(?:[.,]\d{2})?)/,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const raw = match[1].replace(/\./g, '').replace(',', '.')
      const num = parseFloat(raw)
      if (!isNaN(num) && num > 0) return num
    }
  }
  return null
}

function detectType(text: string): { type: 'income' | 'expense'; confidence: number } {
  const lower = text.toLowerCase()
  let incomeScore = 0
  let expenseScore = 0
  for (const kw of INCOME_KEYWORDS) if (lower.includes(kw)) incomeScore += 3
  for (const kw of EXPENSE_KEYWORDS) if (lower.includes(kw)) expenseScore += 3
  const hasAmbiguous = AMBIGUOUS_KEYWORDS.some(kw => lower.includes(kw))
  if (hasAmbiguous && incomeScore === 0 && expenseScore === 0) return { type: 'expense', confidence: 0.3 }
  if (incomeScore > expenseScore) return { type: 'income', confidence: Math.min(0.95, 0.65 + incomeScore * 0.05) }
  if (expenseScore > incomeScore) return { type: 'expense', confidence: Math.min(0.95, 0.65 + expenseScore * 0.05) }
  return { type: 'expense', confidence: 0.35 }
}

function detectCategory(text: string, mode: Mode): string {
  const lower = text.toLowerCase()
  let best = { category: '', score: 0 }
  for (const entry of CATEGORY_MAP) {
    if (entry.mode && entry.mode !== mode) continue
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        const score = kw.length
        if (score > best.score) best = { category: entry.category, score }
      }
    }
  }
  return best.category
}

function detectModeOverride(text: string, defaultMode: Mode): Mode {
  const lower = text.toLowerCase()
  if (['empresa', 'negócio', 'cnpj', ' pj ', 'jurídica'].some(s => lower.includes(s))) return 'business'
  if (['pessoal', 'particular', 'cpf', ' pf ', 'física'].some(s => lower.includes(s))) return 'personal'
  return defaultMode
}

function mockInterpret(text: string, currentMode: Mode): AIInterpretation {
  const mode = detectModeOverride(text, currentMode)
  const amount = extractAmount(text)
  const { type, confidence: typeConfidence } = detectType(text)
  const category = detectCategory(text, mode)
  const recurrenceSuggestion = RECURRENCE_TRIGGERS.some(t => text.toLowerCase().includes(t))

  let needsClarification = false
  let clarificationQuestion: string | undefined
  let clarificationOptions: string[] | undefined

  if (typeConfidence < 0.62) {
    needsClarification = true
    clarificationQuestion = 'Isso foi uma entrada ou uma saída?'
    clarificationOptions = ['↑ Recebi (entrada)', '↓ Paguei (saída)']
  } else if (!amount) {
    needsClarification = true
    clarificationQuestion = 'Qual foi o valor?'
  } else if (!category) {
    needsClarification = true
    clarificationQuestion = 'Isso foi relacionado a quê?'
    clarificationOptions = getCategoryOptions(type, mode)
  }

  return {
    type, amount: amount ?? 0, mode,
    category: category || 'Outros',
    description: text.length > 70 ? text.slice(0, 70) + '…' : text,
    confidence: typeConfidence,
    needsClarification, clarificationQuestion, clarificationOptions,
    recurrenceSuggestion,
  }
}

// ─── Main interpreter — usa IA real, com fallback para mock ───────────────
export async function interpretFinancialInput(
  text: string,
  currentMode: Mode,
  profile?: Pick<UserProfile, 'profileType' | 'incomeSources' | 'typicalExpenses' | 'preferredMode'>
): Promise<AIInterpretation> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 7000)

    const res = await fetch('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        profileContext: profile
          ? {
              profileType: profile.profileType,
              incomeSources: profile.incomeSources,
              typicalExpenses: profile.typicalExpenses,
              preferredMode: profile.preferredMode,
            }
          : undefined,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()

    // Garante que campos obrigatórios existem
    if (typeof data.type !== 'string' || typeof data.amount !== 'number') {
      throw new Error('Resposta inválida da IA')
    }

    // Valida o mode retornado
    const mode = (data.mode === 'personal' || data.mode === 'business')
      ? data.mode as Mode
      : detectModeOverride(text, currentMode)

    return {
      type: data.type === 'income' ? 'income' : 'expense',
      amount: data.amount ?? 0,
      mode,
      category: data.category || 'Outros',
      description: data.description || text.slice(0, 70),
      confidence: data.confidence ?? 0.8,
      needsClarification: data.needsClarification ?? false,
      clarificationQuestion: data.clarificationQuestion ?? undefined,
      clarificationOptions: data.clarificationOptions ?? undefined,
      recurrenceSuggestion: data.recurrenceSuggestion ?? false,
    }
  } catch (err) {
    console.warn('[interpretFinancialInput] usando fallback local:', err)
    // Fallback silencioso para o mock local
    await new Promise(r => setTimeout(r, 300))
    return mockInterpret(text, currentMode)
  }
}
