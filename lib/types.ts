// Shared domain types for TasteLine. Safe to import on the client:
// this file never touches the Qloo API key.

export interface TeamMember {
  name: string;
  role: string;
  loves: string[];
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  industry: string;
  goal: string;
  tripCity: string;
  offsiteCity: string;
  loves: string[];
  team: TeamMember[];
}

export interface Seed {
  name: string; // the typed name the user gave
  entity_id: string; // resolved Qloo entity id
  types: string[];
  owner: string; // persona or team member name, for the Team section
}

// One taste-grounded recommendation. Built only when Qloo's
// explainability maps the item back to seed entities.
export interface BriefItem {
  name: string;
  entity_id: string;
  type: string;
  affinity: number;
  reason: string;
  seedName: string; // display name of the contributing seed
  seedOwner: string; // who loves the seed (team section)
  tags: string[];
}

export interface BriefSection {
  label: string;
  note: string;
  items: BriefItem[];
}

export interface BriefResponse {
  personaName: string;
  learn: { books: BriefSection; movies: BriefSection; podcasts: BriefSection };
  travel: { places: BriefSection };
  team: { destinations: BriefSection; places: BriefSection };
  unresolved: string[];
  seedCount: number;
}

export interface TasteOffResponse {
  on: BriefItem[];
  off: { name: string; entity_id: string; affinity: number }[];
  verdict: string;
  unresolved: string[];
}

export interface ApiError {
  error: string;
  hint?: string;
}

// Honesty rule: our team aggregation is simple seed aggregation across
// personas. Say this everywhere the Team section is described.
export const TEAM_METHOD_NOTE =
  "Method: we combine each member's taste seeds into one Qloo signal and show who contributed to each pick. Simple aggregation, no proprietary algorithm.";
