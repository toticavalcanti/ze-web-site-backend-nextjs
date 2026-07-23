import type { NextAuthConfig } from 'next-auth';

/**
 * Configuração compartilhada do NextAuth, segura para o Edge Runtime.
 * O middleware roda no Edge, que não suporta mongoose nem bcrypt, então esta
 * config não importa nada de banco. O provider Credentials fica em lib/auth.ts.
 */
export const authConfig = {
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 30
  },
  pages: {
    signIn: '/auth/login'
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as Record<string, unknown>).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || '';
        session.user.role = (token.role as 'admin' | 'super_admin' | undefined) ?? 'admin';
      }
      return session;
    }
  }
} satisfies NextAuthConfig;
