import { NextResponse } from "next/server";

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, exchange = "NSE" } = body;

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      );
    }

    // Call the Python AI engine
    const response = await fetch(`${AI_ENGINE_URL}/api/signals/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, exchange }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || "AI engine error" },
        { status: response.status }
      );
    }

    const signal = await response.json();
    return NextResponse.json(signal);
  } catch (error) {
    // If AI engine is not running, return a demo signal
    const body = await request.clone().json().catch(() => ({ symbol: "UNKNOWN" }));
    return NextResponse.json({
      symbol: body.symbol || "UNKNOWN",
      exchange: body.exchange || "NSE",
      signal_type: "hold",
      confidence_score: 0,
      prices: {},
      reasoning: { error: "AI engine is not running. Start it with: cd ai-engine && python main.py" },
      debate_summary: null,
      risk_notes: "AI engine offline",
      agents: {},
      processing_time_ms: 0,
    });
  }
}
