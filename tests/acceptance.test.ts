// Priėmimo kriterijai (aprašo 8 skyrius), tikrinami per tikrą HTTP API ir tikrą PostgreSQL.
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import {
  Device,
  jpegWithGps,
  loginAgain,
  newProvider,
  newUser,
  offerBody,
  requestBody,
  uid,
  vilniusDate,
} from "./helpers";

type Ctx = {
  client: Awaited<ReturnType<typeof newUser>>;
  company: Device;
  individual: Device;
  otherCategory: Device;
  otherArea: Device;
  requestId: string;
};
const ctx = {} as Ctx;
// Kiekvienam paleidimui – savas savivaldybės ir kategorijos derinys nebūtinas, bet atskiri naudotojai būtini.
const MUN = "jurbarko-r";

describe("1. Paskelbimas telefonu ir peržiūra kompiuteryje", () => {
  beforeAll(async () => {
    ctx.client = await newUser("klientas");
    ctx.company = await newProvider(`imone-${uid()}`, { businessForm: "company", categories: ["mowing", "yard"], municipalities: [MUN] });
    ctx.individual = await newProvider(`tomas-${uid()}`, { businessForm: "individual", categories: ["mowing"], municipalities: [MUN, "taurages-r"] });
    ctx.otherCategory = await newProvider(`genetojas-${uid()}`, { businessForm: "individual", categories: ["pruning"], municipalities: [MUN] });
    ctx.otherArea = await newProvider(`vilnietis-${uid()}`, { businessForm: "company", categories: ["mowing"], municipalities: ["vilniaus-m"] });
  });

  it("klientas paskelbia vienkartinį darbą su nuotrauka", async () => {
    const form = new FormData();
    form.set("data", JSON.stringify(requestBody()));
    form.append("photos", await jpegWithGps(), "pieva.jpg");
    const r = await ctx.client.call("POST", "/api/v1/requests", form);
    expect(r.status).toBe(200);
    ctx.requestId = r.body.id;
  });

  it("kitame įrenginyje prisijungęs mato tą pačią užklausą su nuotrauka", async () => {
    const desktop = await loginAgain(ctx.client.email, "kompiuteris");
    const list = await desktop.get("/api/v1/requests");
    expect(list.body.requests.map((x: any) => x.id)).toContain(ctx.requestId);
    const one = await desktop.get(`/api/v1/requests/${ctx.requestId}`);
    expect(one.status).toBe(200);
    expect(one.body.request.viewer).toBe("owner");
    expect(one.body.request.photos).toHaveLength(1);
    expect(one.body.request.private.address).toContain("Slaptas adresas");
    const img = await desktop.raw(one.body.request.photos[0].url);
    expect(img.status).toBe(200);
    const meta = await sharp(Buffer.from(await img.arrayBuffer())).metadata();
    expect(meta.exif).toBeUndefined(); // GPS ir kiti EXIF duomenys pašalinti
  });
});

