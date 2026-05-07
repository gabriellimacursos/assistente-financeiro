/**
 * Supabase client — conecte sua instância configurando as variáveis abaixo no .env.local
 * NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
 * NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
 *
 * No MVP o sistema usa dados mockados (lib/store/useFinanceStore.ts).
 * Para ativar o Supabase: descomente as linhas abaixo e instale @supabase/supabase-js
 */

// import { createClient } from '@supabase/supabase-js'
// const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
// const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// export const supabase = createClient(url, key)

export const supabase = null // substituir quando Supabase estiver configurado
