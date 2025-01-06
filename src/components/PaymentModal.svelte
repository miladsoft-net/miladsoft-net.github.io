<script lang="ts">
  import Icon from "@iconify/svelte";
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import { portal } from "../utils/portal";
  import { fade, scale, blur } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { downloadStore, type Download } from "../store/downloadsStore";
  import { cart } from "../store/cartStore";

  const dispatch = createEventDispatcher();

  function toggleBodyScroll(show: boolean) {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("modal-open", show);
    }
  }

  const paymentMethods = [
    {
      id: "lightning",
      name: "Bitcoin Lightning",
      description: "Fast & low fees",
      icon: "cryptocurrency:btc",
      network: "Lightning Network",
    },
  ];

  export let show = false;
  export let total: number;
  export let products: Array<{
    title: string;
    price: number;
    slug: string;
    fileName: string; 
  }>;

  let selectedMethod = "";
  let bitcoinPrice = 0;
  let satoshis = 0;
  let invoice = "";
  let paymentResult = "";
  let isChecking = false;
  let verifyUrl = "";
  let isGeneratingInvoice = false;
  let previousSatoshis = 0;
  let autoRefreshInterval: ReturnType<typeof setInterval>;

  // Watch for changes in show and total
  $: {
    if (show) {
      fetchBitcoinPrice();
    }
  }

  // Watch for changes in bitcoinPrice and total
  $: {
    if (bitcoinPrice > 0 && total > 0) {
      const newSatoshis = Math.round((total / bitcoinPrice) * 100000000);
      // Only regenerate invoice if satoshis amount has changed
      if (newSatoshis !== previousSatoshis && selectedMethod) {
        previousSatoshis = newSatoshis;
        satoshis = newSatoshis;
        if (invoice) {
          generateInvoice(); // Regenerate invoice with new amount
        }
      } else {
        satoshis = newSatoshis;
      }
    }
  }

  async function fetchBitcoinPrice() {
    try {
      const response = await fetch("https://mempool.space/api/v1/prices");
      const data = await response.json();
      const newPrice = data.USD;

      if (newPrice !== bitcoinPrice) {
        bitcoinPrice = newPrice;
      }
    } catch (error) {
      console.error("Error fetching Bitcoin price:", error);
    }
  }

  async function generateInvoice() {
    isGeneratingInvoice = true;
    paymentResult = "";

    try {
      const response = await fetch(
        `https://api.getalby.com/lnurl/generate-invoice?ln=milad@getalby.com&amount=${satoshis * 1000}`
      );
      const data = await response.json();

      if (!data.invoice || !data.invoice.pr) {
        throw new Error("Invalid response from API");
      }

      invoice = data.invoice.pr;
      verifyUrl = data.invoice.verify;
      startPaymentCheck();
    } catch (error) {
      console.error("Error generating invoice:", error);
      paymentResult = "❌ Error generating invoice. Please try again.";
    } finally {
      isGeneratingInvoice = false;
    }
  }

  function startPaymentCheck() {
    if (!verifyUrl) return;

    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(verifyUrl);
        const data = await response.json();

        if (data.status === "OK") {
          if (data.settled) {
            await handleSuccessfulPayment();
            clearInterval(checkInterval);
          } else {
            paymentResult = "⏳ Waiting for payment...";
          }
        }
      } catch (error) {
        console.error("Error checking payment:", error);
        paymentResult = "❌ Error checking payment status";
      }
    }, 2000); // Check every 2 seconds

    // Cleanup interval after 10 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 600000);
  }

  async function handleSuccessfulPayment() {
    try {
         for (const product of products) {
        console.log("Downloading file:", product.fileName); 
        if (downloadStore.checkExistingDownload(product.slug)) {
           await downloadStore.updateExistingDownload(product.slug, 3);
          console.log("Extended download for:", product.slug);
        } else {
           const expirationDate = new Date();
          expirationDate.setMonth(expirationDate.getMonth() + 1);
          
           const downloadItem: Download = {
             slug: product.slug,
             title: product.title,
             fileName: product.fileName,
             purchaseDate: new Date().toISOString(),
             price: product.price,
             userId: crypto.randomUUID(),
             downloads: 0,
             maxDownloads: 3,
             expirationDate: expirationDate.toISOString()  
            };
          await downloadStore.addDownload(downloadItem);
          console.log("Added new download:", product.slug);
        }
      }

       cart.clear();
      console.log("Cart cleared");

       const confetti = (await import("canvas-confetti")).default;

       confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

       const duration = 3000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();

       showSuccessAnimation();

       setTimeout(() => {
        show = false;
        window.location.href = "/downloads/";
      }, 3000);

      dispatch("success");
    } catch (error) {
      console.error("Payment processing error:", error);
      paymentResult = "❌ Failed to process payment";
    }
  }

  function showSuccessAnimation() {
    const successMessage = document.createElement("div");
    successMessage.className =
      "fixed inset-0 flex items-center justify-center bg-white/30 dark:bg-black/30 backdrop-blur-lg z-50";
    successMessage.innerHTML = `
    <div class="text-center p-8 transform scale-up bg-white/70 dark:bg-black/70 rounded-lg backdrop-blur-lg shadow-lg">
      <div class="success-checkmark">
        <div class="check-icon">
          <span class="icon-line line-tip"></span>
          <span class="icon-line line-long"></span>
          <div class="icon-circle"></div>
          <div class="icon-fix"></div>
        </div>
      </div>
      <h2 class="text-3xl font-bold mb-4 text-black dark:text-white">Payment Successful!</h2>
      <p class="text-lg text-gray-600 dark:text-gray-400">Your downloads have been updated</p>
      <div class="animate-bounce mt-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">Redirecting to downloads...</p>
      </div>
    </div>
  `;
    document.body.appendChild(successMessage);
  }

  function generateSecureToken() {
    return crypto.randomUUID();
  }

  function handleClose() {
    show = false;
    dispatch("close");
  }

  function handlePaymentSelect(methodId: string) {
    selectedMethod = methodId;
    previousSatoshis = satoshis;
    generateInvoice();
  }

  function copyAddress(address: string) {
    navigator.clipboard.writeText(address);
   }

  $: if (typeof window !== "undefined") {
    toggleBodyScroll(show);
  }

   onMount(async () => {
    if (show) {
      await fetchBitcoinPrice();
    }
     const interval = setInterval(() => {
      if (show) {
        fetchBitcoinPrice();
      }
    }, 60000);

    onDestroy(() => {
      clearInterval(interval);
    });
  });

   onMount(() => {
    if (show) {
      fetchBitcoinPrice();
    }

     autoRefreshInterval = setInterval(() => {
      if (show && selectedMethod) {
        fetchBitcoinPrice();
      }
    }, 60000);

    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  });

   $: if (!show && autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
</script>

{#if show}
  <div
    use:portal={"body"}
    class="fixed inset-0 flex items-center justify-center z-50 p-4"
    transition:fade={{ duration: 200 }}
  >
     <div
      class="absolute inset-0 backdrop-blur-sm bg-black/50"
      transition:blur={{ duration: 200 }}
    ></div>

     <div
      class="relative bg-white dark:bg-[var(--card-bg)] rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      transition:scale={{
        duration: 300,
        delay: 100,
        opacity: 0,
        start: 0.95,
        easing: quintOut,
      }}
    >
       <div
        class="sticky top-0 z-10 bg-inherit p-4 flex justify-between items-center rounded-t-3xl"
      >
        <h2
          class="text-xl font-bold flex items-center gap-2 text-black dark:text-white"
        >
          <Icon icon="material-symbols:payments-outline" class="w-6 h-6" />
          Select Payment Method
        </h2>
        <button
          class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90"
          on:click={handleClose}
        >
          <Icon
            icon="material-symbols:close"
            class="w-6 h-6 text-gray-500 dark:text-gray-400 dark:hover:text-gray-200"
          />
        </button>
      </div>

       <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="p-4 space-y-6">
           <div class="space-y-4">
             {#each paymentMethods as method}
              <button
                class="w-full flex items-center gap-4 p-4 rounded-lg bg-[var(--primary)] transition-colors"
                class:selected={selectedMethod === method.id}
                on:click={() => handlePaymentSelect(method.id)}
              >
                <div class="flex-shrink-0">
                  <Icon
                    icon={method.icon}
                    class="w-6 h-6 text-black dark:text-white"
                  />
                </div>
                <div class="flex-1">
                  <span class="font-medium block text-black dark:text-white"
                    >{method.name}</span
                  >
                  <span class="text-sm text-black dark:text-white"
                    >{method.description}</span
                  >
                </div>
                <Icon
                  icon="material-symbols:chevron-right"
                  class="w-5 h-5 text-black dark:text-white"
                />
              </button>
            {/each}
          </div>

          {#if selectedMethod}
            <div
              class="space-y-6 bg-gray-50 dark:bg-white/10 rounded-xl p-6"
              transition:scale={{ duration: 200, opacity: 0.5 }}
            >
               <div class="flex justify-between items-start gap-4">
                <div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Total Amount
                  </p>
                  <p class="text-lg font-bold text-black dark:text-white">
                    ${total.toFixed(2)}
                  </p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Satoshis: {satoshis.toFixed(0)}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Network
                  </p>
                  <p class="font-medium text-black dark:text-white">
                    {paymentMethods.find((m) => m.id === selectedMethod)
                      ?.network}
                  </p>
                </div>
              </div>

               {#if isGeneratingInvoice}
                <div
                  class="flex flex-col items-center justify-center p-8 space-y-4"
                  in:fade
                >
                  <div class="loader">
                    <div class="circle"></div>
                    <div class="circle"></div>
                    <div class="circle"></div>
                    <div class="circle"></div>
                  </div>
                  <p
                    class="text-gray-700 dark:text-gray-300 font-medium animate-pulse"
                  >
                    Generating invoice...
                  </p>
                </div>
              {:else if invoice}
                <div class="space-y-6">
                   <div
                    class="flex items-center gap-2 p-3 bg-white dark:bg-[var(--card-bg)] rounded-xl"
                  >
                    <code class="text-sm break-all text-black dark:text-white"
                      >{invoice}</code
                    >
                    <button
                      class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      on:click={() => copyAddress(invoice)}
                    >
                      <Icon
                        icon="material-symbols:content-copy"
                        class="w-5 h-5"
                      />
                    </button>
                  </div>

                   <div
                    class="flex flex-col items-center justify-center p-6 bg-white dark:bg-[var(--card-bg)] rounded-xl"
                  >
                    <p class="text-gray-400 mb-4">Scan QR Code to Pay</p>
                     <div
                      class="w-[200px] h-[200px] relative flex items-center justify-center"
                    >
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${invoice}&size=200x200`}
                        alt="QR Code"
                      />
                    </div>
                  </div>

                   <div class="flex flex-col items-center gap-4">
                    {#if paymentResult}
                      <p
                        class="mt-2 text-sm font-medium"
                        class:text-green-500={paymentResult.includes("✅")}
                        class:text-red-500={paymentResult.includes("❌")}
                        class:text-yellow-500={paymentResult.includes("⚠️")}
                        class:text-[var(--primary)]={paymentResult.includes(
                          "⏳"
                        ) || paymentResult.includes("🔄")}
                      >
                        {paymentResult}
                      </p>
                    {/if}
                    {#if invoice && previousSatoshis !== satoshis}
                      <div
                        class="text-sm text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg"
                      >
                        <Icon
                          icon="material-symbols:warning"
                          class="inline-block mr-2"
                        />
                        Bitcoin price has changed. A new invoice has been generated.
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
 
  :global(.dark) .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgb(75, 85, 99) rgb(31, 41, 55);
  }

  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgb(156, 163, 175) rgb(243, 244, 246);
  }

  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: rgb(243, 244, 246);
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgb(156, 163, 175);
    border-radius: 4px;
  }

  :global(.dark) .overflow-y-auto::-webkit-scrollbar-track {
    background: rgb(31, 41, 55);
  }

  :global(.dark) .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgb(75, 85, 99);
  }

   .selected {
    @apply bg-[var(--primary)] text-white;
  }

  .selected .text-gray-600 {
    @apply text-white;
  }

  :global(.dark) .text-green-500 {
    color: rgb(34, 197, 94);
  }

  :global(.dark) .text-red-500 {
    color: rgb(239, 68, 68);
  }

  :global(.dark) .text-yellow-500 {
    color: rgb(234, 179, 8);
  }

  :global(.dark) .text-blue-500 {
    color: rgb(59, 130, 246);
  }

  /* Add smooth transitions */
  .flex-col {
    transition: height 0.3s ease-in-out;
  }

  /* Improved spacing utilities */
  .space-y-6 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 1.5rem;
  }

  .space-y-4 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 1rem;
  }

  .space-y-3 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 0.75rem;
  }

  .space-y-2 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 0.5rem;
  }

  /* Add smooth transition for QR code */
  img {
    transition: transform 0.2s ease;
  }

  img:hover {
    transform: scale(1.02);
  }

  /* Custom loader animation */
  .loader {
    position: relative;
    width: 80px;
    height: 80px;
    animation: rotate 2s linear infinite;
  }

  .circle {
    position: absolute;
    width: 60%;
    height: 60%;
    border-radius: 50%;
    background: var(--primary, #3b82f6);
    animation: chase 2s ease-in-out infinite;
  }

  .circle:nth-child(1) {
    animation-delay: -0.3s;
  }
  .circle:nth-child(2) {
    animation-delay: -0.6s;
  }
  .circle:nth-child(3) {
    animation-delay: -0.9s;
  }
  .circle:nth-child(4) {
    animation-delay: -1.2s;
  }

  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes chase {
    0% {
      transform: scale(0.3) rotate(0deg);
      opacity: 0.8;
    }
    50% {
      transform: scale(1) rotate(180deg);
      opacity: 0.4;
    }
    100% {
      transform: scale(0.3) rotate(360deg);
      opacity: 0.8;
    }
  }

  /* Smooth transitions */
  :global(.scale-enter) {
    animation: scale-in 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global(.scale-leave) {
    animation: scale-out 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes scale-in {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes scale-out {
    from {
      transform: scale(1);
      opacity: 1;
    }
    to {
      transform: scale(0.95);
      opacity: 0;
    }
  }

  /* Content transitions */
  .space-y-6 {
    transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Hover effects */
  button:not(:disabled):hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
  }

  button:not(:disabled):active {
    transform: translateY(0);
  }

  .flex-col {
    transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Always show scrollbar to prevent layout shift */
  .overflow-y-scroll {
    scrollbar-gutter: stable;
  }

  /* Improved close button hover effect */
  button:hover .w-6.h-6 {
    transform: scale(1.1);
    transition: transform 0.2s ease;
  }

  /* Custom scrollbar styling */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgb(156, 163, 175) transparent;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 20px;
  }

  :global(.dark) .custom-scrollbar {
    scrollbar-color: rgba(0, 0, 0, 0.5) transparent;
  }

  :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(75, 85, 99, 0.5);
  }

  /* Hover effect for scrollbar */
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(107, 114, 128, 0.5);
  }

  :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(107, 114, 128, 0.5);
  }

  /* Make inner containers match the rounded corners */
  .rounded-xl {
    @apply rounded-2xl;
  }

  /* Add success checkmark animation styles */
  .success-checkmark {
    width: 80px;
    height: 80px;
    margin: 0 auto;
  }

  .check-icon {
    width: 80px;
    height: 80px;
    position: relative;
    border-radius: 50%;
    box-sizing: content-box;
    border: 4px solid #4caf50;
  }

  .check-icon::before {
    top: 3px;
    left: -2px;
    width: 30px;
    transform-origin: 100% 50%;
    border-radius: 100px 0 0 100px;
  }

  .check-icon::after {
    top: 0;
    left: 30px;
    width: 60px;
    transform-origin: 0 50%;
    border-radius: 0 100px 100px 0;
    animation: rotate-circle 4.25s ease-in;
  }

  .check-icon::before,
  .check-icon::after {
    content: "";
    height: 100px;
    position: absolute;
    background: #ffffff;
    transform: rotate(-45deg);
  }

  .icon-line {
    height: 5px;
    background-color: #4caf50;
    display: block;
    border-radius: 2px;
    position: absolute;
    z-index: 10;
  }

  .line-tip {
    top: 46px;
    left: 14px;
    width: 25px;
    transform: rotate(45deg);
    animation: icon-line-tip 0.75s;
  }

  .line-long {
    top: 38px;
    right: 8px;
    width: 47px;
    transform: rotate(-45deg);
    animation: icon-line-long 0.75s;
  }

  .icon-circle {
    top: -4px;
    left: -4px;
    z-index: 10;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    position: absolute;
    box-sizing: content-box;
    border: 4px solid rgba(76, 175, 80, 0.5);
  }

  .icon-fix {
    top: 8px;
    width: 5px;
    left: 26px;
    z-index: 1;
    height: 85px;
    position: absolute;
    transform: rotate(-45deg);
    background-color: #ffffff;
  }

  @keyframes rotate-circle {
    0% {
      transform: rotate(-45deg);
    }
    5% {
      transform: rotate(-45deg);
    }
    12% {
      transform: rotate(-405deg);
    }
    100% {
      transform: rotate(-405deg);
    }
  }

  @keyframes icon-line-tip {
    0% {
      width: 0;
      left: 1px;
      top: 19px;
    }
    54% {
      width: 0;
      left: 1px;
      top: 19px;
    }
    70% {
      width: 50px;
      left: -8px;
      top: 37px;
    }
    84% {
      width: 17px;
      left: 21px;
      top: 48px;
    }
    100% {
      width: 25px;
      left: 14px;
      top: 46px;
    }
  }

  @keyframes icon-line-long {
    0% {
      width: 0;
      right: 46px;
      top: 54px;
    }
    65% {
      width: 0;
      right: 46px;
      top: 54px;
    }
    84% {
      width: 55px;
      right: 0px;
      top: 35px;
    }
    100% {
      width: 47px;
      right: 8px;
      top: 38px;
    }
  }

  .scale-up {
    animation: scale-up 0.4s ease-out;
  }

  @keyframes scale-up {
    0% {
      transform: scale(0.8);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
