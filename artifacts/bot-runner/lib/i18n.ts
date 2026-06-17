/**
 * Internationalization (i18n) module for BotWave bot.
 * Provides multi-language support for bot responses.
 * Supported locales stored in-memory for zero-DB lookups.
 */

export type SupportedLocale = 'en' | 'ar' | 'fr' | 'es' | 'pt' | 'de' | 'hi' | 'zh' | 'ja' | 'ko' | 'ru' | 'tr' | 'am';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'ar', 'fr', 'es', 'pt', 'de', 'hi', 'zh', 'ja', 'ko', 'ru', 'tr', 'am'];

const groupLangs = new Map<string, SupportedLocale>();
const userLangs = new Map<string, SupportedLocale>();
let botDefaultLang: SupportedLocale = 'en';

export function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

export function setGroupLang(chatId: string, locale: SupportedLocale): void {
  groupLangs.set(chatId, locale);
}

export function getGroupLang(chatId: string): SupportedLocale | null {
  return groupLangs.get(chatId) ?? null;
}

export function setUserLang(userId: string, locale: SupportedLocale): void {
  userLangs.set(userId, locale);
}

export function getUserLang(userId: string): SupportedLocale | null {
  return userLangs.get(userId) ?? null;
}

export function setBotDefaultLang(locale: SupportedLocale): void {
  botDefaultLang = locale;
}

export function getBotDefaultLang(): SupportedLocale {
  return botDefaultLang;
}

export function resolveLocale(chatId?: string, userId?: string): SupportedLocale {
  if (chatId) {
    const groupLang = groupLangs.get(chatId);
    if (groupLang) return groupLang;
  }
  if (userId) {
    const userLang = userLangs.get(userId);
    if (userLang) return userLang;
  }
  return botDefaultLang;
}

const translations: Record<SupportedLocale, Record<string, string>> = {
  en: {
    welcome: 'Welcome!',
    goodbye: 'Goodbye!',
    banned: 'You have been banned.',
    muted: 'You have been muted.',
    unmuted: 'You have been unmuted.',
    warn_issued: 'Warning issued.',
    no_permission: 'You do not have permission to use this command.',
  },
  ar: { welcome: 'أهلاً!', goodbye: 'وداعاً!', banned: 'تم حظرك.', muted: 'تم كتمك.', unmuted: 'تم رفع الكتم.', warn_issued: 'تم إصدار تحذير.', no_permission: 'ليس لديك إذن.' },
  fr: { welcome: 'Bienvenue!', goodbye: 'Au revoir!', banned: 'Vous avez été banni.', muted: 'Vous avez été mis en sourdine.', unmuted: 'La mise en sourdine a été levée.', warn_issued: 'Avertissement émis.', no_permission: "Vous n'avez pas la permission." },
  es: { welcome: '¡Bienvenido!', goodbye: '¡Adiós!', banned: 'Has sido expulsado.', muted: 'Has sido silenciado.', unmuted: 'Se ha levantado el silencio.', warn_issued: 'Advertencia emitida.', no_permission: 'No tienes permiso.' },
  pt: { welcome: 'Bem-vindo!', goodbye: 'Tchau!', banned: 'Você foi banido.', muted: 'Você foi silenciado.', unmuted: 'O silêncio foi removido.', warn_issued: 'Aviso emitido.', no_permission: 'Você não tem permissão.' },
  de: { welcome: 'Willkommen!', goodbye: 'Auf Wiedersehen!', banned: 'Du wurdest gebannt.', muted: 'Du wurdest stummgeschaltet.', unmuted: 'Die Stummschaltung wurde aufgehoben.', warn_issued: 'Warnung ausgesprochen.', no_permission: 'Du hast keine Berechtigung.' },
  hi: { welcome: 'स्वागत है!', goodbye: 'अलविदा!', banned: 'आप प्रतिबंधित हैं।', muted: 'आपको म्यूट किया गया।', unmuted: 'म्यूट हटाया गया।', warn_issued: 'चेतावनी जारी।', no_permission: 'आपके पास अनुमति नहीं है।' },
  zh: { welcome: '欢迎！', goodbye: '再见！', banned: '您已被封禁。', muted: '您已被静音。', unmuted: '已解除静音。', warn_issued: '已发出警告。', no_permission: '您没有权限。' },
  ja: { welcome: 'ようこそ！', goodbye: 'さようなら！', banned: 'あなたはBANされました。', muted: 'ミュートされました。', unmuted: 'ミュートが解除されました。', warn_issued: '警告が発行されました。', no_permission: '権限がありません。' },
  ko: { welcome: '환영합니다!', goodbye: '안녕히 가세요!', banned: '차단되었습니다.', muted: '음소거되었습니다.', unmuted: '음소거가 해제되었습니다.', warn_issued: '경고가 발급되었습니다.', no_permission: '권한이 없습니다.' },
  ru: { welcome: 'Добро пожаловать!', goodbye: 'До свидания!', banned: 'Вы заблокированы.', muted: 'Вы отключены.', unmuted: 'Звук включён.', warn_issued: 'Предупреждение выдано.', no_permission: 'У вас нет разрешения.' },
  tr: { welcome: 'Hoş geldiniz!', goodbye: 'Hoşça kalın!', banned: 'Yasaklandınız.', muted: 'Sessize alındınız.', unmuted: 'Ses açıldı.', warn_issued: 'Uyarı verildi.', no_permission: 'İzniniz yok.' },
  am: { welcome: 'እንኳን ደህና መጡ!', goodbye: 'ቻው!', banned: 'ታግደዋል።', muted: 'ድምፅ ጠፍቷል።', unmuted: 'ድምፅ ተከፍቷል።', warn_issued: 'ማስጠንቀቂያ ተሰጥቷል።', no_permission: 'ፈቃድ የለዎትም።' },
};

export function t(key: string, locale: SupportedLocale = 'en', params?: Record<string, string>): string {
  let result = translations[locale]?.[key] ?? translations.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  return result;
}
