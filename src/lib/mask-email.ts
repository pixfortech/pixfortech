/** `owner@example.com` -> `o***@example.com`: enough to recognise, not enough to harvest. */
export function maskEmail(address: string): string {
  const at = address.indexOf("@");
  if (at <= 0) return "***";
  return `${address[0]}***${address.slice(at)}`;
}
