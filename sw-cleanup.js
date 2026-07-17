// Self-destruct on localhost — prevents stale SW from blocking dev server
if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
  self.addEventListener('install', function() {
    self.skipWaiting();
  });
  self.addEventListener('activate', function() {
    self.registration.unregister().then(function() {
      clients.matchAll({ type: 'window' }).then(function(clientList) {
        for (var i = 0; i < clientList.length; i++) {
          clientList[i].navigate(clientList[i].url);
        }
      });
    });
  });
}
