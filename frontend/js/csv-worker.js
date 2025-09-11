// js/csv-worker.js — uses API_BASE passed from main thread
self.importScripts("papaparse.min.js");

let API_BASE = "https://iasr-s3-2.onrender.com"; // fallback

self.onmessage = function (event) {
  // One-time config to set API base for the worker
  if (event.data && event.data.type === "config" && event.data.API_BASE) {
    API_BASE = event.data.API_BASE;
    return;
  }

  const { url, userRole, useDb, startDate, endDate } = event.data || {};

  if (useDb) {
    fetch(`${API_BASE}/api/get-data-for-range`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate }),
    })
      .then(async (r) => {
        if (!r.ok) {
          let msg = "Failed to fetch from DB";
          try {
            const j = await r.json();
            if (j && j.message) msg = j.message;
          } catch (_) {}
          throw new Error(msg);
        }
        return r.json();
      })
      .then((json) => {
        // json: { headers, data }
        self.postMessage({ data: json.data || [], headers: json.headers || [] });
      })
      .catch((err) => {
        self.postMessage({ error: err.message || "Failed to fetch from DB" });
      });
    return;
  }

  // CSV parsing path
  Papa.parse(url, {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: function (results) {
      const data = results.data;
      const headers = results.meta.fields || [];
        console.log("🚀 Headers parsed by PapaParse:", headers); // <-- Add this
  console.log("📦 First row of data:", data[0]);           // <-- And this
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
