/** Base URL the browser uses to reach the API (inlined at build time). */
export const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100/api').replace(/\/$/, '');
