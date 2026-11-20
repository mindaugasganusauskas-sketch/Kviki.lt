// Prieš paleidimą: sutikimas su taisyklėmis, paskyros ištrynimas, užklausų galiojimas, apsaugos ribos.
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { BASE, Device, jpegWithGps, newProvider, newUser, offerBody, requestBody, uid, vilniusDate } from "./helpers";

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL ?? "postgres://kviki:kviki@localhost:5432/kviki_test" });
afterAll(() => pool.end());

async function runMaintenance() {
  const r = await fetch(`${BASE}/api/v1/internal/maintenance`, { method: "POST" });
  expect(r.status).toBe(200);
  return (await r.json()).expired as number;
}

describe("Sutikimas su taisyklėmis", () => {
  it("be sutikimo užsiregistruoti negalima", async () => {
    const d = new Device("be-sutikimo");
    const r = await d.post("/api/v1/auth/register", { name: "Jonas", email: `be-${uid()}@test.kviki.lt`, password: "slaptazodis123" });
    expect(r.status).toBe(400);
    expect(r.body.error.message).toContain("sutinkate su taisyklėmis");
  });
  it("teisiniai puslapiai pasiekiami ir rodo valdytoją", async () => {
    for (const path of ["/privatumas", "/taisykles"]) {
      const html = await (await fetch(BASE + path)).text();
      expect(html).toContain("UAB Kviki");
      expect(html).toContain("info@kviki.lt");
    }
  });
});

describe("Paskyros ištrynimas", () => {
  it("neleidžiama, kol yra aktyvus užsakymas; neteisingas slaptažodis atmetamas", async () => {
    const client = await newUser("trinamas");
    const p = await newProvider(`tp-${uid()}`, { businessForm: "individual", categories: ["mowing"], municipalities: ["birzu-r"] });
    const id = (await client.post("/api/v1/requests", requestBody({ municipality: "birzu-r" }))).body.id;
    const offer = (await p.post(`/api/v1/requests/${id}/offers`, offerBody(50, 5))).body.offer;
    await client.post(`/api/v1/requests/${id}/accept`, { offerId: offer.id, offerVersion: offer.version });
    expect((await client.post("/api/v1/me/delete", { password: "neteisingas" })).status).toBe(400);
    const blocked = await client.post("/api/v1/me/delete", { password: "slaptazodis123" });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.message).toContain("aktyvių užsakymų");
  });

  it("ištrina asmens duomenis, uždaro atviras užklausas, palieka nuasmenintą istoriją kitai šaliai", async () => {
    const client = await newUser("istrinamas");
    const p = await newProvider(`ip-${uid()}`, { businessForm: "company", categories: ["mowing"], municipalities: ["pasvalio-r"] });
    // Užbaigtas užsakymas
    const doneId = (await client.post("/api/v1/requests", requestBody({ municipality: "pasvalio-r" }))).body.id;
    const o1 = (await p.post(`/api/v1/requests/${doneId}/offers`, offerBody(70, 3))).body.offer;
    const agreementId = (await client.post(`/api/v1/requests/${doneId}/accept`, { offerId: o1.id, offerVersion: o1.version })).body.agreementId;
    const visit = (await client.get(`/api/v1/agreements/${agreementId}`)).body.agreement.visits[0];
    await p.post(`/api/v1/visits/${visit.id}/done`);
    await client.post(`/api/v1/visits/${visit.id}/confirm`);
    // Atvira užklausa su pasiūlymu ir nuotrauka
    const form = new FormData();
    form.set("data", JSON.stringify(requestBody({ municipality: "pasvalio-r" })));
    form.append("photos", await jpegWithGps(), "p.jpg");
    const openId = (await client.call("POST", "/api/v1/requests", form)).body.id;
    await p.post(`/api/v1/requests/${openId}/offers`, offerBody(80, 5));

    const del = await client.post("/api/v1/me/delete", { password: "slaptazodis123" });
    expect(del.status).toBe(200);

    expect((await client.get("/api/v1/me")).status).toBe(401);
    expect((await new Device("x").post("/api/v1/auth/login", { email: client.email, password: "slaptazodis123" })).status).toBe(401);

    const ag = (await p.get(`/api/v1/agreements/${agreementId}`)).body.agreement;
    expect(ag.client.name).toBe("Ištrinta paskyra");
    expect(ag.client.email).toBe("");
    expect(ag.client.phone).toBeNull();
    expect(ag.location.address).toBe("(ištrinta)");
    expect(ag.description).toBe("");
    expect(ag.priceCents).toBe(7000);

    const openView = (await p.get(`/api/v1/requests/${openId}`)).body.request;
    expect(openView.status).toBe("cancelled");
    expect(openView.photos).toEqual([]);
    const notes = (await p.get("/api/v1/notifications")).body.notifications;
    expect(notes.some((n: any) => n.type === "request_cancelled")).toBe(true);

    // Tuo pačiu el. paštu vėl galima registruotis.
    const again = await new Device("vel").post("/api/v1/auth/register", {
      name: "Vėl",
      email: client.email,
      password: "slaptazodis123",
      acceptTerms: true,
    });
    expect(again.status).toBe(200);
  });
});

