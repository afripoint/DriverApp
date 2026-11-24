import { CompleteDelivery } from './CompleteDelivery';
import { ReportIncident } from './ReportIncident';
import { ShipperChat } from './ShipperChat';
import { BlurTargetView, BlurView } from 'expo-blur';
import { ShipperContacts } from './ShipperContacts';
import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { RouteMap } from '../../components/maps/RouteMap';
import { colors, headingFont } from '../../theme';
import { naira } from '../marketplace/model';
import { ActionButton, ui } from '../marketplace/ui';
import type { Job, JobDetailsData } from './model';

export type TrackingState = 'normal' | 'offline' | 'eta' | 'deviation' | 'range';
export function DeliveryTracking({ job, detail, onBack, arrived, onArrive, onCompleted }: { job: Job; detail: JobDetailsData; onBack: () => void; arrived: boolean; onArrive: () => void; onCompleted: () => void }) {
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dialog, setDialog] = useState<'call' | 'message' | 'issue' | 'arrival' | null>(null);
  const state = job.trackingState ?? 'normal';
  const eta = state === 'eta' ? '12h 30min' : '2h 45min';
  const banner = state === 'offline' ? ['No Internet Connection', 'Trip data will automatically sync once your connection is restored.'] : state === 'eta' ? ['ETA Updated: 12h 30min', 'Arrival time updated due to route change and traffic conditions.'] : state === 'deviation' ? ['Route Deviation Detected', 'You have deviated from the planned route.'] : null;
  const danger = state === 'deviation';
  const close = () => setDialog(null);
  function Contact({ name, icon, kind, red = false }: { name: string; icon: IconName; kind: 'call' | 'message' | 'issue'; red?: boolean }) {
    return <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={() => kind === 'message' ? setChatOpen(true) : setDialog(kind)} style={styles.contact}><View style={styles.contactIcon}><Icon name={icon} size={23} color={red ? '#CC003D' : colors.muted} /></View><Text style={[styles.contactText, red && { color: '#CC003D' }]}>{name}</Text></Pressable>;
  }
  if (completionOpen) return <CompleteDelivery key={job.id} job={job} detail={detail} onCompleted={onCompleted} onBack={() => setCompletionOpen(false)} />;
  if (chatOpen) return <ShipperChat key={job.id} loadId={job.id} onBack={() => setChatOpen(false)} />;
  return <View style={styles.root}>
    <BlurTargetView ref={blurTarget} style={styles.root} importantForAccessibility={dialog ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={!!dialog}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to My Jobs" onPress={onBack} style={styles.back}><Icon name="arrow-left" size={23} color={colors.ink} /></Pressable><Text style={styles.title}>Job details</Text></View>
    {banner && <View accessibilityRole="alert" style={[styles.banner, danger && styles.danger]}><View style={styles.bannerHeading}><Icon name={danger ? 'alert-triangle' : 'info'} color={danger ? '#A00038' : '#D63D00'} size={17} /><Text style={[styles.bannerTitle, danger && styles.dangerText]}>{banner[0]}</Text></View><Text style={[styles.bannerText, danger && styles.dangerText]}>{banner[1]}</Text></View>}
    <View style={styles.body}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: expanded ? '14%' : '39%' }}><RouteMap origin={job.origin} destination={job.destination} pickup={detail.pickupCoordinate} delivery={detail.deliveryCoordinate} /></View>
      <View style={styles.route}>
        <Pressable accessibilityRole="button" accessibilityLabel="Show full route addresses" accessibilityState={{ expanded: routeOpen }} onPress={() => setRouteOpen(!routeOpen)} style={styles.routeButton}><Text numberOfLines={1} style={styles.city}>{detail.originCity}…</Text><Icon name="arrow-right" size={20} color={colors.orange} /><Text numberOfLines={1} style={styles.city}>{detail.destinationCity}…</Text><Icon name={routeOpen ? 'chevron-up' : 'chevron-down'} size={18} /></Pressable>
        {routeOpen && <View style={styles.addresses}><Text style={ui.body}>{job.origin}</Text><Text style={ui.body}>{job.destination}</Text></View>}
      </View>
      <View style={[styles.sheet, { height: expanded ? '86%' : '61%' }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Collapse tracking panel' : 'Expand tracking panel'} onPress={() => setExpanded(!expanded)} style={styles.handleTouch}><View style={styles.handle} /></Pressable>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={ui.between}><Text style={ui.body}>Load ID: {job.id}</Text><Text style={styles.badge}>In Transit</Text></View>
          <View style={styles.price}><View style={{ gap: 8 }}><Text style={styles.white}>Agreed price</Text><Text style={styles.priceValue}>{naira(job.bid)}</Text></View>{state === 'range' && <View style={{ alignItems: 'flex-end', gap: 10 }}><Text style={styles.white}>Estimated range</Text><Text style={styles.white}>{naira(job.minimum)}–{naira(job.maximum)}</Text></View>}</View>
          <View style={{ gap: 6 }}><View style={styles.etaRow}><Icon name="clock" color={colors.ink} size={23} /><Text style={styles.eta}>ETA {eta}</Text></View><Text style={styles.distance}>{arrived ? '0 km remaining' : '312 km remaining'}</Text></View>
          <View style={{ gap: 8 }}><View style={ui.between}><Text style={ui.body}>Started 06:30am</Text><Text style={styles.complete}>{arrived ? '100' : '55'}% Complete</Text></View><View accessibilityRole="progressbar" accessibilityLabel="Trip completion" accessibilityValue={{ min: 0, max: 100, now: arrived ? 100 : 55 }} style={styles.track}><View style={[styles.fill, { width: arrived ? '100%' : '55%' }]} /></View></View>
          <View style={styles.contacts}><Contact name="Call Shipper" icon="phone" kind="call" /><Contact name="Message Shipper" icon="message-circle" kind="message" /><Contact name="Report Issue" icon="alert-triangle" kind="issue" red /></View>
          <Text style={styles.demo}>Demo tracking data · no live location or operations notifications.</Text>
        </ScrollView>
        <View style={styles.footer}><ActionButton title="I have arrived" onPress={() => { if (!arrived) onArrive(); setCompletionOpen(true); }} /></View>
      </View>
    </View>
    </BlurTargetView>
    <Modal visible={dialog !== null} transparent animationType="fade" onRequestClose={close}><View style={styles.modal}><BlurView blurTarget={Platform.OS === 'web' ? undefined : blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={32} tint="dark" style={StyleSheet.absoluteFill} /><Pressable accessibilityRole="button" accessibilityLabel="Close tracking dialog" onPress={close} style={[StyleSheet.absoluteFill, styles.scrim]} />{dialog === 'issue' ? <ReportIncident loadId={job.id} onClose={close} /> : dialog === 'call' ? <ScrollView accessibilityViewIsModal style={styles.contactSheet} contentContainerStyle={styles.contactSheetContent}><ShipperContacts onClose={close} /></ScrollView> : <View accessibilityViewIsModal style={styles.dialog}><Text style={styles.title}>{dialog === 'arrival' ? 'Confirm arrival' : dialog === 'message' ? 'Message Shipper' : 'Report Issue'}</Text><Text style={ui.body}>{dialog === 'arrival' ? 'Have you arrived at the delivery location? This records arrival in the demo session.' : 'Shipper contact details will be available when the shipment endpoint is connected.'}</Text>{dialog === 'arrival' && <ActionButton title="Yes, I have arrived" onPress={() => { onArrive(); close(); }} />}<ActionButton secondary title={dialog === 'arrival' ? 'No, cancel' : 'Done'} onPress={close} /></View>}</View></Modal>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: { minHeight: 70, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border },
  back: { position: 'absolute', left: 28, padding: 6 },
  title: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  banner: { padding: 16, gap: 7, borderWidth: 1, borderColor: '#FFD3B6', backgroundColor: '#FFF8F0' },
  bannerHeading: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: '#D63D00', flexShrink: 1 },
  bannerText: { fontSize: 14, lineHeight: 21, color: '#D63D00' },
  danger: { backgroundColor: '#FFFAFC', borderColor: '#FFBDCF' },
  dangerText: { color: '#A00038' },
  body: { flex: 1, overflow: 'hidden' },
  route: { position: 'absolute', top: 16, left: 24, right: 24, zIndex: 2 },
  routeButton: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 15, minHeight: 57, flexDirection: 'row', alignItems: 'center', gap: 10 },
  city: { flex: 1, fontFamily: headingFont, fontWeight: '700', fontSize: 17, color: colors.ink },
  addresses: { backgroundColor: colors.white, borderRadius: 12, padding: 15, gap: 12, marginTop: 4 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, overflow: 'hidden' },
  handleTouch: { height: 28, justifyContent: 'center', alignItems: 'center' },
  handle: { height: 5, width: 48, borderRadius: 4, backgroundColor: '#D1D5DD' },
  content: { paddingHorizontal: 23, gap: 18, paddingBottom: 10, width: '100%', maxWidth: 600, alignSelf: 'center' },
  badge: { ...ui.open, backgroundColor: '#F4F8FD', borderColor: '#B6D6FF', color: '#4C5CCA' },
  price: { backgroundColor: colors.button, borderRadius: 12, padding: 16, paddingVertical: 20, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  white: { color: colors.white, fontSize: 12 },
  priceValue: { color: colors.white, fontFamily: headingFont, fontSize: 25, fontWeight: '700' },
  etaRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  eta: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  distance: { color: colors.orange, fontSize: 17 },
  complete: { color: colors.green, fontSize: 14 },
  track: { height: 6, backgroundColor: colors.border, borderRadius: 4 },
  fill: { height: 6, borderRadius: 4, backgroundColor: colors.button },
  contacts: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginTop: 6 },
  contact: { flex: 1, alignItems: 'center', gap: 10 },
  contactIcon: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  contactText: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  demo: { color: colors.subtle, fontSize: 10, lineHeight: 14 },
  footer: { paddingHorizontal: 23, paddingTop: 8, paddingBottom: 23, width: '100%', maxWidth: 600, alignSelf: 'center' },
  contactSheet: { flexGrow: 0, maxHeight: '90%', backgroundColor: colors.white, borderTopLeftRadius: 40, borderTopRightRadius: 40 },
  contactSheetContent: { padding: 24, gap: 23, width: '100%', maxWidth: 650, alignSelf: 'center' },
  modal: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  dialog: { backgroundColor: colors.white, padding: 24, gap: 18, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
});
