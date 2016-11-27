let inputField = document.getElementById("delayInput");
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
