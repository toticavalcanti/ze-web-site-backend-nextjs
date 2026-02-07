import { z } from 'zod';

// Helper: accept empty string and transform to undefined
const optionalString = z
  .string()
  .optional()
  .nullable()
  .transform((val) => (val?.trim() ? val.trim() : undefined));

export const messageSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  city: optionalString,
  state: optionalString,
  message: optionalString,
  response: z.string().optional().nullable(),
  published: z.boolean().optional(),
  private: z.boolean().optional()
});

export type MessageInput = z.infer<typeof messageSchema>;
