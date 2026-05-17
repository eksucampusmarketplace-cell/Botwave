import { registerCommand, type MessageContext } from './registry';
import { sendReply } from './helpers';
import { getUserSubscription, getSessionUserId } from '../../database';
import {
  setAutopilotEnabled,
  setSelfDescription,
  getSelfDescription,
  analyzePersona,
  getAutopilotStatus,
  previewAutopilotReply,
  setReplyDelay,
  setMaxDailyReplies,
  setAutopilotMode,
  setInactivityMinutes,
  setContactOverride,
  getContactList,
  type AutopilotMode,
  type ContactOverride,
} from '../handlers/AutopilotEngine';

// ─── Premium Gate ───────────────────────────────────────────────────────────
// Currently free for all users. The subscription check is wired up and ready —
// flip AUTOPILOT_PREMIUM_ENABLED to true (or remove the early return) when
// pricing goes live.

const AUTOPILOT_PREMIUM_ENABLED = false;

// Extract a contact JID from args — supports @mentions and raw phone numbers
function extractContactTarget(
  args: string[],
  context: MessageContext,
): { jid: string; display: string } | null {
  if (args.length === 0) return null;

  const raw = args.join(' ').trim();
  if (!raw) return null;

  // Check for mentioned JIDs in the message
  const mentioned = context.rawMessage?.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned && mentioned.length > 0) {
    const jid = mentioned[0];
    const display = jid.split('@')[0];
    return { jid, display };
  }

  // Try raw phone number (digits only, at least 7)
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length >= 7) {
    const jid = `${digits}@s.whatsapp.net`;
    return { jid, display: digits };
  }

  return null;
}