describe("2. Teikėjų atranka ir pasiūlymai", () => {
  it("tos pačios savivaldybės įmonė ir individuali veikla mato užklausą", async () => {
    for (const p of [ctx.company, ctx.individual]) {
      const r = await p.get("/api/v1/jobs/nearby");
      expect(r.status).toBe(200);
      expect(r.body.jobs.map((j: any) => j.id)).toContain(ctx.requestId);
    }
  });

  it("kitos kategorijos ir kitos savivaldybės teikėjų sąraše užklausos nėra", async () => {
    for (const p of [ctx.otherCategory, ctx.otherArea]) {
      const r = await p.get("/api/v1/jobs/nearby");
      expect(r.status).toBe(200);
      expect(r.body.jobs.map((j: any) => j.id)).not.toContain(ctx.requestId);
    }
  });

  it("darbų sąraše nėra tikslaus adreso ir kontakto", async () => {
    const r = await ctx.company.get("/api/v1/jobs/nearby");
    const json = JSON.stringify(r.body);
    expect(json).not.toContain("Slaptas adresas");
    expect(json).not.toContain("+37069999999");
  });

  it("teikėjai pateikia skirtingas kainas ir laikus", async () => {
    const a = await ctx.individual.post(`/api/v1/requests/${ctx.requestId}/offers`, offerBody(90, 3));
    expect(a.status).toBe(200);
    expect(a.body.offer.perVisit).toBe(false);
    const b = await ctx.company.post(`/api/v1/requests/${ctx.requestId}/offers`, offerBody(75, 20));
    expect(b.status).toBe(200);
  });

  it("teikėjas mato tik savo pasiūlymą", async () => {
    const r = await ctx.company.get(`/api/v1/requests/${ctx.requestId}/offers`);
    expect(r.status).toBe(200);
    expect(r.body.offers).toHaveLength(1);
    expect(r.body.offers[0].priceCents).toBe(7500);
    const view = await ctx.company.get(`/api/v1/requests/${ctx.requestId}`);
    expect(view.body.request.viewer).toBe("provider");
    expect(view.body.request.private).toBeNull();
    expect(JSON.stringify(view.body)).not.toContain("9000");
  });

  it("klientas mato abu pasiūlymus palyginimui", async () => {
    const r = await ctx.client.get(`/api/v1/requests/${ctx.requestId}/offers`);
    expect(r.body.offers.map((o: any) => o.priceCents).sort()).toEqual([7500, 9000]);
    expect(new Set(r.body.offers.map((o: any) => o.provider.businessForm))).toEqual(new Set(["company", "individual"]));
  });
});

