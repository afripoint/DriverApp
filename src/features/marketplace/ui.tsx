import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { colors, headingFont } from '../../theme';
import { naira, type MarketplaceLoad } from './model';

export function ActionButton({ title, onPress, disabled = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [ui.button, secondary && ui.secondaryButton, disabled && ui.disabledButton, pressed && { opacity: 0.8 }]}><Text style={[ui.buttonText, (secondary || disabled) && { color: secondary ? colors.muted : colors.green }]}>{title}</Text></Pressable>;
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <View style={ui.sectionTitle}><View style={ui.dot} /><Text style={ui.sectionTitleText}>{children}</Text></View>;
}

export function LoadSummary({ load }: { load: MarketplaceLoad }) {
  return <View style={{ gap: 17 }}>
    <View style={ui.between}><Text style={ui.body}>Load ID: {load.id}</Text><Text style={ui.open}>Open</Text></View>
    <View style={ui.addressRow}><View style={ui.pinColumn}><Icon name="map-pin" size={23} color={colors.green} /><View style={ui.routeLine} /></View><Text style={ui.address}>{load.pickupAddress}</Text></View>
    <View style={ui.addressRow}><Icon name="map-pin" size={23} color={colors.orange} /><Text style={ui.address}>{load.deliveryAddress}</Text></View>
    <View style={ui.priceBanner}>
      <View style={{ gap: 7 }}><Text style={ui.whiteLabel}>Listed price</Text><Text style={ui.listedPrice}>{naira(load.listedPrice)}</Text></View>
      <View style={{ gap: 9, alignItems: 'flex-end' }}><Text style={ui.whiteLabel}>Estimated range</Text><Text style={ui.range}>{naira(load.minimum)}–{naira(load.maximum)}</Text></View>
    </View>
  </View>;
}

export function Fact({ icon, text }: { icon: IconName; text: string }) {
  return <View style={ui.fact}><Icon name={icon} size={17} /><Text style={ui.body}>{text}</Text></View>;
}

export const ui = StyleSheet.create({
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  heading: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  open: { color: '#8D211A', backgroundColor: '#FFF8F0', borderColor: '#FFD3B6', borderWidth: 1, borderRadius: 7, paddingHorizontal: 5, paddingVertical: 3, fontSize: 12 },
  card: { borderWidth: 1, borderColor: '#D0D5DE', borderRadius: 16, backgroundColor: colors.white, padding: 23 },
  button: { minHeight: 48, borderRadius: 12, backgroundColor: colors.button, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  secondaryButton: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: colors.border },
  disabledButton: { backgroundColor: '#ECFCF7', borderColor: '#A5EFDC', borderWidth: 1 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitleText: { color: colors.ink, fontWeight: '700', fontSize: 12, flexShrink: 1 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.orange },
  addressRow: { flexDirection: 'row', gap: 5, alignItems: 'flex-start' },
  pinColumn: { alignItems: 'center' },
  routeLine: { width: 2, height: 19, backgroundColor: '#6B7280', marginTop: 5 },
  address: { flex: 1, color: colors.ink, fontSize: 19, fontWeight: '700', lineHeight: 26 },
  priceBanner: { padding: 16, paddingVertical: 20, borderRadius: 13, backgroundColor: colors.button, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  whiteLabel: { color: colors.white, fontSize: 12 },
  listedPrice: { fontFamily: headingFont, color: colors.white, fontSize: 25, fontWeight: '700' },
  range: { color: colors.white, fontSize: 14, fontWeight: '500' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
});
