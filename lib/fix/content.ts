/**
 * Rich per-slug content for /fix/[slug] troubleshooting pages.
 *
 * Same pattern as `lib/howto/content.ts`: lives alongside the existing
 * `lib/fix/data.ts` (which stays append-only and sitemap-stable), and the
 * /fix/[slug] template reads from this map.
 *
 * Each entry has unique symptoms, root causes, and resolution steps for the
 * specific error / scenario its slug describes — fixing the "thin content"
 * problem that was preventing /fix/* URLs from being indexed.
 */

export interface FixCause {
  /** Short label for the root cause. */
  label: string;
  /** 1–3 sentence explanation. */
  detail: string;
  /** Optional concrete fix steps. */
  fix?: string[];
}

export interface FixContent {
  /** Friendly intro: what the user is seeing and the high-level answer. */
  intro: string;
  /** Symptoms the user can use to confirm they have this problem. */
  symptoms: string[];
  /** Quick checklist to try in 30 seconds before deeper troubleshooting. */
  quickFix: string[];
  /** Root causes, ranked by frequency. */
  causes: FixCause[];
  /** Detailed remediation steps once the cause is identified. */
  resolutionSteps: { title: string; body: string; code?: string }[];
  /** What success looks like. */
  expectedResult: string;
  /** Common follow-up actions to prevent recurrence. */
  prevention?: string[];
  /** Related slugs. */
  relatedFix?: string[];
  relatedHowTo?: string[];
  relatedCompare?: string[];
  /** FAQs unique to this slug. */
  faqs: { question: string; answer: string }[];
}

