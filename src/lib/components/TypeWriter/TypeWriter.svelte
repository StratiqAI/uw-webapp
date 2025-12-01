<script lang="ts">
  import { browser } from '$app/environment';

  // Props (Svelte 5 runes)
  let {
    text,
    /** base delay per character in ms */
    speed = 28,
    /** additional pause after punctuation (ms) */
    pausePunctuationMs = 220,
    /** start delay before typing begins (ms) */
    startDelay = 0,
    /** random timing jitter (0..1), e.g. 0.25 = ±25% */
    jitter = 0.25,
    /** restart after finishing */
    loop = false,
    /** show blinking caret: 'bar' | 'block' | 'underscore' | false */
    cursor: cursorStyle = 'bar',
    /** autoplay when mounted / when text changes */
    autoplay = true,
    /** render all text instantly (or if user prefers reduced motion) */
    instant = false,
    /** click to skip the animation */
    skipOnClick = true,
    /** optional callback when typing completes */
    onDone = undefined as undefined | (() => void),
    /** dark mode styling */
    darkMode = false
  } = $props<{
    text: string;
    speed?: number;
    pausePunctuationMs?: number;
    startDelay?: number;
    jitter?: number;
    loop?: boolean;
    cursor?: 'bar' | 'block' | 'underscore' | false;
    autoplay?: boolean;
    instant?: boolean;
    skipOnClick?: boolean;
    onDone?: () => void;
    darkMode?: boolean;
  }>();

  // ---- state (runes) ----
  let output = $state('');
  let index = $state(0);
  let isTyping = $state(false);
  let hasStarted = $state(false);

  // used to cancel an in-flight run when inputs change/unmount
  let runToken = 0;

  const pauses: Record<string, number> = {
    ',': pausePunctuationMs,
    '.': pausePunctuationMs + 150,
    '?': pausePunctuationMs + 150,
    '!': pausePunctuationMs + 150,
    ':': pausePunctuationMs - 60,
    ';': pausePunctuationMs - 60
  };

  const reducedMotion = $derived(
    browser && matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  );

  const done = $derived(index >= (text?.length ?? 0));

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function charDelay(ch: string) {
    // base delay with a bit of human-like jitter; whitespace types faster
    const base = speed * (/\s/.test(ch) ? 0.5 : 1);
    const extra = pauses[ch] ?? 0;
    const j = 1 + (Math.random() * 2 - 1) * Math.max(0, Math.min(1, jitter));
    return Math.max(1, Math.round((base + extra) * j));
  }

  async function run(current: number) {
    // instant if requested or user prefers reduced motion
    if (instant || reducedMotion) {
      output = text ?? '';
      index = output.length;
      isTyping = false;
      onDone?.();
      return;
    }

    isTyping = true;
    output = '';
    index = 0;

    if (startDelay > 0) {
      await sleep(startDelay);
      if (current !== runToken) return;
    }

    while (index < text.length && current === runToken) {
      const ch = text[index];
      output += ch;
      index += 1;
      await sleep(charDelay(ch));
    }

    if (current !== runToken) return;

    isTyping = false;
    onDone?.();

    if (loop) {
      await sleep(800);
      if (current !== runToken) return;
      ++runToken;
      run(runToken);
    }
  }

  // Re-run typing when important inputs change
  $effect(() => {
    if (!browser) return;
    if (!autoplay) return;
    if (!text) return;
    if (hasStarted) return; // Prevent infinite loops

    hasStarted = true;
    ++runToken;
    run(runToken);
  });

  // Public controls (optional)
  export function play() {
    hasStarted = true;
    ++runToken;
    run(runToken);
  }
  export function pause() {
    // pauses by cancelling the run; state remains where it is
    ++runToken;
    isTyping = false;
  }
  export function skip() {
    hasStarted = true;
    ++runToken;
    output = text ?? '';
    index = output.length;
    isTyping = false;
    onDone?.();
  }

  function handleClick() {
    if (skipOnClick && isTyping) skip();
  }
</script>

<!-- Accessible live region so screen readers announce updates politely -->
<span class="ai-writer {darkMode ? 'text-slate-200' : 'text-slate-700'}" aria-live="polite" role="status" on:click={handleClick}>
  {output}
  {#if cursorStyle && !done}
    <span class="cursor {cursorStyle}" aria-hidden="true"></span>
  {/if}
</span>

<style>
  .ai-writer {
    white-space: pre-wrap;
    font-variant-ligatures: none; /* avoids weird caret jumps with ligatures */
    cursor: text;
  }

  @keyframes blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  .cursor {
    display: inline-block;
    margin-left: 1px;
    background: currentColor;
    animation: blink 1s steps(1, end) infinite;
  }

  .cursor.bar {
    width: 1px;
    height: 1em;
    transform: translateY(0.1em);
  }
  .cursor.block {
    width: 0.6ch;
    height: 1em;
  }
  .cursor.underscore {
    width: 0.6ch;
    height: 2px;
    transform: translateY(0.3em);
  }
</style>
