import {pgTable, text, integer, timestamp, uuid, boolean, json} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { jsonb } from 'drizzle-orm/pg-core';

export type OrderStatus = 'pending' | 'paid' | 'failed';
export type UserRole = 'customer' | 'support' | 'admin';

export type CheckoutSessionLine = {
  productId: string;
  quantity: number;
  unitPriceCents: number;
};

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    clerkUserId: text('clerk_user_id').notNull().unique(),
    email: text('email').default('').notNull(),
    displayName: text('display_name'),
    role: text('role').$type<UserRole>().notNull().default('customer'),
    createdAt: timestamp('created_at', {withTimezone: true}).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', {withTimezone: true}).defaultNow().notNull()
});

export const products = pgTable('products', {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    category: text('category').notNull().default('General'),
    description: text('description').notNull().default(''),
    priceCents: integer('price_cents').notNull(),
    currency: text('currency').notNull().default('usd'),
    imageUrl: text('image_url'),
    imageKitFileId: text('image_kit_file_id'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_At', {withTimezone: true}).notNull().defaultNow()
});

export const checkOutSessions = pgTable('checkout_sessions',{
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().
            references(()=> users.id, {onDelete: 'cascade'}),
    polarCheckoutId: text('polar_checkout_id').unique(),
    lines: jsonb('lines').$type<CheckoutSessionLine>().notNull(),
    totalCents: integer('total_cents').notNull(),
    currency: text("currency").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}) ;

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").$type<OrderStatus>().notNull().default("pending"),
  polarCheckoutId: text("polar_checkout_id"),
  polarOrderId: text("polar_order_id").unique(),
  totalCents: integer("total_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').references(() => orders.id, {onDelete: 'cascade'}),
    productId: uuid('product_id').references(() => products.id, {onDelete: 'restrict'}),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

