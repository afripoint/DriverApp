import type { JobStatus } from '../features/jobs/model';
import type { TripProgress } from '../features/jobs/SettlementProgress';
import type { Withdrawal } from '../features/jobs/withdrawal';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../components/Icon';
import { activeLoad as load } from '../data/demo';
import { colors, headingFont } from '../theme';
import type { Driver } from '../services/auth';
import { MarketplaceScreen } from '../features/marketplace/MarketplaceScreen';
import type { Bid } from '../features/marketplace/model';
import { JobsScreen } from '../features/jobs/JobsScreen';

type Tab = 'Home' | 'Marketplace' | 'Jobs' | 'Profile';
const tabs: { name: Tab; icon: IconName }[] = [{ name: 'Home', icon: 'home' }, { name: 'Marketplace', icon: 'search' }, { name: 'Jobs', icon: 'briefcase' }, { name: 'Profile', icon: 'user' }];

function Detail({ icon, children }: { icon: IconName; children: string }) {
  return <View style={styles.detail}><Icon name={icon} size={16} /><Text style={styles.detailText}>{children}</Text></View>;
}

function LoadCard() {
  return (
    <View style={styles.loadCard}>
      <View style={styles.route}>
        <View style={styles.routeIcons}><Icon name="map-pin" size={18} color={colors.green} /><View style={styles.dash} /><Icon name="map-pin" size={18} color={colors.orange} /></View>
        <View style={{ gap: 13, flex: 1 }}><Text style={styles.location}>{load.origin}</Text><Text style={styles.location}>{load.destination}</Text></View>
      </View>
      <View style={styles.detailRow}><Detail icon="calendar">{load.date}</Detail><Detail icon="tag">{load.type}</Detail></View>
      <View style={styles.detailRow}><Detail icon="truck">{load.vehicle}</Detail><Detail icon="shopping-bag">{load.cargo}</Detail></View>
      <View style={styles.rate}><Text style={styles.rateText}><Text style={styles.rateValue}>{load.rate}</Text> per truck</Text><Text style={styles.quantity}>{load.quantity}</Text></View>
      <View style={styles.cardFooter}><View style={styles.posted}><Icon name="clock" size={16} color={colors.subtle} /><Text style={styles.postedText}>{load.posted}</Text></View><Text style={styles.total}>{load.total}</Text></View>
    </View>
  );
}

