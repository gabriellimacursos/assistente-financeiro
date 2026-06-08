import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function initWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
}

export async function POST(req: NextRequest) {
  // Verify admin via auth token in Authorization header
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await anonClient.auth.getUser(authHeader)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()

  // Check admin status
  const { data: reg } = await supabase
    .from('user_registry')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()
  if (!reg?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, body, url = '/dashboard' } = await req.json()
  if (!title || !body) return NextResponse.json({ error: 'title and body required' }, { status: 400 })

  // Get all subscriptions
  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

  initWebPush()

  const payload = JSON.stringify({ title, body, url, tag: 'broadcast' })
  let sent = 0
  const failed: string[] = []

  await Promise.allSettled(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payload
      )
      sent++
    } catch {
      failed.push(sub.endpoint)
    }
  }))

  // Remove failed/expired subscriptions
  if (failed.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', failed)
  }

  // Save to history
  await supabase.from('broadcast_notifications').insert({
    title,
    body,
    url,
    sent_by_email: user.email,
    recipient_count: sent,
  })

  return NextResponse.json({ sent, failed: failed.length })
}
