<script lang="ts">
  import { cart } from '../store/cartStore'
  import type { CartItem } from '../store/cartStore'
  
  export let item: CartItem
  
  $: isInCart = $cart.some(i => i.slug === item.slug)

  function handleClick() {
    if (isInCart) {
      window.location.href = '/cart/'
    } else {
      const cartItem: CartItem = {
        slug: item.slug,
        title: item.title,
        price: item.price,
        salePrice: item.salePrice,
        repoUrl: item.repoUrl,
        repositories: item.repositories || [] 
      }
      cart.addItem(cartItem)
    }
  }
</script>

<button
  class="w-full py-4 px-8 rounded-lg font-semibold transition-all bg-[var(--primary)] text-white text-center hover:opacity-90 hover:-translate-y-1"
  class:in-cart={isInCart}
  on:click={handleClick}
>
  <span class="text-black/70 dark:text-white/70">{isInCart ? 'Go to Cart' : 'Add to Cart'}</span> 
</button>

<style>
  .in-cart {
    @apply bg-black/[0.2] ;
  }
</style>
