import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const token = authHeader.replace('Bearer ', '')

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor' }, { status: 503 })
  }

  // Usa service role para tudo — bypassa RLS e garante que a verificação de admin funcione
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Valida o token do chamador
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })
  }

  // Verifica se o chamador é admin (service role bypassa RLS)
  const { data: registry } = await adminClient
    .from('user_registry')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!registry?.is_admin) {
    return NextResponse.json({ error: 'Sem permissão de administrador' }, { status: 403 })
  }

  const body = await req.json()
  const { userId } = body as { userId: string }

  if (!userId) {
    return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })
  }
  if (userId === user.id) {
    return NextResponse.json({ error: 'Não é possível deletar a própria conta' }, { status: 400 })
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
