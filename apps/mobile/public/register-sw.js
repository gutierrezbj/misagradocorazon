// Registra el service worker de la beta web (SDD-05 US-27). Fichero aparte para que la CSP no
// necesite scripts en línea. En desarrollo no se registra: Metro sirve bundles sin hash y la caché
// los dejaría viejos.
if ("serviceWorker" in navigator && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
}
