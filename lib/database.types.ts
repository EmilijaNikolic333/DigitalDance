// lib/database.types.ts
// Ručno pisani tipovi na osnovu šeme vidljive u seed SQL skripti.
// Ako se šema promeni, ažurirati ovde.

export type UserRole = "dancer" | "organizer" | "admin";
export type ExperienceLevel = "beginner" | "intermediate" | "professional";
export type EventType =
  | "audition"
  | "festival"
  | "workshop"
  | "concert"
  | "music_video"
  | "promotion"
  | "celebration"
  | "corporate_event"
  | "other";
export type EventStatus = "active" | "closed" | "cancelled";
export type ApplicantStatus = "pending" | "accepted" | "rejected";
export type NotificationType =
  | "new_event"
  | "new_message"
  | "application_status"
  | "new_follower"
  | "new_comment"
  | "new_like"
  | "new_save"
  | "new_applicant"
  | "new_repost"
  | "rate_reminder";

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  // Da li je korisnik plesac/organizator — nezavisni flegovi, oba mogu biti true.
  is_dancer: boolean;
  is_organizer: boolean;
  full_name: string | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  // dancer
  dance_styles: string[] | null;
  experience_level: ExperienceLevel | null;
  availability: string | null;
  // organizer
  organization_name: string | null;
  website: string | null;
  about: string | null;
  created_at: string;
}

export interface Video {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  dance_style: string | null;
  views_count: number;
  // izabrana pesma (metapodatak, preko iTunes API-ja — nije umesana u video fajl)
  song_title: string | null;
  song_artist: string | null;
  song_preview_url: string | null;
  is_hidden: boolean;
  created_at: string;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  city: string | null;
  location_lat: number | null;
  location_lng: number | null;
  event_date: string;
  requirements: string | null;
  status: EventStatus;
  cover_image_url: string | null;
  price: number | null;
  is_hidden: boolean;
  created_at: string;
}

export interface Applicant {
  id: string;
  event_id: string;
  dancer_id: string;
  status: ApplicantStatus;
  message: string | null;
}

export interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  text: string;
  created_at: string;
  parent_comment_id: string | null;
}

export interface Like {
  id: string;
  video_id: string;
  user_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface SavedVideo {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
}

export interface SavedEvent {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
}

export interface RepostedVideo {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
}

export interface RepostedEvent {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  sent_at: string;
  read_at: string | null;
  shared_video_id: string | null;
  shared_event_id: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  reference_id: string | null;
  actor_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export interface EventRating {
  id: string;
  event_id: string;
  rater_id: string;
  ratee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

