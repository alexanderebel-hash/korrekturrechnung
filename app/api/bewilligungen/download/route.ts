import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Keine URL angegeben' },
        { status: 400 }
      );
    }

    // Datei von Vercel Blob herunterladen
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Fehler beim Abrufen der Datei');
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment',
      },
    });
  } catch (error: any) {
    console.error('Blob download error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
