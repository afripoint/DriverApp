import { DeliveryTracking } from './DeliveryTracking';
import type { TripProgress } from './SettlementProgress';
import type { Withdrawal } from './withdrawal';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { colors, headingFont } from '../../theme';
import { naira, type Bid } from '../marketplace/model';
import { ActionButton, ui } from '../marketplace/ui';
import { allJobs, jobsWithProgress, filterJobs, initialJobFilters, jobStatuses, type Job, type JobFilters, type JobSort, type JobStatus } from './model';
import { JobDetails } from './JobDetails';

function JobFact({ icon, text }: { icon: IconName; text: string }) {
  return <View style={styles.fact}><Icon name={icon} size={16} /><Text style={styles.factText}>{text}</Text></View>;
}

function JobCard({ job, onOpen }: { job: Job; onOpen?: () => void }) {
  const inTransit = job.status === 'In Transit';
  const completed = job.status === 'Completed';
  return <View style={styles.card}>
    <Text style={[styles.badge, job.status === 'Bidding' && styles.biddingBadge, inTransit && styles.transitBadge, completed && styles.completedBadge]}>{inTransit ? 'In transit' : job.status}</Text>
    <View style={styles.route}>
      <View style={styles.locationRow}><Icon name="map-pin" size={18} color={colors.green} /><Text style={styles.address}>{job.origin}</Text></View>
      <View style={styles.routeDash} />
      <View style={styles.locationRow}><Icon name="map-pin" size={18} color={colors.orange} /><Text style={styles.address}>{job.destination}</Text></View>
    </View>
    <View style={styles.factRow}><JobFact icon="truck" text={job.vehicle} /><JobFact icon="package" text={`${job.weight.toLocaleString('en-NG')} kg`} /></View>
    <View style={styles.factRow}><JobFact icon="tag" text={job.cargo} /><JobFact icon={completed ? "git-branch" : "layers"} text={completed ? (job.details?.submittedTrucks[0]?.registration ?? "Not recorded") : `${job.trucks} truck${job.trucks === 1 ? '' : 's'} bid`} /></View>
    {!completed && <View style={styles.amounts}>
      <View style={styles.amountColumn}><Text style={styles.amountLabel}>BID AMOUNT</Text><Text style={styles.amountValue}>{naira(job.bid)}</Text></View>
      <View style={[styles.amountColumn, { alignItems: 'flex-end' }]}><Text style={styles.amountLabel}>BUDGET RANGE</Text><Text style={styles.amountValue}>{naira(job.minimum)}–{naira(job.maximum)}</Text></View>
    </View>}
    <View style={styles.pickup}><Icon name="clock" size={16} color={colors.subtle} /><Text style={[styles.pickupText, { flex: 1 }]}>{completed ? 'Delivered ' + (job.deliveredOn ?? 'today') : inTransit ? 'Delivery in progress' : `Pickup: ${job.pickup}`}</Text>{(inTransit || completed) && <Text style={styles.deliveryValue}>{naira((completed ? job.bid : job.maximum) * job.trucks)}</Text>}</View>
    {onOpen && <Pressable accessibilityRole="button" accessibilityLabel={`${inTransit ? 'Track delivery' : 'View job details'} ${job.id}`} onPress={onOpen} style={({ pressed }) => [styles.detailsButton, pressed && { opacity: 0.8 }]}><Icon name={inTransit ? 'map-pin' : 'eye'} size={16} color={colors.white} /><Text style={styles.detailsText}>{inTransit ? 'Track delivery' : 'View job details'}</Text></Pressable>}
  </View>;
}

type ToggleFilter = Exclude<keyof JobFilters, 'query'>;
const filterOptions: { key: ToggleFilter; label: string }[] = [{ key: 'nearMe', label: 'Near me' }, { key: 'pickupToday', label: 'Pickup today' }, { key: 'dryVan', label: 'Dry van' }, { key: 'bestRate', label: 'Best rate' }];
const statusDescriptions: Record<JobStatus, string> = { Bidding: 'bidding', Assigned: 'assigned', 'In Transit': 'in transit', Completed: 'completed' };

