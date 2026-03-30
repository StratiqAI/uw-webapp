/**
 * Compute all theme classes for a pro forma widget from a single darkMode flag.
 * Pure function — call inside a `$derived` to make it reactive.
 */
export function proFormaTheme(darkMode) {
    const muted = darkMode ? 'text-slate-400' : 'text-slate-500';
    return {
        shell: darkMode
            ? 'bg-slate-900 text-slate-100 border-slate-700'
            : 'bg-white text-slate-900 border-slate-200',
        muted,
        headerBg: 'bg-[#1a365d]',
        headerText: 'text-white',
        sectionHeaderBg: darkMode ? 'bg-slate-800' : 'bg-slate-100',
        sectionHeaderText: darkMode ? 'text-white font-bold' : 'text-[#1a365d] font-bold',
        subtotalBg: darkMode ? 'bg-slate-800/60' : 'bg-slate-50',
        subtotalText: darkMode ? 'text-slate-100 font-semibold' : 'text-[#1a365d] font-semibold',
        cellBorder: darkMode ? 'border-slate-700' : 'border-slate-200',
        cellText: darkMode ? 'text-slate-300' : 'text-slate-700',
        labelText: darkMode ? 'text-slate-300' : 'text-slate-600',
        summaryBorder: darkMode ? 'border-slate-700' : 'border-slate-200',
        cfgLabel: `block text-xs font-medium ${muted}`,
        cfgField: darkMode
            ? 'mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100'
            : 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm',
        cfgPanel: darkMode
            ? 'rounded-xl border border-slate-600 bg-slate-900/90 p-4 shadow-sm'
            : 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
        cfgBtnSecondary: darkMode
            ? 'rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800'
            : 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100',
        cfgTitle: darkMode ? 'text-slate-100' : 'text-slate-900',
        flipBackBg: darkMode ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50'
    };
}
