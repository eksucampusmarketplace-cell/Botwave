# Telegram privilege-boundary hardening verification

Use three principals against the same `sessionId`:

- `creator_cookie`: dashboard cookie for `bot_sessions.user_id`
- `admin_x_initData`: Telegram initData for admin in `chatX` only
- `admin_y_initData`: Telegram initData for admin in `chatY` only
- `outsider_initData`: Telegram initData for user not in `chatX/chatY`

## A) Admin of group X cannot mutate/read group Y

1. `admin_x_initData` calls:
   - `POST /api/telegram/group-config` with `{ sessionId, chatId: chatY, ... }`
   - `POST /api/telegram/notes` with `{ sessionId, chatId: chatY, ... }`
   - `GET /api/telegram/modlog?sessionId=...&chatId=chatY`
2. Expected: `403 Forbidden`.
3. Control: same calls with `chatId=chatX` succeed (`200`).

## B) Non-members cannot access group-scoped data

1. `outsider_initData` calls:
   - `GET /api/telegram/notes?sessionId=...&chatId=chatX`
   - `GET /api/telegram/filters?sessionId=...&chatId=chatX`
   - `GET /api/telegram/scheduled?sessionId=...&chatId=chatX`
   - `GET /api/telegram/modlog?sessionId=...&chatId=chatX`
2. Expected: `403 Forbidden`.
3. `GET /api/telegram/groups?sessionId=...` returns `[]` or only chats they actually belong to.

## C) Creator-only endpoints reject non-owners

Using `admin_x_initData`, verify each returns `401` or `403`:

- `PUT /api/telegram/config`
- `POST /api/telegram/broadcast`
- `GET /api/telegram/analytics/summary?sessionId=...`
- `POST /api/telegram/xp/reset` without `chatId`
- `PUT /api/telegram/messages` when payload contains global fields (`start_text`, `help_text`, etc.)

Control:

- Same requests with `creator_cookie` succeed.
- `admin_x_initData` can still call group-scoped paths when `chatId=chatX`.

## D) Anon direct writes are denied by RLS

In Supabase SQL (or psql), run with the anon JWT role:

```sql
set local role anon;
insert into telegram_group_configs (session_id, chat_id, welcome_message)
values ('00000000-0000-0000-0000-000000000000', '123', 'pwn');
```

Expected: `ERROR: new row violates row-level security policy` (or permission denied).

Repeat for `telegram_notes`, `telegram_filters`, and `telegram_scheduled_messages`.
