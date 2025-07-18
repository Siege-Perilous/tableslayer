import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod/v4';
import { protectedSlugs } from '../../constants';

// USERS
// USERS
// USERS

export const usersTable = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$default(() => uuidv4()),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  passwordHash: text('password_hash'),
  googleId: text('google_id').unique(),
  avatarFileId: integer('avatar_file_id')
    .references(() => filesTable.id, { onDelete: 'cascade' })
    .notNull()
    .default(1),
  favoriteParty: text('favorite_party').references(() => partyTable.id, { onDelete: 'set null' })
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

// Create base insert schema from drizzle
const baseInsertUserSchema = createInsertSchema(usersTable);

// Extend the insert schema with custom email validation
export const insertUserSchema = baseInsertUserSchema.extend({
  email: z.email()
});

export const selectUserSchema = createSelectSchema(usersTable);

// Create base update schema from drizzle
const baseUpdateUserSchema = createUpdateSchema(usersTable);

// Extend the update schema with custom email validation
export const updateUserSchema = baseUpdateUserSchema.extend({
  email: z.email().optional()
});

export const filesTable = sqliteTable('files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  location: text('location').unique().notNull()
});

// USER FILES
// USER FILES
// USER FILES

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
  (table) => [
    primaryKey({ name: 'id', columns: [table.userId, table.fileId] }),
    index('idx_user_files_user_id').on(table.userId),
    index('idx_user_files_file_id').on(table.fileId)
  ]
);

export type InsertUserFile = typeof userFilesTable.$inferInsert;
export type SelectUserFile = typeof userFilesTable.$inferSelect;
export const insertUserFileSchema = createInsertSchema(userFilesTable);
export const selectUserFileSchema = createSelectSchema(userFilesTable);
export const updateUserFileSchema = createUpdateSchema(userFilesTable);

// SESSIONS
// SESSIONS
// SESSIONS

export const sessionTable = sqliteTable(
  'session',
  {
    id: text('id')
      .primaryKey()
      .notNull()
      .$default(() => uuidv4()),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
  },
  (table) => [index('idx_session_user_id').on(table.userId)]
);

export type InsertSession = typeof sessionTable.$inferInsert;
export type SelectSession = typeof sessionTable.$inferSelect;
export const insertSessionSchema = createInsertSchema(sessionTable);
export const selectSessionSchema = createSelectSchema(sessionTable);
export const updateSessionSchema = createUpdateSchema(sessionTable);

// EMAIL VERIFICATION CODES
// EMAIL VERIFICATION CODES
// EMAIL VERIFICATION CODES

export const emailVerificationCodesTable = sqliteTable('email_verification_codes', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$default(() => uuidv4()),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now') + 60 * 15)`)
});

export type InsertEmailVerificationCode = typeof emailVerificationCodesTable.$inferInsert;
export type SelectEmailVerificationCode = typeof emailVerificationCodesTable.$inferSelect;
export const insertEmailVerificationCodeSchema = createInsertSchema(emailVerificationCodesTable);
export const selectEmailVerificationCodeSchema = createSelectSchema(emailVerificationCodesTable);
export const updateEmailVerificationCodeSchema = createUpdateSchema(emailVerificationCodesTable);

// RESET PASSWORD CODES
// RESET PASSWORD CODES
// RESET PASSWORD CODES

