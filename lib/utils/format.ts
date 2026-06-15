const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converts a kobo amount to a formatted Naira string.
 * formatNaira(150000) → "₦1,500.00"
 * formatNaira(0) → "₦0.00"
 * formatNaira(null) → "₦0.00"
 */
export function formatNaira(kobo: number | null | undefined): string {
  const naira = (kobo ?? 0) / 100;
  return nairaFormatter.format(naira);
}
