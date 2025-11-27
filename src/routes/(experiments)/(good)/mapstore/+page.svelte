<!-- App.svelte -->
<script lang="ts">
  import ComponentA from '$lib/components/mapStore/componentA.svelte';
  import ComponentB from '$lib/components/mapStore/componentB.svelte';
  import ComponentC from '$lib/components/mapStore/componentC.svelte';
  import { mapStore } from '$lib/stores/mapStore';
  
  // Initialize with some data
  mapStore.setKey('colors', ['red', 'blue']);
  mapStore.setKey('animals', ['cat', 'dog']);
</script>

<main>
  <h1>Map Store Demo</h1>
  
  <div class="info">
    <p>Each component subscribes to different keys in the map.</p>
    <p>Component A only re-renders when "fruits" changes.</p>
    <p>Component B only re-renders when "colors" changes.</p>
    <p>Component C can monitor any key dynamically.</p>
  </div>
  
  <div class="grid">
    <ComponentA />
    <ComponentB />
    <ComponentC />
  </div>
</main>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
  }
  
  .info {
    padding: 1rem;
    background: #e8f5e9;
    border-radius: 8px;
    margin: 1rem 0;
  }
</style>