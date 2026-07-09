export async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const acceptHeader = request.headers.get('accept') || '';
  const isCrawler = /facebookexternalhit|WhatsApp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|googlebot|bingbot|opengraph|OpenGraphXYZBot/i.test(userAgent) || !acceptHeader.includes('html');
  
  if (isCrawler) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    let listingType = null;
    let listingId = null;
    
    if (pathname.startsWith('/ventures/deals/')) {
      listingType = 'deals';
      listingId = pathname.split('/').pop();
    } else if (pathname.startsWith('/ventures/')) {
      listingType = 'ventures';
      listingId = pathname.split('/').pop();
    } else if (pathname.startsWith('/domains/')) {
      listingType = 'domains';
      listingId = pathname.split('/').pop();
    } else if (pathname === '/domains') {
      listingId = url.searchParams.get('id') || url.searchParams.get('highlight');
      if (listingId) listingType = 'domains';
    } else if (pathname.startsWith('/technology/auction/')) {
      listingType = 'technology-auction';
      listingId = pathname.split('/').pop();
    } else if (pathname.startsWith('/technology/')) {
      listingType = 'technology';
      listingId = pathname.split('/').pop();
    } else if (pathname === '/technology') {
      listingId = url.searchParams.get('id');
      if (listingId) listingType = 'technology';
    } else if (pathname.startsWith('/auction/')) {
      listingType = 'auction';
      listingId = pathname.split('/').pop();
    } else if (pathname === '/auctions') {
      listingId = url.searchParams.get('id');
      if (listingId) listingType = 'auction';
    } else if (pathname.startsWith('/creator-auction/')) {
      listingType = 'creator-auction';
      listingId = pathname.split('/').pop();
    } else if (pathname.startsWith('/software-auction/')) {
      listingType = 'technology-auction';
      listingId = pathname.split('/').pop();
    }
    
    // UUID pattern matching
    if (listingType && listingId && /^[0-9a-fA-F-]{36}$/.test(listingId)) {
      const backendUrl = process.env.VITE_API_URL || 'https://cobrother-backend.onrender.com';
      try {
        const res = await fetch(`${backendUrl}/api/v1/public/share-preview/${listingType}/${listingId}`);
        if (res.ok) {
          const html = await res.text();
          return new Response(html, {
            headers: { 'content-type': 'text/html; charset=utf-8' }
          });
        }
      } catch (err) {
        // Fallback to default behavior on error
      }
    }
  }
}
