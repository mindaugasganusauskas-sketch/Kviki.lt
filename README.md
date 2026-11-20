# Kviki – vietinė pagalba kiemo ir ūkio darbams

Žmogus vieną kartą aprašo, ko reikia (nupjauti pievą, sutvarkyti kiemą, apgenėti gyvatvorę, padėti sukrauti malkas). Netoliese dirbantys teikėjai – įmonės ir individualią veiklą vykdantys žmonės – pasiūlo galutinę kainą ir konkretų laiką. Klientas palygina pasiūlymus ir pasirenka.

Tai pirmoji versija pagal `Talka_projekto_aprasas.md` (darbinis pavadinimas „Talka“ pakeistas į „Kviki“). Šiame etape padaryta **prisitaikanti svetainė**, veikianti ir telefono naršyklėje. Mobiliosios programėlės („Android“ ir „iOS“) yra kitas etapas. Joms jau paruoštas bendras API ir bendri tipai (žr. žemiau).

## Kas veikia

**Klientas**
- Pradeda nuo klausimo „Kokios pagalbos reikia?“: pasirenka vieną iš 5 kategorijų arba rašo laisvu tekstu (kategorija atspėjama automatiškai).
- Mato tik pasirinktai kategorijai aktualius klausimus: pvz., pjovimui – plotą, žolės aukštį, kieno technika, ar reikia surinkti žolę. Jei ploto nežino, gali pažymėti „Nežinau“.
- Nuotraukos: „Fotografuoti“ arba „Iš galerijos“. Telefone jos sumažinamos prieš siunčiant, o serveryje iš jų pašalinami GPS ir kiti EXIF duomenys.
- Vietą gali įvesti ranka arba paspausti „Naudoti mano vietą“. Jei leidimas nesuteiktas, rankinis įvedimas veikia toliau.
- Laikas: „Kuo greičiau“, „Pasirinkti laiką“ (su greitais pasirinkimais „Šiandien“, „Rytoj“, „Šį savaitgalį“) arba „Laikas lankstus“. Periodiniam darbui: dažnis, pradžia ir, jei žinoma, pabaiga.
- Prieš paskelbiant rodoma suvestinė. Pradėti galima ir be paskyros: juodraštis saugomas naršyklėje, o paskyra sukuriama tame pačiame žingsnyje neprarandant duomenų.
- Pasiūlymai palyginami vienoje vietoje: kompiuteryje – lentele, telefone – kortelėmis. Juos galima rikiuoti pagal kainą arba ankstyviausią laiką. Periodiniuose pasiūlymuose kaina visur rodoma „už kartą“.
- Prieš priimant pasiūlymą dar kartą parodoma kaina, data ir sąlygos. Po patvirtinimo abi pusės mato tą pačią užsakymo kortelę.
- Užklausą galima redaguoti (išsaugoma nauja versija) arba atšaukti.

**Teikėjas**
- Registruodamasis pasirenka veiklos formą (įmonė arba individuali veikla), paslaugas ir savivaldybes (visos 60 Lietuvos savivaldybių).
- Skiltyje „Darbai šalia“ mato tik atviras užklausas, kurių kategorija ir savivaldybė sutampa su jo profiliu. Kol klientas jo nepasirenka, jis mato tik gyvenvietę.
- Pasiūlymo formoje nurodo galutinę kainą eurais, pradžią ir kas įskaičiuota. Kol pasiūlymas nepriimtas, jį galima keisti arba atsiimti.
- Skiltyje „Mano darbai“ mato sutartus darbus su adresu, kliento kontaktu ir nuoroda į žemėlapį, taip pat pasiūlymus, kurie laukia kliento sprendimo, ir istoriją.

**Bendra**
- Viena paskyra gali turėti abu vaidmenis. Režimas perjungiamas antraštėje, o ankstesni užsakymai nuo to nesikeičia.
- Pranešimų skiltis su neperskaitytų skaičiumi. Jei sukonfigūruotas SMTP, papildomai siunčiami el. laiškai.
- Puslapiai su užklausomis ir pasiūlymais atsinaujina patys, todėl keliuose įrenginiuose matoma tikroji būsena.
- Visur parodytos laukimo, tuščio sąrašo, ryšio klaidos ir sėkmės būsenos.
- Lietuvių kalba, eurai, „Europe/Vilnius“ laiko juosta (įskaitant vasaros ir žiemos laiko keitimą).

