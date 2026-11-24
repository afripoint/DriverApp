import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme';
import { ActionButton } from '../marketplace/ui';
import { ShipperContacts } from './ShipperContacts';
import { createChatMessage, MAX_ATTACHMENT_BYTES, type ChatAttachment, type ChatMessage, type ChatRole } from './chatModel';

const emptyReplies = ["I'm on my way", 'Stuck in traffic', 'Arriving in 30 mins', 'Package is safe', 'Need directions', 'At the pickup location'];
const replies = ["I'm on my way", 'Arrived at pickup', 'Loading in progress', 'Shipment picked up', 'Almost there', 'Stuck in traffic, running late'];
export function ShipperChat({ loadId, onBack }: { loadId: string; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment>();
  const [role, setRole] = useState<ChatRole>('carrier');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [controls, setControls] = useState(false);
  const [contacts, setContacts] = useState(false);
  const [typing, setTyping] = useState(false);
  const list = useRef<ComponentRef<typeof ScrollView>>(null);
  const current = useRef<ChatMessage[]>([]);
  const locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const key = 'driverapp-chat-v1:' + loadId;
  useEffect(() => {
    alive.current = true;
    AsyncStorage.getItem(key).then(value => {
      const parsed = value ? JSON.parse(value) : [];
      if (!Array.isArray(parsed)) throw Error('Invalid saved conversation');
      if (alive.current) { current.current = parsed; setMessages(parsed); }
    }).catch(() => { if (alive.current) setError('Saved chat could not be loaded. Reopen this screen to retry.'); })
      .finally(() => { if (alive.current) setLoading(false); });
    return () => { alive.current = false; if (timer.current) clearTimeout(timer.current); };
  }, [key]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => listener.remove();
  }, [onBack]);
  async function store(message: ChatMessage) {
    const next = [...current.current, message];
    await AsyncStorage.setItem(key, JSON.stringify(next));
    if (alive.current) { current.current = next; setMessages(next); }
  }
  async function send(text = draft, sender = role, file = attachment) {
    if (locked.current || loading || typing) return;
    locked.current = true; setBusy(true); setError('');
    try {
      let savedFile = file;
      if (file && Platform.OS !== 'web') {
        const folder = new Directory(Paths.document, 'chat-attachments');
        folder.create({ intermediates: true, idempotent: true });
        const target = new File(folder, Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
        await new File(file.uri).copy(target);
        savedFile = { ...file, uri: target.uri };
      }
      await store(createChatMessage(sender, text, savedFile));
      setDraft(''); setAttachment(undefined);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save message. Try again.'); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  async function openAttachment(file: ChatAttachment) {
    try {
      if (Platform.OS !== 'web') await File.preview(new File(file.uri), { mimeType: file.mime });
      else await Linking.openURL(file.uri);
    } catch { setError('Unable to open this attachment on this device.'); }
  }
  async function pick() {
    if (busy) return;
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf', 'text/plain'], copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const file = result.assets[0];
      if ((file.size ?? 0) > MAX_ATTACHMENT_BYTES) throw Error('Choose a file smaller than 2 MB.');
      let uri = file.uri;
      if (Platform.OS === 'web' && file.file) uri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(Error('Unable to read file.'));
        reader.readAsDataURL(file.file!);
      });
      setAttachment({ name: file.name, uri, mime: file.mimeType ?? 'application/octet-stream', size: file.size ?? 0 });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to attach file.'); }
  }
  function simulateReply() {
    if (locked.current || typing || loading) return;
    setControls(false); setTyping(true);
    timer.current = setTimeout(async () => {
      locked.current = true;
      try { await store(createChatMessage('shipper', current.current.length ? 'Thank you! I will be at the location.' : 'Hello, are you on your way?')); }
      catch { if (alive.current) setError('Unable to save preview reply.'); }
      finally { locked.current = false; if (alive.current) setTyping(false); }
    }, 1800);
  }
  const canSend = (!!draft.trim() || !!attachment) && !loading && !busy && !typing;
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to delivery tracking" onPress={onBack} style={styles.back}><Icon name="arrow-left" size={23} color={colors.ink} /></Pressable><Text style={styles.title}>Message shipper</Text></View>
    <View style={styles.outer}><View style={styles.card}>
      <View style={styles.contact}><View style={styles.avatar}><Text style={styles.initials}>AT</Text></View><View style={{ flex: 1, gap: 5 }}><Text style={styles.name}>Abidemi Transports</Text><Text accessibilityLiveRegion="polite" style={styles.online}>{typing ? 'Typing…' : 'Online'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Call shipper from chat" style={styles.phone} onPress={() => setContacts(true)}><Icon name="phone" size={20} /></Pressable></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Chat preview controls" onPress={() => setControls(true)}><Text style={styles.preview}>Local preview · sending as {role} · options</Text></Pressable>
      <ScrollView ref={list} style={{ flex: 1 }} contentContainerStyle={[styles.conversation, !messages.length && { flexGrow: 1 }]} keyboardShouldPersistTaps="handled" onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}>
        {loading ? <Text style={styles.emptyText}>Loading conversation…</Text> : !messages.length ? <View style={styles.empty}><Icon name="send" size={52} color="#85CAA0" /><Text style={styles.emptyText}>No messages yet. Say hello!</Text><View style={styles.quick}>{emptyReplies.map(text => <Pressable accessibilityRole="button" key={text} onPress={() => setDraft(text)} style={styles.chip}><Text style={styles.chipText}>{text}</Text></Pressable>)}</View></View> : messages.map((message, index) => {
          const outgoing = message.role === 'carrier';
          const date = new Date(message.createdAt);
          const previous = messages[index - 1];
          return <View key={message.id}>
            {(!previous || new Date(previous.createdAt).toDateString() !== date.toDateString()) && <Text style={styles.date}>{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })}</Text>}
            <View style={[styles.messageRow, outgoing && { alignItems: 'flex-end' }]}><View style={[styles.bubble, outgoing && styles.sent]}>
              {!!message.text && <Text selectable style={[styles.messageText, outgoing && { color: colors.white }]}>{message.text}</Text>}
              {message.attachment && <Pressable accessibilityRole="button" accessibilityLabel={'Open attachment ' + message.attachment.name} onPress={() => openAttachment(message.attachment!)}>{message.attachment.mime.startsWith('image/') && <Image source={{ uri: message.attachment.uri }} style={styles.image} resizeMode="cover" />}<Text style={[styles.fileText, outgoing && { color: colors.white }]}>📎 {message.attachment.name}</Text></Pressable>}
            </View><Text style={styles.timestamp}>{date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Lagos' })}</Text></View>
          </View>;
        })}
        {typing && <View accessibilityLabel="Shipper is typing" style={styles.typing}><Text style={styles.emptyText}>● ● ●</Text></View>}
      </ScrollView>
      {!!messages.length && <View style={styles.suggestions}>{replies.map(text => <Pressable accessibilityRole="button" key={text} onPress={() => setDraft(text)} style={styles.chip}><Text style={[styles.chipText, { color: colors.green }]}>{text}</Text></Pressable>)}</View>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {attachment && <View style={styles.pendingFile}><Text numberOfLines={1} style={{ flex: 1, color: colors.muted }}>{attachment.name}</Text><Pressable accessibilityRole="button" accessibilityLabel="Remove attachment" onPress={() => setAttachment(undefined)}><Icon name="x" size={17} /></Pressable></View>}
      <View style={styles.composer}><Pressable accessibilityRole="button" accessibilityLabel="Attach a file" onPress={pick} disabled={busy || loading} hitSlop={8}><Icon name="paperclip" size={21} /></Pressable><TextInput accessibilityLabel="Chat message" placeholder="Start a conversation" placeholderTextColor={colors.subtle} value={draft} onChangeText={setDraft} multiline maxLength={2000} style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Send message" accessibilityState={{ disabled: !canSend }} disabled={!canSend} onPress={() => send()} style={[styles.send, !canSend && { opacity: 0.45 }]}><Icon name="send" size={18} color={colors.white} /></Pressable></View>
    </View></View>
    <Modal visible={controls || contacts} transparent animationType="fade" onRequestClose={() => { setControls(false); setContacts(false); }}><View style={styles.modal}><Pressable accessibilityRole="button" accessibilityLabel="Close chat dialog" onPress={() => { setControls(false); setContacts(false); }} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} /><ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>{contacts ? <ShipperContacts onClose={() => setContacts(false)} /> : <><Text style={styles.title}>Local chat preview</Text><Text style={styles.emptyText}>Messages and files stay on this device. These controls simulate the shipper side until the chat API is available.</Text><ActionButton title={role === 'carrier' ? 'Preview as shipper' : 'Preview as carrier'} onPress={() => { setRole(role === 'carrier' ? 'shipper' : 'carrier'); setControls(false); }} /><ActionButton title="Simulate shipper reply" disabled={typing || loading || busy} onPress={simulateReply} /><ActionButton secondary title="Done" onPress={() => setControls(false)} /></>}</ScrollView></View></Modal>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F8F7' },
  header: { minHeight: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border },
  back: { position: 'absolute', left: 28, padding: 6 },
  title: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  outer: { flex: 1, padding: 24, paddingTop: 20, width: '100%', maxWidth: 650, alignSelf: 'center' },
  card: { flex: 1, borderWidth: 1, borderColor: '#CFD5DE', borderRadius: 24, padding: 23, backgroundColor: colors.white },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 15 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.muted, fontSize: 20, fontWeight: '600' },
  name: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  online: { color: '#008368', fontSize: 14 },
  phone: { width: 34, height: 34, borderWidth: 1, borderColor: colors.border, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  preview: { color: colors.subtle, fontSize: 10, textAlign: 'center', paddingVertical: 7 },
  conversation: { paddingVertical: 15, gap: 20 },
  empty: { alignItems: 'center', gap: 24, paddingTop: 40 },
  emptyText: { color: colors.subtle, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 24, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#F8F9FA' },
  chipText: { fontSize: 14, color: colors.ink },
  date: { textAlign: 'center', color: colors.subtle, fontSize: 12, marginBottom: 20 },
  messageRow: { alignItems: 'flex-start', gap: 6 },
  bubble: { maxWidth: '90%', backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 13, gap: 8 },
  sent: { backgroundColor: colors.button },
  messageText: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  timestamp: { color: colors.subtle, fontSize: 10 },
  fileText: { color: colors.ink, fontSize: 12 },
  image: { width: 180, height: 130, borderRadius: 8 },
  typing: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  error: { color: '#B3003C', fontSize: 12, marginBottom: 8 },
  pendingFile: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  composer: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 8, paddingLeft: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#F8F9FA', marginTop: 12 },
  input: { flex: 1, fontSize: 14, color: colors.ink, maxHeight: 90, minHeight: 32, paddingVertical: 5 },
  send: { backgroundColor: colors.button, borderRadius: 9, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  modal: { flex: 1, justifyContent: 'flex-end' },
  sheet: { flexGrow: 0, maxHeight: '90%', backgroundColor: colors.white, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  sheetContent: { padding: 24, gap: 18, width: '100%', maxWidth: 650, alignSelf: 'center' },
});
