import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const isMock = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";
  
  if (isMock) {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const session = cookieStore.get("paper-trade-session");
      return NextResponse.json({ authenticated: !!session?.value });
    } catch {
      return NextResponse.json({ authenticated: false });
    }
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return NextResponse.json({ authenticated: !!user });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
