import { useRef, useState, type ComponentRef } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme';
import { Icon } from '../../components/Icon';
import { ActionButton } from '../marketplace/ui';

export function PickupCode({ footer = false, code, onChange, onVerify, verified }: {
  footer?: boolean; code: string; onChange: (value: string) => void; onVerify: () => void; verified: boolean;
}) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  if (footer) return <ActionButton title={verified ? 'Pickup verified' : 'Verify pickup'} disabled={code.length !== 6 || verified} onPress={() => { Keyboard.dismiss(); onVerify(); }} />;
  return <View style={styles.card}>
    <Text style={styles.copy}>Request the Pickup Code from the shipper upon arrival at the pickup location.</Text>
    <View style={styles.codePanel}>
      <Text style={styles.label}>ENTER PICKUP CODE</Text>
      <Pressable accessibilityRole="none" onPress={() => input.current?.focus()} style={styles.entry}>
        <View pointerEvents="none" accessible={false} style={styles.digits}>{Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.digit, focused && index === Math.min(code.length, 5) && styles.focused]}><Text style={styles.number}>{code[index] ?? ''}</Text></View>)}</View>
        <TextInput ref={input} accessibilityLabel="Six-digit pickup code" accessibilityHint="Enter the six digits provided by the shipper" value={code} onChangeText={text => onChange(text.replace(/\D/g, '').slice(0, 6))} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} keyboardType="number-pad" inputMode="numeric" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} caretHidden selectTextOnFocus style={styles.input} returnKeyType="done" onSubmitEditing={() => { if (code.length === 6 && !verified) onVerify(); }} editable={!verified} />
      </Pressable>
    </View>
    {verified && <View accessibilityLiveRegion="polite" style={styles.success}><Icon name="check-circle" color={colors.green} size={17} /><Text style={styles.successText}>Pickup verified in this demo.</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, backgroundColor: colors.white, gap: 16 },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  codePanel: { borderWidth: 1, borderColor: '#CFD5DE', borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 18, gap: 12 },
  label: { textAlign: 'center', color: colors.muted, fontSize: 12 },
  entry: { position: 'relative' },
  digits: { flexDirection: 'row', gap: 4 },
  digit: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center' },
  focused: { borderColor: colors.green, borderWidth: 2 },
  number: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  input: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, color: 'transparent', backgroundColor: 'transparent', fontSize: 18 },
  success: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  successText: { color: colors.green, fontSize: 14 },
});
