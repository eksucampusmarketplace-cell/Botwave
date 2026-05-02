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
      return null;
    }

    return JSON.parse(JSON.stringify(data.auth_state), BufferJSON.reviver);
  };

  const saveAuthState = async (state: any) => {
    const authStateSerialized = JSON.parse(JSON.stringify(state, BufferJSON.replacer));
    const { error } = await supabase
      .from('bot_sessions')
      .update({ auth_state: authStateSerialized })
      .eq('id', sessionId);

    if (error) {
      console.error(`Error saving auth state for session ${sessionId}:`, error);
    }
  };

  let loadedState = await fetchAuthState();
  
  const creds: AuthenticationCreds = loadedState?.creds || initAuthCreds();
  const keys: any = loadedState?.keys || {};

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
