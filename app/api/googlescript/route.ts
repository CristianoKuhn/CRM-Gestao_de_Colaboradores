import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  if (!action) {
    return NextResponse.json({ success: false, message: 'Ação não especificada.' }, { status: 400 });
  }

  try {
    const scriptUrl =
      request.headers.get('x-google-script-url') ||
      process.env.GOOGLE_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbz8iGKX9f9VNECQL1fcQttiMaEuT3a61YS3hE3HYi13SUvx3ShxF3RF69u7LkQhac0V/exec';

    const url = new URL(scriptUrl);
    url.searchParams.set('action', action);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[api/googlescript] Erro:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (!action) {
      return NextResponse.json({ success: false, message: 'Ação não especificada.' }, { status: 400 });
    }

    const scriptUrl =
      request.headers.get('x-google-script-url') ||
      process.env.GOOGLE_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbz8iGKX9f9VNECQL1fcQttiMaEuT3a61YS3hE3HYi13SUvx3ShxF3RF69u7LkQhac0V/exec';

    const url = new URL(scriptUrl);
    url.searchParams.set('action', action);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[api/googlescript] Erro:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno.' },
      { status: 500 }
    );
  }
}
