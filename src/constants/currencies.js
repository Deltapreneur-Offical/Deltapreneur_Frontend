/** Navbar currency dropdown pin order. Display-only — do not reorder SUPPORTED_CURRENCIES. */
export const NAVBAR_PINNED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];

export function orderNavbarCurrencies(codes) {
  const list = Array.isArray(codes) ? codes : [];
  const seen = new Set();
  const pinned = [];
  for (const code of NAVBAR_PINNED_CURRENCIES) {
    if (list.includes(code) && !seen.has(code)) {
      pinned.push(code);
      seen.add(code);
    }
  }
  const rest = list.filter((code) => !seen.has(code));
  return [...pinned, ...rest];
}

/** Checkout + navbar supported currencies (must match backend). */
export const SUPPORTED_CURRENCIES = [
  'AED', 'ALL', 'AMD', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL', 'BSD', 'BTN', 'BWP', 'BZD', 'CAD', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ETB', 'EUR', 'FJD', 'GBP', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LKR', 'LRD', 'LSL', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SCR', 'SEK', 'SGD', 'SLL', 'SOS', 'SZL', 'THB', 'TND', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VND', 'VUV', 'XAF', 'XCD', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW'
];

/** Shared with TopNavbar and listing price fields */
export const CURRENCY_LABELS = {
  "AED": "United Arab Emirates Dirham",
  "ALL": "Albanian lek",
  "AMD": "Armenian dram",
  "AUD": "Australian dollar",
  "AWG": "Aruban florin",
  "AZN": "Azerbaijan Manat",
  "BAM": "Convertible Mark",
  "BBD": "Barbadian dollar",
  "BDT": "Bangladeshi taka",
  "BGN": "Bulgarian Lev",
  "BHD": "Bahraini Dinar",
  "BIF": "Burundi Franc",
  "BMD": "Bermudian dollar",
  "BND": "Brunei dollar",
  "BOB": "Bolivian boliviano",
  "BRL": "Brazilian Real",
  "BSD": "Bahamian dollar",
  "BTN": "Bhutanese Ngultrum",
  "BWP": "Botswana pula",
  "BZD": "Belize dollar",
  "CAD": "Canadian dollar",
  "CHF": "Swiss franc",
  "CLP": "Chilean Peso",
  "CNY": "Chinese yuan renminbi",
  "COP": "Colombian peso",
  "CRC": "Costa Rican colon",
  "CUP": "Cuban peso",
  "CVE": "Cabo Verde Escudo",
  "CZK": "Czech koruna",
  "DJF": "Djibouti Franc",
  "DKK": "Danish krone",
  "DOP": "Dominican peso",
  "DZD": "Algerian dinar",
  "EGP": "Egyptian pound",
  "ETB": "Ethiopian birr",
  "EUR": "European euro",
  "FJD": "Fijian dollar",
  "GBP": "Pound sterling",
  "GHS": "Ghanian Cedi",
  "GIP": "Gibraltar pound",
  "GMD": "Gambian dalasi",
  "GNF": "Guinean Franc",
  "GTQ": "Guatemalan quetzal",
  "GYD": "Guyanese dollar",
  "HKD": "Hong Kong dollar",
  "HNL": "Honduran lempira",
  "HRK": "Croatian kuna",
  "HTG": "Haitian gourde",
  "HUF": "Hungarian forint",
  "IDR": "Indonesian rupiah",
  "ILS": "Israeli new shekel",
  "INR": "Indian rupee",
  "IQD": "Iraqi Dinar",
  "ISK": "Iceland Krona",
  "JMD": "Jamaican dollar",
  "JOD": "Jordanian Dinar",
  "JPY": "Japanese Yen",
  "KES": "Kenyan shilling",
  "KGS": "Kyrgyzstani som",
  "KHR": "Cambodian riel",
  "KMF": "Comorian Franc",
  "KRW": "Korean Won",
  "KWD": "Kuwaiti Dinar",
  "KYD": "Cayman Islands dollar",
  "KZT": "Kazakhstani tenge",
  "LAK": "Lao kip",
  "LKR": "Sri Lankan rupee",
  "LRD": "Liberian dollar",
  "LSL": "Lesotho loti",
  "MAD": "Moroccan dirham",
  "MDL": "Moldovan leu",
  "MGA": "Malagasy Ariary",
  "MKD": "Macedonian denar",
  "MMK": "Myanmar kyat",
  "MNT": "Mongolian tugrik",
  "MOP": "Macanese pataca",
  "MUR": "Mauritian rupee",
  "MVR": "Maldivian rufiyaa",
  "MWK": "Malawian kwacha",
  "MXN": "Mexican peso",
  "MYR": "Malaysian ringgit",
  "MZN": "Mozambique Metical",
  "NAD": "Namibian dollar",
  "NGN": "Nigerian naira",
  "NIO": "Nicaraguan cordoba",
  "NOK": "Norwegian krone",
  "NPR": "Nepalese rupee",
  "NZD": "New Zealand dollar",
  "OMR": "Rial Omani",
  "PEN": "Peruvian sol",
  "PGK": "Papua New Guinean kina",
  "PHP": "Philippine peso",
  "PKR": "Pakistani rupee",
  "PLN": "Polish Zloty",
  "PYG": "Paraguayan Guarani",
  "QAR": "Qatari riyal",
  "RON": "Romanian Leu",
  "RSD": "Serbian Dinar",
  "RUB": "Russian ruble",
  "RWF": "Rwanda Franc",
  "SAR": "Saudi Arabian riyal",
  "SCR": "Seychellois rupee",
  "SEK": "Swedish krona",
  "SGD": "Singapore dollar",
  "SLL": "Sierra Leonean leone",
  "SOS": "Somali shilling",
  "SVC": "Salvadoran col\u00f3n",
  "SZL": "Swazi lilangeni",
  "THB": "Thai baht",
  "TND": "Tunisian Dinar",
  "TRY": "Turkish Lira",
  "TTD": "Trinidad and Tobago dollar",
  "TWD": "New Taiwan Dollar",
  "TZS": "Tanzanian shilling",
  "UAH": "Ukrainian Hryvnia",
  "UGX": "Uganda Shilling",
  "USD": "United States dollar",
  "UYU": "Uruguayan peso",
  "UZS": "Uzbekistani so'm",
  "VND": "Vietnamese Dong",
  "VUV": "Vatu",
  "XAF": "CFA Franc BEAC",
  "XCD": "East Caribbean Dollar",
  "XOF": "CFA Franc BCEAO",
  "XPF": "CFP Franc",
  "YER": "Yemeni rial",
  "ZAR": "South African rand",
  "ZMW": "Zambian Kwacha"
};

