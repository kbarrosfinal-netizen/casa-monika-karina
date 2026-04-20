export interface Store {
  id: string
  name: string
  color: string
  order: number
}

export interface Category {
  id: string
  name: string
  icon: string
  order: number
}

export interface Product {
  id: string
  name: string
  icon: string
  category_id: string | null
  unit: string
}

export interface ShoppingListItem {
  id: string
  product_id: string
  is_missing: boolean
  quantity: number
  added_at: string
  added_by: string | null
}

export interface MonthlyListItem {
  id: string
  product_id: string
  month: string
  quantity: number
  added_at: string
  suggested: boolean
  accepted: boolean
}

export interface ProductPrice {
  id: string
  product_id: string
  store_id: string
  price: number
  date: string
  source: 'receipt' | 'manual'
}

export interface ProductWithState extends Product {
  category?: Category | null
  is_missing: boolean
  quantity: number
}
