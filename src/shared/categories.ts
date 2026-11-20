// Paslaugų kategorijos ir kiekvienai kategorijai aktualūs klausimai, abiem kalbomis.
// Modulis be priklausomybių nuo serverio ar React – tinka ir mobiliajai programėlei.
import { DEFAULT_LOCALE, type Locale } from "./locale";

export const CATEGORY_IDS = ["mowing", "yard", "pruning", "helper", "other"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  hint: string;
}

const CATEGORY_TEXT: Record<Locale, Record<CategoryId, { label: string; hint: string }>> = {
  lt: {
    mowing: { label: "Žolės pjovimas", hint: "Pievos, vejos, pakelės" },
    yard: { label: "Kiemo tvarkymas", hint: "Lapai, šakos, šiukšlės, ravėjimas" },
    pruning: { label: "Medžių ar gyvatvorių genėjimas", hint: "Vaismedžiai, gyvatvorės, krūmai" },
    helper: { label: "Pagalbiniai darbai", hint: "Reikia rankų: nešti, krauti, padėti" },
    other: { label: "Kitas darbas", hint: "Aprašykite savais žodžiais" },
  },
  en: {
    mowing: { label: "Grass mowing", hint: "Meadows, lawns, roadsides" },
    yard: { label: "Yard clean-up", hint: "Leaves, branches, rubbish, weeding" },
    pruning: { label: "Tree or hedge pruning", hint: "Fruit trees, hedges, bushes" },
    helper: { label: "Helping hands", hint: "Carrying, loading, lending a hand" },
    other: { label: "Other job", hint: "Describe it in your own words" },
  },
};

export function categoriesFor(locale: Locale = DEFAULT_LOCALE): CategoryInfo[] {
  return CATEGORY_IDS.map((id) => ({ id, ...CATEGORY_TEXT[locale][id] }));
}

/** Lietuviškas sąrašas (suderinamumui). */
export const CATEGORIES: readonly CategoryInfo[] = categoriesFor("lt");

export function categoryLabel(id: string, locale: Locale = DEFAULT_LOCALE): string {
  return CATEGORY_TEXT[locale][id as CategoryId]?.label ?? (locale === "en" ? "Job" : "Darbas");
}

export function isCategoryId(id: string): id is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(id);
}

// --- Kategorijų detalės -----------------------------------------------------

export const GRASS_HEIGHTS = {
  low: "Žema, iki 10 cm",
  ankle: "Iki kulkšnių",
  knee: "Iki kelių",
  high: "Aukštesnė nei iki kelių",
} as const;
export type GrassHeight = keyof typeof GRASS_HEIGHTS;

export const EQUIPMENT = {
  provider: "Teikėjo technika",
  client: "Mano technika, reikia tik žmogaus",
} as const;
export type Equipment = keyof typeof EQUIPMENT;

export const YARD_TASKS = {
  leaves: "Grėbti lapus",
  branches: "Surinkti šakas",
  weeding: "Ravėti",
  debris: "Išvežti šiukšles",
  cleaning: "Sutvarkyti aplinką po žiemos ar statybų",
} as const;
export type YardTask = keyof typeof YARD_TASKS;

export const PRUNING_TARGETS = {
  trees: "Medžiai",
  hedge: "Gyvatvorė",
  bushes: "Krūmai",
} as const;
export type PruningTarget = keyof typeof PRUNING_TARGETS;

/** Pasirinkimų tekstai abiem kalbomis (raktai sutampa su lietuviškais). */
export const OPTION_TEXT = {
  lt: { grass: GRASS_HEIGHTS, equipment: EQUIPMENT, yardTasks: YARD_TASKS, pruning: PRUNING_TARGETS },
  en: {
    grass: { low: "Short, under 10 cm", ankle: "Ankle-high", knee: "Knee-high", high: "Higher than knees" },
    equipment: { provider: "Provider's equipment", client: "My equipment, just need a person" },
    yardTasks: {
      leaves: "Rake leaves",
      branches: "Collect branches",
      weeding: "Weeding",
      debris: "Take away rubbish",
      cleaning: "Tidy up after winter or building work",
    },
    pruning: { trees: "Trees", hedge: "Hedge", bushes: "Bushes" },
  },
} as const satisfies Record<
  Locale,
  {
    grass: Record<GrassHeight, string>;
    equipment: Record<Equipment, string>;
    yardTasks: Record<YardTask, string>;
    pruning: Record<PruningTarget, string>;
  }
>;

export interface MowingDetails {
  areaAres: number | null;
  grassHeight: GrassHeight;
  collectGrass: boolean;
  equipment: Equipment;
  tractorAccess: boolean;
}

export interface YardDetails {
  tasks: YardTask[];
  areaAres: number | null;
  haulAway: boolean;
}

export interface PruningDetails {
  target: PruningTarget;
  amount: string;
  haulAway: boolean;
}

export interface HelperDetails {
  peopleCount: number;
  durationHours: number | null;
}

export type OtherDetails = Record<string, never>;

export interface DetailsByCategory {
  mowing: MowingDetails;
  yard: YardDetails;
  pruning: PruningDetails;
  helper: HelperDetails;
  other: OtherDetails;
}

export type AnyDetails = DetailsByCategory[CategoryId];

