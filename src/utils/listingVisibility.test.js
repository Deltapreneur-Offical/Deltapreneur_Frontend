import { describe, expect, it } from 'vitest';
import {
  canViewListingDetail,
  filterMyListings,
  isCommunityProfilePublic,
  isListingOwner,
  isPublicMarketplaceListing,
} from './listingVisibility';

describe('listingVisibility', () => {
  it('shows verified active listings publicly', () => {
    expect(
      isPublicMarketplaceListing({
        active: true,
        status: true,
        verified: true,
      }),
    ).toBe(true);
  });

  it('hides unverified listings from the public', () => {
    expect(
      isPublicMarketplaceListing({
        active: true,
        status: true,
        verified: false,
      }, 'software'),
    ).toBe(false);
  });

  it('allows owners to see their own listing details', () => {
    const item = { active: true, status: true, verified: false, listedBy: { id: 'u1' } };
    expect(isListingOwner(item, { id: 'u1' })).toBe(true);
    expect(canViewListingDetail(item, { id: 'u1' })).toBe(true);
  });

  it('falls back to owner-scoped payloads for my listings', () => {
    const rows = [
      { id: '1', listedByUserId: null, verified: false },
      { id: '2', listedByUserId: null, verified: false },
    ];
    expect(filterMyListings(rows, { id: 'u1' })).toHaveLength(2);
  });

  it('treats admin creator rows with profileComplete as public', () => {
    expect(isCommunityProfilePublic({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'StartUptobe',
      role: 'FOUNDER_CO_FOUNDER',
      industry: 'TECH',
      profileComplete: true,
      featured: false,
    })).toBe(true);
  });

  it('considers completed creator profiles public', () => {
    const profile = {
      active: true,
      status: true,
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
    expect(isCommunityProfilePublic(profile)).toBe(true);
  });

  it('considers basic creator profiles with only 8 core fields public', () => {
    const profile = {
      active: true,
      status: true,
      name: 'Jane',
      role: 'STUDENT',
      industry: 'TECH',
      skills: 'React,TypeScript',
      location: 'Bengaluru',
      linked_in_id: 'sub-123',
      why_im_here: 'Build',
      expected_price: '5000/month',
    };
    expect(isCommunityProfilePublic(profile)).toBe(true);
  });
});