**Užsakymo taisyklės (aprašo 6 skyrius)**

| Situacija | Kaip įgyvendinta |
|---|---|
| Pasiūlymų dar nėra | Rodoma „Kol kas pasiūlymų nėra“ ir siūloma keisti laiką ar apimtį arba atšaukti. Išgalvotų teikėjų nerodoma. |
| Klientas keičia užklausą, kai jau yra pasiūlymų | Ankstesnė versija išsaugoma `job_request_revisions` lentelėje. Seni pasiūlymai pažymimi „Laukiama teikėjo patvirtinimo“ ir jų priimti negalima, kol teikėjas nepatvirtina iš naujo. Teikėjai gauna pranešimą. |
| Teikėjas keičia kainą, kol klientas ją žiūri | Priimant tikrinama pasiūlymo versija. Pasikeitus sąlygoms klientas mato atnaujintą informaciją ir pasirenka iš naujo. |
| Dvigubas paspaudimas arba priėmimas dviejuose įrenginiuose | Užrakinama užklausa (`SELECT … FOR UPDATE`), viskas vyksta vienoje transakcijoje. Unikalus indeksas leidžia tik vieną galiojantį susitarimą vienai užklausai. Pakartotinis to paties pasiūlymo priėmimas grąžina tą patį susitarimą. |
| Pasikartojantis darbas | Vienas susitarimas su kaina už kartą ir dažniu. Kiekvienas vizitas turi savo datą ir būseną. Galima atšaukti vieną vizitą arba nutraukti būsimus; istorija išsaugoma. |
| Atšaukimas po susitarimo | Užfiksuojama, kas ir kada atšaukė bei priežastis, o kita pusė gauna pranešimą. Naują teikėją pasirenka klientas: atgaivinami kitų teikėjų pasiūlymai, bet juos reikia patvirtinti iš naujo. |
| Privatumas | Tikslus adresas ir telefonas laikomi atskiroje lentelėje (`job_request_private`). Serveris juos atiduoda tik klientui ir pasirinktam teikėjui. Teikėjas mato tik savo pasiūlymą. |
| Pranešimų pakartojimas | Kiekvienas pranešimas turi unikalų `dedupe_key`, todėl pakartojus veiksmą nesukuriamas nei antras pranešimas, nei antras užsakymas. |

## Technologijos

- **Next.js 16** (App Router, TypeScript) – svetainė ir API vienoje programoje
- **PostgreSQL 16** + **Drizzle ORM** – duomenys ir migracijos (`drizzle/`)
- **Tailwind CSS 4** – sąsaja
- **sharp** – nuotraukų apdorojimas
- **Zod** – validacija, bendra svetainei, API ir būsimai programėlei
- Prisijungimas el. paštu ir slaptažodžiu (scrypt); sesijos laikomos duomenų bazėje
- **Docker Compose + Caddy** – diegimas su automatiniu HTTPS

```
src/
  shared/        Bendri tipai, validacija, kategorijos, savivaldybės, formatavimas (tinka ir programėlei)
  server/
    db/          Schema, migracijos, demonstraciniai duomenys
    auth/        Slaptažodžiai, sesijos, bandymų ribojimas
    services/    Verslo logika ir prieigos tikrinimas (užklausos, pasiūlymai, susitarimai, pranešimai)
    api.ts       API pagalbininkai (klaidos, CSRF apsauga)
  app/
    api/v1/      REST API (naudoja svetainė, naudos ir programėlė)
    …            Puslapiai: /nauja-uzklausa, /mano-uzklausos, /darbai-salia, /mano-darbai, /susitarimai/…
  components/    Sąsajos komponentai ir užklausos vedlys
tests/           API priėmimo testai, bendrų modulių testai, Playwright E2E
deploy/          Caddyfile ir .env šablonas serveriui
```

Prieiga tikrinama tik serveryje, `src/server/services/`. Ir svetainė, ir API kviečia tas pačias funkcijas.

