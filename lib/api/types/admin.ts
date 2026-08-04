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
  // Settlement money currently held (awaiting release) vs paid out all-time.
  // Verified against source (AdminService.getStats) 2026-08-04.
  totalHeldKobo: number;
  totalReleasedKobo: number;
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
// GET /v1/admin/users/conveners (list) and GET /v1/admin/users/conveners/{id}
// (detail) — aggregate rows, NOT full user records. Same shape for both list
// row and detail response (AdminService.getConvener returns identical fields
// to listConveners' rows, just for one id). Verified against source
// (AdminService.getConvener) 2026-08-04. `id` here IS the User's own id —
// unlike Vendor, a convener has no separate profile table/id.

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
// GET /v1/admin/users (list, filters: status/role/search) and
// GET /v1/admin/users/{id} (detail). Verified against source
// (AdminService.listUsers / getUser) 2026-08-04. `ninVerified` is the only KYC
// signal admin ever sees — the raw NIN is bcrypt-hashed at rest (User.ninHash)
// and no endpoint anywhere selects or returns it.

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type UserRole = 'USER' | 'ADMIN';

export interface PlatformUser {
  id: string;
  email: string;
  displayName: string | null;
  photoKey: string | null;
  role: UserRole | string;
  status: UserStatus;
  canConvene: boolean;
  isVendor: boolean;
  isVolunteer: boolean;
  ninVerified: boolean;
  createdAt: string;
}

export interface UserListResponse {
  data: PlatformUser[];
  meta: PaginationMeta;
}

// GET /v1/admin/users/{id} — same fields as the list row plus profile detail.
export interface UserDetail extends PlatformUser {
  phoneNumber: string | null;
  bio: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  dateOfBirth: string | null;
  updatedAt: string;
  deletedAt: string | null;
  // VendorProfile.id (NOT the same as this user's own id) — lets the Vendor
  // capability badge link straight to /dashboard/vendors/{vendorProfileId}.
  // null whenever isVendor is false.
  vendorProfileId: string | null;
}

// ─── Vendors ──────────────────────────────────────────────────────────────────
// GET /v1/admin/vendors (list) and GET /v1/admin/vendors/{id} (detail, full
// gallery + products + booth history). Admin actions: suspend + restore only
// (no delete). Verified against source (AdminService.listVendors / getVendor)
// 2026-08-04.

export type VendorStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED';

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

export interface VendorGalleryImage {
  id: string;
  imageKey: string;
  caption: string | null;
  createdAt: string;
}

export interface VendorProduct {
  id: string;
  productName: string;
  description: string | null;
  priceKobo: number;
  thumbnailKey: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VendorBoothEventRef {
  id: string;
  name: string;
}

export interface VendorBooth {
  id: string;
  eventId: string;
  event: VendorBoothEventRef | null;
  latitude: number;
  longitude: number;
  boothNo: string | null;
  createdAt: string;
}

// GET /v1/admin/vendors/{id} — same fields as the list row, but `gallery` is
// the FULL set (not the list's take:1 fallback), plus products and booths.
export interface VendorDetail extends Omit<Vendor, 'gallery'> {
  gallery: VendorGalleryImage[];
  products: VendorProduct[];
  booths: VendorBooth[];
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
// Filters: userId, status, eventId (all optional). Verified against source
// (AdminService.listVolunteers) 2026-08-04.

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

export interface VolunteerListResponse {
  data: VolunteerApplication[];
  meta: PaginationMeta;
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

// ─── Admin action log ─────────────────────────────────────────────────────────
// GET /v1/admin/logs — super-admin only server-side (AdminService.requireSuper
// throws ForbiddenException({code:'SUPER_ADMIN_ONLY', ...}) for non-super
// callers). `action` is a bare string column, not an enum — the full set of
// values the backend currently ever writes (verified against every
// `this.log(...)` / `adminLog.create(...)` call site 2026-08-04):
//   ADMIN_CREATED, ADMIN_DELETED, EVENT_DELETED, EVENT_SUSPENDED,
//   REFUND_PURCHASE, SOS_REVEALED, USER_DELETED, USER_RESTORED,
//   USER_SUSPENDED, VENDOR_RESTORED, VENDOR_SUSPENDED
// New actions can be added server-side without a frontend change — the type
// stays `string`, only the filter dropdown's option list needs updating.

export const ADMIN_LOG_ACTIONS = [
  'ADMIN_CREATED',
  'ADMIN_DELETED',
  'EVENT_DELETED',
  'EVENT_SUSPENDED',
  'REFUND_PURCHASE',
  'SOS_REVEALED',
  'USER_DELETED',
  'USER_RESTORED',
  'USER_SUSPENDED',
  'VENDOR_RESTORED',
  'VENDOR_SUSPENDED',
] as const;

export interface AdminLogRow {
  id: string;
  admin: { id: string; name: string; email: string } | null; // null if the admin account was later deleted
  adminId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface AdminLogListResponse {
  data: AdminLogRow[];
  meta: PaginationMeta;
}

// ─── Settlements ──────────────────────────────────────────────────────────────
// GET /v1/admin/settlements and /v1/admin/settlements/{id} — read-only, backed
// by the EventPayout table. Admin sees paystackTransferCode unconditionally
// (unlike the convener-facing view, which hides it until RELEASED). Verified
// against source (AdminService.mapAdminSettlement / listSettlements /
// getSettlement) 2026-08-04.

export type SettlementStatus = 'HELD' | 'RELEASED' | 'FAILED';

export interface SettlementEventRef {
  id: string;
  name: string;
}

export interface SettlementConvener {
  id: string;
  name: string;
  email: string;
}

export interface Settlement {
  id: string;
  event: SettlementEventRef | null;
  convener: SettlementConvener | null;
  amountKobo: number;
  status: SettlementStatus;
  releasedAt: string | null;
  paystackTransferCode: string | null;
  createdAt: string;
}

export interface SettlementListResponse {
  data: Settlement[];
  meta: PaginationMeta;
}

// Contributing-transaction line item — the Payments (SUCCESS/REFUNDED) that
// funded this settlement's event, mirroring the convener earnings report.
export interface SettlementTransaction {
  id: string;
  eventId: string;
  eventName: string | null;
  buyerName: string;
  amountKobo: number;
  netKobo: number;
  status: 'SUCCESS' | 'REFUNDED' | string;
  createdAt: string;
}

export interface SettlementDetail extends Settlement {
  transactions: SettlementTransaction[];
}
