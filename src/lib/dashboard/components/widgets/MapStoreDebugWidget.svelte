<script lang="ts">
	/**
	 * MapStore Debug Panel
	 * 
	 * Three buttons to inspect the mapObjectStore state:
	 * 1. Log all consumers
	 * 2. Log all producers
	 * 3. Log all data
	 */

	import { mapStore } from '$lib/stores/MapStore';

	function logAllConsumers() {
		console.log('\n╔═══════════════════════════════════════════════════════════════╗');
		console.log('║  MapStore Debug: ALL CONSUMERS                                ║');
		console.log('╚═══════════════════════════════════════════════════════════════╝\n');
		
		const consumers = mapStore.getAllConsumers();
		
		console.log(`Total Consumers: ${consumers.length}\n`);
		
		if (consumers.length === 0) {
			console.log('  (No consumers registered)');
		} else {
			// Group by typeId
			const byType = consumers.reduce((acc, consumer) => {
				if (!acc[consumer.typeId]) {
					acc[consumer.typeId] = [];
				}
				acc[consumer.typeId].push(consumer);
				return acc;
			}, {} as Record<string, typeof consumers>);

			Object.entries(byType).forEach(([typeId, typeConsumers]) => {
				console.log(`📥 Channel: ${typeId}`);
				console.log(`   Consumers: ${typeConsumers.length}`);
				typeConsumers.forEach((consumer, index) => {
					console.log(`   ${index + 1}. ${consumer.registrationId} (${consumer.role})`);
				});
				console.log('');
			});

			// Table view
			console.table(consumers.map(c => ({
				'Consumer ID': c.registrationId,
				'Channel': c.typeId,
				'Role': c.role
			})));
		}

		console.log('═══════════════════════════════════════════════════════════════\n');
	}

	function logAllProducers() {
		console.log('\n╔═══════════════════════════════════════════════════════════════╗');
		console.log('║  MapStore Debug: ALL PRODUCERS                                ║');
		console.log('╚═══════════════════════════════════════════════════════════════╝\n');
		
		const producers = mapStore.getAllProducers();
		
		console.log(`Total Producers: ${producers.length}\n`);
		
		if (producers.length === 0) {
			console.log('  (No producers registered)');
		} else {
			// Group by typeId
			const byType = producers.reduce((acc, producer) => {
				if (!acc[producer.typeId]) {
					acc[producer.typeId] = [];
				}
				acc[producer.typeId].push(producer);
				return acc;
			}, {} as Record<string, typeof producers>);

			Object.entries(byType).forEach(([typeId, typeProducers]) => {
				console.log(`📤 Channel: ${typeId}`);
				console.log(`   Producers: ${typeProducers.length}`);
				typeProducers.forEach((producer, index) => {
					console.log(`   ${index + 1}. ${producer.registrationId} (${producer.role})`);
				});
				console.log('');
			});

			// Table view
			console.table(producers.map(p => ({
				'Producer ID': p.registrationId,
				'Channel': p.typeId,
				'Role': p.role
			})));
		}

		console.log('═══════════════════════════════════════════════════════════════\n');
	}

	function logAllData() {
		console.log('\n╔═══════════════════════════════════════════════════════════════╗');
		console.log('║  MapStore Debug: ALL DATA                                     ║');
		console.log('╚═══════════════════════════════════════════════════════════════╝\n');
		
		const allData = mapStore.getAllData();
		
		console.log(`Total Channels: ${allData.length}\n`);
		
		if (allData.length === 0) {
			console.log('  (No channels registered)');
		} else {
			allData.forEach((data, index) => {
				const hasValue = data.value !== undefined;
				const valueStr = hasValue 
					? (typeof data.value === 'object' 
						? JSON.stringify(data.value, null, 2) 
						: String(data.value))
					: '(no data)';
				
				console.log(`${index + 1}. Channel: ${data.typeId}`);
				console.log(`   Producers: ${data.producerCount} | Consumers: ${data.consumerCount}`);
				console.log(`   Has Data: ${hasValue ? '✅' : '❌'}`);
				if (hasValue) {
					console.log(`   Value:`);
					if (typeof data.value === 'object') {
						console.log(data.value);
					} else {
						console.log(`   ${valueStr}`);
					}
				}
				console.log('');
			});

			// Summary table
			console.table(allData.map(d => ({
				'Channel': d.typeId,
				'Producers': d.producerCount,
				'Consumers': d.consumerCount,
				'Has Data': d.value !== undefined ? '✅' : '❌',
				'Value Type': d.value !== undefined ? typeof d.value : 'undefined'
			})));

			// Detailed data
			console.log('\n📊 Detailed Channel Data:\n');
			allData.forEach((data) => {
				if (data.value !== undefined) {
					console.log(`\n${data.typeId}:`);
					console.log(data.value);
				}
			});
		}

		console.log('\n═══════════════════════════════════════════════════════════════\n');
	}

	function logCompleteState() {
		console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
		console.log('║  MapStore Debug: COMPLETE STATE                               ║');
		console.log('╚═══════════════════════════════════════════════════════════════╝\n');
		
		const typeInfo = mapStore.getTypeInfo();
		const consumers = mapStore.getAllConsumers();
		const producers = mapStore.getAllProducers();
		const data = mapStore.getAllData();

		console.log('📊 Summary:');
		console.log(`   Channels: ${typeInfo.length}`);
		console.log(`   Producers: ${producers.length}`);
		console.log(`   Consumers: ${consumers.length}`);
		console.log(`   Channels with data: ${data.filter(d => d.value !== undefined).length}`);
		console.log('');

		// Call all three logs
		logAllProducers();
		logAllConsumers();
		logAllData();
	}
