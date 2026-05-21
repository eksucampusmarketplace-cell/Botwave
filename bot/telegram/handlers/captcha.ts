/**
 * Button captcha for new members.
 * Restricts new members until they click a verify button.
 */

import { Bot, InlineKeyboard } from 'grammy';
import { requireAdmin } from '../utils/permissions';
import { getGroupConfig, updateTelegramConfig, setCaptchaPending, markCaptchaVerified, isCaptchaVerified } from '../utils/db';

function parseDuration(str: string): number {
  const match = str.match(/^(\d+)\s*(s|m|h|d)?$/i);
  if (!match) return 60_000;
  const val = parseInt(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  if (unit === 'm') return val * 60_000;
  if (unit === 'h') return val * 3600_000;
  if (unit === 'd') return val * 86400_000;
  return val * 1000;
}

const mathChallenges = new Map<string, { answer: number; expires: number }>();

function generateMathChallenge(): { question: string; answer: number } {
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;
  if (op === '+') { a = Math.floor(Math.random() * 50); b = Math.floor(Math.random() * 50); answer = a + b; }
  else if (op === '-') { a = Math.floor(Math.random() * 50) + 10; b = Math.floor(Math.random() * a); answer = a - b; }
  else { a = Math.floor(Math.random() * 12) + 1; b = Math.floor(Math.random() * 12) + 1; answer = a * b; }
  return { question: `${a} ${op} ${b}`, answer };
}

function generateTextChallenge(): { code: string } {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return { code };
}

const textChallenges = new Map<string, { code: string; expires: number }>();

export function registerCaptchaHandlers(bot: Bot, sessionId: string): void {
  bot.on(':new_chat_members', async (ctx) => {
    const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
    if (!config.captcha_enabled) return;

    const captchaMode = (config as Record<string, unknown>).captcha_mode as string || 'button';
    const customBtnText = (config as Record<string, unknown>).captcha_button_text as string | undefined;
    const muteTimeStr = (config as Record<string, unknown>).captcha_mute_time as string | undefined;
    const muteTimeMs = muteTimeStr ? parseDuration(muteTimeStr) : 60_000;

    for (const member of ctx.message!.new_chat_members!) {
      if (member.is_bot) continue;

      try {
        await ctx.restrictChatMember(member.id, {
          can_send_messages: captchaMode === 'math' || captchaMode === 'text' || captchaMode === 'text2',
          can_send_other_messages: false,
          can_add_web_page_previews: false,
        });
      } catch (err) {
        console.error(`[TG-CAPTCHA] Failed to restrict ${member.id}:`, err);
        continue;
      }

      const expiresAt = new Date(Date.now() + muteTimeMs);
      await setCaptchaPending(sessionId, ctx.chat.id.toString(), member.id.toString(), expiresAt);

      let msg;
      const chatKey = `${ctx.chat.id}:${member.id}`;

      if (captchaMode === 'math') {
        const challenge = generateMathChallenge();
        mathChallenges.set(chatKey, { answer: challenge.answer, expires: Date.now() + muteTimeMs });
        msg = await ctx.reply(
          `👋 Welcome ${member.first_name}!\n` +
          `🔢 Solve this to verify: *${challenge.question} = ?*\n` +
          `Type the answer. You have ${Math.round(muteTimeMs / 1000)} seconds.`,
          { parse_mode: 'Markdown' },
        );
      } else if (captchaMode === 'text' || captchaMode === 'text2') {
        const challenge = generateTextChallenge();
        textChallenges.set(chatKey, { code: challenge.code, expires: Date.now() + muteTimeMs });
        msg = await ctx.reply(
          `👋 Welcome ${member.first_name}!\n` +
          `🔤 Type the following code to verify: \`${challenge.code}\`\n` +
          `You have ${Math.round(muteTimeMs / 1000)} seconds.`,
          { parse_mode: 'Markdown' },
        );
      } else {
        const keyboard = new InlineKeyboard()
          .text(customBtnText || `✅ I'm human - click to verify`, `captcha:${member.id}:${ctx.chat.id}`);

        msg = await ctx.reply(
          `👋 Welcome ${member.first_name}!\n` +
          `Please click the button below to verify you are human.\n` +
          `You have ${Math.round(muteTimeMs / 1000)} seconds.`,
          { reply_markup: keyboard },
        );
      }

      // Auto-kick after 60 seconds if not verified
      const chatId = ctx.chat.id;
      const msgId = msg.message_id;
      const memberId = member.id;

      setTimeout(async () => {
        try {
          const verified = await isCaptchaVerified(sessionId, chatId.toString(), memberId.toString());
          if (!verified) {
            // Only kick if captcha_kick is enabled in config
            const latestConfig = await getGroupConfig(sessionId, chatId.toString());
            if ((latestConfig as Record<string, unknown>).captcha_kick !== false) {
              await bot.api.banChatMember(chatId, memberId);
              await bot.api.unbanChatMember(chatId, memberId);
            }
            await bot.api.deleteMessage(chatId, msgId).catch(() => {});
          }
        } catch (err) {
          console.error(`[TG-CAPTCHA] Auto-kick failed for ${memberId}:`, err);
        }
      }, 60_000);
    }
  });

  // /captcha - Enable/disable CAPTCHA
  bot.command('captcha', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { captcha_enabled: true });
      await ctx.reply('✅ CAPTCHA enabled. New users must verify they are human.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { captcha_enabled: false });
      await ctx.reply('✅ CAPTCHA disabled.');
    } else {
      const config = await getGroupConfig(sessionId, ctx.chat!.id.toString());
      await ctx.reply(
        `🔐 <b>CAPTCHA Settings</b>\n\n` +
        `Status: ${config.captcha_enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `Mode: ${(config as Record<string, unknown>).captcha_mode || 'button'}\n\n` +
        `Usage: /captcha <yes/no/on/off>`,
        { parse_mode: 'HTML' },
      );
    }
  });

  // /captchamode - Choose CAPTCHA type
  bot.command('captchamode', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    const modes = ['button', 'math', 'text', 'text2'];
    if (!arg || !modes.includes(arg)) {
      await ctx.reply(`Usage: /captchamode <${modes.join('/')}>`); return;
    }
    await updateTelegramConfig(sessionId, { captcha_mode: arg } as Record<string, unknown>);
    await ctx.reply(`✅ CAPTCHA mode set to: ${arg}`);
  });

  // /captcharules - Require accepting rules before speaking
  bot.command('captcharules', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { captcha_rules: true } as Record<string, unknown>);
      await ctx.reply('✅ CAPTCHA rules enabled. New users must accept rules.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { captcha_rules: false } as Record<string, unknown>);
      await ctx.reply('✅ CAPTCHA rules disabled.');
    } else {
      await ctx.reply('Usage: /captcharules <yes/no/on/off>');
    }
  });

  // /captchamutetime - Set auto-unmute time for CAPTCHA
  bot.command('captchamutetime', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['off', 'no'].includes(arg)) {
      await updateTelegramConfig(sessionId, { captcha_mute_time: null } as Record<string, unknown>);
      await ctx.reply('✅ CAPTCHA mute time disabled. Users stay muted until they solve it.');
    } else if (arg) {
      await updateTelegramConfig(sessionId, { captcha_mute_time: arg } as Record<string, unknown>);
      await ctx.reply(`✅ CAPTCHA mute time set to: ${arg}`);
    } else {
      await ctx.reply('Usage: /captchamutetime <time/off>\nExamples: 5m, 1h, 1d');
    }
  });

  // /captchakick - Kick users who haven't solved CAPTCHA
  bot.command('captchakick', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim().toLowerCase();
    if (['yes', 'on'].includes(arg)) {
      await updateTelegramConfig(sessionId, { captcha_kick: true } as Record<string, unknown>);
      await ctx.reply('✅ Users who don\'t solve CAPTCHA will be kicked.');
    } else if (['no', 'off'].includes(arg)) {
      await updateTelegramConfig(sessionId, { captcha_kick: false } as Record<string, unknown>);
      await ctx.reply('✅ CAPTCHA kick disabled.');
    } else {
      await ctx.reply('Usage: /captchakick <yes/no/on/off>');
    }
  });

  // /captchakicktime - Set time after which to kick CAPTCHA'd users
  bot.command('captchakicktime', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const arg = (ctx.match?.toString() || '').trim();
    if (!arg) { await ctx.reply('Usage: /captchakicktime <time>\nExample: /captchakicktime 5m'); return; }
    await updateTelegramConfig(sessionId, { captcha_kick_time: arg } as Record<string, unknown>);
    await ctx.reply(`✅ CAPTCHA kick time set to: ${arg}`);
  });

  // /setcaptchatext - Customise the CAPTCHA button text
  bot.command('setcaptchatext', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    const text = (ctx.match?.toString() || '').trim();
    if (!text) { await ctx.reply('Usage: /setcaptchatext <text>'); return; }
    await updateTelegramConfig(sessionId, { captcha_button_text: text } as Record<string, unknown>);
    await ctx.reply(`✅ CAPTCHA button text set to: ${text}`);
  });

  // /resetcaptchatext - Reset CAPTCHA button to default
  bot.command('resetcaptchatext', async (ctx) => {
    if (!(await requireAdmin(ctx, sessionId))) return;
    await updateTelegramConfig(sessionId, { captcha_button_text: null } as Record<string, unknown>);
    await ctx.reply('✅ CAPTCHA button text reset to default.');
  });

  // Math/text CAPTCHA answer handler
  bot.on('message:text', async (ctx, next) => {
    if (!ctx.from || !ctx.chat || ctx.chat.type === 'private') { await next(); return; }
    const chatKey = `${ctx.chat.id}:${ctx.from.id}`;

    // Check math challenge
    const mathChallenge = mathChallenges.get(chatKey);
    if (mathChallenge && mathChallenge.expires > Date.now()) {
      const answer = parseInt(ctx.message.text.trim());
      if (!isNaN(answer) && answer === mathChallenge.answer) {
        mathChallenges.delete(chatKey);
        try {
          await ctx.api.restrictChatMember(ctx.chat.id, ctx.from.id, {
            can_send_messages: true,
            can_send_audios: true,
            can_send_documents: true,
            can_send_photos: true,
            can_send_videos: true,
            can_send_video_notes: true,
            can_send_voice_notes: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
          });
        } catch { /* ignore */ }
        await markCaptchaVerified(sessionId, ctx.chat.id.toString(), ctx.from.id.toString());
        await ctx.reply(`✅ Correct! Welcome, ${ctx.from.first_name}!`);
        return;
      }
    }

    // Check text challenge
    const textChallenge = textChallenges.get(chatKey);
    if (textChallenge && textChallenge.expires > Date.now()) {
      if (ctx.message.text.trim().toUpperCase() === textChallenge.code) {
        textChallenges.delete(chatKey);
        try {
          await ctx.api.restrictChatMember(ctx.chat.id, ctx.from.id, {
            can_send_messages: true,
            can_send_audios: true,
            can_send_documents: true,
            can_send_photos: true,
            can_send_videos: true,
            can_send_video_notes: true,
            can_send_voice_notes: true,
            can_send_polls: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
          });
        } catch { /* ignore */ }
        await markCaptchaVerified(sessionId, ctx.chat.id.toString(), ctx.from.id.toString());
        await ctx.reply(`✅ Correct! Welcome, ${ctx.from.first_name}!`);
        return;
      }
    }

    await next();
  });

  bot.callbackQuery(/^captcha:(\d+):(-?\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match![1], 10);
    const chatId = parseInt(ctx.match![2], 10);

    if (ctx.from.id !== userId) {
      await ctx.answerCallbackQuery({ text: 'This is not for you.', show_alert: true });
      return;
    }

    try {
      await ctx.api.restrictChatMember(chatId, userId, {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
      });
    } catch (err) {
      console.error(`[TG-CAPTCHA] Failed to unrestrict ${userId}:`, err);
    }

    await markCaptchaVerified(sessionId, chatId.toString(), userId.toString());
    await ctx.answerCallbackQuery({ text: '✅ Verified! Welcome.' });
    await ctx.deleteMessage().catch(() => {});
  });
}
