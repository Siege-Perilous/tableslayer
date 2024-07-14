import { sql } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { alphabet, generateRandomString } from 'oslo/crypto';
import { v4 as uuidv4 } from 'uuid';

export const usersTable = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$default(() => uuidv4()),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  passwordHash: text('password_hash').notNull(),
  avatar: text('avatar').notNull().default('zinnoreedvg0jvsdgvxa')
});

export const sessionTable = sqliteTable('session', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$default(() => uuidv4()),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull()
});

export const emailVerificationCodesTable = sqliteTable('email_verification_codes', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$default(() => uuidv4()),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  code: text('code')
    .notNull()
    .$default(() => generateRandomString(6, alphabet('0-9', 'A-Z'))),
  expiresAt: integer('expires_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now') + 60 * 15)`)
});

export const partyTable = sqliteTable('party', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$default(() => uuidv4()),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  avatar: text('avatar').notNull().default('gwda4udjrsacbec6fsca')
});

export const partyMemberTable = sqliteTable(
  'party_member',
  {
    partyId: text('party_id')
      .notNull()
      .references(() => partyTable.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['admin', 'editor', 'viewer'] }).notNull()
  },
  (table) => {
    return {
      id: primaryKey({ columns: [table.partyId, table.userId] })
    };
  }
);

export const partyInviteTable = sqliteTable('party_invite', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$default(() => uuidv4()),
  partyId: text('party_id')
    .notNull()
    .references(() => partyTable.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role', { enum: ['owner', 'editor', 'viewer'] }).notNull()
});

// Generate Zod schemas
export const insertUserSchema = createInsertSchema(usersTable);
export const selectUserSchema = createSelectSchema(usersTable);

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertParty = typeof partyTable.$inferInsert;
export type SelectParty = typeof partyTable.$inferSelect;
