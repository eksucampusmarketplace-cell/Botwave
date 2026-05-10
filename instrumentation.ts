export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startEmailQueueProcessor } = await import('@/lib/email/queue');
    startEmailQueueProcessor();
  }
}
