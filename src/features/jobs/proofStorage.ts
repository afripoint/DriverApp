import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { validateProofFiles } from './deliveryProof';
import { ProofDraft } from './proofStorage.types';

const key = (loadId: string) => 'driverapp-pod-v1:' + loadId;
export async function loadProofDraft(loadId: string): Promise<ProofDraft | null> {
  const value = await AsyncStorage.getItem(key(loadId));
  if (!value) return null;
  const draft: ProofDraft = JSON.parse(value);
  if (draft.loadId !== loadId || !Array.isArray(draft.files)) throw Error('Invalid saved proof draft.');
  validateProofFiles(draft.files);
  return draft;
}
export async function saveProofDraft(draft: ProofDraft): Promise<ProofDraft> {
  validateProofFiles(draft.files);
  const root = FileSystem.documentDirectory;
  if (!root) throw Error('App file storage is unavailable. Reopen Expo Go and try again.');
  const folder = root + 'delivery-proof/';
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  const copied: string[] = [];
  const files = draft.files.map(file => ({ ...file }));
  try {
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      if (file.uri.startsWith(folder)) {
        if (!(await FileSystem.getInfoAsync(file.uri)).exists) throw Error('A proof file is missing. Remove it and select it again.');
        continue;
      }
      const target = folder + Date.now() + '-' + Math.random().toString(36).slice(2) + '-' + index + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      await FileSystem.copyAsync({ from: file.uri, to: target });
      copied.push(target);
      files[index] = { ...file, uri: target };
    }
    const saved = { ...draft, files };
    await AsyncStorage.setItem(key(draft.loadId), JSON.stringify(saved));
    return saved;
  } catch (cause) {
    await Promise.all(copied.map(uri => FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {})));
    throw cause;
  }
}
