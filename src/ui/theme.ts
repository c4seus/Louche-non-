import { useColorScheme } from 'react-native';
import type { Verdict } from '../engine/types';

export interface Palette {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
  onPrimary: string;
  verdict: Record<Verdict, { background: string; border: string; text: string }>;
}

const light: Palette = {
  background: '#F6F4EF',
  surface: '#FFFFFF',
  border: '#DDD8CC',
  text: '#1D1B17',
  muted: '#625D52',
  primary: '#2F4B7C',
  onPrimary: '#FFFFFF',
  verdict: {
    scam: { background: '#FCE8E6', border: '#C5221F', text: '#8C1D18' },
    suspicious: { background: '#FFF4D6', border: '#B06000', text: '#7A4100' },
    clean: { background: '#E6F0EA', border: '#3B7A57', text: '#22513A' },
  },
};

const dark: Palette = {
  background: '#151412',
  surface: '#211F1B',
  border: '#3A362F',
  text: '#F2EEE6',
  muted: '#B3AC9F',
  primary: '#8FB0E8',
  onPrimary: '#10203D',
  verdict: {
    scam: { background: '#3B1715', border: '#F28B82', text: '#F9C9C4' },
    suspicious: { background: '#3A2A0C', border: '#FDBA4D', text: '#FCE3B0' },
    clean: { background: '#16301F', border: '#81C995', text: '#C8EBD2' },
  },
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
