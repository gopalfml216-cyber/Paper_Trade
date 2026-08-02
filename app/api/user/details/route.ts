import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerUser } from "@/lib/supabase/authServer";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const rawCookieHeader = cookieStore.toString();
    const user = await getServerUser(rawCookieHeader);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch fresh user data from SQLite
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        holdings: true,
        watchlist: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found in database." }, { status: 404 });
    }

    // Map holdings: symbol -> quantity
    const holdingsMap: Record<string, number> = {};
    for (const h of dbUser.holdings) {
      holdingsMap[h.symbol] = h.quantity;
    }

    // Map watchlist: symbol[]
    const watchlistSymbols = dbUser.watchlist.map((w) => w.symbol);

    return NextResponse.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        display_name: dbUser.display_name,
        role: dbUser.role,
        virtual_cash_balance: Number(dbUser.virtual_cash_balance),
      },
      holdings: holdingsMap,
      watchlist: watchlistSymbols,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch user details" },
      { status: 500 }
    );
  }
}
