import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { v4 as uuidv4 } from 'uuid';

export const sceneTable = sqliteTable('scene', {
  id: text('id')
    .primaryKey()
    .notNull()
    .$default(() => uuidv4()),
  name: text('name').notNull().default('New Scene'),
  mapBlob: text('map_blob', { mode: 'json' }),
  order: integer('order').notNull()
});

export const SelectScene = typeof sceneTable.$inferSelect;
export const InsertScene = typeof sceneTable.$inferInsert;
