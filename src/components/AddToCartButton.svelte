<script lang="ts">
  import { cart } from '../store/cartStore'
  import type { CartItem } from '../store/cartStore'
  
  export let item: CartItem
  
  $: isInCart = $cart.some(i => i.slug === item.slug)
</script>

<button
  class="cart-button"
  class:in-cart={isInCart}
  on:click={() => !isInCart && cart.addItem(item)}
  disabled={isInCart}
>
  {isInCart ? 'In Cart' : 'Add to Cart'}
</button>

<style>
  .cart-button {
    padding: 0.75rem 2rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.2s;
    background-color: var(--primary);
    color: white;
  }

  .cart-button:not(:disabled):hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .cart-button.in-cart {
    background-color: var(--text-muted);
    cursor: default;
  }
</style>
