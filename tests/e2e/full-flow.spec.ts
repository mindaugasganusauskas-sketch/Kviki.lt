// Visas vienkartinio darbo kelias naršyklėje: klientas telefone, kompiuteryje ir du teikėjai skirtingose sesijose.
import { devices, expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import path from "node:path";
import { randomUUID } from "node:crypto";

const SHOTS = process.env.SCREENSHOT_DIR;
const uid = () => randomUUID().slice(0, 6);

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
}

async function apiProvider(browser: Browser, name: string, form: "company" | "individual", categories: string[]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const email = `teikejas-${uid()}@e2e.kviki.lt`;
  await page.goto("/");
  const reg = await page.request.post("/api/v1/auth/register", {
    data: { name, email, password: "slaptazodis123", acceptTerms: true },
    headers: { Origin: new URL(page.url()).origin },
  });
  expect(reg.ok()).toBeTruthy();
  const prof = await page.request.put("/api/v1/me/provider-profile", {
    data: { businessForm: form, displayName: name, phone: "+37062222222", description: "", categories, municipalities: ["jurbarko-r"] },
    headers: { Origin: new URL(page.url()).origin },
  });
  expect(prof.ok()).toBeTruthy();
  return { ctx, page };
}

test("klientas telefone paskelbia darbą, du teikėjai pasiūlo, klientas pasirenka", async ({ browser }) => {
  const clientEmail = `klientas-${uid()}@e2e.kviki.lt`;

  // --- 1. Klientas telefone (be vietos leidimo) ---
  const phoneCtx: BrowserContext = await browser.newContext({ ...devices["iPhone 13"], locale: "lt-LT", timezoneId: "Europe/Vilnius" });
  const phone = await phoneCtx.newPage();
  await phone.goto("/");
  await expect(phone.getByRole("heading", { name: "Kokios pagalbos reikia?" })).toBeVisible();
  await shot(phone, "01-pradzia-telefone");
  await phone.getByRole("link", { name: /Žolės pjovimas/ }).first().click();

  await expect(phone.getByRole("heading", { name: "Darbo apimtis" })).toBeVisible();
  await phone.getByLabel("Apytikslis plotas").fill("40");
  await phone.getByRole("radio", { name: "Iki kelių", exact: true }).click();
  await phone.getByText("Traktoriukas gali įvažiuoti").click();
  await phone.getByLabel("Papildomai").fill("Traktoriukas gali įvažiuoti pro vartus. Žolės surinkti nereikia.");
  await phone.getByTestId("photo-input").setInputFiles(path.join(__dirname, "../fixtures/pieva.jpg"));
  await expect(phone.getByAltText("Nauja nuotrauka 1")).toBeVisible();
  await shot(phone, "02-apimtis");
  await phone.getByRole("button", { name: /Toliau/ }).click();

  await expect(phone.getByRole("heading", { name: "Kur ir kada?" })).toBeVisible();
  // Vietos leidimas nesuteiktas – programėlė turi leisti įvesti ranka.
  await phone.getByRole("button", { name: "Naudoti mano vietą" }).click();
  await expect(phone.getByText(/įveskite (vietą|ją) ranka/)).toBeVisible();
  await phone.getByLabel("Savivaldybė").selectOption("jurbarko-r");
  await phone.getByLabel("Gyvenvietė ar vietovė").fill("Paantvardys");
  await phone.getByLabel("Tikslus adresas arba kaip rasti").fill("Sodų g. 7, Paantvardys");
  await phone.getByLabel("Telefonas susisiekti").fill("+370 612 34567");
  await phone.getByRole("radio", { name: "Pasirinkti laiką" }).click();
  await phone.getByRole("button", { name: "Rytoj", exact: true }).click();
  await shot(phone, "03-vieta-laikas");
  await phone.getByRole("button", { name: /Peržiūrėti/ }).click();

  await expect(phone.getByRole("heading", { name: "Patikrinkite ir paskelbkite" })).toBeVisible();
  await expect(phone.getByText("Žolės pjovimas · apie 40 a")).toBeVisible();
  await phone.getByLabel("Vardas").fill("Rūta");
  await phone.getByLabel("El. paštas").fill(clientEmail);
  await phone.getByLabel("Slaptažodis").fill("slaptazodis123");
  await phone.getByRole("checkbox", { name: /Sutinku su/ }).check();
  await shot(phone, "04-perziura-ir-paskyra");
  await phone.getByRole("button", { name: "Sukurti paskyrą ir paskelbti" }).click();

  await expect(phone.getByText("Užklausa paskelbta")).toBeVisible();
  await expect(phone.getByText("Kol kas pasiūlymų nėra")).toBeVisible();
  const requestUrl = new URL(phone.url());
  const requestId = requestUrl.pathname.split("/").pop()!;
  await shot(phone, "05-paskelbta");

  // --- 2. Tas pats klientas kompiuteryje ---
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const desktop = await desktopCtx.newPage();
  await desktop.goto("/prisijungti");
  await desktop.getByLabel("El. paštas").fill(clientEmail);
  await desktop.getByLabel("Slaptažodis").fill("slaptazodis123");
  await desktop.getByRole("button", { name: "Prisijungti" }).click();
  await desktop.waitForURL((u) => u.pathname === "/");
  await desktop.goto("/mano-uzklausos");
  await expect(desktop.getByText("Žolės pjovimas · apie 40 a")).toBeVisible();
  await expect(desktop.getByText("Paantvardys, Jurbarko r.")).toBeVisible();
  await shot(desktop, "06-kompiuteryje-mano-uzklausos");

  // --- 3. Teikėjai ---
  const tomas = await apiProvider(browser, "Tomas", "individual", ["mowing"]);
  const imone = await apiProvider(browser, "Žalias kiemas UAB", "company", ["mowing", "yard"]);
  const genetojas = await apiProvider(browser, "Genėtojas", "individual", ["pruning"]);

  await genetojas.page.goto("/darbai-salia");
  await expect(genetojas.page.getByText("Šiuo metu tinkamų darbų nėra")).toBeVisible();

  await tomas.page.goto("/darbai-salia");
  await expect(tomas.page.getByText("Žolės pjovimas · apie 40 a").first()).toBeVisible();
  await shot(tomas.page, "07-teikejas-darbai-salia");
  await tomas.page.goto(`/darbai-salia/${requestId}`);
  await expect(tomas.page.getByText("Tikslų adresą ir kliento kontaktą pamatysite")).toBeVisible();
  await expect(tomas.page.getByText("Sodų g. 7")).toHaveCount(0);
  await tomas.page.getByLabel("Galutinė kaina klientui").fill("90");
  await tomas.page.getByLabel("Laikas").fill("17:00");
  await tomas.page.getByRole("button", { name: "Atvykimas" }).click();
  await tomas.page.getByRole("button", { name: "Darbas savo technika" }).click();
  await shot(tomas.page, "08-pasiulymo-forma");
  await tomas.page.getByRole("button", { name: "Pateikti pasiūlymą" }).click();
  await expect(tomas.page.getByText("Jūsų pasiūlymas")).toBeVisible();

  await imone.page.goto(`/darbai-salia/${requestId}`);
  await imone.page.getByLabel("Galutinė kaina klientui").fill("75");
  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vilnius" }).format(new Date(Date.now() + 86400000));
  await imone.page.getByLabel("Galiu pradėti").fill(tomorrow);
  await imone.page.getByLabel("Laikas").fill("09:00");
  await imone.page.getByLabel("Kas įskaičiuota").fill("Atvykimas ir pjovimas savo technika");
  await imone.page.getByRole("button", { name: "Pateikti pasiūlymą" }).click();
  await expect(imone.page.getByText("Jūsų pasiūlymas")).toBeVisible();

  // --- 4. Klientas telefone palygina ir pasirenka ---
  await phone.goto(`/uzklausos/${requestId}`);
  await expect(phone.getByTestId("offer-card")).toHaveCount(2);
  await expect(phone.getByTestId("offer-card").getByText("Pigiausia", { exact: true })).toBeVisible();
  await shot(phone, "09-pasiulymai-telefone");
  await desktop.goto(`/uzklausos/${requestId}`);
  await expect(desktop.getByTestId("offer-row")).toHaveCount(2);
  await shot(desktop, "10-pasiulymai-kompiuteryje");

  await phone.getByRole("button", { name: "Anksčiausi" }).click();
  const tomasCard = phone.getByTestId("offer-card").filter({ hasText: "Tomas" });
  await tomasCard.getByRole("button", { name: "Pasirinkti" }).click();
  await expect(phone.getByRole("heading", { name: "Patvirtinti susitarimą?" })).toBeVisible();
  await shot(phone, "11-patvirtinimas");
  await phone.getByRole("button", { name: /Patvirtinti už 90/ }).click();
  await expect(phone.getByText("Susitarta!")).toBeVisible();
  await shot(phone, "12-uzsakymo-kortele-klientas");

  // Kompiuteryje rodoma tikroji būsena.
  await desktop.goto(`/uzklausos/${requestId}`);
  await expect(desktop.getByText("Dėl darbo sutarta")).toBeVisible();

  // --- 5. Pasirinktas teikėjas mato adresą, kitas – ne ---
  await tomas.page.goto("/mano-darbai");
  await expect(tomas.page.getByText("Sutarti darbai")).toBeVisible();
  await tomas.page.getByRole("link", { name: /Žolės pjovimas/ }).first().click();
  await expect(tomas.page.getByText("Sodų g. 7, Paantvardys")).toBeVisible();
  await expect(tomas.page.getByText("+37061234567")).toBeVisible();
  await shot(tomas.page, "13-uzsakymo-kortele-teikejas");
  await tomas.page.getByRole("button", { name: "Pažymėti atliktu" }).click();
  await expect(tomas.page.getByText("Laukiama, kol klientas patvirtins rezultatą.")).toBeVisible();

  await imone.page.goto(`/darbai-salia/${requestId}`);
  await expect(imone.page.getByRole("status").getByText("Užklausa baigėsi")).toBeVisible();
  await expect(imone.page.getByText("Sodų g. 7")).toHaveCount(0);
  await shot(imone.page, "14-kitas-teikejas");

  // --- 6. Klientas patvirtina rezultatą ---
  await phone.reload();
  await phone.getByRole("button", { name: "Patvirtinti rezultatą" }).click();
  await expect(phone.getByText("Darbas užbaigtas")).toBeVisible();
  await phone.goto("/pranesimai");
  await shot(phone, "15-pranesimai");

  for (const c of [phoneCtx, desktopCtx, tomas.ctx, imone.ctx, genetojas.ctx]) await c.close();
});
