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
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const items = await prisma.watchlist.findMany({
      where: { user_id: user.id },
      select: { symbol: true },
    });

    const symbols = items.map((i) => i.symbol);
    return NextResponse.json({ watchlist: symbols });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch watchlist." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const rawCookieHeader = cookieStore.toString();
    const user = await getServerUser(rawCookieHeader);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { symbol } = await request.json();

    if (!symbol) {
      return NextResponse.json({ error: "Missing stock symbol." }, { status: 400 });
    }

    // Verify stock exists
    const stock = await prisma.stockMaster.findUnique({
      where: { symbol },
    });

    if (!stock) {
      return NextResponse.json({ error: `Stock ${symbol} not found.` }, { status: 404 });
    }

    // Toggle watchlist status
    const existing = await prisma.watchlist.findUnique({
      where: {
        user_id_symbol: {
          user_id: user.id,
          symbol,
        },
      },
    });

    if (existing) {
      await prisma.watchlist.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ success: true, watched: false });
    } else {
      await prisma.watchlist.create({
        data: {
          user_id: user.id,
          symbol,
        },
      });
      return NextResponse.json({ success: true, watched: true });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to toggle watchlist." },
      { status: 500 }
    );
  }
}
