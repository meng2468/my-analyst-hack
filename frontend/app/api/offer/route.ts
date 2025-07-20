import { NextRequest, NextResponse } from 'next/server';

// This should point to your actual backend server
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7860';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward the request to the actual backend server
    const response = await fetch(`${BACKEND_URL}/api/offer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Backend server responded with status: ${response.status}`);
    }

    const answer = await response.json();
    return NextResponse.json(answer);
  } catch (error) {
    console.error('Error processing offer:', error);
    return NextResponse.json(
      { error: 'Failed to process offer', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
} 


export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Simulate transcript lines as a demonstration (replace with your backend/eventbus)
  async function* transcriptStream() {
    let counter = 1;
    while (counter <= 1000) {
      yield encoder.encode(`data:Transcript line ${counter}\n\n`);
      await new Promise(res => setTimeout(res, 1500));
      counter += 1;
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of transcriptStream()) {
        controller.enqueue(chunk);
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    }
  });
}