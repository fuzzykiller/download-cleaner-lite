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
  const byId = <T extends HTMLElement>(key: string) =>
    document.getElementById(key) as T;

  const delayInputLabel = byId<HTMLLabelElement>("delayInputLabel");
  const delayInputField = byId<HTMLInputElement>("delayInput");
  const delayEnabledCheckbox = byId<HTMLInputElement>("delayEnabledInput");
  const removeAtStartEnabledCheckbox = byId<HTMLInputElement>(
    "removeAtStartEnabledInput"
  );
  const removeInterruptedEnabledCheckbox = byId<HTMLInputElement>(
    "removeInterruptedEnabledInput"
  );

  let settingsChanging = false;

  const onUserChange = (el: HTMLElement, handler: () => void) =>
    el.addEventListener("change", () =>
      !settingsChanging ? handler() : void 0
    );

  onUserChange(delayInputField, () => {
    const delay = Math.floor(Math.max(0, +delayInputField.value));

    browser.storage.local.set(kvp(removalDelayKey, JSON.stringify(delay)));
  });

  onUserChange(delayEnabledCheckbox, () => {
    browser.storage.local.set(
      kvp(removeAfterDelayKey, JSON.stringify(delayEnabledCheckbox.checked))
    );
  });

  onUserChange(removeAtStartEnabledCheckbox, () => {
    browser.storage.local.set(
      kvp(
        removeAtStartupKey,
        JSON.stringify(removeAtStartEnabledCheckbox.checked)
      )
    );
  });

  onUserChange(removeInterruptedEnabledCheckbox, () => {
    browser.storage.local.set(
      kvp(
        removeInterruptedKey,
        JSON.stringify(removeInterruptedEnabledCheckbox.checked)
      )
    );
  });

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
