import { registerCommand, type MessageContext } from './registry';
import { sendReply } from './helpers';
import { searchKnowledge } from './knowledgeBase';

// ─── !ask — Smart FAQ with fuzzy matching ───────────────────────────────────

async function handleAsk(
  context: MessageContext,
  args: string[],
  sock: any,
): Promise<void> {
  const query = args.join(' ').trim();
  if (!query) {
    await sendReply(
      context.chatJid,
      '*BotWave Smart FAQ*\n\n' +
      'Ask me anything about BotWave!\n\n' +
      'Usage: *!ask [your question]*\n\n' +
      'Examples:\n' +
      '• !ask how do I make stickers\n' +
      '• !ask what are the pricing plans\n' +
      '• !ask how to set up welcome messages\n' +
      '• !ask is my data safe',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  const results = searchKnowledge(query);

  if (results.length === 0) {
    await sendReply(
      context.chatJid,
      `I couldn't find an answer for "${query}".\n\n` +
      'Try rephrasing your question, or use:\n' +
      '• *!help text* — Quick command list\n' +
      '• *!help* — Full guide (.docx)\n' +
      '• The support chat at www.botwave.online',
      sock,
      context.rawMessage.key,
      context.queue,
    );
    return;
  }

  // Best match
  const best = results[0];
  let reply = `*${best.question}*\n\n${best.answer}`;

  // If there are related results, show them as suggestions
  if (results.length > 1) {
    reply += '\n\n_Related:_';
    for (let i = 1; i < results.length; i++) {
      reply += `\n• _${results[i].question}_`;
    }
    reply += '\n\n_Ask again with one of those topics for more info!_';
  }

  await sendReply(context.chatJid, reply, sock, context.rawMessage.key, context.queue);
}

registerCommand({
  name: 'ask',
  aliases: ['ask', 'faq', 'support'],
  category: 'info',
  description: 'Smart FAQ — ask anything about BotWave',
  execute: async (context, args, sock) => {
    await handleAsk(context, args, sock);
  },
});

// !diagnose command removed — exposed internal system info (URLs, memory, API keys).
