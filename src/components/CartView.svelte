<script lang="ts">
  import { cart } from '../store/cartStore';
  import Icon from '@iconify/svelte';
  import PaymentModal from './PaymentModal.svelte';
  
  let githubId = '';
  let showPaymentModal = false;
  $: total = $cart.reduce((sum, item) => sum + (item.salePrice || item.price), 0);
  $: isValidGithubId = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(githubId);

  function handleCheckout() {
    showPaymentModal = true;
  }
</script>

<div class="cart-container">
  {#if $cart.length === 0}
    <div class="empty-cart">
      <Icon icon="material-symbols:shopping-cart-outline" class="text-black/30 dark:text-white/30 w-16 h-16" />
      <p class="mt-4 text-black/50 dark:text-white/50">Your cart is empty</p>
    </div>
  {:else}
    <div class="cart-items">
      {#each $cart as item}
        <div class="cart-item">
          <div class="item-info">
            <a href={`/posts/${item.slug}/`} class="text-black/90 dark:text-white/90 font-medium hover:underline">
              {item.title}
            </a>
            <div class="price">
              {#if item.salePrice}
                <span class="text-black/30 dark:text-white/30 line-through">${item.price}</span>
                <span class="text-[var(--primary)]">${item.salePrice}</span>
              {:else}
                <span class="text-black/70 dark:text-white/70">${item.price}</span>
              {/if}
            </div>
            {#if item.repoUrl}
              <div class="repo-link">
                <Icon icon="mdi:github" class="inline-block mr-1 w-4 h-4  text-black/70 dark:text-white/70" />
                <a href={item.repoUrl} target="_blank" rel="noopener noreferrer" 
                   class="text-[var(--primary)] text-sm hover:underline inline-flex items-center gap-1">
                  Repository
                  <Icon icon="material-symbols:open-in-new" class="w-3 h-3  text-black/70 dark:text-white/70" />
                </a>
              </div>
            {/if}
          </div>
          <button class="remove" on:click={() => cart.removeItem(item.slug)}>
            <Icon icon="material-symbols:delete-outline" class="text-black/30 dark:text-white/30 w-8 h-8"/>
          </button>
        </div>
      {/each}
      
      <div class="total">
        <span class="text-black/90 dark:text-white/90">Total:</span>
        <span class="text-[var(--primary)]">${total.toFixed(2)}</span>
      </div>

      <div class="github-id-input">
        <div class="mb-4 bg-black/[0.02] dark:bg-white/[0.02] p-4 rounded-lg">
          <p class="text-black/90 dark:text-white/90 font-medium mb-2">
            <Icon icon="octicon:info-16" class="inline-block mr-2" />
            GitHub Access Required
          </p>
          <p class="text-black/60 dark:text-white/60 text-sm leading-relaxed">
            Please provide your GitHub username to get access to the private repositories after purchase completion.
          </p>
        </div>
        
        <div class="flex relative transition-all items-center h-11 rounded-lg
          bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
          dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10">
          <Icon icon="mdi:github" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"/>
          <input 
            type="text" 
            id="github-id" 
            bind:value={githubId}
            placeholder="Enter your GitHub username"
            class="transition-all pl-10 text-sm bg-transparent outline-0 h-full w-full 
              text-black/70 dark:text-white/70 placeholder:text-black/40 dark:placeholder:text-white/40"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        {#if githubId && !isValidGithubId}
          <p class="mt-2 text-red-500 dark:text-red-400 text-sm flex items-center">
            <Icon icon="octicon:alert-16" class="mr-1" />
            Please enter a valid GitHub username
          </p>
        {/if}
      </div>
      
      <button class="checkout" disabled={!isValidGithubId || $cart.length === 0} on:click={handleCheckout}>
        {#if !isValidGithubId}
         <span class="text-black/70 dark:text-white/70"> Enter GitHub Username</span>
        {:else}
         
          <span class="text-black/70 dark:text-white/70">  Proceed to Checkout</span>
        {/if}
      </button>
    </div>
  {/if}
</div>

<!-- Move PaymentModal outside any containers -->
<PaymentModal 
  bind:show={showPaymentModal} 
  {total}
  {githubId}
  on:close={() => showPaymentModal = false}
/>

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
    align-items: center;
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
    font-weight: 600;
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
    transition: all 0.2s;
  }

  .checkout:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .checkout:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    background: var(--text-muted);
  }

  .repo-link {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.5rem;
    color: var(--text-muted);
  }
</style>
