<script lang="ts">
    import type { LineChartWidget } from '$lib/dashboard/types/widget';
    import { mapStore } from '$lib/stores/mapObjectStore';
    
    interface Props {
      data: LineChartWidget['data'];
      darkMode?: boolean;
    }
    
    let { data, darkMode = false }: Props = $props();
    let widgetData = $state(data);
    
    let consumer = mapStore.registerConsumer<LineChartWidget['data']>(
      'linechart-content',
      'linechart-widget'
    );
    
    console.log(`📈 LineChartWidget: Initialized`);
    console.log('   Subscribing to content updates...\n');
    
    // Subscribe to content updates
    consumer.subscribe((data) => {
      if (data) {
        widgetData = data;
        console.log('LineChart content updated:', data);
      }
    });
    
    // Note: You'll need to integrate with a charting library like Chart.js
    // This is a placeholder implementation
  </script>
  
  <div class="line-chart-widget h-full flex items-center justify-center {darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded">
    <div class="text-center">
      <p class="{darkMode ? 'text-slate-300' : 'text-slate-600'} mb-2">Line Chart</p>
      <p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
        {widgetData.datasets.length} dataset(s) with {widgetData.labels.length} points
      </p>
      <!-- Integrate Chart.js or similar library here -->
    </div>
  </div>