/**
 * Generic system for managing game session preferences stored in cookies
 * Handles brush size and pane layouts
 */

export interface GameSessionPreferences {
  brushSize?: number;
  paneLayoutDesktop?: number[];
  paneLayoutMobile?: number[];
}

export interface PreferenceConfig<T> {
  cookieName: string;
  defaultValue: T;
  validate?: (value: unknown) => value is T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

// Cookie expiration time (1 year in seconds)
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// Preference configurations
export const PREFERENCE_CONFIGS: Record<keyof GameSessionPreferences, PreferenceConfig<any>> = {
  brushSize: {
    cookieName: 'tableslayer:brushSize',
    defaultValue: 75, // Match the default in buildSceneProps
    validate: (value): value is number => typeof value === 'number' && value >= 10 && value <= 1000
  },
  paneLayoutDesktop: {
    cookieName: 'tableslayer:paneLayoutDesktop',
    defaultValue: [20, 50, 30],
    validate: (value): value is number[] => Array.isArray(value) && value.every((v) => typeof v === 'number' && v > 0)
  },
  paneLayoutMobile: {
    cookieName: 'tableslayer:paneLayoutMobile',
    defaultValue: [50, 50],
    validate: (value): value is number[] => Array.isArray(value) && value.every((v) => typeof v === 'number' && v > 0)
  }
};

/**
 * Get a preference value from cookies (client-side)
 */
export function getPreference<K extends keyof GameSessionPreferences>(key: K): GameSessionPreferences[K] {
  const config = PREFERENCE_CONFIGS[key];
  if (!config) {
    throw new Error(`Unknown preference key: ${key}`);
  }

  try {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${config.cookieName}=`))
      ?.split('=')[1];

    if (!cookieValue) {
      return config.defaultValue;
    }

    const value = config.deserialize
      ? config.deserialize(decodeURIComponent(cookieValue))
      : JSON.parse(decodeURIComponent(cookieValue));

    if (config.validate && !config.validate(value)) {
      console.warn(`Invalid value for preference ${key}:`, value);
      return config.defaultValue;
    }

    return value;
  } catch (error) {
    console.error(`Error reading preference ${key}:`, error);
    return config.defaultValue;
  }
}

/**
 * Set a preference value in cookies (client-side)
 */
export function setPreference<K extends keyof GameSessionPreferences>(key: K, value: GameSessionPreferences[K]): void {
  const config = PREFERENCE_CONFIGS[key];
  if (!config) {
    throw new Error(`Unknown preference key: ${key}`);
  }

  if (config.validate && !config.validate(value)) {
    console.error(`Invalid value for preference ${key}:`, value);
    return;
  }

  const serialized = config.serialize ? config.serialize(value) : JSON.stringify(value);

  document.cookie = `${config.cookieName}=${encodeURIComponent(serialized)}; path=/; max-age=${COOKIE_MAX_AGE}`;
}

/**
 * Get a preference value from cookies (server-side)
 * @param cookies - SvelteKit cookies object
 */
export function getPreferenceServer<K extends keyof GameSessionPreferences>(
  cookies: { get: (name: string) => string | undefined },
  key: K
): GameSessionPreferences[K] {
  const config = PREFERENCE_CONFIGS[key];
  if (!config) {
    throw new Error(`Unknown preference key: ${key}`);
  }

  try {
    const cookieValue = cookies.get(config.cookieName);
    if (!cookieValue) {
      return config.defaultValue;
    }

    const value = config.deserialize ? config.deserialize(cookieValue) : JSON.parse(cookieValue);

    if (config.validate && !config.validate(value)) {
      console.warn(`Invalid value for preference ${key}:`, value);
      return config.defaultValue;
    }

    return value;
  } catch (error) {
    console.error(`Error reading preference ${key}:`, error);
    return config.defaultValue;
  }
}

/**
 * Get all preferences at once (client-side)
 */
export function getAllPreferences(): GameSessionPreferences {
  const preferences: GameSessionPreferences = {};

  for (const key in PREFERENCE_CONFIGS) {
    const typedKey = key as keyof GameSessionPreferences;
    (preferences as any)[typedKey] = getPreference(typedKey);
  }

  return preferences;
}

/**
 * Get all preferences at once (server-side)
 */
export function getAllPreferencesServer(cookies: {
  get: (name: string) => string | undefined;
}): GameSessionPreferences {
  const preferences: GameSessionPreferences = {};

  for (const key in PREFERENCE_CONFIGS) {
    const typedKey = key as keyof GameSessionPreferences;
    (preferences as any)[typedKey] = getPreferenceServer(cookies, typedKey);
  }

  return preferences;
}

/**
 * Clear a specific preference
 */
export function clearPreference<K extends keyof GameSessionPreferences>(key: K): void {
  const config = PREFERENCE_CONFIGS[key];
  if (!config) {
    throw new Error(`Unknown preference key: ${key}`);
  }

  document.cookie = `${config.cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Clear all preferences
 */
export function clearAllPreferences(): void {
  for (const key in PREFERENCE_CONFIGS) {
    clearPreference(key as keyof GameSessionPreferences);
  }
}
