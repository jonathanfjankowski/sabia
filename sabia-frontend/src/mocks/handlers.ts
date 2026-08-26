import { http, HttpResponse, delay } from 'msw'
import { db, nextId, genUuid, aiResponses } from './db'
import type {
  Profile,
  Article,
  Conversation,
  Message,
  AiSettings,
  WidgetSettings,
  BrandSettings,
} from '@/types'

const API = '/api'

function json<T>(body: T, status = 200) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return HttpResponse.json(body as any, { status })
}

function unauthorized() {
  return HttpResponse.json({ message: 'Não autorizado' }, { status: 401 })
}

function getAuthUser(req: Request): Profile | null {
  const auth = req.headers.get('Authorization') ?? ''
  // No mock MSW, aceitamos o token persistido do localStorage indiretamente.
  // Por simplicidade, retorna o primeiro gestor se o token começar com Bearer mock-
  if (auth.startsWith('Bearer mock-')) {
    const userId = auth.replace('Bearer mock-', '')
    return db.profiles.find((p) => p.id === userId) ?? null
  }
  if (auth.startsWith('Bearer ')) {
    return db.profiles.find((p) => p.role === 'gestor') ?? null
  }
  return null
}

function requireAuth(req: Request) {
  const user = getAuthUser(req)
  if (!user) return null
  return user
}

