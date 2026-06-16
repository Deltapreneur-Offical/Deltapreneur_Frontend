import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

export default function PayoutSettingsButton({ className = 'btn-glow btn-glow-sm', label = 'Payout Settings' }) {
  return (
    <Link to="/settings/payouts" className={`inline-flex items-center gap-1.5 md:gap-2 ${className}`}>
      <CreditCard size={16} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
