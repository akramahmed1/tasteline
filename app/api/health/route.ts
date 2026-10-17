import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    // Boolean only. The key value is never exposed.
    qlooConfigured: Boolean(process.env.QLOO_API_KEY),
  });
}
