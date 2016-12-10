/*
Copyright 2016 Daniel Betz

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

const inputField = document.getElementById("delayInput");
const settingsKey = "removalDelayInMinutes";

inputField.addEventListener("change", () => {
  const obj = {};
  if ((obj[settingsKey] = +inputField.value) < 1) {
    return;
  }

  browser.storage.local.set(obj);
}, false);

browser.storage.local.get(settingsKey).then(result => {
  inputField.value = result[settingsKey]
});
