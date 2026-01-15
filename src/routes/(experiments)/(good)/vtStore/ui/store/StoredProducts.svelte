<!--
	StoredProducts.svelte
	
	Component for displaying a list of stored product data from the store.
	
	Features:
	- Lists all products stored at a specific path (default: app/products)
	- Shows product ID and data for each entry
	- Provides a "Clear All" button to remove all products
	- Customizable title and empty state message
	
	This component is used to display generated product data from AI calls.
-->

<script lang="ts">
	interface Product {
		id: string;
		data: any;
	}

	interface Props {
		allProducts: Product[];
		clearAllProducts: () => void;
		title?: string;
		emptyMessage?: string;
	}

	// Props with default values for title and emptyMessage
	let { 
		allProducts, // Array of product objects with id and data
		clearAllProducts, // Callback function to clear all products
		title = 'All Stored Products', // Customizable title
		emptyMessage = 'No products stored yet. Generate some products to see them here!' // Customizable empty state message
	}: Props = $props();
</script>

<div class="rounded-md border border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/30 p-4">
	<div class="mb-2 flex items-center justify-between">
		<!-- Display title with count -->
		<strong class="dark:text-emerald-200">{title} ({allProducts.length}):</strong>
		<!-- Only show clear button if there are products to clear -->
		{#if allProducts.length > 0}
			<button
				onclick={clearAllProducts}
				class="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
			>
				Clear All
			</button>
		{/if}
	</div>
	{#if allProducts.length > 0}
		<!-- Render each product as a beautiful card -->
		<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each allProducts as { id, data }}
				{@const name = data?.name || 'Unknown Product'}
				{@const price = data?.price ?? null}
				{@const category = data?.category || 'Uncategorized'}
				{@const description = data?.description || ''}
				<div
					class="group relative overflow-hidden rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 shadow-sm transition-all hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md"
				>
					<!-- Product card content -->
					<div class="p-5">
						<!-- ID badge (small, subtle) -->
						<div class="mb-3 text-xs text-gray-400 dark:text-gray-500">#{id.split('/').pop()}</div>

						<!-- Name (prominent) -->
						<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">{name}</h3>

						<!-- Product details grid -->
						<div class="space-y-3">
							<!-- Price -->
							{#if price !== null}
								<div class="flex items-center gap-3">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="2"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</div>
									<div>
										<div class="text-xs text-gray-500 dark:text-gray-400">Price</div>
										<div class="text-sm font-medium text-gray-900 dark:text-slate-200">
											${price.toFixed(2)}
										</div>
									</div>
								</div>
							{/if}

							<!-- Category -->
							<div class="flex items-center gap-3">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-4 w-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
										/>
									</svg>
								</div>
								<div class="flex-1">
									<div class="text-xs text-gray-500 dark:text-gray-400">Category</div>
									<div class="mt-1">
										<span
											class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
										>
											{category}
										</span>
									</div>
								</div>
							</div>

							<!-- Description -->
							{#if description}
								<div class="flex items-start gap-3">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="2"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
											/>
										</svg>
									</div>
									<div class="flex-1">
										<div class="text-xs text-gray-500 dark:text-gray-400">Description</div>
										<div class="mt-1 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
											{description}
										</div>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Show empty state message when no products exist -->
		<p class="mt-4 text-sm text-gray-600 dark:text-gray-300">
			{emptyMessage}
		</p>
	{/if}
</div>
