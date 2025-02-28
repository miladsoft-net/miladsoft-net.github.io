<script lang="ts">
  import Icon from "@iconify/svelte";
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import { portal } from "../utils/portal";
  import { fade, scale, blur } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { downloadStore, type Download } from "../store/downloadsStore";
  import { cart } from "../store/cartStore";
  import "../styles/PaymentModal.css";

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
  let activeTab = "invoice"; // Add this new variable for tab state
  let tabTransitionDuration = 150;
  let isTabTransitioning = false;

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

  async function generateInvoice(retryCount = 0) {
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
      console.error(
        `Error generating invoice (attempt ${retryCount + 1}/3):`,
        error
      );

      if (retryCount < 2) {
        // Try up to 3 times (0, 1, 2)
        paymentResult = `⏳ Retrying... (attempt ${retryCount + 2}/3)`;
        // Wait 2 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return generateInvoice(retryCount + 1);
      } else {
        paymentResult =
          "❌ Failed to generate invoice. Please try again later.";
      }
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
        if (!downloadStore.checkExistingDownload(product.slug)) {
          const downloadItem: Download = {
            slug: product.slug,
            title: product.title,
            fileName: product.fileName,
            purchaseDate: new Date().toISOString(),
            price: product.price,
            userId: crypto.randomUUID(),
            quantity: 0,
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
    generateInvoice(0); // Start with retry count 0
  }

  function copyAddress(address: string) {
    navigator.clipboard.writeText(address);
  }

  async function switchTab(newTab: string) {
    if (activeTab === newTab || isTabTransitioning) return;

    isTabTransitioning = true;
    activeTab = newTab;

    // صبر برای اتمام انیمیشن
    await new Promise((resolve) => setTimeout(resolve, tabTransitionDuration));
    isTabTransitioning = false;
  }

  $: if (typeof window !== "undefined") {
    toggleBodyScroll(show);
  }

  onMount(() => {
    const initialize = async () => {
      if (show) {
        await fetchBitcoinPrice();
      }

      autoRefreshInterval = setInterval(() => {
        if (show && selectedMethod) {
          fetchBitcoinPrice();
        }
      }, 60000);
    };

    initialize();

    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  });

  $: if (!show && autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  const tabs = [
    {
      id: "invoice",
      icon: "material-symbols:receipt-outline",
      label: "Invoice Text",
    },
    {
      id: "qr",
      icon: "material-symbols:qr-code",
      label: "QR Code",
    },
  ];
</script>

{#if show}
  <div
    use:portal={"body"}
    class="payment-modal fixed inset-0 flex items-center justify-center z-50 p-4"
    transition:fade={{ duration: 200 }}
  >
    <div
      class="absolute inset-0 backdrop-blur-sm bg-black/50"
      transition:blur={{ duration: 200 }}
    ></div>

    <div
      class="relative content-container rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
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
                  <!-- Tab buttons -->
                  <div class="flex gap-2 mb-4">
                    {#each tabs as tab}
                      <button
                        class="tab-button flex-1 py-2.5 px-4 rounded-xl transition-all duration-200 font-medium relative group"
                        class:active={activeTab === tab.id}
                        on:click={() => switchTab(tab.id)}
                        disabled={isTabTransitioning}
                      >
                        <div class="flex items-center justify-center gap-2">
                          <Icon
                            icon={tab.icon}
                            class="w-5 h-5 transition-colors"
                          />
                          <span class="transition-colors">{tab.label}</span>
                        </div>
                        <div
                          class="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--primary)] scale-x-0 transition-transform duration-200 origin-center"
                          class:scale-x-100={activeTab === tab.id}
                        />
                      </button>
                    {/each}
                  </div>

                  <!-- Tab content -->
                  <div class="relative h-[250px]">
                    {#if activeTab === "invoice"}
                      <div
                        class="absolute inset-0 flex items-center gap-2 p-4 invoice-container rounded-xl"
                        in:fade={{ duration: tabTransitionDuration }}
                        out:fade={{ duration: tabTransitionDuration }}
                      >
                        <code
                          class="text-sm break-all flex-1 text-[var(--text-color)]"
                          >{invoice}</code
                        >
                        <button
                          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                          on:click={() => copyAddress(invoice)}
                        >
                          <Icon
                            icon="material-symbols:content-copy"
                            class="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-[var(--primary)]"
                          />
                        </button>
                      </div>
                    {:else}
                      <div
                        class="absolute inset-0 flex flex-col items-center justify-center p-6 invoice-container rounded-xl"
                        in:fade={{ duration: tabTransitionDuration }}
                        out:fade={{ duration: tabTransitionDuration }}
                      >
                        <p class="text-[var(--text-color)] mb-4 font-medium">
                          Scan QR Code to Pay
                        </p>
                        <div
                          class="relative flex items-center justify-center bg-white p-3 rounded-lg shadow-sm"
                        >
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?data=${invoice}&size=200x200`}
                            alt="QR Code"
                            class="max-h-[160px] w-auto"
                          />
                        </div>
                      </div>
                    {/if}
                  </div>

                  <!-- ...existing payment result section... -->
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
