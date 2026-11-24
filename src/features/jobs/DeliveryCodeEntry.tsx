import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme';
export function DeliveryCodeEntry({ code, onChange, remaining, disabled, onRenew }: { code: string; onChange: (value: string) => void; remaining: number; disabled: boolean; onRenew: () => void }) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  return <View style={styles.panel}>
    <Text style={styles.label}>ENTER VERIFICATION CODE</Text>
    <Pressable onPress={() => input.current?.focus()} style={styles.entry}>
      <View pointerEvents="none" accessible={false} style={styles.digits}>{Array.from({ length: 6 }, (_, index) => <View key={index} style={styles.digit}><Text style={styles.number}>{code[index] ?? ''}</Text></View>)}</View>
      <TextInput ref={input} accessibilityLabel="Delivery verification code" accessibilityHint="Enter the six-digit delivery code" keyboardType="number-pad" inputMode="numeric" textContentType="oneTimeCode" autoComplete="one-time-code" value={code} onChangeText={text => onChange(text.replace(/\D/g, '').slice(0, 6))} maxLength={6} editable={!disabled && remaining > 0} caretHidden style={styles.input} />
    </Pressable>
    <Text style={styles.timer}>{remaining > 0 ? 'Code expires in ' + Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0') : 'Code expired'}</Text>
    {remaining === 0 && <Pressable accessibilityRole="button" disabled={disabled} onPress={onRenew}><Text style={styles.renew}>Request new demo code</Text></Pressable>}
  </View>;
}
const styles = StyleSheet.create({
  panel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: '#CFD5DE', borderRadius: 10, padding: 18, gap: 14, marginVertical: 6 },
  label: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  entry: { position: 'relative' },
  digits: { flexDirection: 'row', gap: 4 },
  digit: { flex: 1, height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center' },
  number: { color: colors.ink, fontWeight: '600', fontSize: 18 },
  input: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, color: 'transparent', backgroundColor: 'transparent' },
  timer: { color: colors.muted, textAlign: 'center', fontSize: 12 },
  renew: { color: colors.green, textAlign: 'center', fontSize: 13, fontWeight: '600' },
});