export const handlers = [
  // ─── Auth ──────────────────────────────────────────────────────────────────
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }
    await delay(400)
    const user = db.profiles.find((p) => p.email.toLowerCase() === body.email.toLowerCase())
    if (!user || !user.is_active) {
      return json({ message: 'Credenciais inválidas' }, 401)
    }
    return json({ user, token: `mock-${user.id}` })
  }),

  http.post(`${API}/auth/logout`, () => json({ ok: true })),

  http.get(`${API}/auth/me`, ({ request }) => {
    const user = requireAuth(request)
    if (!user) return unauthorized()
    return json(user)
  }),

  // ─── Articles (KB) ──────────────────────────────────────────────────────────
  http.get(`${API}/articles`, ({ request }) => {
    if (!requireAuth(request)) return unauthorized()
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').toLowerCase().trim()
    const categoryId = url.searchParams.get('category_id')
    const status = url.searchParams.get('status') ?? 'active'

    let list = db.articles.filter((a) => (status === 'all' ? true : a.status === status))
    if (q) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.summary ?? '').toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
      )
    }
    if (categoryId) list = list.filter((a) => a.category_id === Number(categoryId))

    const withRelations = list.map((a) => ({
      ...a,
      category: db.categories.find((c) => c.id === a.category_id),
      author: db.profiles.find((p) => p.id === a.created_by),
    }))

    return json(withRelations)
  }),

  http.get(`${API}/articles/:slug`, ({ request, params }) => {
    if (!requireAuth(request)) return unauthorized()
    const article = db.articles.find((a) => a.slug === params.slug || a.id === Number(params.slug))
    if (!article) return json({ message: 'Artigo não encontrado' }, 404)
    article.views_count += 1
    return json({
      ...article,
      category: db.categories.find((c) => c.id === article.category_id),
      author: db.profiles.find((p) => p.id === article.created_by),
    })
  }),

  http.get(`${API}/articles/:id/related`, ({ request, params }) => {
    if (!requireAuth(request)) return unauthorized()
    const id = Number(params.id)
    const article = db.articles.find((a) => a.id === id)
    if (!article) return json([])
    const related = db.articles
      .filter((a) => a.id !== id && a.category_id === article.category_id && a.status === 'active')
      .slice(0, 3)
    return json(related)
  }),

  http.post(`${API}/articles/:id/feedback`, async ({ request, params }) => {
    if (!requireAuth(request)) return unauthorized()
    const id = Number(params.id)
    const { helpful } = (await request.json()) as { helpful: boolean }
    const article = db.articles.find((a) => a.id === id)
    if (!article) return json({ message: 'Not found' }, 404)
    if (helpful) article.helpful_yes += 1
    else article.helpful_no += 1
    return json({ helpful_yes: article.helpful_yes, helpful_no: article.helpful_no })
  }),

  // ─── Categories ──────────────────────────────────────────────────────────────
  http.get(`${API}/categories`, ({ request }) => {
    if (!requireAuth(request)) return unauthorized()
    return json(db.categories)
  }),

  // ─── Search ──────────────────────────────────────────────────────────────
  http.get(`${API}/search`, ({ request }) => {
    if (!requireAuth(request)) return unauthorized()
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').toLowerCase().trim()
    if (!q) return json([])
    const results = db.articles
      .filter(
        (a) =>
          a.status === 'active' &&
          (a.title.toLowerCase().includes(q) || (a.summary ?? '').toLowerCase().includes(q))
      )
      .map((a) => ({
        ...a,
        category: db.categories.find((c) => c.id === a.category_id),
      }))
    return json(results)
  }),

  // ─── Chat (streaming simulated) ──────────────────────────────────────────────
  http.post(`${API}/chat`, async ({ request }) => {
    const user = requireAuth(request)
    if (!user) return unauthorized()
    const body = (await request.json()) as { message: string; conversation_id?: string }

    let conversation: Conversation | undefined
    if (body.conversation_id) {
      conversation = db.conversations.find((c) => c.id === body.conversation_id)
    }
    if (!conversation) {
      conversation = {
        id: genUuid(),
        user_id: user.id,
        user_name: user.full_name,
        source: 'direct',
        access_level: 'internal',
        title: body.message.slice(0, 60),
        is_closed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      db.conversations.push(conversation)
    }

    // user message
    const userMsg: Message = {
      id: nextId(db.messages),
      conversation_id: conversation.id,
      role: 'user',
      content: body.message,
      has_images: false,
      created_at: new Date().toISOString(),
    }
    db.messages.push(userMsg)

    // assistant message — pick first response
    const reply = aiResponses[0]
    const conf = 0.872
    const assistantMsg: Message = {
      id: nextId(db.messages),
      conversation_id: conversation.id,
      role: 'assistant',
      content: reply,
      has_images: false,
      confidence: conf,
      confidence_level: 'high',
      sources: [{ article_id: 1, title: 'Como emitir uma Nota Fiscal', similarity: conf }],
      created_at: new Date().toISOString(),
    }
    db.messages.push(assistantMsg)

    conversation.updated_at = new Date().toISOString()

    // SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // send conversation id first
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ conversation_id: conversation!.id })}\n\n`)
        )
        // chunk the reply into words for streaming effect
        const words = reply.split(' ')
        for (let i = 0; i < words.length; i++) {
          const chunk = (i === 0 ? '' : ' ') + words[i]
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
          await new Promise((r) => setTimeout(r, 35))
        }
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              message: assistantMsg,
            })}\n\n`
          )
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }),

  // ─── Conversations ─────────────────────────────────────────────────────────
  http.get(`${API}/conversations`, ({ request }) => {
    const user = requireAuth(request)
    if (!user) return unauthorized()
    const list =
      user.role === 'gestor'
        ? db.conversations.filter((c) => c.source === 'direct')
        : db.conversations.filter((c) => c.user_id === user.id)
    return json(list)
  }),

  http.get(`${API}/conversations/:id/messages`, ({ request, params }) => {
    if (!requireAuth(request)) return unauthorized()
    const list = db.messages.filter((m) => m.conversation_id === params.id)
    return json(list)
  }),

  http.post(`${API}/conversations/:id/close`, async ({ request, params }) => {
    if (!requireAuth(request)) return unauthorized()
    const { rating } = (await request.json()) as { rating: number }
    const conv = db.conversations.find((c) => c.id === params.id)
    if (!conv) return json({ message: 'Not found' }, 404)
    conv.is_closed = true
    conv.closed_at = new Date().toISOString()
    conv.rating = rating
    db.ratings.push({
      id: `r-${db.ratings.length + 1}`,
      conversation_id: conv.id,
      user_name: conv.user_name ?? 'Anônimo',
      rating,
      source: conv.source,
      title: conv.title,
      created_at: new Date().toISOString(),
    })
    return json(conv)
  }),

  http.post(`${API}/conversations/:id/transfer`, ({ request, params }) => {
    if (!requireAuth(request)) return unauthorized()
    const conv = db.conversations.find((c) => c.id === params.id)
    if (!conv) return json({ message: 'Not found' }, 404)
    conv.transfer_status = 'transferred'
    conv.updated_at = new Date().toISOString()
    return json(conv)
  }),

  http.get(`${API}/conversations/:id/export`, ({ request, params }) => {
    if (!requireAuth(request)) return unauthorized()
    const conv = db.conversations.find((c) => c.id === params.id)
    if (!conv) return json({ message: 'Not found' }, 404)
    const msgs = db.messages.filter((m) => m.conversation_id === conv.id)
    const lines: string[] = []
    lines.push('════════════════════════════════════════')
    lines.push('CONVERSA — Sabiá Suporte')
    lines.push('════════════════════════════════════════')
    lines.push(`Data:      ${new Date(conv.created_at).toLocaleString('pt-BR')}`)
    lines.push(`Usuário:   ${conv.user_name ?? 'Anônimo'}`)
    lines.push(`Canal:     ${conv.source}`)
    lines.push(`Status:    ${conv.is_closed ? 'Encerrada' : 'Em andamento'}`)
    if (conv.rating) lines.push(`Avaliação: ${'⭐'.repeat(conv.rating)} (${conv.rating}/5)`)
    lines.push('════════════════════════════════════════')
    lines.push('')
    for (const m of msgs) {
      const time = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      lines.push(`[${time}] ${m.role === 'user' ? 'Usuário' : 'IA'}:`)
      lines.push(m.content)
      lines.push('')
    }
    lines.push('════════════════════════════════════════')
    lines.push(`Exportado em: ${new Date().toLocaleString('pt-BR')}`)
    return new HttpResponse(lines.join('\n'), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }),

  // ─── Admin: Users ─────────────────────────────────────────────────────────
  http.get(`${API}/admin/users`, ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    return json(db.profiles)
  }),

  http.post(`${API}/admin/users`, async ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const body = (await request.json()) as Partial<Profile>
    const newProfile: Profile = {
      id: `p-${db.profiles.length + 1}`,
      user_id: `u-${db.profiles.length + 1}`,
      email: body.email!,
      full_name: body.full_name!,
      role: body.role ?? 'operador',
      is_active: body.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    db.profiles.push(newProfile)
    return json(newProfile, 201)
  }),

  http.put(`${API}/admin/users/:id`, async ({ request, params }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const body = (await request.json()) as Partial<Profile>
    const target = db.profiles.find((p) => p.id === params.id)
    if (!target) return json({ message: 'Not found' }, 404)
    Object.assign(target, body, { updated_at: new Date().toISOString() })
    return json(target)
  }),

  http.delete(`${API}/admin/users/:id`, ({ request, params }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const idx = db.profiles.findIndex((p) => p.id === params.id)
    if (idx < 0) return json({ message: 'Not found' }, 404)
    db.profiles[idx].is_active = false
    return json({ ok: true })
  }),

  // ─── Admin: Categories ────────────────────────────────────────────────────
  http.get(`${API}/admin/categories`, ({ request }) => {
    if (!requireAuth(request)) return unauthorized()
    return json(db.categories)
  }),

  http.post(`${API}/admin/categories`, async ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const body = (await request.json()) as Partial<import('@/types').Category>
    const newCat: import('@/types').Category = {
      id: nextId(db.categories),
      name: body.name!,
      slug: body.slug ?? body.name!.toLowerCase().replace(/\s+/g, '-'),
      description: body.description,
      color: body.color ?? '#FF6B35',
      icon: body.icon ?? 'folder',
      sort_order: body.sort_order ?? db.categories.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    db.categories.push(newCat)
    return json(newCat, 201)
  }),

  http.put(`${API}/admin/categories/:id`, async ({ request, params }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const body = (await request.json()) as Partial<import('@/types').Category>
    const target = db.categories.find((c) => c.id === Number(params.id))
    if (!target) return json({ message: 'Not found' }, 404)
    Object.assign(target, body, { updated_at: new Date().toISOString() })
    return json(target)
  }),

  http.delete(`${API}/admin/categories/:id`, ({ request, params }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const idx = db.categories.findIndex((c) => c.id === Number(params.id))
    if (idx < 0) return json({ message: 'Not found' }, 404)
    db.categories.splice(idx, 1)
    return json({ ok: true })
  }),

  // ─── Admin: Articles ──────────────────────────────────────────────────────
  http.get(`${API}/admin/articles`, ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    return json(
      db.articles.map((a) => ({
        ...a,
        category: db.categories.find((c) => c.id === a.category_id),
        author: db.profiles.find((p) => p.id === a.created_by),
      }))
    )
  }),

  http.post(`${API}/admin/articles`, async ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const body = (await request.json()) as Partial<Article>
    const newArticle: Article = {
      id: nextId(db.articles),
      title: body.title!,
      slug: body.slug ?? body.title!.toLowerCase().replace(/\s+/g, '-'),
      content: body.content ?? '',
      summary: body.summary,
      category_id: body.category_id ?? null,
      access_level: body.access_level ?? 'internal',
      status: body.status ?? 'draft',
      views_count: 0,
      helpful_yes: 0,
      helpful_no: 0,
      version: 1,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    db.articles.push(newArticle)
    return json(newArticle, 201)
  }),

  http.put(`${API}/admin/articles/:id`, async ({ request, params }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const body = (await request.json()) as Partial<Article>
    const target = db.articles.find((a) => a.id === Number(params.id))
    if (!target) return json({ message: 'Not found' }, 404)
    if (body.content && body.content !== target.content) {
      target.version += 1
      db.article_versions.push({
        id: nextId(db.article_versions),
        article_id: target.id,
        version: target.version,
        content: body.content,
        edited_by: user.id,
        created_at: new Date().toISOString(),
      })
    }
    Object.assign(target, body, { updated_at: new Date().toISOString() })
    return json(target)
  }),

  http.delete(`${API}/admin/articles/:id`, ({ request, params }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const target = db.articles.find((a) => a.id === Number(params.id))
    if (!target) return json({ message: 'Not found' }, 404)
    target.status = 'archived'
    return json({ ok: true })
  }),

  http.post(`${API}/admin/articles/import`, async ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const body = (await request.json()) as { title: string; content: string; category_id?: number }
    const newArticle: Article = {
      id: nextId(db.articles),
      title: body.title,
      slug: body.title.toLowerCase().replace(/\s+/g, '-'),
      content: body.content,
      summary: body.content.slice(0, 120),
      category_id: body.category_id ?? null,
      access_level: 'internal',
      status: 'active',
      views_count: 0,
      helpful_yes: 0,
      helpful_no: 0,
      version: 1,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    db.articles.push(newArticle)
    return json(newArticle, 201)
  }),

  http.get(`${API}/admin/articles/:id/versions`, ({ request, params }) => {
    if (!requireAuth(request)) return unauthorized()
    return json(
      db.article_versions
        .filter((v) => v.article_id === Number(params.id))
        .map((v) => ({
          ...v,
          editor: db.profiles.find((p) => p.id === v.edited_by),
        }))
    )
  }),

  http.post(`${API}/admin/articles/:id/revert/:version`, ({ request, params }) => {
    if (!requireAuth(request)) return unauthorized()
    const article = db.articles.find((a) => a.id === Number(params.id))
    const version = db.article_versions.find(
      (v) => v.article_id === Number(params.id) && v.version === Number(params.version)
    )
    if (!article || !version) return json({ message: 'Not found' }, 404)
    article.content = version.content
    article.version += 1
    article.updated_at = new Date().toISOString()
    return json(article)
  }),

  // ─── Admin: Ratings ───────────────────────────────────────────────────────
  http.get(`${API}/admin/ratings`, ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    return json(db.ratings)
  }),

  // ─── Admin: Widget Conversations ──────────────────────────────────────────
  http.get(`${API}/admin/widget-conversations`, ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    return json(db.conversations.filter((c) => c.source === 'widget'))
  }),

  http.get(`${API}/admin/widget-conversations/:id/export`, ({ request, params }) => {
    if (!requireAuth(request)) return unauthorized()
    const conv = db.conversations.find((c) => c.id === params.id)
    if (!conv) return json({ message: 'Not found' }, 404)
    const msgs = db.messages.filter((m) => m.conversation_id === conv.id)
    const lines: string[] = []
    lines.push('════════════════════════════════════════')
    lines.push('CONVERSA WIDGET — Sabiá Suporte')
    lines.push('════════════════════════════════════════')
    lines.push(`Data:      ${new Date(conv.created_at).toLocaleString('pt-BR')}`)
    lines.push(`Usuário:   ${conv.user_name ?? 'Anônimo'}`)
    lines.push(`Canal:     ${conv.source}`)
    lines.push(`Status:    ${conv.is_closed ? 'Encerrada' : 'Em andamento'}`)
    if (conv.rating) lines.push(`Avaliação: ${'⭐'.repeat(conv.rating)} (${conv.rating}/5)`)
    if (conv.transfer_status) lines.push(`Transfer:  ${conv.transfer_status}`)
    lines.push('════════════════════════════════════════')
    lines.push('')
    for (const m of msgs) {
      const time = new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      lines.push(`[${time}] ${m.role === 'user' ? 'Usuário' : 'IA'}:`)
      lines.push(m.content)
      lines.push('')
    }
    return new HttpResponse(lines.join('\n'), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }),

  // ─── Admin: Knowledge Gaps ────────────────────────────────────────────────
  http.get(`${API}/admin/knowledge-gaps`, ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    return json(db.knowledge_gaps)
  }),

  http.put(`${API}/admin/knowledge-gaps/:id/resolve`, ({ request, params }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const gap = db.knowledge_gaps.find((g) => g.id === Number(params.id))
    if (!gap) return json({ message: 'Not found' }, 404)
    gap.resolved = true
    gap.resolved_by = user.id
    gap.resolved_at = new Date().toISOString()
    return json(gap)
  }),

  // ─── Admin: Audit Logs ────────────────────────────────────────────────────
  http.get(`${API}/admin/audit-logs`, ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    return json(db.audit_logs)
  }),

  // ─── Admin: System Logs ───────────────────────────────────────────────────
  http.get(`${API}/admin/system-logs`, ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    return json(db.system_logs)
  }),

  // ─── Admin: Health ────────────────────────────────────────────────────────
  http.get(`${API}/admin/health`, ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    return json({
      ai_provider: db.ai_settings.provider,
      ai_connected: true,
      ai_requests_24h: 142,
      teams_webhook_configured: Boolean(db.widget_settings.teams_webhook_url),
      teams_last_send: new Date(Date.now() - 3 * 3600_000).toISOString(),
      teams_last_status: 'failed' as const,
      maintenance_mode: db.widget_settings.maintenance_mode,
      recent_critical_errors: db.system_logs.filter((l) => l.level === 'critical' || l.level === 'error').slice(0, 5),
    })
  }),

  // ─── Admin: Settings AI ───────────────────────────────────────────────────
  http.get(`${API}/admin/settings/ai`, ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    return json(db.ai_settings)
  }),

  http.put(`${API}/admin/settings/ai`, async ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const body = (await request.json()) as Partial<AiSettings>
    Object.assign(db.ai_settings, body)
    db.audit_logs.unshift({
      id: nextId(db.audit_logs),
      user_id: user.id,
      user_name: user.full_name,
      action: 'settings.ai.change',
      entity_type: 'ai_settings',
      old_value: {},
      new_value: body,
      ip_address: '189.45.10.22',
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString(),
    })
    return json(db.ai_settings)
  }),

  http.post(`${API}/admin/settings/ai/test-prompt`, async ({ request }) => {
    if (!requireAuth(request)) return unauthorized()
    const body = (await request.json()) as { system_prompt: string; test_message: string }

    const encoder = new TextEncoder()
    const reply = `Resposta de teste para "${body.test_message}" usando o prompt fornecido.\n\nEste é um stream simulado.`
    const stream = new ReadableStream({
      async start(controller) {
        const words = reply.split(' ')
        for (let i = 0; i < words.length; i++) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + words[i] })}\n\n`)
          )
          await new Promise((r) => setTimeout(r, 40))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }),

  // ─── Admin: Settings Widget ───────────────────────────────────────────────
  http.get(`${API}/admin/settings/widget`, ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    return json(db.widget_settings)
  }),

  http.put(`${API}/admin/settings/widget`, async ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const body = (await request.json()) as Partial<WidgetSettings>
    Object.assign(db.widget_settings, body)
    db.audit_logs.unshift({
      id: nextId(db.audit_logs),
      user_id: user.id,
      user_name: user.full_name,
      action: 'settings.widget.change',
      entity_type: 'widget_settings',
      old_value: {},
      new_value: body,
      ip_address: '189.45.10.22',
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString(),
    })
    return json(db.widget_settings)
  }),

  // ─── Admin: Settings Brand ────────────────────────────────────────────────
  http.get(`${API}/admin/settings/brand`, ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    return json(db.brand_settings)
  }),

  http.put(`${API}/admin/settings/brand`, async ({ request }) => {
    const user = requireAuth(request)
    if (!user || user.role !== 'gestor') return unauthorized()
    const body = (await request.json()) as Partial<BrandSettings>
    Object.assign(db.brand_settings, body)
    db.audit_logs.unshift({
      id: nextId(db.audit_logs),
      user_id: user.id,
      user_name: user.full_name,
      action: 'settings.brand.change',
      entity_type: 'brand_settings',
      old_value: {},
      new_value: body,
      ip_address: '189.45.10.22',
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString(),
    })
    return json(db.brand_settings)
  }),

  // ─── Widget (public) chat ────────────────────────────────────────────────
  http.post(`${API}/widget/chat`, async ({ request }) => {
    const body = (await request.json()) as { message: string; conversation_id?: string }

    let conversation: Conversation | undefined
    if (body.conversation_id) {
      conversation = db.conversations.find((c) => c.id === body.conversation_id)
    }
    if (!conversation) {
      conversation = {
        id: genUuid(),
        user_id: null,
        user_name: 'Usuário anônimo (widget)',
        session_id: 'sess-' + Math.random().toString(36).slice(2, 8),
        source: 'widget',
        access_level: 'public',
        title: body.message.slice(0, 60),
        is_closed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      db.conversations.push(conversation)
    }

    db.messages.push({
      id: nextId(db.messages),
      conversation_id: conversation.id,
      role: 'user',
      content: body.message,
      has_images: false,
      created_at: new Date().toISOString(),
    })

    const reply =
      body.message.toLowerCase().includes('nf') || body.message.toLowerCase().includes('nota')
        ? aiResponses[0]
        : body.message.toLowerCase().includes('cnh') || body.message.toLowerCase().includes('motorista')
        ? aiResponses[2]
        : aiResponses[1]

    const conf = 0.78
    const assistantMsg: Message = {
      id: nextId(db.messages),
      conversation_id: conversation.id,
      role: 'assistant',
      content: reply,
      has_images: false,
      confidence: conf,
      confidence_level: 'high',
      created_at: new Date().toISOString(),
    }
    db.messages.push(assistantMsg)
    conversation.updated_at = new Date().toISOString()

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ conversation_id: conversation!.id })}\n\n`)
        )
        const words = reply.split(' ')
        for (let i = 0; i < words.length; i++) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + words[i] })}\n\n`)
          )
          await new Promise((r) => setTimeout(r, 40))
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ message: assistantMsg })}\n\n`)
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }),

  http.get(`${API}/widget/settings`, () => json(db.widget_settings)),
  http.get(`${API}/widget/brand`, () => json(db.brand_settings)),
]
