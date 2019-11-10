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

(async () => {
  const delayInputLabel = document.getElementById("delayInputLabel") as HTMLLabelElement;
  const delayInputField = document.getElementById("delayInput") as HTMLInputElement;
  const delayEnabledCheckbox = document.getElementById("delayEnabledInput") as HTMLInputElement;
  const removeAtStartEnabledCheckbox = document.getElementById("removeAtStartEnabledInput") as HTMLInputElement;
  const removeInterruptedEnabledCheckbox = document.getElementById("removeInterruptedEnabledInput") as HTMLInputElement;

  let settingsChanging = false;

  delayInputField.addEventListener("change", () => {
    if (settingsChanging) { return; }

    if (+delayInputField.value < 1) {
      return;
    }

    browser.storage.local.set(
      kvp(removalDelayKey, JSON.stringify(+delayInputField.value)));
  }, false);

  delayEnabledCheckbox.addEventListener("change", () => {
    if (settingsChanging) { return; }

    browser.storage.local.set(
      kvp(removeAfterDelayKey, JSON.stringify(delayEnabledCheckbox.checked)));
  }, false);

  removeAtStartEnabledCheckbox.addEventListener("change", () => {
    if (settingsChanging) { return; }

    browser.storage.local.set(
      kvp(removeAtStartupKey, JSON.stringify(removeAtStartEnabledCheckbox.checked)));
  }, false);

  removeInterruptedEnabledCheckbox.addEventListener("change", () => {
    if (settingsChanging) { return; }

    browser.storage.local.set(
      kvp(removeInterruptedKey, JSON.stringify(removeInterruptedEnabledCheckbox.checked)));
  }, false);

  function onSettingsChanged() {
    settingsChanging = true;
    delayInputField.value = `${settings.removalDelayInMinutes}`;
    delayEnabledCheckbox.checked = settings.removeAfterDelay;
    removeAtStartEnabledCheckbox.checked = settings.removeAtStartup;
    removeInterruptedEnabledCheckbox.checked = settings.removeInterrupted;

    delayInputField.disabled = !settings.removeAfterDelay;
    delayInputLabel.className = !settings.removeAfterDelay ? "disabled" : "";
    settingsChanging = false;
  }

  await loadSettings(onSettingsChanged);
  onSettingsChanged();
})();
