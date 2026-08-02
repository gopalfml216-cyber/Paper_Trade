import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";
    const sector = searchParams.get("sector")?.trim() || "";

    // Build the query filter object
    const whereClause: any = {
      is_active: true,
    };

    if (query) {
      whereClause.OR = [
        { symbol: { contains: query } },
        { company_name: { contains: query } },
      ];
    }

    if (sector && sector.toLowerCase() !== "all" && sector.toLowerCase() !== "all sectors") {
      whereClause.sector = sector;
    }

    const stocks = await prisma.stockMaster.findMany({
      where: whereClause,
      include: {
        price_cache: true,
      },
      orderBy: {
        symbol: "asc",
      },
    });

    return NextResponse.json({ stocks });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch stock list" },
      { status: 500 }
    );
  }
}
