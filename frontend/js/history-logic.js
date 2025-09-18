const userRole = sessionStorage.getItem('userRole') || 'admin';

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const tableLoading = document.getElementById("table-loading");
  const tableContainer = document.getElementById("table-container");
  const tableHead = document.querySelector("#history-table thead tr");
  const tableBody = document.querySelector("#history-table tbody");
  const exportBtn = document.getElementById("export-btn");
  const dataCountElement = document.getElementById("data-count");
  const filterStartDateInput = document.getElementById("filter-start-date");
  const filterEndDateInput = document.getElementById("filter-end-date");
  const applyFilterBtn = document.getElementById("apply-filter-btn");

  // --- State ---
  let fullHistoryData = [];
  let currentFilteredData = [];
  let currentPage = 1;
  const rowsPerPage = 1000;

  // Initialize filters from sessionStorage or defaults
  function initFilters() {
    const start = sessionStorage.getItem("startDateISO") || "2025-01-01";
    const end = sessionStorage.getItem("endDateISO") || new Date().toISOString().slice(0, 10);
    filterStartDateInput.value = start;
    filterEndDateInput.value = end;
    return { startDate: start, endDate: end };
  }

  // --- Fetch history data with filter ---
  async function fetchHistoryData(startDate, endDate) {
    if (tableLoading) {
      tableLoading.textContent = `Loading history from ${startDate} to ${endDate}...`;
      tableLoading.style.display = "";
    }
    try {
     const response = await fetch(`${API_BASE}/api/get-history-range`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      startDate,
      endDate,
      userRole  // Pass the userRole here
    }
      );
      if (!response.ok) throw new Error("Failed to fetch history data");
      const json = await response.json();
      fullHistoryData = json.data || [];
      currentFilteredData = fullHistoryData;
      currentPage = 1;
      renderTableHeaders();
      updateTableByPage();
      if (tableLoading) tableLoading.style.display = "none";
      if (tableContainer) tableContainer.style.display = "block";
    } catch (error) {
      if (tableLoading) {
        tableLoading.textContent = `Error loading history: ${error.message}`;
        tableLoading.style.display = "";
      }
      if (tableContainer) tableContainer.style.display = "none";
    }
  }

  // --- Table headers and data keys ---
  const headers = [
    "Marketid", "Company", "Itmdesc", "Cost", "Total Stock",
    "Original Recommended Qty", "Order Qty", "Total Cost",
    "Recommended Shipping", "Approved By", "Approved At",
  ];
  const dataKeys = [
    "marketid", "company", "itmdesc", "cost", "total_stock",
    "original_recommended_qty", "order_qty", "total_cost",
    "recommended_shipping", "approved_by", "approved_at",
  ];

  // --- Render table headers ---
  function renderTableHeaders() {
    if (!tableHead) return;
    tableHead.innerHTML = "";
    headers.forEach(header => {
      const th = document.createElement("th");
      th.className = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
      th.textContent = header;
      tableHead.appendChild(th);
    });
  }

  // --- Render table body ---
  function renderTableBody(data) {
    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (!data.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = headers.length;
      td.className = "text-center py-8 text-gray-500";
      td.textContent = "No records match the current filters.";
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    data.forEach(row => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50";

      dataKeys.forEach(key => {
        const td = document.createElement("td");
        td.className = "px-6 py-4 whitespace-nowrap text-sm text-gray-800";

        let val = row[key];
        if (key === "approved_at" && val) {
          val = new Date(val).toLocaleString();
        }
        td.textContent = val !== null && val !== undefined ? val : "";
        tr.appendChild(td);
      });

      tableBody.appendChild(tr);
    });
  }

  // --- Pagination helpers ---
  function createPaginationContainer() {
    const container = document.createElement("div");
    container.className = "pagination-container";
    container.style.marginTop = "10px";
    container.style.textAlign = "center";
    container.style.paddingBottom = "50px";
    if (tableContainer) {
      tableContainer.parentNode.insertBefore(container, tableContainer.nextSibling);
    }
    return container;
  }

  function renderPaginationControls() {
    const container = document.querySelector(".pagination-container") || createPaginationContainer();
    container.innerHTML = "";
    const totalPages = Math.ceil(currentFilteredData.length / rowsPerPage);
    if (totalPages <= 1) return;

    function createPageButton(text, disabled, isCurrent = false) {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.disabled = disabled;
      btn.className = isCurrent
        ? "mx-1 px-3 py-1 rounded border text-sm font-bold bg-blue-600 text-white border-blue-700 shadow"
        : "mx-1 px-3 py-1 rounded border text-sm font-semibold bg-white text-gray-700 hover:bg-blue-600 hover:text-white border-gray-300";

      if (disabled) {
        btn.className = "mx-1 px-3 py-1 rounded border text-sm font-semibold bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300";
      }
      return btn;
    }

    // Previous
    const prevBtn = createPageButton("Previous", currentPage === 1);
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        updateTableByPage();
      }
    });
    container.appendChild(prevBtn);

    // Page Numbers
    let startPage = Math.max(1, currentPage - 4);
    let endPage = Math.min(totalPages, startPage + 9);
    if (endPage - startPage < 9) startPage = Math.max(1, endPage - 9);

    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = createPageButton(i, false, i === currentPage);
      if (i !== currentPage) {
        pageBtn.addEventListener("click", () => {
          currentPage = i;
          updateTableByPage();
        });
      }
      container.appendChild(pageBtn);
    }

    // Next
    const nextBtn = createPageButton("Next", currentPage === totalPages);
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        updateTableByPage();
      }
    });
    container.appendChild(nextBtn);
  }

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
    const colCount = headers.length;
    dataCountElement.textContent = rowCount > 0
      ? `Displaying ${Math.min(rowCount, rowsPerPage)} rows on page ${currentPage} of ${Math.ceil(rowCount / rowsPerPage)}, total ${rowCount} rows and ${colCount} columns`
      : "No data to display";
  }

  // --- Export to Excel ---
  function exportToExcel() {
    if (!currentFilteredData.length) {
      alert("No data to export.");
      return;
    }
    const worksheetData = currentFilteredData.map(item => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = item[dataKeys[i]] || "";
      });
      return obj;
    });
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "History");
    XLSX.writeFile(workbook, "Approval_History.xlsx");
  }

  // --- Initialize filters and fetch data ---
  const filters = initFilters();
  fetchHistoryData(filters.startDate, filters.endDate);

  // --- Event listeners ---
  applyFilterBtn.addEventListener("click", () => {
    const startDate = filterStartDateInput.value;
    const endDate = filterEndDateInput.value;
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }
    // Save to session and fetch new data
    sessionStorage.setItem("startDateISO", startDate);
    sessionStorage.setItem("endDateISO", endDate);
    fetchHistoryData(startDate, endDate);
  });

  if (exportBtn) {
    exportBtn.addEventListener("click", exportToExcel);
  }

  function initFilters() {
    const start = sessionStorage.getItem("startDateISO") || "2025-01-01";
    const end = sessionStorage.getItem("endDateISO") || new Date().toISOString().slice(0, 10);
    filterStartDateInput.value = start;
    filterEndDateInput.value = end;
    return { startDate: start, endDate: end };
  }
});