export function JobsScreen({ bids, withdrawnIds, onWithdrawBid, onDetailChange, acceptedTripIds, onAcceptTrip, readyTripIds, onReadyTrip, tripProgress, onTripProgress, initialStatus = 'Assigned' }: { bids: Bid[]; withdrawnIds: string[]; onWithdrawBid: (withdrawal: Withdrawal) => void; onDetailChange: (open: boolean) => void; acceptedTripIds: ReadonlySet<string>; onAcceptTrip: (id: string) => void; readyTripIds: ReadonlySet<string>; onReadyTrip: (id: string) => void; tripProgress: Record<string, TripProgress>; onTripProgress: (id: string, progress: TripProgress) => void; initialStatus?: JobStatus }) {
  const [status, setStatus] = useState<JobStatus>(initialStatus);
  const [filters, setFilters] = useState<JobFilters>(() => initialStatus === 'Bidding' ? { ...initialJobFilters, nearMe: false } : initialJobFilters);
  const [sort, setSort] = useState<JobSort>('Recommended');
  const [selected, setSelected] = useState<Job | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const insets = useSafeAreaInsets();
  const jobs = useMemo(() => jobsWithProgress(allJobs(bids, withdrawnIds), tripProgress), [bids, withdrawnIds, tripProgress]);
  const visible = useMemo(() => filterJobs(jobs, status, filters, sort), [jobs, status, filters, sort]);
  const pages = Math.max(1, Math.ceil(visible.length / 5));
  const currentPage = Math.min(page, pages);
  const shown = (status === 'In Transit' || status === 'Completed') ? visible.slice((currentPage - 1) * 5, currentPage * 5) : visible;
  useEffect(() => setPage(1), [status, filters, sort]);

  function completeSelected() {
    if (!selected) return;
    onTripProgress(selected.id, { ...tripProgress[selected.id], verified: true, started: true, arrived: true, completedAt: new Date().toISOString() });
    setStatus('Completed');
    setFilters({ query: '', nearMe: false, pickupToday: false, dryVan: false, bestRate: false });
    setPage(1);
    setSelected(null);
    onDetailChange(false);
  }
  function closeDetails() { setSelected(null); onDetailChange(false); }
  useEffect(() => {
    if (!selected) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { closeDetails(); return true; });
    return () => listener.remove();
  }, [selected, onDetailChange]);
  function toggle(key: ToggleFilter) { setFilters(previous => ({ ...previous, [key]: !previous[key] })); }

  if (selected?.status === 'In Transit' && selected.details) return <DeliveryTracking onCompleted={completeSelected} key={selected.id} job={selected} detail={selected.details} onBack={closeDetails} arrived={tripProgress[selected.id]?.arrived ?? false} onArrive={() => onTripProgress(selected.id, { ...tripProgress[selected.id], verified: true, started: true, arrived: true })} />;
  if (selected?.details && selected.status !== 'Completed') return <JobDetails onCompleted={completeSelected} key={selected.id} job={selected} detail={selected.details} onBack={closeDetails} onWithdraw={onWithdrawBid} accepted={selected.status === 'In Transit' || acceptedTripIds.has(selected.id)} onAccept={() => onAcceptTrip(selected.id)} ready={selected.status === 'In Transit' || readyTripIds.has(selected.id)} onReady={() => onReadyTrip(selected.id)} progress={tripProgress[selected.id] ?? { verified: selected.status === 'In Transit', started: selected.status === 'In Transit' }} onProgress={progress => onTripProgress(selected.id, progress)} />;
  if (selected) return <View style={styles.screen}>
    <View style={styles.detailHeader}><Pressable accessibilityRole="button" accessibilityLabel="Back to My Jobs" hitSlop={12} onPress={closeDetails}><Icon name="arrow-left" color={colors.ink} size={23} /></Pressable><Text style={styles.detailTitle}>Job details</Text><View style={{ width: 23 }} /></View>
    <ScrollView contentContainerStyle={styles.detailContent}><Text style={ui.body}>Load ID: {selected.id}</Text><JobCard job={selected} /><View style={[ui.card, { gap: 10 }]}><Text style={ui.heading}>Trip summary</Text><Text style={ui.body}>Status: {selected.status}</Text><Text style={ui.body}>Total job value: {naira(selected.bid * selected.trucks)}</Text><Text style={ui.body}>Delivery completed. This is a local preview record.</Text></View></ScrollView>
  </View>;

  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.intro}><Text accessibilityRole="header" style={styles.title}>My Jobs</Text><Text style={styles.subtitle}>Manage your loads by status and take the next action for each trip.</Text></View>
      <View style={styles.search}><Icon name="search" color={colors.subtle} size={18} /><TextInput accessibilityLabel="Search my jobs" placeholder="Search city, state, or load ID" placeholderTextColor={colors.subtle} style={styles.searchInput} value={filters.query} onChangeText={query => setFilters(previous => ({ ...previous, query }))} autoCorrect={false} />{!!filters.query && <Pressable accessibilityRole="button" accessibilityLabel="Clear job search" onPress={() => setFilters(previous => ({ ...previous, query: '' }))} hitSlop={8}><Icon name="x" size={15} /></Pressable>}<Pressable accessibilityRole="button" accessibilityLabel="Filter jobs" style={styles.filterIcon} onPress={() => setFilterOpen(true)}><Icon name="sliders" size={17} color={colors.green} /></Pressable></View>
      <View style={styles.chips}>{filterOptions.map(option => <Pressable key={option.key} accessibilityRole="button" accessibilityState={{ selected: filters[option.key] }} onPress={() => toggle(option.key)} style={[styles.chip, filters[option.key] && styles.chipSelected]}><Text style={[styles.chipText, filters[option.key] && { color: colors.white }]}>{option.label}</Text></Pressable>)}</View>
      <View accessibilityRole="tablist" accessibilityLabel="Job status" style={styles.statusTabs}>{jobStatuses.map((item, index) => <Pressable key={item} accessibilityRole="tab" accessibilityLabel={`${item} jobs`} accessibilityState={{ selected: status === item }} onPress={() => setStatus(item)} style={[styles.statusTab, index > 0 && styles.statusDivider, status === item && styles.statusSelected]}><Text style={[styles.statusText, status === item && { color: colors.orange }]}>{item}</Text></Pressable>)}</View>
      <View style={[ui.between, { flexWrap: 'wrap' }]}><Text style={styles.count}>{status === 'Completed' ? visible.length + ' completed load' + (visible.length === 1 ? '' : 's') : status === 'In Transit' ? visible.length + ' in transit load' + (visible.length === 1 ? '' : 's') : visible.length + ' load' + (visible.length === 1 ? '' : 's') + ' ' + statusDescriptions[status]}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Sort jobs: ${sort}. Tap to change`} onPress={() => { setFilters(previous => ({ ...previous, bestRate: false })); setSort(sort === 'Recommended' ? 'Highest bid' : sort === 'Highest bid' ? 'Lowest bid' : 'Recommended'); }}><Text style={styles.sort}>Sort: {filters.bestRate ? 'Best rate' : sort}</Text></Pressable></View>
      {shown.map(job => <JobCard key={job.id} job={job} onOpen={() => { setSelected(job); onDetailChange(true); }} />)}
      {(status === 'In Transit' || status === 'Completed') && visible.length > 0 && <View style={styles.pagination}>
        <Text style={styles.pickupText}>Showing {(currentPage - 1) * 5 + 1}–{Math.min(currentPage * 5, visible.length)} of {visible.length}</Text>
        <View style={styles.pageButtons}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous jobs page" disabled={currentPage === 1} accessibilityState={{ disabled: currentPage === 1 }} onPress={() => setPage(currentPage - 1)} style={styles.pageButton}><Icon name="chevron-left" size={17} color={currentPage === 1 ? colors.border : colors.muted} /></Pressable>
          {Array.from({ length: pages }, (_, index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Jobs page ${index + 1}`} accessibilityState={{ selected: currentPage === index + 1 }} onPress={() => setPage(index + 1)} style={[styles.pageButton, currentPage === index + 1 && { backgroundColor: colors.surface }]}><Text style={styles.pageText}>{index + 1}</Text></Pressable>)}
          <Pressable accessibilityRole="button" accessibilityLabel="Next jobs page" disabled={currentPage === pages} accessibilityState={{ disabled: currentPage === pages }} onPress={() => setPage(currentPage + 1)} style={styles.pageButton}><Icon name="chevron-right" size={17} color={currentPage === pages ? colors.border : colors.muted} /></Pressable>
        </View>
      </View>}
      {!visible.length && <View style={[ui.card, styles.empty]}><Icon name="briefcase" color={colors.green} size={26} /><Text style={ui.heading}>No {statusDescriptions[status]} loads</Text><Text style={[ui.body, { textAlign: 'center' }]}>{status === 'Bidding' && !bids.length ? 'Your marketplace bids will appear here after you submit an offer.' : 'Try another search or filter, or check another status.'}</Text><ActionButton secondary title="Clear filters" onPress={() => setFilters({ query: '', nearMe: false, pickupToday: false, dryVan: false, bestRate: false })} /></View>}
    </ScrollView>
    <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
      <View style={styles.modal}><Pressable accessibilityRole="button" accessibilityLabel="Close job filters" onPress={() => setFilterOpen(false)} style={[StyleSheet.absoluteFill, styles.scrim]} /><View accessibilityViewIsModal style={[styles.filterSheet, { paddingBottom: Math.max(24, insets.bottom) }]}><View style={ui.between}><Text style={styles.detailTitle}>Filter jobs</Text><Pressable accessibilityRole="button" accessibilityLabel="Close filters" hitSlop={12} onPress={() => setFilterOpen(false)}><Icon name="x" /></Pressable></View>{filterOptions.map(option => <Pressable key={option.key} accessibilityRole="checkbox" accessibilityLabel={option.label} accessibilityState={{ checked: filters[option.key] }} onPress={() => toggle(option.key)} style={styles.filterRow}><Text style={ui.body}>{option.label}</Text><Icon name={filters[option.key] ? 'check-square' : 'square'} color={filters[option.key] ? colors.green : colors.subtle} /></Pressable>)}<ActionButton title="Apply filters" onPress={() => setFilterOpen(false)} /><ActionButton secondary title="Reset filters" onPress={() => setFilters({ ...initialJobFilters, query: filters.query })} /></View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  completedBadge: { color: colors.ink, backgroundColor: '#F8F9FA', borderColor: colors.border },
  transitBadge: { color: '#3974CF', borderColor: '#B5DAFF', backgroundColor: '#EFF8FF' },
  deliveryValue: { color: colors.orange, fontSize: 17, fontWeight: '700', fontFamily: headingFont },
  pagination: { gap: 16, paddingVertical: 12 },
  pageButtons: { flexDirection: 'row', alignSelf: 'flex-start', borderRadius: 9, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  pageButton: { minWidth: 36, minHeight: 38, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderColor: colors.border },
  pageText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
  screen: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24, paddingTop: 26, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  intro: { gap: 8, marginBottom: 24 },
  title: { fontFamily: headingFont, color: colors.ink, fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#F8FAFA', borderColor: colors.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 12, color: colors.ink, paddingVertical: 12 },
  filterIcon: { borderWidth: 1, borderColor: colors.border, borderRadius: 7, backgroundColor: colors.white, padding: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18 },
  chipSelected: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.ink, fontSize: 11, fontWeight: '500' },
  statusTabs: { flexDirection: 'row', borderWidth: 1, borderColor: '#D0D5DE', borderRadius: 7, overflow: 'hidden' },
  statusTab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 2 },
  statusDivider: { borderLeftWidth: 1, borderLeftColor: '#D0D5DE' },
  statusSelected: { backgroundColor: '#FFF8ED', borderColor: colors.orange, borderWidth: 1, marginVertical: -1 },
  statusText: { color: colors.muted, fontSize: 13 },
  count: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  sort: { color: colors.green, fontSize: 11, fontWeight: '600' },
  card: { borderWidth: 1, borderColor: '#D0D5DE', borderRadius: 16, padding: 23, gap: 14, backgroundColor: colors.white },
  badge: { alignSelf: 'flex-start', backgroundColor: '#ECFDF3', color: colors.green, borderWidth: 1, borderColor: '#A1EFCC', borderRadius: 6, fontSize: 12, paddingHorizontal: 5, paddingVertical: 4 },
  biddingBadge: { color: '#9A4A00', backgroundColor: '#FFF8ED', borderColor: '#FFD3B6' },
  route: { gap: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { flex: 1, color: colors.ink, fontSize: 16, lineHeight: 25, fontWeight: '600' },
  routeDash: { height: 8, width: 2, marginLeft: 7, backgroundColor: colors.subtle, marginVertical: -4 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factText: { color: colors.muted, fontSize: 14 },
  amounts: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, borderWidth: 1, borderColor: '#D0D5DE', borderRadius: 10, backgroundColor: colors.surface, padding: 15, paddingVertical: 18 },
  amountColumn: { gap: 7, flexShrink: 1 },
  amountLabel: { color: colors.muted, fontSize: 10 },
  amountValue: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  pickup: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderColor: colors.border, paddingTop: 16 },
  pickupText: { color: colors.subtle, fontSize: 13, flexShrink: 1 },
  detailsButton: { backgroundColor: colors.button, borderRadius: 8, minHeight: 37, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', padding: 8, marginTop: -4 },
  detailsText: { color: colors.white, fontSize: 14, fontWeight: '500' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 65, borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: 24 },
  detailTitle: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  detailContent: { padding: 24, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  empty: { alignItems: 'center', gap: 14 },
  modal: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  filterSheet: { padding: 24, gap: 16, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 },
});
