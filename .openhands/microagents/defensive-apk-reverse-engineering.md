---
name: defensive-apk-reverse-engineering
type: knowledge
agent: CodeActAgent
triggers:
  - apk
  - android app
  - reverse engineering
  - decompile
  - jadx
  - apktool
  - AndroidManifest.xml
  - mobile security
---

# Defensive APK Reverse Engineering

Use this only for apps the user owns, has permission to inspect, or provided for defensive review.

## Allowed work

- Identify package name, version, SDK targets, signing metadata, app size, and included ABIs.
- Inspect `AndroidManifest.xml` for permissions, exported components, deep links, cleartext traffic, backup/debuggable flags, and risky intent filters.
- Decompile/read code with tools like `jadx`, `apktool`, `aapt`, `apksigner`, `zipinfo`, `strings`, and `grep` to understand behavior.
- Review privacy/security risks: hardcoded API keys, exposed endpoints, trackers/SDKs, insecure storage, weak crypto, WebView settings, logging, network config, and dangerous permissions.
- Produce a concise report with evidence, risk level, and recommended fixes.

## Forbidden work

- Do not bypass licensing, payments, DRM, ads, anti-cheat, or access controls.
- Do not crack, patch, re-sign, redistribute, clone, or modify third-party APKs.
- Do not extract user data, tokens, cookies, private keys, wallets, or credentials except to warn the user that their own app contains exposed secrets.
- Do not create exploit chains, malware, persistence, stealth, or exfiltration code.
- Do not provide instructions for attacking other apps, services, users, or Play Store systems.

## Workflow

1. Confirm the APK path and ownership/permission context.
2. Copy the APK to a working folder outside the repo unless the user asks to commit artifacts.
3. Gather metadata first:
   - `python3 - <<'PY'` with `zipfile` for size/entries when Android tools are unavailable.
   - Prefer `aapt dump badging app.apk`, `apksigner verify --print-certs app.apk`, and `jadx --version` if installed.
4. Inspect the manifest before code.
5. Search decompiled sources and resources for URLs, keys, secrets, logging, WebView usage, crypto, billing/ad SDKs, analytics, and permissions-related code.
6. Summarize findings with file paths/commands used and clearly mark uncertainty when a tool is missing.
7. Recommend safe fixes in the source app; do not patch binary APKs unless the user explicitly owns the app and the patch is defensive.

## Report format

- App identity: package/version/SDK/signature status.
- Permissions and exported surface.
- Network/privacy observations.
- Hardcoded secrets or sensitive strings, if any, without printing full secret values.
- Top risks by severity.
- Safe next steps for source-code fixes and Play Store release hygiene.
