export class CollectorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown collector error";
}
