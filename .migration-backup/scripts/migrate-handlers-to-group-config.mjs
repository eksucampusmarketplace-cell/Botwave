#!/usr/bin/env node
/**
 * One-shot codemod: route group-context handler writes to updateGroupConfigForChat.
 * Skips start.ts, info.ts, miniapps.ts (bot-global commands).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const handlersDir = path.join(__dirname, '..', 'bot', 'telegram', 'handlers');
const skip = new Set(['start.ts', 'info.ts', 'miniapps.ts']);

const REPLACEMENT =
  'updateGroupConfigForChat(sessionId, ctx.chat!.id.toString(), ';

for (const file of fs.readdirSync(handlersDir)) {
  if (!file.endsWith('.ts') || skip.has(file)) continue;
  const filePath = path.join(handlersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('updateTelegramConfig')) continue;

  content = content.replace(
    /updateTelegramConfig\s*\(\s*sessionId\s*,/g,
    REPLACEMENT,
  );
  content = content.replace(
    /db\.updateTelegramConfig\s*\(\s*sessionId\s*,/g,
    `db.updateGroupConfigForChat(sessionId, ctx.chat!.id.toString(), `,
  );

  // Fix imports
  if (content.includes('updateGroupConfigForChat')) {
    if (content.includes('updateTelegramConfig')) {
      content = content.replace(
        /updateTelegramConfig,\s*/g,
        'updateGroupConfigForChat, ',
      );
      if (!content.includes('updateGroupConfigForChat')) {
        content = content.replace(
          /from '\.\.\/utils\/db'/,
          "from '../utils/db'",
        );
      }
    } else {
      content = content.replace(
        /from '\.\.\/utils\/db'/,
        match => match,
      );
      content = content.replace(
        /import \{([^}]+)\} from '\.\.\/utils\/db'/,
        (m, imports) => {
          if (imports.includes('updateGroupConfigForChat')) return m;
          const trimmed = imports.trim();
          return `import { ${trimmed}, updateGroupConfigForChat } from '../utils/db'`;
        },
      );
      content = content.replace(/,\s*updateTelegramConfig\s*/g, ', ');
      content = content.replace(/updateTelegramConfig,\s*/g, '');
    }

    if (!content.includes('updateGroupConfigForChat') && content.includes('updateGroupConfigForChat')) {
      // noop
    }
    if (
      content.includes('updateGroupConfigForChat')
      && !/import \{[^}]*updateGroupConfigForChat/.test(content)
    ) {
      content = content.replace(
        /import \{([^}]+)\} from '\.\.\/utils\/db'/,
        (m, imports) => {
          if (imports.includes('updateGroupConfigForChat')) return m;
          return `import { ${imports.trim()}, updateGroupConfigForChat } from '../utils/db'`;
        },
      );
    }
  }

  fs.writeFileSync(filePath, content);
  console.log('Updated', file);
}

console.log('Done');
