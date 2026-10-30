import { useCallback, useEffect, useRef, useState } from 'react';
import { FEED_BASE_URL, FEED_PUBLIC_KEY, FEED_REFRESH_INTERVAL_MS } from '../config';
import { emptyBlocklist } from '../engine/blocklist';
import { defaultRules } from '../engine/rules';
import { fetchText, fileStore } from './storage';
import {
  defaultSettings,
  loadFeed,
  refreshFeed,
  saveSettings,
  shouldRefresh,
  type FeedData,
  type RefreshStatus,
} from './sync';

export type FeedActivity = 'idle' | 'updating' | RefreshStatus;

export interface FeedController {
  data: FeedData;
  activity: FeedActivity;
  configured: boolean;
  refresh: () => Promise<void>;
  setAutoUpdate: (value: boolean) => Promise<void>;
}

const initialData: FeedData = {
  rules: defaultRules,
  rulesSource: 'bundled',
  blocklist: emptyBlocklist,
  blocklistCount: 0,
  blocklistGenerated: null,
  settings: defaultSettings,
};

export function useFeed(): FeedController {
  const [data, setData] = useState<FeedData>(initialData);
  const [activity, setActivity] = useState<FeedActivity>('idle');
  const busy = useRef(false);
  const dataRef = useRef<FeedData>(initialData);
  dataRef.current = data;
  const configured = FEED_PUBLIC_KEY.trim() !== '';

  const refresh = useCallback(async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setActivity('updating');
    try {
      const outcome = await refreshFeed({
        store: fileStore,
        fetchText,
        baseUrl: FEED_BASE_URL,
        publicKey: FEED_PUBLIC_KEY,
        bundledRules: defaultRules,
        now: Date.now(),
      });
      setData(outcome.data);
      setActivity(outcome.status);
    } catch {
      setActivity('failed');
    } finally {
      busy.current = false;
    }
  }, []);

  const setAutoUpdate = useCallback(async (value: boolean) => {
    const next = { ...dataRef.current.settings, autoUpdate: value };
    setData((current) => ({ ...current, settings: { ...current.settings, autoUpdate: value } }));
    try {
      await saveSettings(fileStore, next);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded = initialData;
      try {
        loaded = await loadFeed(fileStore, defaultRules);
      } catch {
        loaded = initialData;
      }
      if (cancelled) {
        return;
      }
      setData(loaded);
      if (configured && shouldRefresh(loaded.settings, Date.now(), FEED_REFRESH_INTERVAL_MS)) {
        await refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, refresh]);

  return { data, activity, configured, refresh, setAutoUpdate };
}
