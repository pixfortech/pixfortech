import "server-only";

/** Request data supplied to the client so its first render shares the server clock. */
export async function getServerTime(): Promise<number> {
  return Date.now();
}
