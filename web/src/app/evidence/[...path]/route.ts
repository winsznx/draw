import { forward } from '@/lib/proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await params;
  return forward(request, `/evidence/${path.map(encodeURIComponent).join('/')}`);
}
