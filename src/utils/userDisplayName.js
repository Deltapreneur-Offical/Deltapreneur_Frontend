/** Resolve the label shown in dashboard hero and app header profile. */
export function resolveUserDisplayName(user) {
  const raw =
    user?.firstname ||
    user?.firstName ||
    user?.name ||
    user?.username ||
    user?.email?.split('@')[0] ||
    'User';
  const trimmed = String(raw).trim();
  if (!trimmed) return 'User';
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
