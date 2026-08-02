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

    const orders = await prisma.order.findMany({
      where: { user_id: user.id },
      include: {
        stock: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch orders." },
      { status: 500 }
    );
  }
}
