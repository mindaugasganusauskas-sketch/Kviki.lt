import { NextResponse } from "next/server";
import { expireStaleRequests } from "@/server/services/maintenance";

/** Tik testams (KVIKI_TEST_HOOKS=1): paleidžia periodinį darbą iš karto. Gamyboje – 404. */
export async function POST() {
  if (process.env.KVIKI_TEST_HOOKS !== "1") return new NextResponse("Nerasta", { status: 404 });
  return NextResponse.json({ expired: await expireStaleRequests() });
}
