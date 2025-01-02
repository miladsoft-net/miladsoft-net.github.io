<script lang="ts">
  import Icon from '@iconify/svelte';
  import { createEventDispatcher } from 'svelte';
  import { portal } from '../utils/portal'; // Updated import

  const dispatch = createEventDispatcher();
  
  export let show = false;
  export let total: number;
  export let githubId: string;

  let selectedMethod = '';
  
  const paymentMethods = [
    {
      id: 'usdt-ton',
      name: 'USDT on TON',
      description: 'Pay with USDT on The Open Network (TON)',
      icon: 'material-symbols:diamond',
      address: 'TON_WALLET_ADDRESS',
      network: 'TON Network'
    },
    {
      id: 'usdt-eth',
      name: 'USDT on Ethereum',
      description: 'Pay with USDT on Ethereum Network (ERC-20)',
      icon: 'cryptocurrency:eth',
      address: 'ETH_WALLET_ADDRESS',
      network: 'Ethereum Network'
    },
    {
      id: 'usdt-tron',
      name: 'USDT on TRON',
      description: 'Pay with USDT on TRON Network (TRC-20)',
      icon: 'cryptocurrency:trx',
      address: 'TRON_WALLET_ADDRESS',
      network: 'TRON Network'
    },
    {
      id: 'btc-lightning',
      name: 'Bitcoin Lightning',
      description: 'Pay with Bitcoin through Lightning Network',
      icon: 'cryptocurrency:btc',
      address: 'LIGHTNING_INVOICE',
      network: 'Lightning Network'
    }
  ];

  function handleClose() {
    show = false;
    dispatch('close');
  }

  function handlePaymentSelect(methodId: string) {
    selectedMethod = methodId;
  }

  function copyAddress(address: string) {
    navigator.clipboard.writeText(address);
    // Add toast notification here
  }

  $: if (typeof window !== 'undefined') {
    toggleBodyScroll(show);
  }
</script>

{#if show}
  <div use:portal={'body'} class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
    <div class="bg-white dark:bg-[var(--card-bg)] rounded-lg shadow-lg w-full max-w-lg max-h-full overflow-auto">
      <div class="sticky top-0 bg-white dark:bg-[var(--card-bg)] p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 class="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Icon icon="material-symbols:payments-outline" class="w-6 h-6" />
          Select Payment Method
        </h2>
        <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" on:click={handleClose}>
          <Icon icon="material-symbols:close" class="w-6 h-6" />
        </button>
      </div>

      <div class="p-4 space-y-4">
        <div class="grid gap-4">
          {#each paymentMethods as method}
            <button 
              class="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              class:selected={selectedMethod === method.id}
              on:click={() => handlePaymentSelect(method.id)}
            >
              <div class="flex-shrink-0">
                <Icon icon={method.icon} class="w-6 h-6 text-gray-900 dark:text-gray-100" />
              </div>
              <div class="flex-1">
                <span class="font-medium block text-gray-900 dark:text-gray-100">{method.name}</span>
                <span class="text-sm text-gray-600 dark:text-gray-400">{method.description}</span>
              </div>
              <Icon icon="material-symbols:chevron-right" class="w-5 h-5 text-gray-400" />
            </button>
          {/each}
        </div>

        {#if selectedMethod}
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                <p class="text-lg font-bold text-gray-900 dark:text-gray-100">${total.toFixed(2)}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-600 dark:text-gray-400">Network</p>
                <p class="font-medium text-gray-900 dark:text-gray-100">{paymentMethods.find(m => m.id === selectedMethod)?.network}</p>
              </div>
            </div>

            <div class="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
              <code class="text-sm break-all text-gray-900 dark:text-gray-100">{paymentMethods.find(m => m.id === selectedMethod)?.address}</code>
              <button 
                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
                on:click={() => copyAddress(paymentMethods.find(m => m.id === selectedMethod)?.address || '')}
              >
                <Icon icon="material-symbols:content-copy" class="w-5 h-5" />
              </button>
            </div>

            <div class="bg-white dark:bg-[var(--card-bg)] p-4 rounded-lg flex items-center justify-center">
              <div class="text-gray-400 text-center">
                <Icon icon="material-symbols:qr-code-2" class="w-12 h-12 mx-auto mb-2" />
                <p>Scan QR Code to Pay</p>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Prevent body scroll when modal is open */
  :global(body.modal-open) {
    overflow: hidden;
  }

  /* Selected Payment Method */
  .selected {
    @apply bg-[var(--primary)] text-white;
  }

  .selected .text-gray-600 {
    @apply text-white;
  }
</style>

<script context="module">
  // Add/remove body class when modal opens/closes
  function toggleBodyScroll(show: boolean) {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('modal-open', show);
    }
  }
</script>

