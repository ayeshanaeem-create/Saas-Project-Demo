const priceFormatters = new Map<string, Intl.NumberFormat>();

/** 1500, "PKR" → "Rs 1,500". 0 → "Free". */
export function formatPrice(amount: number, currency: string): string {
  if (amount === 0) return "Free";
  let formatter = priceFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-PK", { style: "currency", currency, maximumFractionDigits: 0 });
    priceFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

/** 45 → "45 min", 60 → "1 hr", 90 → "1 hr 30 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
