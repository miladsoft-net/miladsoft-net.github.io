<script lang="ts">
  import { cart } from '../store/cartStore';
  import Icon from '@iconify/svelte';
  import PaymentModal from './PaymentModal.svelte';
  
  let showPaymentModal = false;
  $: total = $cart.reduce((sum, item) => sum + (item.salePrice || item.price), 0);

  function handleCheckout() {
    showPaymentModal = true;
  }
</script>

<div class="min-h-[300px]">
  {#if $cart.length === 0}
    <div class="flex flex-col items-center justify-center h-[300px]">
      <Icon icon="material-symbols:shopping-cart-outline" class="text-black/30 dark:text-white/30 w-16 h-16" />
      <p class="mt-4 text-black/50 dark:text-white/50">Your cart is empty</p>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each $cart as item}
        <div class="flex justify-between items-center p-4">
          <div>
            <a href={`/posts/${item.slug}/`} class="text-black dark:text-white font-medium hover:underline">
              {item.title}
            </a>
            <div class="flex gap-2 items-center">
              {#if item.salePrice}
                <span class="text-black/50 dark:text-white/50 line-through">${item.price}</span>
                <span class="text-[var(--primary)]">${item.salePrice}</span>
              {:else}
                <span class="text-black/50 dark:text-white/50">${item.price}</span>
              {/if}
            </div>
          </div>
          <button class="text-black/30 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 transition-colors" on:click={() => cart.removeItem(item.slug)}>
            <Icon icon="material-symbols:delete-outline" class="w-8 h-8"/>
          </button>
        </div>
      {/each}
      
      <div class="flex justify-between items-center p-4 mt-4 font-semibold">
        <span class="text-black dark:text-white">Total:</span>
        <span class="text-blue-500">${total.toFixed(2)}</span>
      </div>
      
      <button class="w-full py-4 mt-4 bg-[var(--primary)] text-white rounded-lg font-semibold transition-all hover:opacity-90 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-black/30" disabled={$cart.length === 0} on:click={handleCheckout}>
        Proceed to Checkout
      </button>
    </div>
  {/if}
</div>

<PaymentModal 
  bind:show={showPaymentModal} 
  {total}
  on:close={() => showPaymentModal = false}
/>
