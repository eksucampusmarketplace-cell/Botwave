/**
 * In-memory translation strings for BotWave.
 *
 * All strings are loaded at import time — zero runtime cost per lookup.
 * Add new keys to the `en` map first, then translate to other locales.
 */

export type TranslationKey =
  // ── General ──
  | 'welcome.greeting'
  | 'welcome.rules_notice'
  | 'goodbye.message'
  | 'error.generic'
  | 'error.admin_only'
  | 'error.bot_not_admin'
  | 'error.not_found'
  | 'success.saved'
  | 'success.enabled'
  | 'success.disabled'
  | 'success.deleted'
  | 'success.reset'
  // ── Admin ──
  | 'admin.promoted'
  | 'admin.demoted'
  | 'admin.cache_updated'
  | 'admin.anon_enabled'
  | 'admin.anon_disabled'
  | 'admin.error_msgs_on'
  | 'admin.error_msgs_off'
  // ── Moderation ──
  | 'mod.banned'
  | 'mod.unbanned'
  | 'mod.muted'
  | 'mod.unmuted'
  | 'mod.kicked'
  | 'mod.warned'
  | 'mod.warn_count'
  | 'mod.warns_reset'
  | 'mod.warn_limit_reached'
  // ── Antiflood ──
  | 'flood.settings'
  | 'flood.set'
  | 'flood.disabled'
  | 'flood.mode_set'
  | 'flood.clear_on'
  | 'flood.clear_off'
  | 'flood.triggered'
  // ── AntiRaid ──
  | 'raid.enabled'
  | 'raid.disabled'
  | 'raid.time_set'
  | 'raid.action_time_set'
  | 'raid.auto_set'
  | 'raid.auto_disabled'
  // ── Captcha ──
  | 'captcha.enabled'
  | 'captcha.disabled'
  | 'captcha.verify_prompt'
  | 'captcha.verified'
  | 'captcha.failed'
  // ── Language ──
  | 'lang.current'
  | 'lang.set'
  | 'lang.detected'
  | 'lang.suggest'
  | 'lang.available'
  | 'lang.user_set'
  // ── Feature Toggles ──
  | 'feature.enabled'
  | 'feature.disabled'
  | 'feature.not_available'
  | 'feature.owner_disabled'
  // ── Notes ──
  | 'notes.saved'
  | 'notes.deleted'
  | 'notes.not_found'
  | 'notes.list_empty'
  | 'notes.list_title'
  // ── Rules ──
  | 'rules.not_set'
  | 'rules.reset'
  | 'rules.button_set'
  | 'rules.button_reset'
  | 'rules.private_on'
  | 'rules.private_off'
  // ── Locks ──
  | 'lock.locked'
  | 'lock.unlocked'
  | 'lock.warns_on'
  | 'lock.warns_off'
  | 'lock.allowlist_added'
  | 'lock.allowlist_removed'
  | 'lock.allowlist_cleared'
  // ── Pins ──
  | 'pin.pinned'
  | 'pin.unpinned_all'
  | 'pin.no_pinned'
  | 'pin.antichannel_on'
  | 'pin.antichannel_off'
  | 'pin.cleanlinked_on'
  | 'pin.cleanlinked_off'
  // ── Purge ──
  | 'purge.done'
  | 'purge.from_set'
  | 'purge.need_from'
  // ── Blocklist ──
  | 'blocklist.added'
  | 'blocklist.removed'
  | 'blocklist.cleared'
  // ── Connections ──
  | 'connect.connected'
  | 'connect.disconnected'
  | 'connect.reconnected'
  // ── Federation ──
  | 'fed.renamed'
  | 'fed.deleted'
  | 'fed.transferred'
  // ── Dashboard ──
  | 'dash.general'
  | 'dash.protection'
  | 'dash.prohibitions'
  | 'dash.limits'
  | 'dash.silence'
  | 'dash.memberships'
  | 'dash.custom_texts'
  | 'dash.notes'
  | 'dash.filters'
  | 'dash.modlog'
  | 'dash.xp'
  | 'dash.scheduled'
  | 'dash.stats'
  | 'dash.features'
  | 'dash.save'
  | 'dash.saving'
  | 'dash.saved'
  | 'dash.language'
  | 'dash.timezone'
  | 'dash.light_mode'
  | 'dash.dark_mode'
  // ── Joyride / Onboarding ──
  | 'onboard.welcome_title'
  | 'onboard.welcome_msg'
  | 'onboard.select_language'
  | 'onboard.next'
  | 'onboard.skip'
  | 'onboard.done';

