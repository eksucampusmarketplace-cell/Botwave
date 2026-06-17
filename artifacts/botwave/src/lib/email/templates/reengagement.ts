import { baseTemplate } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.botwave.online';

export function reengagementTemplate(username: string, hasLinkedDevice: boolean): string {
  const deviceGuide = !hasLinkedDevice ? `
    <div style="background:#0f172a;border-radius:8px;padding:20px;margin:0 0 20px;border-left:3px solid #f59e0b">
      <p style="color:#f59e0b;font-size:14px;font-weight:600;margin:0 0 12px">You haven't connected a Telegram bot yet</p>
      <p style="color:#cbd5e1;font-size:13px;line-height:1.6;margin:0 0 16px">
        It only takes 30 seconds to get your first bot running. Here's how:
      </p>
      <div style="background:#1e293b;border-radius:6px;padding:16px;margin:0 0 12px">
        <p style="color:#f1f5f9;font-size:13px;margin:0 0 10px"><strong style="color:#60a5fa">Step 1:</strong> Open <strong>Telegram</strong> and message <strong>@BotFather</strong> &rarr; send <strong>/newbot</strong> and follow the prompts</p>
        <p style="color:#f1f5f9;font-size:13px;margin:0 0 10px"><strong style="color:#60a5fa">Step 2:</strong> Go to your <a href="${APP_URL}/dashboard/sessions" style="color:#60a5fa;text-decoration:none">Sessions page</a> and click <strong>+ Add New Session</strong></p>
        <p style="color:#f1f5f9;font-size:13px;margin:0"><strong style="color:#60a5fa">Step 3:</strong> Paste your <strong>bot token</strong> from @BotFather and click Connect</p>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:0">Your bot is yours — BotWave only uses the token to send and receive messages on your behalf.</p>
    </div>
  ` : '';

  return baseTemplate('We miss you on BotWave', `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px">
      Hey ${username}, we noticed you haven't been around in a while. The team's been shipping non-stop and there's a lot of new stuff waiting for you.
    </p>

    ${deviceGuide}

    <div style="background:#0f172a;border-radius:8px;padding:20px;margin:0 0 20px">
      <p style="color:#22c55e;font-size:14px;font-weight:600;margin:0 0 12px">What's new since you've been away:</p>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:8px 0;color:#f1f5f9;font-size:13px;border-bottom:1px solid #334155">
            <strong>Anti-Ban Protection</strong>
          </td>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid #334155;text-align:right">
            Human-like delays, message jitter, session warmup
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#f1f5f9;font-size:13px;border-bottom:1px solid #334155">
            <strong>Anti-Delete</strong>
          </td>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid #334155;text-align:right">
            Recover deleted messages automatically
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#f1f5f9;font-size:13px;border-bottom:1px solid #334155">
            <strong>Media Tools</strong>
          </td>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid #334155;text-align:right">
            Stickers, downloads, image editing, music search
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#f1f5f9;font-size:13px;border-bottom:1px solid #334155">
            <strong>Study Hub</strong>
          </td>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;border-bottom:1px solid #334155;text-align:right">
            Flashcards, quizzes, Pomodoro timer
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#f1f5f9;font-size:13px">
            <strong>AI Chat</strong>
          </td>
          <td style="padding:8px 0;color:#94a3b8;font-size:13px;text-align:right">
            Gemini-powered conversations with memory
          </td>
        </tr>
      </table>
    </div>

    <div style="background:linear-gradient(135deg,#0f172a,#1a2744);border-radius:8px;padding:20px;margin:0 0 20px;border:1px solid #334155">
      <p style="color:#f1f5f9;font-size:14px;font-weight:600;margin:0 0 8px">Your account is safe with us</p>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0">
        BotWave uses the official Telegram Bot API — there is no ban risk for normal bot usage. Your bot token is stored securely and only used to connect your bot to BotWave's automation engine.
      </p>
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${APP_URL}/dashboard" style="display:inline-block;background:#22c55e;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Come Back to BotWave
      </a>
    </div>

    <p style="color:#64748b;font-size:12px;text-align:center;margin:0">
      The team is shipping daily. Don't miss out.
    </p>
  `);
}
