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

const removeAtStartupKey = "removeAtStartup";
const removeAfterDelayKey = "removeAfterDelay";
const removalDelayKey = "removalDelayInMinutes";

const settings = {
  "removeAtStartup": false,
  "removeAfterDelay": true,
  "removalDelayInMinutes": 1
};

// Create object with single key, suitable for Storage.set()
function keyValuePair(key, value) {
  "use strict";

  const obj = {};
  obj[key] = value;
  return obj;
}

const loadSettings = (function () {
  "use strict";

  const Storage = browser.storage;
  let settingsChangedCallback;

  // Load settings and/or set default values
  function loadSettings(changedCallback) {
    settingsChangedCallback = changedCallback;
    Storage.onChanged.removeListener(storageChanged);
    Storage.onChanged.addListener(storageChanged);
    
    return Storage.local.get().then(result => {
      for (let key of Object.keys(settings)) {
        if (key in result) {
          settings[key] = JSON.parse(result[key]);
        } else {
          Storage.local.set(
            keyValuePair(key, JSON.stringify(settings[key])));
        }
      }

      return result;
    });
  }

  function storageChanged(changes, area) {
    if (area !== "local") return;

    for (let key of Object.keys(settings)) {
      if (key in changes) {
        settings[key] = JSON.parse(changes[key].newValue);
      }
    }
    
    if (settingsChangedCallback != null) {
      settingsChangedCallback();
    }
  }
  
  return loadSettings;
})();