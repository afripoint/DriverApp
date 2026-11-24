import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';

export function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  return (
    <Screen>
      <Text style={styles.eyebrow}>READY FOR THE ROAD</Text>
      <Text style={styles.title}>Welcome to DriverApp</Text>
      <Text style={styles.body}>Your driver app foundation is ready. Start building your screens and connect your delivery services.</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Your workspace</Text>
        <Text style={styles.body}>Manage jobs, track deliveries, and build your driver experience here.</Text>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]} onPress={() => navigation.navigate('Jobs')}>
          <Text style={styles.buttonText}>Open my jobs</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

export function JobsScreen() {
  return (
    <Screen>
      <Text style={styles.title}>My jobs</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Ready to connect</Text>
        <Text style={styles.body}>Add your jobs endpoint and render your deliveries here.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: '#2563EB', fontWeight: '700', fontSize: 12, letterSpacing: 2 },
  title: { color: '#14213D', fontSize: 34, fontWeight: '700' },
  body: { color: '#556176', fontSize: 16, lineHeight: 25 },
  card: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, gap: 16 },
  heading: { color: '#14213D', fontSize: 21, fontWeight: '600' },
  button: { backgroundColor: '#2563EB', minHeight: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 14 },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});
