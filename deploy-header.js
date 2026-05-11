(function () {
  if (window.location.protocol === "http:" && window.location.hostname !== "localhost") {
    var loc = window.location;
    window.location.href = "https://" + loc.hostname + loc.pathname + loc.search;
  }

  // API base URL.
  // Dev (same-origin via Spring Boot): leave empty to call /api/... on this origin.
  // Prod (external static host): set explicitly to the API origin, e.g. "https://api.example.com".
  var settings = window.settings || (window.settings = {});

  if (settings.apiBase == null) {
    settings.apiBase = "";
  }
})();
