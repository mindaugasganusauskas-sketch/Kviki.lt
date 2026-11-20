// API atsakymų tipai. Juos naudoja svetainė ir naudos mobilioji programėlė.
import type { CategoryId } from "./categories";
import type { BusinessForm } from "./format";
import type { Frequency } from "./time";

export type Mode = "client" | "provider";
export type RequestStatus = "open" | "agreed" | "on_hold" | "cancelled" | "completed";
export type OfferStatus = "active" | "withdrawn" | "accepted" | "closed";
export type AgreementStatus = "active" | "completed" | "cancelled" | "ended";
export type VisitStatus = "scheduled" | "done" | "confirmed" | "problem" | "cancelled";
export type PartyRole = "client" | "provider";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  mode: Mode;
  isDemo: boolean;
  isProvider: boolean;
}

export interface ProviderProfileDTO {
  businessForm: BusinessForm;
  displayName: string;
  companyCode: string | null;
  phone: string;
  description: string;
  categories: CategoryId[];
  municipalities: string[];
  verified: boolean;
}

export interface ProviderCardDTO {
  id: string;
  displayName: string;
  businessForm: BusinessForm;
  /** Rodoma tik jei administratorius realiai atliko patikrą. */
  verified: boolean;
  description: string;
}

export interface TimingDTO {
  type: "asap" | "window" | "flexible";
  windowStart: string | null;
  windowEnd: string | null;
}

export interface RecurrenceDTO {
  frequency: Frequency | null;
  startDate: string | null;
  endDate: string | null;
}

export interface PhotoDTO {
  id: string;
  url: string;
}

/** Tai, ką mato bet kuris teikėjas: be tikslaus adreso ir kontaktų. */
export interface RequestPublicDTO {
  id: string;
  category: CategoryId;
  headline: string;
  description: string;
  details: Record<string, unknown>;
  detailLines: string[];
  municipality: string;
  municipalityLabel: string;
  locality: string;
  timing: TimingDTO;
  recurrence: RecurrenceDTO;
  status: RequestStatus;
  version: number;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  photos: PhotoDTO[];
}

export interface RequestPrivateDTO {
  address: string;
  contactPhone: string;
  lat: number | null;
  lng: number | null;
}

export interface OfferDTO {
  id: string;
  requestId: string;
  provider: ProviderCardDTO;
  priceCents: number;
  perVisit: boolean;
  startAt: string;
  included: string;
  status: OfferStatus;
  version: number;
  /** Klientas pakeitė užklausą – teikėjas turi patvirtinti kainą iš naujo. */
  needsReconfirmation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequestOwnerView extends RequestPublicDTO {
  viewer: "owner";
  private: RequestPrivateDTO;
  offers: OfferDTO[];
  activeAgreementId: string | null;
  lastAgreement: { id: string; status: AgreementStatus; cancelledBy: PartyRole | null } | null;
}

export interface RequestProviderView extends RequestPublicDTO {
  viewer: "provider";
  myOffer: OfferDTO | null;
  /** Tik pasirinktam teikėjui. */
  private: RequestPrivateDTO | null;
  myAgreementId: string | null;
  /** Paskutinis šio teikėjo susitarimas dėl užklausos (taip pat ir atšauktas). */
  myLastAgreement: { id: string; status: AgreementStatus; cancelledBy: PartyRole | null } | null;
}

export type RequestView = RequestOwnerView | RequestProviderView;

export interface RequestListItem {
  id: string;
  headline: string;
  category: CategoryId;
  municipalityLabel: string;
  locality: string;
  timing: TimingDTO;
  recurrence: RecurrenceDTO;
  status: RequestStatus;
  offerCount: number;
  activeAgreementId: string | null;
  isDemo: boolean;
  createdAt: string;
}

export interface NearbyJobDTO extends RequestPublicDTO {
  myOffer: OfferDTO | null;
}

export interface VisitDTO {
  id: string;
  seq: number;
  scheduledAt: string;
  status: VisitStatus;
  doneAt: string | null;
  confirmedAt: string | null;
  problemNote: string | null;
  cancelledBy: PartyRole | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface PartyContactDTO {
  name: string;
  phone: string | null;
  email: string;
}

export interface AgreementDTO {
  id: string;
  requestId: string;
  viewerRole: PartyRole;
  status: AgreementStatus;
  category: CategoryId;
  headline: string;
  description: string;
  detailLines: string[];
  municipalityLabel: string;
  locality: string;
  priceCents: number;
  perVisit: boolean;
  frequency: Frequency | null;
  seriesEnd: string | null;
  startAt: string;
  included: string;
  client: PartyContactDTO;
  provider: PartyContactDTO & { businessForm: BusinessForm; verified: boolean };
  location: RequestPrivateDTO;
  visits: VisitDTO[];
  cancelledBy: PartyRole | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  isDemo: boolean;
  createdAt: string;
}

export interface AgreementListItem {
  id: string;
  requestId: string;
  viewerRole: PartyRole;
  status: AgreementStatus;
  headline: string;
  counterpartName: string;
  locality: string;
  municipalityLabel: string;
  priceCents: number;
  perVisit: boolean;
  frequency: Frequency | null;
  nextVisit: VisitDTO | null;
  pendingConfirmation: boolean;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
