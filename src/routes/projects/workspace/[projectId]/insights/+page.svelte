<!-- +page.svelte -->
<script>
    import { project as projectStore } from '$lib/stores/appStateStore.js';
    
    let { data } = $props();
    // Use reactive project store instead of static data
    let project = $derived($projectStore);
  </script>
  
  {project?.name}