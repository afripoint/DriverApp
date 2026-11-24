export type ProofFile = { name: string; uri: string; mime: string; size: number };
export function validateProofFiles(files: ProofFile[]): void {
  if (files.length > 5) throw Error('Upload up to five evidence files.');
  for (const file of files) {
    if (!file.uri || !file.name || !['image/jpeg', 'application/pdf'].includes(file.mime)) throw Error('Choose JPEG or PDF files.');
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > 1024 * 1024) throw Error('Each file must be no larger than 1 MB.');
  }
}
export function canContinueProof(files: ProofFile[]): boolean {
  try { validateProofFiles(files); return files.length >= 2; } catch { return false; }
}
export function validateDemoDeliveryCode(code: string, expiresAt: number, now = Date.now()): void {
  if (!Number.isFinite(expiresAt) || now >= expiresAt) throw Error('Verification code has expired. Request a new code.');
  if (!/^\d{6}$/.test(code) || code !== '357333') throw Error('Invalid delivery code. Please try again.');
}
