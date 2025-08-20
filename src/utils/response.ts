/**
 * Standard response wrapper for success messages.
 * @param message - Success message
 * @param data - Optional data payload
 */
export function ok(message: string, data?: any) {
  return {
    success: true,
    message,
    data,
  };
}