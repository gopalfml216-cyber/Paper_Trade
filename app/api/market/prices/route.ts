import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

// Global in-memory cache to throttle simulation updates
let lastSimulationTime = 0;
const SIMULATION_THROTTLE_MS = 1500; // Throttle to max once per 1.5s

export async function GET() {
  try {
    const now = Date.now();
    const shouldSimulate = now - lastSimulationTime >= SIMULATION_THROTTLE_MS;

    if (shouldSimulate) {
      lastSimulationTime = now;

      // 1. Fetch all stock price caches
      const caches = await prisma.priceCache.findMany();
      const nseSymbols = caches.map((c) => `${c.symbol.toUpperCase()}.NS`);

      try {
        // 2. Query Yahoo Finance in a single batch
        const quotes = (await yahooFinance.quote(nseSymbols)) as any[];

        // 3. Map quotes back to their database symbols and update
        await prisma.$transaction(
          quotes.map((q) => {
            const originalSymbol = q.symbol.replace(".NS", "").toUpperCase();
            
            const lastPrice = Number(q.regularMarketPrice ?? 0);
            const prevClose = Number(q.regularMarketPreviousClose ?? lastPrice);
            const dayChange = Number(q.regularMarketChange ?? (lastPrice - prevClose));
            const dayChangePct = Number(q.regularMarketChangePercent ?? ((dayChange / prevClose) * 100));
            const dayOpen = Number(q.regularMarketOpen ?? lastPrice);
            const dayHigh = Number(q.regularMarketDayHigh ?? lastPrice);
            const dayLow = Number(q.regularMarketDayLow ?? lastPrice);

            return prisma.priceCache.update({
              where: { symbol: originalSymbol },
              data: {
                last_price: lastPrice,
                day_change: dayChange,
                day_change_pct: dayChangePct,
                day_open: dayOpen,
                day_high: dayHigh,
                day_low: dayLow,
                prev_close: prevClose,
              },
            });
          })
        );
      } catch (quoteErr) {
        console.error("Failed to update price caches from Yahoo Finance, using database cached prices:", quoteErr);
      }

      // 3. Process Pending Limit Orders
      await triggerPendingOrders();
    }

    // Return the latest cache
    const updatedCaches = await prisma.priceCache.findMany({
      orderBy: { symbol: "asc" }
    });

    return NextResponse.json({ prices: updatedCaches });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update/fetch prices" },
      { status: 500 }
    );
  }
}