export function DashboardScreen({ driver, onSignOut }: { driver: Driver; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>('Home');
  const [jobsInitialStatus, setJobsInitialStatus] = useState<JobStatus>('Assigned');
  const [jobOpen, setJobOpen] = useState(false);
  const [marketDetail, setMarketDetail] = useState(false);
  const [jobsDetail, setJobsDetail] = useState(false);
  const [marketBids, setMarketBids] = useState<Bid[]>([]);
  const [tripProgress, setTripProgress] = useState<Record<string, TripProgress>>({});
  const updateTripProgress = (id: string, progress: TripProgress) => setTripProgress(previous => ({ ...previous, [id]: progress }));
  const [readyTripIds, setReadyTripIds] = useState<ReadonlySet<string>>(() => new Set());
  const readyTrip = (id: string) => setReadyTripIds(previous => previous.has(id) ? previous : new Set([...previous, id]));
  const [acceptedTripIds, setAcceptedTripIds] = useState<ReadonlySet<string>>(() => new Set());
  const acceptTrip = (id: string) => setAcceptedTripIds(previous => previous.has(id) ? previous : new Set([...previous, id]));
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]); const withdrawnBidIds = withdrawals.map(item => item.loadId);
  const saveBid = (bid: Bid) => { setMarketBids(previous => [...previous.filter(item => item.loadId !== bid.loadId), bid]); setWithdrawals(previous => previous.filter(item => item.loadId !== bid.loadId)); setJobsInitialStatus('Bidding'); setMarketDetail(false); setJobsDetail(false); setJobOpen(false); setTab('Jobs'); };
  const withdrawBid = (withdrawal: Withdrawal) => { setMarketBids(previous => previous.filter(bid => bid.loadId !== withdrawal.loadId)); setWithdrawals(previous => [...previous.filter(item => item.loadId !== withdrawal.loadId), withdrawal]); };
  const openJob = () => { setTab('Jobs'); setJobOpen(true); };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {tab === 'Marketplace' ? <MarketplaceScreen onDetailChange={setMarketDetail} bids={marketBids} onBid={saveBid} /> : tab === 'Jobs' && !jobOpen ? <JobsScreen initialStatus={jobsInitialStatus} bids={marketBids} withdrawnIds={withdrawnBidIds} onWithdrawBid={withdrawBid} onDetailChange={setJobsDetail} acceptedTripIds={acceptedTripIds} onAcceptTrip={acceptTrip} readyTripIds={readyTripIds} onReadyTrip={readyTrip} tripProgress={tripProgress} onTripProgress={updateTripProgress} /> : <ScrollView contentContainerStyle={styles.content}>
        {tab === 'Home' ? <>
          <View style={styles.header}><Text style={styles.title}>Good morning, {driver.name}</Text><Text style={styles.date}>Thursday, October 1</Text></View>
          <View style={styles.stats}>
            {[{ icon: 'truck' as const, value: '1', label: 'Active load' }, { icon: 'clipboard' as const, value: '2', label: 'Assigned' }, { icon: 'dollar-sign' as const, value: '$3.8k', label: 'This week' }].map(stat => <View key={stat.label} style={styles.stat}><Icon name={stat.icon} size={18} color={colors.green} /><Text style={styles.statValue}>{stat.value}</Text><Text style={styles.statLabel}>{stat.label}</Text></View>)}
          </View>
          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Active load</Text><Pressable accessibilityRole="button" hitSlop={10} onPress={openJob}><Text style={styles.link}>View job</Text></Pressable></View>
          <LoadCard />
          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Assigned next</Text><Pressable accessibilityRole="button" hitSlop={10} onPress={() => { setJobsInitialStatus('Assigned'); setTab('Jobs'); setJobOpen(false); }}><Text style={styles.link}>See all</Text></Pressable></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open assigned jobs" style={styles.nextCard} onPress={() => { setJobsInitialStatus('Assigned'); setTab('Jobs'); setJobOpen(false); }}>
            <View style={styles.calendar}><Text style={styles.month}>OCT</Text><Text style={styles.day}>03</Text></View>
            <View style={{ flex: 1, gap: 4 }}><Text style={styles.nextTitle}>Louisville, KY → Atlanta, GA</Text><Text style={styles.nextMeta}>LOAD #A-10504 · 421 mi · $1,680</Text></View><Icon name="chevron-right" size={20} color={colors.subtle} />
          </Pressable>
        </> : tab === 'Jobs' ? <>
          <Text style={styles.title}>{jobOpen ? 'Job details' : 'My jobs'}</Text>
          <Text style={styles.date}>Active load</Text><LoadCard />
          <Text style={styles.sectionTitle}>Assigned next</Text>
          <View style={styles.placeholder}><Text style={styles.nextTitle}>Louisville, KY → Atlanta, GA</Text><Text style={styles.nextMeta}>LOAD #A-10504 · 421 mi · $1,680</Text></View>
        </> : tab === 'Profile' ? <>
          <Text style={styles.title}>Profile</Text><View style={styles.placeholder}><Icon name="user" color={colors.green} size={28} /><Text style={styles.sectionTitle}>{driver.name}</Text><Text style={styles.date}>Driver · Demo account</Text></View>
          <Pressable accessibilityRole="button" style={styles.signOut} onPress={onSignOut}><Text style={styles.signOutText}>Sign out</Text></Pressable>
        </> : <>
          <Text style={styles.title}>Marketplace</Text><View style={styles.placeholder}><Icon name="search" color={colors.green} size={28} /><Text style={styles.sectionTitle}>Available loads</Text><Text style={styles.date}>Your marketplace will appear here once connected.</Text></View>
        </>}
      </ScrollView>}
      {!marketDetail && !jobsDetail && <View style={styles.tabBar}>{tabs.map(item => <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === item.name }} key={item.name} style={styles.tab} onPress={() => { setJobsInitialStatus('Assigned'); setTab(item.name); setJobOpen(false); }}><Icon name={item.icon} size={22} color={tab === item.name ? colors.green : colors.muted} /><Text style={[styles.tabLabel, tab === item.name && styles.selected]}>{item.name === 'Jobs' ? 'My Jobs' : item.name}</Text></Pressable>)}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 24, paddingTop: 42, paddingBottom: 38, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { marginBottom: 20, gap: 8 },
  title: { fontFamily: headingFont, color: colors.ink, fontSize: 26, fontWeight: '700' },
  date: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, gap: 7 },
  statValue: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  statLabel: { color: colors.subtle, fontSize: 10, marginTop: 2 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 1 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  link: { color: colors.green, fontSize: 13, fontWeight: '600' },
  loadCard: { borderWidth: 1, borderColor: '#CFD4DD', borderRadius: 16, padding: 23, gap: 17 },
  route: { flexDirection: 'row', gap: 5, alignItems: 'center', marginVertical: 4 },
  routeIcons: { alignItems: 'center', gap: 4 },
  dash: { width: 2, height: 8, backgroundColor: '#79818E' },
  location: { fontSize: 17, fontWeight: '600', color: colors.ink },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { color: colors.muted, fontSize: 14 },
  rate: { backgroundColor: colors.surface, borderColor: '#CFD4DD', borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  rateText: { color: colors.muted, fontSize: 14 },
  rateValue: { color: colors.ink, fontWeight: '700', fontSize: 19 },
  quantity: { color: colors.muted, fontSize: 14 },
  cardFooter: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  posted: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postedText: { color: colors.subtle, fontSize: 14 },
  total: { color: colors.orange, fontFamily: headingFont, fontSize: 20, fontWeight: '700' },
  nextCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  calendar: { width: 43, minHeight: 43, borderRadius: 8, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  month: { color: colors.green, fontSize: 9, fontWeight: '700' },
  day: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  nextTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  nextMeta: { color: colors.subtle, fontSize: 11, lineHeight: 16 },
  tabBar: { borderTopWidth: 1, borderColor: '#E7EDF2', flexDirection: 'row', paddingTop: 9, paddingBottom: 13, backgroundColor: colors.white },
  tab: { flex: 1, alignItems: 'center', gap: 7, minHeight: 44 },
  tabLabel: { color: colors.subtle, fontSize: 10 },
  selected: { color: colors.green, fontWeight: '600' },
  placeholder: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 24, gap: 14 },
  signOut: { backgroundColor: colors.button, padding: 16, borderRadius: 12, alignItems: 'center' },
  signOutText: { color: colors.white, fontWeight: '600', fontSize: 16 },
});