export const DEFAULT_LISTING_CURRENCY = 'INR';

/**
 * Display formatting per currency (locale + symbol rules).
 * Add new currencies here only — business logic stays unchanged.
 */
export const CURRENCY_FORMAT = {
  "AED": {
    "locale": "en-US",
    "symbol": "AED",
    "prefixWithCode": true,
    "code": "AED"
  },
  "ALL": {
    "locale": "en-US",
    "symbol": "ALL",
    "prefixWithCode": true,
    "code": "ALL"
  },
  "AMD": {
    "locale": "en-US",
    "symbol": "AMD",
    "prefixWithCode": true,
    "code": "AMD"
  },
  "AUD": {
    "locale": "en-US",
    "symbol": "A$",
    "prefixWithCode": false
  },
  "AWG": {
    "locale": "en-US",
    "symbol": "AWG",
    "prefixWithCode": true,
    "code": "AWG"
  },
  "AZN": {
    "locale": "en-US",
    "symbol": "AZN",
    "prefixWithCode": true,
    "code": "AZN"
  },
  "BAM": {
    "locale": "en-US",
    "symbol": "BAM",
    "prefixWithCode": true,
    "code": "BAM"
  },
  "BBD": {
    "locale": "en-US",
    "symbol": "BBD",
    "prefixWithCode": true,
    "code": "BBD"
  },
  "BDT": {
    "locale": "en-US",
    "symbol": "BDT",
    "prefixWithCode": true,
    "code": "BDT"
  },
  "BGN": {
    "locale": "en-US",
    "symbol": "BGN",
    "prefixWithCode": true,
    "code": "BGN"
  },
  "BHD": {
    "locale": "en-US",
    "symbol": "BHD",
    "prefixWithCode": true,
    "code": "BHD"
  },
  "BIF": {
    "locale": "en-US",
    "symbol": "BIF",
    "prefixWithCode": true,
    "code": "BIF"
  },
  "BMD": {
    "locale": "en-US",
    "symbol": "BMD",
    "prefixWithCode": true,
    "code": "BMD"
  },
  "BND": {
    "locale": "en-US",
    "symbol": "BND",
    "prefixWithCode": true,
    "code": "BND"
  },
  "BOB": {
    "locale": "en-US",
    "symbol": "BOB",
    "prefixWithCode": true,
    "code": "BOB"
  },
  "BRL": {
    "locale": "en-US",
    "symbol": "BRL",
    "prefixWithCode": true,
    "code": "BRL"
  },
  "BSD": {
    "locale": "en-US",
    "symbol": "BSD",
    "prefixWithCode": true,
    "code": "BSD"
  },
  "BTN": {
    "locale": "en-US",
    "symbol": "BTN",
    "prefixWithCode": true,
    "code": "BTN"
  },
  "BWP": {
    "locale": "en-US",
    "symbol": "BWP",
    "prefixWithCode": true,
    "code": "BWP"
  },
  "BZD": {
    "locale": "en-US",
    "symbol": "BZD",
    "prefixWithCode": true,
    "code": "BZD"
  },
  "CAD": {
    "locale": "en-US",
    "symbol": "C$",
    "prefixWithCode": false
  },
  "CHF": {
    "locale": "en-US",
    "symbol": "CHF",
    "prefixWithCode": true,
    "code": "CHF"
  },
  "CLP": {
    "locale": "en-US",
    "symbol": "CLP",
    "prefixWithCode": true,
    "code": "CLP"
  },
  "CNY": {
    "locale": "en-US",
    "symbol": "\u00a5",
    "prefixWithCode": false
  },
  "COP": {
    "locale": "en-US",
    "symbol": "COP",
    "prefixWithCode": true,
    "code": "COP"
  },
  "CRC": {
    "locale": "en-US",
    "symbol": "CRC",
    "prefixWithCode": true,
    "code": "CRC"
  },
  "CUP": {
    "locale": "en-US",
    "symbol": "CUP",
    "prefixWithCode": true,
    "code": "CUP"
  },
  "CVE": {
    "locale": "en-US",
    "symbol": "CVE",
    "prefixWithCode": true,
    "code": "CVE"
  },
  "CZK": {
    "locale": "en-US",
    "symbol": "CZK",
    "prefixWithCode": true,
    "code": "CZK"
  },
  "DJF": {
    "locale": "en-US",
    "symbol": "DJF",
    "prefixWithCode": true,
    "code": "DJF"
  },
  "DKK": {
    "locale": "en-US",
    "symbol": "DKK",
    "prefixWithCode": true,
    "code": "DKK"
  },
  "DOP": {
    "locale": "en-US",
    "symbol": "DOP",
    "prefixWithCode": true,
    "code": "DOP"
  },
  "DZD": {
    "locale": "en-US",
    "symbol": "DZD",
    "prefixWithCode": true,
    "code": "DZD"
  },
  "EGP": {
    "locale": "en-US",
    "symbol": "EGP",
    "prefixWithCode": true,
    "code": "EGP"
  },
  "ETB": {
    "locale": "en-US",
    "symbol": "ETB",
    "prefixWithCode": true,
    "code": "ETB"
  },
  "EUR": {
    "locale": "en-US",
    "symbol": "\u20ac",
    "prefixWithCode": false
  },
  "FJD": {
    "locale": "en-US",
    "symbol": "FJD",
    "prefixWithCode": true,
    "code": "FJD"
  },
  "GBP": {
    "locale": "en-US",
    "symbol": "\u00a3",
    "prefixWithCode": false
  },
  "GHS": {
    "locale": "en-US",
    "symbol": "GHS",
    "prefixWithCode": true,
    "code": "GHS"
  },
  "GIP": {
    "locale": "en-US",
    "symbol": "GIP",
    "prefixWithCode": true,
    "code": "GIP"
  },
  "GMD": {
    "locale": "en-US",
    "symbol": "GMD",
    "prefixWithCode": true,
    "code": "GMD"
  },
  "GNF": {
    "locale": "en-US",
    "symbol": "GNF",
    "prefixWithCode": true,
    "code": "GNF"
  },
  "GTQ": {
    "locale": "en-US",
    "symbol": "GTQ",
    "prefixWithCode": true,
    "code": "GTQ"
  },
  "GYD": {
    "locale": "en-US",
    "symbol": "GYD",
    "prefixWithCode": true,
    "code": "GYD"
  },
  "HKD": {
    "locale": "en-US",
    "symbol": "HKD",
    "prefixWithCode": true,
    "code": "HKD"
  },
  "HNL": {
    "locale": "en-US",
    "symbol": "HNL",
    "prefixWithCode": true,
    "code": "HNL"
  },
  "HRK": {
    "locale": "en-US",
    "symbol": "HRK",
    "prefixWithCode": true,
    "code": "HRK"
  },
  "HTG": {
    "locale": "en-US",
    "symbol": "HTG",
    "prefixWithCode": true,
    "code": "HTG"
  },
  "HUF": {
    "locale": "en-US",
    "symbol": "HUF",
    "prefixWithCode": true,
    "code": "HUF"
  },
  "IDR": {
    "locale": "en-US",
    "symbol": "IDR",
    "prefixWithCode": true,
    "code": "IDR"
  },
  "ILS": {
    "locale": "en-US",
    "symbol": "ILS",
    "prefixWithCode": true,
    "code": "ILS"
  },
  "INR": {
    "locale": "en-US",
    "symbol": "\u20b9",
    "prefixWithCode": false
  },
  "IQD": {
    "locale": "en-US",
    "symbol": "IQD",
    "prefixWithCode": true,
    "code": "IQD"
  },
  "ISK": {
    "locale": "en-US",
    "symbol": "ISK",
    "prefixWithCode": true,
    "code": "ISK"
  },
  "JMD": {
    "locale": "en-US",
    "symbol": "JMD",
    "prefixWithCode": true,
    "code": "JMD"
  },
  "JOD": {
    "locale": "en-US",
    "symbol": "JOD",
    "prefixWithCode": true,
    "code": "JOD"
  },
  "JPY": {
    "locale": "en-US",
    "symbol": "\u00a5",
    "prefixWithCode": false
  },
  "KES": {
    "locale": "en-US",
    "symbol": "KES",
    "prefixWithCode": true,
    "code": "KES"
  },
  "KGS": {
    "locale": "en-US",
    "symbol": "KGS",
    "prefixWithCode": true,
    "code": "KGS"
  },
  "KHR": {
    "locale": "en-US",
    "symbol": "KHR",
    "prefixWithCode": true,
    "code": "KHR"
  },
  "KMF": {
    "locale": "en-US",
    "symbol": "KMF",
    "prefixWithCode": true,
    "code": "KMF"
  },
  "KRW": {
    "locale": "en-US",
    "symbol": "KRW",
    "prefixWithCode": true,
    "code": "KRW"
  },
  "KWD": {
    "locale": "en-US",
    "symbol": "KWD",
    "prefixWithCode": true,
    "code": "KWD"
  },
  "KYD": {
    "locale": "en-US",
    "symbol": "KYD",
    "prefixWithCode": true,
    "code": "KYD"
  },
  "KZT": {
    "locale": "en-US",
    "symbol": "KZT",
    "prefixWithCode": true,
    "code": "KZT"
  },
  "LAK": {
    "locale": "en-US",
    "symbol": "LAK",
    "prefixWithCode": true,
    "code": "LAK"
  },
  "LKR": {
    "locale": "en-US",
    "symbol": "LKR",
    "prefixWithCode": true,
    "code": "LKR"
  },
  "LRD": {
    "locale": "en-US",
    "symbol": "LRD",
    "prefixWithCode": true,
    "code": "LRD"
  },
  "LSL": {
    "locale": "en-US",
    "symbol": "LSL",
    "prefixWithCode": true,
    "code": "LSL"
  },
  "MAD": {
    "locale": "en-US",
    "symbol": "MAD",
    "prefixWithCode": true,
    "code": "MAD"
  },
  "MDL": {
    "locale": "en-US",
    "symbol": "MDL",
    "prefixWithCode": true,
    "code": "MDL"
  },
  "MGA": {
    "locale": "en-US",
    "symbol": "MGA",
    "prefixWithCode": true,
    "code": "MGA"
  },
  "MKD": {
    "locale": "en-US",
    "symbol": "MKD",
    "prefixWithCode": true,
    "code": "MKD"
  },
  "MMK": {
    "locale": "en-US",
    "symbol": "MMK",
    "prefixWithCode": true,
    "code": "MMK"
  },
  "MNT": {
    "locale": "en-US",
    "symbol": "MNT",
    "prefixWithCode": true,
    "code": "MNT"
  },
  "MOP": {
    "locale": "en-US",
    "symbol": "MOP",
    "prefixWithCode": true,
    "code": "MOP"
  },
  "MUR": {
    "locale": "en-US",
    "symbol": "MUR",
    "prefixWithCode": true,
    "code": "MUR"
  },
  "MVR": {
    "locale": "en-US",
    "symbol": "MVR",
    "prefixWithCode": true,
    "code": "MVR"
  },
  "MWK": {
    "locale": "en-US",
    "symbol": "MWK",
    "prefixWithCode": true,
    "code": "MWK"
  },
  "MXN": {
    "locale": "en-US",
    "symbol": "MXN",
    "prefixWithCode": true,
    "code": "MXN"
  },
  "MYR": {
    "locale": "en-US",
    "symbol": "MYR",
    "prefixWithCode": true,
    "code": "MYR"
  },
  "MZN": {
    "locale": "en-US",
    "symbol": "MZN",
    "prefixWithCode": true,
    "code": "MZN"
  },
  "NAD": {
    "locale": "en-US",
    "symbol": "NAD",
    "prefixWithCode": true,
    "code": "NAD"
  },
  "NGN": {
    "locale": "en-US",
    "symbol": "NGN",
    "prefixWithCode": true,
    "code": "NGN"
  },
  "NIO": {
    "locale": "en-US",
    "symbol": "NIO",
    "prefixWithCode": true,
    "code": "NIO"
  },
  "NOK": {
    "locale": "en-US",
    "symbol": "NOK",
    "prefixWithCode": true,
    "code": "NOK"
  },
  "NPR": {
    "locale": "en-US",
    "symbol": "NPR",
    "prefixWithCode": true,
    "code": "NPR"
  },
  "NZD": {
    "locale": "en-US",
    "symbol": "NZD",
    "prefixWithCode": true,
    "code": "NZD"
  },
  "OMR": {
    "locale": "en-US",
    "symbol": "OMR",
    "prefixWithCode": true,
    "code": "OMR"
  },
  "PEN": {
    "locale": "en-US",
    "symbol": "PEN",
    "prefixWithCode": true,
    "code": "PEN"
  },
  "PGK": {
    "locale": "en-US",
    "symbol": "PGK",
    "prefixWithCode": true,
    "code": "PGK"
  },
  "PHP": {
    "locale": "en-US",
    "symbol": "PHP",
    "prefixWithCode": true,
    "code": "PHP"
  },
  "PKR": {
    "locale": "en-US",
    "symbol": "PKR",
    "prefixWithCode": true,
    "code": "PKR"
  },
  "PLN": {
    "locale": "en-US",
    "symbol": "PLN",
    "prefixWithCode": true,
    "code": "PLN"
  },
  "PYG": {
    "locale": "en-US",
    "symbol": "PYG",
    "prefixWithCode": true,
    "code": "PYG"
  },
  "QAR": {
    "locale": "en-US",
    "symbol": "QAR",
    "prefixWithCode": true,
    "code": "QAR"
  },
  "RON": {
    "locale": "en-US",
    "symbol": "RON",
    "prefixWithCode": true,
    "code": "RON"
  },
  "RSD": {
    "locale": "en-US",
    "symbol": "RSD",
    "prefixWithCode": true,
    "code": "RSD"
  },
  "RUB": {
    "locale": "en-US",
    "symbol": "RUB",
    "prefixWithCode": true,
    "code": "RUB"
  },
  "RWF": {
    "locale": "en-US",
    "symbol": "RWF",
    "prefixWithCode": true,
    "code": "RWF"
  },
  "SAR": {
    "locale": "en-US",
    "symbol": "SAR",
    "prefixWithCode": true,
    "code": "SAR"
  },
  "SCR": {
    "locale": "en-US",
    "symbol": "SCR",
    "prefixWithCode": true,
    "code": "SCR"
  },
  "SEK": {
    "locale": "en-US",
    "symbol": "SEK",
    "prefixWithCode": true,
    "code": "SEK"
  },
  "SGD": {
    "locale": "en-US",
    "symbol": "S$",
    "prefixWithCode": false
  },
  "SLL": {
    "locale": "en-US",
    "symbol": "SLL",
    "prefixWithCode": true,
    "code": "SLL"
  },
  "SOS": {
    "locale": "en-US",
    "symbol": "SOS",
    "prefixWithCode": true,
    "code": "SOS"
  },
  "SVC": {
    "locale": "en-US",
    "symbol": "SVC",
    "prefixWithCode": true,
    "code": "SVC"
  },
  "SZL": {
    "locale": "en-US",
    "symbol": "SZL",
    "prefixWithCode": true,
    "code": "SZL"
  },
  "THB": {
    "locale": "en-US",
    "symbol": "THB",
    "prefixWithCode": true,
    "code": "THB"
  },
  "TND": {
    "locale": "en-US",
    "symbol": "TND",
    "prefixWithCode": true,
    "code": "TND"
  },
  "TRY": {
    "locale": "en-US",
    "symbol": "TRY",
    "prefixWithCode": true,
    "code": "TRY"
  },
  "TTD": {
    "locale": "en-US",
    "symbol": "TTD",
    "prefixWithCode": true,
    "code": "TTD"
  },
  "TWD": {
    "locale": "en-US",
    "symbol": "TWD",
    "prefixWithCode": true,
    "code": "TWD"
  },
  "TZS": {
    "locale": "en-US",
    "symbol": "TZS",
    "prefixWithCode": true,
    "code": "TZS"
  },
  "UAH": {
    "locale": "en-US",
    "symbol": "UAH",
    "prefixWithCode": true,
    "code": "UAH"
  },
  "UGX": {
    "locale": "en-US",
    "symbol": "UGX",
    "prefixWithCode": true,
    "code": "UGX"
  },
  "USD": {
    "locale": "en-US",
    "symbol": "$",
    "prefixWithCode": false
  },
  "UYU": {
    "locale": "en-US",
    "symbol": "UYU",
    "prefixWithCode": true,
    "code": "UYU"
  },
  "UZS": {
    "locale": "en-US",
    "symbol": "UZS",
    "prefixWithCode": true,
    "code": "UZS"
  },
  "VND": {
    "locale": "en-US",
    "symbol": "VND",
    "prefixWithCode": true,
    "code": "VND"
  },
  "VUV": {
    "locale": "en-US",
    "symbol": "VUV",
    "prefixWithCode": true,
    "code": "VUV"
  },
  "XAF": {
    "locale": "en-US",
    "symbol": "XAF",
    "prefixWithCode": true,
    "code": "XAF"
  },
  "XCD": {
    "locale": "en-US",
    "symbol": "XCD",
    "prefixWithCode": true,
    "code": "XCD"
  },
  "XOF": {
    "locale": "en-US",
    "symbol": "XOF",
    "prefixWithCode": true,
    "code": "XOF"
  },
  "XPF": {
    "locale": "en-US",
    "symbol": "XPF",
    "prefixWithCode": true,
    "code": "XPF"
  },
  "YER": {
    "locale": "en-US",
    "symbol": "YER",
    "prefixWithCode": true,
    "code": "YER"
  },
  "ZAR": {
    "locale": "en-US",
    "symbol": "ZAR",
    "prefixWithCode": true,
    "code": "ZAR"
  },
  "ZMW": {
    "locale": "en-US",
    "symbol": "ZMW",
    "prefixWithCode": true,
    "code": "ZMW"
  }
};

/** Client-side cache duration for exchange rates (30 minutes). */
export const EXCHANGE_RATE_CACHE_TTL_MS = 30 * 60 * 1000;
