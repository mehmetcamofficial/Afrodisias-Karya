import "server-only";
import { requirePostgres } from "../db/postgres/driver";
import { listProducts } from "../db/postgres/repository";
import { hydrateProducts } from "./catalog-hydration";
import type { Product } from "./products";

export async function getLiveProducts(): Promise<Product[]> {
  return hydrateProducts(await listProducts(requirePostgres()));
}
