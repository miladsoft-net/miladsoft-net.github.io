import { writable } from 'svelte/store'

export interface CartItem {
  slug: string
  title: string
  price: number
  salePrice?: number
}

const STORAGE_KEY = 'cart-items'

function createCartStore() {
  // Initialize from localStorage if available
  const savedItems = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') 
    : []
    
  const { subscribe, set, update } = writable<CartItem[]>(savedItems)

  return {
    subscribe,
    addItem: (item: CartItem) => update(items => {
      const newItems = items.some(i => i.slug === item.slug) 
        ? items 
        : [...items, item]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems))
      return newItems
    }),
    removeItem: (slug: string) => update(items => {
      const newItems = items.filter(i => i.slug !== slug)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems))
      return newItems
    }),
    clear: () => {
      localStorage.removeItem(STORAGE_KEY)
      set([])
    }
  }
}

export const cart = createCartStore()
