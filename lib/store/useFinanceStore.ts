'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase/client'
import type { Transaction, Recurrence, ViewMode, Mode, CreditCard, CategoryItem, UserProfile } from '@/types'

export const DEFAULT_CATEGORIES_PERSONAL: CategoryItem[] = [
  { name: 'Alimentação',      direction: 'expense' },
  { name: 'Mercado',          direction: 'expense' },
  { name: 'Combustível',      direction: 'expense' },
  { name: 'Transporte',       direction: 'expense' },
  { name: 'Casa',             direction: 'expense' },
  { name: 'Saúde',            direction: 'expense' },
  { name: 'Família',          direction: 'both'    },
  { name: 'Lazer',            direction: 'expense' },
  { name: 'Academia',         direction: 'expense' },
  { name: 'Assinaturas',      direction: 'expense' },
  { name: 'Cartão',           direction: 'expense' },
  { name: 'Aluguel',          direction: 'expense' },
  { name: 'Salário',          direction: 'income'  },
  { name: 'Freelance',        direction: 'income'  },
  { name: 'Venda',            direction: 'income'  },
  { name: 'Aluguel recebido', direction: 'income'  },
  { name: 'Investimento',     direction: 'income'  },
  { name: 'Outros',           direction: 'both'    },
]

export const DEFAULT_CATEGORIES_BUSINESS: CategoryItem[] = [
  { name: 'Curso Online',        direction: 'both'    },
  { name: 'Curso Presencial',    direction: 'both'    },
  { name: 'Assistência Técnica', direction: 'both'    },
  { name: 'Consultoria',         direction: 'both'    },
  { name: 'Ferramentas',         direction: 'expense' },
  { name: 'Materiais',           direction: 'expense' },
  { name: 'Marketing',           direction: 'expense' },
  { name: 'Tráfego Pago',        direction: 'expense' },
  { name: 'Plataforma',          direction: 'expense' },
  { name: 'Professor/Parceiro',  direction: 'expense' },
  { name: 'Aluguel',             direction: 'expense' },
  { name: 'Conta Fixa',          direction: 'expense' },
  { name: 'Equipamentos',        direction: 'expense' },
  { name: 'Impostos',            direction: 'expense' },
  { name: 'Pró-labore',          direction: 'income'  },
  { name: 'Outros',              direction: 'both'    },
]

type SyncStatus = 'idle' | 'loading' | 'ready' | 'error'

interface FinanceStore {
  transactions: Transaction[]
  recurrences: Recurrence[]
  cards: CreditCard[]
  profiles: UserProfile[]
  activeProfileId: string
  categoriesPersonal: CategoryItem[]
  categoriesBusiness: CategoryItem[]
  viewMode: ViewMode
  activeMode: Mode
  isLoading: boolean
  cloudUserId: string | null
  persistedUserId: string | null
  syncStatus: SyncStatus
  syncError: string | null
  isAdmin: boolean
  userStatus: 'pending' | 'active' | 'suspended' | null

  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  setViewMode: (mode: ViewMode) => void
  setActiveMode: (mode: Mode) => void
  setActiveProfileId: (id: string) => void
  initializeCloud: (userId: string) => Promise<void>
  clearCloudSession: () => void
  addTransaction: (t: Transaction) => void
  removeTransaction: (id: string) => void
  updateTransaction: (id: string, data: Partial<Transaction>) => void
  addProfile: (p: UserProfile) => void
  updateProfile: (id: string, data: Partial<UserProfile>) => void
  removeProfile: (id: string) => void
  addRecurrence: (r: Recurrence) => void
  updateRecurrence: (id: string, data: Partial<Recurrence>) => void
  toggleRecurrence: (id: string) => void
  removeRecurrence: (id: string) => void
  addCategory: (name: string, mode: Mode, direction: 'income' | 'expense' | 'both') => void
  removeCategory: (name: string, mode: Mode) => void
  addCard: (card: CreditCard) => void
  updateCard: (id: string, data: Partial<CreditCard>) => void
  removeCard: (id: string) => void
}

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isUuid(id?: string) {
  return !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

function ensureUuid(id?: string) {
  return isUuid(id) ? id! : uuid()
}

function mergeCategories(defaults: CategoryItem[], cloud: CategoryItem[]) {
  const map = new Map<string, CategoryItem>()
  for (const item of defaults) map.set(item.name, item)
  for (const item of cloud) map.set(item.name, item)
  return Array.from(map.values())
}

function customCategories(cats: CategoryItem[], defaults: CategoryItem[]) {
  const defaultNames = new Set(defaults.map(c => c.name))
  return cats.filter(c => !defaultNames.has(c.name))
}

function profileToDb(p: UserProfile, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    initials: p.initials,
    color: p.color,
    pin: p.pin ?? null,
    is_owner: p.isOwner,
    profile_type: p.profileType ?? null,
    income_sources: p.incomeSources ?? [],
    typical_expenses: p.typicalExpenses ?? [],
    preferred_mode: p.preferredMode ?? null,
    created_at: p.created_at,
  }
}

