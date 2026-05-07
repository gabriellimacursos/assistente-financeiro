export type Mode = 'personal' | 'business'
export type TransactionType = 'income' | 'expense'
export type TransactionStatus = 'confirmed' | 'pending' | 'cancelled'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom'

export interface Transaction {
  card_id?: string
  profile_id?: string
  profile_name?: string
  id: string
  user_id?: string
  type: TransactionType
  mode: Mode
  amount: number
  category: string
  subcategory?: string
  description: string
  original_text?: string
  date: string
  payment_method?: string
  is_recurring: boolean
  recurrence_id?: string
  status: TransactionStatus
  created_at: string
}

export interface Recurrence {
  id: string
  user_id?: string
  title: string
  type: TransactionType
  mode: Mode
  amount: number
  category: string
  frequency: RecurrenceFrequency
  next_date: string
  active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  mode: Mode | 'both'
  type: TransactionType | 'both'
  icon?: string
  color?: string
}

export interface CategoryItem {
  name: string
  direction: 'income' | 'expense' | 'both'
}

export interface AIInterpretation {
  type: TransactionType
  amount: number
  mode: Mode
  category: string
  description: string
  confidence: number
  needsClarification: boolean
  clarificationQuestion?: string
  clarificationOptions?: string[]
  recurrenceSuggestion?: boolean
}

export interface DashboardMetrics {
  totalIncome: number
  totalExpense: number
  balance: number
  previousIncome: number
  previousExpense: number
  previousBalance: number
  topCategories: { category: string; amount: number; type: TransactionType }[]
  monthlyData: { month: string; income: number; expense: number }[]
}

export type ViewMode = 'personal' | 'business' | 'all'

export type ProfileType = 'entrepreneur' | 'employee' | 'freelancer' | 'investor' | 'other'

export interface UserProfile {
  id: string
  name: string
  initials: string
  color: string
  pin?: string
  isOwner: boolean
  created_at: string
  // Contexto financeiro para alimentar a IA
  profileType?: ProfileType
  incomeSources?: string[]       // ex: ['Curso Online', 'Assistência Técnica']
  typicalExpenses?: string[]     // ex: ['Combustível', 'Alimentação']
  preferredMode?: 'business' | 'personal' | 'both'
}

export interface CreditCard {
  id: string
  name: string
  lastDigits: string
  mode: Mode
  color: string
  limit?: number
  closingDay?: number
  dueDay?: number
  active: boolean
  created_at: string
}
