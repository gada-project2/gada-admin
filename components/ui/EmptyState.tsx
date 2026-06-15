interface EmptyStateProps {
  label?: string;
  note?: string;
}

export default function EmptyState({
  label = "No data available",
  note,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M9 9h6M9 12h6M9 15h4" />
      </svg>
      <p className="text-sm font-medium text-gray-400">{label}</p>
      {note && <p className="text-xs text-gray-300 max-w-xs">{note}</p>}
    </div>
  );
}
