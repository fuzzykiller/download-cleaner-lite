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

(function () {
  const downloadsToRemoveKey = "downloadsToRemove";
  const downloadsToRemove = new Set<string>();

  /** Add download to startup removal list */
  function registerStartupRemoval(url: string) {
    if (!url) return;
    if (downloadsToRemove.has(url)) return;
    
    downloadsToRemove.add(url);
    const removalList = JSON.stringify(Array.from(downloadsToRemove));
    browser.storage.local.set(keyValuePair(downloadsToRemoveKey, removalList));
  }

  /** Remove download from startup removal list */
  function unregisterStartupRemoval(url: string) {
    downloadsToRemove.delete(url);
    const removalList = JSON.stringify(Array.from(downloadsToRemove));
    browser.storage.local.set(keyValuePair(downloadsToRemoveKey, removalList));
  }

  /** Initialize extension */
  function main() {
    browser.downloads.onCreated.addListener(onDownloadCreated);
    browser.downloads.onChanged.addListener(onDownloadChanged);
    browser.alarms.onAlarm.addListener(onAlarm);
    loadSettings().then(result => {
      const downloadsToRemoveString = result[downloadsToRemoveKey];
      if (typeof downloadsToRemoveString === "string") {
        const urls = JSON.parse(downloadsToRemoveString) as string[];
        if (settings.removeAtStartup)
        {
          removeHistoryEntries(urls);
        }
        
        browser.storage.local.set(keyValuePair(downloadsToRemoveKey, "[]"));
      }
    });
  }

  /** Create removal timer/registration for new downloads */
  function onDownloadCreated(downloadItem: browser.downloads.DownloadItem){
    browser.alarms.create(JSON.stringify(downloadItem.id), {delayInMinutes: settings.removalDelayInMinutes});
    registerStartupRemoval(downloadItem.url);
  }

  /** Delay removal timer for changing downloads; work around event not firing on short downloads */
  function onDownloadChanged(downloadItem: {id: number}) {  
    browser.alarms.create(JSON.stringify(downloadItem.id), {delayInMinutes: settings.removalDelayInMinutes});
  }

  /** Call removal method when timer elapses */
  function onAlarm(alarm: browser.alarms.Alarm) {
    let downloadId = JSON.parse(alarm.name);
    browser.downloads.search({id: downloadId}).then(removeDownloads);
  }

  /** Fully remove passed array of `Downloads.DownloadItem` from history */
  function removeDownloads(downloads: browser.downloads.DownloadItem[]) {
    if (!settings.removeAfterDelay) return;
    
    for (let download of downloads) {
      // Skip in-progress downloads
      if (download.state === "in_progress") {
        continue;
      }
      
      unregisterStartupRemoval(download.url);

      try {
        browser.history.deleteUrl({url: download.url});
        browser.downloads.erase({id: download.id});
      } catch (ex) {
        // Ignore errors, continue iterating
      }
    }
  }

  /** Remove URLs from history */
  function removeHistoryEntries(urls: string[]) {
    for (let url of urls) {
      try {
        browser.history.deleteUrl({url: url});
      } catch (ex) {
        // Ignore errors, continue iterating
      }
    }
  }

  main();
})();


