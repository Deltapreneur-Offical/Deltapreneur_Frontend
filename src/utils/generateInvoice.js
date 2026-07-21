
/**
 * generateInvoice.js
 * CoBrother — Invoice PDF Generator
 * Uses a hidden iframe + window.print() to produce a clean PDF.
 * No external dependencies required.
 */

import coBrotherLogo from '../assets/Cobrother_logo2.png';
import { formatAuctionDate } from './auctionDate';
import { formatInr } from './money';

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
    return formatInr(amount);
  }
  const symbols = { USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$' };
  const sym = symbols[code] || `${code} `;
  return sym + Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function today() {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function invoiceNumber(id) {
  const num = String(id || Math.floor(Math.random() * 90000) + 10000).slice(-6).padStart(6, '0');
  return `CB-INV-${num}`;
}

/**
 * @param {object} opts
 * @param {'domain'|'domain_registration'|'software'} opts.type
 * @param {object} opts.item   — the raw purchase object from the API
 * @param {object} opts.user   — { name, email } of the logged-in user (pass what you have)
 */
export function generateInvoice({ type, item, user = {} }) {
  /* ── Derive fields ─────────────────────────────────────── */
  const invNo = invoiceNumber(item.id);
  const invDate = item.createdAt
    ? formatAuctionDate(item.createdAt, { day: '2-digit', month: 'long', year: 'numeric' }, today())
    : today();

  let productName, productDesc, baseAmount, extraLines = [];
  let paymentRef = '';

  if (type === 'domain_registration') {
    productName = item.domain || `${item.domainName || ''}${item.domainExtension || ''}`;
    productDesc = 'New domain registration (CoBrother storefront)';
    baseAmount = Number(item.subtotalInr ?? item.priceInr ?? item.price ?? 0);
    paymentRef = item.razorpayPaymentId || item.razorpay_payment_id || '';
  } else if (type === 'domain') {
    productName = `${item.domainName}${item.domainExtension}`;
    productDesc = item.pricingDemand || 'Domain Name Purchase';
    baseAmount = Number(item.askingPrice || 0);
    paymentRef = item.razorpayPaymentId || item.razorpay_payment_id || '';
  } else {
    const sw = item.software || {};
    productName = sw.name || 'Software License';
    productDesc = sw.description || 'Software Purchase';
    baseAmount = Number(sw.price || 0);
    if (item.coBrotherHelpPaid) {
      extraLines.push({ label: 'CoBrother Helper Service', amount: 1000 });
    }
  }

  const chargeCurrency = item.chargeCurrency || 'INR';
  const formatLine = (amt) =>
    item.amountCharged != null && chargeCurrency !== 'INR'
      ? formatMoney(item.amountCharged, chargeCurrency)
      : formatINR(amt);

  const subtotal = baseAmount + extraLines.reduce((s, l) => s + l.amount, 0);
  const gst =
    type === 'domain_registration'
      ? Number(item.gstInr ?? 0)
      : 0;
  const total =
    type === 'domain_registration'
      ? Number(item.priceInr ?? item.price ?? subtotal + gst)
      : subtotal + gst;
  const displayTotal =
    item.amountCharged != null ? formatMoney(item.amountCharged, chargeCurrency) : formatLine(total);

  const sellerGstin =
    type === 'domain_registration' && item.cobrotherGstin
      ? item.cobrotherGstin
      : '[Your GSTIN]';
  const logoUrl = invoiceLogoUrl();

  const typeLabel =
    type === 'domain_registration'
      ? '◇ Domain Registration'
      : type === 'domain'
        ? '◇ Domain Purchase'
        : '⟁ Software License';
  const typeBadgeBg =
    type === 'software' ? '#ede9fe' : type === 'domain_registration' ? '#ecfdf5' : '#e0f2fe';
  const typeBadgeColor =
    type === 'software' ? '#6d28d9' : type === 'domain_registration' ? '#047857' : '#0369a1';

  const extraRows = extraLines.map(l => `
      <tr>
        <td>${l.label}</td>
        <td class="text-right">${formatINR(l.amount)}</td>
      </tr>
    `).join('');

  /* ── HTML Template ─────────────────────────────────────── */
  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8"/>
  <title>Invoice ${invNo} — CoBrother</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
  
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
    body {
      font-family: 'Inter', system-ui, sans-serif;
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
      padding: 56px 60px;
      display: flex;
      flex-direction: column;
    }
  
    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 48px;
    }
    .brand-block {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    .brand-logo {
      height: 44px;
      width: auto;
      max-width: 240px;
      object-fit: contain;
      display: block;
    }
    .brand-tagline {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-title {
      font-family: 'DM Serif Display', serif;
      font-size: 22px;
      color: #111827;
      letter-spacing: -0.3px;
    }
    .invoice-number {
      font-size: 12px;
      color: #6b7280;
      margin-top: 2px;
    }
    .invoice-date {
      font-size: 12px;
      color: #6b7280;
    }
  
    /* ── Divider ── */
    .divider {
      height: 1px;
      background: linear-gradient(90deg, #111827 0%, #e5e7eb 100%);
      margin-bottom: 40px;
    }
  
    /* ── Address Block ── */
    .addresses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 40px;
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
      margin-bottom: 2px;
    }
    .address-block p {
      color: #4b5563;
      font-size: 12px;
      line-height: 1.7;
    }
  
    /* ── Badge ── */
    .type-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 20px;
      background: ${typeBadgeBg};
      color: ${typeBadgeColor};
    }
  
    /* ── Items Table ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;
    }
    .items-table thead tr {
      background: #111827;
      color: #fff;
    }
    .items-table thead th {
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      text-align: left;
    }
    .items-table thead th.text-right { text-align: right; }
    .items-table tbody tr {
      border-bottom: 1px solid #f3f4f6;
    }
    .items-table tbody tr:last-child { border-bottom: none; }
    .items-table tbody td {
      padding: 14px 16px;
      color: #374151;
      vertical-align: top;
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
  
    /* ── Totals ── */
    .totals {
      margin-left: auto;
      width: 280px;
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
    .totals-row .gst-note {
      font-size: 10px;
      color: #9ca3af;
    }
  
    /* ── Status Banner ── */
    .status-banner {
      margin-top: 40px;
      padding: 16px 20px;
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
  
    /* ── Footer ── */
    .footer {
      margin-top: auto;
      padding-top: 40px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer-left {
      font-size: 11px;
      color: #9ca3af;
      line-height: 1.7;
    }
    .footer-right {
      text-align: right;
      font-size: 11px;
      color: #9ca3af;
    }
    .footer-logo {
      height: 22px;
      width: auto;
      max-width: 140px;
      object-fit: contain;
      display: block;
      margin-top: 4px;
      opacity: 0.55;
    }
  
    /* ── Watermark stripe ── */
    .stripe {
      height: 5px;
      background: linear-gradient(90deg, #111827 0%, #6d28d9 50%, #111827 100%);
      margin-bottom: 0;
      border-radius: 0 0 3px 3px;
    }
  
    @media print {
      body { margin: 0; }
      .page { padding: 40px 48px; }
    }
  </style>
  </head>
  <body>
  <div class="stripe"></div>
  <div class="page">
  
    <!-- Header -->
    <div class="header">
      <div class="brand-block">
        <img class="brand-logo" src="${logoUrl}" alt="CoBrother" />
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">Tax Invoice</div>
        <div class="invoice-number">${invNo}</div>
        <div class="invoice-date">Date: ${invDate}</div>
      </div>
    </div>
  
    <div class="divider"></div>
  
    <!-- Addresses -->
    <div class="addresses">
      <div class="address-block">
        <div class="label">From</div>
        <div class="name">CoBrother Technologies Pvt. Ltd.</div>
        <p>
          [Address Line 1]<br/>
          [City, State – PIN]<br/>
          India<br/>
          GSTIN: ${sellerGstin}<br/>
          support@cobrother.com
        </p>
      </div>
      <div class="address-block">
        <div class="label">Billed To</div>
        <div class="name">${user.name || 'Customer'}</div>
        <p>
          ${user.email || ''}<br/>
          ${user.gstin ? 'GSTIN: ' + user.gstin + '<br/>' : ''}
          ${user.address || ''}
        </p>
      </div>
    </div>
  
    <!-- Type Badge -->
    <div>
      <span class="type-badge">${typeLabel}</span>
    </div>
  
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-name">${productName}</div>
            <div class="item-desc">${productDesc}</div>
          </td>
          <td class="text-right">${formatINR(baseAmount)}</td>
        </tr>
        ${extraRows}
      </tbody>
    </table>
  
    <!-- Totals -->
    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatINR(subtotal)}</span>
      </div>
      <div class="totals-row">
        <span>GST (18%)${gst === 0 ? ' <span class="gst-note">*</span>' : ''}</span>
        <span>${gst === 0 ? '—' : formatINR(gst)}</span>
      </div>
      <div class="totals-row bold">
        <span>Total</span>
        <span>${displayTotal}</span>
      </div>
    </div>
  
    <!-- Status -->
    <div class="status-banner">
      <div class="status-dot"></div>
      <div class="status-text">Payment Confirmed — Thank you for your purchase!</div>
    </div>
    ${paymentRef ? `<p style="margin-top:12px;font-size:11px;color:#6b7280;"><strong>Payment reference:</strong> ${paymentRef}</p>` : ''}
  
    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        ${gst === 0 ? '* GST details will appear once GSTIN configuration is complete.<br/>' : ''}
        This is a computer-generated invoice and does not require a signature.<br/>
        For queries, write to support@cobrother.com
      </div>
      <div class="footer-right">
        <img class="footer-logo" src="${logoUrl}" alt="CoBrother" />
        www.cobrother.com
      </div>
    </div>
  
  </div>
  </body>
  </html>`;

  /* ── Open in new window and trigger print ──────────────── */
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Please allow pop-ups for this site to download invoices.');
    return;
  }
  win.document.write(html);
  win.document.close();

  win.onload = () => printInvoiceWindow(win);
}