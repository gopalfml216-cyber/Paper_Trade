import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchHistoricalData } from "@/lib/market-data/priceProvider";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "1M"; // 1W, 1M, 3M, 1Y

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
    }

    const upperSymbol = symbol.toUpperCase();

    // Verify stock exists
    const stock = await prisma.stockMaster.findUnique({
      where: { symbol: upperSymbol },
      include: { price_cache: true },
    });

    if (!stock) {
      return NextResponse.json({ error: `Stock ${upperSymbol} not found` }, { status: 404 });
    }

    // Check if we already have historical prices cached
    const historyCount = await prisma.historicalPrice.count({
      where: { symbol: upperSymbol },
    });

    // If history is empty, attempt to fetch from Yahoo Finance first, fallback to mock simulation
    if (historyCount === 0) {
      try {
        const histData = await fetchHistoricalData(upperSymbol);
        const records = histData.map((d) => ({
          symbol: upperSymbol,
          date: d.date,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: BigInt(d.volume),
        }));

        await prisma.historicalPrice.createMany({
          data: records,
        });
      } catch (err) {
        console.error(`Failed to fetch real history for ${upperSymbol} from Yahoo Finance, falling back to mock simulation:`, err);
        const basePrice = stock.price_cache?.last_price ? Number(stock.price_cache.last_price) : 100;
        await generateAndCacheHistory(upperSymbol, basePrice);
      }
    }

    // Fetch and return the cached historical prices sorted chronologically
    const filterDate = new Date();
    if (range === "1W") {
      filterDate.setDate(filterDate.getDate() - 7);
    } else if (range === "1M") {
      filterDate.setMonth(filterDate.getMonth() - 1);
    } else if (range === "3M") {
      filterDate.setMonth(filterDate.getMonth() - 3);
    } else if (range === "1Y") {
      filterDate.setFullYear(filterDate.getFullYear() - 1);
    } else {
      filterDate.setMonth(filterDate.getMonth() - 1); // default 1M
    }

    const ohlcData = await prisma.historicalPrice.findMany({
      where: {
        symbol: upperSymbol,
        date: {
          gte: filterDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Format for TradingView lightweight-charts:
    // timezone-safe date extraction
    const formattedData = ohlcData.map((d) => {
      const year = d.date.getFullYear();
      const month = String(d.date.getMonth() + 1).padStart(2, '0');
      const date = String(d.date.getDate()).padStart(2, '0');
      return {
        time: `${year}-${month}-${date}`,
        open: Number(d.open),
        high: Number(d.high),
        low: Number(d.low),
        close: Number(d.close),
      };
    });

    return NextResponse.json({ history: formattedData });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to retrieve history" },
      { status: 500 }
    );
  }
}

async function generateAndCacheHistory(symbol: string, currentPrice: number) {
  const records = [];
  let price = currentPrice;
  const now = new Date();

  // Generate 260 trading days (excluding weekends) going backward in time
  let daysGenerated = 0;
  const currentDate = new Date(now);

  while (daysGenerated < 260) {
    currentDate.setDate(currentDate.getDate() - 1);
    const dayOfWeek = currentDate.getDay();
    
    // Skip Saturdays (6) and Sundays (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Simulate daily price walk: -1.5% to +1.5%
    const change = (Math.random() - 0.5) * 0.03;
    const nextPrice = price / (1 + change); // walk backward

    // Generate daily candle values
    const close = price;
    const open = nextPrice;
    const high = Math.max(open, close) * (1 + Math.random() * 0.012);
    const low = Math.min(open, close) * (1 - Math.random() * 0.012);
    const volume = Math.floor(100000 + Math.random() * 2000000);

    records.push({
      symbol,
      date: new Date(currentDate),
      open,
      high,
      low,
      close,
      volume: BigInt(volume),
    });

    price = nextPrice;
    daysGenerated++;
  }

  // Bulk create in SQLite
  await prisma.historicalPrice.createMany({
    data: records,
  });
}
