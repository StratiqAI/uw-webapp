<script lang="ts">
    import type { BarChartWidget } from '$lib/dashboard/types/widget';
    import { mapStore } from '$lib/stores/mapObjectStore';
    
    interface Props {
      data: BarChartWidget['data'];
      darkMode?: boolean;
    }
    
    let { data, darkMode = false }: Props = $props();
    let widgetData = $state(data);
    
    let consumer = mapStore.registerConsumer<BarChartWidget['data']>(
      'barchart-content',
      'barchart-widget'
    );
    
    console.log(`📊 BarChartWidget: Initialized`);
    console.log('   Subscribing to content updates...\n');
    
    // Subscribe to content updates
    consumer.subscribe((data) => {
      if (data) {
        widgetData = data;
        console.log('BarChart content updated:', data);
      }
    });
    
    // Note: You'll need to integrate with a charting library like Chart.js
    // This is a placeholder implementation
  </script>
  
  <div class="bar-chart-widget h-full flex items-center justify-center {darkMode ? 'bg-slate-800' : 'bg-slate-50'} rounded">
    <div class="text-center">
      <p class="{darkMode ? 'text-slate-300' : 'text-slate-600'} mb-2">Bar Chart ({widgetData.orientation || 'vertical'})</p>
      <p class="text-sm {darkMode ? 'text-slate-400' : 'text-slate-500'}">
        {widgetData.datasets.length} dataset(s) with {widgetData.labels.length} bars
      </p>
      <!-- Integrate Chart.js or similar library here -->
    </div>
  </div>