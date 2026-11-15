/** Store sort options shared by the server page and the client storefront. */
export type Sort = "featured" | "price-asc" | "price-desc";
export const isSort = (value: unknown): value is Sort => value === "featured" || value === "price-asc" || value === "price-desc";
