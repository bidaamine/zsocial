import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  ageGroup: z.enum(['child', 'teen', 'adult', 'senior'])
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;
