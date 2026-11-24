// Preview only. Replace with the pickup verification endpoint.
export function isValidDemoPickupCode(code: string): boolean {
  return /^\d{6}$/.test(code) && code === '123456';
}