async function triggerPendingOrders() {
  try {
    const pendingOrders = await prisma.order.findMany({
      where: { status: "PENDING" },
    });

    if (pendingOrders.length === 0) return;

    // Fetch updated prices
    const pricesList = await prisma.priceCache.findMany();
    const pricesMap = new Map<string, number>();
    for (const p of pricesList) {
      pricesMap.set(p.symbol, Number(p.last_price));
    }

    for (const order of pendingOrders) {
      const currentPrice = pricesMap.get(order.symbol);
      if (!currentPrice) continue;

      const limitPrice = Number(order.limit_price);
      const isBuyTriggered = order.side === "BUY" && currentPrice <= limitPrice;
      const isSellTriggered = order.side === "SELL" && currentPrice >= limitPrice;

      if (isBuyTriggered || isSellTriggered) {
        // Run execution for this order
        await prisma.$transaction(async (tx) => {
          // Re-fetch user
          const user = await tx.user.findUnique({
            where: { id: order.user_id },
          });
          if (!user) return;

          const cash = Number(user.virtual_cash_balance);
          const cost = currentPrice * order.quantity;
          const brokerage = Math.min(20.00, Number((cost * 0.0005).toFixed(2)));

          if (order.side === "BUY") {
            const totalCost = cost + brokerage;
            if (cash < totalCost) {
              // Reject order
              await tx.order.update({
                where: { id: order.id },
                data: {
                  status: "REJECTED",
                  rejection_reason: "Insufficient funds at execution time.",
                },
              });
              await tx.notification.create({
                data: {
                  user_id: user.id,
                  type: "SYSTEM",
                  message: `LIMIT BUY for ${order.quantity} shares of ${order.symbol} REJECTED due to insufficient cash.`,
                },
              });
              return;
            }

            // Execute BUY
            await tx.user.update({
              where: { id: user.id },
              data: { virtual_cash_balance: cash - totalCost },
            });

            await tx.order.update({
              where: { id: order.id },
              data: { status: "EXECUTED" },
            });

            await tx.trade.create({
              data: {
                order_id: order.id,
                user_id: user.id,
                symbol: order.symbol,
                side: "BUY",
                quantity: order.quantity,
                price: currentPrice,
                brokerage_fee: brokerage,
              },
            });

            await tx.transaction.create({
              data: {
                user_id: user.id,
                type: "TRADE_BUY",
                amount: -totalCost,
                balance_after: cash - totalCost,
                reference_id: order.id,
              },
            });

            // Update Holdings
            const holding = await tx.holding.findUnique({
              where: { user_id_symbol: { user_id: user.id, symbol: order.symbol } },
            });

            if (holding) {
              const oldQty = holding.quantity;
              const oldInvestedVal = Number(holding.invested_value);
              const newQty = oldQty + order.quantity;
              const newInvestedVal = oldInvestedVal + cost;
              const newAvgPrice = newInvestedVal / newQty;

              await tx.holding.update({
                where: { id: holding.id },
                data: {
                  quantity: newQty,
                  avg_price: newAvgPrice,
                  invested_value: newInvestedVal,
                },
              });
            } else {
              await tx.holding.create({
                data: {
                  user_id: user.id,
                  symbol: order.symbol,
                  quantity: order.quantity,
                  avg_price: currentPrice,
                  invested_value: cost,
                },
              });
            }

            await tx.notification.create({
              data: {
                user_id: user.id,
                type: "ORDER_EXECUTED",
                message: `LIMIT BUY Executed: ${order.quantity} shares of ${order.symbol} at ₹${currentPrice.toFixed(2)}. Limit Price: ₹${limitPrice.toFixed(2)}.`,
              },
            });
          } else {
            // Execute SELL
            const holding = await tx.holding.findUnique({
              where: { user_id_symbol: { user_id: user.id, symbol: order.symbol } },
            });

            if (!holding || holding.quantity < order.quantity) {
              // Reject order
              await tx.order.update({
                where: { id: order.id },
                data: {
                  status: "REJECTED",
                  rejection_reason: "Insufficient holdings at execution time.",
                },
              });
              await tx.notification.create({
                data: {
                  user_id: user.id,
                  type: "SYSTEM",
                  message: `LIMIT SELL for ${order.quantity} shares of ${order.symbol} REJECTED due to insufficient holdings.`,
                },
              });
              return;
            }

            const saleCredit = cost - brokerage;
            const purchaseCost = Number(holding.avg_price) * order.quantity;
            const realizedPnl = cost - purchaseCost - brokerage;

            await tx.user.update({
              where: { id: user.id },
              data: { virtual_cash_balance: cash + saleCredit },
            });

            await tx.order.update({
              where: { id: order.id },
              data: { status: "EXECUTED" },
            });

            await tx.trade.create({
              data: {
                order_id: order.id,
                user_id: user.id,
                symbol: order.symbol,
                side: "SELL",
                quantity: order.quantity,
                price: currentPrice,
                brokerage_fee: brokerage,
                realized_pnl: realizedPnl,
              },
            });

            await tx.transaction.create({
              data: {
                user_id: user.id,
                type: "TRADE_SELL",
                amount: saleCredit,
                balance_after: cash + saleCredit,
                reference_id: order.id,
              },
            });

            const newQty = holding.quantity - order.quantity;
            if (newQty === 0) {
              await tx.holding.delete({ where: { id: holding.id } });
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

            await tx.notification.create({
              data: {
                user_id: user.id,
                type: "ORDER_EXECUTED",
                message: `LIMIT SELL Executed: ${order.quantity} shares of ${order.symbol} at ₹${currentPrice.toFixed(2)}. PnL: ₹${realizedPnl.toFixed(2)}.`,
              },
            });
          }
        });
      }
    }
  } catch (err) {
    console.error("Error matching limit orders:", err);
  }
}
