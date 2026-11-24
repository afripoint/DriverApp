import { Platform } from 'react-native';

export const colors = {
  ink: '#111827', muted: '#536073', subtle: '#6B778D', green: '#006B52',
  button: '#005C46', orange: '#F56300', border: '#E2E5EB', surface: '#F3F4F6',
  white: '#FFFFFF', mint: '#E7F4EF',
};
export const headingFont = Platform.select({ android: 'serif', ios: 'Georgia', default: 'Georgia' });
