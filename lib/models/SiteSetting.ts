import { models, model, Schema, Types, type InferSchemaType } from 'mongoose';

/**
 * Configurações do site editáveis pelo admin (singleton key-value).
 *
 * Chaves usadas atualmente:
 *   home_background          → { url: string, mediaId?: string }
 *   messages_post_background → { url: string, mediaId?: string }
 *   biography_pt             → { writtenBy: string, blocks: BiographyBlock[] }
 *   biography_en             → { writtenBy: string, blocks: BiographyBlock[] }
 *
 * BiographyBlock:
 *   { type: 'heading',   text: string }
 *   { type: 'paragraph', text: string }
 *   { type: 'image', title: string, url: string, alt: string, caption: string, width: number, height: number }
 */
const SiteSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true, trim: true },
    value: { type: Schema.Types.Mixed, default: null },
    updated_by: { type: Types.ObjectId, ref: 'Admin' }
  },
  { timestamps: true }
);

export type SiteSetting = InferSchemaType<typeof SiteSettingSchema>;

export const SITE_SETTING_KEYS = [
  'home_background',
  'messages_post_background',
  'biography_pt',
  'biography_en'
] as const;

export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number];

export function isSiteSettingKey(key: string): key is SiteSettingKey {
  return (SITE_SETTING_KEYS as readonly string[]).includes(key);
}

export default models.SiteSetting || model('SiteSetting', SiteSettingSchema);
