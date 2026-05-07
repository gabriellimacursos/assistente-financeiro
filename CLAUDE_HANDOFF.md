# Handoff - ajuste de IA e deploy

Data: 2026-05-07

## O que foi feito

- Fortalecida a rota `app/api/interpret/route.ts`.
- A chave `OPENAI_API_KEY` agora e validada antes de chamar a OpenAI.
- O modelo pode ser configurado por `OPENAI_MODEL`; se nao existir, usa `gpt-4o-mini`.
- A resposta da OpenAI agora usa `response_format` com `json_schema` e `strict: true`, para reduzir respostas fora do formato esperado.
- Foi adicionada validacao defensiva antes de devolver o JSON ao frontend.
- Em desenvolvimento, a rota devolve `detail` quando falha; em producao, nao expoe detalhe interno.
- O fallback local em `lib/ai/interpreter.ts` continua ativo, mas agora registra no console quando for usado.
- Adicionado `public/manifest.json`, porque o app ja referenciava `/manifest.json`.
- Removido `app/(app)/page.tsx`, que criava uma segunda rota `/` dentro de route group e fazia o deploy da Vercel falhar no trace de `page_client-reference-manifest.js`.

## O que nao foi alterado

- Nao foram corrigidos textos, acentos ou encoding visual.
- Nao foi alterado o fluxo de telas.
- Nao foi migrado o armazenamento local para Supabase.
- Nao foi removido o interpretador local de fallback.

## Vercel

Projeto vinculado: `assistente-financeiro`

Variaveis configuradas em Production:

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Validacoes feitas

- `npm run build`
- Teste local de `POST /api/interpret` com frase financeira simples
