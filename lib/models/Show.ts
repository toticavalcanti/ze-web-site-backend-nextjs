import { models, model, Schema, Types, type InferSchemaType } from 'mongoose';
import { applyUniqueSlug } from '@/lib/models/plugins/uniqueSlug';
import { applyStatusFields } from '@/lib/models/plugins/status';

const ShowSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, index: true },
    date: { type: Date, required: true },
    time: String,
    venue: { type: String, required: true },
    city: { type: String, required: true },
    state: String,
    country: String,
    address: String,
    ticket_url: String,
    description: String,
    // Campos legados do Strapi v3 — mantidos no schema para que documentos
    // antigos não percam dados e para o mapeamento abaixo funcionar.
    cidade: String,
    estado: String,
    local: String,
    url: String,
    banner: [{ type: Types.ObjectId, ref: 'UploadFile' }],
    cover: { type: Types.ObjectId, ref: 'UploadFile' },
    showStatus: {
      type: String,
      enum: ['scheduled', 'realizado', 'cancelado'],
      default: 'scheduled'
    },
    published_at: { type: Date, default: null },
    created_by: { type: Types.ObjectId, ref: 'Admin' },
    updated_by: { type: Types.ObjectId, ref: 'Admin' }
  },
  { timestamps: true }
);

/**
 * Compatibilidade com documentos criados pelo Strapi v3, cujo schema usava
 * cidade/estado/local e não tinha title. Sem isso, editar um show legado no
 * admin falharia na validação (title/venue/city required).
 */
ShowSchema.pre('validate', function (next) {
  if (!this.city && this.cidade) this.city = this.cidade;
  if (!this.state && this.estado) this.state = this.estado;
  if (!this.venue && this.local) this.venue = this.local;
  if (!this.ticket_url && this.url) this.ticket_url = this.url;
  if (!this.venue && this.city) this.venue = this.city;
  if (!this.title) {
    const parts = [this.city, this.venue && this.venue !== this.city ? this.venue : null].filter(Boolean);
    this.title = parts.join(' – ') || 'Show';
  }
  next();
});

applyStatusFields(ShowSchema);
applyUniqueSlug(ShowSchema);

ShowSchema.index({ title: 'text', venue: 'text', city: 'text', state: 'text', country: 'text' });

export type Show = InferSchemaType<typeof ShowSchema>;

export default models.Show || model('Show', ShowSchema);