describe("3–4. Priėmimas, privatumas, idempotentiškumas ir versijos", () => {
  let tomasOffer: any;
  let companyOffer: any;
  let agreementId: string;

  beforeAll(async () => {
    const r = await ctx.client.get(`/api/v1/requests/${ctx.requestId}/offers`);
    tomasOffer = r.body.offers.find((o: any) => o.priceCents === 9000);
    companyOffer = r.body.offers.find((o: any) => o.priceCents === 7500);
  });

  it("pakeisto pasiūlymo senomis sąlygomis priimti nepavyksta", async () => {
    const changed = await ctx.company.post(`/api/v1/requests/${ctx.requestId}/offers`, offerBody(80, 20));
    expect(changed.body.offer.version).toBe(companyOffer.version + 1);
    const r = await ctx.client.post(`/api/v1/requests/${ctx.requestId}/accept`, { offerId: companyOffer.id, offerVersion: companyOffer.version });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("OFFER_CHANGED");
    expect(r.body.error.details.offer.priceCents).toBe(8000);
  });

  it("atsiimto pasiūlymo priimti nepavyksta", async () => {
    const w = await ctx.company.post(`/api/v1/offers/${companyOffer.id}/withdraw`);
    expect(w.status).toBe(200);
    const r = await ctx.client.post(`/api/v1/requests/${ctx.requestId}/accept`, { offerId: companyOffer.id, offerVersion: w.body.offer.version });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("OFFER_CHANGED");
    // Įmonė pateikia pasiūlymą vėl.
    const again = await ctx.company.post(`/api/v1/requests/${ctx.requestId}/offers`, offerBody(75, 20));
    companyOffer = again.body.offer;
  });

  it("teikėjas negali keisti konkurento pasiūlymo ar priimti jo vietoj kliento", async () => {
    const patch = await ctx.company.call("PATCH", `/api/v1/offers/${tomasOffer.id}`, offerBody(1, 5));
    expect(patch.status).toBe(404);
    const accept = await ctx.company.post(`/api/v1/requests/${ctx.requestId}/accept`, { offerId: companyOffer.id, offerVersion: companyOffer.version });
    expect(accept.status).toBe(404);
  });

  it("du priėmimai vienu metu (du įrenginiai, skirtingi pasiūlymai) sukuria tik vieną susitarimą", async () => {
    const phone = await loginAgain(ctx.client.email, "telefonas");
    const [r1, r2] = await Promise.all([
      ctx.client.post(`/api/v1/requests/${ctx.requestId}/accept`, { offerId: tomasOffer.id, offerVersion: tomasOffer.version }),
      phone.post(`/api/v1/requests/${ctx.requestId}/accept`, { offerId: companyOffer.id, offerVersion: companyOffer.version }),
    ]);
    const ok = [r1, r2].filter((r) => r.status === 200);
    const failed = [r1, r2].filter((r) => r.status !== 200);
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].body.error.code).toBe("ALREADY_AGREED");
    agreementId = ok[0].body.agreementId;
    // Abu įrenginiai mato tą pačią tikrąją būseną.
    const v1 = await ctx.client.get(`/api/v1/requests/${ctx.requestId}`);
    const v2 = await phone.get(`/api/v1/requests/${ctx.requestId}`);
    expect(v1.body.request.status).toBe("agreed");
    expect(v1.body.request.activeAgreementId).toBe(agreementId);
    expect(v2.body.request.activeAgreementId).toBe(agreementId);
  });

  it("pakartotas priėmimas (dvigubas paspaudimas) nesukuria antro susitarimo", async () => {
    const a = await ctx.client.get(`/api/v1/agreements/${agreementId}`);
    const offerId = a.body.agreement.priceCents === 9000 ? tomasOffer.id : companyOffer.id;
    const version = a.body.agreement.priceCents === 9000 ? tomasOffer.version : companyOffer.version;
    const [x, y] = await Promise.all([
      ctx.client.post(`/api/v1/requests/${ctx.requestId}/accept`, { offerId, offerVersion: version }),
      ctx.client.post(`/api/v1/requests/${ctx.requestId}/accept`, { offerId, offerVersion: version }),
    ]);
    expect(x.status).toBe(200);
    expect(y.status).toBe(200);
    expect(x.body.agreementId).toBe(agreementId);
    expect(y.body.agreementId).toBe(agreementId);
    expect(x.body.created || y.body.created).toBe(false);
    const list = await ctx.client.get("/api/v1/agreements?as=client");
    expect(list.body.agreements.filter((g: any) => g.requestId === ctx.requestId)).toHaveLength(1);
  });

  it("pasirinktas teikėjas mato adresą ir kontaktą, kitas – ne, net per tiesioginę API užklausą", async () => {
    const a = await ctx.client.get(`/api/v1/agreements/${agreementId}`);
    const chosenIsTomas = a.body.agreement.priceCents === 9000;
    const chosen = chosenIsTomas ? ctx.individual : ctx.company;
    const other = chosenIsTomas ? ctx.company : ctx.individual;

    const mine = await chosen.get(`/api/v1/agreements/${agreementId}`);
    expect(mine.status).toBe(200);
    expect(mine.body.agreement.location.address).toContain("Slaptas adresas");
    expect(mine.body.agreement.client.phone).toBe("+37069999999");
    const view = await chosen.get(`/api/v1/requests/${ctx.requestId}`);
    expect(view.body.request.private.address).toContain("Slaptas adresas");
    const jobs = await chosen.get("/api/v1/agreements?as=provider");
    expect(jobs.body.agreements.map((g: any) => g.id)).toContain(agreementId);

    const theirs = await other.get(`/api/v1/agreements/${agreementId}`);
    expect(theirs.status).toBe(404);
    const otherView = await other.get(`/api/v1/requests/${ctx.requestId}`);
    expect(otherView.status).toBe(200);
    expect(otherView.body.request.private).toBeNull();
    expect(otherView.body.request.myOffer.status).toBe("closed");
    const offers = await other.get(`/api/v1/requests/${ctx.requestId}/offers`);
    expect(offers.body.offers).toHaveLength(1);
    expect(JSON.stringify([otherView.body, offers.body])).not.toContain("Slaptas adresas");
    expect(JSON.stringify([otherView.body, offers.body])).not.toContain("+37069999999");

    // Pašalinis teikėjas (nedalyvavo) uždarytos užklausos nebemato.
    const stranger = await ctx.otherArea.get(`/api/v1/requests/${ctx.requestId}`);
    expect(stranger.status).toBe(404);
  });

  it("kitas teikėjas gauna pranešimą, kad užklausa baigėsi", async () => {
    const a = await ctx.client.get(`/api/v1/agreements/${agreementId}`);
    const other = a.body.agreement.priceCents === 9000 ? ctx.company : ctx.individual;
    const n = await other.get("/api/v1/notifications");
    expect(n.body.notifications.some((x: any) => x.type === "request_closed")).toBe(true);
  });

  it("teikėjas pažymi atliktu, klientas patvirtina – darbas užbaigtas", async () => {
    const a = await ctx.client.get(`/api/v1/agreements/${agreementId}`);
    const chosen = a.body.agreement.priceCents === 9000 ? ctx.individual : ctx.company;
    const visit = a.body.agreement.visits[0];
    expect((await ctx.client.post(`/api/v1/visits/${visit.id}/done`)).status).toBe(403);
    expect((await chosen.post(`/api/v1/visits/${visit.id}/done`)).status).toBe(200);
    expect((await ctx.client.post(`/api/v1/visits/${visit.id}/confirm`)).status).toBe(200);
    const after = await ctx.client.get(`/api/v1/agreements/${agreementId}`);
    expect(after.body.agreement.status).toBe("completed");
    const req = await ctx.client.get(`/api/v1/requests/${ctx.requestId}`);
    expect(req.body.request.status).toBe("completed");
  });
});

