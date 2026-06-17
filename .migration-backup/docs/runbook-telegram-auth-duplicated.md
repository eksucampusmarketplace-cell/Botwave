# Runbook: Telegram AUTH_KEY_DUPLICATED Error

## What is this error?

`AUTH_KEY_DUPLICATED` is a Telegram MTProto error (code 406) that occurs when the same session authentication key is being used by two or more clients simultaneously. Telegram enforces single-client-per-session and terminates the conflicting connection.

## Common Causes

1. **Multiple containers running the same session** — e.g., two `botwave_userbot` instances started by accident, or a stale container was not stopped before deploying a new one.
2. **Corrupted session string** — The saved `telegram_session_string` in the database became stale or was duplicated across sessions.
3. **Manual login from another device** — The user logged into the same Telegram account from another Userbot or Telethon/Pyrogram instance outside BotWave.

## Automatic Recovery (v2.x+)

As of PR #495+, BotWave handles this error automatically:

1. **Detection**: The heartbeat loop and reconnect handler detect `AUTH_KEY_DUPLICATED` as a terminal error.
2. **Session purge**: The stale `telegram_session_string` is immediately cleared from the database to prevent reuse.
3. **State transition**: Session state is set to `needs_reauth`.
4. **Auto-reset (5 min cooldown)**: After 5 minutes, the system automatically transitions the session to `qr_pending` so the user can re-authenticate from the dashboard.

**No manual intervention is required in most cases.** The user will see their session marked for re-authentication in the dashboard and can initiate a new session.

## Manual Resolution (if auto-recovery fails)

### Step 1: Verify only one container is running

```bash
docker ps | grep userbot
# Expected: exactly one botwave_userbot container
```

If multiple userbot containers exist:
```bash
docker stop <stale_container_id>
docker rm <stale_container_id>
```

### Step 2: Clear the session data

Connect to the database and clear the session string:

```sql
-- Find the affected session
SELECT id, state, telegram_session_string IS NOT NULL as has_session
FROM bot_sessions
WHERE platform = 'telegram_userbot' AND state IN ('needs_reauth', 'error');

-- Clear the session string for the affected session
UPDATE bot_sessions
SET telegram_session_string = NULL,
    state = 'qr_pending',
    updated_at = NOW()
WHERE id = '<session_id>';
```

Or via Supabase dashboard: navigate to `bot_sessions` table, find the session, set `telegram_session_string` to `NULL` and `state` to `qr_pending`.

### Step 3: Restart the userbot container

```bash
cd /opt/botwave/deploy
docker compose restart botwave-userbot
```

### Step 4: Verify recovery

```bash
docker logs botwave_userbot --tail 50 -f
# Look for: "[USERBOT-MGR] Session XXXXXXXX started successfully"
```

The user should now see a QR code / phone login prompt in their BotWave dashboard to re-authenticate.

## Prevention

- **Never run two userbot containers simultaneously.** The `docker-compose.yml` enforces `container_name: botwave_userbot` to prevent duplicates, but manual `docker run` commands can bypass this.
- **Use `docker compose up -d` for deployments**, not manual container management.
- **Check for stale containers** after crashes or OOM kills: `docker ps -a | grep userbot`.

## Monitoring

The health monitor script checks container health status:
```bash
bash /opt/botwave/scripts/health-monitor.sh
```

Set up a cron job for continuous monitoring:
```bash
# Check every 5 minutes, log results
*/5 * * * * /opt/botwave/scripts/health-monitor.sh >> /var/log/botwave-health.log 2>&1
```

## Related Code

- `bot/userbot/manager.ts` — `scheduleAuthReset()` method handles auto-recovery
- `bot/userbot/client.ts` — Terminal error detection in `connect()`
- `bot/userbot/utils/db.ts` — `clearSessionString()` purges stale session data
