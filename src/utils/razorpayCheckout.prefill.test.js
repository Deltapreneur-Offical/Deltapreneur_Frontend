import { describe, expect, it } from 'vitest';
import {
  buildCartPaymentDescription,
  buildRazorpayPrefill,
} from './razorpayCheckout';

describe('buildRazorpayPrefill', () => {
  it('includes buyer name from order data for Razorpay dashboard clarity', () => {
    expect(
      buildRazorpayPrefill(
        { email: 'fallback@example.com', phoneNumber: '9999999999' },
        {
          buyerName: 'Ganesh Patil',
          buyerEmail: 'gcpatil2022@gmail.com',
          buyerPhone: '9449842259',
        },
      ),
    ).toEqual({
      name: 'Ganesh Patil',
      email: 'gcpatil2022@gmail.com',
      contact: '9449842259',
    });
  });

  it('falls back to user first/last name when order buyerName is missing', () => {
    expect(
      buildRazorpayPrefill(
        { firstname: 'Ganesh', lastname: 'Patil', email: 'a@b.com' },
        {},
      ),
    ).toEqual({
      name: 'Ganesh Patil',
      email: 'a@b.com',
    });
  });
});

describe('buildCartPaymentDescription', () => {
  it('lists category and product names for ops clarity', () => {
    expect(
      buildCartPaymentDescription(
        [{ productType: 'DOMAIN_REGISTRATION', productName: 'example.com' }],
        1,
      ),
    ).toBe('Deltapreneur - Domain Registration - Domain Registration: example.com');
  });

  it('shows mixed categories when cart has multiple types', () => {
    expect(
      buildCartPaymentDescription(
        [
          { productType: 'DOMAIN_REGISTRATION', productName: 'alpha.com' },
          { productType: 'TECHNOLOGY', productName: 'My SaaS' },
        ],
        2,
      ),
    ).toBe(
      'Deltapreneur - Domain Registration, Technology - Domain Registration: alpha.com | Technology: My SaaS',
    );
  });
});
