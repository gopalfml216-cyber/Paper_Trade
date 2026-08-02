import prisma from "../lib/prisma";

const NIFTY_STOCKS = [
  { symbol: "RELIANCE", name: "Reliance Industries Limited", sector: "Energy", price: 2450.00 },
  { symbol: "TCS", name: "Tata Consultancy Services Limited", sector: "Technology", price: 3850.00 },
  { symbol: "HDFCBANK", name: "HDFC Bank Limited", sector: "Financial Services", price: 1650.00 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Limited", sector: "Telecommunication", price: 1120.00 },
  { symbol: "ICICIBANK", name: "ICICI Bank Limited", sector: "Financial Services", price: 1050.00 },
  { symbol: "INFY", name: "Infosys Limited", sector: "Technology", price: 1560.00 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Financial Services", price: 750.00 },
  { symbol: "ITC", name: "ITC Limited", sector: "Consumer Goods", price: 430.00 },
  { symbol: "LICI", name: "Life Insurance Corporation of India", sector: "Financial Services", price: 950.00 },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever Limited", sector: "Consumer Goods", price: 2380.00 },
  { symbol: "LT", name: "Larsen & Toubro Limited", sector: "Construction", price: 3500.00 },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv Limited", sector: "Financial Services", price: 1580.00 },
  { symbol: "HCLTECH", name: "HCL Technologies Limited", sector: "Technology", price: 1620.00 },
  { symbol: "MARUTI", name: "Maruti Suzuki India Limited", sector: "Automobile", price: 11400.00 },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries Limited", sector: "Healthcare", price: 1520.00 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank Limited", sector: "Financial Services", price: 1720.00 },
  { symbol: "TATAMOTORS", name: "Tata Motors Limited", sector: "Automobile", price: 940.00 },
  { symbol: "AXISBANK", name: "Axis Bank Limited", sector: "Financial Services", price: 1080.00 },
  { symbol: "ONGC", name: "Oil & Natural Gas Corporation Limited", sector: "Energy", price: 270.00 },
  { symbol: "NTPC", name: "NTPC Limited", sector: "Utilities", price: 340.00 },
  { symbol: "COALINDIA", name: "Coal India Limited", sector: "Energy", price: 420.00 },
  { symbol: "ADANIENT", name: "Adani Enterprises Limited", sector: "Metals & Mining", price: 3100.00 },
  { symbol: "JSWSTEEL", name: "JSW Steel Limited", sector: "Metals & Mining", price: 820.00 },
  { symbol: "TATASTEEL", name: "Tata Steel Limited", sector: "Metals & Mining", price: 140.00 },
  { symbol: "POWERGRID", name: "Power Grid Corporation of India Limited", sector: "Utilities", price: 280.00 },
  { symbol: "TITAN", name: "Titan Company Limited", sector: "Consumer Goods", price: 3600.00 },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement Limited", sector: "Materials", price: 9800.00 },
  { symbol: "WIPRO", name: "Wipro Limited", sector: "Technology", price: 480.00 },
  { symbol: "M&M", name: "Mahindra & Mahindra Limited", sector: "Automobile", price: 1950.00 },
  { symbol: "NESTLEIND", name: "Nestle India Limited", sector: "Consumer Goods", price: 2500.00 },
  { symbol: "ADANIPORTS", name: "Adani Ports and Special Economic Zone Limited", sector: "Services", price: 1280.00 },
  { symbol: "GRASIM", name: "Grasim Industries Limited", sector: "Materials", price: 2200.00 },
  { symbol: "TECHM", name: "Tech Mahindra Limited", sector: "Technology", price: 1250.00 },
  { symbol: "HINDALCO", name: "Hindalco Industries Limited", sector: "Metals & Mining", price: 580.00 },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto Limited", sector: "Automobile", price: 8300.00 },
  { symbol: "BRITANNIA", name: "Britannia Industries Limited", sector: "Consumer Goods", price: 4900.00 },
  { symbol: "CIPLA", name: "Cipla Limited", sector: "Healthcare", price: 1450.00 },
  { symbol: "INDUSINDBK", name: "IndusInd Bank Limited", sector: "Financial Services", price: 1480.00 },
  { symbol: "EICHERMOT", name: "Eicher Motors Limited", sector: "Automobile", price: 3900.00 },
  { symbol: "BPCL", name: "Bharat Petroleum Corporation Limited", sector: "Energy", price: 590.00 },
  { symbol: "DIVISLAB", name: "Divi's Laboratories Limited", sector: "Healthcare", price: 3600.00 },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals Enterprise Limited", sector: "Healthcare", price: 6100.00 },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories Limited", sector: "Healthcare", price: 6200.00 },
  { symbol: "ASIANPAINT", name: "Asian Paints Limited", sector: "Consumer Goods", price: 2850.00 },
  { symbol: "TATACONSUM", name: "Tata Consumer Products Limited", sector: "Consumer Goods", price: 1150.00 },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp Limited", sector: "Automobile", price: 4500.00 },
  { symbol: "LTIM", name: "LTIMindtree Limited", sector: "Technology", price: 5200.00 },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance Limited", sector: "Financial Services", price: 2350.00 },
  { symbol: "JIOFIN", name: "Jio Financial Services Limited", sector: "Financial Services", price: 350.00 },
  { symbol: "BEL", name: "Bharat Electronics Limited", sector: "Industrial Manufacturing", price: 200.00 }
];

async function main() {
  console.log("Seeding database...");

  for (const stock of NIFTY_STOCKS) {
    // 1. Insert or update StockMaster
    await prisma.stockMaster.upsert({
      where: { symbol: stock.symbol },
      update: {
        company_name: stock.name,
        sector: stock.sector,
      },
      create: {
        symbol: stock.symbol,
        company_name: stock.name,
        exchange: "NSE",
        sector: stock.sector,
        lot_size: 1,
        is_active: true,
      },
    });

    // 2. Insert or update PriceCache
    const prevClose = stock.price * 0.99; // Mock slightly lower prev close so there is a minor positive day change initially
    const dayChange = stock.price - prevClose;
    const dayChangePct = (dayChange / prevClose) * 100;

    await prisma.priceCache.upsert({
      where: { symbol: stock.symbol },
      update: {
        last_price: stock.price,
        day_change: dayChange,
        day_change_pct: dayChangePct,
        day_open: stock.price,
        day_high: stock.price * 1.01,
        day_low: stock.price * 0.99,
        prev_close: prevClose,
      },
      create: {
        symbol: stock.symbol,
        last_price: stock.price,
        day_change: dayChange,
        day_change_pct: dayChangePct,
        day_open: stock.price,
        day_high: stock.price * 1.01,
        day_low: stock.price * 0.99,
        prev_close: prevClose,
      },
    });
  }

  console.log(`Successfully seeded ${NIFTY_STOCKS.length} Nifty stocks and price caches.`);
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
