const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
];

function twoDigits(num) {
  if (num < 20) return ONES[num];
  const t = Math.floor(num / 10);
  const o = num % 10;
  return o === 0 ? TENS[t] : `${TENS[t]}-${ONES[o]}`;
}

function belowThousand(num) {
  const h = Math.floor(num / 100);
  const rest = num % 100;
  const parts = [];
  if (h > 0) parts.push(`${ONES[h]} hundred`);
  if (rest > 0) parts.push(twoDigits(rest));
  return parts.join(' ');
}

/**
 * Indian-format amount in words (crore / lakh / thousand / hundred).
 *
 * Examples:
 *   amountInWordsInr(4000000) -> "forty lakh"
 *   amountInWordsInr(4000006) -> "forty lakh six"
 *   amountInWordsInr(2500000) -> "twenty-five lakh"
 *   amountInWordsInr(2525250) -> "twenty-five lakh twenty-five thousand two hundred fifty"
 */
export default function amountInWordsInr(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return '';
  if (n === 0) return 'zero';

  const parts = [];

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const below = n % 1000;

  if (crore > 0) parts.push(`${belowThousand(crore)} crore`);
  if (lakh > 0) parts.push(`${belowThousand(lakh)} lakh`);
  if (thousand > 0) parts.push(`${belowThousand(thousand)} thousand`);
  if (below > 0) parts.push(belowThousand(below));

  return parts.join(' ');
}
