import type { Profile } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

export type ReportContentType = "video" | "event";
export type ReportStatus = "pending" | "reviewed";

interface ReportRow {
  id: string;
  reporter_id: string;
  content_type: ReportContentType;
  content_id: string;
  reason: string | null;
  status: ReportStatus;
  created_at: string;
}

export type PendingReport = ReportRow & {
  reporter: Pick<Profile, "id" | "full_name"> | null;
  contentTitle: string;
  contentThumbnail: string | null;
};

export interface HiddenContentItem {
  type: ReportContentType;
  id: string;
  title: string;
  thumbnail: string | null;
}

async function getMe() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function reportContent(
  contentType: ReportContentType,
  contentId: string,
  reason?: string
): Promise<{ error?: string }> {
  const me = await getMe();
  if (!me) return { error: "Not authenticated" };

  const { error } = await supabase.from("reports").insert({
    reporter_id: me.id,
    content_type: contentType,
    content_id: contentId,
    reason: reason?.trim() || null,
  });
  if (error) {
    console.error("reportContent failed:", error.message, error);
    return { error: error.message };
  }
  return {};
}

/** All pending reports, newest first - for the admin moderation screen. */
export async function getPendingReports(): Promise<{ data: PendingReport[]; error?: string }> {
  try {
    const { data: reports, error } = await supabase
      .from("reports")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getPendingReports failed:", error.message, error);
      return { data: [], error: error.message };
    }
    if (!reports || reports.length === 0) return { data: [] };

    const rows = reports as ReportRow[];
    const reporterIds = [...new Set(rows.map((r) => r.reporter_id))];
    const videoIds = rows.filter((r) => r.content_type === "video").map((r) => r.content_id);
    const eventIds = rows.filter((r) => r.content_type === "event").map((r) => r.content_id);

    const [{ data: reporters }, { data: videos }, { data: events }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", reporterIds),
      videoIds.length > 0
        ? supabase.from("videos").select("id, title, thumbnail_url").in("id", videoIds)
        : Promise.resolve({ data: [] as { id: string; title: string; thumbnail_url: string | null }[] }),
      eventIds.length > 0
        ? supabase.from("events").select("id, title, cover_image_url").in("id", eventIds)
        : Promise.resolve({ data: [] as { id: string; title: string; cover_image_url: string | null }[] }),
    ]);

    const reporterById = new Map((reporters ?? []).map((p) => [p.id, p]));
    const videoById = new Map((videos ?? []).map((v) => [v.id, v]));
    const eventById = new Map((events ?? []).map((e) => [e.id, e]));

    const data = rows.map((report) => {
      const video = report.content_type === "video" ? videoById.get(report.content_id) : undefined;
      const event = report.content_type === "event" ? eventById.get(report.content_id) : undefined;
      return {
        ...report,
        reporter: reporterById.get(report.reporter_id) ?? null,
        contentTitle: video?.title ?? event?.title ?? "Deleted content",
        contentThumbnail: video?.thumbnail_url ?? event?.cover_image_url ?? null,
      };
    });

    return { data };
  } catch (err) {
    console.error("getPendingReports failed:", err);
    return { data: [], error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Admin approves a report: hides the content from everyone and marks the report reviewed. */
export async function approveReport(report: { id: string; content_type: ReportContentType; content_id: string }): Promise<{
  error?: string;
}> {
  const table = report.content_type === "video" ? "videos" : "events";
  const { error: hideError } = await supabase.from(table).update({ is_hidden: true }).eq("id", report.content_id);
  if (hideError) {
    console.error("approveReport (hide) failed:", hideError.message, hideError);
    return { error: hideError.message };
  }

  const { error } = await supabase.from("reports").update({ status: "reviewed" }).eq("id", report.id);
  if (error) {
    console.error("approveReport failed:", error.message, error);
    return { error: error.message };
  }
  return {};
}

/** Admin dismisses a report: content stays visible, report is marked reviewed. */
export async function rejectReport(reportId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("reports").update({ status: "reviewed" }).eq("id", reportId);
  if (error) {
    console.error("rejectReport failed:", error.message, error);
    return { error: error.message };
  }
  return {};
}

/** Everything currently hidden by a moderation decision - so an admin can restore it. */
export async function getHiddenContent(): Promise<{ data: HiddenContentItem[]; error?: string }> {
  const [videosResult, eventsResult] = await Promise.all([
    supabase.from("videos").select("id, title, thumbnail_url").eq("is_hidden", true),
    supabase.from("events").select("id, title, cover_image_url").eq("is_hidden", true),
  ]);

  const error = videosResult.error?.message ?? eventsResult.error?.message;
  if (error) console.error("getHiddenContent failed:", error);

  return {
    data: [
      ...(videosResult.data ?? []).map((v) => ({ type: "video" as const, id: v.id, title: v.title, thumbnail: v.thumbnail_url })),
      ...(eventsResult.data ?? []).map((e) => ({
        type: "event" as const,
        id: e.id,
        title: e.title,
        thumbnail: e.cover_image_url,
      })),
    ],
    error,
  };
}

/** Admin restores previously-hidden content. */
export async function restoreContent(contentType: ReportContentType, contentId: string): Promise<{ error?: string }> {
  const table = contentType === "video" ? "videos" : "events";
  const { error } = await supabase.from(table).update({ is_hidden: false }).eq("id", contentId);
  if (error) {
    console.error("restoreContent failed:", error.message, error);
    return { error: error.message };
  }
  return {};
}
