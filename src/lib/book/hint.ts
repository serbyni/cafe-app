/** The book's gesture hint is shown once per device (storage may be blocked: then shown each time). */
export const HINT_KEY = "serbi_book_hint_seen";

export function hintSeen(storage: Pick<Storage, "getItem"> | null = safeStorage()): boolean {
  try {
    return storage?.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markHintSeen(storage: Pick<Storage, "setItem"> | null = safeStorage()) {
  try {
    storage?.setItem(HINT_KEY, "1");
  } catch {
    /* storage blocked: the hint will show again next time */
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
