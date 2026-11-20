// Paslaugų kategorijos ir kiekvienai kategorijai aktualūs klausimai.
// Modulis be priklausomybių nuo serverio ar React – tinka ir mobiliajai programėlei.

export const CATEGORY_IDS = ["mowing", "yard", "pruning", "helper", "other"] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  hint: string;
}

export const CATEGORIES: readonly CategoryInfo[] = [
  { id: "mowing", label: "Žolės pjovimas", hint: "Pievos, vejos, pakelės" },
  { id: "yard", label: "Kiemo tvarkymas", hint: "Lapai, šakos, šiukšlės, ravėjimas" },
  { id: "pruning", label: "Medžių ar gyvatvorių genėjimas", hint: "Vaismedžiai, gyvatvorės, krūmai" },
  { id: "helper", label: "Pagalbiniai darbai", hint: "Reikia rankų: nešti, krauti, padėti" },
  { id: "other", label: "Kitas darbas", hint: "Aprašykite savais žodžiais" },
];

const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryLabel(id: string): string {
  return categoryById.get(id as CategoryId)?.label ?? "Darbas";
}

export function isCategoryId(id: string): id is CategoryId {
  return categoryById.has(id as CategoryId);
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

function formatAres(a: number): string {
  const n = Number.isInteger(a) ? String(a) : String(a).replace(".", ",");
  return `apie ${n} a`;
}

/** Trumpa antraštė darbų sąrašams, pvz. „Žolės pjovimas · apie 40 a“. */
export function requestHeadline(category: string, details: unknown): string {
  const label = categoryLabel(category);
  const d = (details ?? {}) as Record<string, unknown>;
  switch (category) {
    case "mowing":
    case "yard":
      return typeof d.areaAres === "number" ? `${label} · ${formatAres(d.areaAres)}` : label;
    case "pruning": {
      const target = PRUNING_TARGETS[d.target as PruningTarget];
      const amount = typeof d.amount === "string" && d.amount.trim() ? d.amount.trim() : null;
      if (amount) return `${label} · ${amount}`;
      return target ? `${label} · ${target.toLowerCase()}` : label;
    }
    case "helper": {
      const people = typeof d.peopleCount === "number" ? d.peopleCount : 1;
      const hours = typeof d.durationHours === "number" ? `, ~${String(d.durationHours).replace(".", ",")} val.` : "";
      return `${label} · ${people} ${people === 1 ? "žmogus" : people < 10 ? "žmonės" : "žmonių"}${hours}`;
    }
    default:
      return label;
  }
}

/** Apimties eilutės, rodomos užklausos ir užsakymo kortelėse. */
export function describeDetails(category: string, details: unknown): string[] {
  const d = (details ?? {}) as Record<string, unknown>;
  const lines: string[] = [];
  switch (category) {
    case "mowing": {
      lines.push(typeof d.areaAres === "number" ? `Plotas: ${formatAres(d.areaAres)}` : "Plotas: tiksliai nežinomas");
      if (d.grassHeight) lines.push(`Žolė: ${GRASS_HEIGHTS[d.grassHeight as GrassHeight]?.toLowerCase() ?? ""}`);
      lines.push(d.collectGrass ? "Žolę reikia surinkti" : "Žolės surinkti nereikia");
      if (d.equipment) lines.push(EQUIPMENT[d.equipment as Equipment] ?? "");
      if (d.tractorAccess) lines.push("Traktoriukas gali įvažiuoti");
      break;
    }
    case "yard": {
      const tasks = Array.isArray(d.tasks) ? (d.tasks as YardTask[]).map((t) => YARD_TASKS[t]).filter(Boolean) : [];
      if (tasks.length) lines.push(tasks.join(", "));
      if (typeof d.areaAres === "number") lines.push(`Plotas: ${formatAres(d.areaAres)}`);
      lines.push(d.haulAway ? "Reikia išvežti atliekas" : "Išvežti nereikia");
      break;
    }
    case "pruning": {
      const target = PRUNING_TARGETS[d.target as PruningTarget];
      if (target) lines.push(`Ką genėti: ${target.toLowerCase()}`);
      if (typeof d.amount === "string" && d.amount.trim()) lines.push(`Kiekis: ${d.amount.trim()}`);
      lines.push(d.haulAway ? "Reikia išvežti šakas" : "Šakų išvežti nereikia");
      break;
    }
    case "helper": {
      const people = typeof d.peopleCount === "number" ? d.peopleCount : 1;
      lines.push(`Reikia žmonių: ${people}`);
      lines.push(
        typeof d.durationHours === "number"
          ? `Trukmė: apie ${String(d.durationHours).replace(".", ",")} val.`
          : "Trukmė: tiksliai nežinoma",
      );
      break;
    }
  }
  return lines.filter(Boolean);
}
