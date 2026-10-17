import { NextResponse } from "next/server";
import { goalTag, resolveLoves, tasteOnInsights, withTeamAttribution } from "@/lib/qloo";
import {
  BriefItem,
  BriefResponse,
  BriefSection,
  Persona,
  Seed,
  ApiError,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function section(label: string, note: string, items: BriefItem[]): BriefSection {
  return { label, note, items };
}

const EMPTY_HINT =
  "Qloo returned nothing we could explain in taste terms. Nothing shown here is a guess.";

function briefItemToWhyOn(items: BriefItem[]): BriefItem[] {
  return items;
}

async function buildBrief(persona: Persona): Promise<BriefResponse> {
  // 1. Resolve every love (leader + team members) to Qloo entities.
  const leader = await resolveLoves(persona.loves, persona.name);
  const teamParts = await Promise.all(
    persona.team.map((m) => resolveLoves(m.loves, m.name))
  );
  const leaderSeeds = leader.seeds;
  const allSeeds: Seed[] = [...leaderSeeds];
  teamParts.forEach((p) => allSeeds.push(...p.seeds));
  const unresolved = [
    ...leader.unresolved,
    ...teamParts.flatMap((p) => p.unresolved),
  ];

  if (leaderSeeds.length === 0) {
    throw new Error(
      "None of your loves could be matched to Qloo's taste graph, so there is nothing to build taste from. Try different names."
    );
  }

  // 2. One tag from the learning goal to season the book picks.
  const tagId = await goalTag(persona.goal);

  // 3. Insights calls in parallel.
  const [
    books,
    movies,
    podcasts,
    travelPlaces,
    teamDestinations,
    teamPlaces,
  ] = await Promise.all([
    tasteOnInsights({
      type: "urn:entity:book",
      seeds: leaderSeeds,
      take: 4,
      tagId,
    }),
    tasteOnInsights({
      type: "urn:entity:movie",
      seeds: leaderSeeds,
      take: 3,
    }),
    tasteOnInsights({
      type: "urn:entity:podcast",
      seeds: leaderSeeds,
      take: 3,
    }),
    tasteOnInsights({
      type: "urn:entity:place",
      seeds: leaderSeeds,
      take: 5,
      locationQuery: persona.tripCity,
    }),
    tasteOnInsights({
      type: "urn:entity:destination",
      seeds: allSeeds,
      take: 3,
    }),
    tasteOnInsights({
      type: "urn:entity:place",
      seeds: allSeeds,
      take: 4,
      locationQuery: persona.offsiteCity,
    }),
  ]);

  // Team aggregation: simple seed aggregation across the leader and team
  // member personas. The reason for each team item names the contributing
  // person, using only Qloo explainability data (seed name, owner, affinity).
  // This is server-side generated; the client renders it verbatim.
  const teamItem = (item: BriefItem): BriefItem => withTeamAttribution(item);

  return {
    personaName: persona.name,
    learn: {
      books: section(
        "Books",
        `Seeded by ${persona.name}'s taste${tagId ? ` and the goal theme "${persona.goal}"` : ""}.`,
        books
      ),
      movies: section(
        "Films",
        "Cross-domain taste jump: what you watch, carried into what you read next.",
        movies
      ),
      podcasts: section(
        "Talks and podcasts",
        `Matching the goal "${persona.goal}" to ears you already like.`,
        podcasts
      ),
    },
    travel: {
      places: section(
        "Places in " + persona.tripCity,
        `Restaurants and neighborhoods in ${persona.tripCity} that fit ${persona.name}'s food and place affinities.`,
        travelPlaces
      ),
    },
    team: {
      destinations: section(
        "Where the team should go",
        `Offsite destinations from the combined taste of ${persona.name} and the team.`,
        teamDestinations.map(teamItem)
      ),
      places: section(
        "In " + persona.offsiteCity,
        `Venues in ${persona.offsiteCity} the whole team will actually like.`,
        teamPlaces.map(teamItem)
      ),
    },
    unresolved,
    seedCount: leaderSeeds.length,
  };
}

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
      !persona.name ||
      !Array.isArray(persona.loves) ||
      persona.loves.length === 0
    ) {
      return NextResponse.json<ApiError>(
        {
          error: "Tell me at least a name and one thing you love.",
          hint: "The brief needs taste seeds before Qloo can work.",
        },
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
    const brief = await buildBrief(persona);
    briefItemToWhyOn(brief.learn.books.items); // type anchor, no-op
    return NextResponse.json(brief);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong building the brief.";
    return NextResponse.json<ApiError>(
      { error: message, hint: "No recommendations were invented. Nothing shown is a guess." },
      { status: 502 }
    );
  }
}
