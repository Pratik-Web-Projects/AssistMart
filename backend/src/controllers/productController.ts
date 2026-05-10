import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { products } from "../db/schema";
import { and, desc, eq } from "drizzle-orm";

export async function listProducts(req: Request, res:Response, next: NextFunction){
    try{
        const categroy = typeof req.body.category === "string" ? req.body.category.trim() : '';

        const rows = await db.select().
                     from(products).
                     where(categroy ? and( eq(products.active, true),
                                           eq(products.category, categroy)  
                                        ) 
                                    : eq(products.active , true)).
                     orderBy(desc(products.createdAt));

        res.json({products: rows});

    }catch(error){
        next(error);
    }

}

export async function getCategories(req: Request, res:Response, next: NextFunction){
try{
    const rows = await db.select({category: products.category}).
                            from(products).where(eq(products.active, true));
    const categories = [...new Set(rows.map((r) => r.category))].sort((a,b) => a.localeCompare(b));

    res.json({categories});
}catch(error){
    next(error);
}
}

export async function getProductBySlug(req: Request, res:Response, next: NextFunction){
try{
     const [row] = await db
      .select()
      .from(products)
      .where(eq(products.slug, req.params.slug as string))
      .limit(1);

    if (!row || !row.active) return res.status(404).json({ error: "Not found" });

    res.json({ product: row });
}catch(error){
    next(error);
}
}