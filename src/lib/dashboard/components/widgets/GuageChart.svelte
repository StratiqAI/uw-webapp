<script>
    export let value = 50; // Value between 0 and 100
    export let size = 150; // Diameter of the gauge
    export let strokeWidth = 15;
    export let color = '#3b82f6'; // Tailwind blue-500
  
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (value / 100) * circumference;
  </script>
  
  <svg
    width={size}
    height={size / 2}
    viewBox={`0 0 ${size} ${size / 2}`}
    class="block"
  >
    <!-- Background circle -->
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="transparent"
      stroke="#e5e7eb"
      stroke-width={strokeWidth}
      stroke-dasharray={circumference}
      stroke-dashoffset="0"
      stroke-linecap="round"
      transform={`rotate(-90 ${size / 2} ${size / 2})`}
    />
  
    <!-- Value arc -->
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="transparent"
      stroke={color}
      stroke-width={strokeWidth}
      stroke-dasharray={circumference}
      stroke-dashoffset={dashOffset}
      stroke-linecap="round"
      transform={`rotate(-90 ${size / 2} ${size / 2})`}
    />
  
    <!-- Value Text -->
    <text
      x="50%"
      y="90%"
      dominant-baseline="middle"
      text-anchor="middle"
      font-size="1.25rem"
      fill="#111827"
      font-weight="bold"
    >
      {value}%
    </text>
  </svg>
  