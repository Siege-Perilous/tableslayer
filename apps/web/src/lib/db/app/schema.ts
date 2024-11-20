import { sql } from 'drizzle-orm';
import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
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
  avatarFileId: integer('avatar_file_id')
    .references(() => filesTable.id, { onDelete: 'set default' })
    .notNull()
    .default(1)
});

export const filesTable = sqliteTable('files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  location: text('location').unique().notNull()
});

export const userFilesTable = sqliteTable(
  'user_files',
  {
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    fileId: integer('file_id')
      .notNull()
      .references(() => filesTable.id, { onDelete: 'cascade' })
  },
  (table) => ({
    id: primaryKey({ columns: [table.userId, table.fileId] })
  })
);

export const sessionTable = sqliteTable('session', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$default(() => uuidv4()),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

export const emailVerificationCodesTable = sqliteTable('email_verification_codes', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now') + 60 * 15)`)
});

export const resetPasswordCodesTable = sqliteTable('reset_password_codes', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  code: text('code').notNull(),
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
  avatarFileId: integer('avatar_file_id')
    .references(() => filesTable.id, { onDelete: 'set default' })
    .default(1)
  // Neat way to computer  slug: text('slug').notNull().unique().generatedAlwaysAs((): SQL => sql`lower(replace(${partyTable.name}, ' ', '-'))`),
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

export const VALID_PARTY_ROLES = ['admin', 'editor', 'viewer'] as const;
export type PartyRole = (typeof VALID_PARTY_ROLES)[number];

export const partyInviteTable = sqliteTable('party_invite', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$default(() => uuidv4()),
  partyId: text('party_id')
    .notNull()
    .references(() => partyTable.id, { onDelete: 'cascade' }),
  invitedBy: text('invited_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  email: text('email').notNull(),
  role: text('role', { enum: VALID_PARTY_ROLES }).notNull()
});

export const gameSessionTable = sqliteTable(
  'game_session',
  {
    id: text('id')
      .primaryKey()
      .notNull()
      .$default(() => uuidv4()),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    partyId: text('party_id')
      .notNull()
      .references(() => partyTable.id, { onDelete: 'cascade' }),
    dbName: text('db_name').unique().notNull()
  },
  (table) => ({
    uniqueNameWithinParty: uniqueIndex('unique_party_name').on(table.partyId, table.slug)
  })
);

// Generate Zod schemas
export const insertUserSchema = createInsertSchema(usersTable);
export const selectUserSchema = createSelectSchema(usersTable);
export const insertPartyMember = createInsertSchema(partyMemberTable);
export const gameSessionSchema = createInsertSchema(gameSessionTable);

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
export type InsertPartyMember = typeof partyMemberTable.$inferInsert;
export type SelectGameSession = typeof gameSessionTable.$inferSelect;
export type SelectSession = typeof sessionTable.$inferSelect;

export type InsertParty = typeof partyTable.$inferInsert;
export type SelectParty = typeof partyTable.$inferSelect;
export type SelectPartyInvite = typeof partyInviteTable.$inferSelect;
