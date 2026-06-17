import { redirect } from 'next/navigation';

/**
 * Redirect the React mini app route to the static HTML version.
 * The static HTML at /miniapp/admin/index.html is the complete,
 * fully functional implementation. This React page was an incomplete
 * duplicate that caused confusion and role-filtering bugs.
 */
export default function MiniAppPage({
  params,
}: {
  params: { sessionId: string; chatId: string };
}) {
  redirect(
    `/miniapp/admin/index.html?sessionId=${encodeURIComponent(params.sessionId)}&chatId=${encodeURIComponent(params.chatId)}`,
  );
}
