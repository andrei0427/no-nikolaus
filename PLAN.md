# UI Overhaul: Live Status vs Trip Mode

## Problem Statement

The current UI mixes two concerns into one screen: **live ferry status** (where is Nikolaus right now?) and **personalized trip predictions** (will Nikolaus affect *my* trip?). Everything loads at once, the terminal cards show predictions even before the user has committed to a trip, and push notifications only fire on proximity — too late to be useful.

The overhaul creates a clear two-mode experience: a **passive dashboard** for glancing at Nikolaus, and an **active trip mode** that gives the user a focused, actionable view with a one-shot push notification.

---

## Architecture: Two Modes

### Mode 1: Live Status (default, no location needed)

What the user sees when they open the app — a quick, passive dashboard.

**Layout (top to bottom):**
1. **Header** (unchanged)
2. **NikolausStatusStrip** (unchanged) — "Nikolaus is docked at Mgarr" with colored dot
3. **Map** (unchanged) — all ferries on the SVG map
4. **Both terminal cards side-by-side** (simplified):
   - Terminal name + island
   - Queue counts (cars/trucks/motorbikes) with severity color — this is useful even without a trip
   - Next scheduled departure time (from schedule, no prediction needed)
   - NO status badge (ALL_CLEAR/HEADS_UP/DOCKED_HERE) — these only make sense with drive time
   - NO drive time — no location yet
   - NO ferry prediction — no trip context
5. **"Start a trip" CTA button** — prominent, centered below the cards
   - Text: "Planning to cross? Start a trip" (or similar)
   - Tapping this requests location + notification permissions, then enters trip mode
6. **Webcams** (unchanged)
7. **Footer** (unchanged)

**Key changes from current:**
- Terminal cards are always shown side-by-side (no auto-selection without location)
- Cards are simpler — just live data, no predictions
- The status badge section is removed from cards in this mode
- No location permission banner inline — it's folded into the "Start a trip" button

---

### Mode 2: Trip Mode (after user starts a trip)

Entered when the user taps "Start a trip." Requests location + push permissions on activation.

**Layout (top to bottom):**
1. **Header** (unchanged)
2. **NikolausStatusStrip** (unchanged)
3. **Trip banner** — a new persistent strip below the status strip:
   - Shows: "Trip to Cirkewwa — ~18 min drive" (auto-selected terminal based on location)
   - Has a small "X" / "End trip" button to exit trip mode
   - Colored background to distinguish from the status strip (e.g., blue-tinted)
4. **Map** (unchanged)
5. **Single terminal card** (the auto-selected one, enhanced):
   - Terminal name + drive time with Google Maps link
   - **Nikolaus status badge** (ALL_CLEAR / HEADS_UP / DOCKED_HERE) with reason — the core prediction
   - **Safety countdown**: if HEADS_UP or DOCKED_HERE, show "Safe to leave in ~X min" or "Leave within X min to avoid Nikolaus"
   - Ferry prediction: "Next: Malita at 14:30"
   - Queue with severity
6. **"View other terminal" toggle** (same as current)
7. **Webcams**
8. **Footer**

**Push notification behavior:**
- On entering trip mode, if push permissions are granted, the app calculates the **safety window** — the number of minutes until the user's status would flip from ALL_CLEAR to HEADS_UP/DOCKED_HERE (or vice versa).
- **One push notification is sent** (via the backend, to survive app backgrounding) with content like:
  - "Leave in the next 12 minutes to avoid Nikolaus at Cirkewwa" (if currently safe but window closing)
  - "All clear — Nikolaus won't be at Cirkewwa for at least 45 minutes" (if safe for a while)
  - "Nikolaus is at Cirkewwa right now. It should leave in ~8 minutes." (if currently not safe)
- This notification fires **once per trip**, immediately after trip start (with the current prediction). No repeated notifications.
- If the user ends the trip and starts a new one, they get a fresh notification.

---

## Implementation Plan

### Phase 1: State management for trip mode

**File: `src/App.tsx`**

1. Add `tripActive` state (`useState<boolean>(false)`)
2. Add `startTrip()` callback:
   - Calls `requestAllPermissions()` (location + push)
   - Sets `tripActive = true`
3. Add `endTrip()` callback:
   - Sets `tripActive = false`
   - Does NOT revoke permissions (location continues for re-entry)
4. Pass `tripActive` down to control what terminal cards render

### Phase 2: Refactor CartoonTerminalCard to support two modes

**File: `src/components/CartoonTerminalCard.tsx`**

Add a `mode: 'live' | 'trip'` prop:

- **`live` mode**: Only render terminal name, island, queue counts, and next scheduled departure. No status badge, no drive time, no ferry prediction.
- **`trip` mode**: Full current rendering — status badge, drive time, ferry prediction, queue. Plus a new **safety countdown** line (see Phase 4).

### Phase 3: New components