export const resetPasswordCodesTable = sqliteTable('reset_password_codes', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$default(() => uuidv4()),
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

export type InsertResetPasswordCode = typeof resetPasswordCodesTable.$inferInsert;
export type SelectResetPasswordCode = typeof resetPasswordCodesTable.$inferSelect;
export const insertResetPasswordCodeSchema = createInsertSchema(resetPasswordCodesTable);
export const selectResetPasswordCodeSchema = createSelectSchema(resetPasswordCodesTable);
export const updateResetPasswordCodeSchema = createUpdateSchema(resetPasswordCodesTable);

// PARTY
// PARTY
// PARTY
//
export const VALID_PARTY_PLANS = ['free', 'monthly', 'yearly', 'lifetime'] as const;

export const partyTable = sqliteTable(
  'party',
  {
    id: text('id')
      .primaryKey()
      .notNull()
      .$default(() => uuidv4()),
    name: text('name').notNull().unique(),
    slug: text('slug').notNull().unique(),
    avatarFileId: integer('avatar_file_id')
      .references(() => filesTable.id, { onDelete: 'cascade' })
      .notNull()
      .default(1),
    pauseScreenFileId: integer('pause_screen_file_id')
      .references(() => filesTable.id, { onDelete: 'cascade' })
      .notNull()
      .default(1),
    activeSceneId: text('active_scene_id'),
    gameSessionIsPaused: integer('is_paused', { mode: 'boolean' }).notNull().default(false),
    defaultTvSize: integer('tv_size').notNull().default(40),
    defaultGridType: integer('default_grid_type').notNull().default(0),
    defaultDisplaySizeX: real('default_display_size_x').notNull().default(17.77),
    defaultDisplaySizeY: real('default_display_size_y').notNull().default(10.0),
    defaultDisplayResolutionX: integer('default_resolution_x').notNull().default(1920),
    defaultDisplayResolutionY: integer('default_resolution_y').notNull().default(1080),
    defaultDisplayPaddingX: integer('default_display_padding_x').notNull().default(16),
    defaultDisplayPaddingY: integer('default_display_padding_y').notNull().default(16),
    defaultGridSpacing: integer('default_grid_spacing').notNull().default(1),
    defaultLineThickness: integer('default_line_thickness').notNull().default(1),
    planNextBillingDate: integer('plan_next_billing_date', { mode: 'timestamp' }),
    planExpirationDate: integer('plan_expiration_date', { mode: 'timestamp' }),
    planStatus: text('plan_status'),
    lemonSqueezyCustomerId: integer('lemon_squeezy_customer_id'),
    stripeCustomerId: text('stripe_customer_id'),
    plan: text('plan', { enum: VALID_PARTY_PLANS }).notNull().default('free')
  },
  (table) => [
    check(
      'protected_slug_check',
      sql.raw(`${table.slug.name} NOT IN (${protectedSlugs.map((slug) => `'${slug}'`).join(', ')})`)
    ),
    index('idx_party_slug').on(table.slug)
  ]
);

export type PartyPlan = (typeof VALID_PARTY_PLANS)[number];

export type InsertParty = typeof partyTable.$inferInsert;
export type SelectParty = typeof partyTable.$inferSelect;
export const selectPartySchema = createSelectSchema(partyTable);
export const insertPartySchema = createInsertSchema(partyTable);
export const updatePartySchema = createUpdateSchema(partyTable);

// PARTY MEMBERS
// PARTY MEMBERS
// PARTY MEMBERS
//
export const VALID_PARTY_ROLES = ['admin', 'editor', 'viewer'] as const;

export const partyMemberTable = sqliteTable(
  'party_member',
  {
    partyId: text('party_id')
      .notNull()
      .references(() => partyTable.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    role: text('role', { enum: VALID_PARTY_ROLES }).notNull()
  },
  (table) => [
    primaryKey({ name: 'id', columns: [table.partyId, table.userId] }),
    index('idx_party_member_party_id').on(table.partyId),
    index('idx_party_member_user_id').on(table.userId),
    index('idx_party_member_party_role').on(table.partyId, table.role)
  ]
);

export type PartyRole = (typeof VALID_PARTY_ROLES)[number];

export type InsertPartyMember = typeof partyMemberTable.$inferInsert;
export type SelectPartyMember = typeof partyMemberTable.$inferSelect;
export const insertPartyMemberSchema = createInsertSchema(partyMemberTable);
export const selectPartyMemberSchema = createSelectSchema(partyMemberTable);
export const updatePartyMemberSchema = createUpdateSchema(partyMemberTable);

// PARTY INVITES
// PARTY INVITES
// PARTY INVITES

export const partyInviteTable = sqliteTable(
  'party_invite',
  {
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
  },
  (table) => [
    index('idx_party_invite_party_id').on(table.partyId),
    index('idx_party_invite_email').on(table.email),
    index('idx_party_invite_code').on(table.code)
  ]
);

export type InsertPartyInvite = typeof partyInviteTable.$inferInsert;
export type SelectPartyInvite = typeof partyInviteTable.$inferSelect;
export const insertPartyInviteSchema = createInsertSchema(partyInviteTable);
export const selectPartyInviteSchema = createSelectSchema(partyInviteTable);
export const updatePartyInviteSchema = createUpdateSchema(partyInviteTable);

// GAME SESSION
// GAME SESSION
// GAME SESSION

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
    lastUpdated: integer('last_updated', { mode: 'timestamp' }).$defaultFn(() => new Date())
  },
  (table) => [
    uniqueIndex('unique_party_name').on(table.partyId, table.slug),
    index('idx_game_session_party_id').on(table.partyId),
    index('idx_game_session_last_updated').on(table.lastUpdated),
    index('idx_game_session_slug').on(table.slug)
  ]
);

export type SelectGameSession = typeof gameSessionTable.$inferSelect;
export type InsertGameSession = typeof gameSessionTable.$inferInsert;
export const insertGameSessionSchema = createInsertSchema(gameSessionTable);
export const selectGameSessionSchema = createSelectSchema(gameSessionTable);
export const updateGameSessionSchema = createUpdateSchema(gameSessionTable);

