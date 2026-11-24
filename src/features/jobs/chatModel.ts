export type ChatRole = 'carrier' | 'shipper';
export type ChatAttachment = { name: string; uri: string; mime: string; size: number };
export type ChatMessage = { id: string; role: ChatRole; text: string; createdAt: string; attachment?: ChatAttachment };
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export function createChatMessage(role: ChatRole, text: string, attachment?: ChatAttachment): ChatMessage {
  const trimmed = text.trim();
  if (!trimmed && !attachment) throw new Error('Enter a message or attach a file.');
  if (trimmed.length > 2000) throw new Error('Messages must be 2,000 characters or fewer.');
  if (attachment && (!attachment.uri || !attachment.name || !Number.isFinite(attachment.size) || attachment.size < 0 || attachment.size > MAX_ATTACHMENT_BYTES)) throw new Error('Choose a file smaller than 2 MB.');
  return { id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2), role, text: trimmed, createdAt: new Date().toISOString(), ...(attachment ? { attachment } : {}) };
}
