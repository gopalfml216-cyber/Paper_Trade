import { createClient as createServerClient } from "./server";
import prisma from "../prisma";
import type { UserProfile } from "./authClient";

const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
const MOCK_COOKIE_NAME = "paper-trade-session";

function parseCookie(cookieStr: string, name: string): string | null {
  const matches = cookieStr.match(new RegExp(`(?:^|; )${name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1')}=([^;]*)`));
  return matches ? decodeURIComponent(matches[1]) : null;
}

export async function getServerUser(cookieHeader?: string): Promise<UserProfile | null> {
  if (isMock) {
    if (!cookieHeader) return null;
    const rawCookie = parseCookie(cookieHeader, MOCK_COOKIE_NAME);
    if (!rawCookie) return null;
    try {
      const parsed = JSON.parse(rawCookie) as UserProfile;
      const dbUser = await prisma.user.findUnique({
        where: { id: parsed.id }
      });
      if (!dbUser) return null;
      return {
        id: dbUser.id,
        email: dbUser.email,
        display_name: dbUser.display_name,
        role: dbUser.role,
        virtual_cash_balance: Number(dbUser.virtual_cash_balance),
        is_active: dbUser.is_active,
        created_at: dbUser.created_at.toISOString(),
      };
    } catch {
      return null;
    }
  } else {
    try {
      const supabase = await createServerClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      // Fetch profile extension
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      if (!dbUser) return null;

      return {
        id: dbUser.id,
        email: dbUser.email,
        display_name: dbUser.display_name,
        role: dbUser.role,
        virtual_cash_balance: Number(dbUser.virtual_cash_balance),
        is_active: dbUser.is_active,
        created_at: dbUser.created_at.toISOString(),
      };
    } catch {
      return null;
    }
  }
}
