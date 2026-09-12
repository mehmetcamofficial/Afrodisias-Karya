import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(), name: text("name").notNull(), type: text("type").notNull(),
  size: text("size").notNull(), note: text("note").notNull(), priceKurus: integer("price_kurus").notNull(),
  stock: integer("stock").notNull().default(0), active: integer("active", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("idx_products_active_name").on(table.active, table.name)]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), customerName: text("customer_name").notNull(), email: text("email").notNull(),
  phone: text("phone").notNull(), address: text("address").notNull(), itemsJson: text("items_json").notNull(),
  totalKurus: integer("total_kurus").notNull(), status: text("status").notNull().default("payment_pending"),
  paymentProvider: text("payment_provider").notNull().default("iyzico"), createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("idx_orders_created_at").on(table.createdAt)]);
