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
    const period = url.searchParams.get("period") || "1mo";

    const response = await fetch(
      `${AI_ENGINE_URL}/api/market-data/${symbol}?exchange=${exchange}&period=${period}`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch market data" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "AI engine not reachable" },
      { status: 503 }
    );
  }
}
