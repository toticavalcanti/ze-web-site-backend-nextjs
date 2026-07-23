import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { connectMongo } from '@/lib/mongodb';
import AdminModel from '@/lib/models/Admin';
import { authConfig } from '@/lib/auth.config';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const { handlers: authHandlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        await connectMongo();
        const admin = await AdminModel.findOne({ email }).select('+password');
        if (!admin) {
          return null;
        }

        const isValid = await bcrypt.compare(password, admin.password);
        if (!isValid) {
          return null;
        }

        if (!admin.approved) {
          throw new Error('Sua conta aguarda aprovação do administrador');
        }

        return {
          id: admin._id.toString(),
          name: admin.name,
          email: admin.email,
          role: admin.role
        };
      }
    })
  ]
});
