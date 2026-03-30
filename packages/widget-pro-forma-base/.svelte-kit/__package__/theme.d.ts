export interface ProFormaTheme {
    shell: string;
    muted: string;
    headerBg: string;
    headerText: string;
    sectionHeaderBg: string;
    sectionHeaderText: string;
    subtotalBg: string;
    subtotalText: string;
    cellBorder: string;
    cellText: string;
    labelText: string;
    summaryBorder: string;
    cfgLabel: string;
    cfgField: string;
    cfgPanel: string;
    cfgBtnSecondary: string;
    cfgTitle: string;
    flipBackBg: string;
}
/**
 * Compute all theme classes for a pro forma widget from a single darkMode flag.
 * Pure function — call inside a `$derived` to make it reactive.
 */
export declare function proFormaTheme(darkMode: boolean): ProFormaTheme;
