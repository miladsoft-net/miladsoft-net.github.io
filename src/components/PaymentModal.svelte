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
</script>

{#if show}
  <div use:portal={'body'}>
    <div class="modal-backdrop" class:show on:click={handleClose}>
      <div class="modal-content text-black/90 dark:text-white/90" on:click|stopPropagation>
        <div class="modal-header">
          <h2 class="text-xl font-bold flex items-center gap-2">
            <Icon icon="material-symbols:payments-outline" class="w-6 h-6" />
            Select Payment Method
          </h2>
          <button class="close-btn text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80" on:click={handleClose}>
            <Icon icon="material-symbols:close" class="w-6 h-6" />
          </button>
        </div>

        <div class="payment-methods">
          {#each paymentMethods as method}
            <button 
              class="payment-method group"
              class:selected={selectedMethod === method.id}
              on:click={() => handlePaymentSelect(method.id)}
            >
              <div class="icon-wrapper">
                <Icon icon={method.icon} class="w-6 h-6" />
              </div>
              <div class="flex-1">
                <span class="font-medium block">{method.name}</span>
                <span class="text-sm text-black/60 dark:text-white/60 group-hover:text-black/80 dark:group-hover:text-white/80">{method.description}</span>
              </div>
              <Icon icon="material-symbols:chevron-right" class="w-5 h-5 text-black/30 dark:text-white/30 group-hover:text-black/60 dark:group-hover:text-white/60" />
            </button>
          {/each}
        </div>

        {#if selectedMethod}
          <div class="payment-details">
            <div class="flex items-center justify-between mb-4">
              <div class="text-sm">
                <p class="text-black/60 dark:text-white/60">Total Amount</p>
                <p class="text-lg font-bold">${total.toFixed(2)}</p>
              </div>
              <div class="text-sm text-right">
                <p class="text-black/60 dark:text-white/60">Network</p>
                <p class="font-medium">{paymentMethods.find(m => m.id === selectedMethod)?.network}</p>
              </div>
            </div>

            <div class="address-box bg-black/[0.02] dark:bg-white/[0.02]">
              <code class="text-sm break-all">{paymentMethods.find(m => m.id === selectedMethod)?.address}</code>
              <button 
                class="copy-btn text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80" 
                on:click={() => copyAddress(paymentMethods.find(m => m.id === selectedMethod)?.address || '')}
              >
                <Icon icon="material-symbols:content-copy" class="w-5 h-5" />
              </button>
            </div>

            <div class="qr-code-container bg-white p-4 rounded-lg mt-4 flex items-center justify-center">
              <div class="qr-placeholder text-black/30 text-sm text-center">
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
  /* Modal Base */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 1rem;
    isolation: isolate;
  }

  .modal-content {
    background: var(--card-bg);
    padding: 2rem;
    border-radius: 1rem;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    z-index: 100000;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  /* Header */
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  /* Payment Methods */
  .payment-methods {
    display: grid;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .payment-method {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--bg-secondary);
    transition: all 0.2s;
    text-align: left;
  }

  .payment-method:hover {
    background: var(--bg-hover);
  }

  .payment-method.selected {
    background: var(--primary);
    color: white;
  }

  .payment-method.selected :global(.text-black\/60) {
    color: rgba(255, 255, 255, 0.8);
  }

  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    background: var(--bg-hover);
  }

  .selected .icon-wrapper {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Payment Details */
  .payment-details {
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 0.5rem;
  }

  .address-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: var(--bg-hover);
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .copy-btn {
    padding: 0.5rem;
    border-radius: 0.5rem;
    transition: all 0.2s;
  }

  .copy-btn:hover {
    background: var(--bg-hover);
  }

  /* Animation */
  @keyframes modal-in {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .modal-content {
    animation: modal-in 0.2s ease-out forwards;
  }

  /* Dark Mode Overrides */
  :global(.dark) .modal-content {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }
</style>

