// change to the version you get from `npm ls workbox-build`
importScripts('workbox-v4.1.1/workbox-sw.js');

// your custom service worker code

// the precache manifest will be injected into the following line
self.workbox.precaching.precacheAndRoute([]);