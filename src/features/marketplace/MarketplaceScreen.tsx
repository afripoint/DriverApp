import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { colors, headingFont } from '../../theme';
import { marketplaceLoads, naira, type Bid, type MarketplaceLoad } from './model';
import { Fact, ui } from './ui';
import { LoadFlow } from './LoadFlow';

export function MarketplaceScreen({ onDetailChange, bids, onBid }: { onDetailChange: (open: boolean) => void; bids: Bid[]; onBid: (bid: Bid) => void }) {
  const [search, setSearch] = useState('');
  const [near, setNear] = useState(true);
  const [today, setToday] = useState(false);
  const [dryVan, setDryVan] = useState(false);
  const [bestPrice, setBestPrice] = useState(false);
  const [sort, setSort] = useState<'Recommended' | 'Price: low to high' | 'Price: high to low'>('Recommended');
  const [selected, setSelected] = useState<MarketplaceLoad | null>(null);
  const loads = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = marketplaceLoads.filter(load => (!near || load.nearMe) && (!today || load.pickupToday) && (!dryVan || load.vehicle === 'Dry van') && `${load.id} ${load.origin} ${load.destination} ${load.pickupAddress} ${load.deliveryAddress}`.toLowerCase().includes(query));
    if (bestPrice || sort === 'Price: low to high') result.sort((a, b) => a.listedPrice - b.listedPrice);
    else if (sort === 'Price: high to low') result.sort((a, b) => b.listedPrice - a.listedPrice);
    return result;
  }, [search, near, today, dryVan, bestPrice, sort]);

  function close() { setSelected(null); onDetailChange(false); }
  if (selected) return <LoadFlow key={selected.id} load={selected} existingBid={bids.find(bid => bid.loadId === selected.id)} onBack={close} onBid={onBid} />;

  return <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View><Text style={styles.title}>Marketplace</Text><Text style={styles.subtitle}>Find loads approved for independent driver bidding.</Text></View>
    <View style={styles.search}><Icon name="search" color={colors.subtle} size={18} /><TextInput accessibilityLabel="Search marketplace loads" placeholder="Search city, state, or load ID" placeholderTextColor={colors.subtle} value={search} onChangeText={setSearch} style={styles.input} autoCorrect={false} />{search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => setSearch('')}><Icon name="x" size={16} /></Pressable> : null}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {[{ label: 'Near me', value: near, action: () => setNear(!near) }, { label: 'Pickup today', value: today, action: () => setToday(!today) }, { label: 'Dry van', value: dryVan, action: () => setDryVan(!dryVan) }, { label: 'Best price', value: bestPrice, action: () => setBestPrice(!bestPrice) }].map(filter => <Pressable key={filter.label} accessibilityRole="button" accessibilityState={{ selected: filter.value }} onPress={filter.action} style={[styles.filter, filter.value && styles.filterSelected]}><Text style={[styles.filterText, filter.value && { color: colors.white }]}>{filter.label}</Text></Pressable>)}
    </ScrollView>
    <View style={[ui.between, { flexWrap: 'wrap' }]}><Text style={styles.count}>{loads.length} available load{loads.length === 1 ? '' : 's'}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Sort: ${sort}. Tap to change`} onPress={() => { setBestPrice(false); setSort(sort === 'Recommended' ? 'Price: low to high' : sort === 'Price: low to high' ? 'Price: high to low' : 'Recommended'); }}><Text style={styles.sort}>Sort: {bestPrice ? 'Best price' : sort}</Text></Pressable></View>
    {!loads.length && <View style={[ui.card, { gap: 10 }]}><Text style={ui.heading}>No matching loads</Text><Text style={ui.body}>Try another city, load ID, or filter.</Text></View>}
    {loads.map(load => <Pressable key={load.id} accessibilityRole="button" accessibilityLabel={`View ${load.id}, ${load.origin} to ${load.destination}`} onPress={() => { setSelected(load); onDetailChange(true); }} style={({ pressed }) => [ui.card, styles.loadCard, pressed && { opacity: 0.85 }]}>
      <View style={ui.between}><View style={styles.badges}><Text style={styles.badge}>{load.id}</Text><Text style={ui.open}>{bids.some(bid => bid.loadId === load.id) ? 'Bid placed' : 'Open'}</Text><Text style={[styles.badge, { backgroundColor: '#F8F9FA' }]}>{load.distance}km</Text></View><View style={styles.offers}><Icon name="users" color="#8D211A" size={13} /><Text style={styles.offersText}>{load.offers + (bids.some(bid => bid.loadId === load.id) ? 1 : 0)} offers</Text></View></View>
      <View style={{ gap: 9 }}><View style={styles.route}><Icon name="map-pin" color={colors.green} size={19} /><Text style={styles.location}>{load.origin}</Text></View><View style={styles.routeDash} /><View style={styles.route}><Icon name="map-pin" color={colors.orange} size={19} /><Text style={styles.location}>{load.destination}</Text></View></View>
      <View style={styles.factRow}><Fact icon="calendar" text={load.date} /><Fact icon="tag" text="Full Truck Load (FTL)" /></View>
      <View style={styles.factRow}><Fact icon="truck" text={load.vehicle} /><Fact icon="shopping-bag" text={load.cargo} /></View>
      <View style={styles.rate}><Text style={styles.rateText}><Text style={styles.rateValue}>{naira(load.listedPrice)}</Text> per truck</Text><Text style={styles.vehicle}>{load.vehicle.replace(' ', '').toUpperCase()} × {load.requiredTrucks}</Text></View>
      <View style={styles.cardFooter}><Fact icon="clock" text="Posted 2 hours ago" /><Text style={styles.total}>{naira(load.listedPrice * load.requiredTrucks)}</Text></View>
    </Pressable>)}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 17, width: '100%', maxWidth: 560, alignSelf: 'center' },
  title: { fontFamily: headingFont, fontSize: 27, fontWeight: '700', color: colors.ink },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 3 },
  search: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#F8F9FA', borderRadius: 12, flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 12, minHeight: 42 },
  input: { fontSize: 14, color: colors.ink, flex: 1, paddingVertical: 10, minWidth: 0 },
  filters: { flexDirection: 'row', gap: 8 },
  filter: { borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: colors.white },
  filterSelected: { backgroundColor: colors.button, borderColor: colors.button },
  filterText: { color: colors.ink, fontSize: 12 },
  count: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  sort: { color: colors.green, fontSize: 14 },
  loadCard: { gap: 17 },
  badges: { flexDirection: 'row', gap: 13, alignItems: 'center', flexShrink: 1, flexWrap: 'wrap' },
  badge: { borderWidth: 1, borderColor: colors.border, borderRadius: 7, padding: 4, fontSize: 12, color: colors.ink },
  offers: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 7, backgroundColor: '#FFF8F0', borderWidth: 1, borderColor: '#FFD3B6', alignItems: 'center' },
  offersText: { color: '#8D211A', fontSize: 12 },
  route: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  routeDash: { height: 8, width: 2, backgroundColor: '#6B7280', marginLeft: 7, marginVertical: -5 },
  location: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  rate: { padding: 15, paddingVertical: 17, backgroundColor: colors.surface, borderColor: '#D0D5DE', borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  rateText: { color: colors.muted, fontSize: 15 },
  rateValue: { color: colors.ink, fontSize: 19, fontWeight: '700' },
  vehicle: { color: colors.muted, fontSize: 13 },
  cardFooter: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 17, flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  total: { fontFamily: headingFont, color: colors.orange, fontSize: 20, fontWeight: '700' },
});
