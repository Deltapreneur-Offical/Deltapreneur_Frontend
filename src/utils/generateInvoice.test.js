import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateInvoice } from './generateInvoice';

describe('generateInvoice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses stored technology-service subtotal, GST, and paid total', () => {
    let html = '';
    const fakeWindow = {
      document: {
        images: [],
        write: vi.fn((content) => {
          html = content;
        }),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      onload: null,
    };
    vi.spyOn(window, 'open').mockReturnValue(fakeWindow);

    generateInvoice({
      type: 'software',
      user: { name: 'Delta Buyer', email: 'buyer@example.com' },
      item: {
        invoiceNumber: 'INV-CB-TAXTEST',
        createdAt: '2026-09-10T10:00:00Z',
        razorpayPaymentId: 'pay_test_123',
        subtotalExGst: 4667.0,
        gstAmount: 840.06,
        amountCharged: 5507.06,
        gstRate: 18,
        software: {
          name: 'Cloud Storage',
          description: 'Starter monthly subscription',
          price: 4667.0,
        },
      },
    });

    expect(html).toContain('INV-CB-TAXTEST');
    expect(html).toContain('Cloud Storage');
    expect(html).toContain('4,667.00');
    expect(html).toContain('GST (18%)');
    expect(html).toContain('840.06');
    expect(html).toContain('5,507.06');
  });
});