describe("Pasenusių užklausų uždarymas", () => {
  it("praėjus laikui užklausa nebegalioja, teikėjai jos nemato; atnaujinus nauju laiku – vėl atvira", async () => {
    const client = await newUser("senstanti");
    const p = await newProvider(`sp-${uid()}`, { businessForm: "individual", categories: ["mowing"], municipalities: ["kupiskio-r"] });
    const id = (await client.post("/api/v1/requests", requestBody({ municipality: "kupiskio-r" }))).body.id;
    await p.post(`/api/v1/requests/${id}/offers`, offerBody(60, 5));

    // Laikas praėjo, bet periodinis darbas dar nepaleistas: sąraše užklausos jau nėra.
    await pool.query("update job_requests set window_end = now() - interval '1 hour' where id = $1", [id]);
    expect((await p.get("/api/v1/jobs/nearby")).body.jobs.map((j: any) => j.id)).not.toContain(id);

    expect(await runMaintenance()).toBeGreaterThanOrEqual(1);
    const view = (await client.get(`/api/v1/requests/${id}`)).body.request;
    expect(view.status).toBe("expired");
    expect(view.offers).toEqual([]);
    expect((await client.get("/api/v1/notifications")).body.notifications.some((n: any) => n.type === "request_expired")).toBe(true);
    expect((await p.get("/api/v1/notifications")).body.notifications.some((n: any) => n.type === "request_expired")).toBe(true);

    const upd = await client.call("PATCH", `/api/v1/requests/${id}`, requestBody({
      municipality: "kupiskio-r",
      timing: { type: "window", startDate: vilniusDate(1), startTime: "08:00", endDate: vilniusDate(2), endTime: "20:00" },
    }));
    expect(upd.status).toBe(200);
    expect((await client.get(`/api/v1/requests/${id}`)).body.request.status).toBe("open");
    expect((await p.get("/api/v1/jobs/nearby")).body.jobs.map((j: any) => j.id)).toContain(id);
  });

  it("„Kuo greičiau“ užklausa uždaroma po 14 dienų, „Laikas lankstus“ – po 30", async () => {
    const client = await newUser("sena");
    const asap = (await client.post("/api/v1/requests", requestBody({ timing: { type: "asap" } }))).body.id;
    const flex = (await client.post("/api/v1/requests", requestBody({ timing: { type: "flexible" } }))).body.id;
    await pool.query("update job_requests set updated_at = now() - interval '15 days' where id = any($1)", [[asap, flex]]);
    await runMaintenance();
    expect((await client.get(`/api/v1/requests/${asap}`)).body.request.status).toBe("expired");
    expect((await client.get(`/api/v1/requests/${flex}`)).body.request.status).toBe("open");
    await pool.query("update job_requests set updated_at = now() - interval '31 days' where id = $1", [flex]);
    await runMaintenance();
    expect((await client.get(`/api/v1/requests/${flex}`)).body.request.status).toBe("expired");
  });
});

describe("Apsaugos ribos", () => {
  it("per parą – ne daugiau kaip 10 naujų užklausų", async () => {
    const client = await newUser("daug");
    for (let i = 0; i < 10; i++) {
      expect((await client.post("/api/v1/requests", requestBody({ timing: { type: "flexible" } }))).status).toBe(200);
    }
    const r = await client.post("/api/v1/requests", requestBody({ timing: { type: "flexible" } }));
    expect(r.status).toBe(429);
    expect(r.body.error.message).toContain("iki 10 užklausų");
  });

  it("demonstracijoje nuotraukų įkelti negalima", async () => {
    const demo = new Device("demo-foto");
    await demo.post("/api/v1/auth/demo", { as: "client" });
    const form = new FormData();
    form.set("data", JSON.stringify(requestBody()));
    form.append("photos", await jpegWithGps(), "p.jpg");
    const r = await demo.call("POST", "/api/v1/requests", form);
    expect(r.status).toBe(400);
    expect(r.body.error.message).toContain("Demonstracijoje");
  });
});


describe("Saugumo pataisymai", () => {
  it("slaptažodžio keitimas: reikia dabartinio, kiti įrenginiai atjungiami", async () => {
    const u = await newUser("keicia-slapt");
    const other = new Device("kitas-irenginys");
    await other.post("/api/v1/auth/login", { email: u.email, password: "slaptazodis123" });
    expect((await other.get("/api/v1/me")).status).toBe(200);

    const bad = await u.post("/api/v1/me/password", { currentPassword: "blogas", newPassword: "naujas-slapt-1" });
    expect(bad.status).toBe(400);
    const ok = await u.post("/api/v1/me/password", { currentPassword: "slaptazodis123", newPassword: "naujas-slapt-1" });
    expect(ok.status).toBe(200);

    expect((await u.get("/api/v1/me")).status).toBe(200); // šis įrenginys lieka prisijungęs
    expect((await other.get("/api/v1/me")).status).toBe(401); // kitas atjungtas
    expect((await new Device("x").post("/api/v1/auth/login", { email: u.email, password: "slaptazodis123" })).status).toBe(401);
    expect((await new Device("y").post("/api/v1/auth/login", { email: u.email, password: "naujas-slapt-1" })).status).toBe(200);
  });

  it("siunčiamos saugumo antraštės (CSP, HSTS, X-Frame-Options)", async () => {
    const r = await fetch(BASE + "/");
    expect(r.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(r.headers.get("strict-transport-security")).toContain("max-age=");
    expect(r.headers.get("x-frame-options")).toBe("DENY");
    expect(r.headers.get("x-powered-by")).toBeNull();
  });

  it("robots.txt ir sitemap.xml pasiekiami, privatūs puslapiai neindeksuojami", async () => {
    const robots = await (await fetch(BASE + "/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("sitemap.xml");
    expect((await fetch(BASE + "/sitemap.xml")).status).toBe(200);
    expect((await fetch(BASE + "/og.png")).status).toBe(200);
  });
});
