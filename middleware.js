// Vercel Routing Middleware: password-protects the whole site with HTTP Basic Auth.
// Set SITE_PASSWORD in Vercel project settings. Any username works.
// If SITE_PASSWORD is not set, every request is refused, so the site never goes public by accident.
export const config = { matcher: '/:path*' };

export default function middleware(request) {
  const password = process.env.SITE_PASSWORD;
  const header = request.headers.get('authorization') || '';
  if (password && header.startsWith('Basic ')) {
    let decoded = '';
    try { decoded = atob(header.slice(6)); } catch (e) { decoded = ''; }
    const given = decoded.slice(decoded.indexOf(':') + 1);
    if (given === password) return; // allow the request through
  }
  return new Response('Tantu internal preview. Sign in to continue.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Tantu internal preview", charset="UTF-8"' },
  });
}
