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

/**
 * Pakistani numbers in their usual written form:
 * "+923001110001" → "+92 300 1110001", "+924235550101" → "+92 42 3555 0101".
 * Anything else is returned unchanged.
 */
export function formatPhone(e164: string): string {
  const mobile = /^\+92(3\d{2})(\d{7})$/.exec(e164);
  if (mobile) return `+92 ${mobile[1]} ${mobile[2]}`;
  const lahoreOrKarachi = /^\+92(42|21)(\d{4})(\d{4})$/.exec(e164);
  if (lahoreOrKarachi) return `+92 ${lahoreOrKarachi[1]} ${lahoreOrKarachi[2]} ${lahoreOrKarachi[3]}`;
  return e164;
}

/** 45 → "45 min", 60 → "1 hr", 90 → "1 hr 30 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
