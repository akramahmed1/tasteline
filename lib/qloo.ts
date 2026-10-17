// Server-only Qloo client. Never import this from a client component:
// the API key must stay server-side.
//
// Verified API contract (tested live 2026-10-17, hackathon build window):
// - Base: https://hackathon.api.qloo.com
// - Auth header: X-Api-Key
// - Never use /recommendations or /recs (terms); use /search and /v2/insights.
// - Do not persist cached Qloo response data (terms); in-request caching only.
import { BriefItem, Seed } from "./types";

const FETCH_TIMEOUT_MS = 20_000;

function qlooConfig() {
  const key = process.env.QLOO_API_KEY;
  const base = process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com";
  if (!key) {
    throw new Error("QLOO_API_KEY is not set. Add it to .env.local first.");
  }
  return { key, base };
}

async function qlooFetch<T>(path: string): Promise<T> {
  const { key, base } = qlooConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { "X-Api-Key": key, Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Qloo request failed (${res.status}): ${text.slice(0, 200)}`
      );
    }
    return (await res.json()) as T;
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new Error("Qloo took too long to answer. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- types ----
interface SearchResult {
  name: string;
  entity_id: string;
  types?: string[];
  popularity?: number;
  tags?: { name?: string }[];
}

interface InsightsEntity {
  name: string;
  entity_id: string;
  types?: string[];
  popularity?: number;
  properties?: Record<string, unknown>;
  tags?: { name?: string }[];
  query?: {
    affinity?: number;
    explainability?: {
      "signal.interests.entities"?: { entity_id: string; score?: number }[];
    };
  };
}

interface InsightsResponse {
  results?: { entities?: InsightsEntity[] };
}

interface TagsResponse {
  results?: { tags?: { id: string; name?: string }[] };
}

// Note: "urn:entity:restaurant" is NOT a valid /search types filter value
// (API rejects it). Restaurants and venues resolve as urn:entity:place.
const SEARCH_TYPES = [
  "urn:entity:artist",
  "urn:entity:movie",
  "urn:entity:book",
  "urn:entity:place",
  "urn:entity:destination",
  "urn:entity:person",
  "urn:entity:podcast",
].join(",");

// ------------------------------------------------------------- resolution --
export async function resolveLoves(
  loves: string[],
  owner: string
): Promise<{ seeds: Seed[]; unresolved: string[] }> {
  const seeds: Seed[] = [];
  const unresolved: string[] = [];
  // Resolve sequentially: names are few, and it keeps behavior deterministic.
  for (const love of loves) {
    const trimmed = love.trim();
    if (!trimmed) continue;
    try {
      const data = await qlooFetch<{ results?: SearchResult[] }>(
        `/search?query=${encodeURIComponent(trimmed)}&types=${encodeURIComponent(
          SEARCH_TYPES
        )}&take=3`
      );
      const first = data.results?.[0];
      if (first?.entity_id) {
        seeds.push({
          name: trimmed,
          entity_id: first.entity_id,
          types: first.types ?? [],
          owner,
        });
      } else {
        unresolved.push(trimmed);
      }
    } catch {
      unresolved.push(trimmed);
    }
  }
  return { seeds, unresolved };
}

export async function goalTag(keyword: string): Promise<string | null> {
  try {
    const data = await qlooFetch<TagsResponse>(
      `/v2/tags?filter.query=${encodeURIComponent(keyword)}&take=3`
    );
    return data.results?.tags?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------- insights --
export interface InsightsOptions {
  type: string; // e.g. urn:entity:book
  seeds: Seed[];
  take: number;
  tagId?: string | null;
  locationQuery?: string;
}

function prettyType(urn: string): string {
  const last = urn.split(":").pop() ?? urn;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

// Build a taste-grounded item from one Qloo entity. Returns null when Qloo
// cannot explain the item in taste terms (no explainability contribution).
// No reason, no recommendation: the same discipline as the rules require.
function toBriefItem(
  entity: InsightsEntity,
  seedsById: Map<string, Seed>,
  typeLabel: string
): BriefItem | null {
  const contributions =
    entity.query?.explainability?.["signal.interests.entities"] ?? [];
  let best: { entity_id: string; score?: number } | null = null;
  for (const c of contributions) {
    if (seedsById.has(c.entity_id) && (!best || (c.score ?? 0) > (best.score ?? 0))) {
      best = c;
    }
  }
  if (!best) return null;
  const seed = seedsById.get(best.entity_id)!;
  const affinity = entity.query?.affinity ?? 0;
  const tags = (entity.tags ?? []).map((t) => t.name).filter(Boolean) as string[];
  return {
    name: entity.name,
    entity_id: entity.entity_id,
    type: prettyType(typeLabel),
    affinity: Math.round(affinity * 10000) / 10000,
    reason: `Because your affinity for ${seed.name} connects here (affinity ${affinity.toFixed(2)})`,
    seedName: seed.name,
    seedOwner: seed.owner,
    tags: tags.slice(0, 4),
  };
}

export async function tasteOnInsights(
  opts: InsightsOptions
): Promise<BriefItem[]> {
  if (opts.seeds.length === 0) return [];
  const ids = opts.seeds.map((s) => s.entity_id).join(",");
  const params = new URLSearchParams({
    "filter.type": opts.type,
    "signal.interests.entities": ids,
    "feature.explainability": "true",
    take: String(opts.take),
  });
  if (opts.tagId) params.set("signal.interests.tags", opts.tagId);
  if (opts.locationQuery) params.set("filter.location.query", opts.locationQuery);
  const data = await qlooFetch<InsightsResponse>(
    `/v2/insights?${params.toString()}`
  );
  const seedsById = new Map(opts.seeds.map((s) => [s.entity_id, s]));
  const items: BriefItem[] = [];
  for (const entity of data.results?.entities ?? []) {
    const item = toBriefItem(entity, seedsById, opts.type);
    if (item) items.push(item);
  }
  return items;
}

// Team attribution: rephrase the server-generated reason to name the
// contributing team member. The seed name, owner, and affinity all come
// from Qloo explainability data; this function never invents a reason.
// The frontend renders item.reason verbatim, per the sync contract.
export function withTeamAttribution(item: BriefItem): BriefItem {
  return {
    ...item,
    reason: `Because ${item.seedOwner}'s affinity for ${item.seedName} connects here (affinity ${item.affinity.toFixed(2)})`,
  };
}

// Taste-OFF baseline: popularity-only books, no personal signal at all.
// Shown honestly in the UI as "popularity-only, no taste signal".
export async function tasteOffBooks(
  take = 5
): Promise<{ name: string; entity_id: string; affinity: number }[]> {
  const data = await qlooFetch<InsightsResponse>(
    `/v2/insights?filter.type=urn:entity:book&filter.popularity.min=0.95&take=${take}`
  );
  return (data.results?.entities ?? []).map((e) => ({
    name: e.name,
    entity_id: e.entity_id,
    affinity: Math.round((e.query?.affinity ?? 0) * 10000) / 10000,
  }));
}
