import priceSectionV from '../../assets/pricesectionV.png';
import '../../styles/price-section-icon.css';

export default function PriceSectionIcon({ className = '' }) {
  return (
    <img
      src={priceSectionV}
      alt=""
      className={['price-section-v-icon', className].filter(Boolean).join(' ')}
      draggable="false"
      aria-hidden="true"
    />
  );
}
