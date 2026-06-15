"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminControllerGetCalendarData } from "@/lib/api/generated/admin/admin";
import type { CalendarData } from "@/lib/api/types/admin";

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

export default function CalendarWidget() {
  const today   = new Date();
  const [current, setCurrent] = useState(today);
  const [view, setView]       = useState<View>("Week");

  const weekDays = getWeekDays(current);

  const { data: raw } = useAdminControllerGetCalendarData({
    month: current.getMonth() + 1,
    year:  current.getFullYear(),
  });
  const calData = raw as unknown as CalendarData | undefined;

  // Build a date→events map from the API response
  const eventsByDate: Record<string, { title: string; color: string }[]> = {};
  calData?.events.forEach((ev) => {
    const key = ev.startDate?.slice(0, 10);
    if (!key) return;
    (eventsByDate[key] ??= []).push({ title: ev.title, color: "#fbbf24" });
  });
  calData?.pendingRequests.forEach((ev) => {
    const key = ev.startDate?.slice(0, 10);
    if (!key) return;
    (eventsByDate[key] ??= []).push({ title: ev.title, color: "#d1d5db" });
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
                  {(hour === 9 ? (eventsByDate[key] ?? []) : []).map((ev, i) => (
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