export const fixContent: Record<string, FixContent> = {
  'whatsapp-bot-disconnected': {
    intro:
      'A BotWave session showing "Disconnected" in the dashboard usually self-recovers within a minute — but if it stays disconnected for more than a few minutes, one of four root causes is almost always responsible. This page walks through how to diagnose which one and what to do.',
    symptoms: [
      'Dashboard → Sessions shows a red "Disconnected" badge.',
      '!help in WhatsApp gets no response.',
      'WhatsApp shows the linked device but says "Last seen: hours ago" on it.',
      'Auto-reconnect attempts in the dashboard log are failing in a row.',
    ],
    quickFix: [
      'Open Dashboard → Sessions → click the session → Reconnect.',
      'If reconnect fails immediately, check that the phone connected to the WhatsApp account is online (you can verify by sending yourself a message from WhatsApp Web).',
      'If the phone is offline, simply re-opening WhatsApp on the phone usually triggers BotWave to reconnect within 60 seconds.',
    ],
    causes: [
      {
        label: 'Phone offline / WhatsApp closed for too long',
        detail:
          'BotWave is a Linked Device — it depends on your phone\'s WhatsApp being awake periodically. If your phone is offline overnight or WhatsApp is force-closed, the linked device disconnects.',
        fix: [
          'Re-open WhatsApp on the phone.',
          'Wait up to 60 seconds for auto-reconnect.',
          'If still disconnected, click Reconnect in the dashboard.',
        ],
      },
      {
        label: 'WhatsApp Web logout (one-button kill)',
        detail:
          'If you tap "Log out from all devices" in WhatsApp Settings → Linked Devices, every Linked Device including BotWave is killed. The session must be re-paired from scratch.',
        fix: ['Open BotWave → Sessions → Reconnect with pairing code or QR.'],
      },
      {
        label: 'Linked-device cap (4 device limit)',
        detail:
          'WhatsApp allows 4 linked devices simultaneously. If you pair a 5th, WhatsApp silently kicks the oldest — which can include your BotWave session.',
        fix: [
          'In WhatsApp Settings → Linked Devices, remove old/unused entries.',
          'Re-pair BotWave.',
        ],
      },
      {
        label: 'Server-side maintenance or deploy',
        detail:
          'During a BotWave deploy the session containers briefly restart. Reconnect usually happens automatically within 30s.',
        fix: ['Wait 1–2 minutes; the session reconnects automatically.'],
      },
    ],
    resolutionSteps: [
      { title: 'Confirm the phone is online', body: 'Open WhatsApp on the device that owns the session and send yourself a message via WhatsApp → You → message yourself.' },
      { title: 'Click Reconnect in the dashboard', body: 'Dashboard → Sessions → click your session → Reconnect.' },
      { title: 'Wait 60 seconds', body: 'Reconnect handshakes take time. The status will flip to Connected when done.' },
      { title: 'If still disconnected, check WhatsApp linked devices', body: 'WhatsApp → Settings → Linked Devices. If your BotWave entry is gone, re-pair.' },
      { title: 'Re-pair if needed', body: 'Use the pairing-code flow. Your custom commands, group config, and analytics are preserved.' },
    ],
    expectedResult: 'Dashboard shows green "Connected" badge and !help works again.',
    prevention: [
      'Avoid hitting "Log out from all devices" in WhatsApp.',
      'Keep your phone\'s WhatsApp open for at least a few seconds per day so the linked device stays warm.',
      'Don\'t exceed 4 linked devices.',
    ],
    relatedFix: ['whatsapp-bot-logged-out', 'bot-session-needs-reauth', 'whatsapp-multi-device-issue'],
    relatedHowTo: ['whatsapp-session-recovery', 'create-whatsapp-bot', 'whatsapp-pairing-code'],
    faqs: [
      { question: 'Will my custom commands and group settings be lost?', answer: 'No. Session-level config (commands, group rules, warnings, analytics) is stored against your BotWave account, not against the WhatsApp session credentials. Re-pairing keeps everything.' },
      { question: 'Why does the session disconnect every night?', answer: 'Phone going offline overnight is the most common cause. If this is consistent, leave the phone charging and WhatsApp open — or upgrade to a sessions-on-server plan (Boss) where the dependency on your phone is reduced.' },
      { question: 'How long can a session stay disconnected before something bad happens?', answer: 'Up to ~14 days. Beyond that, WhatsApp\'s Linked Device entry expires server-side and you must re-pair.' },
    ],
  },

  'whatsapp-bot-banned': {
    intro:
      'Seeing "Banned" status on a BotWave session means WhatsApp has blocked the underlying account at the server level — not a BotWave problem to fix, but there are concrete things to do next and very specific habits to avoid on the replacement session.',
    symptoms: [
      'Dashboard shows "Banned" status with timestamp.',
      'WhatsApp on the phone shows "Your phone number is banned from using WhatsApp" or similar.',
      '!help receives no reply and reconnect repeatedly fails.',
      'Trying to log into WhatsApp Web fails immediately.',
    ],
    quickFix: [
      'Do NOT pair the same number from a new device — WhatsApp will recognise the ban.',
      'Submit a ban appeal via WhatsApp → "Help" or by emailing support@whatsapp.com from the email tied to the account.',
      'Switch BotWave to a different number for now.',
    ],
    causes: [
      { label: 'Unsolicited bulk messages', detail: 'The #1 trigger. Sending the same or near-identical message to many non-opted-in numbers in a short window.', fix: ['Avoid bulk outbound to non-opted-in recipients.'] },
      { label: 'Skipped session warmup', detail: 'Disabling the 7-day warmup period and immediately running heavy automation on a new session.', fix: ['Always leave warmup on. The 15→200 msg/day ramp is the single biggest ban-risk reducer.'] },
      { label: 'Reports from recipients', detail: 'When multiple users tap "Report" in WhatsApp on messages from your number, the cumulative reports trigger a ban.', fix: ['Make sure messages add value; never spam.'] },
      { label: 'Brand-new number (< 24h)', detail: 'WhatsApp aggressively rate-limits and bans brand-new numbers attempting automation.', fix: ['Wait at least 7 days after registering a number before adding it to BotWave.'] },
    ],
    resolutionSteps: [
      { title: 'Confirm the ban', body: 'Try logging into WhatsApp itself on the phone. If you see the banned-number message, this is definitive.' },
      { title: 'Submit an appeal to WhatsApp', body: 'Inside the WhatsApp app on the phone, tap the ban dialog → "Request a Review". Or email support@whatsapp.com with subject "Banned account appeal" from the registered email.' },
      { title: 'Provide context', body: 'In the appeal, explain you were using a Linked Device (BotWave) for a legitimate use case (community moderation / customer support). Successful appeals usually mention the legitimate purpose.' },
      { title: 'Switch BotWave to a different number', body: 'If the appeal will take days/weeks, pair a different number to keep operations running.' },
      { title: 'Tighten anti-ban settings on the new session', body: 'Default warmup ON, daily cap at 200, opt-in-only for bulk messages, no AI auto-reply on cold numbers.' },
    ],
    expectedResult: 'Either WhatsApp un-bans the original number (sometimes happens within 24–72h for legitimate cases) or you continue on a fresh number with safer practices.',
    prevention: [
      'Never disable session warmup on a new number.',
      'Avoid sending unsolicited messages — broadcast only to opted-in audiences.',
      'Keep daily volume below 200 messages on the free tier.',
      'Use randomised reply delays (default ON).',
      'Don\'t enable AI auto-reply on a brand-new number.',
    ],
    relatedFix: ['whatsapp-bot-disconnected', 'whatsapp-bot-logged-out', 'whatsapp-pairing-code-expired'],
    relatedHowTo: ['whatsapp-anti-ban-tips', 'whatsapp-anti-ban-setup', 'create-whatsapp-bot'],
    faqs: [
      { question: 'Will BotWave refund me if my number gets banned?', answer: 'Bans are imposed by WhatsApp and outside BotWave\'s control. We do not refund for bans, but we will help you re-set up on a new number quickly. The Terms of Service has the formal policy.' },
      { question: 'How long do bans last?', answer: 'Temporary bans usually 24h–7 days; permanent bans never (unless successfully appealed).' },
      { question: 'Can I use a virtual number?', answer: 'WhatsApp can detect and ban many virtual-number ranges (Google Voice, common VoIP providers). Use a real SIM where possible.' },
    ],
  },

  'whatsapp-qr-not-scanning': {
    intro: 'The pairing QR refuses to be recognised by WhatsApp. Almost always one of: code already expired, camera focus issue, WhatsApp Web logged out everywhere recently, or a screen-zoom problem distorting the QR. Walk through this in order.',
    symptoms: ['Phone camera shows the QR but does not register it.', 'Phone shows "QR code expired" within seconds.', 'WhatsApp says "Cannot scan code" or hangs after scan.'],
    quickFix: [
      'In BotWave, click "Regenerate QR" — old codes expire after 20 seconds.',
      'Hold the phone steady 15–25 cm from the screen.',
      'If using a dual monitor, move the QR window to your primary display.',
    ],
    causes: [
      { label: 'QR expired (>20s old)', detail: 'WhatsApp QR codes rotate every 20s for security.', fix: ['Regenerate.'] },
      { label: 'Phone camera focus', detail: 'Auto-focus needs a moment; if you move the phone too fast it cannot lock.', fix: ['Hold steady for 3 seconds.'] },
      { label: 'Screen zoom / extreme HiDPI scaling', detail: 'A QR rendered too large or too small fails QR detection.', fix: ['Reset browser zoom to 100%.'] },
      { label: 'WhatsApp logged out everywhere', detail: 'A recent "log out from all devices" can leave the Linked Devices screen in a weird state.', fix: ['Close and re-open WhatsApp.'] },
    ],
    resolutionSteps: [
      { title: 'Reset browser zoom to 100%', body: 'Ctrl/Cmd+0 in most browsers.' },
      { title: 'Click Regenerate QR', body: 'In BotWave Sessions.' },
      { title: 'Phone: WhatsApp → Settings → Linked Devices → Link a Device', body: 'Wait for the camera viewfinder.' },
      { title: 'Hold the phone steady ~20 cm from the QR for 3 seconds', body: 'Lock focus before moving.' },
      { title: 'If repeated failure, switch to pairing code', body: 'Click "Pair with phone number instead" in BotWave.' },
    ],
    expectedResult: 'Phone vibrates and connects within 5 seconds; BotWave flips to "Connected".',
    prevention: ['Use pairing-code mode by default — no camera required.'],
    relatedFix: ['whatsapp-pairing-code-expired'],
    relatedHowTo: ['connect-whatsapp-bot-qr', 'whatsapp-pairing-code', 'create-whatsapp-bot'],
    faqs: [
      { question: 'Can I use a screenshot of the QR from another device?', answer: 'WhatsApp blocks screenshots of QR codes scanned from a screen → another screen. Use the camera on the actual phone.' },
    ],
  },

  'whatsapp-auto-reply-not-working': {
    intro: 'Auto-reply is enabled in the dashboard but the bot is not responding. Five common reasons, in rough frequency order.',
    symptoms: ['Sent a test message; no reply.', 'Auto-reply log in dashboard shows no recent activity.', '!afk doesn\'t echo back a confirmation.'],
    quickFix: [
      'Send !back then !afk again — fresh state often clears stuck flags.',
      'Check that the session is "Connected", not "Disconnected".',
      'Make sure you are testing from a different account/chat (the bot ignores its own messages).',
    ],
    causes: [
      { label: 'Session disconnected', detail: 'No reply at all = bot is offline.', fix: ['Reconnect from dashboard.'] },
      { label: 'Scope set too narrow', detail: 'Maybe AFK is scoped to DMs only and you are testing in a group.', fix: ['Dashboard → Auto-reply → check scope.'] },
      { label: 'Cooldown active', detail: 'Per-user cooldown means a recent reply blocks the next one.', fix: ['Wait 30 min or reduce the cooldown.'] },
      { label: 'Testing from the same account', detail: 'BotWave ignores messages from the same session that owns the AFK.', fix: ['Ask a friend to test, or use a second WhatsApp account.'] },
      { label: 'AI mode but quota exhausted', detail: 'On AI auto-reply, free tier caps at 10/day. After that, the AI calls fail silently.', fix: ['Check Dashboard → AI → Usage. Wait for reset or upgrade.'] },
    ],
    resolutionSteps: [
      { title: 'Confirm session connected', body: 'Dashboard → Sessions.' },
      { title: 'Check AFK is active', body: 'Send !afk status from any chat the bot is in.' },
      { title: 'Verify scope', body: 'Dashboard → Auto-reply → make sure the test chat is in scope.' },
      { title: 'Test from a different account', body: 'Self-tests don\'t trigger AFK.' },
      { title: 'Check the auto-reply log', body: 'Dashboard → Logs → Auto-reply. Find your test message; the log shows why a reply was/wasn\'t sent.' },
    ],
    expectedResult: 'Test message gets the configured reply within 1–3s.',
    relatedFix: ['whatsapp-ai-not-responding', 'whatsapp-bot-not-responding', 'whatsapp-bot-not-reading-messages'],
    relatedHowTo: ['auto-reply-whatsapp', 'whatsapp-ai-auto-reply', 'whatsapp-auto-responses'],
    faqs: [
      { question: 'Does AFK reply to me when I message my own session?', answer: 'No, by design. Otherwise it would infinite-loop on every action.' },
    ],
  },

  'whatsapp-bot-slow-response': {
    intro: 'Replies that take 10s+ when they used to take 1–2s. The bot is fine; somewhere between the bot and WhatsApp\'s servers is causing the delay.',
    symptoms: ['Replies arrive but slowly (5–30s).', 'Other commands fast, but !ai always slow.', 'Slow only in one specific group.'],
    quickFix: ['Check Dashboard → Status — see if any subsystem is degraded.', 'Test !sticker (no LLM) vs !ai (LLM) to isolate.'],
    causes: [
      { label: 'AI provider rate limit', detail: 'If many users on the shared pool are calling !ai, individual requests get queued.', fix: ['Wait, or upgrade to BYOK to use your own quota.'] },
      { label: 'Anti-ban randomised delay (intentional)', detail: 'Default 1.5–4.5s delay on each reply to simulate human typing.', fix: ['This is by design and important for ban prevention. Do not disable unless on Boss plan.'] },
      { label: 'WhatsApp server slowness in your region', detail: 'Periodic regional slowdowns affect all WhatsApp-based services.', fix: ['Check WhatsApp itself — if regular WhatsApp messages are slow, it is upstream.'] },
      { label: 'Bot container under high load', detail: 'Free-tier containers shared across many users can saturate occasionally.', fix: ['Upgrade for dedicated containers.'] },
    ],
    resolutionSteps: [
      { title: 'Run !ping in the chat', body: 'Returns the bot\'s latency to WhatsApp servers.', code: '!ping' },
      { title: 'Compare across commands', body: 'If !sticker is fast and !ai is slow, the issue is AI not the bot.' },
      { title: 'Check anti-ban delay setting', body: 'Dashboard → Anti-ban → Reply delay. Default 1.5–4.5s.' },
      { title: 'If only one group is slow, check group size', body: 'Very large groups (>500 members) have inherent processing overhead.' },
    ],
    expectedResult: 'Identify the source of the slowness; mitigate where possible.',
    relatedFix: ['whatsapp-bot-slow', 'whatsapp-ai-not-responding'],
    relatedHowTo: ['whatsapp-anti-ban-setup', 'api-key-setup'],
    faqs: [
      { question: 'Why does BotWave intentionally delay replies?', answer: 'Bot-fast replies are a top WhatsApp ban signal. The 1.5–4.5s delay simulates human typing speed.' },
    ],
  },

  'whatsapp-bot-not-reading-messages': {
    intro: 'The bot is connected but seems oblivious — does not react to commands, does not delete spam. Almost always a permissions / privacy / scope issue.',
    symptoms: ['!help in group → no response.', '!help in DM → works.', 'Other group members get replies, you do not.'],
    quickFix: [
      'Ensure the bot is added to the group, not just a contact.',
      'For Telegram bots, ensure /setprivacy is DISABLED in BotFather.',
      'For WhatsApp, ensure the bot is admin if you need moderation actions.',
    ],
    causes: [
      { label: 'Telegram bot privacy mode ON', detail: 'Default for new bots. Bot only sees @-mentions.', fix: ['@BotFather → /setprivacy → DISABLE.'] },
      { label: 'Bot not in the group', detail: 'Adding the contact does not add the bot to a specific group.', fix: ['Group info → Add → bot.'] },
      { label: 'Command disabled for this group', detail: 'Per-group command lockdown.', fix: ['Dashboard → Groups → Permissions → enable.'] },
      { label: 'Whitelist mode active and you are not on the list', detail: 'Some admins lock commands to whitelist only.', fix: ['Add yourself or disable whitelist.'] },
    ],
    resolutionSteps: [
      { title: 'Confirm bot is in the group', body: 'Group info → see member list.' },
      { title: 'For Telegram, disable privacy mode', body: '@BotFather → /setprivacy → choose your bot → DISABLE.', code: '/setprivacy' },
      { title: 'Check permissions', body: 'Dashboard → Groups → click group → Permissions.' },
      { title: 'Verify command is enabled', body: 'Send !commands in the group; if !help is missing from the list, it is disabled.' },
    ],
    expectedResult: 'Bot reacts to commands in the group as expected.',
    relatedFix: ['telegram-bot-not-responding', 'whatsapp-bot-not-responding', 'whatsapp-group-bot-not-admin'],
    relatedHowTo: ['whatsapp-group-bot', 'telegram-bot-group', 'whatsapp-bot-permissions'],
    faqs: [
      { question: 'Telegram privacy mode — why is it on by default?', answer: 'Telegram\'s default is to protect group privacy from bots that don\'t need to see all messages. Most bots that moderate or analyse groups need it disabled.' },
    ],
  },

  'whatsapp-sticker-not-sending': {
    intro: '!sticker is invoked but the sticker doesn\'t arrive (or arrives broken). Usually a media-pipeline issue: bad input format, file too large, or codec problem.',
    symptoms: ['!sticker runs but no reply.', 'Reply is "Failed to process sticker".', 'Sticker arrives as a regular image instead.'],
    quickFix: ['Send a JPG or PNG (not HEIC).', 'Make sure file size is under 5 MB.', 'Try a smaller, square image.'],
    causes: [
      { label: 'HEIC images (Apple)', detail: 'WhatsApp\'s sticker pipeline mishandles HEIC.', fix: ['Convert to JPG before sending.'] },
      { label: 'File too large', detail: '>5 MB images often fail.', fix: ['Compress / resize.'] },
      { label: 'Animated/video input > 6s', detail: 'Auto-trimmed but sometimes fails encoding.', fix: ['Pre-trim manually.'] },
      { label: 'Server media pipeline temporary outage', detail: 'Rare.', fix: ['Try again in 5 min.'] },
    ],
    resolutionSteps: [
      { title: 'Confirm format', body: 'JPG, PNG, WebP, or short MP4. Convert HEIC.' },
      { title: 'Check size', body: 'Under 5 MB.' },
      { title: 'For animated: trim to ≤6s before sending', body: 'Use any video editor.' },
      { title: 'Try !sticker --square as a fallback', body: 'Simpler encoding path.' },
    ],
    expectedResult: 'Sticker arrives within 1–2s.',
    relatedFix: ['whatsapp-sticker-not-working', 'whatsapp-media-not-sending'],
    relatedHowTo: ['whatsapp-sticker-maker', 'create-whatsapp-stickers-bot'],
    faqs: [
      { question: 'iPhone HEIC?', answer: 'iPhone defaults to HEIC; in Settings → Camera → Formats, pick "Most Compatible" (JPG) for sticker reliability.' },
    ],
  },

  'telegram-bot-not-responding': {
    intro: 'Telegram bot is connected per the dashboard but does not respond. Single most common cause: privacy mode left enabled in BotFather.',
    symptoms: ['/help in group → no reply.', '/help in DM → works.', 'Other bot commands ignored.'],
    quickFix: ['@BotFather → /setprivacy → DISABLE.', 'Make sure the bot has the required admin permissions.'],
    causes: [
      { label: 'Privacy mode ON', detail: 'Default for new bots.', fix: ['Disable.'] },
      { label: 'Bot not added to group', detail: 'Pasting token isn\'t the same as adding the bot to a chat.', fix: ['Group → Add member → search username.'] },
      { label: 'Bot session crashed', detail: 'Rare; dashboard shows "Disconnected".', fix: ['Reconnect.'] },
      { label: 'Token revoked / regenerated', detail: 'BotFather → /token regenerates and invalidates the old token.', fix: ['Paste the new token into BotWave.'] },
    ],
    resolutionSteps: [
      { title: 'Verify session is Connected', body: 'Dashboard → Sessions.' },
      { title: 'Disable privacy mode', body: '/setprivacy in BotFather.', code: '/setprivacy' },
      { title: 'Confirm bot is added to group', body: 'Group info → members.' },
      { title: 'Send /help in DM with the bot', body: 'If this works, the issue is group-side.' },
    ],
    expectedResult: 'Bot responds to commands in groups.',
    relatedFix: ['whatsapp-bot-not-responding', 'telegram-bot-no-permissions'],
    relatedHowTo: ['telegram-bot-setup', 'telegram-bot-group'],
    faqs: [
      { question: 'Token rotated — what now?', answer: 'Paste new token in Dashboard → Sessions → Edit.' },
    ],
  },

  'telegram-userbot-session-expired': {
    intro: 'Telegram MTProto sessions can expire for a few reasons: too many concurrent sessions, password change, or Telegram\'s server pruning idle sessions.',
    symptoms: ['Dashboard shows "Disconnected" with "Session expired" subtext.', 'Userbot commands silently ignored.', 'Telegram → Settings → Devices shows fewer sessions than expected.'],
    quickFix: ['Re-authenticate from dashboard with SMS code + 2FA.'],
    causes: [
      { label: 'Too many concurrent sessions', detail: 'Telegram caps active MTProto sessions per account.', fix: ['Drop unused sessions in Telegram → Settings → Devices.'] },
      { label: '2FA password change', detail: 'Changing 2FA invalidates existing sessions.', fix: ['Re-authenticate with new password.'] },
      { label: 'Long idle period', detail: 'Sessions inactive for weeks can be pruned.', fix: ['Re-authenticate.'] },
      { label: 'Manual termination', detail: 'If you tapped "Terminate" in Telegram → Devices on the userbot session.', fix: ['Re-authenticate.'] },
    ],
    resolutionSteps: [
      { title: 'Open Dashboard → Sessions → click userbot', body: '' },
      { title: 'Click Re-authenticate', body: 'Triggers SMS code flow.' },
      { title: 'Enter SMS code', body: 'Code arrives on active devices.' },
      { title: 'Enter 2FA password if applicable', body: '' },
    ],
    expectedResult: 'Userbot reconnects; commands work again.',
    prevention: ['Keep the userbot active by sending at least one command per week.'],
    relatedFix: ['telegram-userbot-2fa-error', 'telegram-userbot-disconnected'],
    relatedHowTo: ['setup-telegram-userbot', 'telegram-userbot-setup'],
    faqs: [
      { question: 'Will commands and config survive re-auth?', answer: 'Yes. All BotWave-side config is preserved.' },
    ],
  },

  'whatsapp-download-not-working': {
    intro: '!download fails or times out. Usually one of: URL not supported, content geo-blocked, source DRM-protected, or yt-dlp engine update needed.',
    symptoms: ['"Could not download" reply.', 'Long pause then no reply.', 'Audio comes through but video does not.'],
    quickFix: ['Try !download --audio (audio-only often succeeds where video fails).', 'Try a different source URL (TikTok, YouTube, IG).'],
    causes: [
      { label: 'Geo-blocked content', detail: 'BotWave server region may not have access to the content.', fix: ['Different source or use a public proxy.'] },
      { label: 'Private/age-gated content', detail: 'YouTube age-gated requires cookies on the server.', fix: ['BotWave operators configure cookies (see API key setup).'] },
      { label: 'yt-dlp out of date', detail: 'YouTube changes frequently; engine needs updating.', fix: ['Self-resolving; we update server-side weekly.'] },
      { label: 'Source platform outage', detail: 'TikTok occasionally rate-limits BotWave\'s server region.', fix: ['Wait and retry.'] },
    ],
    resolutionSteps: [
      { title: 'Test with a known-working URL', body: 'Try a popular YouTube short — eliminates URL-specific issues.' },
      { title: 'Try --audio', body: 'Audio path is more forgiving than video.' },
      { title: 'Wait an hour and retry', body: 'Many issues self-heal as upstream platforms rotate.' },
      { title: 'If persistent, message support', body: 'support@botwave.online with the failing URL.' },
    ],
    expectedResult: 'Video downloads successfully.',
    relatedFix: ['whatsapp-download-failed', 'whatsapp-media-not-sending'],
    relatedHowTo: ['download-tiktok-whatsapp', 'download-youtube-whatsapp', 'whatsapp-music-download'],
    faqs: [
      { question: 'Does BotWave cache downloaded videos?', answer: 'No — streamed through and discarded.' },
    ],
  },

  'whatsapp-bot-not-joining-group': {
    intro: 'You added the bot contact but it does not appear in the group. Almost always a contact-list or invite-link issue.',
    symptoms: ['Add Participant search does not find the bot.', 'Bot is added but immediately leaves.', 'Add fails with "Could not add" error.'],
    quickFix: ['Save the bot number as a contact first.', 'Verify the session is Connected before adding.', 'Check group privacy settings — invite-only groups must invite, not add.'],
    causes: [
      { label: 'Bot number not in contacts', detail: 'WhatsApp can only "Add Participant" from your contacts.', fix: ['Save the number as a contact first.'] },
      { label: 'Group set to invite-only', detail: 'Some groups require invite links instead of direct add.', fix: ['Use the group invite link.'] },
      { label: 'Bot at WhatsApp\'s 4-device cap', detail: 'Rare but possible.', fix: ['Free up a device slot.'] },
      { label: 'Bot has WhatsApp privacy setting "Nobody can add me to groups"', detail: 'BotWave numbers should default to "Everyone".', fix: ['Phone → Settings → Privacy → Groups → Everyone.'] },
    ],
    resolutionSteps: [
      { title: 'Save bot number as contact', body: 'In your phone contacts.' },
      { title: 'Confirm session is Connected', body: 'Dashboard → Sessions.' },
      { title: 'Add via group info → Add Participant', body: '' },
      { title: 'If using invite link, share it with the bot DM and have it tap "Join"', body: 'Some flows require invite.' },
    ],
    expectedResult: 'Bot is in the group, sends !help on demand.',
    relatedFix: ['whatsapp-group-bot-not-admin', 'whatsapp-bot-not-responding'],
    relatedHowTo: ['whatsapp-group-bot'],
    faqs: [
      { question: 'Multiple groups at once?', answer: 'Yes, no per-session limit on group count beyond WhatsApp\'s own.' },
    ],
  },

  'whatsapp-ai-not-responding': {
    intro: '!ai fires but returns nothing or a generic error. Usually quota, network, or system prompt issue.',
    symptoms: ['!ai → no reply or "AI is currently unavailable".', '!ai works but cuts off mid-sentence.', 'Different chats: AI works in one, not in another.'],
    quickFix: ['Check Dashboard → AI → Usage. If at daily cap, wait for reset or upgrade.', 'Test !ai in DM with bot to isolate group config.'],
    causes: [
      { label: 'Daily quota hit', detail: 'Free tier: 10/day.', fix: ['Wait or upgrade.'] },
      { label: 'Provider outage', detail: 'Groq/Gemini intermittent.', fix: ['Auto-falls back to other provider; ride it out.'] },
      { label: 'AI disabled in this group', detail: 'Per-group !ai lock.', fix: ['Dashboard → Groups → enable.'] },
      { label: 'Prompt safety block', detail: 'AI refuses disallowed content.', fix: ['Reword.'] },
    ],
    resolutionSteps: [
      { title: 'Check AI usage', body: 'Dashboard → AI → Usage. If you see "10/10 today", quota hit.' },
      { title: 'Test in DM', body: 'Isolates group-specific config.' },
      { title: 'Try a different prompt', body: 'If your prompt was edgy, the safety filter may have blocked it.' },
      { title: 'Check dashboard logs for AI errors', body: 'Dashboard → Logs → filter "ai".' },
    ],
    expectedResult: '!ai works again with a normal response.',
    relatedFix: ['whatsapp-auto-reply-not-working', 'whatsapp-bot-slow-response'],
    relatedHowTo: ['whatsapp-ai-assistant', 'whatsapp-ai-auto-reply', 'api-key-setup'],
    faqs: [
      { question: 'Can I see what was blocked?', answer: 'Dashboard → Logs → AI shows the reason: quota, safety, model error.' },
    ],
  },

  'whatsapp-bot-not-responding': {
    intro: 'Bot completely unresponsive. First check: is the session connected?',
    symptoms: ['Every command ignored.', 'Session shows "Connected" but bot is silent.'],
    quickFix: ['Reconnect from dashboard.', 'Verify you have the right session selected.'],
    causes: [
      { label: 'Session connected but underlying WhatsApp not synced', detail: 'Phone offline.', fix: ['Wake up the phone.'] },
      { label: 'All commands disabled', detail: 'Misconfiguration.', fix: ['Dashboard → Commands → reset to defaults.'] },
      { label: 'Rate limit', detail: 'You hit the daily cap.', fix: ['Wait/upgrade.'] },
    ],
    resolutionSteps: [
      { title: 'Reconnect', body: '' },
      { title: 'Test !help in DM', body: 'Removes group-side variables.' },
      { title: 'Check daily quota', body: '' },
    ],
    expectedResult: 'Commands respond.',
    relatedFix: ['whatsapp-bot-disconnected', 'bot-commands-not-working'],
    relatedHowTo: ['whatsapp-session-recovery'],
    faqs: [
      { question: 'Outage check?', answer: 'Dashboard shows green/yellow/red status banner during outages.' },
    ],
  },

  'whatsapp-bot-slow': {
    intro: 'Generic slowness — see whatsapp-bot-slow-response for a more detailed breakdown.',
    symptoms: ['Replies arrive in 10s+ when they used to be 1–2s.'],
    quickFix: ['!ping to measure latency.', 'Check Dashboard → Status.'],
    causes: [{ label: 'See whatsapp-bot-slow-response', detail: 'Same causes, this is a duplicate slug for SEO.', fix: ['See related.'] }],
    resolutionSteps: [{ title: 'See whatsapp-bot-slow-response', body: 'Detailed breakdown.' }],
    expectedResult: 'Acceptable response times.',
    relatedFix: ['whatsapp-bot-slow-response'],
    relatedHowTo: ['whatsapp-anti-ban-setup'],
    faqs: [{ question: 'Why are there two slow slugs?', answer: 'Different keywords reflect how users actually search. Both pages cover the same ground from slightly different angles.' }],
  },

  'whatsapp-sticker-not-working': {
    intro: 'Sticker creation fails entirely. See whatsapp-sticker-not-sending for detailed walkthrough.',
    symptoms: ['No sticker arrives.', 'Sticker arrives broken/garbled.'],
    quickFix: ['Try a JPG or PNG; under 5 MB; square aspect ratio.'],
    causes: [{ label: 'HEIC / oversized / unsupported format', detail: 'See related fix page.', fix: ['Convert/resize.'] }],
    resolutionSteps: [{ title: 'See whatsapp-sticker-not-sending', body: '' }],
    expectedResult: 'Stickers arrive correctly.',
    relatedFix: ['whatsapp-sticker-not-sending', 'whatsapp-media-not-sending'],
    relatedHowTo: ['whatsapp-sticker-maker'],
    faqs: [{ question: 'Why two sticker fix slugs?', answer: 'They cover overlapping search intent ("not sending" vs "not working"). Both point at the same root causes.' }],
  },

  'whatsapp-download-failed': {
    intro: '!download returns an error. See whatsapp-download-not-working for full causes; quick checklist here.',
    symptoms: ['"Failed to download" reply.', 'Process times out.'],
    quickFix: ['Try --audio first.', 'Test with a different URL.'],
    causes: [{ label: 'Geo / DRM / outage', detail: 'See related.', fix: ['See related.'] }],
    resolutionSteps: [{ title: 'See whatsapp-download-not-working', body: '' }],
    expectedResult: 'Media downloads.',
    relatedFix: ['whatsapp-download-not-working', 'whatsapp-media-not-sending'],
    relatedHowTo: ['download-tiktok-whatsapp', 'download-youtube-whatsapp'],
    faqs: [{ question: 'Spotify links?', answer: 'Public share-links yes; subscription-only tracks no (DRM).' }],
  },

  'whatsapp-bot-403-error': {
    intro: 'WhatsApp error 403 = forbidden, usually a permission problem on the linked-device side. Most common cause: the WhatsApp account on the phone no longer authorises the Linked Device.',
    symptoms: ['Dashboard log shows "403 Forbidden" entries.', 'Bot disconnects shortly after.'],
    quickFix: ['Confirm WhatsApp → Linked Devices on the phone still lists the BotWave entry; if missing, re-pair.'],
    causes: [
      { label: 'Linked Device entry was removed', detail: 'Someone tapped Log Out on it.', fix: ['Re-pair.'] },
      { label: 'Account temporarily restricted', detail: 'WhatsApp pre-ban warning.', fix: ['Stop automation, message WhatsApp support, wait.'] },
    ],
    resolutionSteps: [
      { title: 'Verify Linked Device entry exists', body: 'WhatsApp → Settings → Linked Devices.' },
      { title: 'If missing, re-pair', body: 'Pairing-code flow.' },
      { title: 'If present, restart the session', body: 'Dashboard → Sessions → Reconnect.' },
    ],
    expectedResult: 'No more 403 entries in the log.',
    relatedFix: ['whatsapp-bot-401-error', 'whatsapp-bot-disconnected', 'whatsapp-bot-logged-out'],
    relatedHowTo: ['whatsapp-session-recovery'],
    faqs: [{ question: 'Does this mean banned?', answer: 'Not necessarily. Bans show as a clear "banned" status. 403 is often just permission revocation.' }],
  },

  'whatsapp-bot-401-error': {
    intro: '401 = unauthorised — your stored session credentials no longer authenticate against WhatsApp. Always solvable by re-pairing.',
    symptoms: ['Dashboard log shows "401 Unauthorized".', 'Bot disconnects right after.'],
    quickFix: ['Re-pair with pairing-code flow.'],
    causes: [
      { label: 'Credentials rotated', detail: 'WhatsApp rotated session keys server-side.', fix: ['Re-pair.'] },
      { label: 'Account password-protected (rare)', detail: 'If WhatsApp enabled an extra security layer.', fix: ['Disable that or re-pair after configuring.'] },
    ],
    resolutionSteps: [
      { title: 'Re-pair with pairing code', body: 'BotWave → Sessions → Reconnect → pairing code.' },
    ],
    expectedResult: 'No more 401 errors; bot operational.',
    relatedFix: ['whatsapp-bot-403-error', 'whatsapp-bot-disconnected', 'bot-session-needs-reauth'],
    relatedHowTo: ['whatsapp-session-recovery', 'whatsapp-pairing-code'],
    faqs: [{ question: 'Do I lose config?', answer: 'No.' }],
  },

  'whatsapp-bot-428-error': {
    intro: '428 = precondition required — Baileys couldn\'t complete a handshake step, usually a connection/network blip. Almost always self-recovers within a minute.',
    symptoms: ['Single 428 entry then back to normal.', 'Repeated 428s under network instability.'],
    quickFix: ['Wait 60s for auto-reconnect.'],
    causes: [
      { label: 'Network instability', detail: 'Server or client network blip.', fix: ['Self-resolves.'] },
      { label: 'WhatsApp deploy', detail: 'WhatsApp\'s own infrastructure rolling.', fix: ['Self-resolves.'] },
    ],
    resolutionSteps: [
      { title: 'Wait', body: 'Most 428s clear in <60s.' },
      { title: 'If persistent, reconnect', body: 'Dashboard.' },
    ],
    expectedResult: 'Session resumes operation.',
    relatedFix: ['whatsapp-bot-515-error', 'whatsapp-bot-disconnected'],
    relatedHowTo: ['whatsapp-session-recovery'],
    faqs: [{ question: 'Should I worry?', answer: 'Only if seen >5/hour for many hours.' }],
  },

  'whatsapp-bot-515-error': {
    intro: '515 = WhatsApp expected a fresh stream after auth — Baileys handles this automatically by re-establishing.',
    symptoms: ['515 in log.', 'Brief disconnect then reconnect.'],
    quickFix: ['Wait; Baileys auto-recovers.'],
    causes: [{ label: 'Normal post-auth handshake quirk', detail: 'Baileys library handles this.', fix: ['Self-resolves.'] }],
    resolutionSteps: [{ title: 'Wait 30s', body: '' }],
    expectedResult: 'Session reconnects automatically.',
    relatedFix: ['whatsapp-bot-428-error', 'whatsapp-bot-disconnected'],
    relatedHowTo: ['whatsapp-session-recovery'],
    faqs: [{ question: 'Persistent 515?', answer: 'Re-pair; if still persists, message support.' }],
  },

  'whatsapp-pairing-code-expired': {
    intro: 'The 8-character pairing code expires after 60 seconds. If you miss the window, generate a new one.',
    symptoms: ['"Code expired" message in WhatsApp.', 'WhatsApp pairing screen rejects the code.'],
    quickFix: ['Click Regenerate Code in BotWave.'],
    causes: [{ label: '60s window elapsed', detail: '', fix: ['Generate new.'] }],
    resolutionSteps: [
      { title: 'Regenerate', body: 'BotWave → Sessions → Regenerate Code.' },
      { title: 'Have WhatsApp pre-loaded on the pairing screen before clicking Generate', body: 'Pre-position so you can type the code immediately.' },
    ],
    expectedResult: 'Pairing succeeds within the 60s window.',
    relatedFix: ['whatsapp-qr-not-scanning', 'whatsapp-bot-disconnected'],
    relatedHowTo: ['whatsapp-pairing-code', 'create-whatsapp-bot'],
    faqs: [{ question: 'Why 60s?', answer: 'WhatsApp\'s security requirement.' }],
  },

  'whatsapp-session-conflict': {
    intro: 'Pairing a new device when 4 are already linked = WhatsApp silently disconnects the oldest. If that oldest was BotWave, your bot vanishes.',
    symptoms: ['Bot was working, suddenly disconnected after pairing a new device.', 'WhatsApp Linked Devices no longer shows BotWave.'],
    quickFix: ['Re-pair BotWave; remove one of the other linked devices in WhatsApp first.'],
    causes: [{ label: '4-device cap', detail: 'WhatsApp enforces.', fix: ['Drop a device.'] }],
    resolutionSteps: [
      { title: 'WhatsApp → Linked Devices', body: 'Remove unused entries.' },
      { title: 'Re-pair BotWave', body: '' },
    ],
    expectedResult: 'BotWave reclaims a slot and reconnects.',
    relatedFix: ['whatsapp-multi-device-issue', 'whatsapp-bot-disconnected'],
    relatedHowTo: ['whatsapp-pairing-code', 'create-whatsapp-bot'],
    faqs: [{ question: 'Will WhatsApp tell me which device was kicked?', answer: 'No — silent. Use the dashboard\'s connection log.' }],
  },

  'whatsapp-multi-device-issue': {
    intro: 'WhatsApp Multi-Device feature lets up to 4 devices be linked simultaneously, but BotWave occupies one slot. Awareness prevents accidentally kicking the bot.',
    symptoms: ['Bot keeps disconnecting after pairing other devices.'],
    quickFix: ['Don\'t exceed 4 linked devices.'],
    causes: [{ label: 'Cap exceeded', detail: '', fix: ['Stay under 4.'] }],
    resolutionSteps: [{ title: 'Audit linked devices', body: 'WhatsApp → Settings → Linked Devices.' }],
    expectedResult: 'BotWave stable.',
    relatedFix: ['whatsapp-session-conflict', 'whatsapp-bot-disconnected'],
    relatedHowTo: ['whatsapp-session-recovery'],
    faqs: [{ question: 'Can BotWave use 2 slots?', answer: 'No — one Linked Device entry per session.' }],
  },

  'whatsapp-group-bot-not-admin': {
    intro: 'Bot is in the group but cannot delete spam / kick members / change settings — almost always because it is not a group admin.',
    symptoms: ['Anti-spam warns but doesn\'t delete.', '!kick says "not authorised".', 'Welcome works but moderation doesn\'t.'],
    quickFix: ['Promote bot to admin: Group info → tap bot → Make group admin.'],
    causes: [{ label: 'Not admin', detail: 'WhatsApp permission model.', fix: ['Promote.'] }],
    resolutionSteps: [{ title: 'Promote', body: 'Group info → tap bot → Make group admin.' }],
    expectedResult: 'Moderation features fully functional.',
    relatedFix: ['whatsapp-bot-not-reading-messages', 'bot-commands-not-working'],
    relatedHowTo: ['whatsapp-group-bot', 'whatsapp-moderation-setup', 'whatsapp-bot-permissions'],
    faqs: [{ question: 'What if I don\'t want bot to be admin?', answer: 'Bot can still respond to commands aimed at it; only group-wide moderation requires admin.' }],
  },

  'whatsapp-media-not-sending': {
    intro: 'Bot tries to send media (sticker, image, audio) but the media doesn\'t arrive. Usually a transient pipeline issue or size limit.',
    symptoms: ['Text replies fine; media does not.', 'Specific commands fail (!sticker, !download).'],
    quickFix: ['Wait 5 min and retry.', 'Check Dashboard → Status.'],
    causes: [
      { label: 'WhatsApp media servers slow', detail: 'Upstream.', fix: ['Wait.'] },
      { label: 'File exceeds WhatsApp limit', detail: 'WhatsApp caps: 100 MB video, 16 MB audio, 5 MB sticker.', fix: ['Resize/compress.'] },
      { label: 'Bot container ran out of disk', detail: 'Rare; resolved server-side.', fix: ['Message support.'] },
    ],
    resolutionSteps: [
      { title: 'Retry', body: '' },
      { title: 'Check Dashboard → Status for outages', body: '' },
      { title: 'Lower file size', body: '' },
    ],
    expectedResult: 'Media arrives.',
    relatedFix: ['whatsapp-sticker-not-sending', 'whatsapp-download-failed'],
    relatedHowTo: ['whatsapp-sticker-maker', 'download-tiktok-whatsapp'],
    faqs: [{ question: 'WhatsApp file size limits?', answer: 'Video 100 MB, audio 16 MB, sticker 100 KB static / 500 KB animated.' }],
  },

  'whatsapp-bot-duplicate-messages': {
    intro: 'Bot replies twice to the same command. Usually two sessions racing or a webhook loop.',
    symptoms: ['Every !help → 2 replies.', 'Started after pairing a second session.'],
    quickFix: ['Stop one of the duplicate sessions.', 'Check no other automation is linked to the same number.'],
    causes: [
      { label: 'Two BotWave sessions on the same number', detail: 'Only the latest should be active.', fix: ['Disconnect the older one.'] },
      { label: 'Webhook integration replaying messages', detail: 'Custom webhook misconfigured.', fix: ['Disable webhook loop.'] },
    ],
    resolutionSteps: [
      { title: 'Dashboard → Sessions → check for duplicates', body: 'Same phone number = duplicate. Drop the older one.' },
      { title: 'Check webhook integrations', body: 'Dashboard → Integrations.' },
    ],
    expectedResult: 'Single reply per command.',
    relatedFix: ['whatsapp-session-conflict'],
    relatedHowTo: ['whatsapp-session-recovery'],
    faqs: [{ question: 'Could a group setting cause this?', answer: 'Unlikely; usually session-level.' }],
  },

  'whatsapp-bot-wrong-language': {
    intro: 'Bot replies in the wrong language (e.g. English when you configured Yoruba).',
    symptoms: ['!help text comes back in unexpected language.', 'Welcome message reverts to English.'],
    quickFix: ['Dashboard → Sessions → Language → set explicit choice.'],
    causes: [
      { label: 'No explicit language set; falling back to English', detail: '', fix: ['Set explicit.'] },
      { label: 'Group-level override conflicts with session', detail: 'Per-group language overrides session default.', fix: ['Dashboard → Groups → check Language.'] },
    ],
    resolutionSteps: [
      { title: 'Set session language', body: 'Dashboard → Sessions → Language.' },
      { title: 'Set group override if needed', body: 'Dashboard → Groups → Language.' },
    ],
    expectedResult: 'Bot speaks the configured language.',
    relatedHowTo: ['whatsapp-translate-messages'],
    faqs: [{ question: 'Supported languages?', answer: 'English, French, Portuguese, Spanish, Yoruba, Hausa, Igbo, Swahili, Arabic, Hindi, more.' }],
  },

  'telegram-bot-kicked': {
    intro: 'Telegram bot was in the group, now isn\'t — usually an admin kicked it or it was demoted then removed.',
    symptoms: ['Bot no longer in member list.', 'Dashboard logs show "kicked from group".'],
    quickFix: ['Re-add the bot. If the kick was you, undo. If it was another admin, ask why.'],
    causes: [
      { label: 'Kicked by admin', detail: '', fix: ['Re-add.'] },
      { label: 'Group privacy bot-removed', detail: 'Some Telegram client features auto-remove bots in newly-private groups.', fix: ['Re-add.'] },
    ],
    resolutionSteps: [{ title: 'Re-add bot', body: 'Group settings → Add member.' }],
    expectedResult: 'Bot back, config retained.',
    relatedFix: ['telegram-bot-no-permissions', 'telegram-bot-not-responding'],
    relatedHowTo: ['telegram-bot-group'],
    faqs: [{ question: 'Did I lose group config?', answer: 'No — config is by Telegram chat ID + BotWave account; re-add restores everything.' }],
  },

  'telegram-bot-no-permissions': {
    intro: 'Telegram bot is in the group but cannot delete messages / restrict members. It must be promoted to admin with the right permissions ticked.',
    symptoms: ['/kick returns "no permission".', 'Anti-spam doesn\'t delete.'],
    quickFix: ['Promote bot to admin and tick: delete messages, ban users, change info.'],
    causes: [{ label: 'Not admin or admin without required perms', detail: '', fix: ['Promote + tick perms.'] }],
    resolutionSteps: [
      { title: 'Group settings → Administrators → Add admin', body: 'Find the bot, promote.' },
      { title: 'Tick required permissions', body: 'Delete messages, Ban users, Change group info.' },
    ],
    expectedResult: 'Moderation actions work.',
    relatedFix: ['telegram-bot-not-responding', 'telegram-bot-kicked'],
    relatedHowTo: ['telegram-bot-group', 'telegram-moderation'],
    faqs: [{ question: 'Does the bot need "Add new admins"?', answer: 'Only if you want it to programmatically promote others.' }],
  },

  'telegram-bot-flood-wait': {
    intro: 'Telegram throttles bots that send too many messages in a short window — returns FLOOD_WAIT_X errors. BotWave handles these automatically by backing off.',
    symptoms: ['Dashboard log shows FLOOD_WAIT entries.', 'Bot pauses 30s–10min then resumes.'],
    quickFix: ['No action needed; auto-handled. If frequent, slow down command bursts.'],
    causes: [{ label: 'Burst messaging', detail: 'Telegram\'s anti-abuse.', fix: ['Slow burst rate.'] }],
    resolutionSteps: [{ title: 'Wait it out', body: 'BotWave resumes after the wait period.' }],
    expectedResult: 'Bot returns to normal.',
    prevention: ['Cap commands like /tagall to once per hour.', 'For broadcasts, use the staggered Broadcast tool, not raw sends.'],
    relatedFix: ['telegram-bot-not-responding'],
    relatedHowTo: ['telegram-moderation'],
    faqs: [{ question: 'Can I disable rate-limiting?', answer: 'No — Telegram enforces server-side.' }],
  },

  'telegram-userbot-2fa-error': {
    intro: '2FA password rejected during userbot auth. Either typo, recently changed password, or Telegram\'s SMS code flow issue.',
    symptoms: ['"PASSWORD_HASH_INVALID" or "PASSWORD_INVALID".'],
    quickFix: ['Re-enter password carefully.', 'If you forgot it, reset via Telegram\'s recovery flow.'],
    causes: [
      { label: 'Typo', detail: '', fix: ['Retry.'] },
      { label: 'Password was recently changed', detail: 'New password not synced everywhere.', fix: ['Wait and retry.'] },
      { label: 'Forgotten password', detail: '', fix: ['Reset via Telegram (will require email recovery).'] },
    ],
    resolutionSteps: [
      { title: 'Confirm password', body: 'Open Telegram → Settings → Privacy → Two-Step Verification.' },
      { title: 'Retry in BotWave', body: '' },
    ],
    expectedResult: 'Authentication completes.',
    relatedFix: ['telegram-userbot-session-expired', 'telegram-userbot-disconnected'],
    relatedHowTo: ['setup-telegram-userbot', 'telegram-userbot-setup'],
    faqs: [{ question: 'Will I lose chats if I reset 2FA?', answer: 'No — 2FA reset doesn\'t affect message data.' }],
  },

  'telegram-userbot-disconnected': {
    intro: 'Userbot showing disconnected. See userbot-session-expired for the most common variant.',
    symptoms: ['Userbot status red.'],
    quickFix: ['Try reconnect first; if that fails, re-auth.'],
    causes: [{ label: 'See telegram-userbot-session-expired', detail: '', fix: ['See related.'] }],
    resolutionSteps: [{ title: 'Dashboard → Reconnect', body: '' }, { title: 'If fails, Re-authenticate', body: 'SMS + 2FA.' }],
    expectedResult: 'Userbot operational.',
    relatedFix: ['telegram-userbot-session-expired', 'telegram-userbot-2fa-error'],
    relatedHowTo: ['setup-telegram-userbot'],
    faqs: [{ question: 'How long does reconnect take?', answer: 'Auto-attempts every 30s. Re-auth manual.' }],
  },

  'bot-commands-not-working': {
    intro: 'Generic catch-all when commands don\'t fire. Run through this checklist before going deeper.',
    symptoms: ['Some commands work, some don\'t.', 'All commands silent.'],
    quickFix: ['Confirm session connected.', 'Check Dashboard → Commands → enabled list.'],
    causes: [
      { label: 'Specific command disabled', detail: '', fix: ['Dashboard → Commands → enable.'] },
      { label: 'Permission lock', detail: 'Command admin-only and you are not admin.', fix: ['Verify role.'] },
      { label: 'Whitelist active', detail: '', fix: ['Add yourself to whitelist or disable.'] },
      { label: 'Group setting overrides session', detail: '', fix: ['Check group config.'] },
    ],
    resolutionSteps: [
      { title: 'List commands available to you', body: 'Send !commands or /commands.' },
      { title: 'If your target command is missing, check Dashboard → Commands', body: '' },
      { title: 'If listed but still failing, check permissions', body: 'Dashboard → Groups → Permissions.' },
    ],
    expectedResult: 'Target command works.',
    relatedFix: ['whatsapp-bot-not-responding', 'telegram-bot-not-responding', 'whatsapp-group-bot-not-admin'],
    relatedHowTo: ['whatsapp-bot-permissions', 'set-up-bot-dashboard'],
    faqs: [{ question: 'Can users see why a command is locked?', answer: 'Bot replies "Permission denied: requires admin" when applicable.' }],
  },

  'bot-dashboard-not-loading': {
    intro: 'Can\'t load the BotWave dashboard. Browser, network, or our outage.',
    symptoms: ['app.botwave.online → infinite spinner or 500.', 'Login fails.'],
    quickFix: ['Hard refresh (Ctrl+Shift+R).', 'Try a different browser.', 'Check Dashboard → Status page.'],
    causes: [
      { label: 'Stale cached JS', detail: 'After deploy, old JS may break.', fix: ['Hard refresh.'] },
      { label: 'Browser extension blocking', detail: 'Aggressive ad-blockers can break parts of the dashboard.', fix: ['Disable temporarily.'] },
      { label: 'Network/DNS', detail: '', fix: ['Try mobile data; or change DNS to 1.1.1.1.'] },
      { label: 'BotWave outage', detail: '', fix: ['Status page.'] },
    ],
    resolutionSteps: [
      { title: 'Hard refresh', body: 'Ctrl+Shift+R or Cmd+Shift+R.' },
      { title: 'Try incognito', body: 'Rules out extension interference.' },
      { title: 'Check /status', body: 'Posted outage indicators.' },
    ],
    expectedResult: 'Dashboard loads.',
    relatedFix: ['whatsapp-bot-disconnected'],
    relatedHowTo: ['set-up-bot-dashboard'],
    faqs: [{ question: 'Mobile vs desktop?', answer: 'Both should work; mobile is responsive layout.' }],
  },

  'bot-session-needs-reauth': {
    intro: 'Dashboard says session needs re-authentication. Open the session and follow the pairing flow again.',
    symptoms: ['Yellow "Re-auth required" badge.'],
    quickFix: ['Click "Re-authenticate" in the dashboard and complete pairing code/QR.'],
    causes: [{ label: 'Credentials expired or rotated', detail: '', fix: ['Re-pair.'] }],
    resolutionSteps: [{ title: 'Dashboard → Sessions → Re-authenticate', body: '' }],
    expectedResult: 'Session back online.',
    relatedFix: ['whatsapp-bot-401-error', 'whatsapp-bot-403-error', 'whatsapp-bot-logged-out'],
    relatedHowTo: ['whatsapp-session-recovery'],
    faqs: [{ question: 'Will I lose config?', answer: 'No.' }],
  },

  'whatsapp-bot-logged-out': {
    intro: '"Bot logged out" status means the WhatsApp Linked Device entry for the session has been removed — either by you or by WhatsApp itself.',
    symptoms: ['Status "Logged out".', 'WhatsApp → Linked Devices no longer shows BotWave.'],
    quickFix: ['Re-pair.'],
    causes: [
      { label: 'You tapped Log Out on the device in WhatsApp', detail: '', fix: ['Re-pair.'] },
      { label: 'WhatsApp removed it (>14 days idle)', detail: '', fix: ['Re-pair.'] },
      { label: 'Multi-device cap exceeded', detail: '', fix: ['Free a slot; re-pair.'] },
    ],
    resolutionSteps: [{ title: 'Re-pair', body: 'Pairing code or QR.' }],
    expectedResult: 'Session back online with config intact.',
    relatedFix: ['whatsapp-bot-disconnected', 'whatsapp-session-conflict'],
    relatedHowTo: ['whatsapp-session-recovery', 'whatsapp-pairing-code'],
    faqs: [{ question: 'Why does WhatsApp remove idle devices?', answer: 'Security policy: idle Linked Devices auto-expire after ~14 days of no phone-side activity.' }],
  },

  'whatsapp-evolution-api-error': {
    intro: 'Errors from the Evolution API integration (a third-party WhatsApp API). BotWave\'s native Baileys integration is more reliable; consider migrating.',
    symptoms: ['Evolution API errors in logs.', '"Cannot reach evolution endpoint".'],
    quickFix: ['Check the Evolution API server status; if down, fail over to BotWave native.'],
    causes: [
      { label: 'Evolution API server down', detail: '', fix: ['Restart or wait.'] },
      { label: 'Auth/key issue', detail: '', fix: ['Rotate API key.'] },
      { label: 'Network between BotWave and Evolution', detail: '', fix: ['Check connectivity.'] },
    ],
    resolutionSteps: [
      { title: 'Check Evolution server status', body: '' },
      { title: 'Rotate the API key in Dashboard → Integrations', body: '' },
      { title: 'If persistent, switch the session to BotWave native', body: 'No Evolution dependency.' },
    ],
    expectedResult: 'Evolution-backed session operational, or migrated off.',
    relatedFix: ['whatsapp-bot-disconnected'],
    relatedHowTo: ['set-up-bot-dashboard'],
    relatedCompare: ['botwave-vs-evolution-api', 'baileys-vs-evolution-api'],
    faqs: [{ question: 'Should I keep Evolution?', answer: 'Most setups are simpler on BotWave native Baileys. Use Evolution only if you have a specific dependency.' }],
  },
};

export function getFixContent(slug: string): FixContent | undefined {
  return fixContent[slug];
}
