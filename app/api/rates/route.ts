import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to parameters' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Exchange rate API returned ${res.status}.` }, { status: 502 });
    }

    const data = await res.json();
    const rate = data.rates?.[to.toUpperCase()];

    if (rate === undefined || rate === null) {
      return NextResponse.json({ error: `Rate not available for ${from} → ${to}.` }, { status: 404 });
    }

    if (typeof rate !== 'number' || rate <= 0) {
      return NextResponse.json({ error: `Invalid rate value: ${rate}` }, { status: 502 });
    }

    return NextResponse.json({ rate });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Exchange rate request timed out.' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Failed to fetch exchange rate.' }, { status: 502 });
  }
}