type TranslationMap = Record<TranslationKey, string>;

const en: TranslationMap = {
  // General
  'welcome.greeting': 'Welcome to {group}, {user}!',
  'welcome.rules_notice': 'Please read the group rules.',
  'goodbye.message': '{user} has left the group. Goodbye!',
  'error.generic': 'An error occurred. Please try again.',
  'error.admin_only': 'This command is for admins only.',
  'error.bot_not_admin': 'I need admin permissions to do that.',
  'error.not_found': 'Not found.',
  'success.saved': 'Settings saved!',
  'success.enabled': 'Enabled successfully.',
  'success.disabled': 'Disabled successfully.',
  'success.deleted': 'Deleted successfully.',
  'success.reset': 'Reset to default.',
  // Admin
  'admin.promoted': '{user} has been promoted!',
  'admin.demoted': '{user} has been demoted.',
  'admin.cache_updated': 'Admin cache updated.',
  'admin.anon_enabled': 'Anonymous admin mode enabled.',
  'admin.anon_disabled': 'Anonymous admin mode disabled.',
  'admin.error_msgs_on': 'Admin error messages enabled.',
  'admin.error_msgs_off': 'Admin error messages disabled.',
  // Moderation
  'mod.banned': '{user} has been banned.',
  'mod.unbanned': '{user} has been unbanned.',
  'mod.muted': '{user} has been muted.',
  'mod.unmuted': '{user} has been unmuted.',
  'mod.kicked': '{user} has been kicked.',
  'mod.warned': '{user} has been warned. ({count}/{max})',
  'mod.warn_count': '{user} has {count} warning(s).',
  'mod.warns_reset': 'Warnings reset for {user}.',
  'mod.warn_limit_reached': '{user} reached the warn limit and has been {action}.',
  // Antiflood
  'flood.settings': 'Antiflood: {count} messages, action: {action}',
  'flood.set': 'Antiflood set to {count} messages.',
  'flood.disabled': 'Antiflood disabled.',
  'flood.mode_set': 'Flood action set to {action}.',
  'flood.clear_on': 'Flood messages will be deleted.',
  'flood.clear_off': 'Flood messages will not be deleted.',
  'flood.triggered': '{user} triggered antiflood! Action: {action}',
  // AntiRaid
  'raid.enabled': 'Anti-raid enabled for {time}. New joins will be temporarily banned.',
  'raid.disabled': 'Anti-raid disabled.',
  'raid.time_set': 'Raid duration set to {time}.',
  'raid.action_time_set': 'Raid tempban time set to {time}.',
  'raid.auto_set': 'Auto anti-raid: triggers at {count} joins/min.',
  'raid.auto_disabled': 'Auto anti-raid disabled.',
  // Captcha
  'captcha.enabled': 'CAPTCHA verification enabled.',
  'captcha.disabled': 'CAPTCHA verification disabled.',
  'captcha.verify_prompt': 'Welcome {user}! Please verify you are human by tapping the button below.',
  'captcha.verified': '{user} verified successfully!',
  'captcha.failed': '{user} failed CAPTCHA verification.',
  // Language
  'lang.current': 'Current language: {lang}',
  'lang.set': 'Language set to {lang}.',
  'lang.detected': 'Detected language: {lang}',
  'lang.suggest': 'This group seems to use {lang}. Set it with /setlang {code}',
  'lang.available': 'Available languages:',
  'lang.user_set': 'Your personal language set to {lang}.',
  // Feature Toggles
  'feature.enabled': 'Feature "{feature}" enabled for this group.',
  'feature.disabled': 'Feature "{feature}" disabled for this group.',
  'feature.not_available': 'Feature "{feature}" is not available. The bot owner has disabled it.',
  'feature.owner_disabled': 'This feature has been disabled by the bot owner.',
  // Notes
  'notes.saved': 'Note "{name}" saved.',
  'notes.deleted': 'Note "{name}" deleted.',
  'notes.not_found': 'No note named "{name}".',
  'notes.list_empty': 'No saved notes.',
  'notes.list_title': 'Saved Notes',
  // Rules
  'rules.not_set': 'No rules set for this group.',
  'rules.reset': 'Rules have been reset.',
  'rules.button_set': 'Rules button text set to: {text}',
  'rules.button_reset': 'Rules button text reset to default.',
  'rules.private_on': 'Rules will be sent via PM.',
  'rules.private_off': 'Rules will be sent in the group.',
  // Locks
  'lock.locked': '{type} locked.',
  'lock.unlocked': '{type} unlocked.',
  'lock.warns_on': 'Users will be warned for locked content.',
  'lock.warns_off': 'Lock warnings disabled.',
  'lock.allowlist_added': 'Added to allowlist.',
  'lock.allowlist_removed': 'Removed from allowlist.',
  'lock.allowlist_cleared': 'Allowlist cleared.',
  // Pins
  'pin.pinned': 'Message pinned.',
  'pin.unpinned_all': 'All messages unpinned.',
  'pin.no_pinned': 'No message is currently pinned.',
  'pin.antichannel_on': 'Anti-channel pin enabled.',
  'pin.antichannel_off': 'Anti-channel pin disabled.',
  'pin.cleanlinked_on': 'Linked channel messages will be auto-deleted.',
  'pin.cleanlinked_off': 'Linked channel cleanup disabled.',
  // Purge
  'purge.done': 'Purged {count} messages.',
  'purge.from_set': 'Purge start marked. Reply to end message with /purgeto.',
  'purge.need_from': 'Use /purgefrom first.',
  // Blocklist
  'blocklist.added': 'Added to blocklist.',
  'blocklist.removed': 'Removed from blocklist.',
  'blocklist.cleared': 'Blocklist cleared.',
  // Connections
  'connect.connected': 'Connected to {chat}.',
  'connect.disconnected': 'Disconnected.',
  'connect.reconnected': 'Reconnected to {chat}.',
  // Federation
  'fed.renamed': 'Federation renamed to {name}.',
  'fed.deleted': 'Federation deleted.',
  'fed.transferred': 'Federation transferred to {user}.',
  // Dashboard
  'dash.general': 'General',
  'dash.protection': 'Antiflood & AntiRaid',
  'dash.prohibitions': 'Prohibitions',
  'dash.limits': 'Limits',
  'dash.silence': 'Silent Times',
  'dash.memberships': 'Memberships',
  'dash.custom_texts': 'Custom Texts',
  'dash.notes': 'Notes',
  'dash.filters': 'Filters',
  'dash.modlog': 'Mod Log',
  'dash.xp': 'XP',
  'dash.scheduled': 'Scheduled',
  'dash.stats': 'Statistics',
  'dash.features': 'Features',
  'dash.save': 'Save Settings',
  'dash.saving': 'Saving...',
  'dash.saved': 'Settings saved!',
  'dash.language': 'Language',
  'dash.timezone': 'Timezone',
  'dash.light_mode': 'Light Mode',
  'dash.dark_mode': 'Dark Mode',
  // Onboarding
  'onboard.welcome_title': 'Welcome to BotWave!',
  'onboard.welcome_msg': 'Let\'s get you started. First, choose your preferred language.',
  'onboard.select_language': 'Select Language',
  'onboard.next': 'Next',
  'onboard.skip': 'Skip',
  'onboard.done': 'Done',
};