function profileFromDb(row: any): UserProfile {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    color: row.color,
    pin: row.pin ?? undefined,
    isOwner: !!row.is_owner,
    created_at: row.created_at,
    profileType: row.profile_type ?? undefined,
    incomeSources: row.income_sources ?? [],
    typicalExpenses: row.typical_expenses ?? [],
    preferredMode: row.preferred_mode ?? undefined,
  }
}

function transactionToDb(t: Transaction, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    profile_id: t.profile_id ?? null,
    profile_name: t.profile_name ?? null,
    type: t.type,
    mode: t.mode,
    amount: t.amount,
    category: t.category,
    subcategory: t.subcategory ?? null,
    description: t.description,
    original_text: t.original_text ?? null,
    date: t.date,
    payment_method: t.payment_method ?? null,
    card_id: t.card_id ?? null,
    is_recurring: t.is_recurring,
    recurrence_id: isUuid(t.recurrence_id) ? t.recurrence_id : null,
    status: t.status,
    created_at: t.created_at,
  }
}

function transactionFromDb(row: any): Transaction {
  return {
    id: row.id,
    user_id: row.user_id,
    profile_id: row.profile_id ?? undefined,
    profile_name: row.profile_name ?? undefined,
    type: row.type,
    mode: row.mode,
    amount: Number(row.amount),
    category: row.category,
    subcategory: row.subcategory ?? undefined,
    description: row.description,
    original_text: row.original_text ?? undefined,
    date: row.date,
    payment_method: row.payment_method ?? undefined,
    card_id: row.card_id ?? undefined,
    is_recurring: !!row.is_recurring,
    recurrence_id: row.recurrence_id ?? undefined,
    status: row.status,
    created_at: row.created_at,
  }
}

function recurrenceToDb(r: Recurrence, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    title: r.title,
    type: r.type,
    mode: r.mode,
    amount: r.amount,
    category: r.category,
    frequency: r.frequency,
    next_date: r.next_date,
    active: r.active,
    created_at: r.created_at,
  }
}

function recurrenceFromDb(row: any): Recurrence {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    type: row.type,
    mode: row.mode,
    amount: Number(row.amount),
    category: row.category,
    frequency: row.frequency,
    next_date: row.next_date,
    active: !!row.active,
    created_at: row.created_at,
  }
}

function cardToDb(card: CreditCard, userId: string) {
  return {
    id: card.id,
    user_id: userId,
    name: card.name,
    last_digits: card.lastDigits,
    mode: card.mode,
    color: card.color,
    card_limit: card.limit ?? null,
    closing_day: card.closingDay ?? null,
    due_day: card.dueDay ?? null,
    active: card.active,
    created_at: card.created_at,
  }
}

function cardFromDb(row: any): CreditCard {
  return {
    id: row.id,
    name: row.name,
    lastDigits: row.last_digits ?? '',
    mode: row.mode,
    color: row.color,
    limit: row.card_limit === null ? undefined : Number(row.card_limit),
    closingDay: row.closing_day ?? undefined,
    dueDay: row.due_day ?? undefined,
    active: !!row.active,
    created_at: row.created_at,
  }
}

