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
      expected_rate: '5000/month',
      introduction_video_link: 'https://youtube.com/watch?v=abc',
      resume_drive_link: 'https://drive.google.com/file/d/abc',
      preferred_work_type: 'FULL_TIME',
      availability: 'Weekends',
      languages_known: 'English',
    };

    expect(isCreatorProfileComplete(profile)).toBe(true);
    expect(evaluateCreatorProfileCompletion(profile).percent).toBe(100);
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
});
