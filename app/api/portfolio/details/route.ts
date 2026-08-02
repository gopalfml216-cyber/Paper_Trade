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

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        holdings: {
          include: {
            stock: {
              include: {
                price_cache: true,
              },
            },
          },
        },
        watchlist: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    const watchlistSymbols = dbUser.watchlist.map((w) => w.symbol);

    return NextResponse.json({
      cashBalance: Number(dbUser.virtual_cash_balance),
      holdings: dbUser.holdings,
      watchlist: watchlistSymbols,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch portfolio details" },
      { status: 500 }
    );
  }
}
