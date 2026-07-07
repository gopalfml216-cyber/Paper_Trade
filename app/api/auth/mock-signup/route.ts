import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, password, displayName } = await request.json();

    if (!email || !password || !displayName) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const emailKey = email.toLowerCase();

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: emailKey },
    });

    if (existing) {
      return NextResponse.json({ error: "Email already registered." }, { status: 400 });
    }

    // Create user and initial transaction in SQLite
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: emailKey,
          password, // Store password (simple plaintext or hash for mock dev database)
          display_name: displayName,
          virtual_cash_balance: 100000.00,
        },
      });

      await tx.transaction.create({
        data: {
          user_id: u.id,
          type: "INITIAL_CREDIT",
          amount: 100000.00,
          balance_after: 100000.00,
        },
      });

      return u;
    });

    const profile = {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      virtual_cash_balance: Number(user.virtual_cash_balance),
      is_active: user.is_active,
      created_at: user.created_at.toISOString(),
    };

    // Set cookie response
    const response = NextResponse.json(profile);
    response.cookies.set("paper-trade-session", JSON.stringify(profile), {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Sign up failed." }, { status: 500 });
  }
}
