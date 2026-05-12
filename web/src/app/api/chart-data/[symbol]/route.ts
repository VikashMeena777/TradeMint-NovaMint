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
    const period = url.searchParams.get("period") || "6mo";

    const response = await fetch(
      `${AI_ENGINE_URL}/api/chart-data/${symbol}?exchange=${exchange}&period=${period}`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch chart data" }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ error: "AI engine not reachable" }, { status: 503 });
  }
}
