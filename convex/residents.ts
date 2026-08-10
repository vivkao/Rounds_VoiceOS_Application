import { query } from "./_generated/server";
import { v } from "convex/values";

export const findResident = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const all = await ctx.db.query("residents").collect();
    return all.find(r =>
      r.name.toLowerCase().includes(name.toLowerCase())
    ) ?? null;
  },
});

export const search = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const all = await ctx.db.query("residents").collect();
    return all.filter(r =>
      r.name.toLowerCase().includes(name.toLowerCase())
    );
  },
});