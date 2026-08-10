import { query } from "./_generated/server";
import { v } from "convex/values";

export const draftFamilyUpdate = query({
  args: {
    residentName: v.string(),
    tone: v.optional(v.string()),
  },
  handler: async (ctx, { residentName }) => {
    const residents = await ctx.db.query("residents").collect();
    const resident = residents.find(r =>
      r.name.toLowerCase().includes(residentName.toLowerCase())
    );

    if (!resident) {
      return { status: "error", reason: "Resident not found" };
    }
    if (!resident.familyContact || !resident.familyContact.authorized) {
      return { status: "error", reason: "No authorized family contact on file" };
    }

    // pull recent admin events + flags for a simple summary
    const adminEvents = await ctx.db.query("adminEvents")
      .filter(q => q.eq(q.field("residentId"), resident._id))
      .collect();
    const flags = await ctx.db.query("flags")
      .filter(q => q.eq(q.field("residentId"), resident._id))
      .collect();

    const givenCount = adminEvents.filter(e => e.status === "given").length;
    const openFlags = flags.filter(f => !f.resolved);

    const draft = `${resident.name.split(" ")[0]} had a steady week, with ${givenCount} medications administered on schedule` +
      (openFlags.length ? ` and ${openFlags.length} item${openFlags.length > 1 ? "s" : ""} flagged for follow-up.` : " and no new concerns.");

    return {
      status: "ready",
      residentName: resident.name,
      familyName: resident.familyContact.name,
      relationship: resident.familyContact.relationship,
      draft,
    };
  },
});