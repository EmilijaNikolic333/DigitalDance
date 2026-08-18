// Supabase Edge Function (Deno runtime) - NOT part of the Expo/TypeScript app build,
// excluded from the root tsconfig.json. Deploy with:
//   supabase functions deploy suggest-application-message
// Requires the GROQ_API_KEY secret (same one used by generate-recommendations):
//   supabase secrets set GROQ_API_KEY=your_key_value
import { withSupabase } from "npm:@supabase/server@^1";

const GROQ_MODEL = "openai/gpt-oss-20b";

async function askGroq(systemPrompt: string, userPrompt: string): Promise<string> {
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
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned no content");
  return String(content).trim();
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

    let eventId: string;
    try {
      const body = await req.json();
      if (typeof body.eventId !== "string" || !body.eventId) {
        return Response.json({ error: "eventId is required" }, { status: 400 });
      }
      eventId = body.eventId;
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    try {
      const [{ data: event, error: eventError }, { data: profile, error: profileError }] = await Promise.all([
        ctx.supabase
          .from("events")
          .select("title, description, requirements, event_type, dance_styles")
          .eq("id", eventId)
          .single(),
        ctx.supabase
          .from("profiles")
          .select("full_name, bio, dance_styles, experience_level, city")
          .eq("id", userId)
          .single(),
      ]);

      if (eventError || !event) {
        return Response.json({ error: eventError?.message ?? "Event not found" }, { status: 404 });
      }
      if (profileError || !profile) {
        return Response.json({ error: profileError?.message ?? "Profile not found" }, { status: 404 });
      }

      const systemPrompt =
        "Ti si asistent koji pomaze plesacima da napisu kratku, ljubaznu poruku organizatoru kada se prijavljuju " +
        "na audiciju/event u aplikaciji DigitalDance. Napisi 2-4 recenice, prvo lice jednine, konkretno pominjuci " +
        "relevantno iskustvo/stilove plesaca u odnosu na ono sto event trazi. Ne izmisljaj detalje o plesacu koji " +
        "nisu dati. Pisi na istom jeziku na kom je napisan naslov/opis eventa (ako nije jasno, pisi na engleskom). " +
        "Vrati SAMO tekst poruke, bez navodnika, bez naslova, bez objasnjenja.";

      const userPrompt = JSON.stringify({
        event: {
          title: event.title,
          description: event.description,
          requirements: event.requirements,
          event_type: event.event_type,
          dance_styles: event.dance_styles,
        },
        dancer: {
          name: profile.full_name,
          bio: profile.bio,
          dance_styles: profile.dance_styles,
          experience_level: profile.experience_level,
          city: profile.city,
        },
      });

      const message = await askGroq(systemPrompt, userPrompt);
      return Response.json({ message });
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
    }
  }),
};
