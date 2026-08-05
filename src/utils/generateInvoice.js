/**
 * generateInvoice.js
 * CoBrother storefront — Tax Invoice PDF (print) generator.
 * Seller billed as Aultum International.
 */

import coBrotherLogo from '../assets/CoBrother_logo_skyblue.png';
import { formatAuctionDate } from './auctionDate';
import { formatInr } from './money';

const SELLER = {
  legalName: 'Aultum International',
  gstin: '29DXMPA9959L2ZF',
  email: 'support@cobrother.com',
  website: 'www.cobrother.com',
  addressLines: [
    'Third Floor TF 307 Marvel Artiza',
    'Pune Bangalore Road, Vidyanagar, Hubballi',
    'Dharwad, Karnataka, 580021 India',
  ],
};

function invoiceLogoUrl() {
  if (typeof coBrotherLogo === 'string' && coBrotherLogo.startsWith('http')) {
    return coBrotherLogo;
  }
  return new URL(coBrotherLogo, window.location.origin).href;
}

function printInvoiceWindow(win) {
  const imgs = win.document.images;
  const triggerPrint = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 200);
  };

  if (!imgs.length) {
    setTimeout(triggerPrint, 600);
    return;
  }

  let pending = imgs.length;
  const onImageReady = () => {
    pending -= 1;
    if (pending <= 0) triggerPrint();
  };

  Array.from(imgs).forEach((img) => {
    if (img.complete) onImageReady();
    else {
      img.addEventListener('load', onImageReady, { once: true });
      img.addEventListener('error', onImageReady, { once: true });
    }
  });
}

function formatINR(amount) {
  return formatInr(amount, { forceDecimals: true });
}

