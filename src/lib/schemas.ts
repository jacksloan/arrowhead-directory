import { z } from 'zod';

export const businessSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().nullable().optional(),
  phones: z.string().default(''),
  address: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  subcategories: z.string().default(''),
  services: z.string().default(''),
});

export type BusinessFormData = z.infer<typeof businessSchema>;
