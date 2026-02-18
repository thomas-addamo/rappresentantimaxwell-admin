import NextAuth, { type NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? ""
    })
  ],
  callbacks: {
    async signIn({ profile }) {
      const allowed = (process.env.ALLOWED_GITHUB_LOGIN || "").toLowerCase();
      const login = String((profile as any)?.login || "").toLowerCase();
      return !!allowed && login === allowed;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
