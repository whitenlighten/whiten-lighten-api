// src/common/helpers/api-response.ts
export const ok = <T>(message: string, data?: T) => ({ success: true, message, data });
