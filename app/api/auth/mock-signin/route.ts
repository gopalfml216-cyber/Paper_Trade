import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const emailKey = email.toLowerCase();

    // Query SQLite database
    const user = await prisma.user.findUnique({
      where: { email: emailKey },
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: "Account has been deactivated." }, { status: 403 });
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

    // Set cookie response
    const response = NextResponse.json(profile);
    response.cookies.set("paper-trade-session", JSON.stringify(profile), {
      path: "/",
      maxAge: 86400,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Sign in failed." }, { status: 500 });
  }
}
