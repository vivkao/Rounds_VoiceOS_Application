import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ---------- GET DUE MEDS ----------
export const getDueMeds = query({
  args: { residentName: v.optional(v.string()) },
  handler: async (ctx, { residentName }) => {
    const residents = await ctx.db.query("residents").collect();
    const medOrders = await ctx.db.query("medOrders").collect();
    const adminEvents = await ctx.db.query("adminEvents").collect();

    const targetResidents = residentName
      ? residents.filter(r => r.name.toLowerCase().includes(residentName.toLowerCase()))
      : residents;

    const results = [];
    for (const order of medOrders) {
      const resident = targetResidents.find(r => r._id === order.residentId);
      if (!resident) continue;

      for (const time of order.scheduledTimes) {
        const given = adminEvents.find(
          e => e.medOrderId === order._id && e.residentId === resident._id && e.status === "given"
        );
        results.push({
          residentName: resident.name,
          room: resident.room,
          medication: order.drug,        // renamed from "drug" to match server.ts
          medicationName: order.drug,    // alias, belt-and-suspenders
          dose: order.dose,
          route: order.route,
          scheduledTime: time,
          givenAt: given?.givenAt ?? null,
          givenBy: given?.givenBy ?? null,
        });
      }
    }
    return results; // returned as a raw array — matches listFrom's first check
  },
});

// ---------- CHECK MED ADMINISTRATION ----------
export const checkMedAdministration = query({
  args: {
    residentName: v.string(),
    medicationName: v.string(),
    residentId: v.optional(v.id("residents")),
    medicationRequestId: v.optional(v.id("medOrders")),
    scheduledTime: v.optional(v.string()),
  },
  handler: async (ctx, { residentName, medicationName, residentId, medicationRequestId }) => {
    const residents = await ctx.db.query("residents").collect();
    const resident = residentId
      ? await ctx.db.get(residentId)
      : residents.find(r => r.name.toLowerCase().includes(residentName.toLowerCase()));

    if (!resident) {
      return { status: "error", reason: "Resident not found", residentName, medicationName };
    }

    // allergy check
    const allergyHit = resident.allergies.find(a =>
      medicationName.toLowerCase().includes(a.toLowerCase())
    );
    if (allergyHit) {
      return {
        status: "blocked",
        allergyConflict: true,
        conflictType: "allergy",
        reason: `${medicationName} conflicts with documented allergy: ${allergyHit}`,
        residentName: resident.name,
        medicationName,
      };
    }

    // find matching order
    const medOrders = await ctx.db.query("medOrders").collect();
    const order = medicationRequestId
      ? await ctx.db.get(medicationRequestId)
      : medOrders.find(o => o.residentId === resident._id &&
          o.drug.toLowerCase() === medicationName.toLowerCase());

    // duplicate dose check
    if (order) {
      const adminEvents = await ctx.db.query("adminEvents").collect();
      const today = new Date().toDateString();
      const alreadyGiven = adminEvents.find(e =>
        e.medOrderId === order._id &&
        e.residentId === resident._id &&
        e.status === "given" &&
        new Date(e.givenAt).toDateString() === today
      );
      if (alreadyGiven) {
        return {
          status: "blocked",
          duplicateDose: true,
          conflictType: "duplicate",
          reason: `Already given at ${alreadyGiven.givenAt} by ${alreadyGiven.givenBy}`,
          residentName: resident.name,
          medicationName,
        };
      }
    }

    // verified — safe to give
    return {
      status: "verified",
      residentId: resident._id,
      residentName: resident.name,
      medicationRequestId: order?._id ?? null,
      medicationName,
      dose: order?.dose ?? "As ordered",
      route: order?.route ?? "As ordered",
      scheduledTime: new Date().toISOString(),
    };
  },
});

// ---------- LOG MED ADMINISTRATION ----------
export const logMedAdministration = mutation({
  args: {
    residentId: v.optional(v.id("residents")),
    residentName: v.string(),
    medicationRequestId: v.optional(v.id("medOrders")),
    medicationName: v.string(),
    dose: v.string(),
    route: v.string(),
    scheduledTime: v.optional(v.string()),
    givenAt: v.string(),
  },
  handler: async (ctx, args) => {
    const resident = args.residentId
      ? await ctx.db.get(args.residentId)
      : null;

    if (!resident) {
      return { status: "not_recorded", reason: "Resident not found" };
    }

    // re-check allergy at write time
    const allergyHit = resident.allergies.find(a =>
      args.medicationName.toLowerCase().includes(a.toLowerCase())
    );
    if (allergyHit) {
      return { status: "blocked", reason: `Allergy conflict: ${allergyHit}` };
    }

    const eventId = await ctx.db.insert("adminEvents", {
      residentId: resident._id,
      medOrderId: args.medicationRequestId ?? (undefined as any),
      givenAt: args.givenAt,
      givenBy: "Voice-verified staff",
      status: "given",
      note: `${args.medicationName} ${args.dose} via ${args.route}`,
    });

    return {
      status: "recorded",
      administrationId: eventId,
      residentName: resident.name,
      medicationName: args.medicationName,
      message: `Recorded ${args.medicationName} for ${resident.name}.`,
    };
  },
});