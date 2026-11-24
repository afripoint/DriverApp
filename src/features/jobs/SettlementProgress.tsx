import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme';
import { naira } from '../marketplace/model';
import { ActionButton, SectionTitle, ui } from '../marketplace/ui';
import type { Job, JobDetailsData } from './model';
import { PickupCode } from './PickupCode';
import { isValidDemoPickupCode } from './pickup';
import { WithdrawEarnings } from './WithdrawEarnings';
import { withdrawDemoEarnings } from './earnings';

const stages = ['Carrier\nMobilisation', 'Pickup\nVerification', 'Delivery\nCompletion'];

function Amount({ label, value }: { label: string; value: number }) {
  return <View style={styles.amount}><Text style={styles.amountLabel}>{label}</Text><Text style={styles.value}>{naira(value)}</Text></View>;
}

export type TripProgress = { verified: boolean; started: boolean; withdrawn?: number; arrived?: boolean; completedAt?: string };

export function SettlementProgress({ job, detail, accepted, onAccept, ready, onReady, onBack, progress, onProgress }: {
  job: Job; detail: JobDetailsData; accepted: boolean; onAccept: () => void; ready: boolean; onReady: () => void; onBack: () => void; progress: TripProgress; onProgress: (progress: TripProgress) => void;
}) {
  const [sheet, setSheet] = useState<'accept' | 'ready' | null>(null);
  const [earningsOpen, setEarningsOpen] = useState(false);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [pickupCode, setPickupCode] = useState('');
  const [pickupError, setPickupError] = useState(false);
  const pickupVerified = progress.verified;
  const [toast, setToast] = useState(false);
  const confirmOpen = sheet !== null;
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const secured = job.demoFunding === 'Secured';
  const canAccept = secured && !accepted;
  const shipmentValue = job.bid * job.trucks;
  const released = pickupVerified ? Math.round(shipmentValue * 0.6) : 0;
  const releasePercent = Math.round(released / shipmentValue * 100) || 0;
  const dismiss = () => setSheet(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(false), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pickupOpen) setPickupOpen(false); else onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack, pickupOpen]);

  function verifyPickup() {
    if (pickupCode.length !== 6 || pickupVerified || !accepted || !ready || !secured) return;
    const valid = isValidDemoPickupCode(pickupCode);
    setPickupError(!valid);
    if (valid) {
      onProgress({ ...progress, verified: true });
      setPickupOpen(false);
      setToast(true);
    }
  }

  if (earningsOpen) return <WithdrawEarnings balance={Math.max(0, released - (progress.withdrawn ?? 0))} onBack={() => setEarningsOpen(false)} onWithdraw={amount => {
    const available = released - (progress.withdrawn ?? 0);
    withdrawDemoEarnings(available, amount);
    onProgress({ ...progress, withdrawn: (progress.withdrawn ?? 0) + amount });
  }} />;

  return <View style={styles.root}>
    <BlurTargetView ref={blurTarget} style={styles.root} importantForAccessibility={confirmOpen ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={confirmOpen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={pickupOpen ? 'Back to settlement progress' : 'Back to job details'} onPress={() => pickupOpen ? setPickupOpen(false) : onBack()} style={styles.back}><Icon name="arrow-left" size={23} color={colors.ink} /></Pressable>
        <Text accessibilityRole="header" style={styles.title}>{pickupOpen ? 'Pickup verification' : 'Settlement progress'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={ui.between}>
            <View style={styles.route}><Text style={styles.loadId}>LOAD #{job.id}</Text><Text style={styles.routeText}>{detail.originCity} → {detail.destinationCity}</Text></View>
            <Text style={styles.greenBadge}>{progress.started ? 'In Transit' : job.status}</Text>
          </View>
          <View style={styles.stages}>{stages.map((stage, index) => {
            const active = ((accepted || secured) && index === 0) || (pickupVerified && index === 1);
            return <View key={stage} style={styles.stage} accessible accessibilityLabel={stage.replace('\n', ' ') + (active ? ', current stage' : '')}>
              <View style={[styles.stageBar, active && styles.activeBar]} />
              <Text style={[styles.stageText, active && styles.activeStage]}>{stage}</Text>
            </View>;
          })}</View>
        </View>
        {pickupOpen ? <PickupCode code={pickupCode} onChange={value => { setPickupCode(value); setPickupError(false); }} onVerify={verifyPickup} verified={pickupVerified} /> : <>
        <View style={[styles.card, styles.funding]}>
          <View style={ui.between}><SectionTitle>SHIPMENT FUNDING</SectionTitle><Text style={pickupVerified ? styles.activeBadge : secured ? styles.greenBadge : styles.pendingBadge}>{pickupVerified ? 'Active' : secured ? 'Secured' : 'Pending'}</Text></View>
          <View style={styles.divider} />
          <View style={ui.between}><Text style={ui.body}>Funds released</Text><Text style={styles.percent}>{releasePercent}%</Text></View>
          <View accessibilityRole="progressbar" accessibilityLabel="Funds released" accessibilityValue={{ min: 0, max: 100, now: releasePercent }} style={styles.fundsBar}><View style={[styles.releaseFill, { width: `${releasePercent}%` }]} /></View>
          <Amount label="Shipment Value" value={shipmentValue} />
          <View style={styles.amountRow}><Amount label="Released" value={released} /><Amount label="Remaining" value={secured ? shipmentValue - released : 0} /></View>
          {pickupVerified && <Text style={styles.demo}>Demo settlement figures · no payment has been made.</Text>}
        </View>
        {accepted ? <View style={[styles.card, styles.funding]}>
          <View style={ui.between}><SectionTitle>FUNDING STATUS</SectionTitle><Text style={secured ? styles.greenBadge : styles.pendingBadge}>{secured ? 'Secured' : 'Pending'}</Text></View>
          <View style={styles.divider} />
          <Text style={ui.heading}>Shipment Value: {naira(shipmentValue)}</Text>
          <Text style={ui.body}>{pickupVerified ? "Shipment funds are secured and pickup has been verified. You can now start this trip." : secured ? 'Shipment funds are secured. Confirm when you are ready for pickup.' : 'Waiting for the shipment owner to secure funds. Pickup can proceed once funding is complete.'}</Text>
        </View> : null}
        </>}
      </ScrollView>
      {pickupOpen && pickupError && <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}><Icon name="info" size={16} color="#B3003C" /><Text style={styles.errorText}>Invalid Pickup Code. Please try again.</Text></View>}
      {toast && <View pointerEvents="none" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.toast}><Icon name="check-circle" color={colors.green} size={17} /><Text style={styles.toastText}>Pickup code successfully verified.</Text></View>}
      <View style={styles.footer}><View style={styles.footerInner}>
        {pickupVerified ? <View style={styles.tripActions}>
          <View style={styles.action}><ActionButton title={progress.started ? 'Trip started' : 'Start Trip'} disabled={progress.started} onPress={() => { if (pickupVerified && secured && !progress.started) onProgress({ ...progress, started: true }); }} /></View>
          <View style={styles.action}><ActionButton secondary title="Withdraw" onPress={() => { setToast(false); setEarningsOpen(true); }} /></View>
        </View> : pickupOpen ? <PickupCode footer code={pickupCode} onChange={setPickupCode} onVerify={verifyPickup} verified={pickupVerified} /> : accepted ? (
        <ActionButton title="Ready for Pickup" disabled={!secured} onPress={() => {
          if (!secured) return;
          if (ready) { setPickupOpen(true); return; }
          onReady();
          setSheet('ready');
        }} />
        ) : <ActionButton title="Accept Job Assignment" disabled={!canAccept} onPress={() => {
          if (canAccept) setSheet('accept');
        }} />}
      </View></View>
    </BlurTargetView>
    <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.modal}>
        <BlurView blurTarget={Platform.OS === 'web' ? undefined : blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss acceptance sheet" style={[StyleSheet.absoluteFill, styles.scrim]} onPress={dismiss} />
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} bounces={false} accessibilityViewIsModal>
          {sheet === 'ready' ? <>
            <Pressable accessibilityRole="button" accessibilityLabel="Close pickup confirmation" style={styles.closeReady} hitSlop={12} onPress={dismiss}><Icon name="x" size={22} /></Pressable>
            <View style={styles.readyCopy}>
              <Text accessibilityRole="header" style={[styles.title, styles.center]}>Ready for Pickup Confirmed!</Text>
              <Text style={[styles.confirmCopy, styles.center]}>You have indicated readiness for pickup. In this preview, no payment is processed.</Text>
            </View>
            <View style={styles.divider} />
            <ActionButton title="Continue" onPress={() => { dismiss(); setPickupOpen(true); }} />
          </> : <>
          <View style={ui.between}><Text accessibilityRole="header" style={styles.title}>Accept Job</Text><Pressable accessibilityRole="button" accessibilityLabel="Close acceptance sheet" hitSlop={12} onPress={dismiss}><Icon name="x" size={22} /></Pressable></View>
          <View style={styles.divider} />
          <Text style={styles.confirmCopy}>By accepting this job, you are confirming your commitment to execute this transport assignment. In this preview, acceptance is saved for this session and no shipper notification is sent.</Text>
          <View style={styles.divider} />
          <ActionButton title="Yes, accept shipment" disabled={!canAccept} onPress={() => {
            if (!canAccept) return;
            onAccept();
            dismiss();
          }} />
          <ActionButton secondary title="No, cancel" onPress={dismiss} />
          </>}
        </ScrollView>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F8F7' },
  header: { minHeight: 70, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: 52 },
  back: { position: 'absolute', left: 28, padding: 6 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: 24, paddingVertical: 20, gap: 14, width: '100%', maxWidth: 650, alignSelf: 'center' },
  card: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 12, gap: 12 },
  funding: { padding: 15 },
  route: { flex: 1, gap: 5 },
  loadId: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  routeText: { color: colors.subtle, fontSize: 11, lineHeight: 15 },
  greenBadge: { ...ui.open, color: colors.green, backgroundColor: '#ECFDF5', borderColor: '#A0EDCE' },
  pendingBadge: ui.open,
  activeBadge: { ...ui.open, color: '#4C5CCA', backgroundColor: '#F4F8FD', borderColor: '#B6D6FF' },
  releaseFill: { height: 6, borderRadius: 4, backgroundColor: colors.button },
  demo: { color: colors.subtle, fontSize: 11, lineHeight: 16 },
  tripActions: { flexDirection: 'row', gap: 16 },
  action: { flex: 1 },
  toast: { position: 'absolute', bottom: 124, left: '8%', right: '8%', backgroundColor: '#ECFDF8', borderWidth: 1, borderColor: '#99EAD8', borderRadius: 12, padding: 15, flexDirection: 'row', gap: 9, alignItems: 'center' },
  toastText: { color: colors.green, fontSize: 14, flexShrink: 1 },
  stages: { flexDirection: 'row', gap: 4 },
  stage: { flex: 1, gap: 6 },
  stageBar: { backgroundColor: colors.border, height: 4, borderRadius: 4 },
  activeBar: { backgroundColor: colors.button },
  stageText: { textAlign: 'center', fontSize: 10, lineHeight: 16, color: colors.subtle },
  activeStage: { fontWeight: '700', color: colors.button },
  divider: { height: 1, backgroundColor: colors.border },
  percent: { fontSize: 14, color: colors.green },
  fundsBar: { height: 6, borderRadius: 4, backgroundColor: colors.border, marginTop: -5 },
  amountRow: { flexDirection: 'row', gap: 8, marginTop: -4 },
  amount: { flexGrow: 1, flexBasis: 0, minHeight: 68, justifyContent: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 13, gap: 7 },
  amountLabel: { color: colors.subtle, fontSize: 13 },
  value: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.border },
  footerInner: { width: '100%', maxWidth: 650, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 20 },
  closeReady: { alignSelf: 'flex-end' },
  readyCopy: { paddingTop: 128, gap: 12 },
  center: { textAlign: 'center' },
  error: { marginHorizontal: 24, marginBottom: 28, padding: 15, borderWidth: 1, borderColor: '#FFBDCF', backgroundColor: '#FFFAFC', borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 9, alignSelf: 'center', width: '88%', maxWidth: 600 },
  errorText: { color: '#B3003C', fontSize: 14, flexShrink: 1 },
  modal: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { flexGrow: 0, maxHeight: '90%', backgroundColor: colors.white, borderTopLeftRadius: 40, borderTopRightRadius: 40 },
  sheetContent: { gap: 16, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 32, width: '100%', maxWidth: 650, alignSelf: 'center' },
  confirmCopy: { color: colors.muted, fontSize: 15, lineHeight: 23 },
});