describe("Užklausos pakeitimas po pasiūlymų", () => {
  it("nauja versija reikalauja teikėjo patvirtinimo prieš priimant", async () => {
    const client = await newUser("keiciantis");
    const p = await newProvider(`p-${uid()}`, { businessForm: "individual", categories: ["mowing"], municipalities: ["kauno-r"] });
    const created = await client.post("/api/v1/requests", requestBody({ municipality: "kauno-r" }));
    const id = created.body.id;
    const offer = (await p.post(`/api/v1/requests/${id}/offers`, offerBody(60, 5))).body.offer;

    const upd = await client.call("PATCH", `/api/v1/requests/${id}`, requestBody({ municipality: "kauno-r", details: { areaAres: 80, grassHeight: "high", collectGrass: true, equipment: "provider", tractorAccess: false } }));
    expect(upd.status).toBe(200);
    expect(upd.body.version).toBe(2);

    const offers = await client.get(`/api/v1/requests/${id}/offers`);
    expect(offers.body.offers[0].needsReconfirmation).toBe(true);
    const fail = await client.post(`/api/v1/requests/${id}/accept`, { offerId: offer.id, offerVersion: offer.version });
    expect(fail.status).toBe(409);
    expect(fail.body.error.code).toBe("OFFER_CHANGED");

    const notes = await p.get("/api/v1/notifications");
    expect(notes.body.notifications.some((n: any) => n.type === "request_changed")).toBe(true);

    const reconfirmed = (await p.post(`/api/v1/requests/${id}/offers`, offerBody(95, 5))).body.offer;
    expect(reconfirmed.needsReconfirmation).toBe(false);
    const ok = await client.post(`/api/v1/requests/${id}/accept`, { offerId: reconfirmed.id, offerVersion: reconfirmed.version });
    expect(ok.status).toBe(200);
  });

  it("kol pasiūlymų nėra – klientas gali atšaukti užklausą", async () => {
    const client = await newUser("atsaukiantis");
    const id = (await client.post("/api/v1/requests", requestBody({ municipality: "zarasu-r" }))).body.id;
    const offers = await client.get(`/api/v1/requests/${id}/offers`);
    expect(offers.body.offers).toEqual([]);
    expect((await client.post(`/api/v1/requests/${id}/cancel`)).status).toBe(200);
    expect((await client.get(`/api/v1/requests/${id}`)).body.request.status).toBe("cancelled");
  });
});

