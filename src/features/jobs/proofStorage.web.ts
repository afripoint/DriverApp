import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateProofFiles } from './deliveryProof';
import { ProofDraft } from './proofStorage.types';

// Keep file data in IndexedDB, avoiding localStorage's small string quota.
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(Error('File storage is unavailable in this browser. Allow site storage or use another browser.')); return; }
    const request = indexedDB.open('driverapp-delivery-proof', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('proofs', { keyPath: 'loadId' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? Error('Unable to open proof file storage.'));
  });
}
export async function saveProofDraft(draft: ProofDraft): Promise<ProofDraft> {
  validateProofFiles(draft.files);
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('proofs', 'readwrite');
      transaction.objectStore('proofs').put(draft);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error ?? Error('File storage is full. Free some device storage and try again.'));
      transaction.onerror = () => reject(transaction.error ?? Error('Unable to save proof files.'));
    });
    return draft;
  } finally { db.close(); }
}
export async function loadProofDraft(loadId: string): Promise<ProofDraft | null> {
  const db = await database();
  let draft: ProofDraft | null;
  try {
    draft = await new Promise((resolve, reject) => {
      const request = db.transaction('proofs', 'readonly').objectStore('proofs').get(loadId);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? Error('Unable to load saved proof.'));
    });
  } finally { db.close(); }
  if (!draft) {
    const legacy = await AsyncStorage.getItem('driverapp-pod-v1:' + loadId);
    if (legacy) {
      draft = JSON.parse(legacy);
      if (!draft || draft.loadId !== loadId || !Array.isArray(draft.files)) throw Error('Invalid saved proof draft.');
      await saveProofDraft(draft);
      await AsyncStorage.removeItem('driverapp-pod-v1:' + loadId);
    }
  }
  if (draft) {
    if (draft.loadId !== loadId || !Array.isArray(draft.files)) throw Error('Invalid saved proof draft.');
    validateProofFiles(draft.files);
  }
  return draft;
}
