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