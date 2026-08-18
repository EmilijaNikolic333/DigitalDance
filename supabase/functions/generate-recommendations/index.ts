// Supabase Edge Function (Deno runtime) - NOT part of the Expo/TypeScript app build,
// excluded from the root tsconfig.json. Deploy with:
//   supabase functions deploy generate-recommendations
// Requires the GROQ_API_KEY secret:
//   supabase secrets set GROQ_API_KEY=your_key_value
import { withSupabase } from "npm:@supabase/server@^1";

type RecType = "feed" | "events";

const GROQ_MODEL = "openai/gpt-oss-20b";
const MAX_CANDIDATES = 60;
const MAX_ITEMS = 20;

interface RankedItem {
  id: string;
  reason: string;
}

async function askGroq(systemPrompt: string, userPrompt: string): Promise<RankedItem[]> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned no content");

  let parsed: { items?: RankedItem[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Groq returned invalid JSON");
  }
  return Array.isArray(parsed.items) ? parsed.items : [];
}

// deno-lint-ignore no-explicit-any
async function buildFeedRecommendations(supabase: any, userId: string): Promise<RankedItem[]> {
  const [{ data: profile }, { data: likedVideos }, { data: savedVideos }, { data: repostedVideos }] =
    await Promise.all([
      supabase.from("profiles").select("dance_styles, experience_level, city").eq("id", userId).single(),
      supabase.from("likes").select("video_id").eq("user_id", userId),
      supabase.from("saved_videos").select("video_id").eq("user_id", userId),
      supabase.from("reposted_videos").select("video_id").eq("user_id", userId),
    ]);

  const engagedVideoIds = [
    ...new Set([
      // deno-lint-ignore no-explicit-any
      ...(likedVideos ?? []).map((r: any) => r.video_id),
      // deno-lint-ignore no-explicit-any
      ...(savedVideos ?? []).map((r: any) => r.video_id),
      // deno-lint-ignore no-explicit-any
      ...(repostedVideos ?? []).map((r: any) => r.video_id),
    ]),
  ];

  const { data: engagedVideos } = engagedVideoIds.length
    ? await supabase.from("videos").select("id, dance_style, user_id").in("id", engagedVideoIds)
    : { data: [] };

  // deno-lint-ignore no-explicit-any
  const authorIds = [...new Set((engagedVideos ?? []).map((v: any) => v.user_id))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  // deno-lint-ignore no-explicit-any
  const authorNameById = new Map((authors ?? []).map((a: any) => [a.id, a.full_name]));

  const { data: candidates } = await supabase
    .from("videos")
    .select("id, dance_style, user_id, created_at")
    .eq("is_hidden", false)
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_CANDIDATES);

  if (!candidates || candidates.length === 0) return [];

  // deno-lint-ignore no-explicit-any
  const candidateAuthorIds = [...new Set(candidates.map((c: any) => c.user_id))];
  const { data: candidateAuthors } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", candidateAuthorIds);
  // deno-lint-ignore no-explicit-any
  const candidateAuthorNameById = new Map((candidateAuthors ?? []).map((a: any) => [a.id, a.full_name]));

  const taste = {
    favoriteDanceStyles: profile?.dance_styles ?? [],
    experienceLevel: profile?.experience_level ?? null,
    city: profile?.city ?? null,
    // deno-lint-ignore no-explicit-any
    likedOrSavedVideoStyles: (engagedVideos ?? []).map((v: any) => v.dance_style).filter(Boolean),
    likedOrSavedAuthors: (engagedVideos ?? [])
      // deno-lint-ignore no-explicit-any
      .map((v: any) => authorNameById.get(v.user_id))
      .filter(Boolean),
  };

  // deno-lint-ignore no-explicit-any
  const candidateList = candidates.map((c: any) => ({
    id: c.id,
    dance_style: c.dance_style,
    author: candidateAuthorNameById.get(c.user_id) ?? "Unknown",
  }));

  const systemPrompt =
    "Ti si preporucni sistem za DigitalDance, aplikaciju za plesace. Na osnovu ukusa korisnika " +
    "(stilovi koje voli, autori ciji sadrzaj lajkuje/cuva) rangiraj ponudjene video kandidate od " +
    "najrelevantnijeg ka najmanje relevantnom. Vrati STROGO JSON objekat oblika " +
    '{"items":[{"id":"<candidate id>","reason":"kratko objasnjenje na srpskom, jedna recenica"}]}. ' +
    `Koristi ISKLJUCIVO id-jeve iz liste kandidata, ne izmisljaj nove. Maksimalno ${MAX_ITEMS} stavki, ` +
    "poredjano od najboljeg poklapanja ka najslabijem.";

  const userPrompt = JSON.stringify({ taste, candidates: candidateList });

  const items = await askGroq(systemPrompt, userPrompt);
  // deno-lint-ignore no-explicit-any
  const candidateIds = new Set(candidates.map((c: any) => c.id));
  return items.filter((item) => candidateIds.has(item.id)).slice(0, MAX_ITEMS);
}