export function defaultDetails<C extends CategoryId>(category: C): DetailsByCategory[C] {
  const defaults: DetailsByCategory = {
    mowing: { areaAres: null, grassHeight: "ankle", collectGrass: false, equipment: "provider", tractorAccess: false },
    yard: { tasks: [], areaAres: null, haulAway: false },
    pruning: { target: "trees", amount: "", haulAway: false },
    helper: { peopleCount: 1, durationHours: null },
    other: {},
  };
  return defaults[category];
}

function num(n: number, locale: Locale): string {
  const s = Number.isInteger(n) ? String(n) : String(n);
  return locale === "lt" ? s.replace(".", ",") : s;
}

function formatAres(a: number, locale: Locale): string {
  return locale === "en" ? `about ${num(a, locale)} ares` : `apie ${num(a, locale)} a`;
}

function people(n: number, locale: Locale): string {
  if (locale === "en") return `${n} ${n === 1 ? "person" : "people"}`;
  return `${n} ${n === 1 ? "žmogus" : n < 10 ? "žmonės" : "žmonių"}`;
}

/** Trumpa antraštė darbų sąrašams, pvz. „Žolės pjovimas · apie 40 a“. */
export function requestHeadline(category: string, details: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const label = categoryLabel(category, locale);
  const d = (details ?? {}) as Record<string, unknown>;
  const o = OPTION_TEXT[locale];
  switch (category) {
    case "mowing":
    case "yard":
      return typeof d.areaAres === "number" ? `${label} · ${formatAres(d.areaAres, locale)}` : label;
    case "pruning": {
      const target = o.pruning[d.target as PruningTarget];
      const amount = typeof d.amount === "string" && d.amount.trim() ? d.amount.trim() : null;
      if (amount) return `${label} · ${amount}`;
      return target ? `${label} · ${target.toLowerCase()}` : label;
    }
    case "helper": {
      const n = typeof d.peopleCount === "number" ? d.peopleCount : 1;
      const hours =
        typeof d.durationHours === "number" ? (locale === "en" ? `, ~${num(d.durationHours, locale)} h` : `, ~${num(d.durationHours, locale)} val.`) : "";
      return `${label} · ${people(n, locale)}${hours}`;
    }
    default:
      return label;
  }
}

/** Apimties eilutės, rodomos užklausos ir užsakymo kortelėse. */
export function describeDetails(category: string, details: unknown, locale: Locale = DEFAULT_LOCALE): string[] {
  const d = (details ?? {}) as Record<string, unknown>;
  const o = OPTION_TEXT[locale];
  const en = locale === "en";
  const lines: string[] = [];
  switch (category) {
    case "mowing": {
      lines.push(
        typeof d.areaAres === "number"
          ? `${en ? "Area" : "Plotas"}: ${formatAres(d.areaAres, locale)}`
          : en
            ? "Area: not known exactly"
            : "Plotas: tiksliai nežinomas",
      );
      const h = o.grass[d.grassHeight as GrassHeight];
      if (h) lines.push(`${en ? "Grass" : "Žolė"}: ${h.toLowerCase()}`);
      lines.push(d.collectGrass ? (en ? "Grass must be collected" : "Žolę reikia surinkti") : en ? "No need to collect grass" : "Žolės surinkti nereikia");
      const eq = o.equipment[d.equipment as Equipment];
      if (eq) lines.push(eq);
      if (d.tractorAccess) lines.push(en ? "A small tractor can drive in" : "Traktoriukas gali įvažiuoti");
      break;
    }
    case "yard": {
      const tasks = Array.isArray(d.tasks) ? (d.tasks as YardTask[]).map((t) => o.yardTasks[t]).filter(Boolean) : [];
      if (tasks.length) lines.push(tasks.join(", "));
      if (typeof d.areaAres === "number") lines.push(`${en ? "Area" : "Plotas"}: ${formatAres(d.areaAres, locale)}`);
      lines.push(d.haulAway ? (en ? "Waste must be taken away" : "Reikia išvežti atliekas") : en ? "No need to take waste away" : "Išvežti nereikia");
      break;
    }
    case "pruning": {
      const target = o.pruning[d.target as PruningTarget];
      if (target) lines.push(`${en ? "What to prune" : "Ką genėti"}: ${target.toLowerCase()}`);
      if (typeof d.amount === "string" && d.amount.trim()) lines.push(`${en ? "Amount" : "Kiekis"}: ${d.amount.trim()}`);
      lines.push(d.haulAway ? (en ? "Branches must be taken away" : "Reikia išvežti šakas") : en ? "No need to take branches away" : "Šakų išvežti nereikia");
      break;
    }
    case "helper": {
      const n = typeof d.peopleCount === "number" ? d.peopleCount : 1;
      lines.push(`${en ? "People needed" : "Reikia žmonių"}: ${n}`);
      lines.push(
        typeof d.durationHours === "number"
          ? en
            ? `Duration: about ${num(d.durationHours, locale)} h`
            : `Trukmė: apie ${num(d.durationHours, locale)} val.`
          : en
            ? "Duration: not known exactly"
            : "Trukmė: tiksliai nežinoma",
      );
      break;
    }
  }
  return lines.filter(Boolean);
}
