import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme';
import { withdrawalReasons } from './withdrawal';

export function WithdrawalContent({ loadId, success, onClose, onConfirm }: { loadId: string; success: boolean; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
  return <>
    <View style={styles.heading}><Text style={styles.title}>{success ? '' : 'Withdraw bid'}</Text><Pressable accessibilityRole="button" accessibilityLabel={success ? 'Close withdrawal success' : 'Close withdrawal dialog'} hitSlop={12} onPress={onClose}><Icon name="x" size={23} color={colors.subtle} /></Pressable></View>
    {success ? <><View style={styles.successSpace} /><Text accessibilityRole="header" style={styles.successTitle}>Withdrawal successful!</Text><Text style={styles.successCopy}>You have removed load {loadId} from your pending bids.</Text><Text style={styles.demo}>Demo preview · no shipper notification sent.</Text><View style={styles.divider} /><Pressable accessibilityRole="button" onPress={onClose} style={styles.primary}><Text style={styles.primaryText}>Done</Text></Pressable></> : <>
      <View style={styles.divider} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.copy}>Withdrawing bid from this load will remove you from the assignment and may affect your carrier reliability rating and marketplace reviews.</Text>
        <Text style={styles.label}>Reason for withdrawal</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Reason for withdrawal" accessibilityState={{ expanded: optionsOpen }} onPress={() => setOptionsOpen(!optionsOpen)} style={styles.select}><Text style={[styles.selectText, !!reason && { color: colors.ink }]}>{reason || 'Select reason for withdrawal'}</Text><Icon name={optionsOpen ? 'chevron-up' : 'chevron-down'} size={20} /></Pressable>
        {optionsOpen && <View accessibilityRole="radiogroup" accessibilityLabel="Withdrawal reasons" style={styles.options}>{withdrawalReasons.map(option => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: reason === option }} onPress={() => { setReason(option); setOptionsOpen(false); }} style={styles.option}><Text style={styles.optionText}>{option}</Text>{reason === option && <Icon name="check" color={colors.green} size={18} />}</Pressable>)}</View>}
      </ScrollView>
      <View style={styles.divider} /><Pressable accessibilityRole="button" accessibilityState={{ disabled: !reason }} disabled={!reason} onPress={() => onConfirm(reason)} style={[styles.primary, !reason && styles.disabled]}><Text style={[styles.primaryText, !reason && { color: colors.green }]}>Yes, confirm withdrawal</Text></Pressable>
      {!!reason && <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>No, cancel</Text></Pressable>}
    </>}
  </>;
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 35 },
  title: { color: colors.ink, fontSize: 21, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border },
  content: { gap: 16, paddingVertical: 10 },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 26, marginBottom: 5 },
  label: { color: colors.ink, fontSize: 16 },
  select: { minHeight: 46, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#F8F9FA', flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectText: { color: colors.subtle, fontSize: 16, flex: 1 },
  options: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' },
  option: { minHeight: 44, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  optionText: { fontSize: 15, color: colors.ink },
  primary: { minHeight: 44, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.button, borderRadius: 12 },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  disabled: { backgroundColor: '#ECFDF8', borderWidth: 1, borderColor: '#99EAD8' },
  cancel: { minHeight: 44, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  cancelText: { color: colors.muted, fontSize: 16, fontWeight: '600' },
  successSpace: { height: 140 },
  successTitle: { color: colors.ink, fontSize: 19, fontWeight: '600', textAlign: 'center' },
  successCopy: { color: colors.muted, fontSize: 16, lineHeight: 26, textAlign: 'center' },
  demo: { color: colors.subtle, fontSize: 12, textAlign: 'center' },
});
