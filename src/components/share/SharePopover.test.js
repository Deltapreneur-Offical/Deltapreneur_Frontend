import { describe, expect, it } from 'vitest';
import { buildSocialLinks } from './SharePopover';

describe('buildSocialLinks', () => {
  const shareUrl = 'https://cobrother.com/s/abc123';
  const domain = 'example.com';
  const query = 'tech brand';

  it('keeps the tokenized /s/ share URL in every platform link', () => {
    const links = buildSocialLinks(shareUrl, domain, query);
    expect(links.length).toBeGreaterThanOrEqual(6);
    for (const link of links) {
      expect(link.href).toContain(encodeURIComponent(shareUrl));
    }
  });

  it('builds the marketplace-style LinkedIn share-offsite URL with title', () => {
    const [linkedin] = buildSocialLinks(shareUrl, domain, query).filter((l) => l.label === 'LinkedIn');
    expect(linkedin.href).toMatch(/^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?url=/);
    expect(linkedin.href).toContain('&title=');
  });

  it('uses the x.com intent URL for X/Twitter', () => {
    const [x] = buildSocialLinks(shareUrl, domain, query).filter((l) => l.label === 'X');
    expect(x.href).toMatch(/^https:\/\/x\.com\/intent\/tweet\?/);
  });

  it('includes Facebook sharer, WhatsApp, Gmail and Email links', () => {
    const labels = buildSocialLinks(shareUrl, domain, query).map((l) => l.label);
    expect(labels).toEqual(expect.arrayContaining(['Facebook', 'WhatsApp', 'Gmail', 'Email']));
    const [fb] = buildSocialLinks(shareUrl, domain, query).filter((l) => l.label === 'Facebook');
    expect(fb.href).toMatch(/^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/);
    const [gmail] = buildSocialLinks(shareUrl, domain, query).filter((l) => l.label === 'Gmail');
    expect(gmail.href).toMatch(/^https:\/\/mail\.google\.com\/mail\/\?view=cm/);
  });

  it('embeds the original search context in the text', () => {
    const [whatsapp] = buildSocialLinks(shareUrl, domain, query).filter((l) => l.label === 'WhatsApp');
    expect(whatsapp.href).toContain(encodeURIComponent(`Found ${domain} on CoBrother — "${query}"`));
  });
});
