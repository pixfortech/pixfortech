import type { RealtimeEvent } from "./bus";

/** Keep resource identity separate from delivery identity for UI reconciliation. */
export function clientEvent(event: RealtimeEvent) {
  return {
    type: event.type,
    data: {
      ...event.payload,
      id: typeof event.payload.id === "string" ? event.payload.id : event.id,
      eventId: event.id,
      at: event.at,
    },
  };
}
