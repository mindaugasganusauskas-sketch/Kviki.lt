// Teikėjo registracija per sąsają ir vaidmens perjungimas vienoje paskyroje.
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("naujas teikėjas užsiregistruoja, pasirenka paslaugas ir savivaldybes, perjungia režimą", async ({ page }) => {
  const email = `naujas-${randomUUID().slice(0, 6)}@e2e.kviki.lt`;
  await page.goto("/registracija?teikejas=1");
  await expect(page.getByRole("heading", { name: "Tapkite teikėju" })).toBeVisible();
  await page.getByLabel("Vardas").fill("Jonas");
  await page.getByLabel("El. paštas").fill(email);
  await page.getByLabel("Slaptažodis").fill("slaptazodis123");
  await page.getByRole("checkbox", { name: /Sutinku su/ }).check();
  await page.getByRole("button", { name: "Sukurti paskyrą" }).click();

  await expect(page.getByRole("heading", { name: "Tapkite teikėju" })).toBeVisible();
  await page.getByRole("radio", { name: /Individuali veikla/ }).click();
  await page.getByLabel("Telefonas").fill("+370 600 11111");
  await page.getByText("Žolės pjovimas").click();
  await page.getByLabel("Ieškoti savivaldybės").fill("jurb");
  await page.getByText("Jurbarko r.").click();
  await page.getByRole("button", { name: "Tapti teikėju ir žiūrėti darbus" }).click();

  await expect(page.getByRole("heading", { name: "Darbai šalia" })).toBeVisible();
  await expect(page.getByText("Žolės pjovimas · Jurbarko r.")).toBeVisible();

  // Ta pati paskyra – kliento režimas. Ankstesni duomenys nesikeičia.
  await page.getByRole("button", { name: /Teikėjas/ }).click();
  await expect(page.getByRole("heading", { name: "Mano užklausos" })).toBeVisible();
  await page.getByRole("button", { name: /Klientas/ }).click();
  await expect(page.getByRole("heading", { name: "Darbai šalia" })).toBeVisible();
});
