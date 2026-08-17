import { router } from "expo-router";
import { useEffect, useState } from "react";

import { ProfileEventCard } from "@/components/profile-event-card";
import { RateSheet } from "@/components/rate-sheet";
import type { EventRating } from "@/lib/database.types";
import { getApplicationsForEvent, type ApplicantWithDancer } from "@/services/applications";
import type { OwnEvent } from "@/services/events";

interface EventRatingCardProps {
  event: OwnEvent;
  givenRatings: Map<string, EventRating>;
  receivedRatings: Map<string, EventRating>;
  onRated: (rateeId: string, rating: EventRating) => void;
}

/** A completed event, shown the same as any other event card, plus a rating button next to "View details". */
export function EventRatingCard({ event, givenRatings, receivedRatings, onRated }: EventRatingCardProps) {
  const [dancers, setDancers] = useState<ApplicantWithDancer[]>([]);
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    getApplicationsForEvent(event.id).then(({ applications }) => {
      setDancers(applications.filter((a) => a.status === "accepted"));
    });
  }, [event.id]);

  const allRated = dancers.length > 0 && dancers.every((d) => givenRatings.has(`${event.id}:${d.dancer_id}`));

  return (
    <>
      <ProfileEventCard
        event={event}
        onPress={() => router.push({ pathname: "/event/[id]", params: { id: event.id } })}
        rateButton={
          dancers.length > 0
            ? { label: allRated ? "View ratings" : "Rate dancers", onPress: () => setShowSheet(true) }
            : undefined
        }
      />

      <RateSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        title={event.title}
        eventId={event.id}
        targets={dancers.map((d) => ({
          userId: d.dancer_id,
          name: d.dancer?.full_name || "Dancer",
          avatar: d.dancer?.avatar_url,
          given: givenRatings.get(`${event.id}:${d.dancer_id}`),
          received: receivedRatings.get(`${event.id}:${d.dancer_id}`),
        }))}
        onRated={onRated}
      />
    </>
  );
}
