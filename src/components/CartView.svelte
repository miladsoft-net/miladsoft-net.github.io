<script lang="ts">
  import { cart } from '../store/cartStore';
  import Icon from '@iconify/svelte'

  $: total = $cart.reduce((sum, item) => sum + (item.salePrice || item.price), 0);
</script>

<div class="cart-container">
  {#if $cart.length === 0}
    <div class="empty-cart">
      <Icon icon="material-symbols:shopping-cart-outline" class="w-16 h-16 text-gray-400" />
 
      <p class="mt-4 text-gray-500">Your cart is empty</p>
    </div>
  {:else}
    <div class="cart-items">
      {#each $cart as item}
        <div class="cart-item">
          <div class="item-info">
            <h3>{item.title}</h3>
            <div class="price">
              {#if item.salePrice}
                <span class="original">${item.price}</span>
                <span class="sale">${item.salePrice}</span>
              {:else}
                <span>${item.price}</span>
              {/if}
            </div>
          </div>
          <button class="remove" on:click={() => cart.removeItem(item.slug)}>
            <Icon icon="material-symbols:delete-outline" />
          </button>
        </div>
      {/each}
      
      <div class="total">
        <span>Total:</span>
        <span>${total.toFixed(2)}</span>
      </div>
      
      <button class="checkout">
        Proceed to Checkout
      </button>
    </div>
  {/if}
</div>

<style>
  .cart-container {
    min-height: 300px;
  }

  .empty-cart {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
  }

  .cart-items {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cart-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .item-info h3 {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .price {
    display: flex;
    gap: 0.5rem;
  }

  .price .original {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  .price .sale {
    color: var(--primary);
  }

  .remove {
    color: var(--text-muted);
    padding: 0.5rem;
    border-radius: 0.5rem;
    transition: all 0.2s;
  }

  .remove:hover {
    color: var(--text-error);
    background: var(--bg-hover);
  }

  .total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    margin-top: 1rem;
    font-weight: bold;
    border-top: 2px solid var(--border-color);
  }

  .checkout {
    width: 100%;
    padding: 1rem;
    margin-top: 1rem;
    background: var(--primary);
    color: white;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: opacity 0.2s;
  }

  .checkout:hover {
    opacity: 0.9;
  }
</style>
