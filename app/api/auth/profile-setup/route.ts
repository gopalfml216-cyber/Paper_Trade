import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { id, email, displayName } = await request.json();

    if (!id || !email || !displayName) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    
    // Create profile inside transaction
    const profile = await prisma.$transaction(async (tx) => {
      // 1. Create user in users extension table
      const u = await tx.user.create({
        data: {
          id,
          email: email.toLowerCase(),
          display_name: displayName,
          virtual_cash_balance: 100000.00,
        },
      });

      // 2. Insert INITIAL_CREDIT transaction ledger entry
      await tx.transaction.create({
        data: {
          user_id: id,
          type: "INITIAL_CREDIT",
          amount: 100000.00,
          balance_after: 100000.00,
        },
      });

      return u;
    });

    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      role: profile.role,
      virtual_cash_balance: Number(profile.virtual_cash_balance),
      is_active: profile.is_active,
      created_at: profile.created_at.toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to setup profile." }, { status: 500 });
  }
}
