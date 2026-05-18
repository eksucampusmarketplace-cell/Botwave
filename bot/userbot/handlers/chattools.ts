/**
 * Chat tools handler for Telegram userbot.
 * Commands: .chatinfo, .members, .admins, .invite, .leave, .username, .setbio,
 *           .setname, .setpfp, .groupname, .groupbio, .grouppfp, .zombies
 */

import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl';
import { NewMessageEvent } from 'telegram/events';
import {
  waitForRateLimit,
  shortPause,
  mediumPause,
  humanDelay,
} from '../utils/humanizer';

type HandlerFn = (client: TelegramClient, event: NewMessageEvent) => Promise<void>;

export const chatInfoHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  try {
    const entity = await client.getEntity(chatId);
    const lines: string[] = ['📋 **Chat Info**'];

    if ('title' in entity) {
      lines.push(`**Title:** ${(entity as { title: string }).title}`);
    }
    if ('username' in entity && (entity as { username?: string }).username) {
      lines.push(`**Username:** @${(entity as { username: string }).username}`);
    }
    lines.push(`**ID:** \`${chatId}\``);

    if ('participantsCount' in entity) {
      lines.push(`**Members:** ${(entity as { participantsCount: number }).participantsCount}`);
    }
    if ('date' in entity) {
      const date = new Date((entity as { date: number }).date * 1000);
      lines.push(`**Created:** ${date.toLocaleDateString()}`);
    }
    if ('megagroup' in entity && (entity as { megagroup: boolean }).megagroup) {
      lines.push(`**Type:** Supergroup`);
    } else if ('broadcast' in entity && (entity as { broadcast: boolean }).broadcast) {
      lines.push(`**Type:** Channel`);
    } else {
      lines.push(`**Type:** Group`);
    }

    await shortPause();
    await msg.edit({ text: lines.join('\n') });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const adminsHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  try {
    const chatPeer = await client.getInputEntity(chatId);
    const result = await client.invoke(
      new Api.channels.GetParticipants({
        channel: chatPeer as unknown as Api.TypeInputChannel,
        filter: new Api.ChannelParticipantsAdmins(),
        offset: 0,
        limit: 100,
        hash: BigInt(0),
      }),
    );

    if (!('users' in result)) {
      await msg.edit({ text: '❌ Could not fetch admin list.' });
      return;
    }

    const users = result.users as Api.User[];
    const lines = [`👮 **Admins** (${users.length}):\n`];

    for (const user of users) {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const uname = user.username ? ` (@${user.username})` : '';
      lines.push(`• ${name}${uname}`);
    }

    await shortPause();
    await msg.edit({ text: lines.join('\n') });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const inviteHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('group_action');
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (!args[0]) {
    await msg.edit({ text: '❌ Usage: .invite <username or user_id>' });
    return;
  }

  const chatId = msg.chatId;
  if (!chatId) return;

  await mediumPause();

  try {
    const userEntity = await client.getInputEntity(args[0]);
    const chatPeer = await client.getInputEntity(chatId);
    await client.invoke(
      new Api.channels.InviteToChannel({
        channel: chatPeer as unknown as Api.TypeInputChannel,
        users: [userEntity as unknown as Api.TypeInputUser],
      }),
    );
    await shortPause();
    await msg.edit({ text: `✅ Invited ${args[0]} to this chat.` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Invite failed: ${errorMsg}` });
  }
};

export const leaveHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('group_action');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  await msg.edit({ text: '👋 Leaving chat...' });
  await mediumPause();

  try {
    const chatPeer = await client.getInputEntity(chatId);
    await client.invoke(
      new Api.channels.LeaveChannel({
        channel: chatPeer as unknown as Api.TypeInputChannel,
      }),
    );
  } catch {}
};

export const setNameHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (!args[0]) {
    await msg.edit({ text: '❌ Usage: .setname <first> [last]' });
    return;
  }

  const firstName = args[0];
  const lastName = args.slice(1).join(' ') || '';

  await mediumPause();

  try {
    await client.invoke(
      new Api.account.UpdateProfile({
        firstName,
        lastName,
      }),
    );
    await shortPause();
    await msg.edit({ text: `✅ Name updated to: ${firstName} ${lastName}`.trim() });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const setBioHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;
  const content = (msg.text || '').split(/\s+/).slice(1).join(' ');

  if (!content) {
    await msg.edit({ text: '❌ Usage: .setbio <bio text>' });
    return;
  }

  await mediumPause();

  try {
    await client.invoke(
      new Api.account.UpdateProfile({ about: content }),
    );
    await shortPause();
    await msg.edit({ text: `✅ Bio updated.` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const setUsernameHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;
  const args = (msg.text || '').split(/\s+/).slice(1);

  if (!args[0]) {
    await msg.edit({ text: '❌ Usage: .username <new_username>' });
    return;
  }

  await mediumPause();

  try {
    await client.invoke(
      new Api.account.UpdateUsername({ username: args[0] }),
    );
    await shortPause();
    await msg.edit({ text: `✅ Username changed to @${args[0]}` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const zombiesHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('api_call');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  const args = (msg.text || '').split(/\s+/).slice(1);
  const doClean = args[0] === 'clean' || args[0] === 'kick';

  await msg.edit({ text: '🧟 Scanning for deleted accounts...' });

  try {
    const chatPeer = await client.getInputEntity(chatId);
    let offset = 0;
    let zombieCount = 0;
    let kicked = 0;

    while (true) {
      const result = await client.invoke(
        new Api.channels.GetParticipants({
          channel: chatPeer as unknown as Api.TypeInputChannel,
          filter: new Api.ChannelParticipantsRecent(),
          offset,
          limit: 200,
          hash: BigInt(0),
        }),
      );

      if (!('users' in result) || (result.users as Api.User[]).length === 0) break;

      const users = result.users as Api.User[];
      for (const user of users) {
        if (user.deleted) {
          zombieCount++;
          if (doClean) {
            await waitForRateLimit('ban_action');
            await humanDelay(1500, 4000);
            try {
              const inputUser = await client.getInputEntity(user.id);
              await client.invoke(
                new Api.channels.EditBanned({
                  channel: chatPeer as unknown as Api.TypeInputChannel,
                  participant: inputUser,
                  bannedRights: new Api.ChatBannedRights({
                    untilDate: 0,
                    viewMessages: true,
                  }),
                }),
              );
              kicked++;
            } catch {}
          }
        }
      }

      offset += users.length;
      if (users.length < 200) break;
    }

    await shortPause();
    if (doClean) {
      await msg.edit({
        text: `🧟 Found ${zombieCount} deleted accounts. Kicked: ${kicked}`,
      });
    } else {
      await msg.edit({
        text: `🧟 Found ${zombieCount} deleted accounts.\nUse \`.zombies clean\` to kick them.`,
      });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const groupNameHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('group_action');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  const title = (msg.text || '').split(/\s+/).slice(1).join(' ');
  if (!title) {
    await msg.edit({ text: '❌ Usage: .groupname <new name>' });
    return;
  }

  await mediumPause();

  try {
    const chatPeer = await client.getInputEntity(chatId);
    await client.invoke(
      new Api.channels.EditTitle({
        channel: chatPeer as unknown as Api.TypeInputChannel,
        title,
      }),
    );
    await shortPause();
    await msg.edit({ text: `✅ Group name changed to: ${title}` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const groupBioHandler: HandlerFn = async (client, event) => {
  await waitForRateLimit('group_action');
  const msg = event.message;
  const chatId = msg.chatId;
  if (!chatId) return;

  const about = (msg.text || '').split(/\s+/).slice(1).join(' ');
  if (!about) {
    await msg.edit({ text: '❌ Usage: .groupbio <description>' });
    return;
  }

  await mediumPause();

  try {
    const chatPeer = await client.getInputEntity(chatId);
    await client.invoke(
      new Api.channels.EditAbout({
        channel: chatPeer as unknown as Api.TypeInputChannel,
        about,
      }),
    );
    await shortPause();
    await msg.edit({ text: `✅ Group description updated.` });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await msg.edit({ text: `❌ Error: ${errorMsg}` });
  }
};

export const chatToolHandlers: Record<string, HandlerFn> = {
  chatinfo: chatInfoHandler,
  admins: adminsHandler,
  invite: inviteHandler,
  leave: leaveHandler,
  setname: setNameHandler,
  setbio: setBioHandler,
  username: setUsernameHandler,
  zombies: zombiesHandler,
  groupname: groupNameHandler,
  groupbio: groupBioHandler,
};
