# Assistente Financeiro — Instruções para o Claude

## Sobre o projeto

App de controle financeiro pessoal/empresarial. PWA mobile-first.

- **Produção**: https://assistente-financeiro-swart.vercel.app
- **GitHub**: https://github.com/gabriellimacursos/assistente-financeiro
- **Supabase project**: wytkifsspsstwwiydgin
- **Usuário**: Gabriel Lima (gabriellimacursos@gmail.com)

---

## Regras obrigatórias — sempre seguir

### 1. Idioma
Sempre responder em **português do Brasil**.

### 2. Deploy após toda mudança
```
git add <arquivos>
git commit -m "descrição em português"
git push origin main
vercel --prod --yes
```
Nunca encerrar uma tarefa sem deploy confirmado.

### 3. TypeScript zero erros
Rodar `npx tsc --noEmit` antes de commitar.

### 4. Toda funcionalidade nova precisa de:
- `AppError` + `ErrorBanner` (erros estruturados de `lib/errors.ts`)
- `HelpTooltip` com id registrado em `lib/help-content.ts`

### 5. Proibições técnicas
- **NUNCA** `overflow-x: hidden` no `body` ou `html` — quebra scroll de 1 dedo no iOS Safari
- **NUNCA** salvar dados financeiros em `localStorage` — tudo vai ao Supabase
- **NUNCA** colocar secrets em URLs ou código commitado

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 App Router |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS |
| Banco | Supabase (PostgreSQL + Auth + RLS) |
| Estado | Zustand (cache em memória — fonte da verdade é o Supabase) |
| Deploy | Vercel |
| Push | web-push com VAPID |
| IA | OpenAI (interpretação de texto livre) |

---

## Arquivos-chave

```
lib/store/useFinanceStore.ts   — estado global + todas as operações no Supabase
lib/errors.ts                 — AppError, ErrorCode, formatError, ERROR_CATALOG
lib/help-content.ts           — conteúdo de todos os HelpTooltips
components/shared/
  ErrorBanner.tsx             — exibe erros estruturados
  HelpTooltip.tsx             — botão de ajuda contextual
  ModeToggle.tsx              — toggle Empresa/Geral/Pessoal (aceita className)
  PushManager.tsx             — hook usePushPermission + PushToggleButton
  NotificationPrompt.tsx      — banner de ativação de push no dashboard
app/api/
  cron/notify/route.ts        — cron diário de notificações (11:00 UTC)
  push/subscribe/route.ts     — registro de dispositivos para push
  push/broadcast/route.ts     — envio manual pelo admin
  admin/stats/route.ts        — métricas do painel admin
public/sw.js                  — service worker (recebe push, abre URL ao clicar)
vercel.json                   — configuração de crons (sem secrets na URL)
```

---

## Autenticação do cron

O Vercel injeta automaticamente `Authorization: Bearer <CRON_SECRET>` nas requisições de cron quando `CRON_SECRET` está definido como env var. O route `app/api/cron/notify/route.ts` valida esse header. **Nunca colocar o secret na URL do vercel.json.**

---

## Tabelas Supabase

| Tabela | Conteúdo |
|--------|----------|
| `transactions` | Lançamentos financeiros |
| `recurrences` | Débitos/receitas recorrentes |
| `credit_cards` | Cartões cadastrados |
| `profiles` | Perfis do usuário |
| `categories` | Categorias personalizadas |
| `user_registry` | Registro de usuários (status, is_admin) |
| `push_subscriptions` | Endpoints de notificação push |
| `broadcast_notifications` | Histórico de broadcasts do admin |

---

## Melhorias pendentes (identificadas, ainda não implementadas)

1. **Auto-criar recorrências**: cron atual só notifica, não cria a transação automaticamente
2. **Sentry**: sem monitoramento de erros em produção — falhas são silenciosas
3. **Offline sync**: transação registrada sem internet pode se perder
4. **Fila de notificações**: envio direto pode timeout para muitos usuários (Vercel Queues seria o caminho)
5. **Keepalive cron**: workaround para Supabase free tier — pode ser removido com upgrade para Supabase Pro

---

## Bugs já corrigidos — não re-introduzir

- `overflow-x: hidden` no body quebrou iOS scroll (removido)
- Data auto-mudava ao selecionar cartão no registrar (removido o useEffect culpado)
- Faturas projetadas agrupavam errado (corrigido: usa `dueDay` + heurística para transações já datadas no vencimento)
- Push subscribe falhava silenciosamente (corrigido: Bearer token em vez de cookie-based auth)
- Admin stats dava erro no build (corrigido: `export const dynamic = 'force-dynamic'` + init dentro do handler)
