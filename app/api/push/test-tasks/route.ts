import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await anonClient.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('user_id', user.id)

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: 'Nenhuma inscrição push encontrada para este dispositivo.' }, { status: 404 })
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  let notifications: { title: string; body: string; url: string; tag: string }[] = []

  try {
    const { data: todayTasks } = await supabase
      .from('productivity_tasks')
      .select('title, priority')
      .eq('user_id', user.id)
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
        tag:   'tasks-today-test',
      })
    }

    const { data: overdueTasks } = await supabase
      .from('productivity_tasks')
      .select('title')
      .eq('user_id', user.id)
      .lt('scheduled_date', todayStr)
      .neq('status', 'done')
      .neq('status', 'cancelled')
      .neq('status', 'archived')
      .limit(5)

    if (overdueTasks && overdueTasks.length > 0) {
      const count = overdueTasks.length
      notifications.push({
        title: `⚠️ ${count} tarefa${count > 1 ? 's' : ''} em atraso`,
        body:  overdueTasks[0].title + (count > 1 ? ` e mais ${count - 1}` : ''),
        url:   '/produtividade/tarefas',
        tag:   'tasks-overdue-test',
      })
    }
  } catch {
    // productivity tables may not exist
  }

  if (notifications.length === 0) {
    notifications.push({
      title: '📋 Notificações de tarefas ativas',
      body:  'Você receberá um resumo das suas tarefas todo dia às 8h.',
      url:   '/produtividade/hoje',
      tag:   'tasks-test',
    })
  }

  let sent = 0
  const expiredEndpoints: string[] = []

  for (const notif of notifications) {
    const payload = JSON.stringify(notif)
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        )
        sent++
      } catch {
        expiredEndpoints.push(sub.endpoint)
      }
    }
  }

  if (expiredEndpoints.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
  }

  return NextResponse.json({ ok: true, sent, notifications: notifications.length })
}
