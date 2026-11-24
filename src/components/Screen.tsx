import type { PropsWithChildren } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, flexGrow: 1 }}>{children}</ScrollView>
    </SafeAreaView>
  );
}
