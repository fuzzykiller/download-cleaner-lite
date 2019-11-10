/*
Copyright 2019 Daniel Betz

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

  /** Last change; UNIX time (milliseconds) */
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
    browser.storage.local.set(kvp(downloadsToRemoveKey, serializedList));
  }

  /** Initialize extension */
  async function main() {
    browser.downloads.onCreated.addListener(onDownloadCreated);
    browser.downloads.onChanged.addListener(onDownloadChanged);
    browser.alarms.onAlarm.addListener(onAlarm);

    const result = await loadSettings();
    const downloadsToRemoveString = result[downloadsToRemoveKey];
    if (typeof downloadsToRemoveString === "string") {
      const downloadInfos = JSON.parse(downloadsToRemoveString) as IDownloadInfo[];
      if (settings.removeAtStartup) {
        removeHistoryEntries(downloadInfos.map((x) => x.url));
        browser.storage.local.remove(downloadsToRemoveKey);
      } else if (settings.removeAfterDelay) {
        reregisterOldDownloads(downloadInfos);
      } else {
        browser.storage.local.remove(downloadsToRemoveKey);
      }
    }
  }

  /** Create removal timers for downloads from previous sessions */
  function reregisterOldDownloads(downloads: IDownloadInfo[]) {
    const removalDelayInMilliseconds = (settings.removalDelayInMinutes * 60000);
    const now = Date.now();

    const urlsToRemove: string[] = [];

    for (const download of downloads) {
      const dueTime = download.time + removalDelayInMilliseconds;
      if (dueTime < now) {
        // Already due
        urlsToRemove.push(download.url);
      } else {
        // Due in future
        const minutesUntilDue = (dueTime - now) / 60000;
        trackedDownloadsByUrl.set(download.url, download);
        browser.alarms.create(`url-${download.url}`, { delayInMinutes: minutesUntilDue });
      }
    }

    // Remove downloads due for removal now or in the past
    removeHistoryEntries(urlsToRemove);

    updateTrackedDownloadsStore();
  }

  /** Create removal timer/registration for new downloads */
  function onDownloadCreated({ id, url }: browser.downloads.DownloadItem) {
    browser.alarms.create(`id-${id}`, { delayInMinutes: settings.removalDelayInMinutes });
    addOrUpdateTrackedDownload(id, url);
  }

  /** Delay removal timer for changing downloads; work around events not firing on short downloads */
  function onDownloadChanged({ id, url }: { id: number, url?: browser.downloads.StringDelta }) {
    browser.alarms.create(`id-${id}`, { delayInMinutes: settings.removalDelayInMinutes });
    addOrUpdateTrackedDownload(id, url && url.current);
  }

  /** Call removal method when timer elapses */
  async function onAlarm(alarm: browser.alarms.Alarm) {
    if (alarm.name.startsWith("id-")) {
      // Download from current session with ID
      const downloadId = parseInt(alarm.name.substring(3), 10);
      const downloads = await browser.downloads.search({ id: downloadId });
      removeDownloads(downloads);
    } else if (alarm.name.startsWith("url-")) {
      // Download from previous session, only URL
      const downloadUrl = alarm.name.substring(4);
      removeHistoryEntry(downloadUrl);
    }
  }

  /** Fully remove passed array of `Downloads.DownloadItem` from history */
  function removeDownloads(downloads: browser.downloads.DownloadItem[]) {
    if (!settings.removeAfterDelay) { return; }

    for (const download of downloads) {
      // Always skip paused downloads
      if (download.paused) {
        continue;
      }

      // Always skip non-interrupted non-complete downloads
      if (download.state !== "interrupted" && download.state !== "complete") {
        continue;
      }

      // Skip interrupted downloads unless option enabled
      if (download.state === "interrupted" && !settings.removeInterrupted) {
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

  /** Remove single download from history and forget about it */
  function removeHistoryEntry(url: string) {
    removeHistoryEntries([ url ]);
    removeTrackedDownload(url);
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