**File: `src/components/StartTripButton.tsx`** (new)
- A prominent CTA: "Planning to cross? Start a trip"
- Rendered only when `!tripActive && !hasLocation` (or `!tripActive` generally)
- `onClick` → `startTrip()`

**File: `src/components/TripBanner.tsx`** (new)
- Rendered when `tripActive`
- Shows: auto-selected terminal name + drive time
- "End trip" button → `endTrip()`
- Distinct visual style (e.g., blue/indigo gradient strip)

### Phase 4: Safety countdown calculation

**File: `src/utils/prediction.ts`**

Extend `TerminalStatus` return type to include:
- `safeMinutes: number | null` — minutes until status changes from ALL_CLEAR to something worse, or minutes until DOCKED_HERE clears
- `safeToCrossNow: boolean` — simple boolean: is it currently safe?
- `safetyMessage: string` — human-readable, e.g., "Safe for ~25 min", "Nikolaus leaves in ~8 min"

This data already exists conceptually in the prediction logic (departure estimates, ETAs) — it just needs to be surfaced explicitly in the return value instead of only in the `reason` string.

### Phase 5: Trip push notification

**File: `src/hooks/useTripNotification.ts`** (new, replaces `useProximityNotification.ts`)

This replaces the proximity-based notification with a trip-based one:

1. Fires when: `tripActive` becomes `true` AND `subscription` exists AND `autoSelectedTerminal` exists AND status prediction is available
2. Calculates:
   - Current `safeToCrossNow` from terminal status
   - `safeMinutes` — how long the current state holds
3. Sends ONE push notification to the backend with:
   - `subscription`
   - `terminal`
   - `safeToCrossNow`
   - `safeMinutes`
   - `message` (pre-formatted on the client)
4. Dedup: uses a ref (`tripNotificationSent`) reset when trip ends

**File: `backend/src/pushHandler.ts`**

Update the `/api/send-prediction-push` endpoint (or add new `/api/send-trip-push`):
- Accept the new payload shape: `{ subscription, terminal, message, safeToCrossNow, safeMinutes }`
- Send push with the provided message as notification body
- Title: "Nikolaus Trip Alert"

**File: `src/sw.ts`**

Update push event handler:
- Use the new payload format
- Remove the Yes/No action buttons (this is no longer a prediction feedback prompt)
- On click: open/focus the app

### Phase 6: Remove old proximity notification

- Delete `src/hooks/useProximityNotification.ts`
- Remove its usage from `App.tsx`
- Remove the prediction feedback test modal and thank-you modal from `App.tsx` (the feedback loop was experimental — can be re-added later if needed)
- Clean up the `send-prediction-push` endpoint if fully replaced

### Phase 7: Update CartoonLocationPermission

**File: `src/components/CartoonLocationPermission.tsx`**

This component currently shows inline when location isn't granted. In the new flow:
- It should NOT render in live mode (the "Start a trip" button handles the permission prompt)
- It should render in trip mode ONLY if permissions were denied or errored (as a fallback/retry)
- Update props to accept `tripActive`

---

## What stays the same

- Header, map, webcams, footer — unchanged
- NikolausStatusStrip — unchanged (this IS the live status)
- Backend SSE streaming, Firebase, schedule fetching — unchanged
- Core prediction algorithms — unchanged (just exposing more data)
- usePushNotifications hook — unchanged (manages subscription lifecycle)
- useGeolocation hook — unchanged
- useDriveTime hook — unchanged

---

## UX Flow Summary

```
User opens app
  → Sees: map + both terminals (queue + next departure) + "Start a trip" button
  → This is the "live status" dashboard — no permissions needed

User taps "Start a trip"
  → Browser prompts: location + notifications
  → App enters trip mode:
      → Auto-selects closer terminal
      → Shows trip banner with drive time
      → Shows single terminal card with full prediction + safety countdown
      → Sends ONE push notification with safety status
  → User can tap "End trip" to return to live mode

User receives push notification (once):
  → "All clear for ~25 min — Nikolaus is heading away from Cirkewwa"
  → or: "Heads up — leave within 12 min to avoid Nikolaus at Cirkewwa"
  → or: "Nikolaus is at Cirkewwa now. Should leave in ~8 min."
```

---

## File change summary

| File | Action |
|------|--------|
| `src/App.tsx` | Major refactor — trip state, mode passing, remove feedback modals |
| `src/components/CartoonTerminalCard.tsx` | Add `mode` prop, conditional rendering |
| `src/components/StartTripButton.tsx` | **New** — trip CTA |
| `src/components/TripBanner.tsx` | **New** — active trip indicator |
| `src/components/CartoonLocationPermission.tsx` | Conditionally hide in live mode |
| `src/utils/prediction.ts` | Extend return type with safety fields |
| `src/hooks/useTripNotification.ts` | **New** — replaces proximity notification |
| `src/hooks/useProximityNotification.ts` | **Delete** |
| `backend/src/pushHandler.ts` | Update/add trip push endpoint |
| `src/sw.ts` | Update push handler for new payload |
