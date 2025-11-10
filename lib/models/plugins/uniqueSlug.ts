import type { Schema } from 'mongoose';
import { generateSlug } from '@/lib/utils';

interface UniqueSlugOptions {
  source?: string;
  slugField?: string;
}

export function applyUniqueSlug(schema: Schema, options: UniqueSlugOptions = {}) {
  const { source = 'title', slugField = 'slug' } = options;

  schema.pre('validate', async function () {
    const doc = this as typeof this & {
      [key: string]: unknown;
      isModified(path: string): boolean;
      constructor: typeof import('mongoose').Model<any>;
      _id?: unknown;
    };

    const sourceValue = doc[source];
    const hasSource = typeof sourceValue === 'string' && sourceValue.trim().length > 0;
    const rawSlug = typeof doc[slugField] === 'string' ? (doc[slugField] as string) : '';

    if (!hasSource && !rawSlug.trim()) {
      return;
    }

    const baseSlug = hasSource ? generateSlug(sourceValue as string) : generateSlug(rawSlug);
    const slugModified = doc.isModified(slugField);
    const sourceModified = hasSource && doc.isModified(source);

    let desiredSlug = rawSlug.trim();

    if (!desiredSlug) {
      desiredSlug = baseSlug;
    } else if (slugModified) {
      desiredSlug = generateSlug(desiredSlug);
    } else if (sourceModified) {
      desiredSlug = baseSlug;
    } else {
      desiredSlug = generateSlug(desiredSlug);
    }

    if (!desiredSlug) {
      desiredSlug = baseSlug;
    }

    const Model = doc.constructor;

    const buildFilter = (slug: string) => {
      const filter: Record<string, unknown> = { [slugField]: slug };
      if (doc._id) {
        filter._id = { $ne: doc._id };
      }
      return filter;
    };

    let slugToUse = desiredSlug;
    let suffix = 1;

    while (await Model.exists(buildFilter(slugToUse))) {
      slugToUse = `${desiredSlug}-${suffix++}`;
    }

    doc[slugField] = slugToUse;
  });
}
