import { describe, expect, it, vi } from 'vitest';
import {
  classifyRecoveredOrders,
  isVerifyNetworkFailure,
  messageForVerifyFailure,
  recoverCheckoutAfterVerifyFailure,
} from './checkoutVerifyRecovery';

describe('checkoutVerifyRecovery', () => {
  it('treats CORS/network errors as verify network failures', () => {
    expect(isVerifyNetworkFailure({ message: 'Network Error' })).toBe(true);
    expect(isVerifyNetworkFailure({ response: { status: 0 } })).toBe(true);
    expect(isVerifyNetworkFailure({ response: { status: 502 } })).toBe(true);
    expect(isVerifyNetworkFailure({ response: { status: 400, data: { detail: 'bad' } } })).toBe(false);
  });

  it('classifies captured payment + ACTIVE webhook as success', () => {
    const recovered = classifyRecoveredOrders(
      [
        {
          domain: 'hubregistrar.in',
          status: 'ACTIVE',
          razorpayPaymentId: 'pay_live_1',
          razorpayOrderId: 'order_live_1',
        },
      ],
      { razorpayPaymentId: 'pay_live_1', razorpayOrderId: 'order_live_1' },
    );
    expect(recovered.outcome).toBe('success');
    expect(recovered.domains).toEqual(['hubregistrar.in']);
  });

  it('does not treat browser verify failure as payment failure when webhook is processing', () => {
    const recovered = classifyRecoveredOrders(
      [
        {
          domain: 'hubregistrar.in',
          status: 'PAYMENT_COMPLETED',
          razorpayPaymentId: 'pay_live_1',
        },
      ],
      { razorpayPaymentId: 'pay_live_1' },
    );
    expect(recovered.outcome).toBe('processing');
    expect(
      messageForVerifyFailure({
        err: { message: 'Network Error' },
        recovered,
      }),
    ).toMatch(/do not pay again/i);
    expect(
      messageForVerifyFailure({
        err: { message: 'Network Error' },
        recovered,
      }),
    ).not.toMatch(/Payment verification failed/i);
  });

  it('never shows payment verification failed for a CORS error after Razorpay success', () => {
    const message = messageForVerifyFailure({
      err: { message: 'Network Error' },
      recovered: { outcome: 'unknown', domains: [] },
    });
    expect(message).not.toMatch(/Payment verification failed/i);
    expect(message).toMatch(/Payment was received/i);
  });

  it('polls orders until webhook marks registration success', async () => {
    const listOrders = vi
      .fn()
      .mockRejectedValueOnce({ message: 'Network Error' })
      .mockResolvedValueOnce({
        data: [
          {
            domain: 'hubregistrar.in',
            status: 'ACTIVE',
            razorpayPaymentId: 'pay_live_1',
          },
        ],
      });
    const recovered = await recoverCheckoutAfterVerifyFailure({
      listOrders,
      razorpayPaymentId: 'pay_live_1',
      attempts: 2,
      delayMs: 0,
      wait: async () => {},
    });
    expect(recovered.outcome).toBe('success');
    expect(listOrders).toHaveBeenCalledTimes(2);
  });
});
