import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await anonClient.auth.getUser(authHeader)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: reg } = await supabase
    .from('user_registry')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()
  if (!reg?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [subResult, txResult, usersResult] = await Promise.all([
    supabase.from('push_subscriptions').select('user_id', { count: 'exact', head: false }),
    supabase.from('transactions').select('user_id'),
    supabase.from('user_registry').select('user_id, email'),
  ])

  const totalDevices = subResult.data?.length ?? 0
  const uniqueSubscribedUsers = new Set(subResult.data?.map(s => s.user_id) ?? []).size

  const txByUser: Record<string, number> = {}
  for (const tx of txResult.data ?? []) {
    txByUser[tx.user_id] = (txByUser[tx.user_id] ?? 0) + 1
  }

  const emailMap: Record<string, string> = {}
  for (const u of usersResult.data ?? []) {
    emailMap[u.user_id] = u.email
  }

  const topUsers = Object.entries(txByUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, count]) => ({
      email: emailMap[userId] ?? userId.slice(0, 8) + '…',
      count,
    }))

  const totalTransactions = txResult.data?.length ?? 0

  return NextResponse.json({
    totalDevices,
    uniqueSubscribedUsers,
    totalTransactions,
    topUsers,
  })
}
