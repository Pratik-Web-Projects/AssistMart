import { eq } from "drizzle-orm";
import { db } from "../db";
import {users} from '../db/schema.js'

export async function getLocalUser(userId: string) {
    const [row] = await db.select().from(users).where(eq(users.clerkUserId, userId));
    return row;
}