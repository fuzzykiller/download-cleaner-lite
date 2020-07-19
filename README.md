# download-cleaner-lite

A new version of the [Download Cleaner extension](https://github.com/fuzzykiller/ff-download-cleaner). It’s a complete rewrite using the [Web Extensions](https://developer.mozilla.org/en-US/Add-ons/WebExtensions) API.

## Notes

Because there is no way to detect when the browser closes, the “remove when closing” option has been replaced with a “remove when starting” option. Thanks for the idea, @CodingMarkus!

On-demand removal was removed because it doesn’t work after restarting the browser.
