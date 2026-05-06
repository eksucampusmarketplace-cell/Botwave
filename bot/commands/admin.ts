import { registerCommand, type MessageContext } from './registry';
import { sendReply, downloadMedia, getQuotedMessage, pickResponse } from './helpers';
import { getAfkState, setAfkState, getFeatureEnabled, setFeatureEnabled, getSessionSettings, updateSessionSettings, getWelcomeMessage, setWelcomeMessage, getUserSubscription, getRewardBalance, getSessionUserId, getUserReferralCode } from '../database';
import { getDeletedMessages, clearRecoveredMessages } from '../handlers/AntiDeleteHandler';

const CASHOUT_THRESHOLD = 100;
import { afkReplies, welcomeReplies, goodbyeReplies } from '../utils/responsePools';
import sharp from 'sharp';

function normalizeJid(jid: string): string {
  if (!jid) return jid;
  return jid.replace(/:\d+@/, '@').trim();
}

async function handleAfk(
  context: MessageContext,
  args: string[],
  sock: any,
  vars: { name?: string; time?: string; date?: string; group?: string },
): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'AFK not available without a session.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const subcommand = args[0]?.toLowerCase();
  const reason = args.slice(1).join(' ') || args.join(' ');

  const normalizedJid = normalizeJid(context.senderJid);

  if (subcommand === 'off') {
    await setAfkState(context.sessionId, normalizedJid, false);
    await sendReply(
      context.chatJid,
      `Welcome back, ${vars.name}! AFK mode disabled.`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  // Default: turn on
  const afkReason = subcommand === 'on' ? args.slice(1).join(' ') || undefined : reason || undefined;
  await setAfkState(context.sessionId, normalizedJid, true, afkReason);
  await sendReply(
    context.chatJid,
    `${vars.name} is now AFK.${afkReason ? ` Reason: ${afkReason}` : ''}`,
    sock,
    context.rawMessage.key,
    context.queue,
  );
}

async function handleTagAll(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.isGroup) {
    await sendReply(context.chatJid, 'This command only works in groups.', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const groupMetadata = await sock.groupMetadata(context.chatJid);
    const participants = groupMetadata?.participants || [];
    if (!participants.length) {
      await sendReply(context.chatJid, 'Could not fetch group members.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const customMsg = args.length > 0 ? args.join(' ') : 'Attention everyone!';
    const mentions: string[] = [];
    let tagText = `*${customMsg}*\n\n`;

    // Batch to max 50 per message to avoid issues
    const batch = participants.slice(0, 50);
    for (const p of batch) {
      const jid = p.id;
      mentions.push(jid);
      const number = jid.split('@')[0];
      tagText += `@${number} `;
    }

    if (participants.length > 50) {
      tagText += `\n\n_...and ${participants.length - 50} more members_`;
    }

    await sock.sendMessage(context.chatJid, { text: tagText.trim(), mentions }, { quoted: context.rawMessage });
  } catch (error) {
    console.error('[TAGALL] Error:', error);
    await sendReply(context.chatJid, 'Failed to tag members. Bot may need admin rights.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleGroupInfo(context: MessageContext, sock: any): Promise<void> {
  if (!context.isGroup) {
    await sendReply(context.chatJid, 'This command only works in groups.', sock, context.rawMessage.key, context.queue);
    return;
  }
  try {
    const metadata = await sock.groupMetadata(context.chatJid);
    const admins = metadata.participants?.filter((p: any) => p.admin === 'admin' || p.admin === 'superadmin') || [];
    const totalMembers = metadata.participants?.length || 0;

    let msg = `*GROUP INFO*\n\n`;
    msg += `Name: ${metadata.subject || 'Unknown'}\n`;
    msg += `Members: ${totalMembers}\n`;
    msg += `Admins: ${admins.length}\n`;
    if (metadata.desc) {
      msg += `\nDescription:\n${metadata.desc.slice(0, 500)}\n`;
    }
    msg += `\nCreated: ${metadata.creation ? new Date(metadata.creation * 1000).toLocaleDateString() : 'Unknown'}`;

    await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[GROUP] Error:', error);
    await sendReply(context.chatJid, 'Failed to fetch group info.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleSettings(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.sessionId) {
    await sendReply(context.chatJid, 'Session not available.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const sub = args[0]?.toLowerCase();

  if (!sub) {
    const settings = await getSessionSettings(context.sessionId);
    const afkEnabled = settings?.afk_enabled ? 'ON' : 'OFF';
    const afkMsg = settings?.afk_message || 'I am currently away';
    const botName = settings?.bot_name || 'BotWave';

    await sendReply(
      context.chatJid,
      `*BOT SETTINGS*\n\n` +
      `*Bot Name:* ${botName}\n` +
      `*AFK:* ${afkEnabled}\n` +
      `*AFK Message:* ${afkMsg}\n\n` +
      `*Commands:*\n` +
      `!settings afk on/off — Toggle AFK\n` +
      `!settings afk msg [text] — Set AFK message\n` +
      `!settings name [name] — Set bot name\n` +
      `!settings welcome on/off — Toggle welcome/goodbye\n` +
      `!settings status — Show current settings`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  if (sub === 'status') {
    const settings = await getSessionSettings(context.sessionId);
    const afkEnabled = settings?.afk_enabled ? 'ON' : 'OFF';
    const afkMsg = settings?.afk_message || 'I am currently away';
    const botName = settings?.bot_name || 'BotWave';

    await sendReply(
      context.chatJid,
      `*Current Settings:*\n` +
      `Bot Name: ${botName}\n` +
      `AFK: ${afkEnabled}\n` +
      `AFK Message: ${afkMsg}`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  if (sub === 'afk') {
    const action = args[1]?.toLowerCase();
    if (action === 'on' || action === 'enable') {
      await updateSessionSettings(context.sessionId, { afk_enabled: true });
      await sendReply(context.chatJid, 'AFK auto-reply *enabled*.', sock, context.rawMessage.key, context.queue);
    } else if (action === 'off' || action === 'disable') {
      await updateSessionSettings(context.sessionId, { afk_enabled: false });
      await sendReply(context.chatJid, 'AFK auto-reply *disabled*.', sock, context.rawMessage.key, context.queue);
    } else if (action === 'msg' || action === 'message') {
      const msg = args.slice(2).join(' ');
      if (!msg) {
        await sendReply(context.chatJid, 'Usage: !settings afk msg [your message]', sock, context.rawMessage.key, context.queue);
        return;
      }
      await updateSessionSettings(context.sessionId, { afk_message: msg });
      await sendReply(context.chatJid, `AFK message set to: _${msg}_`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Usage: !settings afk on/off/msg [text]', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  if (sub === 'name' || sub === 'botname') {
    const name = args.slice(1).join(' ');
    if (!name) {
      await sendReply(context.chatJid, 'Usage: !settings name [bot name]', sock, context.rawMessage.key, context.queue);
      return;
    }
    await updateSessionSettings(context.sessionId, { bot_name: name });
    await sendReply(context.chatJid, `Bot name set to: *${name}*`, sock, context.rawMessage.key, context.queue);
    return;
  }

  if (sub === 'welcome') {
    const action = args[1]?.toLowerCase();
    if (!context.sessionId || !context.userId) {
      await sendReply(context.chatJid, 'Session not available.', sock, context.rawMessage.key, context.queue);
      return;
    }
    if (action === 'on' || action === 'enable') {
      await setFeatureEnabled(context.userId, context.sessionId, 'welcome', true);
      await sendReply(context.chatJid, 'Welcome/goodbye messages *enabled*.', sock, context.rawMessage.key, context.queue);
    } else if (action === 'off' || action === 'disable') {
      await setFeatureEnabled(context.userId, context.sessionId, 'welcome', false);
      await sendReply(context.chatJid, 'Welcome/goodbye messages *disabled*.', sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Usage: !settings welcome on/off', sock, context.rawMessage.key, context.queue);
    }
    return;
  }

  await sendReply(
    context.chatJid,
    'Unknown setting. Use !settings to see available options.',
    sock, context.rawMessage.key, context.queue,
  );
}

async function handleBalance(context: MessageContext, sock: any): Promise<void> {
  const userId = context.userId || (context.sessionId ? await getSessionUserId(context.sessionId) : null);
  if (!userId) {
    await sendReply(context.chatJid, 'Could not determine your account.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const balance = await getRewardBalance(userId);
  const progress = Math.min(100, Math.round((balance.balance / CASHOUT_THRESHOLD) * 100));
  const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

  const msg =
    `*REWARD BALANCE*\n\n` +
    `Balance: ₦${balance.balance}\n` +
    `Total earned: ₦${balance.totalEarned}\n` +
    `Total cashed out: ₦${balance.totalCashedOut}\n\n` +
    `Progress to ₦${CASHOUT_THRESHOLD} cashout:\n` +
    `[${progressBar}] ${progress}%\n\n` +
    `_Earn rewards by using commands, staying active daily, and referring friends!_`;

  await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
}

async function handlePlan(context: MessageContext, sock: any): Promise<void> {
  const userId = context.userId || (context.sessionId ? await getSessionUserId(context.sessionId) : null);
  if (!userId) {
    await sendReply(context.chatJid, 'Could not determine your account.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const sub = await getUserSubscription(userId);
  const planNames: Record<string, string> = { free: 'Free', lite: 'Lite (₦500/mo)', standard: 'Standard (₦1,000/mo)', boss: 'Boss (₦2,000/mo)' };
  const quotaDisplay = sub.quotaLimit === -1 ? 'Unlimited' : `${sub.quotaUsed}/${sub.quotaLimit}`;
  const aiDisplay = sub.aiDailyLimit === -1 ? 'Unlimited' : `${sub.aiDailyLimit}/day`;

  const msg =
    `*YOUR PLAN*\n\n` +
    `Plan: ${planNames[sub.plan] || sub.plan}\n` +
    `Status: ${sub.status}\n` +
    `Messages used: ${quotaDisplay}\n` +
    `Sessions: ${sub.sessionLimit}\n` +
    `AI queries: ${aiDisplay}\n\n` +
    `_Send *!upgrade* to see plans and pay directly here, or visit your dashboard._`;

  await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
}

async function handleAutoView(context: MessageContext, args: string[], sock: any): Promise<void> {
  const userId = context.userId || (context.sessionId ? await getSessionUserId(context.sessionId) : null);
  if (!context.sessionId || !userId) {
    await sendReply(context.chatJid, 'Session not available.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const sub = args[0]?.toLowerCase();

  if (!sub || sub === 'status') {
    const enabled = await getFeatureEnabled(userId, 'autoview');
    await sendReply(
      context.chatJid,
      `*AUTO STATUS VIEWER*\n\n` +
      `*Status:* ${enabled ? 'ON' : 'OFF'}\n` +
      `*Reaction:* ❤️\n` +
      `*Daily cap:* 50 statuses\n` +
      `*Skip rate:* ~15% (anti-ban)\n\n` +
      `*Commands:*\n` +
      `!autoview on — Enable auto-view + react\n` +
      `!autoview off — Disable\n\n` +
      `Bot will automatically view and react to your contacts' statuses one by one with random delays (5-15s) to stay ban-safe.`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  if (sub === 'on' || sub === 'enable') {
    await setFeatureEnabled(userId, context.sessionId, 'autoview', true);
    await sendReply(context.chatJid, 'Auto status viewer *enabled*. Bot will view + react to statuses with ❤️ (max 50/day, with random delays).', sock, context.rawMessage.key, context.queue);
    return;
  }

  if (sub === 'off' || sub === 'disable') {
    await setFeatureEnabled(userId, context.sessionId, 'autoview', false);
    await sendReply(context.chatJid, 'Auto status viewer *disabled*.', sock, context.rawMessage.key, context.queue);
    return;
  }

  await sendReply(context.chatJid, 'Usage: !autoview on/off', sock, context.rawMessage.key, context.queue);
}

async function handleWelcomeCmd(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.isGroup) {
    await sendReply(context.chatJid, 'This command only works in groups. Set a custom welcome message for this group.', sock, context.rawMessage.key, context.queue);
    return;
  }
  const userId = context.userId || (context.sessionId ? await getSessionUserId(context.sessionId) : null);
  if (!context.sessionId || !userId) {
    await sendReply(context.chatJid, 'Session not available.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const text = args.join(' ');
  if (!text) {
    const current = await getWelcomeMessage(context.sessionId, context.chatJid, 'welcome');
    await sendReply(
      context.chatJid,
      `*WELCOME MESSAGE*\n\n` +
      `Current: ${current || '_Default random messages_'}\n\n` +
      `*Set custom:* !welcome Hello {name}, welcome to {group}!\n\n` +
      `*Placeholders:*\n` +
      `{name} — new member's name\n` +
      `{group} — group name\n` +
      `{time} — current time\n` +
      `{date} — current date\n` +
      `{count} — member count\n\n` +
      `*Reset to default:* !welcome reset\n` +
      `*Toggle on/off:* !settings welcome on/off`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  if (text.toLowerCase() === 'reset') {
    await setWelcomeMessage(userId, context.sessionId, context.chatJid, '', 'welcome');
    await sendReply(context.chatJid, 'Welcome message reset to default.', sock, context.rawMessage.key, context.queue);
    return;
  }

  await setWelcomeMessage(userId, context.sessionId, context.chatJid, text, 'welcome');
  await sendReply(context.chatJid, `Custom welcome message set!\n\nPreview: ${text.replace(/\{name\}/g, 'John').replace(/\{group\}/g, 'Test Group')}`, sock, context.rawMessage.key, context.queue);
}

async function handleGoodbyeCmd(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.isGroup) {
    await sendReply(context.chatJid, 'This command only works in groups. Set a custom goodbye message for this group.', sock, context.rawMessage.key, context.queue);
    return;
  }
  const userId = context.userId || (context.sessionId ? await getSessionUserId(context.sessionId) : null);
  if (!context.sessionId || !userId) {
    await sendReply(context.chatJid, 'Session not available.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const text = args.join(' ');
  if (!text) {
    const current = await getWelcomeMessage(context.sessionId, context.chatJid, 'goodbye');
    await sendReply(
      context.chatJid,
      `*GOODBYE MESSAGE*\n\n` +
      `Current: ${current || '_Default random messages_'}\n\n` +
      `*Set custom:* !goodbye Bye {name}, we'll miss you!\n\n` +
      `*Placeholders:* {name}, {group}, {time}, {date}, {count}\n\n` +
      `*Reset to default:* !goodbye reset`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  if (text.toLowerCase() === 'reset') {
    await setWelcomeMessage(userId, context.sessionId, context.chatJid, '', 'goodbye');
    await sendReply(context.chatJid, 'Goodbye message reset to default.', sock, context.rawMessage.key, context.queue);
    return;
  }

  await setWelcomeMessage(userId, context.sessionId, context.chatJid, text, 'goodbye');
  await sendReply(context.chatJid, `Custom goodbye message set!\n\nPreview: ${text.replace(/\{name\}/g, 'John').replace(/\{group\}/g, 'Test Group')}`, sock, context.rawMessage.key, context.queue);
}

async function handleKick(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.isGroup) {
    await sendReply(context.chatJid, 'This command only works in groups.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const metadata = await sock.groupMetadata(context.chatJid);
    const botJid = (sock as any).user?.id;
    const botParticipant = metadata.participants?.find((p: any) => p.id === botJid);
    if (!botParticipant?.admin) {
      await sendReply(context.chatJid, 'Bot must be a group admin to kick members.', sock, context.rawMessage.key, context.queue);
      return;
    }

    // Get target from mentioned user or quoted message
    const quotedMsg = getQuotedMessage(context.rawMessage);
    const mentioned = context.rawMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let targetJid = mentioned[0] || quotedMsg?.participant || null;

    if (!targetJid && args.length > 0) {
      const number = args[0].replace(/[^0-9]/g, '');
      if (number) targetJid = `${number}@s.whatsapp.net`;
    }

    if (!targetJid) {
      await sendReply(context.chatJid, '*!kick* — Remove a member from the group\n\nUsage:\n- Reply to their message with !kick\n- Or: !kick @mention\n- Or: !kick 2348012345678', sock, context.rawMessage.key, context.queue);
      return;
    }

    await sock.groupParticipantsUpdate(context.chatJid, [targetJid], 'remove');
    const number = targetJid.split('@')[0];
    await sendReply(context.chatJid, `Removed @${number} from the group.`, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[KICK] Error:', error);
    await sendReply(context.chatJid, 'Failed to kick member. Make sure the bot is an admin.', sock, context.rawMessage.key, context.queue);
  }
}

async function handlePromote(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.isGroup) {
    await sendReply(context.chatJid, 'This command only works in groups.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const metadata = await sock.groupMetadata(context.chatJid);
    const botJid = (sock as any).user?.id;
    const botParticipant = metadata.participants?.find((p: any) => p.id === botJid);
    if (!botParticipant?.admin) {
      await sendReply(context.chatJid, 'Bot must be a group admin to promote members.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const quotedMsg = getQuotedMessage(context.rawMessage);
    const mentioned = context.rawMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let targetJid = mentioned[0] || quotedMsg?.participant || null;

    if (!targetJid && args.length > 0) {
      const number = args[0].replace(/[^0-9]/g, '');
      if (number) targetJid = `${number}@s.whatsapp.net`;
    }

    if (!targetJid) {
      await sendReply(context.chatJid, '*!promote* — Make a member admin\n\nUsage:\n- Reply to their message with !promote\n- Or: !promote @mention\n- Or: !promote 2348012345678', sock, context.rawMessage.key, context.queue);
      return;
    }

    await sock.groupParticipantsUpdate(context.chatJid, [targetJid], 'promote');
    const number = targetJid.split('@')[0];
    await sendReply(context.chatJid, `Promoted @${number} to admin.`, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[PROMOTE] Error:', error);
    await sendReply(context.chatJid, 'Failed to promote member. Make sure the bot is an admin.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleDemote(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!context.isGroup) {
    await sendReply(context.chatJid, 'This command only works in groups.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const metadata = await sock.groupMetadata(context.chatJid);
    const botJid = (sock as any).user?.id;
    const botParticipant = metadata.participants?.find((p: any) => p.id === botJid);
    if (!botParticipant?.admin) {
      await sendReply(context.chatJid, 'Bot must be a group admin to demote members.', sock, context.rawMessage.key, context.queue);
      return;
    }

    const quotedMsg = getQuotedMessage(context.rawMessage);
    const mentioned = context.rawMessage.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let targetJid = mentioned[0] || quotedMsg?.participant || null;

    if (!targetJid && args.length > 0) {
      const number = args[0].replace(/[^0-9]/g, '');
      if (number) targetJid = `${number}@s.whatsapp.net`;
    }

    if (!targetJid) {
      await sendReply(context.chatJid, '*!demote* — Remove admin from a member\n\nUsage:\n- Reply to their message with !demote\n- Or: !demote @mention\n- Or: !demote 2348012345678', sock, context.rawMessage.key, context.queue);
      return;
    }

    await sock.groupParticipantsUpdate(context.chatJid, [targetJid], 'demote');
    const number = targetJid.split('@')[0];
    await sendReply(context.chatJid, `Demoted @${number} from admin.`, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[DEMOTE] Error:', error);
    await sendReply(context.chatJid, 'Failed to demote member. Make sure the bot is an admin.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleBio(context: MessageContext, args: string[], sock: any): Promise<void> {
  if (!args.length) {
    await sendReply(context.chatJid, '*UPDATE BIO*\n\n!bio [your new bio text]\n\nExample: !bio Living my best life', sock, context.rawMessage.key, context.queue);
    return;
  }

  const bioText = args.join(' ').slice(0, 139); // WhatsApp bio limit

  try {
    if (typeof sock.updateProfileStatus === 'function') {
      await sock.updateProfileStatus(bioText);
      await sendReply(context.chatJid, `Bio updated to: "${bioText}"`, sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Bio update is not supported in the current connection mode.', sock, context.rawMessage.key, context.queue);
    }
  } catch (error) {
    console.error('[BIO] Error:', error);
    await sendReply(context.chatJid, 'Failed to update bio.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleSetPP(context: MessageContext, sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  const hasImage = quotedMsg?.imageMessage || (context.rawMessage?.message as any)?.imageMessage;

  if (!hasImage) {
    await sendReply(context.chatJid, '*SET PROFILE PICTURE*\n\nSend or reply to an image with *!setpp* to set it as your WhatsApp profile picture.', sock, context.rawMessage.key, context.queue);
    return;
  }

  try {
    const msgForDownload = quotedMsg?.imageMessage ? { ...context.rawMessage, message: quotedMsg } : context.rawMessage;
    const buffer = await downloadMedia(msgForDownload, sock);
    if (!buffer) {
      await sendReply(context.chatJid, 'Could not download the image.', sock, context.rawMessage.key, context.queue);
      return;
    }

    // Resize to square for profile picture
    const resized = await sharp(buffer).resize(640, 640, { fit: 'cover' }).jpeg().toBuffer();
    const base64 = 'data:image/jpeg;base64,' + resized.toString('base64');

    if (typeof sock.updateProfilePicture === 'function') {
      await sock.updateProfilePicture(base64);
      await sendReply(context.chatJid, 'Profile picture updated!', sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Profile picture update is not supported in the current connection mode.', sock, context.rawMessage.key, context.queue);
    }
  } catch (error) {
    console.error('[SETPP] Error:', error);
    await sendReply(context.chatJid, 'Failed to update profile picture.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleMarkRead(context: MessageContext, sock: any): Promise<void> {
  try {
    if (typeof sock.readMessages === 'function') {
      await sock.readMessages([context.rawMessage.key]);
      await sendReply(context.chatJid, 'Messages marked as read.', sock, context.rawMessage.key, context.queue);
    } else {
      await sendReply(context.chatJid, 'Mark-read is not supported in the current connection mode.', sock, context.rawMessage.key, context.queue);
    }
  } catch (error) {
    console.error('[READ] Error:', error);
    await sendReply(context.chatJid, 'Failed to mark messages as read.', sock, context.rawMessage.key, context.queue);
  }
}

async function handleForward(context: MessageContext, args: string[], sock: any): Promise<void> {
  const quotedMsg = getQuotedMessage(context.rawMessage);
  if (!quotedMsg || !args.length) {
    await sendReply(
      context.chatJid,
      '*FORWARD MESSAGE*\n\nReply to a message with:\n!forward [phone number]\n\nExample: !forward 2348012345678\n\nThe message will be forwarded to that contact.',
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  try {
    let targetNumber = args[0].replace(/[^0-9]/g, '');
    if (!targetNumber.includes('@')) {
      targetNumber = targetNumber + '@s.whatsapp.net';
    }

    // Forward the quoted message content
    if (quotedMsg.conversation || quotedMsg.extendedTextMessage?.text) {
      const text = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
      await sock.sendMessage(targetNumber, { text });
    } else if (quotedMsg.imageMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(targetNumber, { image: buffer, caption: quotedMsg.imageMessage.caption || '' });
      }
    } else if (quotedMsg.videoMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(targetNumber, { video: buffer, caption: quotedMsg.videoMessage.caption || '' });
      }
    } else if (quotedMsg.audioMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(targetNumber, { audio: buffer, mimetype: 'audio/mpeg' });
      }
    } else if (quotedMsg.documentMessage) {
      const buffer = await downloadMedia({ ...context.rawMessage, message: quotedMsg }, sock);
      if (buffer) {
        await sock.sendMessage(targetNumber, { document: buffer, mimetype: quotedMsg.documentMessage.mimetype || 'application/octet-stream', fileName: quotedMsg.documentMessage.fileName || 'document' });
      }
    } else {
      await sendReply(context.chatJid, 'This message type cannot be forwarded.', sock, context.rawMessage.key, context.queue);
      return;
    }

    await sendReply(context.chatJid, `Message forwarded to ${args[0]}`, sock, context.rawMessage.key, context.queue);
  } catch (error) {
    console.error('[FORWARD] Error:', error);
    await sendReply(context.chatJid, 'Failed to forward message. Check the phone number.', sock, context.rawMessage.key, context.queue);
  }
}

// ─── Anti-Delete Toggle ─────────────────────────────────────────────────────

async function handleAntiDelete(
  context: MessageContext,
  args: string[],
  sock: any,
): Promise<void> {
  if (!context.userId || !context.sessionId) {
    await sendReply(context.chatJid, 'Anti-delete requires an active session.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const action = args[0]?.toLowerCase();

  if (!action || (action !== 'on' && action !== 'off' && action !== 'enable' && action !== 'disable' && action !== 'status')) {
    const current = await getFeatureEnabled(context.userId, 'anti_delete');
    await sendReply(
      context.chatJid,
      `*Anti-Delete* is currently *${current ? 'ON' : 'OFF'}*\n\nUsage:\n!antidelete on — recover deleted messages\n!antidelete off — disable recovery`,
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  if (action === 'status') {
    const current = await getFeatureEnabled(context.userId, 'anti_delete');
    await sendReply(context.chatJid, `Anti-Delete is *${current ? 'ON' : 'OFF'}*`, sock, context.rawMessage.key, context.queue);
    return;
  }

  const enable = action === 'on' || action === 'enable';
  const saved = await setFeatureEnabled(context.userId, context.sessionId, 'anti_delete', enable);
  if (!saved) {
    await sendReply(context.chatJid, 'Failed to update anti-delete setting. Please try again.', sock, context.rawMessage.key, context.queue);
    return;
  }
  await sendReply(
    context.chatJid,
    enable
      ? 'Anti-Delete *enabled*. Messages will be cached silently. Use *!recover* to view deleted messages.'
      : 'Anti-Delete *disabled*. Message caching stopped.',
    sock,
    context.rawMessage.key,
    context.queue,
  );
}

// ─── Recover Deleted Messages ───────────────────────────────────────────────

async function handleRecover(
  context: MessageContext,
  _args: string[],
  sock: any,
): Promise<void> {
  if (!context.userId || !context.sessionId) {
    await sendReply(context.chatJid, 'Recover requires an active session.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const enabled = await getFeatureEnabled(context.userId, 'anti_delete');
  if (!enabled) {
    await sendReply(context.chatJid, 'Anti-delete is not enabled. Use *!antidelete on* first.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const deleted = getDeletedMessages(context.sessionId, context.chatJid);
  if (deleted.length === 0) {
    await sendReply(context.chatJid, 'No deleted messages found in the last 10 minutes.', sock, context.rawMessage.key, context.queue);
    return;
  }

  for (const msg of deleted) {
    const tag = context.isGroup ? `@${msg.deleterJid.replace(/@.*/, '')}` : msg.deleterName;
    const ago = Math.round((Date.now() - msg.deletedAt) / 1000);
    const timeLabel = ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`;

    try {
      if (msg.mediaBuffer && msg.mediaType) {
        const caption = `_${tag} deleted a ${msg.mediaType} (${timeLabel}):_${msg.mediaCaption ? `\n_Caption: ${msg.mediaCaption}_` : ''}`;
        const needsSeparate = msg.mediaType === 'sticker' || msg.mediaType === 'audio';

        if (needsSeparate) {
          const mentions = context.isGroup ? [msg.deleterJid] : undefined;
          await sendReply(context.chatJid, { text: caption, mentions }, sock, context.rawMessage.key, context.queue);
        }

        const payload = buildMediaPayload(
          msg.mediaBuffer,
          msg.mediaType,
          msg.mediaMimetype,
          needsSeparate ? '' : caption,
          context.isGroup ? [msg.deleterJid] : undefined,
        );

        if (context.queue) {
          context.queue.enqueue(context.chatJid, payload);
        } else {
          await sock.sendMessage(context.chatJid, payload);
        }
      } else if (msg.content) {
        const text = `_${tag} deleted (${timeLabel}):_\n\n${msg.content}`;
        const mentions = context.isGroup ? [msg.deleterJid] : undefined;
        await sendReply(context.chatJid, { text, mentions }, sock, context.rawMessage.key, context.queue);
      } else if (msg.mediaType) {
        const text = `_${tag} deleted a ${msg.mediaType} (${timeLabel})${msg.mediaCaption ? ` — "${msg.mediaCaption}"` : ''}_ (media expired)`;
        const mentions = context.isGroup ? [msg.deleterJid] : undefined;
        await sendReply(context.chatJid, { text, mentions }, sock, context.rawMessage.key, context.queue);
      }
    } catch (err) {
      console.error('[RECOVER] Error sending recovered message:', err);
    }
  }

  clearRecoveredMessages(context.sessionId, context.chatJid);
}

function buildMediaPayload(
  buffer: Buffer,
  mediaType: string,
  mimetype: string | null,
  caption: string,
  mentions?: string[],
): Record<string, unknown> {
  switch (mediaType) {
    case 'image':
      return { image: buffer, caption, mimetype: mimetype || 'image/jpeg', mentions };
    case 'video':
      return { video: buffer, caption, mimetype: mimetype || 'video/mp4', mentions };
    case 'audio':
      return { audio: buffer, mimetype: mimetype || 'audio/ogg; codecs=opus', ptt: true };
    case 'sticker':
      return { sticker: buffer, mimetype: mimetype || 'image/webp' };
    case 'document':
      return { document: buffer, caption, mimetype: mimetype || 'application/octet-stream', fileName: 'recovered_file', mentions };
    default:
      return { text: caption, mentions };
  }
}

// ─── Refer Command ──────────────────────────────────────────────────────────

async function handleRefer(context: MessageContext, sock: any): Promise<void> {
  const userId = context.userId || (context.sessionId ? await getSessionUserId(context.sessionId) : null);
  if (!userId) {
    await sendReply(context.chatJid, 'Could not determine your account.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const referral = await getUserReferralCode(userId);
  if (!referral) {
    await sendReply(context.chatJid, '⚠️ Could not generate your referral code. Try again later.', sock, context.rawMessage.key, context.queue);
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://botwave-tx86.onrender.com';
  const referralLink = `${appUrl}/signup?ref=${referral.code}`;

  const msg =
    `🎁 *YOUR REFERRAL*\n\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `*Code:* \`\`\`${referral.code}\`\`\`\n\n` +
    `*Link:* ${referralLink}\n` +
    `━━━━━━━━━━━━━━━━━\n\n` +
    `*Stats:*\n` +
    `• Friends referred: *${referral.totalReferred}*\n` +
    `• Total earned: *₦${referral.totalEarned}*\n\n` +
    `Share your code or link with friends. You earn *₦20* for each friend who joins, and they get *₦10* too!\n\n` +
    `_Cash out at ₦100 for free airtime via !cashout_`;

  await sendReply(context.chatJid, msg, sock, context.rawMessage.key, context.queue);
}

// ─── Register Admin Commands ────────────────────────────────────────────────

registerCommand({ name: 'afk', aliases: ['afk'], category: 'admin', description: 'Set AFK status', execute: (ctx, args, sock, vars) => handleAfk(ctx, args, sock, vars) });
registerCommand({ name: 'tagall', aliases: ['tagall', 'everyone', 'all'], category: 'admin', description: 'Tag all group members', execute: (ctx, args, sock) => handleTagAll(ctx, args, sock) });
registerCommand({ name: 'group', aliases: ['group', 'groupinfo', 'ginfo'], category: 'admin', description: 'Group info', execute: (ctx, _a, sock) => handleGroupInfo(ctx, sock) });
registerCommand({ name: 'settings', aliases: ['settings', 'config', 'set'], category: 'admin', description: 'Bot settings', execute: (ctx, args, sock) => handleSettings(ctx, args, sock) });
registerCommand({ name: 'balance', aliases: ['balance', 'bal', 'rewards'], category: 'admin', description: 'Check reward balance', execute: (ctx, _a, sock) => handleBalance(ctx, sock) });
registerCommand({ name: 'plan', aliases: ['plan', 'subscription', 'sub'], category: 'admin', description: 'View subscription', execute: (ctx, _a, sock) => handlePlan(ctx, sock) });
registerCommand({ name: 'autoview', aliases: ['autoview', 'statusview'], category: 'admin', description: 'Auto-view statuses', execute: (ctx, args, sock) => handleAutoView(ctx, args, sock) });
registerCommand({ name: 'welcome', aliases: ['welcome'], category: 'admin', description: 'Set welcome message', execute: (ctx, args, sock) => handleWelcomeCmd(ctx, args, sock) });
registerCommand({ name: 'goodbye', aliases: ['goodbye', 'bye'], category: 'admin', description: 'Set goodbye message', execute: (ctx, args, sock) => handleGoodbyeCmd(ctx, args, sock) });
registerCommand({ name: 'kick', aliases: ['kick', 'remove'], category: 'admin', description: 'Remove group member', execute: (ctx, args, sock) => handleKick(ctx, args, sock) });
registerCommand({ name: 'promote', aliases: ['promote', 'mod'], category: 'admin', description: 'Promote to admin', execute: (ctx, args, sock) => handlePromote(ctx, args, sock) });
registerCommand({ name: 'demote', aliases: ['demote', 'unmod'], category: 'admin', description: 'Demote from admin', execute: (ctx, args, sock) => handleDemote(ctx, args, sock) });
registerCommand({ name: 'bio', aliases: ['bio', 'about'], category: 'admin', description: 'Set bot bio/about', execute: (ctx, args, sock) => handleBio(ctx, args, sock) });
registerCommand({ name: 'setpp', aliases: ['setpp', 'setpfp', 'profilepic'], category: 'admin', description: 'Set profile picture', execute: (ctx, _a, sock) => handleSetPP(ctx, sock) });
registerCommand({ name: 'markread', aliases: ['markread', 'read'], category: 'admin', description: 'Mark messages read', execute: (ctx, _a, sock) => handleMarkRead(ctx, sock) });
registerCommand({ name: 'forward', aliases: ['forward', 'fwd'], category: 'admin', description: 'Forward a message', execute: (ctx, args, sock) => handleForward(ctx, args, sock) });
registerCommand({ name: 'antidelete', aliases: ['antidelete', 'antidel'], category: 'admin', description: 'Toggle deleted message recovery', execute: (ctx, args, sock) => handleAntiDelete(ctx, args, sock) });
registerCommand({ name: 'recover', aliases: ['recover', 'deleted'], category: 'admin', description: 'View deleted messages (last 10 min)', execute: (ctx, args, sock) => handleRecover(ctx, args, sock) });
registerCommand({ name: 'refer', aliases: ['refer', 'referral', 'invite'], category: 'admin', description: 'Get your referral code and link', execute: (ctx, _a, sock) => handleRefer(ctx, sock) });
