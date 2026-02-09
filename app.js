const form = document.getElementById("lookup-form");
const statusEl = document.getElementById("status");
const table = document.getElementById("results-table");
const downloadBtn = document.getElementById("download-btn");

let latestRows = [];

const toTitle = (value) =>
  value
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());

const setStatus = (message, isError = false) => {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b91c1c" : "";
};

const buildTable = (rows) => {
  table.innerHTML = "";
  if (rows.length === 0) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = toTitle(header);
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    headers.forEach((header) => {
      const td = document.createElement("td");
      td.textContent = row[header] ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
};

const normalizeData = (payload) => {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (typeof payload === "object") {
    return [payload];
  }
  return [{ value: payload }];
};

const toCsv = (rows) => {
  if (rows.length === 0) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const escapeCell = (value) => {
    const stringValue = String(value ?? "");
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCell(row[header])).join(","));
  });
  return lines.join("\n");
};

const downloadCsv = () => {
  const csv = toCsv(latestRows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `shipping-bill-status-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const buildRequest = (method, apiUrl, payload) => {
  if (method === "GET") {
    const url = new URL(apiUrl);
    Object.entries(payload).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
    return { url: url.toString(), options: { method: "GET" } };
  }

  return {
    url: apiUrl,
    options: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  };
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  downloadBtn.disabled = true;
  latestRows = [];
  buildTable([]);

  const apiUrl = document.getElementById("api-url").value.trim();
  const sbNumber = document.getElementById("sb-number").value.trim();
  const sbDate = document.getElementById("sb-date").value;
  const portCode = document.getElementById("port-code").value.trim();
  const method = document.getElementById("http-method").value;

  if (!apiUrl) {
    setStatus("Please provide the API URL.", true);
    return;
  }

  const payload = {
    sbNumber,
    sbDate,
    portCode,
  };

  const { url, options } = buildRequest(method, apiUrl, payload);

  try {
    setStatus("Fetching shipping bill status...");
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    latestRows = normalizeData(data);
    buildTable(latestRows);
    downloadBtn.disabled = latestRows.length === 0;
    setStatus(`Received ${latestRows.length} record(s).`);
  } catch (error) {
    setStatus(error.message, true);
  }
});

downloadBtn.addEventListener("click", downloadCsv);
