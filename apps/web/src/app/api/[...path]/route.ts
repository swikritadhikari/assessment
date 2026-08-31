import { NextRequest, NextResponse } from 'next/server';

const getApiBase = (): string => {
  return (process.env.API_INTERNAL_URL || 'http://localhost:4000').replace(/\/+$/, '');
};

const handleProxy = async (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) => {
  const { path } = await params;
  const targetPath = path.join('/');
  const apiBase = getApiBase();
  const search = req.nextUrl.search;
  const targetUrl = `${apiBase}/api/${targetPath}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'connection') {
      headers.set(key, value);
    }
  });

  const method = req.method;
  const isBodyAllowed = method !== 'GET' && method !== 'HEAD';

  let body: BodyInit | null = null;
  if (isBodyAllowed) {
    body = await req.arrayBuffer();
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: 'manual'
    });

    const responseHeaders = new Headers();
    upstreamRes.headers.forEach((value, key) => {
      responseHeaders.set(key, value);
    });

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders
    });
  } catch (err) {
    console.error(`[Proxy Error] Failed to proxy to ${targetUrl}:`, err);
    return NextResponse.json(
      { error: 'Bad Gateway', message: 'Failed to connect to backend API server' },
      { status: 502 }
    );
  }
};

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
export const OPTIONS = handleProxy;
