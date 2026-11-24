import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import type { Driver } from './src/services/auth';

export default function App() {
  const [driver, setDriver] = useState<Driver | null>(null);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {driver ? <DashboardScreen driver={driver} onSignOut={() => setDriver(null)} /> : <LoginScreen onSignIn={setDriver} />}
    </SafeAreaProvider>
  );
}