const es: TranslationMap = {
  ...en,
  'welcome.greeting': 'Bienvenido a {group}, {user}!',
  'welcome.rules_notice': 'Por favor lee las reglas del grupo.',
  'goodbye.message': '{user} ha dejado el grupo. Adios!',
  'error.generic': 'Ocurrio un error. Intenta de nuevo.',
  'error.admin_only': 'Este comando es solo para administradores.',
  'error.bot_not_admin': 'Necesito permisos de administrador.',
  'error.not_found': 'No encontrado.',
  'success.saved': 'Configuracion guardada!',
  'success.enabled': 'Habilitado exitosamente.',
  'success.disabled': 'Deshabilitado exitosamente.',
  'success.deleted': 'Eliminado exitosamente.',
  'success.reset': 'Restablecido a valores predeterminados.',
  'admin.promoted': '{user} ha sido promovido!',
  'admin.demoted': '{user} ha sido degradado.',
  'admin.cache_updated': 'Cache de administradores actualizado.',
  'mod.banned': '{user} ha sido baneado.',
  'mod.unbanned': '{user} ha sido desbaneado.',
  'mod.muted': '{user} ha sido silenciado.',
  'mod.unmuted': '{user} ha sido dessilenciado.',
  'mod.kicked': '{user} ha sido expulsado.',
  'mod.warned': '{user} ha sido advertido. ({count}/{max})',
  'flood.settings': 'Antiflood: {count} mensajes, accion: {action}',
  'flood.set': 'Antiflood configurado a {count} mensajes.',
  'flood.disabled': 'Antiflood deshabilitado.',
  'raid.enabled': 'Anti-raid habilitado por {time}.',
  'raid.disabled': 'Anti-raid deshabilitado.',
  'captcha.verify_prompt': 'Bienvenido {user}! Verifica que eres humano tocando el boton.',
  'lang.current': 'Idioma actual: {lang}',
  'lang.set': 'Idioma configurado a {lang}.',
  'lang.detected': 'Idioma detectado: {lang}',
  'lang.user_set': 'Tu idioma personal configurado a {lang}.',
  'feature.not_available': 'La funcion "{feature}" no esta disponible.',
  'feature.owner_disabled': 'Esta funcion ha sido deshabilitada por el propietario del bot.',
  'notes.saved': 'Nota "{name}" guardada.',
  'notes.deleted': 'Nota "{name}" eliminada.',
  'notes.list_empty': 'No hay notas guardadas.',
  'dash.general': 'General',
  'dash.protection': 'Antiflood y AntiRaid',
  'dash.prohibitions': 'Prohibiciones',
  'dash.limits': 'Limites',
  'dash.silence': 'Tiempos Silenciosos',
  'dash.memberships': 'Membresias',
  'dash.custom_texts': 'Textos Personalizados',
  'dash.save': 'Guardar Configuracion',
  'dash.saving': 'Guardando...',
  'dash.saved': 'Configuracion guardada!',
  'dash.language': 'Idioma',
  'onboard.welcome_title': 'Bienvenido a BotWave!',
  'onboard.welcome_msg': 'Comencemos. Primero, elige tu idioma preferido.',
  'onboard.select_language': 'Seleccionar Idioma',
  'onboard.next': 'Siguiente',
  'onboard.skip': 'Omitir',
  'onboard.done': 'Listo',
};

