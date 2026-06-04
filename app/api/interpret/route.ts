import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openAiApiKey = process.env.OPENAI_API_KEY
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const client = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null

const INTERPRETATION_SCHEMA = {
  name: 'financial_interpretation',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      type: { type: 'string', enum: ['income', 'expense'] },
      amount: { type: 'number' },
      mode: { type: 'string', enum: ['personal', 'business'] },
      category: { type: 'string' },
      description: { type: 'string' },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      needsClarification: { type: 'boolean' },
      clarificationQuestion: { type: ['string', 'null'] },
      clarificationOptions: {
        anyOf: [
          { type: 'null' },
          { type: 'array', items: { type: 'string' } },
        ],
      },
      recurrenceSuggestion: { type: 'boolean' },
    },
    required: [
      'type',
      'amount',
      'mode',
      'category',
      'description',
      'confidence',
      'needsClarification',
      'clarificationQuestion',
      'clarificationOptions',
      'recurrenceSuggestion',
    ],
  },
} as const

const SYSTEM_PROMPT = `Você é um assistente financeiro pessoal brasileiro. Sua função é interpretar frases em português faladas por voz e extrair os dados de uma transação financeira.

Regras:
- Responda SOMENTE com JSON válido, sem markdown, sem explicações
- "mode" deve ser "personal" para gastos pessoais (alimentação, saúde, lazer, casa, etc.) ou "business" para negócios (cursos, assistência técnica, marketing, etc.)
- "type" deve ser "income" (receita/entrada) ou "expense" (despesa/saída)
- Se não conseguir identificar o tipo (entrada ou saída), defina needsClarification como true e pergunte
- Se não conseguir identificar o valor, defina needsClarification como true e pergunte
- O campo "confidence" vai de 0 a 1 (1 = certeza absoluta)
- O campo "description" deve ser uma descrição curta, clara e útil para aparecer na timeline do usuário
- Não copie a frase inteira do usuário em "description"; transforme em um resumo natural, com contexto quando houver
- Exemplos de "description": "Gasolina no posto", "Venda de curso online", "Almoço no restaurante", "Pagamento de internet", "Recebimento de consultoria"
- Se houver nome de loja, cliente, serviço, curso, cartão ou local na frase, inclua esse detalhe na descrição
- Evite descrições genéricas como "Gasto" ou "Receita" quando houver informação melhor
- Categorias disponíveis: Alimentação, Mercado, Combustível, Transporte, Casa, Saúde, Família, Lazer, Academia, Assinaturas, Cartão, Aluguel, Salário, Freelance, Venda, Aluguel recebido, Investimento, Curso Online, Curso Presencial, Assistência Técnica, Consultoria, Ferramentas, Materiais, Marketing, Tráfego Pago, Plataforma, Professor/Parceiro, Conta Fixa, Equipamentos, Impostos, Pró-labore, Outros

Formato de resposta:
{
  "type": "income" | "expense",
  "amount": number,
  "mode": "personal" | "business",
  "category": string,
  "description": string,
  "confidence": number,
  "needsClarification": boolean,
  "clarificationQuestion": string | null,
  "clarificationOptions": string[] | null,
  "recurrenceSuggestion": boolean
}`

export async function POST(req: NextRequest) {
  try {
    if (!client) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY não configurada no servidor' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { text, profileContext, categories } = body as {
      text: string
      categories?: string[]
      profileContext?: {
        profileType?: string
        incomeSources?: string[]
        typicalExpenses?: string[]
        preferredMode?: string
      }
    }

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Texto vazio' }, { status: 400 })
    }

    // Constrói lista de categorias dinamicamente
    const DEFAULT_CATS = 'Alimentação, Mercado, Combustível, Transporte, Casa, Saúde, Família, Lazer, Academia, Assinaturas, Cartão, Aluguel, Salário, Freelance, Venda, Aluguel recebido, Investimento, Curso Online, Curso Presencial, Assistência Técnica, Consultoria, Ferramentas, Materiais, Marketing, Tráfego Pago, Plataforma, Professor/Parceiro, Conta Fixa, Equipamentos, Impostos, Pró-labore, Outros'
    const categoryList = categories && categories.length > 0
      ? categories.join(', ') + ', Outros'
      : DEFAULT_CATS
    const dynamicPrompt = SYSTEM_PROMPT.replace(
      /Categorias disponíveis:.*$/m,
      `Categorias disponíveis: ${categoryList}`
    )

    let userContext = ''
    if (profileContext) {
      const parts: string[] = []
      if (profileContext.profileType) parts.push(`Tipo de perfil: ${profileContext.profileType}`)
      if (profileContext.incomeSources?.length) parts.push(`Fontes de renda: ${profileContext.incomeSources.join(', ')}`)
      if (profileContext.typicalExpenses?.length) parts.push(`Gastos típicos: ${profileContext.typicalExpenses.join(', ')}`)
      if (profileContext.preferredMode) parts.push(`Modo preferido: ${profileContext.preferredMode}`)
      if (parts.length) userContext = `\n\nContexto do usuário:\n${parts.join('\n')}`
    }

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: dynamicPrompt + userContext },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: {
        type: 'json_schema',
        json_schema: INTERPRETATION_SCHEMA,
      },
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('Resposta vazia da IA')

    const parsed = JSON.parse(content)
    if (
      !['income', 'expense'].includes(parsed.type) ||
      typeof parsed.amount !== 'number' ||
      !['personal', 'business'].includes(parsed.mode) ||
      typeof parsed.category !== 'string' ||
      typeof parsed.description !== 'string' ||
      typeof parsed.confidence !== 'number' ||
      typeof parsed.needsClarification !== 'boolean' ||
      typeof parsed.recurrenceSuggestion !== 'boolean'
    ) {
      throw new Error('Resposta inválida da IA')
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[interpret] erro:', err)
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json(
      {
        error: 'Falha na interpretação',
        detail: process.env.NODE_ENV === 'production' ? undefined : message,
      },
      { status: 500 }
    )
  }
}
