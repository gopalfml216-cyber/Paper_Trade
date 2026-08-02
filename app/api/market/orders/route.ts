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

    const { symbol, side, quantity, orderType, limitPrice } = await request.json();

    // 1. Validation
    if (!symbol || !side || !quantity || !orderType) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be greater than zero." }, { status: 400 });
    }

    if (side !== "BUY" && side !== "SELL") {
      return NextResponse.json({ error: "Invalid trade side. Must be BUY or SELL." }, { status: 400 });
    }

    if (orderType !== "MARKET" && orderType !== "LIMIT") {
      return NextResponse.json({ error: "Invalid order type. Must be MARKET or LIMIT." }, { status: 400 });
    }

    if (orderType === "LIMIT" && (!limitPrice || limitPrice <= 0)) {
      return NextResponse.json({ error: "Valid limit price is required for LIMIT orders." }, { status: 400 });
    }

    // 2. Fetch stock and price cache
    const stock = await prisma.stockMaster.findUnique({
      where: { symbol },
      include: { price_cache: true },
    });

    if (!stock || !stock.price_cache) {
      return NextResponse.json({ error: `Stock ${symbol} or price cache not found.` }, { status: 404 });
    }

    const currentPrice = Number(stock.price_cache.last_price);
    const executionPrice = orderType === "MARKET" ? currentPrice : Number(limitPrice);
    const cost = executionPrice * quantity;
    const brokerage = Math.min(20.00, Number((cost * 0.0005).toFixed(2))); // 0.05% or flat ₹20

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const currentBalance = Number(dbUser.virtual_cash_balance);

    if (orderType === "MARKET") {
      // Execute MARKET order immediately
      if (side === "BUY") {
        const totalCost = cost + brokerage;
        if (currentBalance < totalCost) {
          return NextResponse.json({ error: `Insufficient cash balance. Required: ₹${totalCost.toLocaleString()}, Available: ₹${currentBalance.toLocaleString()}` }, { status: 400 });
        }

        // Execute in transaction
        const result = await prisma.$transaction(async (tx) => {
          // Decrement balance
          const updatedUser = await tx.user.update({
            where: { id: dbUser.id },
            data: {
              virtual_cash_balance: currentBalance - totalCost,
            },
          });

          // Create Order
          const order = await tx.order.create({
            data: {
              user_id: dbUser.id,
              symbol,
              side,
              order_type: orderType,
              quantity,
              limit_price: null,
              status: "EXECUTED",
            },
          });

          // Create Trade
          await tx.trade.create({
            data: {
              order_id: order.id,
              user_id: dbUser.id,
              symbol,
              side,
              quantity,
              price: executionPrice,
              brokerage_fee: brokerage,
            },
          });

          // Create Transaction
          await tx.transaction.create({
            data: {
              user_id: dbUser.id,
              type: "TRADE_BUY",
              amount: -totalCost,
              balance_after: currentBalance - totalCost,
              reference_id: order.id,
            },
          });

          // Update Holding
          const existingHolding = await tx.holding.findUnique({
            where: {
              user_id_symbol: {
                user_id: dbUser.id,
                symbol,
              },
            },
          });

          if (existingHolding) {
            const oldQty = existingHolding.quantity;
            const oldInvestedVal = Number(existingHolding.invested_value);
            const newQty = oldQty + quantity;
            const newInvestedVal = oldInvestedVal + cost;
            const newAvgPrice = newInvestedVal / newQty;

            await tx.holding.update({
              where: { id: existingHolding.id },
              data: {
                quantity: newQty,
                avg_price: newAvgPrice,
                invested_value: newInvestedVal,
              },
            });
          } else {
            await tx.holding.create({
              data: {
                user_id: dbUser.id,
                symbol,
                quantity,
                avg_price: executionPrice,
                invested_value: cost,
              },
            });
          }

          // Create Notification
          await tx.notification.create({
            data: {
              user_id: dbUser.id,
              type: "ORDER_EXECUTED",
              message: `Executed MARKET BUY: ${quantity} shares of ${symbol} at ₹${executionPrice.toFixed(2)}.`,
            },
          });

          return { updatedUser, order };
        });

        return NextResponse.json({
          success: true,
          message: "Market Buy executed successfully.",
          order: result.order,
          newBalance: Number(result.updatedUser.virtual_cash_balance),
        });
      } else {
        // SELL order
        const holding = await prisma.holding.findUnique({
          where: {
            user_id_symbol: {
              user_id: dbUser.id,
              symbol,
            },
          },
        });

        if (!holding || holding.quantity < quantity) {
          return NextResponse.json({ error: `Insufficient holdings. Owned: ${holding?.quantity || 0}, Attempting to sell: ${quantity}` }, { status: 400 });
        }

        const saleCredit = cost - brokerage;
        const purchaseCost = Number(holding.avg_price) * quantity;
        const realizedPnl = cost - purchaseCost - brokerage;

        const result = await prisma.$transaction(async (tx) => {
          // Increment balance
          const updatedUser = await tx.user.update({
            where: { id: dbUser.id },
            data: {
              virtual_cash_balance: currentBalance + saleCredit,
            },
          });

          // Create Order
          const order = await tx.order.create({
            data: {
              user_id: dbUser.id,
              symbol,
              side,
              order_type: orderType,
              quantity,
              limit_price: null,
              status: "EXECUTED",
            },
          });

          // Create Trade
          await tx.trade.create({
            data: {
              order_id: order.id,
              user_id: dbUser.id,
              symbol,
              side,
              quantity,
              price: executionPrice,
              brokerage_fee: brokerage,
              realized_pnl: realizedPnl,
            },
          });

          // Create Transaction
          await tx.transaction.create({
            data: {
              user_id: dbUser.id,
              type: "TRADE_SELL",
              amount: saleCredit,
              balance_after: currentBalance + saleCredit,
              reference_id: order.id,
            },
          });

          // Update/Delete Holding
          const newQty = holding.quantity - quantity;
          if (newQty === 0) {
            await tx.holding.delete({
              where: { id: holding.id },
            });
          } else {
            const newInvestedVal = newQty * Number(holding.avg_price);
            await tx.holding.update({
              where: { id: holding.id },
              data: {
                quantity: newQty,
                invested_value: newInvestedVal,
              },
            });
          }

          // Create Notification
          await tx.notification.create({
            data: {
              user_id: dbUser.id,
              type: "ORDER_EXECUTED",
              message: `Executed MARKET SELL: ${quantity} shares of ${symbol} at ₹${executionPrice.toFixed(2)}. PnL: ₹${realizedPnl.toFixed(2)}.`,
            },
          });

          return { updatedUser, order };
        });

        return NextResponse.json({
          success: true,
          message: "Market Sell executed successfully.",
          order: result.order,
          newBalance: Number(result.updatedUser.virtual_cash_balance),
        });
      }
    } else {
      // LIMIT order (Status = PENDING)
      if (side === "BUY") {
        const requiredBlockedFunds = cost + brokerage;
        if (currentBalance < requiredBlockedFunds) {
          return NextResponse.json({ error: `Insufficient cash balance to place limit buy. Required: ₹${requiredBlockedFunds.toLocaleString()}` }, { status: 400 });
        }
      } else {
        // LIMIT SELL: verify holding exists
        const holding = await prisma.holding.findUnique({
          where: {
            user_id_symbol: {
              user_id: dbUser.id,
              symbol,
            },
          },
        });

        if (!holding || holding.quantity < quantity) {
          return NextResponse.json({ error: `Insufficient holdings to place limit sell. Owned: ${holding?.quantity || 0}` }, { status: 400 });
        }
      }

      // Create pending order
      const order = await prisma.order.create({
        data: {
          user_id: dbUser.id,
          symbol,
          side,
          order_type: orderType,
          quantity,
          limit_price: limitPrice,
          status: "PENDING",
        },
      });

      // Notify
      await prisma.notification.create({
        data: {
          user_id: dbUser.id,
          type: "LIMIT_TRIGGER",
          message: `Placed LIMIT ${side}: ${quantity} shares of ${symbol} at ₹${executionPrice.toFixed(2)}. Status: PENDING`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Limit ${side} order placed.`,
        order,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process order." },
      { status: 500 }
    );
  }
}
