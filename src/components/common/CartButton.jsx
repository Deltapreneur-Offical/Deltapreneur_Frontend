import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

export default function CartButton() {
  const { count } = useCart();

  return (
    <Link
      to="/cart"
      data-cart-icon
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
      title="Shopping Cart"
      aria-label={count > 0 ? `Shopping cart, ${count} items` : 'Shopping cart'}
    >
      <ShoppingCart size={20} strokeWidth={1.75} />
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-b from-red-400 to-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_0_1.5px_#fff,0_1px_3px_rgba(239,68,68,0.35)]"
          aria-hidden="true"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
