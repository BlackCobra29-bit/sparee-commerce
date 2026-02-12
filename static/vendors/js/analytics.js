// ========= CanvasJS (4 charts) =========

const rangeSelect = document.getElementById("range");

// Generate demo data by range
function makeRevenueSeries(days) {
  const points = [];
  const now = new Date();
  let base = 420;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);

    // Fake seasonality + random
    const wave = Math.sin((days - i) / 6) * 60;
    const noise = (Math.random() - 0.5) * 80;
    base += (Math.random() - 0.45) * 10;

    points.push({ x: d, y: Math.max(120, Math.round(base + wave + noise)) });
  }
  return points;
}

// --- Chart 1: Revenue Trend (Line) ---
const chartRevenue = new CanvasJS.Chart("chartRevenue", {
  animationEnabled: true,
  exportEnabled: false,
  backgroundColor: "transparent",
  title: { text: "" },
  axisX: {
    valueFormatString: "DD MMM",
    labelFontSize: 11,
  },
  axisY: {
    prefix: "$",
    labelFontSize: 11,
  },
  toolTip: { shared: true },
  data: [
    {
      type: "splineArea",
      xValueFormatString: "DD MMM YYYY",
      yValueFormatString: "$#,###",
      dataPoints: makeRevenueSeries(parseInt(rangeSelect.value, 10)),
    },
  ],
});

// --- Chart 2: Orders by Status (Doughnut) ---
const chartOrderStatus = new CanvasJS.Chart("chartOrderStatus", {
  animationEnabled: true,
  exportEnabled: false,
  backgroundColor: "transparent",
  title: { text: "" },
  legend: { verticalAlign: "bottom", horizontalAlign: "center", fontSize: 12 },
  data: [
    {
      type: "doughnut",
      showInLegend: true,
      legendText: "{name}",
      indexLabel: "{name} - {y}",
      yValueFormatString: "#,###",
      dataPoints: [
        { y: 312, name: "Delivered" },
        { y: 86, name: "Processing" },
        { y: 54, name: "Cancelled" },
        { y: 30, name: "Returned" },
      ],
    },
  ],
});

// --- Chart 3: Top Products (Bar) ---
const chartTopProducts = new CanvasJS.Chart("chartTopProducts", {
  animationEnabled: true,
  exportEnabled: false,
  backgroundColor: "transparent",
  title: { text: "" },
  axisX: { labelFontSize: 11 },
  axisY: { labelFontSize: 11 },
  data: [
    {
      type: "bar",
      yValueFormatString: "#,### units",
      dataPoints: [
        { label: "Brake Pads", y: 212 },
        { label: "Spark Plug", y: 164 },
        { label: "Shock Absorber", y: 62 },
        { label: "Oil Filter", y: 44 },
        { label: "Air Filter", y: 38 },
      ],
    },
  ],
});

// --- Chart 4: Funnel (Traffic -> Purchase) ---
const chartFunnel = new CanvasJS.Chart("chartFunnel", {
  animationEnabled: true,
  exportEnabled: false,
  backgroundColor: "transparent",
  title: { text: "" },
  data: [
    {
      type: "funnel",
      indexLabel: "{label} - {y}",
      toolTipContent: "<b>{label}</b>: {y}",
      dataPoints: [
        { y: 12000, label: "Visitors" },
        { y: 3400, label: "Product Views" },
        { y: 980, label: "Add to Cart" },
        { y: 620, label: "Checkout Started" },
        { y: 482, label: "Purchased" },
      ],
    },
  ],
});

function renderAll() {
  chartRevenue.render();
  chartOrderStatus.render();
  chartTopProducts.render();
  chartFunnel.render();
}

// Update revenue chart when range changes
rangeSelect.addEventListener("change", () => {
  chartRevenue.options.data[0].dataPoints = makeRevenueSeries(parseInt(rangeSelect.value, 10));
  chartRevenue.render();
});

// Export CSV (table) - only attach if the button exists (we may remove the table in some pages)
(function () {
  const btnExport = document.getElementById("btnExport");
  if (!btnExport) return;
  btnExport.addEventListener("click", () => {
    const table = document.getElementById("perfTable");
    if (!table) return;
    const rows = Array.from(table.querySelectorAll("tr"));
    const csv = rows
      .map((tr) =>
        Array.from(tr.querySelectorAll("th,td"))
          .map((td) => {
            const text = (td.innerText || "").replace(/\s+/g, " ").trim();
            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendor-analytics.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
})();

// First render
renderAll();

// Safe logout fallback
if (typeof logout !== "function") {
  function logout() {
    if (confirm("Sign out from Wahid Spare Hub?")) {
      window.location.href = "logout.html";
    }
  }
}
