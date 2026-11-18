export type BookingErrorCode =
  | "INVALID_INPUT"
  | "SERVICE_NOT_FOUND"
  | "CUSTOMER_NOT_FOUND"
  | "BOOKING_NOT_FOUND"
  | "NOT_CHANGEABLE"
  | "PARTY_SIZE_REQUIRED"
  | "PARTY_TOO_LARGE"
  | "CLOSED"
  | "OUTSIDE_HOURS"
  | "NOT_ON_GRID"
  | "IN_PAST"
  | "TOO_SOON"
  | "TOO_FAR"
  | "FULL";

/**
 * An expected booking failure. `message` is written so the agent can pass it on to
 * the customer; `alternatives` lists nearby open times ("HH:mm") when there are any.
 */
export class BookingError extends Error {
  readonly code: BookingErrorCode;
  readonly alternatives: string[];

  constructor(code: BookingErrorCode, message: string, alternatives: string[] = []) {
    super(message);
    this.name = "BookingError";
    this.code = code;
    this.alternatives = alternatives;
  }
}