const fr: TranslationMap = {
  ...en,
  'welcome.greeting': 'Bienvenue dans {group}, {user}!',
  'welcome.rules_notice': 'Veuillez lire les regles du groupe.',
  'goodbye.message': '{user} a quitte le groupe. Au revoir!',
  'error.generic': 'Une erreur est survenue. Reessayez.',
  'error.admin_only': 'Cette commande est reservee aux administrateurs.',
  'error.bot_not_admin': 'J\'ai besoin des droits d\'administrateur.',
  'success.saved': 'Parametres enregistres!',
  'success.enabled': 'Active avec succes.',
  'success.disabled': 'Desactive avec succes.',
  'admin.promoted': '{user} a ete promu!',
  'admin.demoted': '{user} a ete retrograde.',
  'mod.banned': '{user} a ete banni.',
  'mod.unbanned': '{user} a ete debanni.',
  'mod.muted': '{user} a ete mis en sourdine.',
  'mod.kicked': '{user} a ete expulse.',
  'mod.warned': '{user} a ete averti. ({count}/{max})',
  'flood.set': 'Antiflood regle a {count} messages.',
  'flood.disabled': 'Antiflood desactive.',
  'raid.enabled': 'Anti-raid active pour {time}.',
  'raid.disabled': 'Anti-raid desactive.',
  'lang.current': 'Langue actuelle: {lang}',
  'lang.set': 'Langue definie sur {lang}.',
  'lang.user_set': 'Votre langue personnelle definie sur {lang}.',
  'dash.general': 'General',
  'dash.protection': 'Antiflood et AntiRaid',
  'dash.prohibitions': 'Interdictions',
  'dash.limits': 'Limites',
  'dash.save': 'Enregistrer',
  'dash.saving': 'Enregistrement...',
  'dash.saved': 'Parametres enregistres!',
  'dash.language': 'Langue',
  'onboard.welcome_title': 'Bienvenue sur BotWave!',
  'onboard.welcome_msg': 'Commenceons. Choisissez votre langue preferee.',
  'onboard.select_language': 'Choisir la Langue',
  'onboard.next': 'Suivant',
  'onboard.skip': 'Passer',
  'onboard.done': 'Termine',
};

