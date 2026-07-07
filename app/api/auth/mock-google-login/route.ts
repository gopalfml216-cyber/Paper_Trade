import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, displayName } = await request.json();

    if (!email || !displayName) {
      return NextResponse.json({ error: "Missing email or display name." }, { status: 400 });
    }

    const emailKey = email.toLowerCase();

    // Query SQLite database: find or create Google OAuth profile
    let user = await prisma.user.findUnique({
      where: { email: emailKey },
    });

    if (!user) {
      // Create user and initial virtual balance in transaction
      user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: emailKey,
            password: null, // Google logins do not have local passwords
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
    }

    if (!user.is_active) {
      return NextResponse.json({ error: "Account de-activated." }, { status: 403 });
    }

    const profile = {
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      virtual_cash_balance: Number(user.virtual_cash_balance),
      is_active: user.is_active,
      created_at: user.created_at.toISOString(),
    };

    // Set cookie
    const response = NextResponse.json(profile);
    response.cookies.set("paper-trade-session", JSON.stringify(profile), {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Google login failed." }, { status: 500 });
  }
}
