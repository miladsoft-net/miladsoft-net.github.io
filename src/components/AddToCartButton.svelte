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
        repoUrl: item.repoUrl
      }
      cart.addItem(cartItem)
    }
  }
</script>

<button
  class="cart-button"
  class:in-cart={isInCart}
  on:click={handleClick}
>
  {isInCart ? 'Go to Cart' : 'Add to Cart'}
</button>

<style>
  .cart-button {
    width: 100%;
    padding: 1rem 2rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: all 0.2s;
    background-color: var(--primary);
    color: white;
    text-align: center;
  }

  .cart-button:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .cart-button.in-cart {
    background-color: var(--text-normal);
  }
</style>
