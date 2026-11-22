// Everything this app saves lives in the browser's IndexedDB (via idb-keyval), per device: games
// already downloaded, engine results and flashcard progress. There's no account and no server.
// Every call is wrapped, so a private window or blocked storage just means nothing is remembered.
import { get, set, del } from 'idb-keyval';

export async function load<T>(key: string): Promise<T | undefined> {
	try {
		return await get<T>(key);
	} catch {
		return undefined;
	}
}

export async function save(key: string, value: unknown) {
	try {
		await set(key, value);
	} catch {
		// Storage unavailable: the app still works, it just won't remember
	}
}

export async function remove(key: string) {
	try {
		await del(key);
	} catch {
		// nothing saved to remove
	}
}

// Small per-device preferences (recent searches) go in localStorage, also guarded.
export function readLocal<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

export function writeLocal(key: string, value: unknown) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// ignore
	}
}
