// Hand-written response types for the admin surface.
//
// WHY THESE ARE HAND-WRITTEN: the live OpenAPI spec at
// https://api.gadaapp.com/v1/docs-json declares ZERO response content schemas for
// all 26 admin operations — every response is documented as `{ "200": { "description": "" } }`.
// Orval therefore generates `unknown` for every admin return type. These interfaces
// were captured empirically against production on 2026-08-02 and are the only
// source of response typing the app has.
//
// Delete these and switch to generated types only once the backend adds response
// schemas (e.g. @ApiOkResponse({ type: ... })) to the admin controllers.

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  // NOT returned by the API — derived in lib/api/client.ts from total/perPage.
  totalPages: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
// GET /v1/admin/dashboard/stats — verified 2026-08-02. Flat object, not nested.

export interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  publishedEvents: number;
  totalRevenue: number; // kobo
  revenueNaira: number;
  activeVendors: number;
  pendingVolunteers: number;
  checkedInToday: number;
  newUsersToday: number;
  newEventsToday: number;
}

// ─── Charts ───────────────────────────────────────────────────────────────────
// All four chart endpoints take a required `days` query param and return a
// day-by-day time series (one entry per day, ascending). Verified 2026-08-02.

export interface CountPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

// GET /v1/admin/dashboard/chart/events  and  /chart/users
export type EventChartData = CountPoint[];
export type UserGrowthChartData = CountPoint[];

// GET /v1/admin/dashboard/chart/tickets
export interface TicketChartPoint {
  date: string;
  tickets: number;
  revenueKobo: number;
  revenueNaira: number;
}
export type TicketChartData = TicketChartPoint[];

// GET /v1/admin/dashboard/chart/revenue
export interface RevenuePoint {
  date: string;
  revenueKobo: number;
  revenueNaira: number;
}
export type RevenueChartData = RevenuePoint[];

// ─── Events ───────────────────────────────────────────────────────────────────
// NOTE: the admin approval workflow was REMOVED from the API. There is no
// `adminStatus` field and no approve/decline endpoint. `status` below is the
// event's own lifecycle state, and the only admin actions are suspend + delete.

export type AdminEventStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'SUSPENDED'
  | 'COMPLETED';

export type AdminEventCategory =
  | 'FAITH'
  | 'EDUCATION'
  | 'PARTY'
  | 'TECH'
  | 'BUSINESS'
  | 'COMMUNITY';

export interface EventConvener {
  id: string;
  displayName: string;
  email: string;
}

// GET /v1/admin/events — list rows are full event records plus a convener object.
export interface AdminEventSummary {
  id: string;
  convenerId: string;
  name: string;
  description: string | null;
  category: AdminEventCategory | string;
  type: string; // PUBLIC | PRIVATE
  status: AdminEventStatus;
  bannerKey: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  startDate: string;
  endDate: string | null;
  timezone: string | null;
  maxAttendees: number | null;
  isSponsored: boolean;
  requiresApproval: boolean;
  ticketsSold: number;
  checkedInCount: number;
  interestedCount: number;
  totalRevenue: number; // kobo
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  publishedAt: string | null;
  convener: EventConvener | null;
}

export interface AdminEventsListResponse {
  data: AdminEventSummary[];
  meta: PaginationMeta;
}

// GET /v1/admin/events/{id} — same as the list row plus ticket tiers.
export interface AdminEventTicketTier {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  type: 'FREE' | 'PAID' | string;
  priceKobo: number;
  quantity: number;
  sold: number;
}

