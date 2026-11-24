import { useEffect, useRef, useState, type ComponentRef, type PropsWithChildren } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { colors, headingFont } from '../../theme';
import { createBid, naira, trucks, validateBid, type Bid, type MarketplaceLoad } from './model';
import { ActionButton, LoadSummary, SectionTitle, ui } from './ui';

function Accordion({ title, children }: PropsWithChildren<{ title: string }>) {
  const [open, setOpen] = useState(false);
  return <View style={ui.card}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={title} onPress={() => setOpen(!open)} style={ui.between}><SectionTitle>{title}</SectionTitle><Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} /></Pressable>
    {open && <><View style={ui.divider} />{children}</>}
  </View>;
}

export function LoadFlow({ load, existingBid, onBack, onBid }: { load: MarketplaceLoad; existingBid?: Bid; onBack: () => void; onBid: (bid: Bid) => void }) {
  const [stage, setStage] = useState<'details' | 'bid'>('details');
  const [selected, setSelected] = useState<string[]>([]);
  const [amount, setAmount] = useState(String(load.listedPrice));
  const [editingAmount, setEditingAmount] = useState(false);
  const [sheet, setSheet] = useState<'confirm' | 'success' | null>(null);
  const lastSheet = useRef<'confirm' | 'success'>('confirm');
  const displayedSheet = sheet ?? lastSheet.current;
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Bid | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const offerPosition = useRef(0);
  const cardOffset = useRef(0);
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const submitting = useRef(false);
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 740 || fontScale > 1.2;
  const price = amount === '' ? NaN : Number(amount);
  const validPrice = Number.isInteger(price) && price >= load.minimum && price <= load.maximum;
  const sliderValue = Number.isFinite(price) ? Math.min(load.maximum, Math.max(load.minimum, price)) : load.minimum;
  const sliderProgress = (sliderValue - load.minimum) / (load.maximum - load.minimum);
  const validation = validateBid(load, trucks, selected, price);
  const total = selected.length * (Number.isFinite(price) ? price : 0);

  function back() {
    if (sheet) { if (sheet === 'success') finish(); else setSheet(null); }
    else if (stage === 'bid') { setStage('details'); setError(''); }
    else onBack();
  }
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => subscription.remove();
  });

  function selectTruck(id: string) {
    const truck = trucks.find(item => item.id === id);
    if (!truck?.available || !truck.matches) return;
    const isSelected = selected.includes(id);
    const next = isSelected ? selected.filter(item => item !== id) : load.requiredTrucks === 1 ? [id] : selected.length < load.requiredTrucks ? [...selected, id] : selected;
    setSelected(next);
    setError('');
    if (!isSelected && next.includes(id)) {
      Keyboard.dismiss();
      requestAnimationFrame(() => scroll.current?.scrollTo({ y: Math.max(0, cardOffset.current + offerPosition.current - 12), animated: true }));
    }
  }

  function review() {
    Keyboard.dismiss();
    if (validation) { setError(validation); return; }
    if (existingBid || receipt) { setError('You have already placed a bid for this load.'); return; }
    setError('');
    lastSheet.current = 'confirm';
    setSheet('confirm');
  }
  function confirm() {
    if (submitting.current || existingBid || receipt) return;
    submitting.current = true;
    try {
      const bid = createBid(load, trucks, selected, price);
      onBid(bid);
      setReceipt(bid);
      lastSheet.current = 'success';
      setSheet('success');
    } catch (cause) { setSheet(null); setError(cause instanceof Error ? cause.message : 'Unable to submit bid.'); }
    finally { submitting.current = false; }
  }
  function finish() { setSheet(null); setStage('details'); }
  const truckSummary = Object.entries(selected.reduce<Record<string, number>>((counts, id) => {
    const type = trucks.find(truck => truck.id === id)?.type ?? 'Truck';
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {})).map(([type, count]) => `${count} × ${type}`).join(', ');

  const offerForm = <View style={[ui.card, styles.bidCard]}>
    <SectionTitle>SUBMIT YOUR BID</SectionTitle><View style={ui.divider} />
    <Text style={styles.explanation}>Select matching trucks and propose a price.</Text>
    <Text style={styles.selectLabel}>SELECT TRUCKS ({selected.length}/{load.requiredTrucks})</Text>
    <View style={styles.truckList}>{trucks.map(truck => {
      const checked = selected.includes(truck.id);
      const unavailable = !truck.available || !truck.matches;
      const atLimit = !checked && load.requiredTrucks > 1 && selected.length >= load.requiredTrucks;
      return <Pressable key={truck.id} accessibilityRole="checkbox" accessibilityLabel={`${truck.type} ${truck.registration}`} accessibilityState={{ checked, disabled: unavailable || atLimit }} disabled={unavailable || atLimit} onPress={() => selectTruck(truck.id)} style={[styles.truck, checked && styles.truckSelected, (unavailable || atLimit) && styles.truckDisabled]}>
        <View style={[styles.checkbox, checked && styles.checkboxSelected]}>{checked && <Icon name="check" size={16} color={colors.white} />}</View>
        <View style={{ flex: 1, gap: 6 }}><Text style={styles.truckName}>{truck.type} • {truck.registration}</Text><Text style={[styles.availability, unavailable && { color: colors.subtle }]}>{!truck.available ? 'Unavailable' : !truck.matches ? 'Not matching' : 'Available'}</Text></View>
      </Pressable>;
    })}</View>
    <View onLayout={event => { offerPosition.current = event.nativeEvent.layout.y; }} style={styles.offer}>
      <View style={ui.between}><Text style={styles.offerTitle}>Your offer price</Text><Text style={styles.offerValue}>{validPrice ? naira(price) : '—'}</Text></View>
      <View style={styles.sliderContainer}>
        <View pointerEvents="none" style={styles.sliderTrack}><View style={[styles.sliderFill, { width: `${sliderProgress * 100}%` }]} /></View>
        <Slider accessibilityLabel="Your offer price per truck" accessibilityValue={{ min: load.minimum, max: load.maximum, now: sliderValue }} minimumValue={load.minimum} maximumValue={load.maximum} step={1} value={sliderValue} onValueChange={value => { setAmount(String(Math.round(value))); setError(''); }} minimumTrackTintColor="transparent" maximumTrackTintColor="transparent" thumbTintColor={colors.button} style={styles.slider} />
      </View>
      <View style={ui.between}><View style={{ gap: 7 }}><Text style={ui.body}>Minimum per truck:</Text><Text style={ui.heading}>{naira(load.minimum)}</Text></View><View style={{ gap: 7, alignItems: 'flex-end' }}><Text style={ui.body}>Maximum per truck:</Text><Text style={ui.heading}>{naira(load.maximum)}</Text></View></View>
      <View style={ui.divider} />
      <Text style={styles.inputLabel}>Your Bid (Per Truck)</Text>
      <Text style={styles.caption}>Enter an amount below or adjust the slider.</Text>
      <View style={[styles.amountBox, editingAmount && styles.focusedInput, !validPrice && styles.invalidInput]}><View style={styles.currency}><Text style={styles.amountText}>₦</Text></View><TextInput accessibilityLabel="Your bid per truck in naira" accessibilityHint="Type your offer amount. The slider and total update as you type." keyboardType="number-pad" inputMode="numeric" editable selectTextOnFocus onFocus={() => setEditingAmount(true)} onBlur={() => setEditingAmount(false)} value={amount === '' ? '' : editingAmount ? amount : Number(amount).toLocaleString('en-NG')} onChangeText={text => { setAmount(text.replace(/[^0-9]/g, '').slice(0, 9)); setError(''); }} style={styles.amountInput} placeholder="Enter amount" placeholderTextColor={colors.subtle} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} /></View>
      <View style={styles.hint}><Icon name="info" size={14} color={!validPrice ? '#B42318' : colors.muted} /><Text style={[ui.body, { flex: 1 }, !validPrice && { color: '#B42318' }]}>Bid must be within {naira(load.minimum)} – {naira(load.maximum)}. Shippers review and select offers based on submitted bids.</Text></View>
    </View>
  </View>;

  return <View style={styles.root}>
    <BlurTargetView ref={blurTarget} style={styles.root} importantForAccessibility={sheet ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={!!sheet}>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel={stage === 'bid' ? 'Back to load details' : 'Back to marketplace'} hitSlop={12} onPress={back} style={styles.back}><Icon name="arrow-left" size={23} color={colors.ink} /></Pressable><Text style={styles.headerTitle}>{stage === 'details' ? 'Load details' : 'Place a bid'}</Text></View>
      {stage === 'details' ? <>
        <ScrollView contentContainerStyle={styles.detailsContent}>
          <LoadSummary load={load} />
          <Accordion title="SCHEDULED TIME"><View style={styles.schedule}><View style={styles.scheduleColumn}><Text style={styles.caption}>Pickup window</Text><Text style={styles.scheduleLocation}>{load.origin}</Text><Text style={ui.body}>{load.pickupWindow}</Text></View><View style={[styles.scheduleColumn, styles.deliveryColumn]}><Text style={styles.caption}>Drop-off time</Text><Text style={styles.scheduleLocation}>{load.destination}</Text><Text style={ui.body}>{load.deliveryTime}</Text></View></View></Accordion>
          <Accordion title="CARGO & VEHICLE SPECIFICATION"><View style={{ gap: 14 }}>{[['Load Type', 'Full truck load (FTL)'], ['Weight', `${load.weight}kg`], ['Cargo type', load.cargo], ['Distance', `${load.distance}km`], ['Truck Type', load.vehicle], ['Number of trucks', String(load.requiredTrucks)]].map(([label, value]) => <View style={ui.between} key={label}><Text style={ui.body}>{label}</Text><Text style={styles.specValue}>{value}</Text></View>)}</View></Accordion>
          {existingBid && <View style={[ui.card, { gap: 8 }]}><Text style={ui.heading}>Your bid: {naira(existingBid.offer)} per truck</Text><Text style={ui.body}>Total job value: {naira(existingBid.total)}</Text><Text style={styles.caption}>Saved for this demo session.</Text></View>}
        </ScrollView>
        <View style={styles.footer}><ActionButton title={existingBid ? 'Bid submitted' : 'Place a bid'} disabled={!!existingBid} onPress={() => { setStage('bid'); setError(''); }} /></View>
      </> : <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {!compact && <View style={styles.pinnedSummary}><LoadSummary load={load} /></View>}
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.bidContent}>
          {compact && <LoadSummary load={load} />}
          <View onLayout={event => { cardOffset.current = event.nativeEvent.layout.y; }}>{offerForm}</View>
        </ScrollView>
        <View style={[styles.footer, styles.bidFooter]}><View style={ui.between}><View style={{ gap: 6 }}><Text style={styles.offerTitle}>Total job value</Text><Text style={ui.body}>{selected.length} × {validPrice ? naira(price) : '—'} (auto-calculated)</Text></View><Text style={styles.totalValue}>{validPrice ? naira(total) : '—'}</Text></View>{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<ActionButton title="Submit bid" disabled={!!validation || !!existingBid} onPress={review} /></View>
      </KeyboardAvoidingView>}
    </BlurTargetView>
    <Modal visible={sheet !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={back}>
      <View style={styles.modalRoot}>
        <BlurView blurTarget={Platform.OS === 'web' ? undefined : blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable accessibilityRole="button" accessibilityLabel="Close bid dialog" onPress={() => sheet === 'success' ? finish() : setSheet(null)} style={[StyleSheet.absoluteFill, styles.scrim]} />
        <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom), maxHeight: height - insets.top - 16 }]}>
          <View style={styles.sheetHeader}><Text accessibilityRole="header" style={styles.sheetTitle}>{displayedSheet === 'confirm' ? 'Submit bid' : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={12} onPress={() => sheet === 'success' ? finish() : setSheet(null)}><Icon name="x" size={23} color={colors.subtle} /></Pressable></View>
          {displayedSheet === 'confirm' ? <>
            <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 16 }}>
              <Text style={styles.explanation}>Submit your {naira(price)} bid for this load?</Text>
              <View style={styles.confirmCard}>
                {[['ROUTE', `${load.pickupAddress} → ${load.deliveryAddress}`], ['OFFER PRICE', `${naira(price)} per truck`], ['TRUCKS', truckSummary], ['TOTAL JOB VALUE', naira(total)]].map(([label, value], index) => <View key={label} style={[styles.confirmRow, index === 3 && { borderBottomWidth: 0, paddingBottom: 0 }]}><Text style={styles.confirmLabel}>{label}</Text><Text style={styles.confirmValue}>{value}</Text></View>)}
              </View>
            </ScrollView>
            <View style={styles.sheetActions}><View style={{ flex: 1 }}><ActionButton secondary title="No, cancel" onPress={() => setSheet(null)} /></View><View style={{ flex: 1 }}><ActionButton title="Yes, confirm bid" onPress={confirm} /></View></View>
          </> : <>
            <View style={styles.successBody}><Text style={styles.successTitle}>Bid successfully placed</Text><Text style={styles.successMessage}>Your bid of {naira(receipt?.offer ?? price)} for this load has been successfully submitted.</Text><Text style={styles.demoNote}>Demo preview · no bid sent to a server.</Text></View>
            <View style={styles.done}><ActionButton title="Done" onPress={finish} /></View>
          </>}
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAF9' },
  header: { minHeight: 70, borderBottomWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: 54 },
  back: { position: 'absolute', left: 30, padding: 4 },
  headerTitle: { fontSize: 21, fontWeight: '700', color: colors.ink },
  detailsContent: { padding: 24, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center', paddingBottom: 28 },
  footer: { padding: 24, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  pinnedSummary: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  bidContent: { paddingHorizontal: 24, gap: 18, paddingBottom: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  bidCard: { paddingTop: 26 },
  explanation: { color: colors.muted, fontSize: 16, lineHeight: 26 },
  selectLabel: { color: '#98A2B3', fontSize: 12, marginTop: 10, marginBottom: 20 },
  truckList: { gap: 14 },
  truck: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 9, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9, minHeight: 64, backgroundColor: colors.white },
  truckSelected: { backgroundColor: '#FFF8ED', borderColor: colors.orange },
  truckDisabled: { opacity: 0.55, backgroundColor: colors.surface },
  checkbox: { width: 19, height: 19, borderRadius: 5, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8F9FA', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: colors.button, backgroundColor: colors.button },
  truckName: { fontSize: 15, color: colors.ink },
  availability: { color: '#008563', fontSize: 14 },
  offer: { marginTop: 27, gap: 16 },
  offerTitle: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  offerValue: { color: colors.ink, fontFamily: headingFont, fontWeight: '700', fontSize: 18 },
  sliderContainer: { height: 44, justifyContent: 'center' },
  sliderTrack: { position: 'absolute', left: 14, right: 14, height: 11, borderRadius: 6, backgroundColor: colors.orange, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: colors.button },
  slider: { width: '100%', height: 44 },
  inputLabel: { color: colors.ink, fontSize: 15, marginTop: -4 },
  amountBox: { borderColor: colors.border, borderWidth: 1, borderRadius: 12, backgroundColor: '#F8F9FA', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  invalidInput: { borderColor: '#D92D20' },
  focusedInput: { borderColor: colors.green, borderWidth: 2 },
  currency: { borderRightWidth: 1, borderColor: colors.border, paddingHorizontal: 26, paddingVertical: 11, backgroundColor: colors.surface },
  amountText: { color: colors.ink, fontSize: 16 },
  amountInput: { flex: 1, minWidth: 0, paddingHorizontal: 10, paddingVertical: 11, fontSize: 16, color: colors.ink },
  hint: { flexDirection: 'row', gap: 5, alignItems: 'flex-start' },
  bidFooter: { gap: 18, paddingTop: 19, paddingBottom: 15 },
  totalValue: { fontFamily: headingFont, fontSize: 23, fontWeight: '700', color: colors.ink },
  error: { color: '#B42318', fontSize: 13 },
  schedule: { flexDirection: 'row', gap: 16 },
  scheduleColumn: { flex: 1, gap: 9 },
  deliveryColumn: { paddingLeft: 16, borderLeftWidth: 1, borderColor: colors.border },
  caption: { color: colors.subtle, fontSize: 12 },
  scheduleLocation: { color: colors.ink, fontWeight: '600', fontSize: 14 },
  specValue: { color: colors.ink, fontSize: 14, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 24, paddingTop: 32 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  sheetTitle: { color: colors.ink, fontSize: 21, fontWeight: '600' },
  confirmCard: { borderWidth: 1, borderColor: '#D0D5DE', borderRadius: 10, backgroundColor: colors.surface, padding: 16, paddingTop: 0 },
  confirmRow: { gap: 10, borderBottomWidth: 1, borderColor: '#D0D5DE', paddingVertical: 16 },
  confirmLabel: { color: colors.muted, fontSize: 12 },
  confirmValue: { color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 26 },
  sheetActions: { flexDirection: 'row', gap: 16, paddingTop: 16, borderTopWidth: 1, borderColor: colors.border },
  successBody: { paddingTop: 130, alignItems: 'center', gap: 14, paddingBottom: 22 },
  successTitle: { color: colors.ink, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  successMessage: { color: colors.muted, fontSize: 16, lineHeight: 26, textAlign: 'center' },
  demoNote: { color: colors.subtle, fontSize: 11, textAlign: 'center' },
  done: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 16 },
});
