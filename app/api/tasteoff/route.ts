import { NextResponse } from "next/server";
import { resolveLoves, tasteOffBooks, tasteOnInsights } from "@/lib/qloo";
import { ApiError, Persona, TasteOffResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Why Qloo Matters: same persona, taste ON (Qloo-grounded books) vs
// taste OFF (popularity-only books, honestly labeled). No LLM is used on
// either side; the OFF side is Qloo with no personal signal.
export async function POST(req: Request) {
  try {
    let persona: Persona;
    try {
      persona = (await req.json()) as Persona;
    } catch {
      return NextResponse.json<ApiError>(
        { error: "That request did not include a valid persona." },
        { status: 400 }
      );
    }
    if (
      !persona ||
      !Array.isArray(persona.loves) ||
      persona.loves.length === 0
    ) {
      return NextResponse.json<ApiError>(
        { error: "Taste needs something to work with. Add at least one love." },
        { status: 400 }
      );
    }
    if (!process.env.QLOO_API_KEY) {
      return NextResponse.json<ApiError>(
        {
          error: "TasteLine is not connected to Qloo on this server.",
          hint: "The QLOO_API_KEY environment variable is missing.",
        },
        { status: 500 }
      );
    }

    const { seeds, unresolved } = await resolveLoves(persona.loves, persona.name);
    const [on, off] = await Promise.all([
      tasteOnInsights({
        type: "urn:entity:book",
        seeds,
        take: 5,
      }),
      tasteOffBooks(5),
    ]);

    const onNames = new Set(on.map((i) => i.entity_id));
    const overlap = off.filter((b) => onNames.has(b.entity_id)).length;
    const verdict =
      `Taste ON returned ${on.length} books grounded in ${persona.name}'s affinities, ` +
      `each carrying a taste reason. Taste OFF returned ${off.length} popularity-only ` +
      `bestsellers with zero personal signal. Overlap: ${overlap} item${overlap === 1 ? "" : "s"}. ` +
      `That gap is what Qloo adds.`;

    const body: TasteOffResponse = { on, off, verdict, unresolved };
    return NextResponse.json(body);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong running the comparison.";
    return NextResponse.json<ApiError>({ error: message }, { status: 502 });
  }
}