## Paleidimas savo kompiuteryje

Reikia Node.js 22 ir PostgreSQL 16.

```bash
npm install
cp .env.example .env               # pataisykite DATABASE_URL, jei reikia
npm run db:migrate                 # sukuria lenteles
npm run db:seed-demo               # nebūtina: Paantvardžio demonstracija
npm run dev                        # http://localhost:3000
```

## Testai

Testai kreipiasi į veikiantį serverį su atskira testų duomenų baze:

```bash
createdb kviki_test
DATABASE_URL=postgres://kviki:kviki@localhost:5432/kviki_test npm run db:migrate
npm run build
DATABASE_URL=postgres://kviki:kviki@localhost:5432/kviki_test KVIKI_DISABLE_RATE_LIMIT=1 PORT=3100 npm start

# kitame terminale
npm test              # 41 testas: 8 skyriaus kriterijai per API ir bendri moduliai
npm run test:e2e      # naršyklėje: klientas telefone, kompiuteryje, du teikėjai
```

`TEST_BASE_URL` leidžia testus paleisti prieš kitą adresą, pvz. Docker rinkinį.

## Diegimas į Hostinger VPS

Pakanka vieno VPS. Svetainė, duomenų bazė ir nuotraukos veikia tame pačiame serveryje per Docker, o HTTPS sertifikatą automatiškai gauna Caddy.

**Reikalavimai:** Ubuntu 22.04 arba 24.04, bent 2 GB RAM (Hostinger KVM 1 su 4 GB pakanka), atidaryti 22, 80 ir 443 prievadai.

1. **DNS.** Hostinger skydelyje (hPanel → Domenai → DNS zona) nustatykite `A` įrašus `@` ir `www`, rodančius į VPS IP adresą. Pasikeitimas gali užtrukti iki kelių valandų.

2. **Docker.** Prisijunkite per SSH ir įdiekite Docker:
   ```bash
   ssh root@JUSU_VPS_IP
   curl -fsSL https://get.docker.com | sh
   ```
   Jei hPanel įjungta VPS ugniasienė, leiskite 80 ir 443 prievadus.

3. **Kodas.** Saugykla privati, todėl reikalinga prieiga:
   - paprasčiausia – GitHub „Deploy key“: serveryje `ssh-keygen -t ed25519`, o viešąjį raktą (`~/.ssh/id_ed25519.pub`) įdėkite saugykloje: Settings → Deploy keys;
   - tada:
   ```bash
   git clone git@github.com:mindaugasganusauskas-sketch/Kviki.lt.git /opt/kviki
   cd /opt/kviki
   ```

4. **Nustatymai.**
   ```bash
   cp deploy/env.example .env
   openssl rand -hex 24     # nukopijuokite į POSTGRES_PASSWORD
   nano .env                # DOMAIN=kviki.lt, POSTGRES_PASSWORD=…
   ```

5. **Paleidimas.**
   ```bash
   docker compose up -d --build
   docker compose ps          # visi trys konteineriai turi būti „Up“, app – „healthy“
   ```
   Pirmą kartą surinkimas trunka kelias minutes. Duomenų bazės lentelės sukuriamos automatiškai. Atidarykite `https://kviki.lt`.

6. **Atnaujinimas** po naujų pakeitimų:
   ```bash
   cd /opt/kviki && git pull && docker compose up -d --build
   ```

7. **Atsarginės kopijos** (duomenų bazė ir nuotraukos, laikomos 14 paskutinių):
   ```bash
   chmod +x scripts/backup.sh
   crontab -e
   # įrašykite:
   15 3 * * * cd /opt/kviki && ./scripts/backup.sh >> backups/backup.log 2>&1
   ```
   Kopijos atsiranda kataloge `/opt/kviki/backups/`. Rekomenduojama jas periodiškai kopijuoti ir už serverio ribų.
   Atkūrimas: `docker compose exec -T db pg_restore -U kviki -d kviki --clean < backups/kviki-DATA.dump`.

8. **Žurnalai:** `docker compose logs -f app`

### El. laiškai (nebūtina)

