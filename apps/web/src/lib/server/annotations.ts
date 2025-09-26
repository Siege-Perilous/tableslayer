import { db } from '$lib/db/app';
import { annotationsTable, type InsertAnnotation, type SelectAnnotation } from '$lib/db/app/schema';
import { devError } from '$lib/utils/debug';
import { eq } from 'drizzle-orm';

/**
 * Get all annotations for a scene
 */
export const getAnnotationsForScene = async (sceneId: string): Promise<SelectAnnotation[]> => {
  try {
    const annotations = await db
      .select()
      .from(annotationsTable)
      .where(eq(annotationsTable.sceneId, sceneId))
      .orderBy(annotationsTable.order);

    // Remove mask field from each annotation to avoid serialization issues
    for (const annotation of annotations) {
      if ('mask' in annotation) {
        delete (annotation as Record<string, unknown>).mask;
      }
    }

    return annotations;
  } catch (error) {
    devError('annotations', 'Error fetching annotations for scene:', error);
    return [];
  }
};

/**
 * Get mask data for a specific annotation
 */
export const getAnnotationMaskData = async (annotationId: string): Promise<{ mask: string | null } | null> => {
  try {
    const result = await db
      .select({ mask: annotationsTable.mask })
      .from(annotationsTable)
      .where(eq(annotationsTable.id, annotationId))
      .get();

    return result || null;
  } catch (error) {
    devError('annotations', 'Error fetching annotation mask:', error);
    return null;
  }
};

/**
 * Create or update an annotation
 */
export const upsertAnnotation = async (annotation: InsertAnnotation): Promise<SelectAnnotation | null> => {
  try {
    const [result] = await db
      .insert(annotationsTable)
      .values(annotation)
      .onConflictDoUpdate({
        target: annotationsTable.id,
        set: {
          name: annotation.name,
          opacity: annotation.opacity,
          color: annotation.color,
          url: annotation.url,
          mask: annotation.mask,
          visibility: annotation.visibility,
          order: annotation.order
        }
      })
      .returning();

    // Remove mask field to avoid serialization issues
    if ('mask' in result) {
      delete (result as Record<string, unknown>).mask;
    }

    return result;
  } catch (error) {
    devError('annotations', 'Error upserting annotation:', error);
    return null;
  }
};

/**
 * Delete an annotation
 */
export const deleteAnnotation = async (annotationId: string): Promise<boolean> => {
  try {
    const result = await db.delete(annotationsTable).where(eq(annotationsTable.id, annotationId));

    return result.rowsAffected > 0;
  } catch (error) {
    devError('annotations', 'Error deleting annotation:', error);
    return false;
  }
};

/**
 * Update annotation order for multiple annotations
 */
export const updateAnnotationOrders = async (updates: Array<{ id: string; order: number }>): Promise<boolean> => {
  try {
    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx.update(annotationsTable).set({ order: update.order }).where(eq(annotationsTable.id, update.id));
      }
    });

    return true;
  } catch (error) {
    devError('annotations', 'Error updating annotation orders:', error);
    return false;
  }
};
