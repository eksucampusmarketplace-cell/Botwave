---
name: android-to-mini-app-porting
type: knowledge
agent: CodeActAgent
triggers:
  - mini app
  - mini-app
  - convert apk
  - android to web
  - android to mini app
  - port android app
  - app clone
  - apk feature extraction
---

# Android-Owned-App to Mini-App Porting

Use this when the user owns an Android app/APK/source and wants a smaller web, Telegram, WhatsApp, PWA, or embedded mini-app version.

## Goal

Extract product behavior and rebuild it cleanly in source code. Do not crack, bypass, patch, re-sign, clone third-party apps, harvest credentials, or exploit services.

## Allowed inputs

- APK/AAB provided by the app owner for inspection.
- Android Studio project/source code.
- Play Store listing, screenshots, screen recordings, or design docs.
- Public APIs or user-provided backend credentials through the secret manager.

## Workflow

1. Confirm target mini-app platform: web/PWA, Telegram mini app, WhatsApp flow, Discord activity, or another container.
2. Inventory current Android app features:
   - screens and navigation
   - user accounts/auth
   - game loop/business rules
   - assets/audio/images
   - storage and backend APIs
   - ads, billing, analytics, push notifications
3. Inspect APK only for defensive/product understanding:
   - manifest metadata and permissions
   - assets/resources layout
   - package/version/SDK targets
   - public endpoints and config names, without exposing secrets
4. Produce a porting plan:
   - MVP screens
   - platform APIs needed
   - backend changes
   - data model
   - asset reuse checklist
   - privacy/store compliance notes
5. Build from clean source using the repo’s framework and documented commands.
6. Verify with lint/typecheck/tests/build and a short manual smoke test.

## Safe implementation rules

- Recreate behavior in new source code; do not binary-patch APKs.
- Never bypass in-app purchases, ads, licensing, auth, rate limits, or anti-cheat.
- Never extract or print full secrets from APKs; report only that a secret-like value exists and where.
- Use official SDKs/APIs for target platforms.
- Keep user-owned assets separate and document licensing/ownership.

## Deliverable format

- Current app summary.
- Mini-app target and MVP scope.
- Screen-by-screen feature map.
- Backend/API requirements.
- Asset migration checklist.
- Risks/blockers.
- Verification commands and results.
