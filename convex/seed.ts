import { mutation } from "./_generated/server";

export const seedData = mutation({
  args: {},
  handler: async (ctx) => {
    const dorothy = await ctx.db.insert("residents", {
    name: "Dorothy Chen",
    room: "214B",
    wing: "2",
    dob: "1938-04-12",
    allergies: ["Penicillin"],
    codeStatus: "DNR",
    fallRisk: true,
    diet: "Low sodium",
    standingNotes: ["Daughter visits Sundays"],
    familyContact: {
        name: "Sarah Chen",
        relationship: "Daughter",
        email: "sarah.chen@example.com",
        authorized: true,
    },
    });

    const harold = await ctx.db.insert("residents", {
      name: "Harold Reed",
      room: "208A",
      wing: "2",
      dob: "1941-09-03",
      allergies: [],
      codeStatus: "Full code",
      fallRisk: false,
      diet: "Regular",
      standingNotes: [],
    });

    const cheng = await ctx.db.insert("residents", {
      name: "Wei Cheng",
      room: "301",
      wing: "3",
      dob: "1935-11-20",
      allergies: [],
      codeStatus: "Full code",
      fallRisk: false,
      diet: "Diabetic",
      standingNotes: [],
    });

    const lisinoprilOrder = await ctx.db.insert("medOrders", {
      residentId: dorothy,
      drug: "Lisinopril",
      dose: "5 mg",
      route: "Oral",
      frequency: "Once daily",
      scheduledTimes: ["15:00"],
      prn: false,
      maxDaily: 1,
    });

    const metforminOrder = await ctx.db.insert("medOrders", {
      residentId: harold,
      drug: "Metformin",
      dose: "500 mg",
      route: "Oral",
      frequency: "Twice daily",
      scheduledTimes: ["08:00", "14:00"],
      prn: false,
      maxDaily: 2,
    });

    

    // Harold already got his 14:00 dose (for the "duplicate" demo moment)
    await ctx.db.insert("adminEvents", {
      residentId: harold,
      medOrderId: metforminOrder,
      givenAt: "14:07",
      givenBy: "Nurse J. Alvarez",
      status: "given",
    });

    return "Seeded!";
  },
});