// deno-lint-ignore no-explicit-any
async function buildEventRecommendations(supabase: any, userId: string): Promise<RankedItem[]> {
  const [{ data: profile }, { data: savedEvents }, { data: repostedEvents }] = await Promise.all([
    supabase.from("profiles").select("dance_styles, experience_level, city").eq("id", userId).single(),
    supabase.from("saved_events").select("event_id").eq("user_id", userId),
    supabase.from("reposted_events").select("event_id").eq("user_id", userId),
  ]);

  const engagedEventIds = [
    ...new Set([
      // deno-lint-ignore no-explicit-any
      ...(savedEvents ?? []).map((r: any) => r.event_id),
      // deno-lint-ignore no-explicit-any
      ...(repostedEvents ?? []).map((r: any) => r.event_id),
    ]),
  ];

  const { data: engagedEvents } = engagedEventIds.length
    ? await supabase.from("events").select("id, dance_styles, event_type, city").in("id", engagedEventIds)
    : { data: [] };

  const { data: candidates } = await supabase
    .from("events")
    .select("id, title, event_type, city, event_date, price, dance_styles, requirements")
    .eq("status", "active")
    .eq("is_hidden", false)
    .neq("organizer_id", userId)
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(MAX_CANDIDATES);

  if (!candidates || candidates.length === 0) return [];

  const taste = {
    danceStyles: profile?.dance_styles ?? [],
    experienceLevel: profile?.experience_level ?? null,
    city: profile?.city ?? null,
    savedOrRepostedEventStyles: (engagedEvents ?? []).flatMap(
      // deno-lint-ignore no-explicit-any
      (e: any) => e.dance_styles ?? []
    ),
    // deno-lint-ignore no-explicit-any
    savedOrRepostedEventTypes: (engagedEvents ?? []).map((e: any) => e.event_type),
  };

  // deno-lint-ignore no-explicit-any
  const candidateList = candidates.map((c: any) => ({
    id: c.id,
    title: c.title,
    event_type: c.event_type,
    city: c.city,
    event_date: c.event_date,
    price: c.price,
    dance_styles: c.dance_styles,
    requirements: (c.requirements ?? "").slice(0, 200),
  }));

  const systemPrompt =
    "Ti si preporucni sistem za DigitalDance, aplikaciju koja povezuje plesace i organizatore audicija. " +
    "Na osnovu profila i ukusa plesaca (stilovi, grad, nivo iskustva, sacuvani/repostovani eventi) rangiraj " +
    "ponudjene evente od najrelevantnijeg. Vrati STROGO JSON objekat oblika " +
    '{"items":[{"id":"<candidate id>","reason":"kratko objasnjenje na srpskom, jedna recenica, zasto ovaj event odgovara"}]}. ' +
    `Koristi ISKLJUCIVO id-jeve iz liste kandidata, ne izmisljaj nove. Maksimalno ${MAX_ITEMS} stavki, ` +
    "poredjano od najboljeg poklapanja ka najslabijem.";

  const userPrompt = JSON.stringify({ taste, candidates: candidateList });

  const items = await askGroq(systemPrompt, userPrompt);
  // deno-lint-ignore no-explicit-any
  const candidateIds = new Set(candidates.map((c: any) => c.id));
  return items.filter((item) => candidateIds.has(item.id)).slice(0, MAX_ITEMS);
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const userId = ctx.userClaims?.id;
    if (!userId) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    let type: RecType;
    try {
      const body = await req.json();
      if (body.type !== "feed" && body.type !== "events") {
        return Response.json({ error: "type must be 'feed' or 'events'" }, { status: 400 });
      }
      type = body.type;
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    try {
      const items =
        type === "feed"
          ? await buildFeedRecommendations(ctx.supabase, userId)
          : await buildEventRecommendations(ctx.supabase, userId);

      const table = type === "feed" ? "feed_recommendations" : "event_recommendations";
      const { error: upsertError } = await ctx.supabaseAdmin
        .from(table)
        .upsert({ user_id: userId, items, updated_at: new Date().toISOString() });

      if (upsertError) {
        return Response.json({ error: upsertError.message }, { status: 500 });
      }

      return Response.json({ items });
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
    }
  }),
};
