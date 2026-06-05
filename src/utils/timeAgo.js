/**
 * Relative time string using i18next (pass t from useTranslation).
 */
export function formatTimeAgo(dateStr, t) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return t('timeJustNow');
  if (diff < 3600) return t('timeMinutesAgo', { count: Math.floor(diff / 60) });
  if (diff < 86400) return t('timeHoursAgo', { count: Math.floor(diff / 3600) });
  return t('timeDaysAgo', { count: Math.floor(diff / 86400) });
}
