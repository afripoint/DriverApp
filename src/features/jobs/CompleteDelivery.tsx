import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';

import { Icon, type IconName } from '../../components/Icon';
import { colors } from '../../theme';
import { ActionButton, ui } from '../marketplace/ui';
import type { Job, JobDetailsData } from './model';
import { canContinueProof, validateProofFiles, validateDemoDeliveryCode, type ProofFile } from './deliveryProof';
import { ProofDropZone } from './ProofDropZone';
import { DeliveryCodeEntry } from './DeliveryCodeEntry';
import { loadProofDraft, saveProofDraft } from './proofStorage';

export function CompleteDelivery({ job, detail, onBack, onCompleted }: { job: Job; detail: JobDetailsData; onBack: () => void; onCompleted: () => void }) {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<ProofFile[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [sheet, setSheet] = useState<'review' | 'success' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const lock = useRef(false);
  useEffect(() => {
    if (step !== 3 || submitted) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step, submitted]);
  useEffect(() => {
    let active = true;
    lock.current = true;
    loadProofDraft(job.id).then(draft => {
      if (!draft) return;
      if (draft.loadId !== job.id || !Array.isArray(draft.files)) throw Error('Invalid proof draft');
      validateProofFiles(draft.files);
      if (active) {
        setFiles(draft.files);
        if (draft.status === 'submitted-locally') { setSubmitted(true); setStep(3); setSheet('success'); }
      }
    }).catch(() => { if (active) setError('Saved proof could not be loaded. You can select the files again.'); })
      .finally(() => { if (active) { setBusy(false); lock.current = false; } });
    return () => { active = false; };
  }, [job.id]);
  function back() {
    if (submitted) { onBack(); return; }
    setError('');
    if (step > 1) { setStep(step - 1); setCode(''); } else onBack();
  }
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (!busy) back(); return true; });
    return () => listener.remove();
  }, [step, busy, onBack]);
  async function readWeb(file: File): Promise<ProofFile> {
    const mime = file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : /\.jpe?g$/i.test(file.name) ? 'image/jpeg' : '');
    validateProofFiles([{ name: file.name, uri: 'pending', mime, size: file.size }]);
    const uri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(Error('Unable to read file.'));
      reader.readAsDataURL(file);
    });
    return { name: file.name, mime, size: file.size, uri };
  }
  async function drop(webFiles: File[]) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (files.length + webFiles.length > 5) throw Error('Upload up to five evidence files.');
      const selected = await Promise.all(webFiles.map(readWeb));
      setFiles(previous => [...previous, ...selected]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to attach files.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function pick() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'application/pdf'], multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const selected: ProofFile[] = [];
      for (const file of result.assets) {
        if (Platform.OS === 'web' && file.file) selected.push(await readWeb(file.file));
        else selected.push({ name: file.name, uri: file.uri, mime: file.mimeType ?? (/\.pdf$/i.test(file.name) ? 'application/pdf' : 'image/jpeg'), size: file.size ?? 0 });
      }
      validateProofFiles([...files, ...selected]);
      setFiles(previous => [...previous, ...selected]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to attach files.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function saveProof() {
    if (lock.current || !canContinueProof(files)) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const draft = await saveProofDraft({ loadId: job.id, files, savedAt: new Date().toISOString(), status: 'draft' });
      const saved = draft.files;
      setFiles(saved);
      setCode('');
      setExpiresAt(Date.now() + 5 * 60 * 1000);
      setNow(Date.now());
      setStep(3);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save proof files. Check available device storage.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function review() {
    setError('');
    try {
      if (!canContinueProof(files)) throw Error('Attach at least two valid proof files.');
      validateDemoDeliveryCode(code, expiresAt);
      setSheet('review');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to verify code.'); }
  }
  async function submitDelivery() {
    if (lock.current || submitted) return;
    lock.current = true; setBusy(true); setError('');
    try {
      validateDemoDeliveryCode(code, expiresAt);
      if (!canContinueProof(files)) throw Error('Attach at least two valid proof files.');
      const stored = await loadProofDraft(job.id);
      if (stored && stored.status === 'submitted-locally') { setSubmitted(true); setSheet('success'); return; }
      await saveProofDraft({
        loadId: job.id, files, submittedAt: new Date().toISOString(), status: 'submitted-locally', verification: 'demo-verified',
      });
      setSubmitted(true); setSheet('success');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save submission. Please try again.');
      setSheet(null);
    } finally { lock.current = false; setBusy(false); }
  }
  function closeSheet() { if (busy) return; if (submitted) onCompleted(); else setSheet(null); }
  const rows: { label: string; value: string; icon: IconName }[] = [
    { label: 'Shipment reference', value: job.id, icon: 'hash' },
    { label: 'Pickup Location', value: detail.originCity, icon: 'map-pin' },
    { label: 'Delivery Location', value: detail.destinationCity, icon: 'map-pin' },
    { label: 'Consignee', value: 'Anita Odom', icon: 'user' },
    { label: 'Shipper', value: 'Abidemi Transports', icon: 'truck' },
    { label: 'Trip Status', value: 'Arrived at destination', icon: 'globe' },
  ];
  return <View style={styles.root}>
    <BlurTargetView ref={blurTarget} style={styles.root} importantForAccessibility={sheet ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={!!sheet}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel={step === 1 ? 'Back to delivery tracking' : 'Back to previous delivery step'} onPress={back} disabled={busy} style={styles.back}><Icon name="arrow-left" size={23} color={colors.ink} /></Pressable><Text style={styles.title}>Complete delivery</Text></View>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={ui.between}><Text accessibilityRole="header" style={styles.section}>{step === 1 ? 'Delivery Summary' : step === 2 ? 'Proof of Delivery' : 'Delivery Code Verification'}</Text><Text style={styles.badge}>Step {step} of 3</Text></View>
        <View style={styles.divider} />
        {step === 1 ? rows.map((row, index) => <View key={row.label}><View style={styles.row}><View style={styles.icon}><Icon name={row.icon} size={21} color={colors.green} /></View><View style={{ flex: 1, gap: 10 }}><Text style={ui.body}>{row.label}</Text><Text style={styles.rowValue}>{row.value}</Text></View></View>{index < rows.length - 1 && <View style={styles.rowDivider} />}</View>) : step === 2 ? <>
          <Text style={styles.label}>Upload Proof of Delivery (POD)</Text>
          <ProofDropZone onFiles={drop}><View style={styles.drop}><Icon name="upload-cloud" size={25} /><Text style={styles.dropText}>{Platform.OS === 'web' ? 'Click to upload or drag and drop' : 'Choose delivery photos or documents'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Browse proof files" disabled={busy} onPress={pick} style={styles.browse}><Text style={styles.browseText}>Browse file</Text></Pressable></View></ProofDropZone>
          <Text style={styles.help}>Upload photos showing the delivered cargo, signed waybill, or the consignee receiving the shipment. JPEG or PDF (Max. File Size: 1MB).</Text>
          {!!files.length && <><Text style={styles.label}>UPLOADED FILES ({files.length})</Text><View style={styles.files}>{files.map((file, index) => <View key={index} style={styles.file}>
            {file.mime === 'image/jpeg' ? <Image source={{ uri: file.uri }} style={styles.thumbnail} /> : <View style={[styles.thumbnail, styles.pdf]}><Icon name="file-text" size={28} /><Text style={styles.pdfText}>PDF</Text></View>}
            <Pressable accessibilityRole="button" accessibilityLabel={'Remove proof ' + file.name} disabled={busy} onPress={() => setFiles(previous => previous.filter((_, item) => item !== index))} style={styles.remove}><Icon name="x" size={16} color={colors.white} /></Pressable><Text numberOfLines={2} style={styles.fileName}>{file.name}</Text>
          </View>)}</View></>}
          <Text style={[styles.requirement, canContinueProof(files) && { color: colors.green }]}>{canContinueProof(files) ? '✓ ' : ''}Upload at least 2 evidence files as proof of delivery</Text>
        </> : <>
          <DeliveryCodeEntry code={code} onChange={value => { setCode(value); setError(''); }} remaining={remaining} disabled={busy || submitted} onRenew={() => { setExpiresAt(Date.now() + 5 * 60 * 1000); setNow(Date.now()); setCode(''); setError(''); }} />
          <View style={styles.warning}><Icon name="info" size={17} color="#C43E00" /><Text style={styles.warningText}>Once submitted, this delivery cannot be edited. Make sure your photos and code are correct.</Text></View>
          <Text style={styles.demo}>Demo code: 357333 · submission stays on this device.</Text>
        </>}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </View>
    </ScrollView>
    <View style={styles.footer}><View style={styles.footerInner}><ActionButton title={busy ? 'Saving…' : step === 3 ? 'Complete delivery' : 'Continue'} disabled={busy || submitted || (step === 2 && !canContinueProof(files)) || (step === 3 && (code.length !== 6 || remaining === 0))} onPress={() => step === 1 ? setStep(2) : step === 2 ? saveProof() : review()} /></View></View>
    </BlurTargetView>
    <Modal visible={sheet !== null} transparent animationType="fade" onRequestClose={closeSheet}>
      <View style={styles.modal}>
        <BlurView blurTarget={Platform.OS === 'web' ? undefined : blurTarget} blurMethod="dimezisBlurViewSdk31Plus" intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss delivery submission" disabled={busy} onPress={closeSheet} style={[StyleSheet.absoluteFill, styles.scrim]} />
        <ScrollView accessibilityViewIsModal style={styles.modalSheet} contentContainerStyle={styles.modalContent}>
          <View style={ui.between}><Text accessibilityRole="header" style={styles.title}>{sheet === 'review' ? 'Submit delivery' : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close delivery submission" disabled={busy} hitSlop={12} onPress={closeSheet}><Icon name="x" size={23} /></Pressable></View>
          {sheet === 'success' ? <>
            <View style={{ height: 130 }} />
            <Text accessibilityRole="header" style={styles.successTitle}>Shipment Successfully Secured</Text>
            <Text style={styles.successCopy}>Your delivery for shipment {job.id} has been submitted in this preview and is awaiting shipper verification.</Text>
            <Text style={styles.demo}>Saved locally · no shipper notification has been sent.</Text>
            <View style={styles.divider} /><ActionButton title="Done" onPress={onCompleted} />
          </> : <>
            <View style={styles.divider} />
            <Text style={styles.help}>You're about to submit this delivery for shipper verification. Once submitted, no further changes can be made.</Text>
            <View style={styles.reviewBox}><View style={ui.between}><Text style={ui.body}>Shipment ID</Text><Text style={styles.label}>{job.id}</Text></View><View style={styles.divider} /><View style={ui.between}><Text style={ui.body}>Delivery Proof</Text><Text style={styles.label}>{files.length} files attached</Text></View><View style={styles.divider} /><View style={ui.between}><Text style={ui.body}>Verification Status</Text><Text style={styles.verified}>✓ Verified</Text></View></View>
            <View style={styles.divider} />
            <View style={styles.modalActions}><View style={{ flex: 1 }}><ActionButton secondary title="Back to review" disabled={busy} onPress={() => setSheet(null)} /></View><View style={{ flex: 1 }}><ActionButton title={busy ? 'Submitting…' : 'Submit'} disabled={busy || remaining === 0} onPress={submitDelivery} /></View></View>
          </>}
        </ScrollView>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFF8F0', borderColor: '#FFD3B6', borderWidth: 1, padding: 16, borderRadius: 12, marginTop: 16 },
  warningText: { color: '#C43E00', fontSize: 14, lineHeight: 22, flex: 1 },
  demo: { color: colors.subtle, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  modal: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { flexGrow: 0, maxHeight: '92%', backgroundColor: colors.white, borderTopLeftRadius: 40, borderTopRightRadius: 40 },
  modalContent: { padding: 24, paddingTop: 32, gap: 20, width: '100%', maxWidth: 650, alignSelf: 'center' },
  reviewBox: { borderWidth: 1, borderColor: '#CFD5DE', borderRadius: 12, backgroundColor: colors.surface, padding: 16, gap: 20 },
  verified: { color: colors.green, fontSize: 14, padding: 7, borderWidth: 1, borderColor: '#A0EDCE', backgroundColor: '#ECFDF5', borderRadius: 7 },
  modalActions: { flexDirection: 'row', gap: 16 },
  successTitle: { color: colors.ink, fontWeight: '600', fontSize: 19, textAlign: 'center' },
  successCopy: { color: colors.muted, fontSize: 16, lineHeight: 26, textAlign: 'center' },
  root: { flex: 1, backgroundColor: '#F5F8F7' },
  header: { minHeight: 70, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  back: { position: 'absolute', left: 28, padding: 6 },
  title: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  content: { padding: 24, paddingTop: 20, width: '100%', maxWidth: 650, alignSelf: 'center' },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#D4D4D4', borderRadius: 10, padding: 23, gap: 18 },
  section: { color: colors.ink, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  badge: { ...ui.open, color: '#4C5CCA', backgroundColor: '#F4F8FD', borderColor: '#B6D6FF' },
  divider: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  icon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#ECFDF8', alignItems: 'center', justifyContent: 'center' },
  rowValue: { color: colors.ink, fontSize: 14, fontWeight: '600', lineHeight: 21 },
  rowDivider: { height: 1, backgroundColor: '#F0F1F3', marginTop: 18 },
  label: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  drop: { backgroundColor: '#F8F9FA', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 12, paddingVertical: 22, paddingHorizontal: 10, alignItems: 'center', gap: 13 },
  dropText: { color: colors.subtle, fontSize: 15, textAlign: 'center' },
  browse: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.orange },
  browseText: { color: colors.orange, fontSize: 16, fontWeight: '600' },
  help: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  files: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  file: { width: 70, position: 'relative' },
  thumbnail: { width: 70, height: 80, borderRadius: 12 },
  pdf: { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 5 },
  pdfText: { color: colors.muted, fontSize: 12 },
  remove: { position: 'absolute', top: 7, right: 7, backgroundColor: colors.orange, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 10, color: colors.muted, marginTop: 5 },
  requirement: { color: colors.subtle, fontSize: 14, lineHeight: 21 },
  error: { color: '#B3003C', fontSize: 13 },
  footer: { borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  footerInner: { paddingHorizontal: 24, paddingVertical: 20, width: '100%', maxWidth: 650, alignSelf: 'center' },
});
