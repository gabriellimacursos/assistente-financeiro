'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Transaction, Recurrence, ViewMode, Mode, CreditCard, CategoryItem, UserProfile } from '@/types'

// ─── Default categories ───────────────────────────────────────────────────────
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

// ─── Store ───────────────────────────────────────────────────────────────────
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

  setViewMode: (mode: ViewMode) => void
  setActiveMode: (mode: Mode) => void
  setActiveProfileId: (id: string) => void
  addTransaction: (t: Transaction) => void
  removeTransaction: (id: string) => void
  updateTransaction: (id: string, data: Partial<Transaction>) => void
  addProfile: (p: UserProfile) => void
  updateProfile: (id: string, data: Partial<UserProfile>) => void
  removeProfile: (id: string) => void
  addRecurrence: (r: Recurrence) => void
  toggleRecurrence: (id: string) => void
  removeRecurrence: (id: string) => void
  addCategory: (name: string, mode: Mode, direction: 'income' | 'expense' | 'both') => void
  removeCategory: (name: string, mode: Mode) => void
  addCard: (card: CreditCard) => void
  updateCard: (id: string, data: Partial<CreditCard>) => void
  removeCard: (id: string) => void
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set) => ({
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

      setViewMode: (viewMode) => set({ viewMode }),
      setActiveMode: (activeMode) => set({ activeMode }),
      setActiveProfileId: (activeProfileId) => set({ activeProfileId }),

      addTransaction: (t) =>
        set((state) => ({ transactions: [t, ...state.transactions] })),

      removeTransaction: (id) =>
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) })),

      updateTransaction: (id, data) =>
        set((state) => ({
          transactions: state.transactions.map((t) => t.id === id ? { ...t, ...data } : t),
        })),

      addRecurrence: (r) =>
        set((state) => ({ recurrences: [r, ...state.recurrences] })),

      toggleRecurrence: (id) =>
        set((state) => ({
          recurrences: state.recurrences.map((r) =>
            r.id === id ? { ...r, active: !r.active } : r
          ),
        })),

      removeRecurrence: (id) =>
        set((state) => ({
          recurrences: state.recurrences.filter((r) => r.id !== id),
        })),

      addCategory: (name, mode, direction) =>
        set((state) => {
          const trimmed = name.trim()
          if (!trimmed) return state
          const item: CategoryItem = { name: trimmed, direction }
          if (mode === 'personal') {
            if (state.categoriesPersonal.some(c => c.name === trimmed)) return state
            return { categoriesPersonal: [...state.categoriesPersonal, item] }
          } else {
            if (state.categoriesBusiness.some(c => c.name === trimmed)) return state
            return { categoriesBusiness: [...state.categoriesBusiness, item] }
          }
        }),

      removeCategory: (name, mode) =>
        set((state) => {
          if (mode === 'personal') {
            return { categoriesPersonal: state.categoriesPersonal.filter(c => c.name !== name) }
          } else {
            return { categoriesBusiness: state.categoriesBusiness.filter(c => c.name !== name) }
          }
        }),

      addProfile: (p) => set(s => ({ profiles: [...s.profiles, p] })),
      updateProfile: (id, data) => set(s => ({ profiles: s.profiles.map(p => p.id === id ? { ...p, ...data } : p) })),
      removeProfile: (id) => set(s => ({ profiles: s.profiles.filter(p => p.id !== id) })),

      addCard: (card) => set(s => ({ cards: [card, ...s.cards] })),
      updateCard: (id, data) => set(s => ({ cards: s.cards.map(c => c.id === id ? { ...c, ...data } : c) })),
      removeCard: (id) => set(s => ({ cards: s.cards.filter(c => c.id !== id) })),
    }),
    {
      name: 'finance-store',
      version: 3,
      migrate: (persisted: any, version: number) => {
        const migrateCategories = (cats: any[]): CategoryItem[] => {
          if (!Array.isArray(cats) || cats.length === 0) return []
          return cats.map(c =>
            typeof c === 'string'
              ? { name: c, direction: 'both' as const }
              : c
          )
        }
        return {
          ...persisted,
          categoriesPersonal: migrateCategories(persisted?.categoriesPersonal ?? []),
          categoriesBusiness: migrateCategories(persisted?.categoriesBusiness ?? []),
          profiles: persisted?.profiles ?? [],
          activeProfileId: persisted?.activeProfileId ?? '',
        }
      },
    }
  )
)
