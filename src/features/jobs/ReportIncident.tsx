import { useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme';
import { ActionButton, ui } from '../marketplace/ui';
import { createIncidentReport, incidentTypes, type IncidentAttachment } from './incidentModel';

export function ReportIncident({ loadId, onClose }: { loadId: string; onClose: () => void }) {
  const [stage, setStage] = useState<'type' | 'details' | 'success'>('type');
  const [type, setType] = useState('');
  const [options, setOptions] = useState(false);
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState<boolean | null>(null);
  const [files, setFiles] = useState<IncidentAttachment[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const valid = !!type && !!description.trim() && impact !== null;
  async function pick() {
    if (locked.current) return;
    setError(''); setBusy(true); locked.current = true;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      if (files.length + result.assets.length > 5) throw Error('Attach up to five files.');
      const selected: IncidentAttachment[] = [];
      for (const file of result.assets) {
        if ((file.size ?? 0) > 2 * 1024 * 1024) throw Error('Each file must be 2 MB or smaller.');
        let uri = file.uri;
        if (Platform.OS === 'web' && file.file) uri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(Error('Unable to read file.'));
          reader.readAsDataURL(file.file!);
        });
        selected.push({ name: file.name, uri, mime: file.mimeType ?? 'application/octet-stream', size: file.size ?? 0 });
      }
      setFiles(previous => [...previous, ...selected]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to attach files.'); }
    finally { setBusy(false); locked.current = false; }
  }
  async function submit() {
    if (!valid || locked.current) return;
    locked.current = true; setBusy(true); setError('');
    const savedPaths: File[] = [];
    try {
      const report = createIncidentReport(loadId, type, description, impact, files);
      if (Platform.OS !== 'web') {
        const folder = new Directory(Paths.document, 'incident-attachments');
        folder.create({ intermediates: true, idempotent: true });
        for (let i = 0; i < report.attachments.length; i++) {
          const attachment = report.attachments[i];
          const target = new File(folder, report.id + '-' + i + '-' + attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
          await new File(attachment.uri).copy(target);
          savedPaths.push(target);
          report.attachments[i] = { ...attachment, uri: target.uri };
        }
      }
      await AsyncStorage.setItem('driverapp-incident-v1:' + report.id, JSON.stringify(report));
      setStage('success');
    } catch (cause) {
      for (const file of savedPaths) { try { file.delete(); } catch {} }
      setError(cause instanceof Error ? cause.message : 'Unable to save report. Please try again.');
    } finally { locked.current = false; setBusy(false); }
  }
  return <View style={styles.root}>
    <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>{stage === 'success' ? '' : 'Report incident'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close incident report" disabled={busy} hitSlop={12} onPress={onClose}><Icon name="x" size={23} color={colors.subtle} /></Pressable></View>
    {stage === 'success' ? <View style={styles.success}><View style={{ height: 130 }} /><Text accessibilityRole="header" style={styles.successTitle}>Incident Report Submitted</Text><Text style={[styles.copy, { textAlign: 'center' }]}>Your incident report has been saved on this device. Operations will receive it once the reporting service is connected.</Text><View style={styles.divider} /><ActionButton title="Done" onPress={onClose} /></View> : <>
      <View style={styles.divider} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.copy}>Reporting an incident helps our Operations team coordinate any support required while your shipment remains active.</Text>
        <Text style={styles.label}>Incident type</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Incident type" accessibilityState={{ expanded: options }} disabled={busy} onPress={() => setOptions(!options)} style={styles.select}><Text style={[styles.selectText, !type && { color: colors.subtle }]}>{type || 'Select the type of incident'}</Text><Icon name={options ? 'chevron-up' : 'chevron-down'} size={19} /></Pressable>
        {options && <View accessibilityRole="radiogroup" accessibilityLabel="Incident types" style={styles.options}>{incidentTypes.map(item => <Pressable key={item} accessibilityRole="radio" accessibilityLabel={item} accessibilityState={{ checked: type === item }} onPress={() => { setType(item); setOptions(false); }} style={styles.option}><Text style={styles.selectText}>{item}</Text>{item === type && <Icon name="check" size={17} color={colors.green} />}</Pressable>)}</View>}
        {stage === 'details' && <>
          <Text style={styles.label}>Incident description</Text>
          <TextInput accessibilityLabel="Incident description" placeholder="Briefly describe what happened" placeholderTextColor={colors.subtle} value={description} onChangeText={setDescription} multiline maxLength={2000} editable={!busy} textAlignVertical="top" style={styles.description} />
          <Text style={styles.label}>Upload photo or file (where applicable)</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Choose incident files" onPress={pick} disabled={busy} style={styles.choose}><View style={styles.chooseLabel}><Text style={styles.copy}>Choose file</Text></View><Text style={[styles.copy, { flex: 1 }]} numberOfLines={1}>{files.length ? files.length + ' file(s) selected' : 'No file chosen'}</Text></Pressable>
          <Text style={styles.hint}>Images and documents · up to 5 files, 2 MB each.</Text>
          {files.map((file, index) => <View key={index} style={styles.file}>
            {file.mime.startsWith('image/') ? <Image source={{ uri: file.uri }} style={styles.thumbnail} /> : <Icon name="file-text" size={22} />}
            <View style={{ flex: 1, gap: 5 }}><Text style={styles.selectText} numberOfLines={1}>{file.name}</Text><Text style={styles.fileStatus}>{Math.max(1, Math.round(file.size / 1024))} KB · ready to attach</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={'Remove ' + file.name} disabled={busy} onPress={() => setFiles(previous => previous.filter((_, item) => item !== index))}><Icon name="trash-2" size={19} /></Pressable>
          </View>)}
          <Text style={styles.label}>Will this incident impact delivery time?</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Delivery time impact" style={styles.radios}>{[true, false].map(value => <Pressable key={String(value)} accessibilityRole="radio" accessibilityLabel={value ? 'Yes' : 'No'} accessibilityState={{ checked: impact === value }} disabled={busy} onPress={() => setImpact(value)} style={styles.radio}><View style={[styles.circle, impact === value && { borderColor: colors.green }]}>{impact === value && <View style={styles.dot} />}</View><Text style={styles.copy}>{value ? 'Yes' : 'No'}</Text></Pressable>)}</View>
        </>}
        <Text style={styles.hint}>Local preview · no Operations notification is sent.</Text>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.actions}><View style={styles.divider} />{stage === 'type' ? <ActionButton title="Continue" disabled={!type || options} onPress={() => setStage('details')} /> : <ActionButton title={busy ? 'Saving report…' : 'Report incident'} disabled={!valid || busy || options} onPress={submit} />}</View>
    </>}
  </View>;
}
const styles = StyleSheet.create({
  root: { flexShrink: 1, maxHeight: '94%', width: '100%', padding: 24, backgroundColor: colors.white, borderTopLeftRadius: 40, borderTopRightRadius: 40, gap: 18 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  title: { fontSize: 21, fontWeight: '600', color: colors.ink },
  divider: { height: 1, backgroundColor: colors.border },
  content: { gap: 16, paddingVertical: 8 },
  copy: { color: colors.muted, fontSize: 16, lineHeight: 26 },
  label: { color: colors.ink, fontSize: 16, marginTop: 4 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#F8F9FA', padding: 12, minHeight: 46 },
  selectText: { color: colors.ink, fontSize: 16, flexShrink: 1 },
  options: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' },
  option: { padding: 14, minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  description: { minHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 13, backgroundColor: '#F8F9FA', fontSize: 15, color: colors.ink },
  choose: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#F8F9FA', gap: 10, overflow: 'hidden', paddingRight: 12 },
  chooseLabel: { padding: 10, backgroundColor: colors.surface, borderRightWidth: 1, borderColor: colors.border },
  hint: { fontSize: 12, color: colors.subtle, lineHeight: 18 },
  file: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumbnail: { width: 44, height: 44, borderRadius: 6 },
  fileStatus: { color: colors.green, fontSize: 12 },
  radios: { flexDirection: 'row', gap: 24 },
  radio: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 40 },
  circle: { width: 18, height: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  dot: { backgroundColor: colors.green, width: 10, height: 10, borderRadius: 5 },
  actions: { gap: 20 },
  error: { color: '#B3003C', fontSize: 13 },
  success: { gap: 18 },
  successTitle: { color: colors.ink, fontSize: 19, fontWeight: '600', textAlign: 'center' },
});
