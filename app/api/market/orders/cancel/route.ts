import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerUser } from "@/lib/supabase/authServer";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const rawCookieHeader = cookieStore.toString();
    const user = await getServerUser(rawCookieHeader);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized access to order." }, { status: 403 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json({ error: `Cannot cancel order with status ${order.status}.` }, { status: 400 });
    }

    // Cancel order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
      },
    });

    // Notify
    await prisma.notification.create({
      data: {
        user_id: user.id,
        type: "SYSTEM",
        message: `Cancelled pending LIMIT ${order.side} order for ${order.quantity} shares of ${order.symbol}.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully.",
      order: updatedOrder,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to cancel order." },
      { status: 500 }
    );
  }
}
