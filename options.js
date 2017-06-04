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
  const delayInputLabel = document.getElementById("delayInputLabel");
  const delayInputField = document.getElementById("delayInput");
  const delayEnabledCheckbox = document.getElementById("delayEnabledInput");
  const removeAtStartEnabledCheckbox = document.getElementById("removeAtStartEnabledInput");

  let settingsChanging = false;

  delayInputField.addEventListener("change", () => {
    if (settingsChanging) return;

    if (+delayInputField.value < 1) {
      return;
    }

    browser.storage.local.set(
      keyValuePair(removalDelayKey, JSON.stringify(+delayInputField.value)));
    
    //onSettingsChanged();
  }, false);

  delayEnabledCheckbox.addEventListener("change", () => {
    if (settingsChanging) return;

    browser.storage.local.set(
      keyValuePair(removeAfterDelayKey, JSON.stringify(delayEnabledCheckbox.checked)));

    //onSettingsChanged();
  }, false);

  removeAtStartEnabledCheckbox.addEventListener("change", () => {
    if (settingsChanging) return;

    browser.storage.local.set(
      keyValuePair(removeAtStartupKey, JSON.stringify(removeAtStartEnabledCheckbox.checked)));

    //onSettingsChanged();
  }, false);

  function onSettingsChanged() {
    settingsChanging = true;
    delayInputField.value = settings.removalDelayInMinutes;
    delayEnabledCheckbox.checked = settings.removeAfterDelay;
    removeAtStartEnabledCheckbox.checked = settings.removeAtStartup;

    delayInputField.disabled = !settings.removeAfterDelay;
    delayInputLabel.className = !settings.removeAfterDelay ? "disabled" : "";
    settingsChanging = false;
  }

  loadSettings(() => onSettingsChanged())
    .then(() => onSettingsChanged());
})();