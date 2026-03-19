let isInstalled = false;

export const installDesktopStorageProxy = () => {
  if (
    isInstalled ||
    typeof window === 'undefined' ||
    typeof Storage === 'undefined' ||
    typeof window.scholarSyncDesktop === 'undefined'
  ) {
    return;
  }

  const nativeGetItem = Storage.prototype.getItem;
  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.getItem = function getItem(key: string) {
    if (this === window.localStorage) {
      const desktopValue = window.scholarSyncDesktop?.storage.get(key);
      if (typeof desktopValue !== 'undefined') {
        return typeof desktopValue === 'string' ? desktopValue : JSON.stringify(desktopValue);
      }
    }

    return nativeGetItem.call(this, key);
  };

  Storage.prototype.setItem = function setItem(key: string, value: string) {
    if (this === window.localStorage) {
      try {
        const parsed = JSON.parse(value);
        void window.scholarSyncDesktop?.storage.set(key, parsed);
      } catch {
        void window.scholarSyncDesktop?.storage.set(key, value);
      }
    }

    return nativeSetItem.call(this, key, value);
  };

  Storage.prototype.removeItem = function removeItem(key: string) {
    if (this === window.localStorage) {
      void window.scholarSyncDesktop?.storage.remove(key);
    }

    return nativeRemoveItem.call(this, key);
  };

  isInstalled = true;
};
