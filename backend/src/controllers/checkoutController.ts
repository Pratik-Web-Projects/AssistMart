import { getAuth } from "@clerk/express";
import type {Request, Response, NextFunction } from "express";
import z from 'zod'
import { getEnv } from "../lib/env";
import { getLocalUser } from "../lib/users";
import { db } from "../db";
import { CheckoutSessionLine, checkOutSessions, products } from "../db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { polarCreateCheckout } from "../lib/polar";


const env = getEnv();

const cartSchema = z.object({
    items: z.array(
        z.object({
            productId: z.string().uuid(),
            quantity: z.number().int().positive()
        })
    ).min(1)
})

export async function createCheckout(req: Request, res:Response, next: NextFunction) {
    try{
        const {userId, isAuthenticated} = getAuth(req);
        if (!isAuthenticated || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
        }
      const cartParsed = cartSchema.safeParse(req.body);
      if (!cartParsed.success) {
      res.status(400).json({ error: "Invalid cart", details: cartParsed.error.flatten() });
      return;
    }

     if (!env.POLAR_ACCESS_TOKEN) {
      res.status(503).json({ error: "Payments are not configured" });
      return;
    }

     const localUser = await getLocalUser(userId);
    if (!localUser) {
      res.status(503).json({ error: "Account not synced yet" });
      return;
    }

    const ids = cartParsed.data.items.map((i)=> i.productId);

    const productRows = await db.select().from(products).
                        where(and(inArray(products.id, ids), eq(products.active, true)));

    if(productRows.length !== ids.length){
        res.status(400).json({ error: "One or more products are invalid" });
      return;
    }
 const byId = new Map(productRows.map((p) => [p.id, p]));
    let totalCents = 0;
    const lines: CheckoutSessionLine[] = [];

    for (const line of cartParsed.data.items) {
      const p = byId.get(line.productId)!;
      totalCents += p.priceCents * line.quantity;
      lines.push({
        productId: p.id,
        quantity: line.quantity,
        unitPriceCents: p.priceCents,
      });
    }

    if (totalCents < 10) {
      res.status(400).json({
        error: "Total below Polar minimum (e.g. USD requires at least 10 cents)",
      });
      return;
    }

    const [session] = await db
      .insert(checkOutSessions)
      .values({
        userId: localUser.id,
        lines,
        totalCents,
        currency: "usd",
      })
      .returning();

    const successUrl = `${env.FRONTEND_URL}/checkout/return?checkout_id={CHECKOUT_ID}`;
    const returnUrl = `${env.FRONTEND_URL}/cart`;

    const checkout = await polarCreateCheckout(env, {
      products: [env.POLAR_CHECKOUT_PRODUCT_ID],
      prices: {
        [env.POLAR_CHECKOUT_PRODUCT_ID]: [
          {
            amount_type: "fixed",
            price_currency: "inr",
            price_amount: totalCents,
          },
        ],
      },

      success_url: successUrl,
      return_url: returnUrl,
      external_customer_id: userId,
      metadata: { checkout_session_id: session.id },
    });

    await db
      .update(checkOutSessions)
      .set({ polarCheckoutId: checkout.id })
      .where(eq(checkOutSessions.id, session.id));

    res.json({ checkoutUrl: checkout.url });

    }catch(error){
        next(error);
    }
}