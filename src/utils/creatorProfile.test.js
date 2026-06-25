import { describe, expect, it } from 'vitest';
import {
  evaluateCreatorProfileCompletion,
  getLinkedInProfileUrl,
  hasLinkedInAccount,
  isCreatorProfileComplete,
} from './creatorProfile';

describe('creatorProfile', () => {
  it('normalizes LinkedIn profile URLs', () => {
    expect(getLinkedInProfileUrl({ linked_in_profile_url: 'https://linkedin.com/in/jane' })).toBe('https://linkedin.com/in/jane');
    expect(getLinkedInProfileUrl({ linkedInProfileUrl: 'https://linkedin.com/oauth/foo' })).toBe('');
    expect(getLinkedInProfileUrl({ linkedInUrl: 'https://linkedin.com/in/john' })).toBe('https://linkedin.com/in/john');
    expect(getLinkedInProfileUrl({ linked_in_url: 'https://linkedin.com/in/jill' })).toBe('https://linkedin.com/in/jill');
  });

  it('detects LinkedIn account fields', () => {
    expect(hasLinkedInAccount({ linkedInId: 'abc' })).toBe(true);
  });

  it('evaluates profile completeness from fields', () => {
    const profile = {
      name: 'Jane',
      role: 'DEVELOPER',
      industry: 'TECH',
      skills: 'React,TypeScript',
      location: 'Bengaluru',
      linked_in_id: 'sub-1',
      why_im_here: 'Build',
      expected_rate: '5000/month',
    };

    expect(isCreatorProfileComplete(profile)).toBe(true);
    expect(evaluateCreatorProfileCompletion(profile).percent).toBe(100);
  });

  it('lists missing fields for incomplete profiles', () => {
    const summary = evaluateCreatorProfileCompletion({ name: 'Jane', skills: 'React' });
    expect(summary.isComplete).toBe(false);
    expect(summary.missingFields.length).toBeGreaterThan(0);
  });
});
