import { useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme';
import { Icon } from '../../components/Icon';
import { ActionButton } from '../marketplace/ui';
import { naira } from '../marketplace/model';
import { withdrawDemoEarnings } from './earnings';

export function WithdrawEarnings({ balance, onWithdraw, onBack }: { balance: number; onWithdraw: (amount: number) => void; onBack: () => void }) {
  const [amount, setAmount] = useState('');
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState<{ amount: number; remaining: number } | null>(null);
  const confirming = useRef(false);
  const value = Number(amount);
  const tooHigh = value > balance;
  const valid = amount.length > 0 && Number.isSafeInteger(value) && value > 0 && !tooHigh;
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => listener.remove();
  }, [onBack]);
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(null), 6000);
    return () => clearTimeout(timer);
  }, [success]);
  function confirm() {
    if (!valid || confirming.current) return;
    const remaining = withdrawDemoEarnings(balance, value);
    confirming.current = true;
    Keyboard.dismiss();
    onWithdraw(value);
    setSuccess({ amount: value, remaining });
    setAmount('');
    confirming.current = false;
  }
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to settlement progress" style={styles.back} onPress={onBack}><Icon name="arrow-left" size={23} color={colors.ink} /></Pressable><Text accessibilityRole="header" style={styles.title}>Withdraw Earnings</Text></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.balance}><Text style={styles.caption}>AVAILABLE TO WITHDRAW</Text><Text style={styles.value}>{naira(balance)}</Text></View>
        <Text style={styles.label}>Amount to withdraw (₦)</Text>
        <TextInput accessibilityLabel="Amount to withdraw in naira" accessibilityHint="Enter an amount up to your available balance" keyboardType="number-pad" inputMode="numeric" placeholder="Enter withdrawal amount" placeholderTextColor={colors.subtle} style={[styles.input, tooHigh && styles.invalid]} value={!amount ? '' : editing ? amount : value.toLocaleString('en-NG')} onFocus={() => setEditing(true)} onBlur={() => setEditing(false)} onChangeText={text => { setAmount(text.replace(/\D/g, '').slice(0, 12)); setSuccess(null); }} onSubmitEditing={confirm} returnKeyType="done" />
        {tooHigh && <Text accessibilityRole="alert" style={styles.error}>Amount is above available balance</Text>}
        <Text style={styles.label}>Bank account</Text>
        <View style={styles.bank}><Text style={styles.copy}>First Bank · **** 4831</Text></View>
        <Text style={styles.copy}>Withdrawals typically arrive within 1–2 business days.</Text>
        <Text style={styles.demo}>Demo bank account · no real money will be sent.</Text>
      </View>
    </ScrollView>
    {success && <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.toast}><Icon name="check-circle" color={colors.green} size={17} /><Text style={styles.toastText}>{naira(success.amount)} withdrawal simulated. Your remaining balance is {naira(success.remaining)}.</Text></View>}
    <View style={styles.footer}><View style={styles.footerInner}><ActionButton title="Confirm withdrawal" disabled={!valid} onPress={confirm} /></View></View>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F8F7' },
  header: { minHeight: 70, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 55, borderBottomWidth: 1, borderColor: colors.border },
  title: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  back: { position: 'absolute', left: 28, padding: 6 },
  content: { padding: 24, paddingTop: 20, width: '100%', maxWidth: 650, alignSelf: 'center' },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, gap: 18 },
  balance: { borderRadius: 10, borderWidth: 1, borderColor: '#CFD5DE', backgroundColor: colors.surface, padding: 15, gap: 8 },
  caption: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  value: { color: colors.ink, fontSize: 19, fontWeight: '600' },
  label: { color: colors.ink, fontSize: 16, marginTop: 2 },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8F9FA', padding: 12, fontSize: 16, color: colors.ink },
  invalid: { borderColor: '#D00044', color: '#B3003C', backgroundColor: '#FFFAFC' },
  error: { color: '#D00044', fontSize: 14, marginTop: -7 },
  bank: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  demo: { color: colors.subtle, fontSize: 11 },
  footer: { borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  footerInner: { paddingHorizontal: 24, paddingVertical: 20, width: '100%', maxWidth: 650, alignSelf: 'center' },
  toast: { position: 'absolute', bottom: 105, left: '8%', right: '8%', backgroundColor: '#ECFDF8', borderWidth: 1, borderColor: '#99EAD8', borderRadius: 12, padding: 15, flexDirection: 'row', gap: 9 },
  toastText: { flex: 1, color: colors.green, fontSize: 14, lineHeight: 22 },
});
