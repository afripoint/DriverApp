import { DeliveryTracking } from './DeliveryTracking';
import { SettlementProgress, type TripProgress } from './SettlementProgress';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useRef, useState, type ComponentRef, type PropsWithChildren } from 'react';
import { Modal, Platform, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { colors, headingFont } from '../../theme';
import { naira } from '../marketplace/model';
import { ui } from '../marketplace/ui';
import type { JobDetailsData, Job } from './model';
import { RouteMap } from '../../components/maps/RouteMap';
import { WithdrawalContent } from './WithdrawalContent';
import { createWithdrawal, type Withdrawal } from './withdrawal';

type DetailTab = 'Overview' | 'Cargo' | 'Trucks' | 'Bid';
const tabs: DetailTab[] = ['Overview', 'Cargo', 'Trucks', 'Bid'];
const heights: Record<DetailTab, number> = { Overview: 414, Cargo: 505, Trucks: 520, Bid: 598 };

function DetailPanel({ title, children }: PropsWithChildren<{ title: string }>) {
  const [open, setOpen] = useState(true);
  return <View style={styles.panel}><Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={ui.between}><View style={styles.panelHeading}><View style={ui.dot} /><Text style={styles.panelTitle}>{title}</Text></View><Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} /></Pressable>{open && <><View style={styles.divider} />{children}</>}</View>;
}

function Spec({ label, value }: { label: string; value: string }) {
  return <View style={styles.spec}><Text style={styles.specLabel}>{label}</Text><Text style={styles.specValue}>{value}</Text></View>;
}