const ar: TranslationMap = {
  ...en,
  'welcome.greeting': '!{user} ,{group} \u0645\u0631\u062d\u0628\u0627 \u0628\u0643 \u0641\u064a',
  'error.generic': '.\u062d\u062f\u062b \u062e\u0637\u0623. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649',
  'error.admin_only': '.\u0647\u0630\u0627 \u0627\u0644\u0623\u0645\u0631 \u0644\u0644\u0645\u0634\u0631\u0641\u064a\u0646 \u0641\u0642\u0637',
  'success.saved': '!\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a',
  'mod.banned': '.{user} \u062a\u0645 \u062d\u0638\u0631',
  'mod.muted': '.{user} \u062a\u0645 \u0643\u062a\u0645',
  'mod.kicked': '.{user} \u062a\u0645 \u0637\u0631\u062f',
  'mod.warned': '({count}/{max}) .{user} \u062a\u0645 \u062a\u062d\u0630\u064a\u0631',
  'lang.current': '{lang} :\u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629',
  'lang.set': '.{lang} \u062a\u0645 \u062a\u0639\u064a\u064a\u0646 \u0627\u0644\u0644\u063a\u0629 \u0625\u0644\u0649',
  'dash.general': '\u0639\u0627\u0645',
  'dash.protection': '\u0645\u0636\u0627\u062f \u0627\u0644\u0641\u064a\u0636\u0627\u0646\u0627\u062a',
  'dash.prohibitions': '\u0627\u0644\u0645\u062d\u0638\u0648\u0631\u0627\u062a',
  'dash.save': '\u062d\u0641\u0638',
  'dash.saving': '...\u062c\u0627\u0631\u064a \u0627\u0644\u062d\u0641\u0638',
  'dash.saved': '!\u062a\u0645 \u0627\u0644\u062d\u0641\u0638',
  'dash.language': '\u0627\u0644\u0644\u063a\u0629',
  'onboard.welcome_title': '!BotWave \u0645\u0631\u062d\u0628\u0627 \u0628\u0643 \u0641\u064a',
  'onboard.select_language': '\u0627\u062e\u062a\u0631 \u0627\u0644\u0644\u063a\u0629',
  'onboard.next': '\u0627\u0644\u062a\u0627\u0644\u064a',
  'onboard.skip': '\u062a\u062e\u0637\u064a',
  'onboard.done': '\u062a\u0645',
};

const pt: TranslationMap = {
  ...en,
  'welcome.greeting': 'Bem-vindo ao {group}, {user}!',
  'error.generic': 'Ocorreu um erro. Tente novamente.',
  'error.admin_only': 'Este comando e apenas para administradores.',
  'success.saved': 'Configuracoes salvas!',
  'mod.banned': '{user} foi banido.',
  'mod.muted': '{user} foi silenciado.',
  'mod.kicked': '{user} foi expulso.',
  'lang.current': 'Idioma atual: {lang}',
  'lang.set': 'Idioma definido para {lang}.',
  'dash.save': 'Salvar',
  'dash.saving': 'Salvando...',
  'dash.saved': 'Configuracoes salvas!',
  'dash.language': 'Idioma',
  'onboard.welcome_title': 'Bem-vindo ao BotWave!',
  'onboard.select_language': 'Selecionar Idioma',
};

