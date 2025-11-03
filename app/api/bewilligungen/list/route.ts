import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    // Vercel stellt die Token automatisch bereit wenn Blob Store verbunden ist
    const { blobs } = await list({
      prefix: 'bewilligungen/',
    });

    const bewilligungen = blobs.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      filename: blob.pathname.replace('bewilligungen/', ''),
      uploadedAt: blob.uploadedAt,
      size: blob.size,
    }));

    return NextResponse.json({ success: true, bewilligungen });
  } catch (error: any) {
    console.error('Blob list error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
