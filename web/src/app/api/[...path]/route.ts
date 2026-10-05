import { forward } from '@/lib/proxy';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: Request, { params }: Context): Promise<Response> {
  const { path } = await params;
  return forward(request, `/api/${path.map(encodeURIComponent).join('/')}`);
}

export const GET = handle;
export const POST = handle;
