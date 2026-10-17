"use client";

import { useState } from "react";
import { SAMPLE_PERSONAS } from "@/lib/personas";
import {
  ApiError,
  BriefItem,
  BriefResponse,
  BriefSection,
  Persona,
  TasteOffResponse,
  TEAM_METHOD_NOTE,
  TeamMember,
} from "@/lib/types";

const EMPTY_HINT =
  "Qloo returned nothing we could explain in taste terms for this part. Nothing shown here is a guess.";

function parseTeam(text: string): TeamMember[] {
  const members: TeamMember[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    const name = trimmed.slice(0, colon).trim();
    const loves = trimmed
      .slice(colon + 1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (name && loves.length > 0) {
      members.push({ name, role: "Team member", loves });
    }
  }
  return members;
}

function SectionView({ section }: { section: BriefSection }) {
  if (section.items.length === 0) {
    return (
      <div className="empty-section">
        <strong>{section.label}.</strong> {EMPTY_HINT}
      </div>
    );
  }
  return (
    <div className="item-grid">
      {section.items.map((item) => (
        <article key={item.entity_id} className="item-card">
          <span className="type-chip">{item.type}</span>
          <h4 className="serif">{item.name}</h4>
          <p className="affinity">Affinity {item.affinity.toFixed(2)}</p>
          <p className="reason">{item.reason}</p>
          <p className="seed">
            Seeded from {item.seedName}
            {item.seedOwner ? `, loved by ${item.seedOwner}` : ""}
          </p>
          {item.tags.length > 0 && (
            <p className="tags">{item.tags.join(" · ")}</p>
          )}
        </article>
      ))}
    </div>
  );
}

function BriefView({ brief }: { brief: BriefResponse }) {
  return (
    <div>
      <div className="brief-head">
        <h2 className="serif">The brief for {brief.personaName}</h2>
        <p>
          Every item below carries a Qloo taste reason. Built from{" "}
          {brief.seedCount} resolved taste seeds.
        </p>
        {brief.unresolved.length > 0 && (
          <p className="unresolved-note">
            Could not resolve on Qloo's taste graph, so skipped:{" "}
            {brief.unresolved.join(", ")}.
          </p>
        )}
      </div>

      <div className="brief-section">
        <h3 className="serif">Learn</h3>
        <p className="note">{brief.learn.books.note}</p>
        <SectionView section={brief.learn.books} />
        <p className="note" style={{ marginTop: 20 }}>
          {brief.learn.movies.note}
        </p>
        <SectionView section={brief.learn.movies} />
        <p className="note" style={{ marginTop: 20 }}>
          {brief.learn.podcasts.note}
        </p>
        <SectionView section={brief.learn.podcasts} />
      </div>

      <div className="brief-section">
        <h3 className="serif">Travel</h3>
        <p className="note">{brief.travel.places.note}</p>
        <SectionView section={brief.travel.places} />
      </div>

      <div className="brief-section">
        <h3 className="serif">Team offsite</h3>
        <p className="note">
          {brief.team.destinations.note} {TEAM_METHOD_NOTE}
        </p>
        <SectionView section={brief.team.destinations} />
        <p className="note" style={{ marginTop: 20 }}>
          {brief.team.places.note}
        </p>
        <SectionView section={brief.team.places} />
      </div>
    </div>
  );
}

export default function Home() {
  const [persona, setPersona] = useState<Persona>(SAMPLE_PERSONAS[0]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [tasteOff, setTasteOff] = useState<TasteOffResponse | null>(null);
  const [tasteOffLoading, setTasteOffLoading] = useState(false);

  // build-your-own form fields
  const [fName, setFName] = useState("");
  const [fRole, setFRole] = useState("");
  const [fIndustry, setFIndustry] = useState("");
  const [fGoal, setFGoal] = useState("");
  const [fTrip, setFTrip] = useState("");
  const [fOffsite, setFOffsite] = useState("");
  const [fLoves, setFLoves] = useState("");
  const [fTeam, setFTeam] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function generate(p: Persona) {
    setLoading(true);
    setError(null);
    setBrief(null);
    setTasteOff(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as ApiError).error || "The brief failed.");
      }
      setBrief(data as BriefResponse);
      document
        .getElementById("brief-anchor")
        ?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The brief failed.");
    } finally {
      setLoading(false);
    }
  }

  async function runTasteOff() {
    setTasteOffLoading(true);
    setTasteOff(null);
    try {
      const res = await fetch("/api/tasteoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(persona),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as ApiError).error || "The comparison failed.");
      }
      setTasteOff(data as TasteOffResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The comparison failed.");
    } finally {
      setTasteOffLoading(false);
    }
  }

  function submitForm() {
    const loves = fLoves
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!fName.trim()) {
      setFormError("Give your leader a name.");
      return;
    }
    if (loves.length === 0) {
      setFormError("List at least one thing they love, separated by commas.");
      return;
    }
    setFormError(null);
    const custom: Persona = {
      id: "custom-" + Date.now(),
      name: fName.trim(),
      role: fRole.trim() || "Executive",
      industry: fIndustry.trim() || "General",
      goal: fGoal.trim() || "staying sharp",
      tripCity: fTrip.trim() || "New York",
      offsiteCity: fOffsite.trim() || fTrip.trim() || "New York",
      loves: loves.slice(0, 8),
      team: parseTeam(fTeam),
    };
    setPersona(custom);
    setShowForm(false);
    generate(custom);
  }

  const allPersonas = [...SAMPLE_PERSONAS];
  if (!allPersonas.some((p) => p.id === persona.id)) {
    allPersonas.push(persona);
  }

  return (
    <div className="wrap">
      <header className="masthead">
        <h1 className="wordmark serif">
          Taste<span className="rule">|</span>Line
        </h1>
        <p className="tagline">Powered by Qloo's taste graph</p>
      </header>

      <section className="hero">
        <h1 className="serif">
          A learning concierge with taste, not just answers.
        </h1>
        <p className="lede">
          TasteLine plans an executive's learning, work travel, and team
          offsite from the culture they already love. Every recommendation
          carries a Qloo taste reason. Remove Qloo, and the whole thing stops
          working.
        </p>
        <button
          className="btn"
          onClick={() => {
            setPersona(SAMPLE_PERSONAS[0]);
            generate(SAMPLE_PERSONAS[0]);
          }}
          disabled={loading}
        >
          {loading ? "Building the brief..." : "Run the 60-second demo"}
        </button>
        <p className="hint">
          Zero typing, zero signup. A full brief for a sample leader in under a
          minute.
        </p>
      </section>

      <section>
        <h2 className="section-title serif">Choose a leader</h2>
        <p className="section-sub">
          Three sample executives, each with a real team. Or build your own.
        </p>
        <div className="persona-grid">
          {allPersonas.map((p) => (
            <button
              key={p.id}
              className={`persona-card${persona.id === p.id ? " active" : ""}`}
              onClick={() => setPersona(p)}
            >
              <h3 className="serif">{p.name}</h3>
              <p className="roleline">
                {p.role} · {p.industry}
              </p>
              <p className="goal">Learning: {p.goal}</p>
              <p className="loves">Loves: {p.loves.join(", ")}</p>
            </button>
          ))}
        </div>

        <div className="form-actions">
          <button className="btn btn-ghost" onClick={() => generate(persona)} disabled={loading}>
            {loading ? "Building the brief..." : `Build the brief for ${persona.name.split(" ")[0]}`}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Close form" : "Build your own leader"}
          </button>
        </div>

        {showForm && (
          <div className="form-card">
            <div className="form-grid">
              <div className="field">
                <label>Name</label>
                <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Jordan Lee" />
              </div>
              <div className="field">
                <label>Role</label>
                <input value={fRole} onChange={(e) => setFRole(e.target.value)} placeholder="Chief Revenue Officer" />
              </div>
              <div className="field">
                <label>Industry</label>
                <input value={fIndustry} onChange={(e) => setFIndustry(e.target.value)} placeholder="Edtech" />
              </div>
              <div className="field">
                <label>Learning goal</label>
                <input value={fGoal} onChange={(e) => setFGoal(e.target.value)} placeholder="Pricing strategy for SaaS" />
              </div>
              <div className="field">
                <label>Work trip city</label>
                <input value={fTrip} onChange={(e) => setFTrip(e.target.value)} placeholder="Chicago" />
              </div>
              <div className="field">
                <label>Offsite city</label>
                <input value={fOffsite} onChange={(e) => setFOffsite(e.target.value)} placeholder="Nashville" />
              </div>
              <div className="field full">
                <label>Things they love (5 to 8, comma separated)</label>
                <textarea value={fLoves} onChange={(e) => setFLoves(e.target.value)} placeholder="Radiohead, The Godfather, ramen, The Hard Thing About Hard Things" />
              </div>
              <div className="field full">
                <label>Team, one per line: Name: love1, love2, love3</label>
                <textarea value={fTeam} onChange={(e) => setFTeam(e.target.value)} placeholder={"Chris Fox: Miles Davis, Blade Runner, sushi\nAva Park: Adele, rooftop bars"} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" onClick={submitForm}>
                Build this leader's brief
              </button>
            </div>
            {formError && <p className="form-error">{formError}</p>}
          </div>
        )}
      </section>

      {loading && (
        <div className="loading">
          <div className="spinner">&#9679;</div>
          <p>
            Resolving taste on Qloo's graph, then crossing from what you love
            into books, films, places, and offsites...
          </p>
        </div>
      )}

      {error && (
        <div className="error-box">
          <h3>Something came up</h3>
          <p>{error}</p>
          <p style={{ fontSize: 13 }}>
            Nothing above is a guess. If Qloo cannot ground a recommendation,
            it is not shown.
          </p>
        </div>
      )}

      {brief && (
        <div id="brief-anchor">
          <BriefView brief={brief} />
        </div>
      )}

      <section className="tasteoff">
        <h2 className="serif">Why Qloo matters</h2>
        <p className="sub">
          The same leader's books, twice. Taste ON uses Qloo's taste graph.
          Taste OFF is popularity-only Qloo, honestly labeled, with zero
          personal signal. The gap is the product.
        </p>
        <button className="btn" onClick={runTasteOff} disabled={tasteOffLoading}>
          {tasteOffLoading ? "Running both sides..." : "Run the comparison"}
        </button>
        {tasteOff && (
          <div>
            <div className="versus">
              <div className="col">
                <h3>Taste ON</h3>
                <p className="desc">Grounded in {persona.name.split(" ")[0]}'s affinities</p>
                <ul>
                  {tasteOff.on.map((i: BriefItem) => (
                    <li key={i.entity_id}>
                      {i.name}
                      <span className="why">{i.reason}</span>
                    </li>
                  ))}
                  {tasteOff.on.length === 0 && (
                    <li>No taste-grounded books this run.</li>
                  )}
                </ul>
              </div>
              <div className="col">
                <h3>Taste OFF</h3>
                <p className="desc">
                  Popularity-only, no taste signal (filter.popularity.min 0.95)
                </p>
                <ul>
                  {tasteOff.off.map((b) => (
                    <li key={b.entity_id}>
                      {b.name}
                      <span className="why">Popular, not personal.</span>
                    </li>
                  ))}
                  {tasteOff.off.length === 0 && (
                    <li>No popularity baseline this run.</li>
                  )}
                </ul>
              </div>
            </div>
            <p className="verdict serif">{tasteOff.verdict}</p>
          </div>
        )}
      </section>

      <footer className="footer">
        <p>
          TasteLine is a hackathon entry for the Qloo Agentic Hackathon. It
          works only with Qloo: every recommendation must carry a taste
          explainability reason, or it is dropped. Personas are samples or
          session-only input. Nothing is stored.
        </p>
      </footer>
    </div>
  );
}
