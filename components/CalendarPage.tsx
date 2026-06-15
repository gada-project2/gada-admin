"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useAdminControllerGetCalendarData } from "@/lib/api/generated/admin/admin";
import type { CalendarData, CalendarEventItem } from "@/lib/api/types/admin";
import Spinner from "@/components/ui/Spinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "Day" | "Week" | "Month";
type RequestTab = "All Event" | "Approved" | "Declined";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const CELL_HEIGHT = 52;
const START_HOUR  = 6;
const END_HOUR    = 15;
const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDays(anchor: Date) {
  const d = new Date(anchor);
  d.setDate(anchor.getDate() - anchor.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day;
  });
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDay.getDay()).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isoDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatEventDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return iso; }
}

function startHourOf(iso?: string): number {
  if (!iso) return START_HOUR;
  try { return new Date(iso).getHours(); } catch { return START_HOUR; }
}

function endHourOf(startIso?: string, endIso?: string): number {
  if (endIso) {
    try { return new Date(endIso).getHours() + new Date(endIso).getMinutes() / 60; } catch {}
  }
  return startHourOf(startIso) + 1;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ViewToggle({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <div className="flex rounded-full overflow-hidden border border-gada-border-light">
      {(["Day", "Week", "Month"] as View[]).map((v) => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={`px-4 py-1.5 text-sm font-medium transition-colors ${
            v === view
              ? "bg-gada-dark text-white"
              : "bg-white text-gada-text-secondary"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function UpcomingEventCard({ ev }: { ev: CalendarEventItem }) {
  const isActive = ev.adminStatus === "APPROVED";
  return (
    <div className="flex rounded-xl overflow-hidden bg-white shadow-sm">
      <div className={`w-1.5 shrink-0 rounded-l-xl ${isActive ? "bg-gada-accent" : "bg-gada-avatar"}`} />
      <div className="flex-1 px-4 py-3 flex flex-col gap-1">
        <p className="text-sm font-bold text-gray-800">{ev.title}</p>
        <p className="text-xs font-medium text-gray-600">
          {formatEventDate(ev.startDate)}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gada-text-muted">{ev.status ?? "—"}</p>
          <Link
            href={`/dashboard/event-moderation/${ev.id}`}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white ${
              isActive ? "bg-gada-accent" : "bg-gada-avatar"
            }`}
          >
            <Eye size={11} />
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const [anchor, setAnchor] = useState(today);
  const [view,   setView]   = useState<View>("Week");
  const [tab,    setTab]    = useState<RequestTab>("All Event");

  const weekDays = getWeekDays(anchor);

  // Fetch calendar data for the current month/year; re-fetches automatically when anchor changes month
  const { data: raw, isLoading, isError, refetch } = useAdminControllerGetCalendarData({
    month: anchor.getMonth() + 1,
    year:  anchor.getFullYear(),
  });

  const calData = raw as unknown as CalendarData | undefined;

  // Build date→event list for grid rendering
  const eventsByDayKey: Record<string, Array<{ ev: CalendarEventItem; color: string; textColor: string }>> = {};
  calData?.events.forEach((ev) => {
    const key = isoDateKey(ev.startDate);
    (eventsByDayKey[key] ??= []).push({ ev, color: "#e5e7eb", textColor: "#374151" });
  });
  calData?.pendingRequests.forEach((ev) => {
    const key = isoDateKey(ev.startDate);
    (eventsByDayKey[key] ??= []).push({ ev, color: "#fde68a", textColor: "#92400e" });
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  function prevUnit() {
    const d = new Date(anchor);
    if (view === "Day")        d.setDate(d.getDate() - 1);
    else if (view === "Week")  d.setDate(d.getDate() - 7);
    else                       { d.setDate(1); d.setMonth(d.getMonth() - 1); }
    setAnchor(d);
  }

  function nextUnit() {
    const d = new Date(anchor);
    if (view === "Day")        d.setDate(d.getDate() + 1);
    else if (view === "Week")  d.setDate(d.getDate() + 7);
    else                       { d.setDate(1); d.setMonth(d.getMonth() + 1); }
    setAnchor(d);
  }

  function goToday() { setAnchor(new Date()); }

  // ── Header label ───────────────────────────────────────────────────────────

  function headerLabel() {
    if (view === "Day") {
      return anchor.toLocaleDateString("en-US", {
        weekday: "short", month: "long", day: "numeric", year: "numeric",
      });
    }
    return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }

  const allUpcoming = calData?.events ?? [];
  const allRequests = calData?.pendingRequests ?? [];

  const filteredRequests = allRequests.filter((e) => {
    if (tab === "Approved") return e.adminStatus === "APPROVED";
    if (tab === "Declined") return e.adminStatus === "DECLINED";
    return true;
  });

  // ── Month view ─────────────────────────────────────────────────────────────

  function renderMonth() {
    const cells = getMonthGrid(anchor.getFullYear(), anchor.getMonth());
    const weeks = cells.length / 7;
    return (
      <div className="flex flex-col overflow-hidden rounded-lg border border-gada-border-light">
        <div className="grid grid-cols-7 border-b border-gada-border-light">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gada-text-muted">
              {d}
            </div>
          ))}
        </div>
        {Array.from({ length: weeks }, (_, week) => (
          <div key={week} className="grid grid-cols-7">
            {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
              if (!day) {
                return (
                  <div
                    key={i}
                    className="h-24 border-r border-b border-gada-border-light bg-gada-surface-card"
                  />
                );
              }
              const key = dateKey(day);
              const isToday = key === dateKey(today);
              const dayEvents = eventsByDayKey[key] ?? [];
              return (
                <div
                  key={i}
                  className="h-24 border-r border-b border-gada-border-light p-1 overflow-hidden bg-white"
                >
                  <div
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-0.5 ${
                      isToday ? "bg-gada-dark text-white" : "text-gada-text-primary"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayEvents.slice(0, 2).map(({ ev, color, textColor }, j) => (
                      <div
                        key={j}
                        className="rounded px-1 text-xs truncate leading-tight"
                        style={{ backgroundColor: color, color: textColor }}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-xs text-gada-text-muted">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // ── Week view ──────────────────────────────────────────────────────────────

  function renderWeek() {
    return (
      <>
        <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
          <div />
          {weekDays.map((d) => {
            const isToday = dateKey(d) === dateKey(today);
            return (
              <div key={d.toISOString()} className="flex flex-col items-center py-1">
                <span className="text-xs text-gada-text-muted font-medium">{DAYS[d.getDay()]}</span>
                <div
                  className={`w-7 h-7 mt-1 flex items-center justify-center rounded-full text-sm font-semibold ${
                    isToday
                      ? "border-2 border-gada-dark text-gada-dark"
                      : "text-gada-text-primary"
                  }`}
                >
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative overflow-y-auto" style={{ maxHeight: 420 }}>
          {hours.map((hour) => (
            <div
              key={hour}
              className="grid"
              style={{ gridTemplateColumns: "56px repeat(7, 1fr)", height: CELL_HEIGHT }}
            >
              <div className="flex items-start justify-end pr-3 pt-1">
                <span className="text-xs text-gada-text-muted">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
              {weekDays.map((_, dayIdx) => (
                <div
                  key={dayIdx}
                  className="border-t border-l border-gada-border-light"
                />
              ))}
            </div>
          ))}

          {weekDays.map((d, dayIdx) => {
            const key = dateKey(d);
            return (eventsByDayKey[key] ?? []).map(({ ev, color, textColor }, i) => {
              const startH = Math.max(startHourOf(ev.startDate), START_HOUR);
              const endH   = Math.min(endHourOf(ev.startDate, ev.endDate), END_HOUR);
              const top    = (startH - START_HOUR) * CELL_HEIGHT;
              const height = Math.max((endH - startH) * CELL_HEIGHT - 4, 20);
              const colW   = `calc((100% - 56px) / 7)`;
              const left   = `calc(56px + ${dayIdx} * ${colW})`;
              return (
                <div
                  key={`${key}-${i}`}
                  className="absolute rounded-lg px-2 py-1 text-xs font-medium leading-tight overflow-hidden cursor-pointer"
                  style={{
                    top, left,
                    width: `calc((100% - 56px) / 7 - 4px)`,
                    height,
                    backgroundColor: color,
                    color: textColor,
                    zIndex: 10,
                  }}
                >
                  {ev.title}
                </div>
              );
            });
          })}
        </div>
      </>
    );
  }

  // ── Day view ───────────────────────────────────────────────────────────────

  function renderDay() {
    const key = dateKey(anchor);
    const dayEvents = eventsByDayKey[key] ?? [];
    if (dayEvents.length === 0) {
      return <EmptyState label="No events this day" />;
    }
    return (
      <div className="flex flex-col gap-3" style={{ minHeight: 300 }}>
        {dayEvents.map(({ ev, color, textColor }, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl p-3 border border-gada-border-light bg-white"
          >
            <div
              className="w-1 self-stretch rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gada-text-primary">{ev.title}</p>
              <p className="text-xs text-gada-text-muted mt-0.5">
                {formatEventDate(ev.startDate)}
                {ev.endDate ? ` – ${formatEventDate(ev.endDate)}` : ""}
              </p>
              {ev.status && (
                <p className="text-xs text-gada-text-secondary mt-0.5">{ev.status}</p>
              )}
            </div>
            {ev.adminStatus && (
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
                style={
                  ev.adminStatus === "APPROVED"
                    ? { backgroundColor: "#dcfce7", color: "#16a34a" }
                    : ev.adminStatus === "DECLINED"
                    ? { backgroundColor: "#fee2e2", color: "#dc2626" }
                    : { backgroundColor: "#fef9c3", color: "#ca8a04" }
                }
              >
                {ev.adminStatus.charAt(0) + ev.adminStatus.slice(1).toLowerCase()}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Top row: Calendar + Upcoming Events ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

        {/* Calendar card */}
        <div className="rounded-2xl p-5 flex flex-col gap-4 bg-white border-2 border-blue-400">
          {/* Calendar header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-gray-800">Calendar</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={prevUnit}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100 border border-gada-border-light"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-semibold text-gray-700 min-w-[120px] text-center">
                  {headerLabel()}
                </span>
                <button
                  onClick={nextUnit}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100 border border-gada-border-light"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={goToday}
                  className="px-3 py-1 rounded-full text-xs font-medium border border-gada-border-light text-gada-text-secondary hover:bg-gray-50 transition-colors"
                >
                  Today
                </button>
              </div>
              <ViewToggle view={view} setView={setView} />
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center" style={{ height: 420 }}>
              <Spinner size={28} />
            </div>
          )}

          {isError && (
            <ErrorState message="Failed to load calendar." onRetry={refetch} />
          )}

          {!isLoading && !isError && (
            view === "Month" ? renderMonth() :
            view === "Week"  ? renderWeek()  :
                               renderDay()
          )}
        </div>

        {/* Upcoming Events */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Upcoming Events</h2>
            <p className="text-xs text-gada-text-muted mt-0.5">Don&apos;t miss important events</p>
          </div>
          {isLoading && <Spinner size={24} />}
          {!isLoading && allUpcoming.length === 0 && (
            <EmptyState label="No upcoming events this month" />
          )}
          <div className="flex flex-col gap-3">
            {allUpcoming.map((ev) => (
              <UpcomingEventCard key={ev.id} ev={ev} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Events Request ── */}
      <div className="rounded-2xl p-5 flex flex-col gap-4 bg-gada-surface-card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">Events Request</h2>
            <p className="text-xs text-gada-text-muted mt-0.5">Lists of all request for event.</p>
          </div>

          <div className="flex items-center rounded-full px-1.5 py-1.5 gap-1 bg-white">
            {(["All Event", "Approved", "Declined"] as RequestTab[]).map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    active
                      ? "bg-gada-dark text-white"
                      : t === "Declined"
                        ? "bg-transparent text-gada-danger"
                        : "bg-transparent text-gada-text-secondary"
                  }`}
                >
                  {t === "All Event" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  )}
                  {t === "Approved" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                  {t === "Declined" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  )}
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Spinner size={24} />
          </div>
        )}
        {isError && (
          <ErrorState message="Failed to load event requests." onRetry={refetch} />
        )}
        {!isLoading && !isError && (
          <div className="flex flex-col gap-3">
            {filteredRequests.length === 0 ? (
              <EmptyState label="No events found." />
            ) : (
              filteredRequests.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-4 rounded-xl overflow-hidden bg-white"
                >
                  <div
                    className="w-28 h-20 shrink-0 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #7c3aed 0%, #db2777 50%, #f59e0b 100%)" }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </div>

                  <div className="flex-1 py-3 pr-4 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-bold text-gray-800 truncate">{ev.title}</p>
                      <p className="text-xs font-medium text-gada-text-secondary whitespace-nowrap shrink-0">
                        Date: {formatEventDate(ev.startDate)}
                      </p>
                    </div>
                    <p className="text-xs text-gada-text-muted mt-1">
                      Status: {ev.status ?? "—"}
                    </p>
                  </div>

                  <div className="pr-4 shrink-0">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={
                        ev.adminStatus === "APPROVED"
                          ? { backgroundColor: "#dcfce7", color: "#16a34a" }
                          : ev.adminStatus === "DECLINED"
                          ? { backgroundColor: "#fee2e2", color: "#dc2626" }
                          : { backgroundColor: "#fef9c3", color: "#ca8a04" }
                      }
                    >
                      {ev.adminStatus
                        ? ev.adminStatus.charAt(0) + ev.adminStatus.slice(1).toLowerCase()
                        : "Pending"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between text-xs text-gada-text-muted pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
