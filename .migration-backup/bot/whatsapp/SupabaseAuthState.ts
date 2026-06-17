import { 
  AuthenticationCreds, 
  AuthenticationState, 
  SignalDataTypeMap, 
  initAuthCreds, 
  BufferJSON, 
  proto 
} from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const useSupabaseAuthState = async (sessionId: string): Promise<{ state: AuthenticationState, saveCreds: () => Promise<void> }> => {
  
  const fetchAuthState = async () => {
    const { data, error } = await supabase
      .from('bot_sessions')
      .select('auth_state')
      .eq('id', sessionId)
      .single();

    if (error || !data || !data.auth_state) {
      console.log(`[AuthState] Session ${sessionId}: no existing auth state found (fresh session). error=${error ? `${error.code}:${error.message}` : 'none'} hasData=${!!data} hasAuthState=${!!(data?.auth_state)}`);
      return null;
    }

    console.log(`[AuthState] Session ${sessionId}: loaded existing auth state from DB`);
    return JSON.parse(JSON.stringify(data.auth_state), BufferJSON.reviver);
  };

  let isSaving = false;
  let pendingSave: any = null;

  const saveAuthState = async (state: any) => {
    if (isSaving) {
      pendingSave = state;
      return;
    }

    isSaving = true;
    try {
      const authStateSerialized = JSON.parse(JSON.stringify(state, BufferJSON.replacer));
      const { error } = await supabase
        .from('bot_sessions')
        .update({ auth_state: authStateSerialized })
        .eq('id', sessionId);

      if (error) {
        console.error(`[AuthState] SAVE FAILED for session ${sessionId}: code=${error.code} message=${error.message} details=${error.details}`);
      }
    } finally {
      isSaving = false;
      if (pendingSave) {
        const nextState = pendingSave;
        pendingSave = null;
        await saveAuthState(nextState);
      }
    }
  };

  let loadedState = await fetchAuthState();

  // If there are stale credentials from a previous failed pairing attempt
  // (registered=false but auth was saved), clear them and start fresh.
  // Stale creds cause Baileys to attempt "logging in" instead of
  // "registering", which results in a 401 auth failure on reconnect.
  if (loadedState?.creds && !loadedState.creds.registered) {
    console.log(`[AuthState] Session ${sessionId}: clearing stale unregistered credentials`);
    await supabase
      .from('bot_sessions')
      .update({ auth_state: null, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    loadedState = null;
  }

  const creds: AuthenticationCreds = loadedState?.creds || initAuthCreds();
  const keys: any = loadedState?.keys || {};
  console.log(`[AuthState] Session ${sessionId}: initialized. registered=${creds.registered} hasKeys=${Object.keys(keys).length > 0}`);

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const data: { [id: string]: SignalDataTypeMap[typeof type] } = {};
          for (const id of ids) {
            let value = keys[`${type}-${id}`];
            if (type === 'app-state-sync-key' && value) {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          }
          return data;
        },
        set: (data) => {
          for (const type in data) {
            for (const id in data[type]) {
              const value = data[type][id];
              if (value) {
                keys[`${type}-${id}`] = value;
              } else {
                delete keys[`${type}-${id}`];
              }
            }
          }
          saveAuthState({ creds, keys });
        }
      }
    },
    saveCreds: async () => {
      await saveAuthState({ creds, keys });
    }
  };
};