const de: TranslationMap = {
  ...en,
  'welcome.greeting': 'Willkommen in {group}, {user}!',
  'error.generic': 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
  'error.admin_only': 'Dieser Befehl ist nur fuer Admins.',
  'success.saved': 'Einstellungen gespeichert!',
  'mod.banned': '{user} wurde gesperrt.',
  'mod.muted': '{user} wurde stummgeschaltet.',
  'mod.kicked': '{user} wurde gekickt.',
  'lang.current': 'Aktuelle Sprache: {lang}',
  'lang.set': 'Sprache auf {lang} gesetzt.',
  'dash.save': 'Speichern',
  'dash.saving': 'Speichern...',
  'dash.saved': 'Einstellungen gespeichert!',
  'dash.language': 'Sprache',
  'onboard.welcome_title': 'Willkommen bei BotWave!',
  'onboard.select_language': 'Sprache waehlen',
};

const hi: TranslationMap = {
  ...en,
  'welcome.greeting': '{group} \u092e\u0947\u0902 \u0906\u092a\u0915\u093e \u0938\u094d\u0935\u093e\u0917\u0924 \u0939\u0948, {user}!',
  'error.admin_only': '\u092f\u0939 \u0915\u092e\u093e\u0902\u0921 \u0915\u0947\u0935\u0932 \u090f\u0921\u092e\u093f\u0928 \u0915\u0947 \u0932\u093f\u090f \u0939\u0948\u0964',
  'success.saved': '\u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938 \u0938\u0947\u0935 \u0939\u094b \u0917\u0908\u0902!',
  'lang.current': '\u0935\u0930\u094d\u0924\u092e\u093e\u0928 \u092d\u093e\u0937\u093e: {lang}',
  'lang.set': '\u092d\u093e\u0937\u093e {lang} \u092a\u0930 \u0938\u0947\u091f \u0915\u0940 \u0917\u0908\u0964',
  'dash.save': '\u0938\u0947\u0935 \u0915\u0930\u0947\u0902',
  'dash.language': '\u092d\u093e\u0937\u093e',
  'onboard.welcome_title': 'BotWave \u092e\u0947\u0902 \u0906\u092a\u0915\u093e \u0938\u094d\u0935\u093e\u0917\u0924 \u0939\u0948!',
  'onboard.select_language': '\u092d\u093e\u0937\u093e \u091a\u0941\u0928\u0947\u0902',
};

const ru: TranslationMap = {
  ...en,
  'welcome.greeting': '\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c \u0432 {group}, {user}!',
  'error.admin_only': '\u042d\u0442\u0430 \u043a\u043e\u043c\u0430\u043d\u0434\u0430 \u0442\u043e\u043b\u044c\u043a\u043e \u0434\u043b\u044f \u0430\u0434\u043c\u0438\u043d\u043e\u0432.',
  'success.saved': '\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u044b!',
  'mod.banned': '{user} \u0437\u0430\u0431\u0430\u043d\u0435\u043d.',
  'mod.muted': '{user} \u0437\u0430\u043c\u044c\u044e\u0447\u0435\u043d.',
  'lang.current': '\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u044f\u0437\u044b\u043a: {lang}',
  'lang.set': '\u042f\u0437\u044b\u043a \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d \u043d\u0430 {lang}.',
  'dash.save': '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c',
  'dash.language': '\u042f\u0437\u044b\u043a',
  'onboard.welcome_title': '\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c \u0432 BotWave!',
  'onboard.select_language': '\u0412\u044b\u0431\u0440\u0430\u0442\u044c \u044f\u0437\u044b\u043a',
};

const tr: TranslationMap = {
  ...en,
  'welcome.greeting': '{group} grubuna hosgeldin, {user}!',
  'error.admin_only': 'Bu komut sadece yoneticiler icindir.',
  'success.saved': 'Ayarlar kaydedildi!',
  'mod.banned': '{user} yasaklandi.',
  'mod.muted': '{user} susturuldu.',
  'lang.current': 'Mevcut dil: {lang}',
  'lang.set': 'Dil {lang} olarak ayarlandi.',
  'dash.save': 'Kaydet',
  'dash.language': 'Dil',
  'onboard.welcome_title': 'BotWave\'a hosgeldiniz!',
  'onboard.select_language': 'Dil Secin',
};

