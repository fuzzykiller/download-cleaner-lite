/*
Copyright 2017 Daniel Betz

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

const Downloads = browser.downloads;
const History = browser.history;
const Alarms = browser.alarms;
const Storage = browser.storage;

const settingsKey = "removalDelayInMinutes";
const defaultValues = {};
defaultValues[settingsKey] = 1;
let removalDelayInMinutes = defaultValues[settingsKey];

// Initialize extension
function main() {
  Downloads.onCreated.addListener(onDownloadChanged);
  Downloads.onChanged.addListener(onDownloadChanged);
  Alarms.onAlarm.addListener(onAlarm);
  Storage.onChanged.addListener(storageChanged);
  ensureSettings();
}

// Create `settingsKey` in local storage if it doesn’t exist
function ensureSettings() {
  Storage.local.get(settingsKey).then(result => {
    if (result[settingsKey] != null) {
      removalDelayInMinutes = +result[settingsKey];
    } else {
       Storage.local.set(defaultValues);
    }
  });
}

// When `settingsKey` in local storage changed, get its new value
function storageChanged(changes, area) {
  if (area !== "local" || !changes.hasOwnProperty(settingsKey)) {
    return;
  }

  removalDelayInMinutes = +changes[settingsKey].newValue;
}

// Create removal timer for finished/aborted downloads
function onDownloadChanged(downloadItem) {
  if (downloadItem.state === Downloads.State.in_progress) {
    return;
  }

  if (removalDelayInMinutes === 0) {
    return;
  }

  Alarms.create(JSON.stringify(downloadItem.id), {delayInMinutes: removalDelayInMinutes});
}

// Call removal method when timer elapses
function onAlarm(alarm) {
  let downloadId = JSON.parse(alarm.name);
  Downloads.search({id: downloadId}).then(removeDownloads);
}

// Fully remove passed array of `Downloads.DownloadItem` from history
function removeDownloads(downloads) {
  for (let download of downloads) {
    // Skip in-progress downloads
    if (download.state === Downloads.State.in_progress) {
      continue;
    }

    try {
      History.deleteUrl({url: download.url});
      Downloads.erase({id: download.id});
    } catch (ex) {
      // Ignore errors, continue iterating
    }
  }
}

main();