describe("5. Periodinis darbas „kas dvi savaites“", () => {
  let client: Awaited<ReturnType<typeof newUser>>;
  let provider: Device;
  let other: Device;
  let requestId: string;
  let agreementId: string;

  beforeAll(async () => {
    client = await newUser("periodinis");
    provider = await newProvider(`per-${uid()}`, { businessForm: "company", categories: ["mowing"], municipalities: ["moletu-r"] });
    other = await newProvider(`per2-${uid()}`, { businessForm: "individual", categories: ["mowing"], municipalities: ["moletu-r"] });
    const r = await client.post(
      "/api/v1/requests",
      requestBody({ municipality: "moletu-r", recurrence: { type: "recurring", frequency: "biweekly", startDate: vilniusDate(1), endDate: null } }),
    );
    expect(r.status).toBe(200);
    requestId = r.body.id;
  });

  it("teikėjas mato dažnį, kaina visur rodoma už vieną vizitą", async () => {
    const jobs = await provider.get("/api/v1/jobs/nearby");
    const job = jobs.body.jobs.find((j: any) => j.id === requestId);
    expect(job.recurrence.frequency).toBe("biweekly");
    const o = await provider.post(`/api/v1/requests/${requestId}/offers`, offerBody(40, 26));
    expect(o.body.offer.perVisit).toBe(true);
    await other.post(`/api/v1/requests/${requestId}/offers`, offerBody(45, 30));
    const offers = await client.get(`/api/v1/requests/${requestId}/offers`);
    expect(offers.body.offers.every((x: any) => x.perVisit)).toBe(true);
    const mine = offers.body.offers.find((x: any) => x.priceCents === 4000);
    const acc = await client.post(`/api/v1/requests/${requestId}/accept`, { offerId: mine.id, offerVersion: mine.version });
    expect(acc.status).toBe(200);
    agreementId = acc.body.agreementId;
    const a = await client.get(`/api/v1/agreements/${agreementId}`);
    expect(a.body.agreement.perVisit).toBe(true);
    expect(a.body.agreement.frequency).toBe("biweekly");
  });

  it("vizitai kas 14 dienų tuo pačiu vietos laiku", async () => {
    const a = (await client.get(`/api/v1/agreements/${agreementId}`)).body.agreement;
    expect(a.visits.length).toBeGreaterThanOrEqual(5);
    const fmt = new Intl.DateTimeFormat("lt-LT", { timeZone: "Europe/Vilnius", hour: "2-digit", minute: "2-digit" });
    const t0 = fmt.format(new Date(a.visits[0].scheduledAt));
    for (let i = 1; i < a.visits.length; i++) {
      const days = (new Date(a.visits[i].scheduledAt).getTime() - new Date(a.visits[i - 1].scheduledAt).getTime()) / 86400000;
      expect(Math.round(days)).toBe(14);
      expect(fmt.format(new Date(a.visits[i].scheduledAt))).toBe(t0); // vasaros/žiemos laikas nepaslenka valandos
    }
  });

  it("atšaukus vieną vizitą kitas išlieka", async () => {
    const a = (await client.get(`/api/v1/agreements/${agreementId}`)).body.agreement;
    const [first, second] = a.visits;
    // Pirmas vizitas atliekamas ir patvirtinamas – istorija.
    expect((await provider.post(`/api/v1/visits/${first.id}/done`)).status).toBe(200);
    expect((await client.post(`/api/v1/visits/${first.id}/confirm`)).status).toBe(200);
    // Antrą vizitą atšaukia klientas.
    expect((await client.post(`/api/v1/visits/${second.id}/cancel`, { reason: "Būsiu išvykęs" })).status).toBe(200);
    const after = (await provider.get(`/api/v1/agreements/${agreementId}`)).body.agreement;
    expect(after.status).toBe("active");
    expect(after.visits[1].status).toBe("cancelled");
    expect(after.visits[1].cancelledBy).toBe("client");
    expect(after.visits[2].status).toBe("scheduled");
    const n = await provider.get("/api/v1/notifications");
    expect(n.body.notifications.some((x: any) => x.type === "visit_cancelled")).toBe(true);
  });

  it("nutraukus seriją istorija išsaugoma", async () => {
    expect((await provider.post(`/api/v1/agreements/${agreementId}/cancel`, { reason: "Nebeturiu laiko" })).status).toBe(200);
    const a = (await client.get(`/api/v1/agreements/${agreementId}`)).body.agreement;
    expect(a.status).toBe("ended");
    expect(a.cancelledBy).toBe("provider");
    expect(a.visits[0].status).toBe("confirmed");
    expect(a.visits.slice(2).every((v: any) => v.status === "cancelled")).toBe(true);
    const req = (await client.get(`/api/v1/requests/${requestId}`)).body.request;
    expect(req.status).toBe("on_hold");
    const notes = await client.get("/api/v1/notifications");
    expect(notes.body.notifications.some((x: any) => x.type === "series_ended")).toBe(true);
  });

  it("naują teikėją pasirenka klientas: kito teikėjo pasiūlymas atgyja, bet reikia jo patvirtinimo", async () => {
    expect((await client.post(`/api/v1/requests/${requestId}/reopen`)).status).toBe(200);
    const offers = (await client.get(`/api/v1/requests/${requestId}/offers`)).body.offers;
    expect(offers).toHaveLength(1);
    expect(offers[0].priceCents).toBe(4500);
    expect(offers[0].needsReconfirmation).toBe(true);
    const notes = await other.get("/api/v1/notifications");
    expect(notes.body.notifications.some((x: any) => x.type === "request_reopened")).toBe(true);
  });
});