export function JobDetails({ job, detail, onBack, onWithdraw, accepted, onAccept, ready, onReady, progress, onProgress, onCompleted }: { job: Job; detail: JobDetailsData; onBack: () => void; onWithdraw: (withdrawal: Withdrawal) => void; accepted: boolean; onAccept: () => void; ready: boolean; onReady: () => void; progress: TripProgress; onProgress: (progress: TripProgress) => void; onCompleted: () => void }) {
  const assigned = job.status === 'Assigned' || job.status === 'In Transit';
  const bidding = job.status === 'Bidding';
  const [tab, setTab] = useState<DetailTab>('Overview');
  const [summaryOnly, setSummaryOnly] = useState(assigned);
  const [tripOpen, setTripOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [bodyHeight, setBodyHeight] = useState(700);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const assignedHeights: Record<DetailTab, number> = { Overview: 470, Cargo: 560, Trucks: detail.submittedTrucks.length <= 2 ? 415 : 575, Bid: 470 };
  const targetHeight = summaryOnly ? 176 : assigned ? assignedHeights[tab] : heights[tab];
  const sheetHeight = assigned ? Math.min(targetHeight, Math.max(0, bodyHeight - 84)) : expanded ? Math.max(200, bodyHeight - 14) : Math.min(targetHeight, Math.max(200, bodyHeight - 76));
  const mapHeight = Math.max(0, bodyHeight - sheetHeight);
  const withdrawing = useRef(false);
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -25) { if (assigned) setSummaryOnly(false); else setExpanded(true); }
      else if (gesture.dy > 25) { if (assigned) setSummaryOnly(true); else setExpanded(false); }
    },
  })).current;
  function changeTab(next: DetailTab) { setTab(next); setExpanded(false); setRouteOpen(false); }
  function closeWithdrawal() {
    setWithdrawOpen(false);
    if (withdrawing.current) onBack();
  }
  function confirmWithdraw(reason: string) {
    if (!bidding || withdrawing.current) return;
    const withdrawal = createWithdrawal(job.id, reason);
    withdrawing.current = true;
    onWithdraw(withdrawal);
    setWithdrawSuccess(true);
  }

  if (progress.started) return <DeliveryTracking onCompleted={onCompleted} job={{ ...job, status: 'In Transit' }} detail={detail} onBack={onBack} arrived={progress.arrived ?? false} onArrive={() => onProgress({ ...progress, arrived: true })} />;
  if (tripOpen) return <SettlementProgress job={job} detail={detail} accepted={accepted} onAccept={onAccept} ready={ready} onReady={onReady} progress={progress} onProgress={onProgress} onBack={() => setTripOpen(false)} />;

  return <View style={styles.root}>
    <BlurTargetView ref={blurTarget} style={styles.root} importantForAccessibility={withdrawOpen ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={withdrawOpen}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to My Jobs" hitSlop={12} onPress={onBack} style={styles.back}><Icon name="arrow-left" color={colors.ink} size={23} /></Pressable><Text style={styles.headerTitle}>Job details</Text></View>
    {bidding && tab === 'Bid' && <View style={styles.waiting}><View style={styles.waitingHeading}><Icon name="info" color="#D63D00" size={17} /><Text style={styles.waitingTitle}>Waiting on Shipper's Response</Text></View><Text style={styles.waitingText}>Trip updates will appear once the shipper responds.</Text></View>}
    <View style={styles.body} onLayout={event => setBodyHeight(event.nativeEvent.layout.height)}>
      {mapHeight >= 76 && <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: mapHeight }}><RouteMap origin={job.origin} destination={job.destination} pickup={detail.pickupCoordinate} delivery={detail.deliveryCoordinate} /></View>}
      <View style={styles.routeContainer}>
        <Pressable accessibilityRole="button" accessibilityLabel={routeOpen ? "Hide full route addresses" : "Show full route addresses"} accessibilityState={{ expanded: routeOpen }} onPress={() => setRouteOpen(!routeOpen)} style={styles.routeButton}>
          <Text style={styles.routeCity} numberOfLines={1}>{assigned ? job.origin.split(",")[0] : detail.originCity}</Text><Icon name="arrow-right" size={19} color={colors.orange} /><Text style={[styles.routeCity, { flex: 1.35 }]} numberOfLines={1}>{assigned ? job.destination.split(",")[0] : detail.destinationCity}</Text><Icon name={routeOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.ink} />
        </Pressable>
        {routeOpen && <View style={styles.routeAddresses}><View style={styles.addressRow}><Icon name="map-pin" color={colors.green} size={18} /><Text style={styles.address}>{job.origin}</Text></View><View style={styles.addressRow}><Icon name="map-pin" color={colors.orange} size={18} /><Text style={styles.address}>{job.destination}</Text></View></View>}
      </View>
      <View style={[styles.sheet, { height: sheetHeight }]}>
        <Pressable {...pan.panHandlers} accessibilityRole="button" accessibilityLabel={(assigned ? !summaryOnly : expanded) ? 'Collapse job details panel' : 'Expand job details panel'} accessibilityState={{ expanded: assigned ? !summaryOnly : expanded }} onPress={() => assigned ? setSummaryOnly(!summaryOnly) : setExpanded(!expanded)} style={styles.handleTouch}><View style={styles.handle} /></Pressable>
        <ScrollView key={tab} contentContainerStyle={[styles.sheetContent, assigned && { paddingBottom: summaryOnly ? 12 : 0 }]} showsVerticalScrollIndicator={false}>
          <View style={ui.between}><Text style={ui.body}>Load ID: {job.id}</Text><Text style={assigned ? styles.assignedBadge : ui.open}>{bidding ? 'Open' : job.status}</Text></View>
          <View style={styles.price}>
            <View style={{ gap: 8 }}><Text style={styles.priceLabel}>Agreed price</Text><Text style={styles.priceValue}>{naira(job.bid)}</Text></View>
            <View style={{ gap: 10, alignItems: 'flex-end' }}><Text style={styles.priceLabel}>Estimated range</Text><Text style={styles.priceRange}>{naira(job.minimum)}–{naira(job.maximum)}</Text></View>
          </View>
          {!summaryOnly && <>
          <View accessibilityRole="tablist" accessibilityLabel="Job detail sections" style={styles.tabs}>{tabs.map((item, index) => <Pressable key={item} accessibilityRole="tab" accessibilityLabel={`${item} details`} accessibilityState={{ selected: tab === item }} onPress={() => changeTab(item)} style={[styles.tab, index > 0 && styles.tabDivider, tab === item && styles.activeTab]}><Text style={[styles.tabText, tab === item && { color: colors.orange }]}>{item}</Text></Pressable>)}</View>
          {tab === 'Overview' && <DetailPanel title="SCHEDULED TIME"><View style={styles.schedule}><View style={styles.scheduleColumn}><Text style={styles.caption}>Pickup window</Text><Text style={styles.scheduleCity}>{detail.originCity}</Text><Text style={ui.body}>{detail.pickupWindow}</Text></View><View style={[styles.scheduleColumn, styles.delivery]}><Text style={styles.caption}>Drop-off time</Text><Text style={styles.scheduleCity}>{detail.destinationCity}</Text><Text style={ui.body}>{detail.deliveryTime}</Text></View></View></DetailPanel>}
          {tab === 'Cargo' && <DetailPanel title="CARGO & VEHICLE SPECIFICATION"><View style={styles.specs}>{[['Load Type', 'Full truck load (FTL)'], ['Weight', `${job.weight}kg`], ['Cargo type', job.cargo], ['Distance', `${detail.distance}km`], ['Truck Type', job.vehicle], ['Number of trucks', String(detail.requiredTrucks)]].map(([label, value]) => <Spec key={label} label={label} value={value} />)}</View></DetailPanel>}
          {tab === 'Trucks' && <DetailPanel title="TRUCKS SUBMITTED"><View style={styles.trucks}>{detail.submittedTrucks.map((truck, index) => <View key={truck.id} style={[styles.truck, detail.submittedTrucks.length % 2 === 1 && index === detail.submittedTrucks.length - 1 && { width: '100%' }]}><View style={styles.truckIcon}><Icon name="truck" size={18} color={colors.ink} /></View><View style={{ flex: 1, gap: 5 }}><Text style={styles.truckType}>{truck.type}</Text><Text style={styles.registration}>{truck.registration}</Text></View></View>)}</View></DetailPanel>}
          {tab === 'Bid' && <><DetailPanel title="SUBMITTED BID"><View style={styles.specs}><Spec label="Bid amount" value={naira(job.bid)} /><Spec label="Truck count" value={String(job.trucks)} /><Spec label="Submission timestamp" value={detail.submittedAt} /></View></DetailPanel>{bidding && <View style={styles.withdrawCard}><Text style={styles.withdrawTitle}>Need to withdraw?</Text><Text style={styles.withdrawCopy}>You can withdraw from this assignment before pickup begins. This may affect your carrier reliability rating and marketplace reviews.</Text><Pressable accessibilityRole="button" onPress={() => setWithdrawOpen(true)} style={styles.withdrawButton}><Text style={styles.withdrawButtonText}>Withdraw Bid</Text></Pressable></View>}</>}
          </>}
        </ScrollView>
        {assigned && !summaryOnly && <View style={styles.tripFooter}><Pressable accessibilityRole="button" onPress={() => setTripOpen(true)} style={styles.tripButton}><Icon name="globe" size={17} color={colors.white} /><Text style={styles.withdrawButtonText}>Manage trip</Text></Pressable></View>}
      </View>
    </View>
    </BlurTargetView>
    <Modal visible={withdrawOpen} transparent animationType="fade" onRequestClose={closeWithdrawal}>
      <View style={styles.modal}><BlurView blurTarget={Platform.OS === 'web' ? undefined : blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={32} tint="dark" style={StyleSheet.absoluteFill} /><Pressable accessibilityRole="button" accessibilityLabel="Dismiss withdrawal dialog" style={[StyleSheet.absoluteFill, styles.scrim]} onPress={closeWithdrawal} /><View accessibilityViewIsModal style={[styles.confirm, { paddingBottom: Math.max(24, insets.bottom), maxHeight: '94%' }]}><WithdrawalContent loadId={job.id} success={withdrawSuccess} onClose={closeWithdrawal} onConfirm={confirmWithdraw} /></View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  assignedBadge: { color: colors.green, backgroundColor: '#ECFDF5', borderColor: '#A0EDCE', borderWidth: 1, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 4, fontSize: 12 },
  tripFooter: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 23, paddingTop: 6, paddingBottom: 23, backgroundColor: colors.white },
  tripButton: { minHeight: 40, borderRadius: 12, backgroundColor: colors.button, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', padding: 9 },
  root: { flex: 1, backgroundColor: colors.white },
  header: { minHeight: 70, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 21, fontWeight: '700', color: colors.ink },
  back: { position: 'absolute', left: 30, padding: 4 },
  body: { flex: 1, overflow: 'hidden', backgroundColor: '#D2F4E2' },
  waiting: { backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#FFD3B6', paddingHorizontal: 16, paddingVertical: 15, gap: 7 },
  waitingHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waitingTitle: { color: '#D63D00', fontSize: 16, fontWeight: '700', flexShrink: 1 },
  waitingText: { color: '#D63D00', fontSize: 14, lineHeight: 21 },
  routeContainer: { position: 'absolute', top: 16, left: 24, right: 24, zIndex: 2 },
  routeButton: { minHeight: 57, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeCity: { flex: 1, color: colors.ink, fontFamily: headingFont, fontSize: 17, fontWeight: '700' },
  routeAddresses: { backgroundColor: colors.white, padding: 16, borderRadius: 16, marginTop: 5, gap: 14, borderWidth: 1, borderColor: colors.border },
  addressRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  address: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 21 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: colors.white, borderWidth: 1, borderColor: '#E1E5E8', overflow: 'hidden' },
  handleTouch: { height: 28, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 48, height: 5, borderRadius: 4, backgroundColor: '#D1D5DD' },
  sheetContent: { paddingHorizontal: 23, paddingBottom: 24, gap: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  price: { padding: 16, paddingVertical: 20, backgroundColor: colors.button, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  priceLabel: { color: colors.white, fontSize: 12 },
  priceValue: { color: colors.white, fontFamily: headingFont, fontWeight: '700', fontSize: 25 },
  priceRange: { color: colors.white, fontSize: 14, fontWeight: '500' },
  tabs: { flexDirection: 'row', borderWidth: 1, borderColor: '#CFD5DE', borderRadius: 8, overflow: 'hidden' },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabDivider: { borderLeftWidth: 1, borderColor: '#CFD5DE' },
  activeTab: { borderWidth: 1, borderColor: '#D94400', backgroundColor: '#FFF8ED' },
  tabText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  panel: { padding: 23, paddingVertical: 26, borderWidth: 1, borderColor: '#D0D5DE', borderRadius: 16 },
  panelHeading: { flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1 },
  panelTitle: { color: colors.ink, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 10, marginBottom: 13 },
  schedule: { flexDirection: 'row', gap: 16 },
  scheduleColumn: { flex: 1, gap: 10 },
  delivery: { borderLeftWidth: 1, borderColor: colors.border, paddingLeft: 16 },
  caption: { color: colors.subtle, fontSize: 12 },
  scheduleCity: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  specs: { gap: 14 },
  spec: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  specLabel: { color: colors.muted, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  specValue: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  trucks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  truck: { width: '48.4%', borderWidth: 1, borderColor: '#CFD5DE', borderRadius: 10, backgroundColor: colors.surface, padding: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  truckIcon: { width: 41, height: 41, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  truckType: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  registration: { color: colors.muted, fontSize: 12 },
  withdrawCard: { borderWidth: 1, borderColor: '#D0D5DE', borderRadius: 16, padding: 20, gap: 12 },
  withdrawTitle: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  withdrawCopy: { color: colors.muted, fontSize: 14, lineHeight: 23 },
  withdrawButton: { backgroundColor: '#CC003D', minHeight: 40, alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 12, marginTop: 6 },
  withdrawButtonText: { color: colors.white, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  modal: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  confirm: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 },

});