export interface AdminEventDetail extends AdminEventSummary {
  dressCode: string | null;
  additionalInfo: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  parentEventId: string | null;
  tickets: AdminEventTicketTier[];
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
// GET /v1/admin/calendar?month=YYYY-MM&status= — flat array, no envelope meta.

export interface CalendarEventItem {
  id: string;
  name: string;
  status: AdminEventStatus;
  startDate: string;
  endDate: string | null;
  venue: string | null;
}

export type CalendarData = CalendarEventItem[];

// ─── Conveners ────────────────────────────────────────────────────────────────
// GET /v1/admin/users/conveners — aggregate rows, NOT full user records.

export interface Convener {
  id: string;
  email: string;
  displayName: string;
  photoKey: string | null;
  eventCount: number;
  totalRevenue: number; // kobo
}

export interface ConvenerListResponse {
  data: Convener[];
  meta: PaginationMeta;
}

// ─── Platform users ───────────────────────────────────────────────────────────
// GET /v1/admin/users

export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface PlatformUser {
  id: string;
  email: string;
  displayName: string;
  photoKey: string | null;
  role: string;
  status: UserStatus;
  canConvene: boolean;
  isVendor: boolean;
  isVolunteer: boolean;
  createdAt: string;
}

// ─── Vendors ──────────────────────────────────────────────────────────────────
// GET /v1/admin/vendors. Admin actions: suspend + restore only (no delete).

export type VendorStatus = 'ACTIVE' | 'SUSPENDED';

export interface Vendor {
  id: string;
  userId: string;
  storeName: string;
  ownerName: string;
  email: string;
  phoneNumber: string | null;
  description: string | null;
  /// Vendor's own logo — distinct from `gallery`. Nullable until they set one.
  logoKey: string | null;
  /// First gallery image only, included by the admin list purely as a display
  /// fallback when logoKey is null.
  gallery?: { imageKey: string }[];
  boothAddress: string | null;
  boothLat: number | null;
  boothLng: number | null;
  status: VendorStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VendorListResponse {
  data: Vendor[];
  meta: PaginationMeta;
}

// ─── Tickets ──────────────────────────────────────────────────────────────────
// GET /v1/admin/tickets — read-only, no mutations exist.

export type TicketStatus = 'CONFIRMED' | 'CHECKED_IN' | 'REFUNDED' | 'CANCELLED';

export interface TicketPurchase {
  id: string;
  status: TicketStatus;
  eventName: string;
  buyerEmail: string;
  tierName: string;
  amountKobo: number;
  amountNaira: number;
  createdAt: string;
}

export interface TicketListResponse {
  data: TicketPurchase[];
  meta: PaginationMeta;
}

// ─── Volunteers ───────────────────────────────────────────────────────────────
// GET /v1/admin/volunteers — read-only for admin (no suspend endpoint anymore).

export interface VolunteerApplication {
  id: string;
  userId: string;
  eventId: string;
  roleId: string;
  motivation: string | null;
  skills: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; displayName: string; email: string } | null;
  event: { id: string; name: string } | null;
  role: { id: string; name: string } | null;
}

// ─── Admin accounts ───────────────────────────────────────────────────────────
// GET /v1/admin/admins — flat array, NO pagination meta. Verified 2026-08-02.
// There is no update endpoint: only list, create, delete.

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

// POST /v1/admin/admins
export interface CreateAdminBody {
  email: string;
  password: string;
  name: string;
  isSuperAdmin?: boolean;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// POST /v1/admin/auth/signin — verified 2026-08-02.

export interface AdminSigninResult {
  accessToken: string;
  expiresIn: number;
  admin: AdminProfile;
}

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
}

// ─── Notifications ────────────────────────────────────────────────────────────
// The stored-notification CRUD surface was removed. The ONLY remaining operation
// is a fire-and-forget push broadcast: POST /v1/admin/notifications.
// There is no list endpoint, so there is no notification history to display.

export interface BroadcastBody {
  title: string;
  body: string;
  userIds?: string[]; // omit / empty = broadcast to all users
}

// ─── Safety / SOS ─────────────────────────────────────────────────────────────
// GET /v1/admin/safety/sos — deliberately PII-free: no identity, no
// coordinates. Only GET /v1/admin/safety/sos/{id}/reveal returns those, and
// every reveal call is unconditionally audited server-side (AdminLog
// SOS_REVEALED). Verified against source 2026-08-04.

export interface SosSummaryRow {
  id: string;
  eventId: string | null;
  eventName: string | null;
  alertsSent: number;
  hasLocation: boolean;
  createdAt: string;
}

export interface SosListResponse {
  data: SosSummaryRow[];
  meta: PaginationMeta;
}

export interface SosRevealResult {
  id: string;
  user: { id: string; displayName: string | null; email: string };
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  alertsSent: number;
  eventId: string | null;
  eventName: string | null;
  createdAt: string;
}
