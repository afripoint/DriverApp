export function withdrawDemoEarnings(balance: number, amount: number): number {
  if (!Number.isSafeInteger(balance) || balance < 0 || !Number.isSafeInteger(amount) || amount <= 0) throw new Error('Enter a valid withdrawal amount');
  if (amount > balance) throw new Error('Amount is above available balance');
  return balance - amount;
}
