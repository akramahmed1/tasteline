// Preloaded sample leaders. They are invented people; everything they love
// is a real cultural entity that Qloo's taste graph can resolve.
import { Persona } from "./types";

export const SAMPLE_PERSONAS: Persona[] = [
  {
    id: "elena",
    name: "Elena Voss",
    role: "Chief Operating Officer",
    industry: "Fintech",
    goal: "AI strategy for financial services",
    tripCity: "New York",
    offsiteCity: "Austin",
    loves: [
      "Radiohead",
      "Children of Men",
      "Her",
      "The Social Network",
      "omakase",
      "Kurt Vonnegut",
      "NPR",
    ],
    team: [
      {
        name: "Marcus Webb",
        role: "Chief of Staff",
        loves: ["Miles Davis", "The Godfather", "ramen"],
      },
      {
        name: "Priya Nair",
        role: "Head of Product",
        loves: ["Wes Anderson", "The Grand Budapest Hotel", "jazz clubs"],
      },
    ],
  },
  {
    id: "darius",
    name: "Darius Cole",
    role: "VP of Operations",
    industry: "Healthcare",
    goal: "leading hospitals through change",
    tripCity: "Chicago",
    offsiteCity: "Nashville",
    loves: [
      "Björk",
      "Wes Anderson",
      "The Grand Budapest Hotel",
      "steakhouse",
      "craft cocktails",
      "Atul Gawande",
    ],
    team: [
      {
        name: "Lena Brooks",
        role: "Director of Nursing",
        loves: ["Norah Jones", "The Crown", "farm-to-table"],
      },
      {
        name: "Sam Osei",
        role: "Ops Analyst",
        loves: ["The Office", "hip-hop", "espresso bars"],
      },
    ],
  },
  {
    id: "ava",
    name: "Ava Sinclair",
    role: "Founder and CEO",
    industry: "SaaS",
    goal: "scaling a company from 20 to 200 people",
    tripCity: "San Francisco",
    offsiteCity: "Denver",
    loves: [
      "Miles Davis",
      "The Godfather",
      "ramen",
      "The Hard Thing About Hard Things",
      "minimalist design",
    ],
    team: [
      {
        name: "Tom Alvarez",
        role: "CTO",
        loves: ["Daft Punk", "Blade Runner", "sushi"],
      },
      {
        name: "Grace Liu",
        role: "Head of Sales",
        loves: ["Adele", "The Devil Wears Prada", "rooftop bars"],
      },
    ],
  },
];
