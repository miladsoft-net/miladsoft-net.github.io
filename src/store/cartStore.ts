import { writable } from 'svelte/store';

export interface CartItem {
  slug: string;
  title: string;
  price: number;
  salePrice?: number;
  fileName: string;
  productUrl: string;
  addedAt?: string;
  purchased?: boolean;
}

const STORAGE_KEY = 'cart-items';

function createCartStore() {
  const savedItems = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') 
    : [];
    
  const { subscribe, set, update } = writable<CartItem[]>(savedItems);

  return {
    subscribe,
    addItem: (item: CartItem) => update(items => {
      console.log('Adding item to cart:', item);
      const exists = items.some(i => i.slug === item.slug);
      if (!exists) {
        const newItems = [...items, item];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
        return newItems;
      }
      return items;
    }),
    removeItem: (slug: string) => update(items => {
      console.log('Removing item from cart:', slug);
      const newItems = items.filter(i => i.slug !== slug);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      return newItems;
    }),
    clear: () => {
      console.log('Clearing cart');
      localStorage.removeItem(STORAGE_KEY);
      set([]);
    },
    markAsPurchased: () => update(items => {
      const newItems = items.map(item => ({ ...item, purchased: true }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      return newItems;
    })
  };
}

export const cart = createCartStore();
