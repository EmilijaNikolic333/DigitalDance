# DigitalDance

DigitalDance is a mobile social platform that connects dancers with audition and event organizers. Dancers can post dance videos, browse a public feed, discover nearby auditions/workshops on a map, and apply to events. Organizers can post events, manage them, and review and respond to dancer applications.

Built as a seminar project for RMAS (Razvoj mobilnih aplikacija i servisa).

## Features

- **Authentication** — registration, login, and persistent sessions (Supabase Auth)
- **Roles** — a user can be a dancer, an organizer, or both at the same time
- **Profiles** — editable profile with avatar, bio, dance styles/experience (dancers) or organization info (organizers), and change-password
- **Video feed** — swipeable "Spotlight" feed of dance videos; upload, edit, and delete your own videos with a cover picked from the video itself or the gallery
- **Events/auditions** — organizers create, edit, and delete events (cover photo, location on a map, date/time, price, requirements); dancers browse a public list with a map of all events and open a detail page
- **Applications** — dancers can sign up for an event with an optional message, track the status of their applications, and cancel a pending one; organizers can view all applicants for their event and accept/reject each application
- **Biometric app lock** — the app can be locked behind the device's biometrics/passcode on launch
- **Loading & error states** — every screen that loads data shows a loading indicator and a clear error message with a "Try again" action if the request fails

## Tech stack

- **React Native** + **Expo** (Expo Router for file-based navigation, TypeScript)
- **Supabase** — Postgres database, authentication, and file storage (avatars, video files, event covers)
- **react-native-maps** — event location pins
- **expo-location** — geocoding/reverse-geocoding and "use my current location"
- **expo-image-picker** — picking videos/photos from the camera or gallery
- **expo-video** / **expo-video-thumbnails** — video playback and cover frame extraction
- **expo-local-authentication** — biometric/device-passcode app lock
- **@react-native-community/datetimepicker** — native date/time pickers
- iTunes Search API — optional song metadata for videos

### Native device features used

1. **Geolocation & maps** — event location picking and the events map (`expo-location`, `react-native-maps`)
2. **Camera & gallery** — recording/picking videos and photos for videos, avatars, and event covers (`expo-image-picker`)
3. **Biometric authentication** — app lock on launch (`expo-local-authentication`)

## Project structure

```
app/            # Screens and navigation (Expo Router file-based routing)
  (auth)/       # Login, register
  (tabs)/       # Main tab flows: Spotlight feed, Events, Profile
  event/        # Root-level event detail modal
components/     # Reusable UI components
services/       # Supabase data-access layer (auth, profiles, videos, events, applications)
lib/            # Supabase client, database types, shared constants
hooks/          # Custom hooks
```

## Getting started

### Prerequisites

- Node.js and npm
- A Supabase project (URL + anon key)

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase project's credentials:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. In your Supabase project, set up the database schema: `profiles`, `videos`, `events`, and `applicants` tables (with Row Level Security policies), and storage buckets for `avatars`, `videos`, and `events`.

4. Start the app:

   ```bash
   npx expo start
   ```

   Scan the QR code with Expo Go, or run on a simulator/emulator with `npx expo start --ios` / `--android`.

   > Note: biometric app lock and a couple of native permission prompts don't fully work inside Expo Go — they require a development/EAS build to test properly.

### Building with EAS

The project is configured with `eas.json` (development, preview, and production profiles). To build:

```bash
eas login
eas build --profile preview --platform android
```
