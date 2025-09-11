// js/history-logic.js (Final Version with Debug + Safety)
document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const tableLoading = document.getElementById("table-loading");
  const tableContainer = document.getElementById("table-container");
  const tableHead = document.querySelector("#history-table thead tr");
  const tableBody = document.querySelector("#history-table tbody");
  const exportBtn = document.getElementById("export-btn");

  // --- State ---
  let fullHistoryData = [];
  let historyHeaders = [];

  // --- Web Worker to load data ---
  const historyWorker = new Worker("js/csv-worker.js");

  // You can optionally pass API_BASE or other config here
  // historyWorker.postMessage({ type: "config", API_BASE: "https://..." });

  // Send request to load CSV
  historyWorker.postMessage({
    url: "../approved_suggestion.csv", // adjust path if needed
    userRole: "admin", // or some role like "RGV"
    useDb: false // set to true if switching to API
  });

  // --- Handle worker response ---
  historyWorker.onmessage = function (event) {
    const { data, headers, error, debug, message, firstRow } = event.data;

    // Show debug logs in dev console
    if (debug) {
      console.log("📦 DEBUG from worker:", message);
      console.log("Headers:", headers);
      console.log("First row of data:", firstRow);
      return;
    }

    tableLoading.style.display = "none";
    tableContainer.style.display = "block";

    if (error) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-8 text-red-500">
            Error loading history: ${error}
          </td>
        </tr>`;
      return;
    }

    // Validate headers
    if (!Array.isArray(headers) || headers.length === 0) {
      console.error("❌ Invalid or missing headers from worker:", headers);
      tableBody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-8 text-red-500">
            Invalid header format in history data.
          </td>
        </tr>`;
      return;
    }

    fullHistoryData = data;
    historyHeaders = headers;
    renderHistoryTable(fullHistoryData, historyHeaders);
  };

  // --- Render the table ---
  function renderHistoryTable(data, headers) {
    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    // Render headers
    headers.forEach((headerText) => {
      const th = document.createElement("th");
      th.className =
        "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
      th.textContent = headerText.replace(/_/g, " ");
      tableHead.appendChild(th);
    });

    // If no data
    if (!Array.isArray(data) || data.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="${headers.length}" class="text-center py-8 text-gray-500">
            No approval history found.
          </td>
        </tr>`;
      return;
    }

    // Render rows
    data.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50";
      headers.forEach((header) => {
        const td = document.createElement("td");
        td.className = "px-6 py-4 whitespace-nowrap text-sm text-gray-800";
        td.textContent =
          row[header] !== null && row[header] !== undefined ? row[header] : "";
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
  }

  // --- Excel Export ---
  function exportToExcel() {
    if (fullHistoryData.length === 0) {
      alert("There is no history data to export.");
      return;
    }

    // Convert JSON array to worksheet
    const ws = XLSX.utils.json_to_sheet(fullHistoryData, {
      header: historyHeaders,
    });

    // Create a new workbook and append the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Approval_History");

    // Write the file
    XLSX.writeFile(
      wb,
      `approval_history_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  }

  // --- Export button listener ---
  if (exportBtn) {
    exportBtn.addEventListener("click", exportToExcel);
  }
});

