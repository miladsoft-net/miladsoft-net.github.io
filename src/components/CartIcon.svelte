<script lang="ts">
  import { cart } from '../store/cartStore';
  import Icon from '@iconify/svelte'
  
  $: itemCount = $cart.length;
</script>

<a href="/cart/" class="cart-icon">
  <Icon icon="material-symbols:shopping-cart" class="w-6 h-6" />
  {#if itemCount > 0}
    <span class="cart-badge">{itemCount}</span>
  {/if}
</a>

<style>
  .cart-icon {
    position: relative;
    display: inline-flex;
  }

  .cart-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: var(--primary);
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    width: 18px;
    height: 18px;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