describe("Apsauga", () => {
  it("svetimos svetainės užklausa su sesijos slapuku atmetama", async () => {
    const u = await newUser("csrf");
    const r = await u.call("POST", "/api/v1/requests", requestBody(), { Origin: "https://evil.example" });
    expect(r.status).toBe(403);
  });

  it("neprisijungęs negauna nieko", async () => {
    const anon = new Device("anon");
    expect((await anon.get(`/api/v1/requests/${ctx.requestId}`)).status).toBe(401);
    expect((await anon.get("/api/v1/jobs/nearby")).status).toBe(401);
  });

  it("klientas be teikėjo profilio nemato svetimų užklausų ir jų nuotraukų", async () => {
    const u = await newUser("smalsus");
    const id = (await ctx.client.post("/api/v1/requests", requestBody({ municipality: "utenos-r" }))).body.id;
    expect((await u.get(`/api/v1/requests/${id}`)).status).toBe(404);
    const own = await ctx.client.get(`/api/v1/requests/${ctx.requestId}`);
    const photo = await u.raw(own.body.request.photos[0].url);
    expect(photo.status).toBe(404);
  });

  it("demonstracinis teikėjas nemato tikrų užklausų", async () => {
    const demo = new Device("demo");
    const login = await demo.post("/api/v1/auth/demo", { as: "tomas" });
    expect(login.status).toBe(200);
    const id = (await ctx.client.post("/api/v1/requests", requestBody())).body.id;
    const jobs = await demo.get("/api/v1/jobs/nearby");
    expect(jobs.body.jobs.map((j: any) => j.id)).not.toContain(id);
    expect(jobs.body.jobs.every((j: any) => j.isDemo)).toBe(true);
    expect((await demo.get(`/api/v1/requests/${id}`)).status).toBe(404);
  });

  it("neteisingi duomenys grąžina aiškią lietuvišką klaidą", async () => {
    const r = await ctx.client.post("/api/v1/requests", requestBody({ municipality: "nera" }));
    expect(r.status).toBe(400);
    expect(r.body.error.message).toBe("Pasirinkite savivaldybę");
  });
});