// SCENES
// SCENES
// SCENES

export const sceneTable = sqliteTable(
  'scene',
  {
    id: text('id')
      .primaryKey()
      .notNull()
      .$default(() => uuidv4()),
    gameSessionId: text('session_id')
      .references(() => gameSessionTable.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull().default('New Scene'),
    order: integer('order').notNull(),
    backgroundColor: text('background_color').notNull().default('#0b0b0c'),
    displayPaddingX: integer('display_padding_x').notNull().default(16),
    displayPaddingY: integer('display_padding_y').notNull().default(16),
    displaySizeX: real('display_size_x').notNull().default(17.77),
    displaySizeY: real('display_size_y').notNull().default(10.0),
    displayResolutionX: integer('display_resolution_x').notNull().default(1920),
    displayResolutionY: integer('display_resolution_y').notNull().default(1080),
    fogOfWarUrl: text('fog_of_war_url'),
    fogOfWarColor: text('fog_of_war_color').notNull().default('#000'),
    fogOfWarOpacity: real('fog_of_war_opacity').notNull().default(0.9),
    mapLocation: text('map_location'),
    mapThumbLocation: text('map_thumb_location'),
    mapRotation: real('map_rotation').notNull().default(0),
    mapOffsetX: real('map_offset_x').notNull().default(0),
    mapOffsetY: real('map_offset_y').notNull().default(0),
    mapZoom: real('map_zoom').notNull().default(1.0),
    gridType: integer('grid_type').notNull().default(0),
    gridSpacing: integer('grid_spacing').notNull().default(1),
    gridOpacity: real('grid_opacity').notNull().default(0.8),
    gridLineColor: text('grid_line_color').notNull().default('#E6E6E6'),
    gridLineThickness: integer('grid_line_thickness').notNull().default(1),
    gridShadowColor: text('grid_shadow_color').notNull().default('#000000'),
    gridShadowSpread: integer('grid_shadow_spread').notNull().default(2),
    gridShadowBlur: real('grid_shadow_blur').notNull().default(0.5),
    gridShadowOpacity: real('grid_shadow_opacity').notNull().default(0.4),
    sceneOffsetX: real('scene_offset_x').notNull().default(0),
    sceneOffsetY: real('scene_offset_y').notNull().default(0),
    sceneRotation: real('scene_rotation').notNull().default(0),
    weatherFov: integer('weather_fov').notNull().default(60),
    weatherIntensity: real('weather_intensity').notNull().default(1),
    weatherOpacity: real('weather_opacity').notNull().default(1.0),
    weatherType: integer('weather_type').notNull().default(0),
    fogEnabled: integer('fog_enabled', { mode: 'boolean' }).notNull().default(false),
    fogColor: text('fog_color').notNull().default('#a0a0a0'),
    fogOpacity: real('fog_opacity').notNull().default(0.8),
    edgeEnabled: integer('edge_enabled', { mode: 'boolean' }).notNull().default(false),
    edgeUrl: text('edge_url'),
    edgeOpacity: real('edge_opacity').notNull().default(0.3),
    edgeScale: real('edge_scale').notNull().default(2.0),
    edgeFadeStart: real('edge_fade_start').notNull().default(0.2),
    edgeFadeEnd: real('edge_fade_end').notNull().default(1.0),
    effectsEnabled: integer('effects_enabled', { mode: 'boolean' }).notNull().default(true),
    effectsBloomIntensity: real('effects_bloom_intensity').notNull().default(0),
    effectsBloomThreshold: real('effects_bloom_threshold').notNull().default(0.5),
    effectsBloomSmoothing: real('effects_bloom_smoothing').notNull().default(0.3),
    effectsBloomRadius: real('effects_bloom_radius').notNull().default(0.5),
    effectsBloomLevels: integer('effects_bloom_levels').notNull().default(10),
    effectsBloomMipMapBlur: integer('effects_bloom_mip_map_blur', { mode: 'boolean' }).notNull().default(true),
    effectsChromaticAberrationOffset: real('effects_chromatic_aberration_intensity').notNull().default(0),
    effectsLutUrl: text('effects_lut_url'),
    effectsToneMappingMode: integer('effects_tone_mapping_mode').notNull().default(0),
    lastUpdated: integer('last_updated', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    markerStrokeColor: text('marker_stroke_color').notNull().default('#000000'),
    markerStrokeWidth: integer('marker_stroke_width').notNull().default(50),
    markerTextColor: text('marker_text_color').notNull().default('#ffffff'),
    markerTextStrokeColor: text('marker_text_stroke_color').notNull().default('#000000'),
    annotationLayers: text('annotation_layers', { mode: 'json' })
  },
  (table) => [
    uniqueIndex('unique_session_scene_order').on(table.gameSessionId, table.order),
    check('protected_fog_of_war_opacity', sql`${table.fogOfWarOpacity} >= 0 AND ${table.fogOfWarOpacity} <= 1`),
    check('protected_grid_opacity', sql`${table.gridOpacity} >= 0 AND ${table.gridOpacity} <= 1`),
    check('protected_weather_intensity', sql`${table.weatherIntensity} >= 0 AND ${table.weatherIntensity} <= 1`),
    check('protected_weather_opacity', sql`${table.weatherOpacity} >= 0 AND ${table.weatherOpacity} <= 1`),
    check('protected_fog_opacity', sql`${table.fogOpacity} >= 0 AND ${table.fogOpacity} <= 1`),
    check('protected_edge_opacity', sql`${table.edgeOpacity} >= 0 AND ${table.edgeOpacity} <= 1`),
    check('protected_edge_fade_start', sql`${table.edgeFadeStart} >= 0 AND ${table.edgeFadeStart} <= 1`),
    check('protected_edge_fade_end', sql`${table.edgeFadeEnd} >= 0 AND ${table.edgeFadeEnd} <= 1`),
    index('idx_scene_order').on(table.order),
    index('idx_scene_game_session_id').on(table.gameSessionId)
  ]
);

export type InsertScene = typeof sceneTable.$inferInsert;
export type SelectScene = typeof sceneTable.$inferSelect;
export const selectSceneSchema = createSelectSchema(sceneTable);
export const insertSceneSchema = createInsertSchema(sceneTable);
export const updateSceneSchema = createUpdateSchema(sceneTable);

// MARKERS
// MARKERS
// MARKERS

export const markerTable = sqliteTable(
  'marker',
  {
    id: text('id')
      .primaryKey()
      .notNull()
      .$default(() => uuidv4()),
    sceneId: text('scene_id')
      .notNull()
      .references(() => sceneTable.id, { onDelete: 'cascade' }),
    visibility: integer('visibility').notNull().default(1),
    title: text('title').notNull().default('New token'),
    label: text('label'),
    imageLocation: text('image_location'),
    imageScale: real('image_scale').notNull().default(1.0),
    positionX: real('position_x').notNull().default(0),
    positionY: real('position_y').notNull().default(0),
    shape: integer('shape').notNull().default(1),
    shapeColor: text('shape_color').notNull().default('#ffffff'),
    size: integer('size').notNull().default(1),
    note: text('note', { mode: 'json' })
  },
  (table) => [
    index('idx_marker_scene_id').on(table.sceneId),
    check('protected_marker_visibility', sql`${table.visibility} >= 0 AND ${table.visibility} <= 2`),
    check('protected_marker_shape', sql`${table.shape} >= 0 AND ${table.shape} <= 3`),
    check('protected_marker_size', sql`${table.size} >= 1 AND ${table.size} <= 3`)
  ]
);

export type InsertMarker = typeof markerTable.$inferInsert;
export type SelectMarker = typeof markerTable.$inferSelect;
export const insertMarkerSchema = createInsertSchema(markerTable);
export const selectMarkerSchema = createSelectSchema(markerTable);
export const updateMarkerSchema = createUpdateSchema(markerTable);

// ANNOTATIONS
// ANNOTATIONS
// ANNOTATIONS

export const annotationsTable = sqliteTable(
  'annotations',
  {
    id: text('id')
      .primaryKey()
      .notNull()
      .$default(() => uuidv4()),
    sceneId: text('scene_id')
      .notNull()
      .references(() => sceneTable.id, { onDelete: 'cascade' }),
    name: text('name').notNull().default('New Annotation'),
    opacity: real('opacity').notNull().default(1.0),
    color: text('color').notNull().default('#FF0000'),
    url: text('url'), // S3/R2 storage for the drawn texture
    visibility: integer('visibility').notNull().default(1), // StageMode enum (0=DM, 1=Player)
    order: integer('order').notNull().default(0) // For layer ordering
  },
  (table) => [
    index('idx_annotations_scene_id').on(table.sceneId),
    index('idx_annotations_order').on(table.sceneId, table.order),
    check('protected_annotation_opacity', sql`${table.opacity} >= 0 AND ${table.opacity} <= 1`),
    check('protected_annotation_visibility', sql`${table.visibility} >= 0 AND ${table.visibility} <= 1`)
  ]
);

export type InsertAnnotation = typeof annotationsTable.$inferInsert;
export type SelectAnnotation = typeof annotationsTable.$inferSelect;
export const insertAnnotationSchema = createInsertSchema(annotationsTable);
export const selectAnnotationSchema = createSelectSchema(annotationsTable);
export const updateAnnotationSchema = createUpdateSchema(annotationsTable);
