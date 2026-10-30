import { Directory, File, Paths } from 'expo-file-system';
import type { FeedStore } from './sync';

const folder = new Directory(Paths.document, 'feed');

export const fileStore: FeedStore = {
  async read(name) {
    const file = new File(folder, name);
    if (!file.exists) {
      return null;
    }
    return file.text();
  },
  async write(name, text) {
    if (!folder.exists) {
      folder.create({ intermediates: true, idempotent: true });
    }
    const file = new File(folder, name);
    await file.write(text);
  },
};

export async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'Cache-Control': 'no-cache' } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}
