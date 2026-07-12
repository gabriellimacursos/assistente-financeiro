import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { NextRequest, NextResponse } from 'next/server'
import { format, addDays, subDays } from 'date-fns'

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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const legacyHeader = req.headers.get('x-cron-secret')
  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    legacyHeader === process.env.CRON_SECRET
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  initWebPush()

  const today = new Date()
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd')

  // Get all users with push subscriptions
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth_key')
  if (!subs || subs.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  // Group subscriptions by user
  const byUser: Record<string, typeof subs> = {}
  for (const sub of subs) {
    if (!byUser[sub.user_id]) byUser[sub.user_id] = []
    byUser[sub.user_id].push(sub)
  }

  let totalSent = 0
  const expiredEndpoints: string[] = []

  for (const userId of Object.keys(byUser)) {
    const userSubs = byUser[userId]
    const notifications: { title: string; body: string; url: string; tag: string }[] = []

    // Check recurring transactions due tomorrow
    const { data: recs } = await supabase
      .from('recurrences')
      .select('description, amount, type, next_date')
      .eq('user_id', userId)
      .eq('active', true)
      .eq('next_date', tomorrowStr)

    for (const rec of recs ?? []) {
      const sign = rec.type === 'income' ? '+' : '-'
      const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.amount)
      notifications.push({
        title: rec.type === 'income' ? '💰 Entrada amanhã' : '💸 Débito amanhã',
        body: `${rec.description} · ${sign}${amount}`,
        url: '/recorrencias',
        tag: `rec-${rec.description}`,
      })
    }

    // Check credit card bills due in 1-3 days
    const { data: cards } = await supabase
      .from('credit_cards')
      .select('id, name, due_day')
      .eq('user_id', userId)

    for (const card of cards ?? []) {
      if (!card.due_day) continue
      let year = today.getFullYear()
      let month = today.getMonth()
      if (today.getDate() >= card.due_day) month++
      while (month > 11) { month -= 12; year++ }
      const dueDate = new Date(year, month, card.due_day)
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000)

      if (daysUntil > 0 && daysUntil <= 3) {
        // Check if there are pending transactions
        const { data: pending } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', userId)
          .eq('card_id', card.id)
          .eq('status', 'pending')
          .eq('type', 'expense')

        if (pending && pending.length > 0) {
          const total = pending.reduce((s: number, t: { amount: number }) => s + t.amount, 0)
          const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)
          const dayLabel = daysUntil === 1 ? 'amanhã' : `em ${daysUntil} dias`
          notifications.push({
            title: `💳 Fatura vencendo ${dayLabel}`,
            body: `${card.name} · ${amount} pendentes`,
            url: '/dashboard',
            tag: `bill-${card.id}`,
          })
        }
      }
    }

    // ── Productivity: today's tasks ─────────────────────────────────────────
    try {
      const todayStr = format(today, 'yyyy-MM-dd')

      const { data: todayTasks } = await supabase
        .from('productivity_tasks')
        .select('title, priority')
        .eq('user_id', userId)
        .eq('scheduled_date', todayStr)
        .neq('status', 'done')
        .neq('status', 'cancelled')
        .neq('status', 'archived')
        .order('priority', { ascending: false })
        .limit(3)

      if (todayTasks && todayTasks.length > 0) {
        const count = todayTasks.length
        const first = todayTasks[0].title
        const rest  = count > 1 ? ` e mais ${count - 1}` : ''
        notifications.push({
          title: `📋 ${count} tarefa${count > 1 ? 's' : ''} para hoje`,
          body:  first + rest,
          url:   '/produtividade/hoje',
          tag:   'tasks-today',
        })
      }

      const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd')
      const { data: overdueTasks } = await supabase
        .from('productivity_tasks')
        .select('title')
        .eq('user_id', userId)
        .lte('scheduled_date', yesterdayStr)
        .neq('status', 'done')
        .neq('status', 'cancelled')
        .neq('status', 'archived')
        .limit(10)

      if (overdueTasks && overdueTasks.length > 0) {
        const count = overdueTasks.length
        notifications.push({
          title: `⚠️ ${count} tarefa${count > 1 ? 's' : ''} em atraso`,
          body:  overdueTasks[0].title + (count > 1 ? ` e mais ${count - 1}` : ''),
          url:   '/produtividade/tarefas',
          tag:   'tasks-overdue',
        })
      }
    } catch {
      // productivity tables may not exist — skip silently
    }

    // Send all notifications to this user's devices
    for (const notif of notifications) {
      const payload = JSON.stringify(notif)
      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            payload
          )
          totalSent++
        } catch {
          expiredEndpoints.push(sub.endpoint)
        }
      }
    }
  }

  if (expiredEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
  }

  return NextResponse.json({ ok: true, sent: totalSent })
}
