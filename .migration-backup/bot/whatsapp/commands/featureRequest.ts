import { registerCommand, type MessageContext, type TemplateVars } from './registry';
import { sendReply } from './helpers';
import { createClient } from '@supabase/supabase-js';
import { processFeatureRequest } from '../../../lib/feature-requests';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);

async function handleFeature(
  context: MessageContext,
  args: string[],
  sock: any,
  _vars: TemplateVars,
): Promise<void> {
  const description = args.join(' ').trim();

  if (!description || description.length < 10) {
    await sendReply(
      context.chatJid,
      '*FEATURE REQUESTS*\n\n' +
      'Suggest a new feature for the bot!\n\n' +
      '*Usage:* `!feature <your idea>`\n' +
      '*Example:* `!feature Add a command to generate memes from text`\n\n' +
      '_Your suggestion will be analyzed by AI and reviewed by admins._',
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  if (description.length > 2000) {
    await sendReply(
      context.chatJid,
      'Your feature description is too long (max 2000 characters). Please shorten it and try again.',
      sock, context.rawMessage.key, context.queue,
    );
    return;
  }

  await sendReply(
    context.chatJid,
    'Got it! Analyzing your feature request...',
    sock, context.rawMessage.key, context.queue,
  );

  try {
    const { data: inserted, error: insertError } = await supabase
      .from('feature_requests')
      .insert({
        user_identifier: context.senderJid,
        platform: 'whatsapp',
        description,
        status: 'processing',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[FeatureReq] Insert error:', insertError);
      await sendReply(
        context.chatJid,
        'Could not save your request right now. Please try again later.',
        sock, context.rawMessage.key, context.queue,
      );
      return;
    }

    const requestId = inserted.id;
    const shortId = requestId.slice(0, 8);

    const aiResponse = await processFeatureRequest(description);
    const newStatus = aiResponse ? 'completed' : 'failed';

    await supabase
      .from('feature_requests')
      .update({
        ai_response: aiResponse,
        status: newStatus,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (aiResponse) {
      await sendReply(
        context.chatJid,
        `*Feature Request #${shortId}*\n\n` +
        `Your idea has been received and analyzed.\n` +
        `Status: *Completed*\n\n` +
        `_The admin team will review the AI analysis and decide on implementation._`,
        sock, context.rawMessage.key, context.queue,
      );
    } else {
      await sendReply(
        context.chatJid,
        `*Feature Request #${shortId}*\n\n` +
        `Your idea has been saved but AI analysis is temporarily unavailable.\n` +
        `Status: *Pending Review*\n\n` +
        `_The admin team will review it manually._`,
        sock, context.rawMessage.key, context.queue,
      );
    }
  } catch (err) {
    console.error('[FeatureReq] Error:', err);
    await sendReply(
      context.chatJid,
      'Something went wrong while processing your feature request. Please try again later.',
      sock, context.rawMessage.key, context.queue,
    );
  }
}

registerCommand({
  name: 'feature',
  aliases: ['feature', 'suggest', 'idea', 'request'],
  category: 'utility',
  description: 'Submit a feature suggestion for the bot',
  execute: handleFeature,
});
