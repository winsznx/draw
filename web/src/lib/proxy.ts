import 'server-only';

// The DRAW API runs on the VPS. The browser only ever talks to this origin;
// the worker forwards the request with a service token the VPS requires, so
// the API is not reachable except through this site.
const FORWARDED_HEADERS = ['content-type', 'x-draw-access', 'x-draw-tour'];

// The visitor's address, for the API's per-visitor action limit. Only
// Cloudflare's own header is used, since a browser can send any other one.
const visitorAddress = (request: Request): string | null => request.headers.get('cf-connecting-ip');

export function apiBase(): string {
  const base = process.env.DRAW_API_URL;
  if (!base) throw new Error('DRAW_API_URL is not set on the server.');
  return base.replace(/\/$/, '');
}

export function serviceHeaders(): Record<string, string> {
  const token = process.env.DRAW_SERVICE_TOKEN;
  return token ? { 'x-draw-service': token } : {};
}

export async function forward(request: Request, path: string): Promise<Response> {
  const incoming = new URL(request.url);
  const headers = new Headers(serviceHeaders());
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const visitor = visitorAddress(request);
  if (visitor) headers.set('x-draw-client-ip', visitor);
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase()}${path}${incoming.search}`, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
    });
  } catch {
    return Response.json({ error: 'The DRAW API is not reachable right now. Try again in a minute.' }, { status: 502 });
  }
  const response = new Headers({ 'cache-control': 'no-store' });
  for (const name of ['content-type', 'retry-after']) {
    const value = upstream.headers.get(name);
    if (value) response.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: response });
}
