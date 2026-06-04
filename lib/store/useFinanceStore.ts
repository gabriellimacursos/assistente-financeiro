'use client'
import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { Transaction, Recurrence, ViewMode, Mode, CreditCard, CategoryItem, UserProfile, ProfilePermissions } from '@/types'
import { OWNER_PERMISSIONS, DEFAULT_MEMBER_PERMISSIONS } from '@/types'

export function getProfilePermissions(profiles: UserProfile[], activeProfileId: string): ProfilePermissions {
  const profile = profiles.find(p => p.id === activeProfileId)
  if (!profile || profile.isOwner) return OWNER_PERMISSIONS
  return { ...DEFAULT_MEMBER_PERMISSIONS, ...(profile.permissions ?? {}) }
}

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
  addTransaction: (t: Transaction) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>
  addProfile: (p: UserProfile) => Promise<void>
  updateProfile: (id: string, data: Partial<UserProfile>) => Promise<void>
  removeProfile: (id: string) => Promise<void>
  addRecurrence: (r: Recurrence) => Promise<void>
  updateRecurrence: (id: string, data: Partial<Recurrence>) => Promise<void>
  toggleRecurrence: (id: string) => Promise<void>
  removeRecurrence: (id: string) => Promise<void>
  addCategory: (name: string, mode: Mode, direction: 'income' | 'expense' | 'both') => Promise<void>
  removeCategory: (name: string, mode: Mode) => Promise<void>
  addCard: (card: CreditCard) => Promise<void>
  updateCard: (id: string, data: Partial<CreditCard>) => Promise<void>
  removeCard: (id: string) => Promise<void>
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
    permissions: p.permissions ?? null,
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
    permissions: row.permissions ?? undefined,
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

      clearCloudSession: () => set({ cloudUserId: null, syncStatus: 'idle', syncError: null, isAdmin: false, userStatus: null }),

      addTransaction: async (t) => {
        const { cloudUserId } = get()
        const userId = cloudUserId
        const item = { ...t, id: ensureUuid(t.id), user_id: userId ?? t.user_id }
        set((state) => ({ transactions: [item, ...state.transactions] }))
        if (userId) {
          const { error } = await supabase.from('transactions').upsert(transactionToDb(item, userId))
          if (error) {
            set((state) => ({ transactions: state.transactions.filter(tr => tr.id !== item.id) }))
            throw error
          }
        }
      },

      removeTransaction: async (id) => {
        const prev = get().transactions
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }))
        if (get().cloudUserId) {
          const { error } = await supabase.from('transactions').delete().eq('id', id)
          if (error) { set({ transactions: prev }); throw error }
        }
      },

      updateTransaction: async (id, data) => {
        const prev = get().transactions
        const next = prev.map((t) => t.id === id ? { ...t, ...data } : t)
        const item = next.find(t => t.id === id)
        set({ transactions: next })
        const userId = get().cloudUserId
        if (userId && item) {
          const { error } = await supabase.from('transactions').upsert(transactionToDb(item, userId))
          if (error) { set({ transactions: prev }); throw error }
        }
      },

      addRecurrence: async (r) => {
        const userId = get().cloudUserId
        const item = { ...r, id: ensureUuid(r.id), user_id: userId ?? r.user_id }
        set((state) => ({ recurrences: [item, ...state.recurrences] }))
        if (userId) {
          const { error } = await supabase.from('recurrences').upsert(recurrenceToDb(item, userId))
          if (error) { set((state) => ({ recurrences: state.recurrences.filter(rec => rec.id !== item.id) })); throw error }
        }
      },

      updateRecurrence: async (id, data) => {
        const prev = get().recurrences
        const next = prev.map((r) => r.id === id ? { ...r, ...data } : r)
        const item = next.find(r => r.id === id)
        set({ recurrences: next })
        const userId = get().cloudUserId
        if (userId && item) {
          const { error } = await supabase.from('recurrences').upsert(recurrenceToDb(item, userId))
          if (error) { set({ recurrences: prev }); throw error }
        }
      },

      toggleRecurrence: async (id) => {
        const prev = get().recurrences
        const next = prev.map((r) => r.id === id ? { ...r, active: !r.active } : r)
        const item = next.find(r => r.id === id)
        set({ recurrences: next })
        const userId = get().cloudUserId
        if (userId && item) {
          const { error } = await supabase.from('recurrences').upsert(recurrenceToDb(item, userId))
          if (error) { set({ recurrences: prev }); throw error }
        }
      },

      removeRecurrence: async (id) => {
        const prev = get().recurrences
        set((state) => ({ recurrences: state.recurrences.filter((r) => r.id !== id) }))
        if (get().cloudUserId) {
          const { error } = await supabase.from('recurrences').delete().eq('id', id)
          if (error) { set({ recurrences: prev }); throw error }
        }
      },

      addCategory: async (name, mode, direction) => {
        const trimmed = name.trim()
        if (!trimmed) return
        const item: CategoryItem = { name: trimmed, direction }
        const { cloudUserId } = get()
        if (mode === 'personal') {
          if (get().categoriesPersonal.some(c => c.name === trimmed)) return
          set((state) => ({ categoriesPersonal: [...state.categoriesPersonal, item] }))
        } else {
          if (get().categoriesBusiness.some(c => c.name === trimmed)) return
          set((state) => ({ categoriesBusiness: [...state.categoriesBusiness, item] }))
        }
        if (cloudUserId) {
          const { error } = await supabase.from('categories').insert({ user_id: cloudUserId, name: trimmed, mode, direction })
          if (error && error.code !== '23505') {
            if (mode === 'personal') set((state) => ({ categoriesPersonal: state.categoriesPersonal.filter(c => c.name !== trimmed) }))
            else set((state) => ({ categoriesBusiness: state.categoriesBusiness.filter(c => c.name !== trimmed) }))
            throw error
          }
        }
      },

      removeCategory: async (name, mode) => {
        const prev = { categoriesPersonal: get().categoriesPersonal, categoriesBusiness: get().categoriesBusiness }
        if (mode === 'personal') set((state) => ({ categoriesPersonal: state.categoriesPersonal.filter(c => c.name !== name) }))
        else set((state) => ({ categoriesBusiness: state.categoriesBusiness.filter(c => c.name !== name) }))
        const { cloudUserId } = get()
        if (cloudUserId) {
          const { error } = await supabase.from('categories').delete().eq('user_id', cloudUserId).eq('name', name).eq('mode', mode)
          if (error) { set(prev); throw error }
        }
      },

      addProfile: async (p) => {
        const item = { ...p, id: p.id || uuid() }
        set((s) => ({ profiles: [...s.profiles, item] }))
        const { cloudUserId } = get()
        if (cloudUserId) {
          const { error } = await supabase.from('profiles').upsert(profileToDb(item, cloudUserId))
          if (error) { set((s) => ({ profiles: s.profiles.filter(prof => prof.id !== item.id) })); throw error }
        }
      },

      updateProfile: async (id, data) => {
        const prev = get().profiles
        const next = prev.map(p => p.id === id ? { ...p, ...data } : p)
        const item = next.find(p => p.id === id)
        set({ profiles: next })
        const { cloudUserId } = get()
        if (cloudUserId && item) {
          const { error } = await supabase.from('profiles').upsert(profileToDb(item, cloudUserId))
          if (error) { set({ profiles: prev }); throw error }
        }
      },

      removeProfile: async (id) => {
        const prev = { profiles: get().profiles, activeProfileId: get().activeProfileId }
        set((s) => ({ profiles: s.profiles.filter(p => p.id !== id), activeProfileId: s.activeProfileId === id ? '' : s.activeProfileId }))
        if (get().cloudUserId) {
          const { error } = await supabase.from('profiles').delete().eq('id', id)
          if (error) { set(prev); throw error }
        }
      },

      addCard: async (card) => {
        const userId = get().cloudUserId
        const item = { ...card, id: ensureUuid(card.id) }
        set((s) => ({ cards: [item, ...s.cards] }))
        if (userId) {
          const { error } = await supabase.from('credit_cards').upsert(cardToDb(item, userId))
          if (error) { set((s) => ({ cards: s.cards.filter(c => c.id !== item.id) })); throw error }
        }
      },

      updateCard: async (id, data) => {
        const prev = get().cards
        const next = prev.map(c => c.id === id ? { ...c, ...data } : c)
        const item = next.find(c => c.id === id)
        set({ cards: next })
        const { cloudUserId } = get()
        if (cloudUserId && item) {
          const { error } = await supabase.from('credit_cards').upsert(cardToDb(item, cloudUserId))
          if (error) { set({ cards: prev }); throw error }
        }
      },

      removeCard: async (id) => {
        const prev = get().cards
        set((s) => ({ cards: s.cards.filter(c => c.id !== id) }))
        if (get().cloudUserId) {
          const { error } = await supabase.from('credit_cards').delete().eq('id', id)
          if (error) { set({ cards: prev }); throw error }
        }
      },
    })
)
