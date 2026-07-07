import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: dbUser.id,
      email: dbUser.email,
      display_name: dbUser.display_name,
      role: dbUser.role,
      virtual_cash_balance: Number(dbUser.virtual_cash_balance),
      is_active: dbUser.is_active,
      created_at: dbUser.created_at.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load profile." }, { status: 500 });
  }
}
