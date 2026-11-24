export const incidentTypes = ['Vehicle breakdown', 'Accident', 'Heavy traffic', 'Security incident', 'Route obstruction', 'Vehicle issue', 'Other'] as const;
export type IncidentAttachment = { name: string; uri: string; mime: string; size: number };
export type IncidentReport = { id: string; loadId: string; type: string; description: string; impactsDelivery: boolean; attachments: IncidentAttachment[]; createdAt: string; status: 'saved-locally' };
export function createIncidentReport(loadId: string, type: string, description: string, impactsDelivery: boolean | null, attachments: IncidentAttachment[]): IncidentReport {
  if (!loadId || !incidentTypes.some(item => item === type)) throw Error('Select an incident type.');
  if (!description.trim() || description.length > 2000) throw Error('Describe the incident in 2,000 characters or fewer.');
  if (typeof impactsDelivery !== 'boolean') throw Error('Choose whether delivery time is affected.');
  if (attachments.length > 5 || attachments.some(file => !file.name || !file.uri || !Number.isFinite(file.size) || file.size < 0 || file.size > 2 * 1024 * 1024)) throw Error('Attach up to five files, no larger than 2 MB each.');
  return { id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2), loadId, type, description: description.trim(), impactsDelivery, attachments: attachments.map(file => ({ ...file })), createdAt: new Date().toISOString(), status: 'saved-locally' };
}
