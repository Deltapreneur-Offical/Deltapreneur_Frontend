import { describe, expect, it } from 'vitest';
import {
  computeInrCommission,
  formatInr,
  parseInrInput,
  roundInr,
} from './money';

describe('money', () => {
  it('rounds INR noise to whole rupees', () => {
    expect(roundInr(9999.999)).toBe(10000);
  });

  it('parses user INR input', () => {
    expect(parseInrInput('1,25,000')).toBe(125000);
    expect(parseInrInput('0')).toBeNull();
  });

  it('computes commission math', () => {
    expect(computeInrCommission(1000, 10)).toEqual({
      amount: 1000,
      commission: 100,
      net: 900,
      percent: 10,
    });
  });

  it('formats INR with grouping', () => {
    expect(formatInr(12345)).toBe('₹12,345');
  });
});
