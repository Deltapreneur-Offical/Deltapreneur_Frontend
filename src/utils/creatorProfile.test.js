import { describe, expect, it } from 'vitest';
import {
  evaluateCreatorProfileCompletion,
  getLinkedInProfileUrl,
  hasLinkedInAccount,
  isCreatorProfileComplete,
  isCreatorProfileVisible,
  readCreatorCallbackProfileId,
  readCreatorProfileId,
  unwrapCreatorProfile,
} from './creatorProfile';

describe('creatorProfile', () => {
  it('does not treat a successful empty /my payload as a profile', () => {
    expect(unwrapCreatorProfile({
      success: true,
      message: 'My creator profile fetched successfully',
      data: null,
    })).toBeNull();
    expect(readCreatorProfileId({ success: true, message: 'ok', data: null })).toBe('');
  });

  it('reads a UUID out of a LinkedIn callback profileId', () => {
    const id = '1b5d5a2c-1111-4111-8111-2fc6c879259f';
    expect(readCreatorCallbackProfileId(id)).toBe(id);
    expect(readCreatorCallbackProfileId(`${id}_extra`)).toBe(id);
    expect(readCreatorCallbackProfileId('not-an-id')).toBe('');
  });

  it('unwraps nested creator profile payloads', () => {
    const profile = { id: '11111111-1111-4111-8111-111111111111', name: 'Ada' };
    expect(unwrapCreatorProfile({ success: true, data: profile })).toEqual(profile);
    expect(readCreatorProfileId({ data: { communityId: profile.id } })).toBe(profile.id);
  });

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
      about: 'CSE student',
      headline: 'Computer science student building AI tools',
      role: 'STUDENT',
      industry: 'TECH',
      education: 'B.Tech CSE',
      graduation_year: '2027',
      skills: 'React,TypeScript',
      location: 'Bengaluru',
      linked_in_profile_url: 'https://linkedin.com/in/jane',
      why_im_here: 'Build',
      expected_price: '5000/month',
      introduction_video_link: 'https://youtube.com/watch?v=abc',
      resume_drive_link: 'https://drive.google.com/file/d/abc',
      preferred_work_type: 'FULL_TIME',
      availability: 'Weekends',
      languages_known: 'English',
    };

    expect(isCreatorProfileComplete(profile)).toBe(true);
    expect(evaluateCreatorProfileCompletion(profile).percent).toBe(100);
  });

  it('debugs creator expected rate parsing and building', () => {
    const { parseCreatorExpectedRate, buildCreatorExpectedRate } = require('./creatorExpectedRate');
    
    // Test parsing
    const parsed1 = parseCreatorExpectedRate("456/day");
    expect(parsed1).toEqual({ amount: '456', period: '/day' });

    // Test building
    const built1 = buildCreatorExpectedRate(parsed1.amount, parsed1.period);
    expect(built1).toBe('456/day');

    const builtEmptyPeriod = buildCreatorExpectedRate("456", "");
    expect(builtEmptyPeriod).toBe('');

    const builtUndefinedAmount = buildCreatorExpectedRate(undefined, "/day");
    expect(builtUndefinedAmount).toBe('');
  });

  it('changes required fields by creator role', () => {
    const investorProfile = {
      name: 'Jane',
      about: 'Angel investor',
      headline: 'Early-stage SaaS investor',
      role: 'INVESTOR',
      industry: 'TECH',
      investment_focus: 'AI SaaS and HealthTech',
      investment_stage: 'Seed',
      ticket_size: '₹5L - ₹25L',
      skills: 'Fundraising',
      location: 'Bengaluru',
      why_im_here: 'Invest in startups',
      industry_expertise: 'AI, SaaS',
      languages_known: 'English',
    };

    expect(isCreatorProfileComplete(investorProfile)).toBe(true);
    expect(evaluateCreatorProfileCompletion(investorProfile).missingFields).toEqual([]);
  });

  it('lists missing fields for incomplete profiles', () => {
    const summary = evaluateCreatorProfileCompletion({ name: 'Jane', skills: 'React' });
    expect(summary.isComplete).toBe(false);
    expect(summary.missingFields.length).toBeGreaterThan(0);
  });

  it('treats admin profileComplete as visible without extra fields', () => {
    expect(isCreatorProfileVisible({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'StartUptobe',
      profileComplete: true,
    })).toBe(true);
  });
});
