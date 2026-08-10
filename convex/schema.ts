import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  residents: defineTable({
    name: v.string(),
    room: v.string(),
    wing: v.string(),
    dob: v.string(),
    allergies: v.array(v.string()),
    codeStatus: v.string(),
    fallRisk: v.boolean(),
    diet: v.string(),
    standingNotes: v.array(v.string()),
    familyContact: v.optional(v.object({
    name: v.string(),
    relationship: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    authorized: v.boolean(),
    })),
  }),

  medOrders: defineTable({
    residentId: v.id("residents"),
    drug: v.string(),
    dose: v.string(),
    route: v.string(),
    frequency: v.string(),
    scheduledTimes: v.array(v.string()),
    prn: v.boolean(),
    maxDaily: v.number(),
  }),

  adminEvents: defineTable({
    residentId: v.id("residents"),
    medOrderId: v.id("medOrders"),
    givenAt: v.string(),
    givenBy: v.string(),
    status: v.string(), // "given" | "refused" | "held" | "missed"
    note: v.optional(v.string()),
  }),

  flags: defineTable({
    residentId: v.id("residents"),
    raisedBy: v.string(),
    at: v.string(),
    urgency: v.string(),
    reason: v.string(),
    resolved: v.boolean(),
  }),
});