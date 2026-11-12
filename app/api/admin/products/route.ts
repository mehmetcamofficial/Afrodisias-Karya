import { NextResponse } from "next/server";
import { adminApiGuard } from "../../../admin-auth";
import { requirePostgres } from "../../../../db/postgres/driver";
import { listAllProducts } from "../../../../db/postgres/repository";

export const runtime = "nodejs";
export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;
  try {
    return NextResponse.json(await listAllProducts(requirePostgres()));
  } catch (error) {
    console.error("admin products GET database unavailable", error);
    return NextResponse.json({ error: "Veritabanı kullanılamıyor" }, { status: 503 });
  }
}
