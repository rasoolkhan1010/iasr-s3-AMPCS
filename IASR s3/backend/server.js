// server.js (PostgreSQL-backed, returns CSV-style headers & data) — US date aware end-of-day

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// PostgreSQL pool (use env vars in production)
const pool = new Pool({
  user: process.env.PGUSER || "postgres",
  host: process.env.PGHOST || "localhost",
  database: process.env.PGDATABASE || "postgres",
  password: process.env.PGPASSWORD || "admin",
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
});

// Helper to format date to MM/DD/YYYY
function formatDateMMDDYYYY(d) {
  if (!d) return "";
  const dt = new Date(d);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

// CSV-like headers expected by frontend (keeps original column order)
const CSV_HEADERS = [
  "Date","Marketid","custno","company","Item","Status","Itmdesc","In_Stock","In_Transit","Total _Stock",
  "cost","Allocations","W1","W2","W3","30_days","OVERNIGHT","To_Order_Cost_Overnight","2_DAY_SHIP",
  "To_Order_Cost_2DAY","GROUND","To_Order_Cost_GROUND","Recommended Quntitty","Recommended Shipping"
];

// Endpoint: get-data-for-range (POST) - returns { headers, data }
app.post("/api/get-data-for-range", async (req, res) => {
  const { startDate, endDate } = req.body; // ISO strings expected: YYYY-MM-DD
  if (!startDate || !endDate) {
    return res.status(400).json({ message: "Start and end dates are required." });
  }

  try {
    // Make end inclusive by extending to end-of-day
    const start = startDate;              // 'YYYY-MM-DD'
    const end = `${endDate} 23:59:59`;    // include entire end day

    const q = `SELECT * FROM public.inventory_data WHERE date BETWEEN $1 AND $2 ORDER BY date ASC`;
    const result = await pool.query(q, [start, end]);

    if (!result.rows || result.rows.length === 0) {
      return res.json({ headers: CSV_HEADERS, data: [] });
    }

    // Map DB rows (snake_case) -> CSV headers (Exact keys frontend expects)
    const mapped = result.rows.map((r) => {
      return {
        "Date": formatDateMMDDYYYY(r.date),
        "Marketid": r.marketid || "",
        "custno": r.custno || "",
        "company": r.company || "",
        "Item": r.item || "",
        "Status": r.status || "",
        "Itmdesc": r.itmdesc || "",
        "In_Stock": r.in_stock != null ? r.in_stock : 0,
        "In_Transit": r.in_transit != null ? r.in_transit : 0,
        "Total _Stock": r.total_stock != null ? r.total_stock : 0,
        "cost": r.cost != null ? Number(r.cost) : 0,
        "Allocations": r.allocations != null ? r.allocations : 0,
        "W1": r.w1 != null ? r.w1 : 0,
        "W2": r.w2 != null ? r.w2 : 0,
        "W3": r.w3 != null ? r.w3 : 0,
        "30_days": r.days_30 != null ? r.days_30 : 0,
        "OVERNIGHT": r.overnight != null ? r.overnight : 0,
        "To_Order_Cost_Overnight": r.to_order_cost_overnight != null ? Number(r.to_order_cost_overnight) : 0,
        "2_DAY_SHIP": r.two_day_ship != null ? r.two_day_ship : 0,
        "To_Order_Cost_2DAY": r.to_order_cost_2day != null ? Number(r.to_order_cost_2day) : 0,
        "GROUND": r.ground != null ? r.ground : 0,
        "To_Order_Cost_GROUND": r.to_order_cost_ground != null ? Number(r.to_order_cost_ground) : 0,
        "Recommended Quntitty": r.recommended_quantity != null ? String(r.recommended_quantity) : "",
        "Recommended Shipping": r.recommended_shipping != null ? String(r.recommended_shipping) : ""
      };
    });

    res.json({ headers: CSV_HEADERS, data: mapped });
  } catch (err) {
    console.error("DB error:", err);
    res.status(500).json({ message: "Failed to query database." });
  }
});

// Approve endpoint writes to CSV
app.post("/api/approve", (req, res) => {
  const { headers, data } = req.body;
  const csvFilePath = path.join(__dirname, "data", "approved_suggestion.csv");
  const timestamp = new Date().toISOString();
  const headersWithTimestamp = ["Timestamp", ...headers];
  const dataWithTimestamp = [timestamp, ...data];
  const fileExists = fs.existsSync(csvFilePath);
  const csvRow = dataWithTimestamp.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",");
  const contentToAppend = (fileExists ? "\n" : headersWithTimestamp.join(",") + "\n") + csvRow;

  fs.appendFile(csvFilePath, contentToAppend, "utf8", (err) => {
    if (err) return res.status(500).json({ message: "Failed to save approval." });
    res.status(200).json({ message: "Approval saved successfully!" });
  });
});

// Endpoint: get-all-markets (no date filter)
app.get("/api/get-all-markets", async (req, res) => {
  try {
    const q = `SELECT DISTINCT marketid FROM public.inventory_data WHERE marketid IS NOT NULL ORDER BY marketid ASC`;
    const result = await pool.query(q);
    const markets = result.rows.map(r => r.marketid);
    res.json({ data: markets });
  } catch (err) {
    console.error("DB error (get-all-markets):", err);
    res.status(500).json({ message: "Failed to fetch markets." });
  }
});

// simple health check
app.get("/", (req, res) => res.send("OK - server up"));

// start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