function formatMoney(amount, currencyCode = 'INR') {
  const code = (currencyCode || 'INR').toUpperCase();
  if (code === 'INR') {
    return formatInr(amount, { forceDecimals: true });
  }
  const symbols = { USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$' };
  const sym = symbols[code] || `${code} `;
  return (
    sym +
    Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function today() {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function invoiceNumber(id) {
  const num = String(id || Math.floor(Math.random() * 90000) + 10000)
    .slice(-6)
    .padStart(6, '0');
  return `CB-INV-${num}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLineItems({ type, item }) {
  /** @type {{ name: string, description?: string, qty: number, unitPrice: number, amount: number }[]} */
  const lines = [];

  if (type === 'domain_registration') {
    const productName =
      item.domain || `${item.domainName || ''}${item.domainExtension || ''}` || 'Domain registration';
    const qty = Math.max(1, Number(item.periodYears ?? item.quantityYears ?? 1) || 1);
    const gst = Number(item.gstInr ?? 0);
    const total = Number(item.priceInr ?? item.price ?? 0);
    const subtotal =
      item.subtotalInr != null
        ? Number(item.subtotalInr)
        : gst > 0 && total > gst
          ? total - gst
          : total || Number(item.quotedUnitPriceInr ?? 0) * qty;
    const unitPrice =
      item.quotedUnitPriceInr != null
        ? Number(item.quotedUnitPriceInr)
        : qty > 0
          ? subtotal / qty
          : subtotal;

    lines.push({
      name: productName,
      description: `Domain registration · ${qty} ${qty === 1 ? 'year' : 'years'}`,
      qty,
      unitPrice,
      amount: subtotal,
    });
    return { lines, gst, total: total || subtotal + gst };
  }

  if (type === 'domain') {
    const productName = `${item.domainName || ''}${item.domainExtension || ''}`.trim() || 'Domain';
    const amount = Number(item.askingPrice || item.priceInr || item.price || 0);
    lines.push({
      name: productName,
      description: item.pricingDemand || 'Domain name purchase',
      qty: 1,
      unitPrice: amount,
      amount,
    });
    return { lines, gst: 0, total: amount };
  }

  const sw = item.software || {};
  const productName = sw.name || 'Software License';
  const amount = Number(sw.price || item.price || 0);
  lines.push({
    name: productName,
    description: sw.description || 'Software purchase',
    qty: 1,
    unitPrice: amount,
    amount,
  });
  if (item.coBrotherHelpPaid) {
    lines.push({
      name: 'CoBrother Helper Service',
      description: 'Optional helper add-on',
      qty: 1,
      unitPrice: 1000,
      amount: 1000,
    });
  }
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  return { lines, gst: 0, total: subtotal };
}

/**
 * @param {object} opts
 * @param {'domain'|'domain_registration'|'software'} opts.type
 * @param {object} opts.item
 * @param {object} opts.user — { name, email, gstin, address, phone }
 */
export function generateInvoice({ type, item, user = {} }) {
  const invNo = invoiceNumber(item.id);
  const invDate = item.createdAt
    ? formatAuctionDate(item.createdAt, { day: '2-digit', month: 'long', year: 'numeric' }, today())
    : today();

  const paymentRef = item.razorpayPaymentId || item.razorpay_payment_id || '';
  const { lines, gst, total } = buildLineItems({ type, item });
  const subtotal = lines.reduce((s, l) => s + Number(l.amount || 0), 0);

  const chargeCurrency = item.chargeCurrency || 'INR';
  const displayTotal =
    item.amountCharged != null
      ? formatMoney(item.amountCharged, chargeCurrency)
      : formatINR(total || subtotal + gst);

  const logoUrl = invoiceLogoUrl();
  const typeLabel =
    type === 'domain_registration'
      ? 'Domain Registration'
      : type === 'domain'
        ? 'Domain Purchase'
        : 'Software License';
  const typeBadgeBg =
    type === 'software' ? '#ede9fe' : type === 'domain_registration' ? '#ecfdf5' : '#e0f2fe';
  const typeBadgeColor =
    type === 'software' ? '#6d28d9' : type === 'domain_registration' ? '#047857' : '#0369a1';

  const sellerAddressHtml = SELLER.addressLines.map((line) => escapeHtml(line)).join('<br/>');

  const itemRows = lines
    .map((line, idx) => {
      const sno = idx + 1;
      return `
      <tr>
        <td class="col-sno">${sno}</td>
        <td>
          <div class="item-name">${escapeHtml(line.name)}</div>
          ${line.description ? `<div class="item-desc">${escapeHtml(line.description)}</div>` : ''}
        </td>
        <td class="text-right col-qty">${Number(line.qty || 1)}</td>
        <td class="text-right">${formatINR(line.unitPrice)}</td>
        <td class="text-right">${formatINR(line.amount)}</td>
      </tr>`;
    })
    .join('');

  const buyerGstin = user.gstin || item.buyerGstin || item.buyer_gstin || '';
  const buyerPhone = user.phone || item.buyerPhone || item.buyer_phone || '';
  const buyerAddress = user.address || '';

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8"/>
  <title>Invoice ${escapeHtml(invNo)} — ${escapeHtml(SELLER.legalName)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: #fff;
      color: #111827;
      font-size: 13px;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      padding: 48px 52px;
      display: flex;
      flex-direction: column;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 36px;
      gap: 24px;
    }
    .brand-block {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      max-width: 55%;
    }
    .brand-logo {
      height: 44px;
      width: auto;
      max-width: 240px;
      object-fit: contain;
      display: block;
    }
    .invoice-meta { text-align: right; }
    .invoice-title {
      font-family: 'DM Serif Display', serif;
      font-size: 22px;
      color: #111827;
      letter-spacing: -0.3px;
    }
    .invoice-number, .invoice-date {
      font-size: 12px;
      color: #6b7280;
      margin-top: 2px;
    }

    .divider {
      height: 1px;
      background: linear-gradient(90deg, #111827 0%, #e5e7eb 100%);
      margin-bottom: 32px;
    }

    .addresses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-bottom: 28px;
    }
    .address-block .label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    .address-block .name {
      font-weight: 700;
      font-size: 14px;
      color: #111827;
      margin-bottom: 4px;
    }
    .address-block p {
      color: #4b5563;
      font-size: 11.5px;
      line-height: 1.65;
    }

    .type-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 16px;
      background: ${typeBadgeBg};
      color: ${typeBadgeColor};
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }
    .items-table thead tr {
      background: #111827;
      color: #fff;
    }
    .items-table thead th {
      padding: 11px 12px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      text-align: left;
    }
    .items-table thead th.text-right { text-align: right; }
    .items-table thead th.col-sno,
    .items-table tbody td.col-sno {
      width: 48px;
      text-align: center;
    }
    .items-table thead th.col-qty,
    .items-table tbody td.col-qty {
      width: 56px;
    }
    .items-table tbody tr { border-bottom: 1px solid #f3f4f6; }
    .items-table tbody td {
      padding: 12px;
      color: #374151;
      vertical-align: top;
      font-size: 12.5px;
    }
    .items-table tbody td.text-right { text-align: right; }
    .item-name {
      font-weight: 700;
      color: #111827;
      font-size: 13px;
      margin-bottom: 2px;
    }
    .item-desc {
      font-size: 11px;
      color: #9ca3af;
    }

    .totals {
      margin-left: auto;
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      color: #4b5563;
    }
    .totals-row.bold {
      font-weight: 700;
      color: #111827;
      font-size: 15px;
      border-top: 2px solid #111827;
      margin-top: 6px;
      padding-top: 10px;
    }

    .status-banner {
      margin-top: 32px;
      padding: 14px 18px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22c55e;
      flex-shrink: 0;
    }
    .status-text {
      font-size: 12px;
      font-weight: 600;
      color: #166534;
    }

    .footer {
      margin-top: auto;
      padding-top: 32px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
    }
    .footer-left, .footer-right {
      font-size: 11px;
      color: #9ca3af;
      line-height: 1.7;
    }
    .footer-right { text-align: right; }
    .footer-logo {
      height: 20px;
      width: auto;
      max-width: 120px;
      object-fit: contain;
      display: block;
      margin: 4px 0 0 auto;
      opacity: 0.55;
    }

    .stripe {
      height: 5px;
      background: linear-gradient(90deg, #111827 0%, #0f766e 50%, #111827 100%);
      margin-bottom: 0;
      border-radius: 0 0 3px 3px;
    }

    @media print {
      body { margin: 0; }
      .page { padding: 36px 40px; }
    }
  </style>
  </head>
  <body>
  <div class="stripe"></div>
  <div class="page">

    <div class="header">
      <div class="brand-block">
        <img class="brand-logo" src="${logoUrl}" alt="CoBrother" />
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">Tax Invoice</div>
        <div class="invoice-number">${escapeHtml(invNo)}</div>
        <div class="invoice-date">Date: ${escapeHtml(invDate)}</div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="addresses">
      <div class="address-block">
        <div class="label">From</div>
        <div class="name">${escapeHtml(SELLER.legalName)}</div>
        <p>
          ${sellerAddressHtml}<br/>
          GSTIN: ${escapeHtml(SELLER.gstin)}<br/>
          ${escapeHtml(SELLER.email)}
        </p>
      </div>
      <div class="address-block">
        <div class="label">Billed To</div>
        <div class="name">${escapeHtml(user.name || 'Customer')}</div>
        <p>
          ${user.email ? `${escapeHtml(user.email)}<br/>` : ''}
          ${buyerPhone ? `Phone: ${escapeHtml(buyerPhone)}<br/>` : ''}
          ${buyerGstin ? `GSTIN: ${escapeHtml(buyerGstin)}<br/>` : ''}
          ${buyerAddress ? escapeHtml(buyerAddress) : ''}
        </p>
      </div>
    </div>

    <div>
      <span class="type-badge">${escapeHtml(typeLabel)}</span>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th class="col-sno">S/No</th>
          <th>Item Name</th>
          <th class="text-right col-qty">Qty</th>
          <th class="text-right">Price</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatINR(subtotal)}</span>
      </div>
      <div class="totals-row">
        <span>GST (18%)</span>
        <span>${gst > 0 ? formatINR(gst) : '—'}</span>
      </div>
      <div class="totals-row bold">
        <span>Final Amount</span>
        <span>${displayTotal}</span>
      </div>
    </div>

    <div class="status-banner">
      <div class="status-dot"></div>
      <div class="status-text">Payment Confirmed — Thank you for your purchase!</div>
    </div>
    ${
      paymentRef
        ? `<p style="margin-top:12px;font-size:11px;color:#6b7280;"><strong>Payment reference:</strong> ${escapeHtml(paymentRef)}</p>`
        : ''
    }

    <div class="footer">
      <div class="footer-left">
        This is a computer-generated invoice and does not require a signature.<br/>
        For queries, write to ${escapeHtml(SELLER.email)}
      </div>
      <div class="footer-right">
        <img class="footer-logo" src="${logoUrl}" alt="${escapeHtml(SELLER.legalName)}" />
        ${escapeHtml(SELLER.website)}
      </div>
    </div>

  </div>
  </body>
  </html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Please allow pop-ups for this site to download invoices.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => printInvoiceWindow(win);
}
