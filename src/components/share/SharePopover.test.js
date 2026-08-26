import { describe, expect, it } from 'vitest';
import { buildShareMessage, buildSocialLinks } from './SharePopover';

const shareUrl = 'https://cobrother.com/s/abc123';
const domain = 'donka.in';

describe('buildShareMessage', () => {
  it('builds the Standard + Available message with live price', () => {
    const msg = buildShareMessage({
      domain,
      shareUrl,
      availability: { status: 'available', is_premium: false, price_inr: 550 },
    });
    expect(msg).toBe(
      [
        '🚀 Check out donka.in on HubRegistrar!',
        '',
        '🌐 Standard Domain',
        '✅ Available',
        '💰 ₹550/yr',
        '',
        '🔗 https://cobrother.com/s/abc123',
      ].join('\n'),
    );
  });

  it('builds the Premium + Available message with premium price', () => {
    const msg = buildShareMessage({
      domain: 'batterify.com',
      shareUrl,
      availability: { status: 'available', is_premium: true, price_inr: 1250000.5 },
    });
    expect(msg).toContain('✦ Premium Domain');
    expect(msg).toContain('✅ Available');
    expect(msg).toContain('💰 ₹12,50,000.50 (1st Year)');
    expect(msg).toContain('🔗 https://cobrother.com/s/abc123');
    expect(msg).not.toContain('Standard Domain');
  });

  it('builds the Standard + Taken message without a price', () => {
    const msg = buildShareMessage({
      domain: 'google.com',
      shareUrl,
      availability: { status: 'taken', is_premium: false, price_inr: null },
    });
    expect(msg).toContain('🚀 Check out google.com on HubRegistrar!');
    expect(msg).toContain('🌐 Domain');
    expect(msg).toContain('❌ Currently unavailable');
    expect(msg).not.toContain('✅ Available');
    expect(msg).not.toContain('💰');
  });

  it('degrades gracefully when live availability is unknown', () => {
    const msg = buildShareMessage({ domain, shareUrl, availability: null });
    expect(msg).toBe(
      ['🚀 Check out donka.in on HubRegistrar!', '', '🔗 https://cobrother.com/s/abc123'].join('\n'),
    );
    expect(msg).not.toContain('Standard Domain');
    expect(msg).not.toContain('Premium Domain');
  });
});

describe('buildSocialLinks', () => {
  const availability = { status: 'available', is_premium: false, price_inr: 550 };
  const richText = buildShareMessage({ domain, shareUrl, availability });

  it('keeps the tokenized /s/ share URL in every platform link', () => {
    const links = buildSocialLinks(shareUrl, domain, availability);
    expect(links.length).toBeGreaterThanOrEqual(6);
    for (const link of links) {
      expect(link.href).toContain(encodeURIComponent(shareUrl));
    }
  });

  it('prefills WhatsApp with the rich message', () => {
    const [wa] = buildSocialLinks(shareUrl, domain, availability).filter((l) => l.label === 'WhatsApp');
    expect(wa.href).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(wa.href)).toContain(richText);
    expect(decodeURIComponent(wa.href)).toContain('🌐 Standard Domain');
  });

  it('prefills X with the rich message', () => {
    const [x] = buildSocialLinks(shareUrl, domain, availability).filter((l) => l.label === 'X');
    expect(x.href).toMatch(/^https:\/\/x\.com\/intent\/tweet\?/);
    expect(decodeURIComponent(x.href)).toContain(richText);
  });

  it('prefills Telegram with url + rich text', () => {
    const [tg] = buildSocialLinks(shareUrl, domain, availability).filter((l) => l.label === 'Telegram');
    expect(tg.href).toMatch(/^https:\/\/t\.me\/share\/url\?url=/);
    expect(tg.href).toContain('&text=');
    expect(decodeURIComponent(tg.href)).toContain(richText);
  });

  it('keeps Facebook URL-only (no prefilled composer text)', () => {
    const [fb] = buildSocialLinks(shareUrl, domain, availability).filter((l) => l.label === 'Facebook');
    expect(fb.href).toMatch(/^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/);
    expect(fb.href).not.toContain('text=');
    expect(fb.href).not.toContain('quote=');
  });

  it('keeps LinkedIn share-offsite URL + title (no composer prefill)', () => {
    const [li] = buildSocialLinks(shareUrl, domain, availability).filter((l) => l.label === 'LinkedIn');
    expect(li.href).toMatch(/^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?url=/);
    expect(li.href).toContain('&title=');
    expect(li.href).not.toContain('&text=');
  });

  it('prefills Gmail and Email subject + body with the rich message', () => {
    const [gmail] = buildSocialLinks(shareUrl, domain, availability).filter((l) => l.label === 'Gmail');
    expect(gmail.href).toMatch(/^https:\/\/mail\.google\.com\/mail\/\?view=cm/);
    expect(gmail.href).toContain('&su=');
    expect(gmail.href).toContain('&body=');
    expect(decodeURIComponent(gmail.href)).toContain(richText);

    const [email] = buildSocialLinks(shareUrl, domain, availability).filter((l) => l.label === 'Email');
    expect(email.href).toMatch(/^mailto:\?subject=/);
    expect(email.href).toContain('&body=');
    expect(decodeURIComponent(email.href)).toContain(richText);
  });

  it('never hardcodes domain/price/premium values', () => {
    const msg = buildShareMessage({
      domain: 'solenim.io',
      shareUrl,
      availability: { status: 'available', is_premium: true, price_inr: 8999999.75 },
    });
    expect(msg).toContain('solenim.io');
    expect(msg).toContain('₹89,99,999.75 (1st Year)');
    expect(msg).not.toContain('donka.in');
    expect(msg).not.toContain('550');
  });
});
