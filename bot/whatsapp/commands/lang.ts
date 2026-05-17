import { registerCommand, type MessageContext, type TemplateVars } from './registry';
import { sendReply, setUserLangFallback, getUserLangFallback } from './helpers';
import { getUserSettings, upsertUserSettings } from '../../database';
import { SUPPORTED_LANGUAGES, isValidLanguage, getLanguageName, translateText } from '../utils/translate';

// ─── Language Preference Command ─────────────────────────────────────────────

async function handleLang(
  context: MessageContext,
  args: string[],
  sock: any,
  _vars: TemplateVars,
): Promise<void> {
  const sub = args[0]?.toLowerCase();

  // Show current language + usage
  if (!sub || sub === 'help') {
    let currentLang = 'en';
    if (context.userId) {
      const settings = await getUserSettings(context.userId);
      currentLang = (settings as any)?.language_preference || getUserLangFallback(context.userId) || 'en';
    }

    const langName = getLanguageName(currentLang);
    await sendReply(
      context.chatJid,
      `*🌍 LANGUAGE SETTINGS*\n\n` +
      `*Current:* ${langName} (${currentLang})\n\n` +
      `*Commands:*\n` +
      `• \`!lang list\` — Show all supported languages\n` +
      `• \`!lang set [code]\` — Set your language\n` +
      `• \`!lang reset\` — Reset to English\n\n` +
      `_Example: !lang set fr (for French)_`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // List supported languages
  if (sub === 'list' || sub === 'languages' || sub === 'ls') {
    const langList = Object.entries(SUPPORTED_LANGUAGES)
      .map(([code, name]) => `• \`${code}\` — ${name}`)
      .join('\n');

    await sendReply(
      context.chatJid,
      `*🌍 SUPPORTED LANGUAGES*\n\n${langList}\n\n_Use \`!lang set [code]\` to change your language._`,
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // Set language
  if (sub === 'set') {
    const langCode = args[1]?.toLowerCase();
    if (!langCode) {
      await sendReply(
        context.chatJid,
        'Please specify a language code.\n\nUsage: `!lang set fr`\n\nUse `!lang list` to see available codes.',
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    if (!isValidLanguage(langCode)) {
      await sendReply(
        context.chatJid,
        `"${langCode}" is not a supported language code.\n\nUse \`!lang list\` to see available languages.`,
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    if (!context.userId) {
      await sendReply(
        context.chatJid,
        'Could not determine your account. Language preference not saved.',
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    // Save to DB and in-memory fallback
    setUserLangFallback(context.userId, langCode);
    const result = await upsertUserSettings(context.userId, { language_preference: langCode });
    if (!result) {
      console.error(`[LANG] DB save failed for language_preference=${langCode} userId=${context.userId} — using in-memory fallback`);
    } else {
      console.log(`[LANG] Saved language_preference=${langCode} for userId=${context.userId}`);
    }

    const langName = getLanguageName(langCode);
    let confirmMsg = `Language set to *${langName}* (${langCode})`;

    // If not English, translate the confirmation as a demo
    if (langCode !== 'en') {
      const translated = await translateText('Your language has been updated. Bot responses will now be translated to your preferred language.', langCode);
      if (translated) {
        confirmMsg += `\n\n${translated}`;
      }
    }

    await sendReply(context.chatJid, confirmMsg, sock, context.rawMessage.key, context.queue);
    return;
  }

  // Reset to English
  if (sub === 'reset' || sub === 'off') {
    if (!context.userId) {
      await sendReply(
        context.chatJid,
        'Could not determine your account.',
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    setUserLangFallback(context.userId, 'en');
    await upsertUserSettings(context.userId, { language_preference: 'en' });
    await sendReply(
      context.chatJid,
      'Language reset to *English*.',
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  // Direct language code shortcut: !lang fr, !lang yo, etc.
  if (isValidLanguage(sub)) {
    if (!context.userId) {
      await sendReply(
        context.chatJid,
        'Could not determine your account. Language preference not saved.',
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    // Save to DB and in-memory fallback
    setUserLangFallback(context.userId, sub);
    const result = await upsertUserSettings(context.userId, { language_preference: sub });
    if (!result) {
      console.error(`[LANG] DB save failed for language_preference=${sub} userId=${context.userId} — using in-memory fallback`);
    } else {
      console.log(`[LANG] Saved language_preference=${sub} for userId=${context.userId}`);
    }

    const langName = getLanguageName(sub);
    let confirmMsg = `Language set to *${langName}* (${sub})`;

    if (sub !== 'en') {
      const translated = await translateText('Your language has been updated. Bot responses will now be translated to your preferred language.', sub);
      if (translated) {
        confirmMsg += `\n\n${translated}`;
      }
    }

    await sendReply(context.chatJid, confirmMsg, sock, context.rawMessage.key, context.queue);
    return;
  }

  await sendReply(
    context.chatJid,
    `Unknown option "${sub}".\n\nUse \`!lang help\` to see available commands.`,
    sock, context.rawMessage.key, context.queue,
  );
}

// ─── Register ────────────────────────────────────────────────────────────────

registerCommand({
  name: 'lang',
  aliases: ['lang', 'language', 'setlang'],
  category: 'general',
  description: 'Set your preferred language for bot responses',
  execute: (ctx, args, sock, vars) => handleLang(ctx, args, sock, vars),
});
