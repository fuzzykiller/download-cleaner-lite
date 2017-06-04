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

/* eslint-disable no-unused-vars */
/* global keyValuePair:false, settings:false, loadSettings:false, removeAtStartupKey:false, removeAfterDelayKey:false, removalDelayKey:false */
/* eslint-enable no-unused-vars */

(function () {
  "use strict";

  const Downloads = browser.downloads;
  const History = browser.history;
  const Alarms = browser.alarms;
  const Storage = browser.storage;

  const downloadsToRemoveKey = "downloadsToRemove";
  const downloadsToRemove = {};

  // Add download to startup removal list
  function registerStartupRemoval(url) {
    if (url == null) return;
    if (url in downloadsToRemove) return;
    
    downloadsToRemove[url] = true;
    const removalList = JSON.stringify(Object.keys(downloadsToRemove));
    Storage.local.set(keyValuePair(downloadsToRemoveKey, removalList));
  }

  // Remove download from startup removal list
  function unregisterStartupRemoval(url) {
    delete downloadsToRemove[url];
    const removalList = JSON.stringify(Object.keys(downloadsToRemove));
    Storage.local.set(keyValuePair(downloadsToRemoveKey, removalList));
  }

  // Initialize extension
  function main() {
    Downloads.onCreated.addListener(onDownloadChanged);
    Downloads.onChanged.addListener(onDownloadChanged);
    Alarms.onAlarm.addListener(onAlarm);
    loadSettings().then(result => {
      if (downloadsToRemoveKey in result) {
        const urls = JSON.parse(result[downloadsToRemoveKey]);
        if (settings.removeAtStartup)
        {
          removeHistoryEntries(urls);
        }
        
        Storage.local.set(keyValuePair(downloadsToRemoveKey, "[]"));
      }
    });
  }

  // Create removal timer/removal pending entry for downloads
  function onDownloadChanged(downloadItem) {  
    // Re-schedule removal on each change; work around event not firing on short downloads
    Alarms.create(JSON.stringify(downloadItem.id), {delayInMinutes: settings.removalDelayInMinutes});
    registerStartupRemoval(downloadItem.url);
  }

  // Call removal method when timer elapses
  function onAlarm(alarm) {
    let downloadId = JSON.parse(alarm.name);
    Downloads.search({id: downloadId}).then(removeDownloads);
  }

  // Fully remove passed array of `Downloads.DownloadItem` from history
  function removeDownloads(downloads) {
    if (!settings.removeAfterDelay) return;
    
    for (let download of downloads) {
      // Skip in-progress downloads
      if (download.state === Downloads.State.IN_PROGRESS) {
        continue;
      }
      
      unregisterStartupRemoval(download.url);

      try {
        History.deleteUrl({url: download.url});
        Downloads.erase({id: download.id});
      } catch (ex) {
        // Ignore errors, continue iterating
      }
    }
  }

  function removeHistoryEntries(urls) {
    for (let url of urls) {
      try {
        History.deleteUrl({url: url});
      } catch (ex) {
        // Ignore errors, continue iterating
      }
    }
  }

  main();
})();