Be SMTP pranešimai rodomi tik svetainės pranešimų skiltyje. Jei norite gauti ir laiškus, Hostinger skydelyje sukurkite pašto dėžutę (pvz., `info@kviki.lt`) ir `.env` faile įrašykite:

```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@kviki.lt
SMTP_PASS=…
```

Tada paleiskite `docker compose up -d`.

### Demonstracija

Kai `DEMO_ENABLED=true`, pradžios puslapyje yra mygtukai „Išbandyti kaip klientas / teikėjas“. Jie atidaro išgalvotą Paantvardžio (Jurbarko r.) užklausą su dviem pasiūlymais: Tomas (individuali veikla) – 90 €, „Žalias kiemas, UAB“ – 75 €. Demonstraciniai įrašai visur pažymėti „DEMO“ ir violetine juosta. Jie atskirti nuo tikrų: demonstracinės paskyros nemato tikrų užklausų, o tikri naudotojai nemato demonstracinių. Kai pradėsite tikrą veiklą, nustatykite `DEMO_ENABLED=false`.

### Patikros ženklas

Ženklas „Patikrinta“ rodomas tik teikėjams, kuriems duomenų bazėje nustatytas `verified_at`. Pirmojoje versijoje administratoriaus sąsajos nėra, todėl ženklas suteikiamas ranka ir tik po realios patikros:

```bash
docker compose exec db psql -U kviki -d kviki -c \
  "update provider_profiles set verified_at = now(), verification_note = 'Patikrintas JAR įrašas' where display_name = 'UAB …';"
```

## API mobiliajai programėlei

Visi veiksmai pasiekiami per `/api/v1`. Svetainė naudoja tuos pačius maršrutus. Programėlė prisijungia su `{"client":"mobile"}` lauku ir gauna raktą, kurį vėliau siunčia antraštėje `Authorization: Bearer …`.

| Veiksmas | Maršrutas |
|---|---|
| Registracija, prisijungimas, atsijungimas | `POST /auth/register`, `/auth/login`, `/auth/logout` |
| Paskyra, režimas, teikėjo profilis | `GET/PATCH /me`, `POST /me/mode`, `GET/PUT /me/provider-profile` |
| Mano užklausos, nauja užklausa (JSON arba multipart su nuotraukomis) | `GET/POST /requests` |
| Užklausa, redagavimas, atšaukimas, atnaujinimas | `GET/PATCH /requests/:id`, `POST /requests/:id/cancel`, `/reopen` |
| Pasiūlymai (klientui – visi, teikėjui – tik savas), pasiūlyti | `GET/POST /requests/:id/offers` |
| Priimti pasiūlymą | `POST /requests/:id/accept` `{offerId, offerVersion}` |
| Keisti, atsiimti pasiūlymą, mano pasiūlymai | `PATCH /offers/:id`, `POST /offers/:id/withdraw`, `GET /me/offers` |
| Darbai šalia | `GET /jobs/nearby` |
| Užsakymai, užsakymas, atšaukimas ar serijos nutraukimas | `GET /agreements?as=client\|provider`, `GET /agreements/:id`, `POST /agreements/:id/cancel` |
| Vizitas: atlikta, patvirtinti, problema, atšaukti | `POST /visits/:id/done`, `/confirm`, `/problem`, `/cancel` |
| Pranešimai | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `/read-all` |

Klaidos grąžinamos formatu `{"error":{"code":"OFFER_CHANGED","message":"…lietuviškai…"}}`.

## Kitas etapas: „Android“ ir „iOS“

Siūloma „React Native“ su „Expo“ (pagal aprašą). Pasiruošimas jau padarytas:
- `src/shared/` neturi priklausomybių nuo serverio ar naršyklės, todėl jį galima perkelti į bendrą paketą (`packages/shared`);
- API palaiko „Bearer“ raktus;
- vietos ir pranešimų leidimai nebūtini: be jų veikia rankinis įvedimas ir pranešimų skiltis.

„Push“ pranešimams reikės „Expo“ paskyros (EAS) ir „Firebase“ projekto (Android). Programėlėms parduotuvėse reikės „Google Play Console“ (vienkartinis 25 $ mokestis) ir „Apple Developer Program“ (99 $ per metus) paskyrų.
