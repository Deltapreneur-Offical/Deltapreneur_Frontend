import { useCurrency } from '../../context/CurrencyContext';
import { CURRENCY_LABELS } from '../../constants/currencies';
import SearchableCurrencySelect from './SearchableCurrencySelect';

/**
 * Price input with currency selector — reuses navbar supported currencies.
 */
export default function CurrencyPriceInput({
  label = 'Asking Price',
  value,
  onChange,
  currency,
  onCurrencyChange,
  required = false,
  placeholder = 'e.g. 50000',
  inputClassName = 'px-3 py-2 border border-gray-300 rounded-[8px] text-gray-800 bg-white outline-none focus:border-purple-500 transition-all w-full min-w-0 flex-1 placeholder:text-gray-400',
  labelClassName = 'text-sm font-medium text-gray-700',
  selectClassName,
  id,
}) {
  const { supportedCurrencies } = useCurrency();
  const selectCls =
    selectClassName ||
    'shrink-0 w-[7.25rem] px-2.5 py-2 border border-gray-300 rounded-[8px] text-gray-800 bg-white text-sm outline-none focus:border-purple-500 transition-all cursor-pointer';

  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClassName} htmlFor={id}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <div className="flex gap-2 items-stretch">
        <SearchableCurrencySelect
          className={selectCls}
          wrapperClassName="shrink-0 w-[7.25rem]"
          value={currency}
          onChange={onCurrencyChange}
          showFlag={false}
        />
        <input
          id={id}
          className={inputClassName}
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          aria-label={label}
        />
      </div>
    </div>
  );
}
