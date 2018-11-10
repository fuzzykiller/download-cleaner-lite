/*
Copyright 2018 Daniel Betz

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

const removeAtStartupKey = "removeAtStartup";
const removeAfterDelayKey = "removeAfterDelay";
const removalDelayKey = "removalDelayInMinutes";
const removeInterruptedKey = "removeInterrupted";

const settings = {
  removalDelayInMinutes: 1,
  removeAfterDelay: true,
  removeAtStartup: false,
  removeInterrupted: true,
};

type Settings = typeof settings;

/** Create object with single key, suitable for `Storage.set()` */
function keyValuePair<K extends string>(key: K, value: string): Record<K, string> {
  return { [key]: value } as Record<K, string>;
}

/** Load settings and/or set default values */
function loadSettings(changedCallback?: () => void) {
  const settingsKeys = Object.keys(settings) as [keyof Settings];

  let settingsChangedCallback: (() => void) | undefined;

  function storageChanged(changes: browser.storage.ChangeDict, area: browser.storage.StorageName) {
    if (area !== "local") { return; }

    for (const key of settingsKeys) {
      if (key in changes) {
        settings[key] = JSON.parse(changes[key].newValue);
      }
    }

    if (settingsChangedCallback != null) {
      settingsChangedCallback();
    }
  }

  settingsChangedCallback = changedCallback;
  browser.storage.onChanged.removeListener(storageChanged);
  browser.storage.onChanged.addListener(storageChanged);

  return browser.storage.local.get().then((result) => {
    for (const key of settingsKeys) {
      const value = result[key];
      if (typeof value === "string") {
        settings[key] = JSON.parse(value);
      } else {
        browser.storage.local.set(
          keyValuePair(key, JSON.stringify(settings[key])));
      }
    }

    return result;
  });
}
