import { db } from '$lib/db/app';
import { apiKeysTable, usersTable, type SelectUser } from '$lib/db/app/schema';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { and, eq } from 'drizzle-orm';

const API_KEY_PREFIX = 'ts_';

export type ApiKeyValidationResult = { user: SelectUser } | null;

export const generateApiKeyToken = (): string => {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return `${API_KEY_PREFIX}${token}`;
};

export const hashApiKey = (key: string): string => {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(key)));
};

export const generateApiKey = async (userId: string, name: string): Promise<{ key: string; keyId: string }> => {
  const key = generateApiKeyToken();
  const keyHash = hashApiKey(key);

  const [inserted] = await db
    .insert(apiKeysTable)
    .values({
      userId,
      keyHash,
      name
    })
    .returning({ id: apiKeysTable.id });

  return { key, keyId: inserted.id };
};

export const validateApiKey = async (key: string): Promise<ApiKeyValidationResult> => {
  if (!key.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  const keyHash = hashApiKey(key);

  const result = await db
    .select({
      apiKey: apiKeysTable,
      user: usersTable
    })
    .from(apiKeysTable)
    .innerJoin(usersTable, eq(apiKeysTable.userId, usersTable.id))
    .where(eq(apiKeysTable.keyHash, keyHash))
    .get();

  if (!result) {
    return null;
  }

  // Update lastUsedAt timestamp
  await db.update(apiKeysTable).set({ lastUsedAt: new Date() }).where(eq(apiKeysTable.id, result.apiKey.id));

  return { user: result.user };
};

export const getApiKeysForUser = async (
  userId: string
): Promise<Array<{ id: string; name: string; createdAt: Date; lastUsedAt: Date | null }>> => {
  const keys = await db
    .select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      createdAt: apiKeysTable.createdAt,
      lastUsedAt: apiKeysTable.lastUsedAt
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, userId));

  return keys;
};

export const deleteApiKey = async (keyId: string, userId: string): Promise<boolean> => {
  // Only delete if the key belongs to the user
  const result = await db
    .delete(apiKeysTable)
    .where(and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.userId, userId)))
    .returning({ id: apiKeysTable.id });

  return result.length > 0;
};
