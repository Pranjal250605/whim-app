// Extends app.json to inject the Mapbox config plugin. We do this in JS (not
// app.json) so the SECRET download token comes from an env var at build time
// and never gets committed. Expo passes the static app.json in as `config`.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      '@rnmapbox/maps',
      {
        // sk.… token with DOWNLOADS:READ scope — used only to download the
        // native SDK during `expo prebuild` / `expo run:ios`. Not shipped.
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
      },
    ],
  ],
});
