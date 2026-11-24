export const withdrawalReasons = ['Truck unavailable', 'Schedule conflict', 'Vehicle breakdown', 'Pricing issue', 'Other'] as const;
export type Withdrawal = { loadId: string; reason: string; submittedAt: string };

export function createWithdrawal(loadId: string, reason: string): Withdrawal {
  if (!loadId.trim() || !withdrawalReasons.some(option => option === reason)) throw new Error('Select a reason for withdrawal.');
  return { loadId, reason, submittedAt: new Date().toISOString() };
}
