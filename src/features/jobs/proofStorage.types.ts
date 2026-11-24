import type { ProofFile } from './deliveryProof';
export type ProofDraft = {
  loadId: string; files: ProofFile[]; status: 'draft' | 'submitted-locally';
  savedAt?: string; submittedAt?: string; verification?: string;
};
