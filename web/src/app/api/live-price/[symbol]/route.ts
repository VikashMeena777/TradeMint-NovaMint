import { NextResponse } from "next/server";

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://localhost:8000";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;

  try {
    const url = new URL(request.url);
    const exchange = url.searchParams.get("exchange") || "NSE";

    const response = await fetch(
      `${AI_ENGINE_URL}/api/live-price/${symbol}?exchange=${exchange}`,
      { next: { revalidate: 10 } } // Cache for 10 seconds
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Price not available" }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: "AI engine not reachable" }, { status: 503 });
  }
}