</script>

<div class="rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 p-4 shadow-lg">
	<div class="mb-3 flex items-center gap-2">
		<span class="text-2xl">🐛</span>
		<h3 class="text-lg font-bold text-purple-900">MapStore Debug Panel</h3>
	</div>
	
	<p class="mb-4 text-sm text-purple-700">
		Inspect the state of the mapObjectStore (check browser console)
	</p>

	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		<!-- Log Consumers -->
		<button
			onclick={logAllConsumers}
			class="group flex flex-col items-center gap-2 rounded-lg border-2 border-blue-300 bg-white p-3 transition-all hover:border-blue-500 hover:bg-blue-50 hover:shadow-md active:scale-95"
		>
			<span class="text-3xl">📥</span>
			<span class="text-center text-sm font-semibold text-blue-900">
				Log Consumers
			</span>
			<span class="text-xs text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
				View all data listeners
			</span>
		</button>

		<!-- Log Producers -->
		<button
			onclick={logAllProducers}
			class="group flex flex-col items-center gap-2 rounded-lg border-2 border-green-300 bg-white p-3 transition-all hover:border-green-500 hover:bg-green-50 hover:shadow-md active:scale-95"
		>
			<span class="text-3xl">📤</span>
			<span class="text-center text-sm font-semibold text-green-900">
				Log Producers
			</span>
			<span class="text-xs text-green-600 opacity-0 transition-opacity group-hover:opacity-100">
				View all data publishers
			</span>
		</button>

		<!-- Log Data -->
		<button
			onclick={logAllData}
			class="group flex flex-col items-center gap-2 rounded-lg border-2 border-orange-300 bg-white p-3 transition-all hover:border-orange-500 hover:bg-orange-50 hover:shadow-md active:scale-95"
		>
			<span class="text-3xl">💾</span>
			<span class="text-center text-sm font-semibold text-orange-900">
				Log Data
			</span>
			<span class="text-xs text-orange-600 opacity-0 transition-opacity group-hover:opacity-100">
				View all stored values
			</span>
		</button>

		<!-- Log Complete State -->
		<button
			onclick={logCompleteState}
			class="group flex flex-col items-center gap-2 rounded-lg border-2 border-purple-300 bg-white p-3 transition-all hover:border-purple-500 hover:bg-purple-50 hover:shadow-md active:scale-95"
		>
			<span class="text-3xl">📊</span>
			<span class="text-center text-sm font-semibold text-purple-900">
				Log All
			</span>
			<span class="text-xs text-purple-600 opacity-0 transition-opacity group-hover:opacity-100">
				Complete state dump
			</span>
		</button>
	</div>

	<!-- Info Panel -->
	<div class="mt-4 rounded-lg bg-white/50 p-3">
		<p class="text-xs text-gray-700">
			<strong>💡 Tip:</strong> Open browser console (F12) before clicking buttons. 
			Results will be formatted with tables and colors for easy reading.
		</p>
	</div>
</div>

<style>
	button {
		cursor: pointer;
	}
</style>

