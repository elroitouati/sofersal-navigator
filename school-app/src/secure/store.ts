// סודות (סיסמת אמי"ת, מפתח API) נשמרים מוצפנים ב-Android Keystore דרך expo-secure-store.
// הם אף פעם לא נשמרים ב-SQLite ולא נשלחים לשום מקום חוץ מהיעד שלהם.
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  amitUser: 'amit_user',
  amitPass: 'amit_pass',
  anthropicKey: 'anthropic_api_key',
} as const;

export interface AmitCredentials {
  username: string;
  password: string;
}

export async function getAmitCredentials(): Promise<AmitCredentials | null> {
  const [username, password] = await Promise.all([
    SecureStore.getItemAsync(KEYS.amitUser),
    SecureStore.getItemAsync(KEYS.amitPass),
  ]);
  return username && password ? { username, password } : null;
}

export async function setAmitCredentials(c: AmitCredentials): Promise<void> {
  await SecureStore.setItemAsync(KEYS.amitUser, c.username);
  await SecureStore.setItemAsync(KEYS.amitPass, c.password);
}

export async function clearAmitCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.amitUser);
  await SecureStore.deleteItemAsync(KEYS.amitPass);
}

export const getAnthropicKey = () => SecureStore.getItemAsync(KEYS.anthropicKey);
export const setAnthropicKey = (key: string) => SecureStore.setItemAsync(KEYS.anthropicKey, key.trim());
export const clearAnthropicKey = () => SecureStore.deleteItemAsync(KEYS.anthropicKey);

export async function clearAllSecrets(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
}
