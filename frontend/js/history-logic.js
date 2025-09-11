// js/history-logic.js (Final Version with Excel Export)
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
  historyWorker.postMessage({ url: "frontend/approved_suggestion.csv" });

  historyWorker.onmessage = function (event) {
    tableLoading.style.display = "none";
    tableContainer.style.display = "block";

    if (event.data.error) {
      tableBody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-red-500">Error loading history: ${event.data.error}</td></tr>`;
      return;
    }

    fullHistoryData = event.data.data;
    historyHeaders = event.data.headers;
    renderHistoryTable(fullHistoryData, historyHeaders);
  };

  // Attach event listener for the export button
  if (exportBtn) {
    exportBtn.addEventListener("click", exportToExcel);
  }

  function renderHistoryTable(data, headers) {
    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    headers.forEach((headerText) => {
      const th = document.createElement("th");
      th.className =
        "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
      th.textContent = headerText.replace(/_/g, " ");
      tableHead.appendChild(th);
    });

    if (data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="${headers.length}" class="text-center py-8 text-gray-500">No approval history found.</td></tr>`;
      return;
    }

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

  // --- Excel Export instead of CSV ---
  function exportToExcel() {
    if (fullHistoryData.length === 0) {
      alert("There is no history data to export.");
      return;
    }

    // Convert JSON array to worksheet
    const ws = XLSX.utils.json_to_sheet(fullHistoryData, { header: historyHeaders });

    // Create a new workbook and append the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Approval_History");

    // Write the file
    XLSX.writeFile(
      wb,
      `approval_history_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  }
});

