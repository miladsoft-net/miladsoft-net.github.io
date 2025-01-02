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
                <span class="text-black/30 line-through">${item.price}</span>
                <span class="text-blue-500">${item.salePrice}</span>
              {:else}
                <span class="text-black/50 dark:text-white/50">${item.price}</span>
              {/if}
            </div>
            {#if item.repoUrl}
              <div class="flex items-center gap-1 mt-2 text-black/50 dark:text-white/50">
                <Icon icon="mdi:github" class="w-4 h-4" />
                <a href={item.repoUrl} target="_blank" rel="noopener noreferrer" 
                   class="transition link text-[var(--primary)] font-medium text-sm hover:underline inline-flex items-center gap-1">
                  Repository
                  <Icon icon="material-symbols:open-in-new" class="w-3 h-3" />
                </a>
              </div>
            {/if}
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

      <div class="mb-4 p-4 bg-black/[0.04] dark:bg-white/5 rounded-lg">
        <p class="text-black dark:text-white font-medium mb-2 flex items-center">
          <Icon icon="octicon:info-16" class="mr-2" />
          GitHub Access Required
        </p>
        <p class="text-black/50 dark:text-white/50 text-sm leading-relaxed">
          Please provide your GitHub username to get access to the private repositories after purchase completion.
        </p>
      </div>
      
      <div class="relative flex items-center h-11 rounded-lg bg-black/[0.04] dark:bg-white/5 hover:bg-black/[0.06] dark:hover:bg-white/10 focus-within:bg-black/[0.06] dark:focus-within:bg-white/10 transition-all">
        <Icon icon="mdi:github" class="absolute text-xl pointer-events-none ml-3 text-black/30 dark:text-white/30"/>
        <input 
          type="text" 
          id="github-id" 
          bind:value={githubId}
          placeholder="Enter your GitHub username"
          class="pl-10 text-sm bg-transparent outline-none h-full w-full text-black/50 dark:text-white/50 placeholder-black/30 dark:placeholder-white/30"
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
      
      <button class="w-full py-4 mt-4 bg-[var(--primary)] text-white rounded-lg font-semibold transition-all hover:opacity-90 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-black/30" disabled={!isValidGithubId || $cart.length === 0} on:click={handleCheckout}>
        {#if !isValidGithubId}
          Enter GitHub Username
        {:else}
          Proceed to Checkout
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
