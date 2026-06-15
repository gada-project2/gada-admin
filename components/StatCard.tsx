import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
}

export default function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="flex flex-col justify-between p-4 rounded-xl bg-white min-h-22.5">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-gada-text-secondary">{label}</span>
        <span className="text-gada-text-muted">{icon}</span>
      </div>
      <p className="text-2xl font-bold mt-2 text-gada-dark">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
