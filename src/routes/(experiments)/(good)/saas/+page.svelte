<script lang="ts">
    // Svelte 5 runes
    let capRate = $state(6.2);
    let vsLastQ = $state(+0.32);
    let healthScore = $state(92);
    let generating = $state(true);
    let pulse = $state(0);
  
    // simple pulse animation for the "Generating…" indicator
    $effect(() => {
      const t = setInterval(() => {
        pulse = (pulse + 1) % 3;
      }, 700);
      return () => clearInterval(t);
    });
  
    // toggle “Generating → Ready” after a few seconds (demo)
    $effect(() => {
      const t = setTimeout(() => (generating = false), 4200);
      return () => clearTimeout(t);
    });
  
    const chip = (text: string) =>
      `<span class="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80">${text}</span>`;
  </script>
  
  <!-- Page wrapper -->
  <div class="min-h-dvh w-full bg-[#0b1014] text-white relative overflow-hidden">
    <!-- faint starry specks -->
    <div class="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(79,255,132,.12)_1px,transparent_1px)] [background-size:18px_18px] opacity-20"></div>
    <!-- vignette/gradient glow -->
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(27,255,135,.15),transparent_60%)]"></div>
  
    <div class="mx-auto max-w-7xl px-4 pt-16 pb-24">
      <!-- Heading -->
      <h1 class="text-center text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
        AI-powered intelligence for
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-lime-300">
          modern CRE lenders
        </span>
      </h1>
  
      <!-- Grid of cards -->
      <div
        class="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr"
      >
        <!-- Portfolio Intelligence (2x wide) -->
        <section class="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-[0_0_0_1px_rgba(255,255,255,.04)_inset] p-6">
          <div class="flex items-start gap-3">
            <div class="rounded-xl bg-emerald-500/15 text-emerald-300 p-2">
              <!-- chart icon -->
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18"/><path d="M7 13l3-3 2 2 5-5"/></svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold">Portfolio Intelligence</h2>
              <p class="mt-1 text-sm text-white/70 max-w-2xl">
                Transform your completed deals into a queryable database for instant comparative analysis and insights.
              </p>
            </div>
          </div>
  
          <div class="mt-6 grid grid-cols-3 gap-3">
            <div class="rounded-xl bg-black/30 border border-white/10 p-4">
              <div class="text-[11px] uppercase tracking-wide text-white/60">Active Deals</div>
              <div class="mt-1 text-2xl font-semibold">70</div>
            </div>
            <div class="rounded-xl bg-black/30 border border-white/10 p-4">
              <div class="text-[11px] uppercase tracking-wide text-white/60">Total Volume</div>
              <div class="mt-1 text-2xl font-semibold">$350M</div>
            </div>
            <div class="rounded-xl bg-black/30 border border-white/10 p-4">
              <div class="text-[11px] uppercase tracking-wide text-white/60">Avg DSCR</div>
              <div class="mt-1 text-2xl font-semibold">1.35x</div>
            </div>
          </div>
        </section>
  
        <!-- Document Intelligence -->
        <section class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <div class="flex items-start gap-3">
            <div class="rounded-xl bg-emerald-500/15 text-emerald-300 p-2">
              <!-- file icon -->
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold">Document Intelligence</h2>
              <p class="mt-1 text-sm text-white/70">
                Automatically extract and structure data from appraisals, loan documents, and financial reports.
              </p>
            </div>
          </div>
          <div class="mt-6 rounded-xl bg-black/30 border border-white/10 p-4">
            <div class="text-[11px] uppercase tracking-wide text-white/60">Accuracy Rate</div>
            <div class="mt-1 text-2xl font-semibold">99%</div>
          </div>
        </section>
  
        <!-- Lightning Fast Processing -->
        <section class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <div class="flex items-start gap-3">
            <div class="rounded-xl bg-emerald-500/15 text-emerald-300 p-2">
              <!-- bolt -->
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold">Lightning Fast Processing</h2>
              <p class="mt-1 text-sm text-white/70">
                Reduce document processing time from hours to minutes with AI-powered automation.
              </p>
            </div>
          </div>
          <div class="mt-6 rounded-xl bg-black/30 border border-white/10 p-4">
            <div class="text-[11px] uppercase tracking-wide text-white/60">Time Saved</div>
            <div class="mt-1 text-2xl font-semibold">90%</div>
          </div>
        </section>
  
        <!-- Risk Assessment -->
        <section class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <div class="flex items-start gap-3">
            <div class="rounded-xl bg-emerald-500/15 text-emerald-300 p-2">
              <!-- shield -->
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold">Risk Assessment</h2>
              <p class="mt-1 text-sm text-white/70">
                AI-powered analysis to identify potential risks and opportunities across your portfolio.
              </p>
            </div>
          </div>
  
          <div class="mt-6">
            <div class="flex items-center justify-between text-[11px] text-white/60">
              <span>Portfolio Health Score</span>
              <span>{healthScore}/100</span>
            </div>
            <div class="mt-2 h-2 rounded-full bg-white/10">
              <div class="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-lime-400" style="width:{healthScore}%"></div>
            </div>
  
            <div class="mt-4 grid grid-cols-3 gap-3 text-center">
              <div class="rounded-xl bg-black/30 border border-white/10 p-3">
                <div class="text-[11px] text-white/60">Low Risk</div>
                <div class="mt-1 font-semibold">78%</div>
              </div>
              <div class="rounded-xl bg-black/30 border border-white/10 p-3">
                <div class="text-[11px] text-white/60">Medium</div>
                <div class="mt-1 font-semibold">18%</div>
              </div>
              <div class="rounded-xl bg-black/30 border border-white/10 p-3">
                <div class="text-[11px] text-white/60">High Risk</div>
                <div class="mt-1 font-semibold">4%</div>
              </div>
            </div>
          </div>
        </section>
  
        <!-- Market Intelligence -->
        <section class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <div class="flex items-start gap-3">
            <div class="rounded-xl bg-emerald-500/15 text-emerald-300 p-2">
              <!-- check list -->
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H7l-4 4V4a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold">Market Intelligence</h2>
              <p class="mt-1 text-sm text-white/70">
                Access real-time pricing trends, loan terms, and risk factors across markets and property types.
              </p>
            </div>
          </div>
  
          <div class="mt-6 rounded-xl bg-black/30 border border-white/10 p-4">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-[11px] uppercase tracking-wide text-white/60">Avg Cap Rate</div>
                <div class="mt-1 text-2xl font-semibold">{capRate}%</div>
              </div>
              <div class="text-emerald-300 text-sm">
                +{vsLastQ}% <span class="text-white/60 text-xs">vs last quarter</span>
              </div>
            </div>
          </div>
        </section>
  
        <!-- Automated Workflows -->
        <section class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <div class="flex items-start gap-3">
            <div class="rounded-xl bg-emerald-500/15 text-emerald-300 p-2">
              <!-- gear -->
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 2.7l.06.06c.46.46 1.12.6 1.82.33.69-.27 1.14-.92 1.14-1.66V1a2 2 0 1 1 4 0v.09c0 .74.45 1.39 1.14 1.66.7.27 1.36.13 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.46.46-.6 1.12-.33 1.82.27.69.92 1.14 1.66 1.14H23a2 2 0 1 1 0 4h-.09c-.74 0-1.39.45-1.66 1.14z"/></svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold">Automated Workflows</h2>
              <p class="mt-1 text-sm text-white/70">Streamline your lending process with intelligent automation that reduces manual tasks and accelerates deal closures.</p>
            </div>
          </div>
  
          <div class="mt-6 space-y-3">
            <!-- Row -->
            <div class="rounded-xl border border-white/10 bg-black/30 p-3">
              <div class="flex items-center justify-between">
                <div class="text-sm">Document extraction</div>
                <div class="text-emerald-300 text-xs">Complete</div>
              </div>
              <div class="mt-2 h-1.5 rounded bg-white/10">
                <div class="h-1.5 rounded bg-gradient-to-r from-emerald-400 to-lime-400 w-full"></div>
              </div>
            </div>
            <div class="rounded-xl border border-white/10 bg-black/30 p-3">
              <div class="flex items-center justify-between">
                <div class="text-sm">Data validation</div>
                <div class="text-emerald-300 text-xs">Complete</div>
              </div>
              <div class="mt-2 h-1.5 rounded bg-white/10">
                <div class="h-1.5 rounded bg-gradient-to-r from-emerald-400 to-lime-400 w-full"></div>
              </div>
            </div>
          </div>
        </section>
  
        <!-- Intelligent Document Generation (2x wide) -->
        <section class="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <div class="flex items-start gap-3">
            <div class="rounded-xl bg-emerald-500/15 text-emerald-300 p-2">
              <!-- doc edit -->
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13l-5 5l-2 1l1-2l5-5z"/></svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold">Intelligent Document Generation</h2>
              <p class="mt-1 text-sm text-white/70">
                Generate professional loan memos, executive summaries, and compliance documentation with one click using AI-powered templates.
              </p>
            </div>
          </div>
  
          <div class="mt-6 grid sm:grid-cols-2 gap-3">
            <div class="rounded-xl border border-white/10 bg-black/30 p-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm">Loan Memo</div>
                  <div class="text-xs text-white/60">12 pages</div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
                  <span class="text-emerald-300 text-sm">Ready</span>
                </div>
              </div>
            </div>
  
            <div class="rounded-xl border border-white/10 bg-black/30 p-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm">Executive Summary</div>
                  <div class="text-xs text-white/60">3 pages</div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="h-2 w-2 rounded-full {generating ? 'bg-yellow-300' : 'bg-emerald-400'}"></span>
                  <span class="text-sm {generating ? 'text-yellow-300' : 'text-emerald-300'}">
                    {generating ? `Generating${'.'.repeat(pulse + 1)}` : 'Ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
  
  <style>
    /* optional: smoother card edges and inner lines */
  </style>
  