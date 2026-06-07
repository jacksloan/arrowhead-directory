import { z } from 'zod';

export const businessSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().nullable().optional(),
  phone_1: z.string().default(''),
  phone_1_type: z.string().default(''),
  phone_2: z.string().default(''),
  phone_2_type: z.string().default(''),
  address: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  categories: z.string().min(1, 'At least one category is required'),
  services: z.string().default(''),
});

export type BusinessFormData = z.infer<typeof businessSchema>;
