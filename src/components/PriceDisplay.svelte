<script lang="ts">
  export let price: number;
  export let salePrice: number | undefined = undefined;
  export let isFree: boolean = false;
  export let compact: boolean = false;
</script>

<div class="price-display {compact ? 'text-sm' : 'text-base'}">
  {#if isFree}
    <span class="free-badge">Free</span>
  {:else}
    <div class="price-container">
      {#if salePrice}
        <span class="original-price">${price}</span>
        <span class="sale-price">${salePrice}</span>
      {:else}
        <span class="regular-price">${price}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .price-display {
    display: flex;
    align-items: center;
    font-weight: 500;
  }

  .free-badge {
    background-color: var(--primary);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
  }

  .price-container {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .original-price {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  .sale-price {
    color: var(--primary);
  }

  .regular-price {
    color: var(--text-normal);
  }
</style>