const zh: TranslationMap = {
  ...en,
  'welcome.greeting': '\u6b22\u8fce\u6765\u5230 {group}\uff0c{user}\uff01',
  'error.admin_only': '\u6b64\u547d\u4ee4\u4ec5\u9650\u7ba1\u7406\u5458\u4f7f\u7528\u3002',
  'success.saved': '\u8bbe\u7f6e\u5df2\u4fdd\u5b58\uff01',
  'mod.banned': '{user} \u5df2\u88ab\u5c01\u7981\u3002',
  'mod.muted': '{user} \u5df2\u88ab\u7981\u8a00\u3002',
  'lang.current': '\u5f53\u524d\u8bed\u8a00\uff1a{lang}',
  'lang.set': '\u8bed\u8a00\u5df2\u8bbe\u7f6e\u4e3a {lang}\u3002',
  'dash.save': '\u4fdd\u5b58',
  'dash.language': '\u8bed\u8a00',
  'onboard.welcome_title': '\u6b22\u8fce\u4f7f\u7528 BotWave\uff01',
  'onboard.select_language': '\u9009\u62e9\u8bed\u8a00',
};

// Use English as fallback for other locales
const fallbackLocale = (overrides: Partial<TranslationMap>): TranslationMap => ({
  ...en,
  ...overrides,
});

export const translations: Record<string, TranslationMap> = {
  en,
  es,
  fr,
  ar,
  pt,
  de,
  hi,
  ru,
  tr,
  zh,
  ja: fallbackLocale({ 'dash.language': '\u8a00\u8a9e', 'dash.save': '\u4fdd\u5b58', 'onboard.welcome_title': 'BotWave\u3078\u3088\u3046\u3053\u305d\uff01', 'onboard.select_language': '\u8a00\u8a9e\u3092\u9078\u629e' }),
  ko: fallbackLocale({ 'dash.language': '\uc5b8\uc5b4', 'dash.save': '\uc800\uc7a5', 'onboard.welcome_title': 'BotWave\uc5d0 \uc624\uc2e0 \uac83\uc744 \ud658\uc601\ud569\ub2c8\ub2e4!', 'onboard.select_language': '\uc5b8\uc5b4 \uc120\ud0dd' }),
  id: fallbackLocale({ 'dash.language': 'Bahasa', 'dash.save': 'Simpan', 'onboard.welcome_title': 'Selamat Datang di BotWave!' }),
  it: fallbackLocale({ 'dash.language': 'Lingua', 'dash.save': 'Salva', 'onboard.welcome_title': 'Benvenuto su BotWave!' }),
  nl: fallbackLocale({ 'dash.language': 'Taal', 'dash.save': 'Opslaan', 'onboard.welcome_title': 'Welkom bij BotWave!' }),
  yo: fallbackLocale({ 'dash.language': 'Ede', 'dash.save': 'Fi Pamo', 'onboard.welcome_title': 'Kaabo si BotWave!' }),
  ha: fallbackLocale({ 'dash.language': 'Harshe', 'dash.save': 'Ajiye', 'onboard.welcome_title': 'Barka da zuwa BotWave!' }),
  ig: fallbackLocale({ 'dash.language': 'Asusu', 'dash.save': 'Chekwaa', 'onboard.welcome_title': 'Nnoo na BotWave!' }),
  sw: fallbackLocale({ 'dash.language': 'Lugha', 'dash.save': 'Hifadhi', 'onboard.welcome_title': 'Karibu BotWave!' }),
  zu: fallbackLocale({ 'dash.language': 'Ulimi', 'dash.save': 'Londoloza', 'onboard.welcome_title': 'Siyakwamukela ku-BotWave!' }),
  af: fallbackLocale({ 'dash.language': 'Taal', 'dash.save': 'Stoor', 'onboard.welcome_title': 'Welkom by BotWave!' }),
  am: fallbackLocale({ 'dash.language': '\u1240\u1295\u1263', 'dash.save': '\u12a0\u1235\u1240\u121d\u1325', 'onboard.welcome_title': '\u12a5\u1295\u12a9\u12a3\u1295 \u12c8\u12f0 BotWave!' }),
};
