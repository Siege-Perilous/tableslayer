import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { alphabet, generateRandomString } from 'oslo/crypto';
import { v4 as uuidv4 } from 'uuid';

export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey().notNull().default(uuidv4()),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  passwordHash: text('password_hash').notNull(),
  address: text('address')
});

export const emailVerificationCodesTable = sqliteTable('email_verification_codes', {
  id: text('id').primaryKey().notNull().default(uuidv4()),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  code: text('code')
    .notNull()
    .default(generateRandomString(6, alphabet('0-9', 'A-Z'))),
  expiresAt: integer('expires_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now') + 60 * 15)`)
});

export const sessionTable = sqliteTable('session', {
  id: text('id').notNull().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull()
});

export const scenesTable = sqliteTable('scenes', {
  id: text('id').primaryKey().notNull().default(uuidv4()),
  title: text('title').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: text('created_at')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updateAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date())
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertEmailVerificationCode = typeof emailVerificationCodesTable.$inferInsert;
export type SelectEmailVerificationCode = typeof emailVerificationCodesTable.$inferSelect;

export type InsertSession = typeof sessionTable.$inferInsert;
export type SelectSession = typeof sessionTable.$inferSelect;

export type InsertScene = typeof scenesTable.$inferInsert;
export type SelectScene = typeof scenesTable.$inferSelect;
