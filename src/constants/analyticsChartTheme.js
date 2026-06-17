/** Soft pastel palette for platform analytics charts */
export const ANALYTICS_CHART = {
  primary: '#7EA6FF',
  secondary: '#E6EEFF',
  mint: '#B8E3DD',
  lavender: '#D8CCFF',
  barLight: '#AFC8FF',
  line: '#7EA6FF',
  grid: '#F1F5F9',
  axis: '#94A3B8',
  axisBar: '#64748B',
  border: '#E5E7EB',
  textSecondary: '#64748B',
  textPrimary: '#111827',
  progressFill: '#AFC8FF',
  progressEmpty: '#E6EEFF',
  iconBg: '#E6EEFF',
  iconColor: '#7EA6FF',
  tabActiveBg: '#E6EEFF',
  tabActiveText: '#475569',
  rankBg: '#F8FAFC',
  rankText: '#64748B',
  link: '#7EA6FF',
};

/** Two-segment donuts: primary + very light blue (e.g. Complete / Remaining) */
export const PIE_BINARY_COLORS = ['#7EA6FF', '#E6EEFF'];

/** Multi-segment donuts: soft distinguishable pastels (e.g. industry breakdown) */
export const PIE_MULTI_COLORS = ['#7EA6FF', '#B8E3DD', '#D8CCFF', '#AFC8FF'];

/** Bar chart: cycling pastel bars */
export const BAR_CHART_COLORS = ['#AFC8FF', '#B8E3DD', '#D8CCFF'];

export function getPieChartColor(index, segmentCount) {
  if (segmentCount === 2) {
    return PIE_BINARY_COLORS[index] ?? PIE_BINARY_COLORS[PIE_BINARY_COLORS.length - 1];
  }
  return PIE_MULTI_COLORS[index % PIE_MULTI_COLORS.length];
}
