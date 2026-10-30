import type { Blocklist } from './types';

export function createBlocklist(hosts: Iterable<string>): Blocklist {
  const set = new Set<string>();
  for (const host of hosts) {
    const normalized = host.trim().toLowerCase().replace(/\.$/, '');
    if (normalized !== '') {
      set.add(normalized);
    }
  }
  return {
    size: set.size,
    has(host: string): boolean {
      const labels = host.toLowerCase().replace(/\.$/, '').split('.');
      for (let i = 0; i < labels.length - 1; i += 1) {
        if (set.has(labels.slice(i).join('.'))) {
          return true;
        }
      }
      return labels.length === 1 && set.has(labels[0]);
    },
  };
}

export const emptyBlocklist: Blocklist = createBlocklist([]);
