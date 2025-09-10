// js/csv-worker.js - extended: can fetch from backend DB when instructed
self.importScripts("papaparse.min.js");

self.onmessage = function (event) {
  const { url, userRole, useDb, startDate, endDate } = event.data;

  if (useDb) {
    // fetch from backend API for date range
    fetch("https://iasr-s3-2.onrender.com/api/get-data-for-range", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate }),
    })
      .then((r) => r.json())
      .then((json) => {
        // json should be { headers, data }
        self.postMessage({ data: json.data || [], headers: json.headers || [] });
      })
      .catch((err) => {
        self.postMessage({ error: err.message || "Failed to fetch from DB" });
      });
    return;
  }

  // original behavior: parse CSV via PapaParse
  Papa.parse(url, {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: function (results) {
      const data = results.data;
      const headers = results.meta.fields || [];
      // optional filtering by userRole
      let filtered = data;
      if (userRole && userRole !== "admin") {
        filtered = data.filter((r) => r.Marketid === userRole);
      }
      self.postMessage({ data: filtered, headers: headers });
    },
    error: function (error) {
      self.postMessage({ error: error.message });
    },
  });
};
