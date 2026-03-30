/**
 * A single year's worth of projected line-item values.
 * Both revenue and expense widgets produce arrays of these.
 */
export interface YearColumn {
    year: number;
    [lineItem: string]: number;
}
/**
 * Describes one row in a pro forma table.
 */
export interface ProFormaRow {
    key: string;
    label: string;
    indent?: boolean;
    isSubtotal?: boolean;
    isDeduction?: boolean;
    values: number[];
}
