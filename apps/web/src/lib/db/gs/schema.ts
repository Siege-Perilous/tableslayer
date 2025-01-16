import { sql } from 'drizzle-orm';
import { check, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { v4 as uuidv4 } from 'uuid';

export const sceneTable = sqliteTable(
  'scene',
  {
    id: text('id')
      .primaryKey()
      .notNull()
      .$default(() => uuidv4()),
    name: text('name').notNull().default('New Scene'),
    order: integer('order').notNull().unique(),
    backgroundColor: text('backgroundColor').notNull().default('#0b0b0c'),
    displayPaddingX: integer('displayPaddingX').notNull().default(16),
    displayPaddingY: integer('displayPaddingY').notNull().default(16),
    displaySizeX: integer('displaySizeX').notNull().default(17.77),
    displaySizeY: integer('displaySizeY').notNull().default(10.0),
    displayResolutionX: integer('displayResolutionX').notNull().default(1920),
    displayResolutionY: integer('displayResolutionY').notNull().default(1080),
    fogOfWarUrl: text('fogOfWarUrl'),
    fogOfWarColor: text('fogOfWarColor').notNull().default('#000'),
    fogOfWarOpacity: real('fogOfWarOpacity').notNull().default(0.9),
    mapLocation: text('mapLocation'),
    mapRotation: integer('mapRotation').notNull().default(0),
    mapOffsetX: integer('mapOffsetX').notNull().default(0),
    mapOffsetY: integer('mapOffsetY').notNull().default(0),
    mapZoom: integer('mapZoom').notNull().default(1),
    gridType: integer('gridType').notNull().default(0),
    gridSpacing: integer('gridSpacing').notNull().default(1),
    gridOpacity: real('gridOpacity').notNull().default(0.8),
    gridLineColor: text('gridLineColor').notNull().default('#E6E6E6'),
    gridLineThickness: integer('gridLineThickness').notNull().default(1),
    gridShadowColor: text('gridShadowColor').notNull().default('#000000'),
    gridShadowSpread: integer('gridShadowSpread').notNull().default(2),
    gridShadowBlur: real('gridShadowBlur').notNull().default(0.5),
    gridShadowOpacity: real('gridShadowOpacity').notNull().default(0.4),
    sceneOffsetX: integer('sceneOffsetX').notNull().default(0),
    sceneOffsetY: integer('sceneOffsetY').notNull().default(0)
  },
  (table) => ({
    checkFogOfWarOpacityCheck: check(
      'protected_fog_of_war_opacity',
      sql`${table.fogOfWarOpacity} >= 0 AND ${table.fogOfWarOpacity} <= 1`
    ),
    checkGridOpacityCheck: check('protected_grid_opacity', sql`${table.gridOpacity} >= 0 AND ${table.gridOpacity} <= 1`)
  })
);

export const settingsTable = sqliteTable('settings', {
  id: text('id').primaryKey().notNull().default('settings'),
  activeSceneId: text('activeSceneId').references(() => sceneTable.id, { onDelete: 'set null' }),
  isPaused: integer('isPaused').notNull().default(0)
});

export type SelectScene = typeof sceneTable.$inferSelect;
