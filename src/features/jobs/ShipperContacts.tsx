import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme';

// Reference contacts for the local preview; replace with shipment endpoint data.
const contacts = [
  { role: 'Shipper', name: 'Abidemi Transports', initials: 'AO', phone: '+234 908 665 5438' },
  { role: 'Recipient', name: 'Chioma Logistics', initials: 'CL', phone: '+234 812 345 6789' },
];

export function ShipperContacts({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  async function copy(role: string, phone: string) {
    setError('');
    try {
      const success = await Clipboard.setStringAsync(phone);
      if (!success) throw new Error('Clipboard unavailable');
      setCopied(role);
    } catch {
      setCopied('');
      setError('Unable to copy. Press and hold the number to copy it manually.');
    }
  }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Close shipper contacts" hitSlop={12} style={styles.close} onPress={onClose}><Icon name="x" size={23} color={colors.subtle} /></Pressable>
    <View style={styles.divider} />
    {contacts.map(contact => <View key={contact.role} style={styles.card}>
      <View style={styles.row}><View style={styles.avatar}><Text style={styles.initials}>{contact.initials}</Text></View><View style={styles.details}><Text style={styles.role}>{contact.role}</Text><Text style={styles.name}>{contact.name}</Text><Text selectable style={styles.phone}>{contact.phone}</Text></View></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Copy ${contact.role.toLowerCase()} number`} onPress={() => copy(contact.role, contact.phone)} style={styles.button}><Text style={styles.buttonText}>{copied === contact.role ? 'Number copied' : 'Copy number'}</Text></Pressable>
    </View>)}
    {!!copied && <Text accessibilityLiveRegion="polite" style={styles.feedback}>{copied} number copied.</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Text style={styles.help}>Copy the number above to place a call from your phone</Text>
    <Text style={styles.demo}>Demo contact details</Text>
  </>;
}
const styles = StyleSheet.create({
  close: { alignSelf: 'flex-end', marginBottom: 5, padding: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 7 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#F8F9FA', padding: 15, gap: 16 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.muted, fontSize: 25, fontWeight: '600' },
  details: { flex: 1, gap: 7 },
  role: { color: colors.subtle, fontSize: 12 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  phone: { color: colors.muted, fontSize: 16 },
  button: { backgroundColor: colors.button, borderRadius: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 10 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  help: { color: colors.subtle, textAlign: 'center', fontSize: 14, lineHeight: 22, marginTop: 9 },
  feedback: { color: colors.green, fontSize: 13, textAlign: 'center' },
  error: { color: '#B3003C', fontSize: 13 },
  demo: { color: colors.subtle, fontSize: 10, textAlign: 'center' },
});
