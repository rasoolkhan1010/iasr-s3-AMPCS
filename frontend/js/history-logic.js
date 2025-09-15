document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const tableLoading = document.getElementById("table-loading");
  const tableContainer = document.getElementById("table-container");
  const tableHead = document.querySelector("#history-table thead tr");
  const tableBody = document.querySelector("#history-table tbody");
  const exportBtn = document.getElementById("export-btn");
  const dataCountElement = document.getElementById("data-count");

  // --- State ---
  let fullHistoryData = [];
  let currentFilteredData = [];
  let currentPage = 1;
  const rowsPerPage = 1000;

  // Use your session-stored dates or defaults
  const startDate = sessionStorage.getItem("startDateISO") || "2025-01-01";
  const endDate = sessionStorage.getItem("endDateISO") || new Date().toISOString();

  // --- Fetch history from backend ---
  async function fetchHistoryData() {
    if (tableLoading) tableLoading.textContent = `Loading history from ${startDate} to ${endDate}...`;
    try {
      const response = await fetch(`${window.CONFIG.API_BASE}/api/get-history-for-range`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate })
      });
      if (!response.ok) throw new Error("Failed to fetch history data");
      const json = await response.json();
      fullHistoryData = json.data || [];
      currentFilteredData = fullHistoryData;
      renderTableHeaders();
      updateTableByPage();
      if (tableLoading) tableLoading.style.display = "none";
      if (tableContainer) tableContainer.style.display = "block";
    } catch (error) {
      if (tableLoading) tableLoading.textContent = `Error loading history: ${error.message}`;
    }
  }

  // --- Table Headers ---
  function renderTableHeaders() {
    if (!tableHead) return;
    tableHead.innerHTML = "";
    const headers = [
      "Marketid", "company", "Itmdesc", "cost", "Total _Stock",
      "Original_Recommended_Qty", "Order_Qty", "Total_Cost",
      "Recommended_Shipping", "Approved_By", "Approved_At"
    ];
    headers.forEach(header => {
      const th = document.createElement("th");
      th.className = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
      th.textContent = header;
      tableHead.appendChild(th);
    });
  }

  // --- Render Table Body ---
  function renderTableBody(data) {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    if (!data.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 11;
      td.className = "text-center py-8 text-gray-500";
      td.textContent = "No records match the current filters.";
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }
    data.forEach(row => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50";
      [
        "Marketid", "company", "Itmdesc", "cost", "Total _Stock",
        "Original_Recommended_Qty", "Order_Qty", "Total_Cost",
        "Recommended_Shipping", "Approved_By", "Approved_At"
      ].forEach(key => {
        const td = document.createElement("td");
        td.className = "px-6 py-4 whitespace-nowrap text-sm text-gray-800";
        td.textContent = row[key] || "";
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
  }

  // --- Pagination ---
  function renderPaginationControls() {
    const paginationContainer = document.querySelector(".pagination-container") || createPaginationContainer();
    paginationContainer.innerHTML = "";
    const totalPages = Math.ceil(currentFilteredData.length / rowsPerPage);
    if (totalPages <= 1) return;

    function createPageButton(text, disabled, isCurrent = false) {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.disabled = disabled;
      btn.className =
        "mx-1 px-3 py-1 rounded border text-sm font-semibold " +
        (disabled
          ? "bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300"
          : "bg-white text-gray-700 hover:bg-blue-600 hover:text-white border-gray-300");
      if (isCurrent) {
        btn.className =
          "mx-1 px-3 py-1 rounded border text-sm font-bold bg-blue-600 text-white border-blue-700 shadow";
        btn.disabled = true;
      }
      return btn;
    }

    const prevBtn = createPageButton("Previous", currentPage === 1);
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        updateTableByPage();
      }
    });
    paginationContainer.appendChild(prevBtn);

    let startPage = Math.max(1, currentPage - 4);
    let endPage = Math.min(totalPages, startPage + 9);
    if (endPage - startPage < 9) {
      startPage = Math.max(1, endPage - 9);
    }

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = createPageButton(i, false, i === currentPage);
      if (i !== currentPage) {
        pageBtn.addEventListener("click", () => {
          currentPage = i;
          updateTableByPage();
        });
      }
      paginationContainer.appendChild(pageBtn);
    }

    const nextBtn = createPageButton("Next", currentPage === totalPages);
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        updateTableByPage();
      }
    });
    paginationContainer.appendChild(nextBtn);
  }

  function createPaginationContainer() {
    const container = document.createElement("div");
    container.classList.add("pagination-container");
    container.style.marginTop = "10px";
    container.style.textAlign = "center";
    container.style.paddingBottom = "50px";
    if (tableContainer) {
      tableContainer.parentNode.insertBefore(container, tableContainer.nextSibling);
    }
    return container;
  }

  // --- Update Table with Pagination ---
  function updateTableByPage() {
    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = currentPage * rowsPerPage;
    renderTableBody(currentFilteredData.slice(startIdx, endIdx));
    renderPaginationControls();
    updateDataCount();
  }

  function updateDataCount() {
    if (!dataCountElement) return;
    const rowCount = currentFilteredData.length;
    const colCount = 11;
    dataCountElement.textContent =
      rowCount > 0
        ? `Displaying ${Math.min(rowCount, rowsPerPage)} rows on page ${currentPage} of ${Math.ceil(rowCount / rowsPerPage)}, total ${rowCount} rows and ${colCount} columns`
        : "No data to display";
  }

  // You can add any filter logic here if needed (reuse your existing one)

  // --- Initial load ---
  fetchHistoryData();
});
