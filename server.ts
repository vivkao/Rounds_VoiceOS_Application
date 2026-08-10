import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { renderCustom, markHtml, esc, clip } from "./widgetKit.ts";

const server = new McpServer({ name: "facility-emar", version: "1.2.2" });
const ACCENT = "#c191be";
const BASE = "https://doting-grouse-938.convex.cloud";
type O = Record<string, any>;

const txt = (v: any, fallback = ""): string => v == null || v === "" ? fallback : Array.isArray(v) ? v.map(x => txt(x)).join(", ") : typeof v === "object" ? txt(v.name ?? v.text ?? v.value, fallback) : String(v);
const items = (v: any, keys: string[]): any[] => { if (Array.isArray(v)) return v; for (const k of keys) if (Array.isArray(v?.[k])) return v[k]; for (const k of keys) if (v?.[k] && typeof v[k] === "object") return [v[k]]; return []; };
const clock = (v: any) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? txt(v, "Unavailable") : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d); };

async function convex(kind: "query" | "mutation", path: string, args: O) {
  const response = await fetch(`${BASE}/api/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args: Object.fromEntries(Object.entries(args).filter(([, v]) => v != null && v !== "")), format: "json" }),
    signal: AbortSignal.timeout(8000),
  });
  const source = await response.text();
  let body: any;
  try { body = source ? JSON.parse(source) : {}; } catch { throw new Error(`Unreadable Convex response (${response.status}).`); }
  if (!response.ok || body.status === "error") throw new Error(clip(body.errorMessage || body.message || `Convex request failed (${response.status}).`, 180));
  return Object.prototype.hasOwnProperty.call(body, "value") ? body.value : body;
}

const CSS = `
.em{font:13px/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;padding-bottom:10px}.hd{height:42px;padding:0 16px 0 14px;display:flex;align-items:center;gap:9px}.hd b{font-size:12.5px;font-weight:650;color:var(--ink-2)}.hd i{margin-left:auto;font-style:normal;font-size:10.5px;color:var(--ink-4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:150px}.rule{height:2px;width:54px;margin-left:16px;background:var(--accent);border-radius:2px}.hero{padding:13px 16px 12px}.hero b{display:block;font-size:23px;line-height:27px;font-weight:690;letter-spacing:-.025em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hero span{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin-top:5px;font-size:11.5px;line-height:16px;color:var(--ink-3)}.good b{color:var(--good)}.bad b{color:var(--bad)}.kv{min-height:41px;margin:0 16px;padding:7px 0;border-top:1px solid var(--line);display:grid;grid-template-columns:82px minmax(0,1fr);align-items:center;gap:10px}.k{font-size:10.5px;font-weight:650;text-transform:uppercase;letter-spacing:.025em;color:var(--ink-3)}.v{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.row{height:52px;margin:0 16px;border-top:1px solid var(--line);display:grid;grid-template-columns:minmax(0,1fr) 78px;align-items:center;gap:10px}.row div{min-width:0}.row b,.row span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.row span{font-size:10.5px;color:var(--ink-3)}.right{text-align:right;font-variant-numeric:tabular-nums}.copy{margin:0 16px;padding:10px 0;border-top:1px solid var(--line);font-size:12.5px;line-height:17px;color:var(--ink-2);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:6;overflow:hidden;white-space:pre-line}.note{margin:0 16px;padding:9px 0 2px;border-top:1px solid var(--line);font-size:10.5px;color:var(--ink-4)}
`;
function card(title: string, tag: string, body: string, height: number) { return renderCustom({ accent: ACCENT, css: CSS, body: `<div class="em"><div class="hd">${markHtml()}<b>${esc(title)}</b>${tag ? `<i>${esc(tag)}</i>` : ""}</div><div class="rule"></div>${body}</div>`, height, label: title }); }
function out(data: O, c: { html: string; height: number }) { return { content: [{ type: "text" as const, text: JSON.stringify({ ...data, _voiceos_glance: { blocks: [{ type: "widget", html: c.html, height: c.height }] } }) }] }; }
const failed = (title: string, e: any) => `<div class="hero bad"><b>${esc(title)}</b><span>${esc(clip(e?.message || String(e), 180))}</span></div>`;
const kv = (pairs: any[][]) => pairs.map(([k, v]) => `<div class="kv"><span class="k">${esc(k)}</span><span class="v">${esc(clip(v, 110))}</span></div>`).join("");

server.registerTool("find_resident", {
  title: "Find resident", description: "Look up a nursing-home resident by name and return room, allergies, fall risk, and code status. Use when staff ask for a resident profile or safety details.", inputSchema: { name: z.string().min(1) } as any,
}, async (a: any) => {
  try {
    const raw = await convex("query", "residents:findResident", { name: a.name });
    let found = items(raw, ["residents", "matches", "items", "resident"]); if (!found.length && raw?.name) found = [raw];
    const residents = found.map((x: any) => ({ id: txt(x._id ?? x.id), name: txt(x.name ?? x.residentName), room: txt(x.room ?? x.roomNumber, "Unavailable"), allergies: txt(x.allergies, "None documented"), fallRisk: txt(x.fallRisk, "Unavailable"), codeStatus: txt(x.codeStatus, "Unavailable") }));
    const shown = residents.slice(0, 4);
    const body = shown.length ? shown.map(r => `<div class="row"><div><b>${esc(clip(r.name, 80))}</b><span>${esc(clip(`Allergies: ${r.allergies} · Fall: ${r.fallRisk} · ${r.codeStatus}`, 105))}</span></div><b class="right">${esc(clip(r.room, 18))}</b></div>`).join("") + (residents.length > 4 ? `<div class="note">+${residents.length - 4} more matches</div>` : "") : `<div class="hero"><b>No resident found</b><span>No match for ${esc(clip(a.name, 90))}.</span></div>`;
    return out({ query: a.name, residents, count: residents.length }, card("Resident safety", a.name, body, shown.length ? 54 + shown.length * 52 + (residents.length > 4 ? 29 : 0) : 154));
  } catch (e) { return out({ query: a.name, residents: [], error: txt((e as any).message) }, card("Resident safety", a.name, failed("Resident record unavailable", e), 158)); }
});

server.registerTool("get_due_meds", {
  title: "Get due medications", description: "List medications due during the current hour, optionally for one resident. Use when staff ask what is due now or what a named resident needs this hour.", inputSchema: { resident_name: z.string().optional() } as any,
}, async (a: any) => {
  try {
    const raw = await convex("query", "meds:getDueMeds", { residentName: a.resident_name });
    const medications = items(raw, ["medications", "meds", "dueMedications", "items"]).map((x: any) => { const due = x.scheduledTime ?? x.dueAt ?? x.dueTime; return { resident: txt(x.residentName ?? x.resident?.name), medication: txt(x.medicationName ?? x.medication?.name ?? x.medication), dose: txt(x.dose), route: txt(x.route), scheduledTime: txt(due), dueTime: clock(due), residentId: txt(x.residentId), medicationRequestId: txt(x.medicationRequestId ?? x.orderId) }; });
    const shown = medications.slice(0, 4);
    const body = shown.length ? `<div class="hero"><b style="color:var(--accent)">${medications.length} due</b><span>${esc(a.resident_name ? `For ${clip(a.resident_name, 80)}` : "During the current hour")}</span></div>` + shown.map(m => `<div class="row"><div><b>${esc(clip(m.medication, 85))}</b><span>${esc(clip(`${m.resident} · ${m.dose} · ${m.route}`, 105))}</span></div><b class="right">${esc(m.dueTime)}</b></div>`).join("") + (medications.length > 4 ? `<div class="note">+${medications.length - 4} more due</div>` : "") : `<div class="hero"><b>No medications due</b><span>${esc(a.resident_name || "Nothing is scheduled in the current hour.")}</span></div>`;
    return out({ medications, count: medications.length, residentFilter: a.resident_name || null }, card("Medication pass", "this hour", body, shown.length ? 116 + shown.length * 52 + (medications.length > 4 ? 29 : 0) : 154));
  } catch (e) { return out({ medications: [], error: txt((e as any).message) }, card("Medication pass", "this hour", failed("Schedule unavailable", e), 164)); }
});

server.registerTool("check_med_administration", {
  title: "Check medication administration", description: "Check the Five Rights plus allergy and duplicate-dose safeguards without recording a dose. Use immediately before administration; a verified result supplies arguments for log_med_administration.", inputSchema: { resident_name: z.string().min(1), medication_name: z.string().min(1), resident_id: z.string().optional(), medication_request_id: z.string().optional(), scheduled_time: z.string().datetime({ offset: true }).optional() } as any,
}, async (a: any) => {
  try {
    const raw = await convex("query", "meds:checkMedAdministration", { residentName: a.resident_name, medicationName: a.medication_name, residentId: a.resident_id, medicationRequestId: a.medication_request_id, scheduledTime: a.scheduled_time });
    const x = raw?.result ?? raw ?? {}, status = String(x.status ?? x.verdict ?? "").toLowerCase();
    const blocked = x.safe === false || x.allowed === false || x.allergyConflict || x.duplicateDose || /block|unsafe|allerg|duplicate/.test(status + txt(x.conflictType));
    const r: O = blocked ? { status: "blocked", reason: txt(x.reason ?? x.message, "Safety conflict"), residentName: txt(x.residentName, a.resident_name), medication: txt(x.medicationName, a.medication_name) } : { status: "verified", residentId: txt(x.residentId, a.resident_id || ""), residentName: txt(x.residentName, a.resident_name), medicationRequestId: txt(x.medicationRequestId, a.medication_request_id || ""), medication: txt(x.medicationName ?? x.medication, a.medication_name), dose: txt(x.dose), route: txt(x.route), scheduledTime: txt(x.scheduledTime, a.scheduled_time || ""), timeLabel: clock(x.scheduledTime ?? a.scheduled_time) };
    if (!blocked && ((!/verified|approved|safe|ok/.test(status) && x.safe !== true && x.allowed !== true) || !r.dose || !r.route || !r.scheduledTime)) { r.status = "unable"; r.reason = "The Five Rights could not be completely verified."; }
    const body = r.status === "verified" ? `<div class="hero good"><b>Five Rights verified</b><span>No allergy or duplicate-dose block was returned.</span></div>${kv([["Resident", r.residentName], ["Medication", r.medication], ["Dose", r.dose], ["Route", r.route], ["Time", r.timeLabel]])}` : `<div class="hero bad"><b>${r.status === "blocked" ? "DO NOT GIVE" : "Unable to verify"}</b><span>${esc(clip(r.reason, 180))}</span></div>`;
    const logArguments = r.status === "verified" ? { resident_id: r.residentId || undefined, resident_name: r.residentName, medication_request_id: r.medicationRequestId || undefined, medication_name: r.medication, dose: r.dose, route: r.route, scheduled_time: r.scheduledTime, given_at: new Date().toISOString() } : null;
    return out({ ...r, logArguments }, card("Medication safety", "", body, r.status === "verified" ? 326 : 190));
  } catch (e) { return out({ status: "error", reason: txt((e as any).message) }, card("Medication safety", "", failed("Safety check unavailable", e), 190)); }
});

server.registerTool("draft_family_update", {
  title: "Draft family update", description: "Generate review-only family-update text from resident data after approval. Use when staff want a draft to review; this tool does not send or save a message.", inputSchema: { resident_name: z.string().min(1), update_focus: z.string().optional(), tone: z.enum(["warm", "concise", "reassuring", "clinical"]).optional() } as any,
}, async (a: any) => {
  try {
    const raw = await convex("query", "familyUpdates:draftFamilyUpdate", { residentName: a.resident_name, updateFocus: a.update_focus, tone: a.tone || "warm" }), x = raw?.draft ?? raw?.result ?? raw ?? {}, preview = txt(x.previewText ?? x.message ?? x.body ?? x.text);
    if (!preview) throw new Error("Convex did not return preview text.");
    const r = { status: "preview", residentName: txt(x.residentName, a.resident_name), recipient: txt(x.recipientName, "Family contact"), subject: txt(x.subject, `Update about ${a.resident_name}`), preview, tone: txt(x.tone, a.tone || "warm"), delivery: "none", communicationServiceContacted: false };
    const body = `<div class="hero"><b>${esc(clip(r.residentName, 90))}</b><span>PREVIEW ONLY · ${esc(clip(r.recipient, 70))}</span></div>${kv([["Subject", r.subject]])}<div class="copy">${esc(clip(r.preview, 700))}</div><div class="note">No delivery occurred. Review before copying this text into a connected communication tool.</div>`;
    return out(r, card("Family update draft", "preview only", body, 292));
  } catch (e) { return out({ status: "error", delivery: "none", error: txt((e as any).message) }, card("Family update draft", "preview only", failed("Draft unavailable", e), 190)); }
});

server.registerTool("log_med_administration", {
  title: "Log medication administration", description: "Commit a previously checked medication dose as given. Use only after check_med_administration returns verified values and the staff member approves the record.", inputSchema: { resident_id: z.string().optional(), resident_name: z.string().min(1), medication_request_id: z.string().optional(), medication_name: z.string().min(1), dose: z.string().min(1), route: z.string().min(1), scheduled_time: z.string().datetime({ offset: true }), given_at: z.string().datetime({ offset: true }) } as any,
}, async (a: any) => {
  try {
    const raw = await convex("mutation", "meds:logMedAdministration", { residentId: a.resident_id, residentName: a.resident_name, medicationRequestId: a.medication_request_id, medicationName: a.medication_name, dose: a.dose, route: a.route, scheduledTime: a.scheduled_time, givenAt: a.given_at }), x = raw?.result ?? raw ?? {};
    if (x.ok === false || /blocked|rejected|error|failed/.test(String(x.status))) throw new Error(txt(x.reason ?? x.message, "Not recorded"));
    const r = { status: "recorded", administrationId: txt(x.administrationId ?? x._id) || null, residentName: txt(x.residentName, a.resident_name), medication: txt(x.medicationName, a.medication_name), givenAt: a.given_at, givenLabel: clock(a.given_at), message: txt(x.message, "Convex recorded the medication administration.") };
    return out(r, card("eMAR administration", "", `<div class="hero good"><b>Recorded as given</b><span>${esc(clip(r.message, 180))}</span></div>${kv([["Resident", r.residentName], ["Medication", r.medication], ["Given at", r.givenLabel]])}`, 264));
  } catch (e) { return out({ status: "not_recorded", message: txt((e as any).message) }, card("eMAR administration", "", failed("Not recorded", e), 190)); }
});

server.registerTool("restart_mcp_server", {
  title: "Restart MCP server", description: "Restart the local Rounds MCP process. Use only when the user explicitly asks to refresh or restart the integration.", inputSchema: { reason: z.string().max(120).optional() } as any,
}, async (a: any) => {
  const r = { status: "restart_requested", reason: a.reason || null, message: "VoiceOS should relaunch this process automatically." };
  const response = out(r, card("Rounds service", "local MCP", `<div class="hero"><b style="color:var(--accent)">Restart requested</b><span>${esc(r.message)}</span></div><div class="note">${esc(clip(a.reason || "Refresh the local service.", 120))}</div>`, 178));
  const timer = setTimeout(() => process.exit(0), 750); timer.unref(); return response;
});

await server.connect(new StdioServerTransport());