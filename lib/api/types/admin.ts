// Hand-written from live API introspection — do not replace with generated code.

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  users: {
    total: number;
    conveners: number;
    vendors: number;
    volunteers: number;
  };
  gadarings: {
    total: number;
    active: number;
    past: number;
    upcoming: number;
  };
  tickets: {
    totalPurchases: number;
  };
  reviews: {
    pending: number;
  };
  revenue: {
    totalKobo: number;
  };
}

// chart/events: single object with event counts by state
export interface EventChartData {
  active: number;
  past: number;
  upcoming: number;
  total: number;
}

// chart/users: 12-item array, one entry per calendar month
export interface UserGrowthDataPoint {
  month: number; // 1–12
  users: number;
  conveners: number;
  vendors: number;
}

export type UserGrowthChartData = UserGrowthDataPoint[];

// ─── Events list ──────────────────────────────────────────────────────────────

export type AdminEventStatus = 'DRAFT' | 'UPCOMING' | 'ONGOING' | 'PAST';
export type AdminStatus = 'PENDING' | 'APPROVED' | 'DECLINED';

export interface AdminEventSummary {
  id: string;
  title: string;
  status: AdminEventStatus;
  adminStatus: AdminStatus;
  createdAt: string;
  startDate: string;
  endDate?: string;
  convener?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

// Paginated events list — customInstance returns { data, meta } when meta present
export interface AdminEventsListResponse {
  data: AdminEventSummary[];
  meta: PaginationMeta;
}

// ─── Event detail ─────────────────────────────────────────────────────────────

export interface AdminTicket {
  id: string;
  name: string;
  quantity: number;
  price: number; // in kobo (0 = free)
  ticketCategory?: string; // SINGLE | GROUP | etc.
}

export interface AdminAssignee {
  id: string;
  name: string;
  role: string;
}

export interface AdminEventDetail {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  status: AdminEventStatus;
  adminStatus: AdminStatus;
  ticketType?: 'FREE' | 'PAID';
  startDate: string;
  endDate?: string;
  location?: {
    address?: string;
    lat?: number;
    lng?: number;
  };
  convener?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  tickets?: AdminTicket[];
  assignees?: AdminAssignee[];
  createdAt: string;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export interface CalendarEventItem {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  status?: AdminEventStatus;
  adminStatus?: AdminStatus;
}

export interface CalendarData {
  events: CalendarEventItem[];
  pendingRequests: CalendarEventItem[];
}

// ─── Tickets ──────────────────────────────────────────────────────────────────
// Live endpoint GET /v1/admin/tickets returned empty list (dev env).
// Fields typed from spec docstring: "ticket tier, purchase price (in kobo), payment provider,
// check-in status; searchable by ticket holder name or event name."
// All fields marked // unverified-from-spec — remove comments once live data confirms.
// Confirmed params: search ✅, startDate/endDate ✅; status param → 500 (not exposed).
// No ticket mutations in spec — screen is READ-ONLY.

export interface TicketPurchase {
  id: string;                         // unverified-from-spec
  buyerName?: string;                 // unverified-from-spec ("ticket holder name")
  buyerEmail?: string;                // unverified-from-spec
  eventTitle?: string;                // unverified-from-spec ("event name")
  eventId?: string;                   // unverified-from-spec
  ticketName?: string;                // unverified-from-spec ("ticket tier")
  ticketType?: string;                // unverified-from-spec (REGULAR | VIP | TABLE | etc.)
  price: number;                      // unverified-from-spec — KOBO, divide by 100 for naira
  paymentProvider?: string;           // unverified-from-spec
  checkedIn?: boolean;                // unverified-from-spec ("check-in status")
  status?: string;                    // unverified-from-spec
  createdAt: string;                  // unverified-from-spec
}

// Paginated ticket purchase list — customInstance returns { data, meta } at envelope level
export interface TicketListResponse {
  data: TicketPurchase[];
  meta: PaginationMeta;
}

// ─── Conveners ────────────────────────────────────────────────────────────────
// Live endpoint GET /v1/admin/users/conveners returned empty list (dev env).
// Fields typed from spec docstrings + event convener sub-object shape.
// All fields marked // unverified-from-spec — remove comments once live data confirms.
// Spec note: endpoint is "always filtered to ACTIVE status"; no status filter dropdown.

export type ConvenerStatus = 'ACTIVE' | 'SUSPENDED'; // unverified-from-spec

export interface Convener {
  id: string;                  // unverified-from-spec
  name: string;                // unverified-from-spec
  email: string;               // unverified-from-spec
  phone?: string;              // unverified-from-spec
  status: ConvenerStatus;      // unverified-from-spec
  createdAt: string;           // unverified-from-spec
  gadaId?: string;             // unverified-from-spec (search searches GADA IDs per spec)
}

// Paginated convener list — customInstance returns { data, meta } at envelope level
export interface ConvenerListResponse {
  data: Convener[];
  meta: PaginationMeta;
}

// ─── Vendors ──────────────────────────────────────────────────────────────────
// Live endpoint returned an empty list; fields typed from spec docstrings.
// All fields marked // unverified-from-spec — remove comments once live data confirms.

export type VendorStatus = 'ACTIVE' | 'SUSPENDED'; // unverified-from-spec

export interface Vendor {
  id: string;             // unverified-from-spec
  storeName: string;      // unverified-from-spec
  ownerName: string;      // unverified-from-spec
  email: string;          // unverified-from-spec
  phoneNumber?: string;   // unverified-from-spec
  boothAddress?: string;  // unverified-from-spec
  status: VendorStatus;   // unverified-from-spec
  createdAt: string;      // unverified-from-spec
}

// Paginated vendor list — customInstance returns { data, meta } at envelope level
export interface VendorListResponse {
  data: Vendor[];
  meta: PaginationMeta;
}

// ─── Admin users ──────────────────────────────────────────────────────────────
// Live-verified 2026-06-12: GET /v1/admin/admins returns flat array (no meta/pagination).
// DELETE is permanent (irreversible). PATCH edits only role+status, not name/email.
// All admin management operations require SUPER_ADMIN role.

export type AdminUserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';
export type AdminUserStatus = 'ACTIVE' | 'SUSPENDED';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────
// Live endpoint + POST/PATCH response verified 2026-06-12.

export type NotificationStatus = 'PENDING' | 'SENT';

export interface AdminNotification {
  id: string;
  createdByAdminId: string;
  title: string;
  description: string;
  endUsers: string[];       // ["ALL"] = broadcast; otherwise array of user IDs
  scheduledDate: string;    // ISO 8601 — future = scheduled, past/present = sent immediately
  status: NotificationStatus;
  createdAt: string;
}

export interface NotificationListResponse {
  data: AdminNotification[];
  meta: PaginationMeta;
}

// POST /v1/admin/notifications — all fields required
export interface CreateNotificationDto {
  title: string;
  description: string;
  endUsers: string[];
  scheduledDate: string;
}

// PATCH /v1/admin/notifications/{id} — all fields optional; only works on PENDING rows
// Note: generated adminControllerUpdateAdminNotification drops the body param (spec gen bug);
// pass body via RequestInit options — see NotificationsList.tsx
export interface UpdateNotificationDto {
  title?: string;
  description?: string;
  endUsers?: string[];
  scheduledDate?: string;
}
