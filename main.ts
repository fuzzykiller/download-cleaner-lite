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

interface IDownloadInfo {
  url: string;
  time: number;
}

(() => {
  const downloadsToRemoveKey = "downloadsToRemove";
  const trackedDownloadsByUrl = new Map<string, IDownloadInfo>();
  const trackedDownloadsById = new Map<number, IDownloadInfo>();

  /** Add or update tracked download */
  function addOrUpdateTrackedDownload(id: number, url?: string): void;
  function addOrUpdateTrackedDownload(url: string): void;
  function addOrUpdateTrackedDownload(idOrUrl: number | string, url?: string) {
    let entry: IDownloadInfo;
    if (typeof idOrUrl === "number") {
      const trackedDownload = trackedDownloadsById.get(idOrUrl);
      if (trackedDownload) {
        // Known download by id
        entry = trackedDownload;

        if (typeof url === "string") {
          // URL changed, update tracking
          trackedDownloadsByUrl.delete(entry.url);
          entry.url = url;
          trackedDownloadsByUrl.set(url, entry);
        }
      } else if (typeof url === "string") {
        // New download by id, begin tracking
        entry = { url, time: 0 };
        trackedDownloadsById.set(idOrUrl, entry);
        trackedDownloadsByUrl.set(url, entry);
      } else {
        // Unknown download by id, URL missing, abort
        return;
      }
    } else {
      let trackedDownload = trackedDownloadsByUrl.get(idOrUrl);
      if (!trackedDownload) {
        trackedDownload = { url: idOrUrl, time: 0 };
        trackedDownloadsByUrl.set(idOrUrl, trackedDownload);
      }

      entry = trackedDownload;
    }

    entry.time = Date.now();

    trackedDownloadsByUrl.set(entry.url, entry);
    updateTrackedDownloadsStore();
  }

  /** Remove download from list of tracked downloads */
  function removeTrackedDownload(url: string, id?: number) {
    trackedDownloadsByUrl.delete(url);

    if (id !== undefined) {
      trackedDownloadsById.delete(id);
    }

    updateTrackedDownloadsStore();
  }

  /** Update tracked downloads on local storage */
  function updateTrackedDownloadsStore() {
    const serializedList = JSON.stringify(Array.from(trackedDownloadsByUrl.values()));
    browser.storage.local.set(keyValuePair(downloadsToRemoveKey, serializedList));
  }

  /** Initialize extension */
  function main() {
    browser.downloads.onCreated.addListener(onDownloadCreated);
    browser.downloads.onChanged.addListener(onDownloadChanged);
    browser.alarms.onAlarm.addListener(onAlarm);
    loadSettings().then((result) => {
      const downloadsToRemoveString = result[downloadsToRemoveKey];
      if (typeof downloadsToRemoveString === "string") {
        const downloadInfos = JSON.parse(downloadsToRemoveString) as IDownloadInfo[];
        if (settings.removeAtStartup) {
          removeHistoryEntries(downloadInfos.map((x) => x.url));
        }

        browser.storage.local.set(keyValuePair(downloadsToRemoveKey, "[]"));
      }
    });
  }

  /** Create removal timer/registration for new downloads */
  function onDownloadCreated({ id, url }: browser.downloads.DownloadItem) {
    browser.alarms.create(JSON.stringify(id), { delayInMinutes: settings.removalDelayInMinutes });
    addOrUpdateTrackedDownload(id, url);
  }

  /** Delay removal timer for changing downloads; work around events not firing on short downloads */
  function onDownloadChanged({ id, url }: { id: number, url?: browser.downloads.StringDelta }) {
    browser.alarms.create(JSON.stringify(id), { delayInMinutes: settings.removalDelayInMinutes });
    addOrUpdateTrackedDownload(id, url && url.current);
  }

  /** Call removal method when timer elapses */
  function onAlarm(alarm: browser.alarms.Alarm) {
    const downloadId = JSON.parse(alarm.name);
    browser.downloads.search({ id: downloadId }).then(removeDownloads);
  }

  /** Fully remove passed array of `Downloads.DownloadItem` from history */
  function removeDownloads(downloads: browser.downloads.DownloadItem[]) {
    if (!settings.removeAfterDelay) { return; }

    for (const download of downloads) {
      // Skip in-progress downloads
      if (download.state === "in_progress") {
        continue;
      }

      removeTrackedDownload(download.url, download.id);

      try {
        browser.history.deleteUrl({ url: download.url });
        browser.downloads.erase({ id: download.id });
      } catch (ex) {
        // Ignore errors, continue iterating
      }
    }
  }

  /** Remove URLs from history */
  function removeHistoryEntries(urls: string[]) {
    for (const url of urls) {
      try {
        browser.history.deleteUrl({ url });
      } catch (ex) {
        // Ignore errors, continue iterating
      }
    }
  }

  main();
})();