async function uploadLocalSnapshot(state: FinanceStore, userId: string) {
  const cardIdMap = new Map<string, string>()
  const recIdMap = new Map<string, string>()

  const profiles = state.profiles.map(p => profileToDb(p, userId))
  const cards = state.cards.map(c => {
    const id = ensureUuid(c.id)
    cardIdMap.set(c.id, id)
    return cardToDb({ ...c, id }, userId)
  })
  const recurrences = state.recurrences.map(r => {
    const id = ensureUuid(r.id)
    recIdMap.set(r.id, id)
    return recurrenceToDb({ ...r, id }, userId)
  })
  const transactions = state.transactions.map(t => {
    const id = ensureUuid(t.id)
    return transactionToDb({
      ...t,
      id,
      card_id: t.card_id ? cardIdMap.get(t.card_id) ?? t.card_id : undefined,
      recurrence_id: t.recurrence_id ? recIdMap.get(t.recurrence_id) ?? t.recurrence_id : undefined,
    }, userId)
  })
  const categories = [
    ...customCategories(state.categoriesPersonal, DEFAULT_CATEGORIES_PERSONAL).map(c => ({ user_id: userId, name: c.name, mode: 'personal', direction: c.direction })),
    ...customCategories(state.categoriesBusiness, DEFAULT_CATEGORIES_BUSINESS).map(c => ({ user_id: userId, name: c.name, mode: 'business', direction: c.direction })),
  ]

  if (profiles.length) await supabase.from('profiles').upsert(profiles)
  if (cards.length) await supabase.from('credit_cards').upsert(cards)
  if (recurrences.length) await supabase.from('recurrences').upsert(recurrences)
  if (transactions.length) await supabase.from('transactions').upsert(transactions)
  if (categories.length) await supabase.from('categories').insert(categories)
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      recurrences: [],
      cards: [],
      profiles: [],
      activeProfileId: '',
      categoriesPersonal: [...DEFAULT_CATEGORIES_PERSONAL],
      categoriesBusiness: [...DEFAULT_CATEGORIES_BUSINESS],
      viewMode: 'all',
      activeMode: 'business',
      isLoading: false,
      cloudUserId: null,
      persistedUserId: null,
      syncStatus: 'idle',
      syncError: null,
      isAdmin: false,
      userStatus: null,
      sidebarCollapsed: false,

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setViewMode: (viewMode) => set({ viewMode }),
      setActiveMode: (activeMode) => set({ activeMode }),
      setActiveProfileId: (activeProfileId) => set({ activeProfileId }),

      initializeCloud: async (userId) => {
        if (get().syncStatus === 'loading') return
        if (get().syncStatus === 'ready' && get().cloudUserId === userId) return

        // Usuário diferente do armazenado → limpa dados locais para não subir dados de outra conta
        if (get().persistedUserId && get().persistedUserId !== userId) {
          set({
            transactions: [], recurrences: [], cards: [], profiles: [],
            categoriesPersonal: [...DEFAULT_CATEGORIES_PERSONAL],
            categoriesBusiness: [...DEFAULT_CATEGORIES_BUSINESS],
            activeProfileId: '', persistedUserId: userId,
          })
        }

        set({ cloudUserId: userId, syncStatus: 'loading', syncError: null, isLoading: true })
        try {
          const [
            profilesRes,
            transactionsRes,
            recurrencesRes,
            cardsRes,
            categoriesRes,
            registryRes,
          ] = await Promise.all([
            supabase.from('profiles').select('*').order('created_at', { ascending: true }),
            supabase.from('transactions').select('*').order('date', { ascending: false }),
            supabase.from('recurrences').select('*').order('created_at', { ascending: false }),
            supabase.from('credit_cards').select('*').order('created_at', { ascending: false }),
            supabase.from('categories').select('*').order('created_at', { ascending: true }),
            supabase.from('user_registry').select('status, is_admin').eq('user_id', userId).single(),
          ])

          for (const res of [profilesRes, transactionsRes, recurrencesRes, cardsRes, categoriesRes]) {
            if (res.error) throw res.error
          }

          const hasCloudData =
            (profilesRes.data?.length ?? 0) > 0 ||
            (transactionsRes.data?.length ?? 0) > 0 ||
            (recurrencesRes.data?.length ?? 0) > 0 ||
            (cardsRes.data?.length ?? 0) > 0 ||
            (categoriesRes.data?.length ?? 0) > 0

          const localHasData =
            get().profiles.length > 0 ||
            get().transactions.length > 0 ||
            get().recurrences.length > 0 ||
            get().cards.length > 0 ||
            customCategories(get().categoriesPersonal, DEFAULT_CATEGORIES_PERSONAL).length > 0 ||
            customCategories(get().categoriesBusiness, DEFAULT_CATEGORIES_BUSINESS).length > 0

          if (!hasCloudData && localHasData) {
            await uploadLocalSnapshot(get(), userId)
            set({ syncStatus: 'idle' })
            return get().initializeCloud(userId)
          }

          const cloudCategories = categoriesRes.data ?? []
          const personalCats = cloudCategories
            .filter((c: any) => c.mode === 'personal')
            .map((c: any) => ({ name: c.name, direction: c.direction as CategoryItem['direction'] }))
          const businessCats = cloudCategories
            .filter((c: any) => c.mode === 'business')
            .map((c: any) => ({ name: c.name, direction: c.direction as CategoryItem['direction'] }))

          set({
            profiles: (profilesRes.data ?? []).map(profileFromDb),
            transactions: (transactionsRes.data ?? []).map(transactionFromDb),
            recurrences: (recurrencesRes.data ?? []).map(recurrenceFromDb),
            cards: (cardsRes.data ?? []).map(cardFromDb),
            categoriesPersonal: mergeCategories(DEFAULT_CATEGORIES_PERSONAL, personalCats),
            categoriesBusiness: mergeCategories(DEFAULT_CATEGORIES_BUSINESS, businessCats),
            activeProfileId: (profilesRes.data ?? []).some((p: any) => p.id === get().activeProfileId)
              ? get().activeProfileId
              : (profilesRes.data?.[0]?.id ?? ''),
            cloudUserId: userId,
            persistedUserId: userId,
            syncStatus: 'ready',
            isLoading: false,
            isAdmin: registryRes.data?.is_admin ?? false,
            userStatus: (registryRes.data?.status ?? null) as 'pending' | 'active' | 'suspended' | null,
          })
        } catch (err) {
          console.error('[finance-store] sync error', err)
          set({ syncStatus: 'error', syncError: err instanceof Error ? err.message : 'Falha ao sincronizar', isLoading: false })
        }
      },

      clearCloudSession: () => set({ cloudUserId: null, syncStatus: 'idle', syncError: null, isAdmin: false, userStatus: null, persistedUserId: null }),

      addTransaction: (t) =>
        set((state) => {
          const userId = state.cloudUserId
          const item = { ...t, id: ensureUuid(t.id), user_id: userId ?? t.user_id }
          if (userId) supabase.from('transactions').upsert(transactionToDb(item, userId)).then(({ error }) => error && console.error(error))
          return { transactions: [item, ...state.transactions] }
        }),

      removeTransaction: (id) =>
        set((state) => {
          if (state.cloudUserId) supabase.from('transactions').delete().eq('id', id).then(({ error }) => error && console.error(error))
          return { transactions: state.transactions.filter((t) => t.id !== id) }
        }),

      updateTransaction: (id, data) =>
        set((state) => {
          const next = state.transactions.map((t) => t.id === id ? { ...t, ...data } : t)
          const item = next.find(t => t.id === id)
          if (state.cloudUserId && item) supabase.from('transactions').upsert(transactionToDb(item, state.cloudUserId)).then(({ error }) => error && console.error(error))
          return { transactions: next }
        }),

      addRecurrence: (r) =>
        set((state) => {
          const userId = state.cloudUserId
          const item = { ...r, id: ensureUuid(r.id), user_id: userId ?? r.user_id }
          if (userId) supabase.from('recurrences').upsert(recurrenceToDb(item, userId)).then(({ error }) => error && console.error(error))
          return { recurrences: [item, ...state.recurrences] }
        }),

      updateRecurrence: (id, data) =>
        set((state) => {
          const next = state.recurrences.map((r) => r.id === id ? { ...r, ...data } : r)
          const item = next.find(r => r.id === id)
          if (state.cloudUserId && item) supabase.from('recurrences').upsert(recurrenceToDb(item, state.cloudUserId)).then(({ error }) => error && console.error(error))
          return { recurrences: next }
        }),

      toggleRecurrence: (id) =>
        set((state) => {
          const next = state.recurrences.map((r) => r.id === id ? { ...r, active: !r.active } : r)
          const item = next.find(r => r.id === id)
          if (state.cloudUserId && item) supabase.from('recurrences').upsert(recurrenceToDb(item, state.cloudUserId)).then(({ error }) => error && console.error(error))
          return { recurrences: next }
        }),

      removeRecurrence: (id) =>
        set((state) => {
          if (state.cloudUserId) supabase.from('recurrences').delete().eq('id', id).then(({ error }) => error && console.error(error))
          return { recurrences: state.recurrences.filter((r) => r.id !== id) }
        }),

      addCategory: (name, mode, direction) =>
        set((state) => {
          const trimmed = name.trim()
          if (!trimmed) return state
          const item: CategoryItem = { name: trimmed, direction }
          if (state.cloudUserId) {
            supabase.from('categories').insert({ user_id: state.cloudUserId, name: trimmed, mode, direction }).then(({ error }) => {
              if (error && error.code !== '23505') console.error(error)
            })
          }
          if (mode === 'personal') {
            if (state.categoriesPersonal.some(c => c.name === trimmed)) return state
            return { categoriesPersonal: [...state.categoriesPersonal, item] }
          }
          if (state.categoriesBusiness.some(c => c.name === trimmed)) return state
          return { categoriesBusiness: [...state.categoriesBusiness, item] }
        }),

      removeCategory: (name, mode) =>
        set((state) => {
          if (state.cloudUserId) supabase.from('categories').delete().eq('user_id', state.cloudUserId).eq('name', name).eq('mode', mode).then(({ error }) => error && console.error(error))
          return mode === 'personal'
            ? { categoriesPersonal: state.categoriesPersonal.filter(c => c.name !== name) }
            : { categoriesBusiness: state.categoriesBusiness.filter(c => c.name !== name) }
        }),

      addProfile: (p) => set(s => {
        const item = { ...p, id: p.id || uuid() }
        if (s.cloudUserId) supabase.from('profiles').upsert(profileToDb(item, s.cloudUserId)).then(({ error }) => error && console.error(error))
        return { profiles: [...s.profiles, item] }
      }),

      updateProfile: (id, data) => set(s => {
        const next = s.profiles.map(p => p.id === id ? { ...p, ...data } : p)
        const item = next.find(p => p.id === id)
        if (s.cloudUserId && item) supabase.from('profiles').upsert(profileToDb(item, s.cloudUserId)).then(({ error }) => error && console.error(error))
        return { profiles: next }
      }),

      removeProfile: (id) => set(s => {
        if (s.cloudUserId) supabase.from('profiles').delete().eq('id', id).then(({ error }) => error && console.error(error))
        return { profiles: s.profiles.filter(p => p.id !== id), activeProfileId: s.activeProfileId === id ? '' : s.activeProfileId }
      }),

      addCard: (card) => set(s => {
        const userId = s.cloudUserId
        const item = { ...card, id: ensureUuid(card.id) }
        if (userId) supabase.from('credit_cards').upsert(cardToDb(item, userId)).then(({ error }) => error && console.error(error))
        return { cards: [item, ...s.cards] }
      }),

      updateCard: (id, data) => set(s => {
        const next = s.cards.map(c => c.id === id ? { ...c, ...data } : c)
        const item = next.find(c => c.id === id)
        if (s.cloudUserId && item) supabase.from('credit_cards').upsert(cardToDb(item, s.cloudUserId)).then(({ error }) => error && console.error(error))
        return { cards: next }
      }),

      removeCard: (id) => set(s => {
        if (s.cloudUserId) supabase.from('credit_cards').delete().eq('id', id).then(({ error }) => error && console.error(error))
        return { cards: s.cards.filter(c => c.id !== id) }
      }),
    }),
    {
      name: 'finance-store',
      version: 4,
      partialize: (state) => ({
        transactions: state.transactions,
        recurrences: state.recurrences,
        cards: state.cards,
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        categoriesPersonal: state.categoriesPersonal,
        categoriesBusiness: state.categoriesBusiness,
        viewMode: state.viewMode,
        activeMode: state.activeMode,
        sidebarCollapsed: state.sidebarCollapsed,
        persistedUserId: state.persistedUserId,
      }),
      migrate: (persisted: any) => {
        const migrateCategories = (cats: any[], defaults: CategoryItem[]): CategoryItem[] => {
          if (!Array.isArray(cats) || cats.length === 0) return [...defaults]
          return mergeCategories(defaults, cats.map(c => typeof c === 'string' ? { name: c, direction: 'both' as const } : c))
        }
        return {
          ...persisted,
          categoriesPersonal: migrateCategories(persisted?.categoriesPersonal ?? [], DEFAULT_CATEGORIES_PERSONAL),
          categoriesBusiness: migrateCategories(persisted?.categoriesBusiness ?? [], DEFAULT_CATEGORIES_BUSINESS),
          profiles: persisted?.profiles ?? [],
          transactions: persisted?.transactions ?? [],
          recurrences: persisted?.recurrences ?? [],
          cards: persisted?.cards ?? [],
          activeProfileId: persisted?.activeProfileId ?? '',
        }
      },
    }
  )
)
