import 'server-only';

// The DRAW API runs on the VPS. The browser only ever talks to this origin;
// the worker forwards the request with a service token the VPS requires, so
// the API is not reachable except through this site.
const FORWARDED_HEADERS = ['content-type', 'x-draw-access', 'x-draw-tour'];

// How long the API may take to start answering. An action can wait in the
// API's queue behind other visitors' actions, so it gets longer than a read.
// The limit ends once the answer starts, so a large evidence file still
// streams in full.
const READ_LIMIT_MS = 20_000;
const ACTION_LIMIT_MS = 130_000;

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
  const reads = request.method === 'GET' || request.method === 'HEAD';
  const limit = new AbortController();
  const timer = setTimeout(() => limit.abort(), reads ? READ_LIMIT_MS : ACTION_LIMIT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(`${apiBase()}${path}${incoming.search}`, {
      method: request.method,
      headers,
      body: reads ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
      signal: limit.signal,
    });
  } catch {
    if (limit.signal.aborted) {
      const error = reads
        ? 'The DRAW API did not answer in time. Try again in a minute.'
        : 'The DRAW API did not answer in time. The action may still finish. Refresh in a minute to see whether it did.';
      return Response.json({ error }, { status: 504, headers: { 'cache-control': 'no-store' } });
    }
    return Response.json({ error: 'The DRAW API is not reachable right now. Try again in a minute.' }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
  // A stopped API behind the VPS's web server answers with an empty 502. The
  // page gets an answer it can read instead. An action may already be on the
  // ledger when the API stops, so its answer doesn't suggest trying again.
  if (upstream.status >= 500 && !upstream.headers.get('content-type')?.includes('application/json')) {
    const error = reads
      ? 'The DRAW API is not answering right now. Try again in a minute.'
      : 'The DRAW API stopped answering, so DRAW cannot tell whether this went through. Refresh in a minute to see.';
    return Response.json({ error }, { status: upstream.status, headers: { 'cache-control': 'no-store' } });
  }
  const response = new Headers({ 'cache-control': 'no-store' });
  for (const name of ['content-type', 'retry-after']) {
    const value = upstream.headers.get(name);
    if (value) response.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: response });
}
