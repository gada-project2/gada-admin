"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminControllerCalendar } from "@/lib/api/generated/admin/admin";
import type { CalendarData, AdminEventStatus } from "@/lib/api/types/admin";

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type View = "Day" | "Week" | "Month";

function getWeekDays(date: Date) {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// GET /v1/admin/calendar expects month as "YYYY-MM".
function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// The time grid only renders 06:00–15:00. Clamp so events starting outside that
// band still appear (pinned to the first/last visible row) instead of vanishing.
const FIRST_HOUR = 6;
const LAST_HOUR = 15;
function clampHour(h: number): number {
  return Math.min(LAST_HOUR, Math.max(FIRST_HOUR, h));
}

// The calendar endpoint returns the event's own lifecycle status. There is no
// admin approval state anymore, so colour by lifecycle instead.
function statusColor(status: AdminEventStatus): string {
  if (status === "PUBLISHED") return "#fbbf24";
  if (status === "DRAFT") return "#d1d5db";
  return "#fca5a5"; // CANCELLED / SUSPENDED
}

export default function CalendarWidget() {
  const today   = new Date();
  const [current, setCurrent] = useState(today);
  const [view, setView]       = useState<View>("Week");

  const weekDays = getWeekDays(current);

  // status is a required query param on this endpoint; empty string = no filter.
  const { data: raw } = useAdminControllerCalendar({
    month: monthKey(current),
    status: "",
  });
  const calData = raw as unknown as CalendarData | undefined;

  // The API returns a single flat array of events (no separate pendingRequests
  // bucket — the approval queue no longer exists). Bucket by date AND start hour
  // so events land in the correct row of the time grid.
  const eventsByDate: Record<string, { title: string; color: string; hour: number }[]> = {};
  calData?.forEach((ev) => {
    if (!ev.startDate) return;
    const start = new Date(ev.startDate);
    if (Number.isNaN(start.getTime())) return;
    const key = dateKey(start);
    (eventsByDate[key] ??= []).push({
      title: ev.name,
      color: statusColor(ev.status),
      hour: start.getHours(),
    });
  });

  const hours = Array.from({ length: 10 }, (_, i) => i + 6);

  function prevWeek() {
    const d = new Date(current);
    d.setDate(d.getDate() - 7);
    setCurrent(d);
  }
  function nextWeek() {
    const d = new Date(current);
    d.setDate(d.getDate() + 7);
    setCurrent(d);
  }

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ backgroundColor: "#ffffff" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-1 rounded hover:bg-gray-100">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-700">
            {MONTHS[current.getMonth()]} {current.getFullYear()}
          </span>
          <button onClick={nextWeek} className="p-1 rounded hover:bg-gray-100">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center rounded-lg overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
          {(["Day", "Week", "Month"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: view === v ? "#1a1a1a" : "#ffffff",
                color: view === v ? "#ffffff" : "#6b7280",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Day headers */}
      <div className="grid" style={{ gridTemplateColumns: "50px repeat(7, 1fr)" }}>
        <div />
        {weekDays.map((d) => {
          const isToday = dateKey(d) === dateKey(today);
          return (
            <div key={d.toISOString()} className="text-center">
              <p className="text-xs text-gray-400">{DAYS[d.getDay()]}</p>
              <div
                className="mx-auto w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: isToday ? "#f59e0b" : "transparent",
                  color: isToday ? "#ffffff" : "#1a1a1a",
                }}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
        {hours.map((hour) => (
          <div
            key={hour}
            className="grid"
            style={{ gridTemplateColumns: "50px repeat(7, 1fr)", minHeight: 44 }}
          >
            <div className="text-xs text-gray-400 pr-2 pt-1 text-right">
              {String(hour).padStart(2, "0")}:00
            </div>
            {weekDays.map((d) => {
              const key = dateKey(d);
              return (
                <div
                  key={d.toISOString()}
                  className="border-l border-t relative"
                  style={{ borderColor: "#f3f4f6" }}
                >
                  {(eventsByDate[key] ?? [])
                    .filter((ev) => clampHour(ev.hour) === hour)
                    .map((ev, i) => (
                    <div
                      key={i}
                      className="absolute inset-x-0.5 top-0.5 rounded text-xs px-1 py-0.5 truncate"
                      style={{
                        backgroundColor: ev.color,
                        color: ev.color === "#fbbf24" ? "#78350f" : "#374151",
                        fontSize: 10,
                      }}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