async function requirePremium(context: MessageContext, sock: any): Promise<boolean> {
  if (!AUTOPILOT_PREMIUM_ENABLED) return true; // Free for now

  try {
    const userId = context.chatJid.split('@')[0];
    const sub = await getUserSubscription(userId);
    if (sub.plan === 'free') {
      await sendReply(
        context.chatJid,
        `🤖 *AI Autopilot* is a premium feature!\n\n` +
        `Autopilot learns your personality and chats as YOU when you're away.\n\n` +
        `Upgrade: !upgrade`,
        sock, context.rawMessage.key, context.queue,
      );
      return false;
    }
  } catch {
    // If check fails, allow through
  }
  return true;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

async function handleAutopilot(
  context: MessageContext,
  args: string[],
  sock: any,
): Promise<void> {
  if (!context.sessionId || !context.userId) {
    await sendReply(context.chatJid, 'Autopilot requires an active session.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const sub = args[0]?.toLowerCase();
  const sessionId = context.sessionId;
  const userId = context.userId;

  // ── No args: show status ──
  if (!sub || sub === 'status') {
    if (!(await requirePremium(context, sock))) return;

    const status = await getAutopilotStatus(userId, sessionId);

    const modeLabel = { offline: 'Offline Only', always: 'Always On', manual: 'Manual' }[status.mode] || status.mode;
    const activeLabel = status.ownerLastActiveMinAgo !== null
      ? `${status.ownerLastActiveMinAgo}min ago` : 'unknown';

    let msg = `🤖 *AI AUTOPILOT STATUS*\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*Enabled:* ${status.enabled ? 'ON' : 'OFF'}\n`;
    msg += `*Mode:* ${modeLabel}\n`;
    msg += `*Owner last active:* ${activeLabel}\n`;
    msg += `*Inactivity trigger:* ${status.inactivityMinutes}min\n`;
    msg += `*Reply delay:* ${status.replyDelay}min\n`;
    msg += `*Daily replies:* ${status.dailyRepliesUsed}/${status.maxDailyReplies}\n`;
    msg += `*Messages learned:* ${status.sampleCount}\n`;
    msg += `*Contacts tracked:* ${status.contactCount}\n`;
    msg += `*Last sync:* ${status.lastSyncAt || 'never'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━\n\n`;

    if (status.hasProfile) {
      msg += `📊 *Persona Profile:*\n${status.profileSummary}\n\n`;
    } else {
      msg += `⚠️ No persona profile yet. Send at least 15 messages, then run *!autopilot sync*\n\n`;
    }

    if (status.selfDescription) {
      msg += `📝 *Self-description:*\n_${status.selfDescription.substring(0, 200)}${status.selfDescription.length > 200 ? '...' : ''}_\n\n`;
    }

    msg += `*Commands:*\n`;
    msg += `!autopilot on/off — Toggle globally\n`;
    msg += `!autopilot on/off @person — Toggle per contact\n`;
    msg += `!autopilot contacts — View per-contact settings\n`;
    msg += `!autopilot mode [offline/always] — When to reply\n`;
    msg += `!autopilot describe [text] — Tell AI about yourself\n`;
    msg += `!autopilot sync — Re-analyze your messages\n`;
    msg += `!autopilot preview [msg] — Test your clone\n`;
    msg += `!autopilot delay [1-30] — Reply delay (min)\n`;
    msg += `!autopilot inactive [1-60] — Inactivity trigger (min)\n`;
    msg += `!autopilot limit [5-200] — Daily reply limit\n`;
    msg += `!autopilot reset @person — Reset contact to global`;

    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
    return;
  }

  // ── Enable (global or per-contact) ──
  if (sub === 'on' || sub === 'enable') {
    if (!(await requirePremium(context, sock))) return;

    // Check for per-contact: !autopilot on @mention or !autopilot on 2348012345678
    const contactTarget = extractContactTarget(args.slice(1), context);
    if (contactTarget) {
      await setContactOverride(userId, sessionId, contactTarget.jid, 'on');
      await sendReply(
        context.chatJid,
        `🤖 Autopilot *enabled for ${contactTarget.display}*.\n\nYour clone will reply to them even if global autopilot is off.`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    const status = await getAutopilotStatus(userId, sessionId);
    if (!status.hasProfile) {
      await sendReply(
        context.chatJid,
        `⚠️ Can't enable autopilot yet — no persona profile.\n\n` +
        `The bot needs to learn your style first:\n` +
        `1. Send messages normally (at least 15)\n` +
        `2. Run *!autopilot describe* to tell it about yourself\n` +
        `3. Run *!autopilot sync* to build your profile\n` +
        `4. Then *!autopilot on*`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    await setAutopilotEnabled(userId, sessionId, true);
    await sendReply(
      context.chatJid,
      `🤖 *Autopilot ACTIVATED*\n\n` +
      `Your AI clone is now live. When someone messages you in private and you don't reply within ${status.inactivityMinutes} minutes, the AI will respond as you.\n\n` +
      `Mode: *${status.mode}*\n` +
      `The moment you reply yourself, autopilot backs off for that chat.\n\n` +
      `_!autopilot off to disable_`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // ── Disable (global or per-contact) ──
  if (sub === 'off' || sub === 'disable') {
    // Check for per-contact: !autopilot off @mention or !autopilot off 2348012345678
    const contactTarget = extractContactTarget(args.slice(1), context);
    if (contactTarget) {
      await setContactOverride(userId, sessionId, contactTarget.jid, 'off');
      await sendReply(
        context.chatJid,
        `🤖 Autopilot *disabled for ${contactTarget.display}*.\n\nYour clone will NOT reply to them even if global autopilot is on.`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    await setAutopilotEnabled(userId, sessionId, false);
    await sendReply(context.chatJid, '🤖 Autopilot *disabled globally*.', sock, context.rawMessage.key, context.queue);
    return;
  }

  // ── Reset per-contact override (back to global) ──
  if (sub === 'reset' || sub === 'default') {
    const contactTarget = extractContactTarget(args.slice(1), context);
    if (!contactTarget) {
      await sendReply(
        context.chatJid,
        `Usage: !autopilot reset @person or !autopilot reset 2348012345678\n\nResets autopilot for that contact to follow your global setting.`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }
    await setContactOverride(userId, sessionId, contactTarget.jid, 'default');
    await sendReply(
      context.chatJid,
      `🤖 Autopilot reset for *${contactTarget.display}* — now follows your global setting.`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // ── Contact list ──
  if (sub === 'contacts' || sub === 'list') {
    if (!(await requirePremium(context, sock))) return;
    const contacts = await getContactList(userId, sessionId);
    if (contacts.length === 0) {
      await sendReply(
        context.chatJid,
        `🤖 No contacts tracked yet. Autopilot learns contacts as messages come in.`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    let msg = `🤖 *AUTOPILOT CONTACTS* (${contacts.length})\n━━━━━━━━━━━━━━━━━━━\n`;
    for (const c of contacts.slice(0, 30)) {
      const icon = c.override === 'on' ? '🟢' : c.override === 'off' ? '🔴' : '⚪';
      const label = c.override === 'on' ? 'ON' : c.override === 'off' ? 'OFF' : 'global';
      msg += `${icon} *${c.name}* — ${label} (${c.messageCount} msgs)\n`;
    }
    if (contacts.length > 30) {
      msg += `\n_...and ${contacts.length - 30} more_`;
    }
    msg += `\n━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🟢 = always on  🔴 = always off  ⚪ = follows global\n`;
    msg += `\n!autopilot on @person — enable for specific contact\n`;
    msg += `!autopilot off @person — disable for specific contact\n`;
    msg += `!autopilot reset @person — reset to global`;

    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
    return;
  }

  // ── Mode ──
  if (sub === 'mode') {
    if (!(await requirePremium(context, sock))) return;
    const mode = args[1]?.toLowerCase();
    const validModes: AutopilotMode[] = ['offline', 'always', 'manual'];
    if (!mode || !validModes.includes(mode as AutopilotMode)) {
      await sendReply(
        context.chatJid,
        `*Autopilot Modes:*\n\n` +
        `*offline* — Only replies when you haven't sent a message in X minutes (default)\n` +
        `*always* — Replies to all DMs even when you're online\n` +
        `*manual* — Same as always, but you toggle on/off explicitly\n\n` +
        `Usage: !autopilot mode offline`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }
    await setAutopilotMode(userId, sessionId, mode as AutopilotMode);
    const labels: Record<string, string> = { offline: 'Offline Only', always: 'Always On', manual: 'Manual' };
    await sendReply(
      context.chatJid,
      `🤖 Autopilot mode set to: *${labels[mode] || mode}*`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // ── Describe (self-description) ──
  if (sub === 'describe' || sub === 'personality' || sub === 'bio' || sub === 'about') {
    if (!(await requirePremium(context, sock))) return;
    const description = args.slice(1).join(' ');
    if (!description) {
      const current = await getSelfDescription(userId, sessionId);
      if (current) {
        await sendReply(
          context.chatJid,
          `📝 *Current self-description:*\n_${current}_\n\n` +
          `To update: !autopilot describe [new description]\n\n` +
          `Tip: Include your personality, vibe, interests, how you talk when happy/angry/tired, your humor style, what you care about, cultural background, etc.`,
          sock, context.rawMessage.key, context.queue,
        );
      } else {
        await sendReply(
          context.chatJid,
          `📝 *Tell your AI clone about yourself!*\n\n` +
          `Example:\n` +
          `_!autopilot describe I'm a chill Nigerian guy, I speak pidgin mixed with English. I'm sarcastic, I use "lol" and "😂" a lot. I'm into tech, football and music. I talk differently to close friends vs randoms. I never apologize easily. I flex sometimes. I use "sha", "abeg", "omo" naturally._\n\n` +
          `The more detail you give, the more accurate your clone becomes.`,
          sock, context.rawMessage.key, context.queue,
        );
      }
      return;
    }

    await setSelfDescription(userId, sessionId, description);
    await sendReply(
      context.chatJid,
      `📝 Self-description saved! Your AI clone now knows:\n_${description.substring(0, 300)}_\n\n` +
      `Run *!autopilot sync* to rebuild your persona profile with this info.`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // ── Sync (re-analyze persona) ──
  if (sub === 'sync' || sub === 'learn' || sub === 'analyze') {
    if (!(await requirePremium(context, sock))) return;

    await sendReply(
      context.chatJid,
      '🧠 Analyzing your messaging DNA... This may take a moment.',
      sock, context.rawMessage.key, context.queue,
    );

    const profile = await analyzePersona(userId, sessionId);

    if (!profile) {
      await sendReply(
        context.chatJid,
        `⚠️ Not enough messages to analyze yet.\n\nSend at least 15 messages normally, then try again.`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    let summary = `🧠 *Persona Profile Built!*\n\n`;
    summary += `━━━━━━━━━━━━━━━━━━━\n`;
    summary += `*Style:* ${profile.formality} • ${profile.avgMessageLength} msgs\n`;
    summary += `*Language:* ${profile.primaryLanguage}`;
    if (profile.languageMixing.length > 0) summary += ` (mixes: ${profile.languageMixing.join(', ')})`;
    summary += `\n`;
    summary += `*Emoji:* ${profile.emojiFrequency} ${profile.favoriteEmojis.slice(0, 5).join('')}\n`;
    summary += `*Sarcasm:* ${profile.sarcasmLevel}\n`;
    summary += `*Confidence:* ${profile.confidenceLevel}\n`;
    summary += `*Expressiveness:* ${profile.emotionalExpressiveness}\n`;
    summary += `*Arguments:* ${profile.argumentStyle}\n`;
    summary += `*Storytelling:* ${profile.storytellingStyle}\n`;
    summary += `*Money talk:* ${profile.moneyTalkStyle}\n`;
    summary += `━━━━━━━━━━━━━━━━━━━\n\n`;

    if (profile.commonPhrases.length > 0) {
      summary += `*Your phrases:* ${profile.commonPhrases.slice(0, 6).join(', ')}\n`;
    }
    if (profile.slangWords.length > 0) {
      summary += `*Your slang:* ${profile.slangWords.slice(0, 6).join(', ')}\n`;
    }
    if (profile.interests.length > 0) {
      summary += `*Interests:* ${profile.interests.slice(0, 5).join(', ')}\n`;
    }
    if (profile.opinions.length > 0) {
      summary += `*Opinions:* ${profile.opinions.slice(0, 3).join(', ')}\n`;
    }
    summary += `\nYour clone is ready! Run *!autopilot on* to activate.`;

    await sendReply(context.chatJid, summary, sock, context.rawMessage.key, context.queue);
    return;
  }

  // ── Preview (test your clone) ──
  if (sub === 'preview' || sub === 'test' || sub === 'try') {
    if (!(await requirePremium(context, sock))) return;
    const testMsg = args.slice(1).join(' ');
    if (!testMsg) {
      await sendReply(
        context.chatJid,
        `Usage: !autopilot preview Hey what's up?\n\n` +
        `This lets you see how your clone would reply to any message.`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    await sendReply(context.chatJid, '🤖 Generating clone response...', sock, context.rawMessage.key, context.queue);

    const reply = await previewAutopilotReply(userId, sessionId, testMsg);

    if (!reply) {
      await sendReply(
        context.chatJid,
        `⚠️ No persona profile yet. Run *!autopilot sync* first.`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    await sendReply(
      context.chatJid,
      `💬 *They said:* "${testMsg}"\n\n🤖 *Your clone replies:*\n${reply}\n\n_This is a preview — not sent to anyone._`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // ── Delay setting ──
  if (sub === 'delay') {
    if (!(await requirePremium(context, sock))) return;
    const mins = parseInt(args[1], 10);
    if (!mins || mins < 1 || mins > 30) {
      await sendReply(
        context.chatJid,
        `Set how long autopilot waits before replying.\nUsage: !autopilot delay [1-30]\n\nExample: !autopilot delay 5 (waits ~5 min)`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }
    await setReplyDelay(userId, sessionId, mins);
    await sendReply(
      context.chatJid,
      `⏱️ Reply delay set to *${mins} minutes* (with natural jitter).`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // ── Inactivity trigger ──
  if (sub === 'inactive' || sub === 'inactivity' || sub === 'timeout') {
    if (!(await requirePremium(context, sock))) return;
    const mins = parseInt(args[1], 10);
    if (!mins || mins < 1 || mins > 60) {
      await sendReply(
        context.chatJid,
        `Set how long you must be inactive before autopilot kicks in.\nUsage: !autopilot inactive [1-60]\n\nExample: !autopilot inactive 5 (after 5 min of no messages from you)`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }
    await setInactivityMinutes(userId, sessionId, mins);
    await sendReply(
      context.chatJid,
      `⏱️ Inactivity trigger set to *${mins} minutes*.\n\nAutopilot will only reply when you haven't sent any message for ${mins}+ minutes.`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // ── Daily limit ──
  if (sub === 'limit' || sub === 'max') {
    if (!(await requirePremium(context, sock))) return;
    const limit = parseInt(args[1], 10);
    if (!limit || limit < 5 || limit > 200) {
      await sendReply(
        context.chatJid,
        `Set max daily auto-replies.\nUsage: !autopilot limit [5-200]\n\nExample: !autopilot limit 50`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }
    await setMaxDailyReplies(userId, sessionId, limit);
    await sendReply(
      context.chatJid,
      `📊 Daily reply limit set to *${limit}*.`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // ── Unknown subcommand ──
  await sendReply(
    context.chatJid,
    `🤖 *AI Autopilot Commands:*\n\n` +
    `!autopilot — View status & persona profile\n` +
    `!autopilot on/off — Toggle globally\n` +
    `!autopilot on/off @person — Toggle for specific contact\n` +
    `!autopilot contacts — View all contacts & their status\n` +
    `!autopilot reset @person — Reset contact to global setting\n` +
    `!autopilot mode [offline/always] — When to reply\n` +
    `!autopilot describe [text] — Tell AI about yourself\n` +
    `!autopilot sync — Build/refresh persona profile\n` +
    `!autopilot preview [msg] — Test your clone\n` +
    `!autopilot delay [1-30] — Reply delay (minutes)\n` +
    `!autopilot inactive [1-60] — Inactivity trigger (minutes)\n` +
    `!autopilot limit [5-200] — Daily reply limit`,
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── Register — disabled ────────────────────────────────────────────────────

// registerCommand({
//   name: 'autopilot',
//   aliases: ['autopilot', 'clone', 'persona', 'ai-me'],
//   category: 'admin',
//   description: 'AI clone that chats as you',
//   ownerOnly: true,
//   execute: (ctx, args, sock) => handleAutopilot(ctx, args, sock),
// });
