import { describe, expect, it } from 'vitest';
import { evaluateSimplifiedProfileCompletion } from '../utils/creatorProfile';
import {
  buildSimplifiedProfilePayload,
  formToFeaturedLinkRows,
  featuredLinkRowsToForm,
} from './CommunityPage';

const COMPLETE_PROFILE = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Jane Doe',
  companyName: 'Acme Ventures',
  linkedInProfileUrl: 'https://www.linkedin.com/in/jane-doe/',
};

describe('evaluateSimplifiedProfileCompletion', () => {
  it('is complete with exactly the three required fields', () => {
    const result = evaluateSimplifiedProfileCompletion(COMPLETE_PROFILE);
    expect(result.isComplete).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  it('does not require Industry, Headline, Website, or legacy hidden fields', () => {
    const result = evaluateSimplifiedProfileCompletion({
      ...COMPLETE_PROFILE,
      // All optional/legacy fields deliberately absent.
      industry: '',
      headline: '',
      companyWebsite: '',
      about: '',
      role: '',
      skills: '',
      location: '',
      whyImHere: '',
      expectedRate: '',
    });
    expect(result.isComplete).toBe(true);
  });

  it('reports missing required fields', () => {
    expect(evaluateSimplifiedProfileCompletion(null).isComplete).toBe(false);
    expect(evaluateSimplifiedProfileCompletion({ name: 'Jane' }).missingFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'company_name' }),
        expect.objectContaining({ field: 'linked_in_profile_url' }),
      ]),
    );
    expect(
      evaluateSimplifiedProfileCompletion({
        name: 'Jane',
        companyName: 'Acme',
        linkedInProfileUrl: 'https://linkedin.com/oauth/foo',
      }).isComplete,
    ).toBe(false);
  });
});

describe('buildSimplifiedProfilePayload', () => {
  it('sends only simplified fields and omits all legacy hidden fields', () => {
    const payload = buildSimplifiedProfilePayload({
      companyName: 'Acme Ventures',
      industry: 'TECH',
      headline: 'Full-stack developer',
      companyWebsite: 'https://acme.com',
      linkedInProfileUrl: 'https://www.linkedin.com/in/jane-doe/',
      portfolioWebsiteLink: 'https://jane.dev',
      pitchDeckLink: '',
      youtubeVideoLink: '',
      githubProfile: '   ',
      socialMediaProfile: '',
      introductionVideoLink: '',
      // Legacy fields present in form state must never leak into the payload:
      about: 'old about',
      role: 'FOUNDER_CO_FOUNDER',
      skills: 'React, Node',
      location: 'Bengaluru',
      whyImHere: 'old bio',
      expectedRateAmountInr: '4000',
      education: 'B.Tech',
      experience: '5 years',
    });

    expect(Object.keys(payload).sort()).toEqual([
      'companyName',
      'companyWebsite',
      'headline',
      'industry',
      'linkedInProfileUrl',
      'portfolioWebsiteLink',
    ]);
    expect(payload).not.toHaveProperty('githubProfile');
    expect(payload).not.toHaveProperty('about');
    expect(payload).not.toHaveProperty('role');
    expect(payload).not.toHaveProperty('skills');
    expect(payload).not.toHaveProperty('location');
    expect(payload).not.toHaveProperty('whyImHere');
    expect(payload).not.toHaveProperty('expectedRate');
    expect(payload).not.toHaveProperty('education');
    expect(payload).not.toHaveProperty('experience');
  });

  it('omits empty optional fields and keeps required companyName', () => {
    const payload = buildSimplifiedProfilePayload({ companyName: '  Acme  ' });
    expect(payload.companyName).toBe('Acme');
    expect(payload).not.toHaveProperty('headline');
    expect(payload).not.toHaveProperty('linkedInProfileUrl');
  });

  it('sends LinkedIn URL when provided (manual fallback case)', () => {
    const payload = buildSimplifiedProfilePayload({
      companyName: 'Acme',
      linkedInProfileUrl: 'https://www.linkedin.com/in/jane/',
    }, { linkedInImported: false });
    expect(payload.linkedInProfileUrl).toBe('https://www.linkedin.com/in/jane/');
  });

  it('sends an explicit empty value ONLY for force-cleared removed link fields', () => {
    const payload = buildSimplifiedProfilePayload({
      companyName: 'Acme',
      pitchDeckLink: '',
      portfolioWebsiteLink: '',
    }, { forceClearFields: ['pitchDeckLink'] });
    expect(payload).toHaveProperty('pitchDeckLink', ''); // removed -> cleared
    expect(payload).not.toHaveProperty('portfolioWebsiteLink'); // merely empty -> untouched
    expect(payload).not.toHaveProperty('about');
    expect(payload).not.toHaveProperty('role');
  });
});

describe('formToFeaturedLinkRows / featuredLinkRowsToForm', () => {
  it('shows one row per saved link and skips empty fields', () => {
    const rows = formToFeaturedLinkRows({
      portfolioWebsiteLink: 'https://jane.dev',
      pitchDeckLink: '',
      youtubeVideoLink: 'https://youtu.be/x',
      githubProfile: '   ',
    });
    expect(rows.map((r) => r.type)).toEqual(['Portfolio', 'YouTube']);
  });

  it('round-trips rows into flat fields, clearing fields without rows', () => {
    const prevForm = {
      portfolioWebsiteLink: 'https://jane.dev',
      pitchDeckLink: 'https://drive.example/deck',
      youtubeVideoLink: '',
      githubProfile: 'https://github.com/jane',
    };
    const rows = formToFeaturedLinkRows(prevForm).map((r) => ({ ...r }));
    // Remove Portfolio row entirely and retype GitHub row as YouTube.
    const withoutPortfolio = rows.filter((r) => r.type !== 'Portfolio');
    const retyped = withoutPortfolio.map((r) => (r.type === 'GitHub' ? { ...r, type: 'YouTube' } : r));

    const nextForm = featuredLinkRowsToForm(retyped, prevForm);
    expect(nextForm.portfolioWebsiteLink).toBe(''); // removed row -> empty
    expect(nextForm.pitchDeckLink).toBe('https://drive.example/deck');
    expect(nextForm.youtubeVideoLink).toBe('https://github.com/jane'); // retyped
    expect(nextForm.githubProfile).toBe(''); // its row moved away
    expect(nextForm.companyName).toBeUndefined(); // non-link fields untouched
  });

  it('keeps legacy non-link form fields intact during reconciliation', () => {
    const prevForm = { companyName: 'Acme', headline: 'Hi', about: 'legacy-about', skills: 'React' };
    const nextForm = featuredLinkRowsToForm([{ key: 'pitchDeckLink', type: 'Pitch Deck', url: 'https://d.example' }], prevForm);
    expect(nextForm.companyName).toBe('Acme');
    expect(nextForm.headline).toBe('Hi');
    expect(nextForm.about).toBe('legacy-about');
    expect(nextForm.skills).toBe('React');
    expect(nextForm.pitchDeckLink).toBe('https://d.example');
  });
});
