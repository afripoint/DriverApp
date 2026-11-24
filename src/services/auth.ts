/** Local preview only. Replace this function with your authentication endpoint. */
export const demoCredentials = { email: 'driver@example.com', password: 'Driver123!' };
export type Driver = { name: string };

export async function signIn(email: string, password: string): Promise<Driver> {
  if (email.trim().toLowerCase() !== demoCredentials.email || password !== demoCredentials.password) {
    throw new Error('Use the demo account below to preview the app.');
  }
  return { name: 'Marcus' };
}
