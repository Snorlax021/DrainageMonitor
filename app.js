const statusPill = document.getElementById("statusPill");
const lastUpdate = document.getElementById("lastUpdate");
const alertBannerText = document.getElementById("alertBannerText");
const locationSwitcher = document.getElementById("locationSwitcher");
const exportCsvButton = document.getElementById("exportCsv");
const themeToggle = document.getElementById("themeToggle");
const unitGrid = document.getElementById("unitGrid");
const waterKpiMeters = document.getElementById("waterKpiMeters");
const waterKpiPercent = document.getElementById("waterKpiPercent");
const trashKpiKg = document.getElementById("trashKpiKg");
const trashKpiPercent = document.getElementById("trashKpiPercent");
const alertsKpiCount = document.getElementById("alertsKpiCount");
const statusMode = document.getElementById("statusMode");
const statusText = document.getElementById("statusText");
const statusAction = document.getElementById("statusAction");
const alertsList = document.getElementById("alertsList");
const alertBanner = document.getElementById("alertBanner");
const alertDismiss = document.getElementById("alertDismiss");
const notesList = document.getElementById("notesList");
const noteForm = document.getElementById("noteForm");
const noteInput = document.getElementById("noteInput");
const maintenanceList = document.getElementById("maintenanceList");
const maintenanceForm = document.getElementById("maintenanceForm");
const maintenanceTitle = document.getElementById("maintenanceTitle");
const maintenanceDate = document.getElementById("maintenanceDate");
const comparisonMetric = document.getElementById("comparisonMetric");
const comparisonWindow = document.getElementById("comparisonWindow");
const comparisonChartCanvas = document.getElementById("comparisonChart");
const fillEstimate = document.getElementById("fillEstimate");
const fillRate = document.getElementById("fillRate");
const tasksList = document.getElementById("tasksList");
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskAssignee = document.getElementById("taskAssignee");
const taskDue = document.getElementById("taskDue");
const photoGallery = document.getElementById("photoGallery");
const photoForm = document.getElementById("photoForm");
const photoFile = document.getElementById("photoFile");
const costsList = document.getElementById("costsList");
const costForm = document.getElementById("costForm");
const costItem = document.getElementById("costItem");
const costAmount = document.getElementById("costAmount");
const costDate = document.getElementById("costDate");
const notifySms = document.getElementById("notifySms");
const notifyEmail = document.getElementById("notifyEmail");
const qrImage = document.getElementById("qrImage");

let activeLocationId = localStorage.getItem("locationId") || "loc-1";
let latestPayload = null;
let lastAlertToneAt = 0;
let comparisonChart = null;
let historyChart = null;

const fallbackPayload = {
  thresholds: {
    waterLevelHigh: 75,
    waterLevelCritical: 90,
    trashWeightHigh: 7.5,
    trashWeightCritical: 9,
    trashCapacity: 10,
    maxWaterMeters: 3
  },
  state: {
    updatedAt: new Date().toISOString(),
    status: "Active",
    lastAction: "Idle",
    locations: []
  },
  location: {
    id: "loc-1",
    name: "North Gate",
    alerts: [],
    units: [
      {
        id: "unit-1",
        name: "Drainage 1",
        waterLevel: 38,
        waterLevelMeters: 1.1,
        trashWeightKg: 6.1,
        status: "Active"
      },
      {
        id: "unit-2",
        name: "Drainage 2",
        waterLevel: 42,
        waterLevelMeters: 1.3,
        trashWeightKg: 3.6,
        status: "Active"
      },
      {
        id: "unit-3",
        name: "Drainage 3",
        waterLevel: 28,
        waterLevelMeters: 0.8,
        trashWeightKg: 2.1,
        status: "Idle"
      }
    ]
  },
  locations: [
    { id: "loc-1", name: "North Gate", status: "Active", alertCount: 0 }
  ],
  notes: [],
  maintenance: []
};

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function formatMeters(value) {
  return `${value.toFixed(1)}m`;
}

function formatKg(value) {
  return `${value.toFixed(1)}kg`;
}

function setRing(ringEl, value) {
  ringEl.style.setProperty("--value", value);
}

function setStatusPill(status) {
  if (status === "Active") {
    statusPill.textContent = "Operational";
    statusPill.style.background = "#1a3d2b";
    statusPill.style.color = "#f7fbf8";
  } else if (status === "Idle") {
    statusPill.textContent = "Idle";
    statusPill.style.background = "#e5ece8";
    statusPill.style.color = "#4c5f55";
  } else {
    statusPill.textContent = "Maintenance";
    statusPill.style.background = "#fff2da";
    statusPill.style.color = "#8a5a12";
  }
}

function renderAlerts(alerts) {
  alertsList.innerHTML = "";

  if (!alerts.length) {
    const item = document.createElement("li");
    item.className = "alert dashed";
    item.textContent = "No further alerts.";
    alertsList.appendChild(item);
    return;
  }

  alerts.forEach((alert) => {
    const item = document.createElement("li");
    const levelClass = alert.level === "critical" ? "critical" : "warning";
    item.className = `alert ${levelClass}`;
    item.textContent = alert.message;
    alertsList.appendChild(item);
  });
}

async function fetchStatus() {
  const res = await fetch(`/api/status?locationId=${activeLocationId}`);
  return res.json();
}

async function sendControl(action) {
  const res = await fetch("/api/control", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ action, locationId: activeLocationId })
  });

  return res.json();
}

async function addNote(text) {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ locationId: activeLocationId, text })
  });
  return res.json();
}

async function addMaintenance(title, date) {
  const res = await fetch("/api/maintenance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ locationId: activeLocationId, title, date })
  });
  return res.json();
}

async function fetchTasks() {
  const res = await fetch(`/api/tasks?locationId=${activeLocationId}`);
  return res.json();
}

async function addTask(title, assignee, due) {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ locationId: activeLocationId, title, assignee, due })
  });
  return res.json();
}

async function fetchPhotos() {
  const res = await fetch(`/api/photos?locationId=${activeLocationId}`);
  return res.json();
}

async function uploadPhoto(file) {
  const form = new FormData();
  form.append("photo", file);
  form.append("locationId", activeLocationId);
  const res = await fetch("/api/photos", {
    method: "POST",
    body: form
  });
  return res.json();
}

async function fetchCosts() {
  const res = await fetch(`/api/costs?locationId=${activeLocationId}`);
  return res.json();
}

async function addCost(item, amount, date) {
  const res = await fetch("/api/costs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ locationId: activeLocationId, item, amount, date })
  });
  return res.json();
}

async function sendNotification(channel, message) {
  const res = await fetch("/api/notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ channel, message })
  });
  return res.json();
}

function renderNotes(notes) {
  if (!notesList) {
    return;
  }
  notesList.innerHTML = "";
  if (!notes.length) {
    const empty = document.createElement("div");
    empty.className = "note-item";
    empty.textContent = "No notes yet.";
    notesList.appendChild(empty);
    return;
  }

  notes.slice(0, 4).forEach((note) => {
    const item = document.createElement("div");
    item.className = "note-item";
    item.innerHTML = `<div class="note-meta">${new Date(note.createdAt).toLocaleString()}</div>${note.text}`;
    notesList.appendChild(item);
  });
}

function renderTasks(tasks) {
  if (!tasksList) {
    return;
  }
  tasksList.innerHTML = "";
  if (!tasks.length) {
    const empty = document.createElement("div");
    empty.className = "task-item";
    empty.textContent = "No tasks yet.";
    tasksList.appendChild(empty);
    return;
  }

  tasks.slice(0, 4).forEach((task) => {
    const item = document.createElement("div");
    item.className = "task-item";
    item.innerHTML = `
      <div class="note-meta">${task.due || "No due date"} · ${task.status}</div>
      <strong>${task.title}</strong><br />
      <span>${task.assignee || "Unassigned"}</span>
    `;
    tasksList.appendChild(item);
  });
}

function renderPhotos(photos) {
  if (!photoGallery) {
    return;
  }
  photoGallery.innerHTML = "";
  if (!photos.length) {
    const empty = document.createElement("div");
    empty.className = "photo-item";
    empty.textContent = "No photos uploaded.";
    photoGallery.appendChild(empty);
    return;
  }
  photos.slice(0, 4).forEach((photo) => {
    const item = document.createElement("div");
    item.className = "photo-item";
    item.innerHTML = `<img src="${photo.url}" alt="${photo.name}" />`;
    photoGallery.appendChild(item);
  });
}

function renderCosts(costs) {
  if (!costsList) {
    return;
  }
  costsList.innerHTML = "";
  if (!costs.length) {
    const empty = document.createElement("div");
    empty.className = "cost-item";
    empty.textContent = "No costs logged.";
    costsList.appendChild(empty);
    return;
  }
  costs.slice(0, 4).forEach((cost) => {
    const item = document.createElement("div");
    item.className = "cost-item";
    item.innerHTML = `<div class="note-meta">${cost.date}</div>${cost.item} - $${cost.amount}`;
    costsList.appendChild(item);
  });
}

function renderMaintenance(items) {
  if (!maintenanceList) {
    return;
  }
  maintenanceList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "maintenance-item";
    empty.textContent = "No maintenance scheduled.";
    maintenanceList.appendChild(empty);
    return;
  }

  items.slice(0, 4).forEach((item) => {
    const entry = document.createElement("div");
    entry.className = "maintenance-item";
    entry.innerHTML = `<div class="maintenance-meta">${item.date} · ${item.status}</div>${item.title}`;
    maintenanceList.appendChild(entry);
  });
}

function renderLocations(locations) {
  if (!locationSwitcher) {
    return;
  }
  locationSwitcher.innerHTML = "";
  locations.forEach((location) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `location-btn ${location.id === activeLocationId ? "active" : ""}`;
    button.textContent = `${location.name} (${location.alertCount})`;
    button.addEventListener("click", () => {
      activeLocationId = location.id;
      localStorage.setItem("locationId", activeLocationId);
      refresh();
      loadPhase3Data();
    });
    locationSwitcher.appendChild(button);
  });
}

function renderUnits(units, thresholds, capacity) {
  if (!unitGrid) {
    return;
  }
  unitGrid.innerHTML = "";
  units.forEach((unit) => {
    const trashPercent = (unit.trashWeightKg / capacity) * 100;
    const card = document.createElement("article");
    const severityClass =
      unit.waterLevel >= thresholds.waterLevelCritical || unit.trashWeightKg >= thresholds.trashWeightCritical
        ? "severity-critical"
        : unit.waterLevel >= thresholds.waterLevelHigh || unit.trashWeightKg >= thresholds.trashWeightHigh
          ? "severity-warning"
          : "";

    card.className = `unit-card ${severityClass}`.trim();
    card.innerHTML = `
      <div class="unit-head">
        <span class="unit-name">${unit.name}</span>
        <span class="unit-status">${unit.status}</span>
      </div>
      <div class="unit-rings">
        <div class="ring small blue" style="--value: ${unit.waterLevel}">
          <div class="ring-inner">
            <span class="ring-metric">${formatMeters(unit.waterLevelMeters)}</span>
            <span class="ring-percent">${formatPercent(unit.waterLevel)}</span>
          </div>
        </div>
        <div class="ring small orange" style="--value: ${trashPercent}">
          <div class="ring-inner">
            <span class="ring-metric">${formatKg(unit.trashWeightKg)}</span>
            <span class="ring-percent">${formatPercent(trashPercent)}</span>
          </div>
        </div>
      </div>
    `;
    unitGrid.appendChild(card);
  });
}

function playAlertTone() {
  const now = Date.now();
  if (now - lastAlertToneAt < 15000) {
    return;
  }
  lastAlertToneAt = now;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 440;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  } catch (error) {
    console.warn("Audio not available", error);
  }
}



function updatePredictive(trashKgAvg, capacity) {
  if (!fillEstimate || !fillRate) {
    return;
  }
  const rate = 0.3;
  const target = capacity * 0.9;
  const hours = Math.max(0, (target - trashKgAvg) / rate);
  fillRate.textContent = `${rate.toFixed(1)} kg/hr`;
  fillEstimate.textContent = `${hours.toFixed(1)} hrs`;
}



function initComparisonChart() {
  if (!comparisonChartCanvas || !window.Chart) {
    return;
  }
  const ctx = comparisonChartCanvas.getContext("2d");
  comparisonChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          label: "This period",
          data: [1.6, 1.9, 2.1, 1.8, 2.2, 1.7, 1.9],
          borderColor: "#2f80ed",
          backgroundColor: "rgba(47, 128, 237, 0.12)",
          fill: true,
          tension: 0.35
        },
        {
          label: "Previous period",
          data: [1.4, 1.7, 1.9, 1.6, 2.0, 1.5, 1.6],
          borderColor: "#9aa9a0",
          backgroundColor: "rgba(154, 169, 160, 0.1)",
          fill: true,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#4a6156",
            usePointStyle: true
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#6b7f74" }
        },
        y: {
          grid: { color: "rgba(26, 61, 43, 0.08)" },
          ticks: { color: "#6b7f74" }
        }
      }
    }
  });
}

function updateComparisonChart() {
  if (!comparisonChart || !comparisonMetric || !comparisonWindow) {
    return;
  }
  const metric = comparisonMetric.value;
  const windowMode = comparisonWindow.value;
  const labels = windowMode === "week" ? ["W1", "W2", "W3", "W4"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const thisData = metric === "water" ? [1.6, 1.9, 2.1, 1.8, 2.2, 1.7, 1.9] : [2.1, 2.6, 3.2, 3.8, 4.4, 5.1, 5.6];
  const prevData = metric === "water" ? [1.4, 1.7, 1.9, 1.6, 2.0, 1.5, 1.6] : [1.8, 2.2, 2.8, 3.3, 4.0, 4.5, 4.9];
  const weekThis = metric === "water" ? [1.7, 2.0, 1.8, 2.1] : [3.2, 3.9, 4.3, 5.0];
  const weekPrev = metric === "water" ? [1.5, 1.8, 1.7, 1.9] : [2.9, 3.4, 3.8, 4.2];

  comparisonChart.data.labels = labels;
  comparisonChart.data.datasets[0].data = windowMode === "week" ? weekThis : thisData;
  comparisonChart.data.datasets[1].data = windowMode === "week" ? weekPrev : prevData;
  comparisonChart.update();
}

function applyChartTheme() {
  const styles = getComputedStyle(document.documentElement);
  const textColor = styles.getPropertyValue("--muted").trim() || "#6b7f74";
  const inkColor = styles.getPropertyValue("--ink").trim() || "#16231c";
  const gridColor = document.documentElement.getAttribute("data-theme") === "dark"
    ? "rgba(236, 243, 239, 0.14)"
    : "rgba(26, 61, 43, 0.08)";

  if (comparisonChart) {
    comparisonChart.options.plugins.legend.labels.color = textColor;
    comparisonChart.options.scales.x.ticks.color = textColor;
    comparisonChart.options.scales.y.ticks.color = textColor;
    comparisonChart.options.scales.y.grid.color = gridColor;
    comparisonChart.update("none");
  }

  if (historyChart) {
    historyChart.options.plugins.legend.labels.color = textColor;
    historyChart.options.plugins.tooltip.backgroundColor = inkColor;
    historyChart.options.plugins.tooltip.titleColor = "#e8f0eb";
    historyChart.options.plugins.tooltip.bodyColor = "#e8f0eb";
    historyChart.options.scales.x.ticks.color = textColor;
    historyChart.options.scales.y.ticks.color = textColor;
    historyChart.options.scales.y.grid.color = gridColor;
    historyChart.update("none");
  }
}

function updateUI(payload) {
  const { state, thresholds, location, locations, notes, maintenance } = payload;
  const capacity = thresholds?.trashCapacity || 10;

  lastUpdate.textContent = new Date(state.updatedAt).toLocaleString();
  setStatusPill(state.status);
  statusMode.textContent = state.status;
  statusText.textContent = state.status === "Active" ? "Sensors On" : "Sensors Off";
  statusAction.textContent = state.lastAction || "Idle";
  const locationList = locations || state.locations || [];
  renderLocations(locationList);
  renderNotes(notes || []);
  renderMaintenance(maintenance || []);

  const units =
    location?.units ||
    state.units ||
    state.locations?.[0]?.units ||
    [];
  const waterAvg = units.reduce((sum, unit) => sum + unit.waterLevel, 0) / Math.max(units.length, 1);
  const waterMetersAvg =
    units.reduce((sum, unit) => sum + unit.waterLevelMeters, 0) / Math.max(units.length, 1);
  const trashKgAvg =
    units.reduce((sum, unit) => sum + unit.trashWeightKg, 0) / Math.max(units.length, 1);
  const trashPercentAvg = (trashKgAvg / capacity) * 100;

  waterKpiMeters.textContent = formatMeters(waterMetersAvg || 0);
  waterKpiPercent.textContent = formatPercent(waterAvg || 0);
  trashKpiKg.textContent = formatKg(trashKgAvg || 0);
  trashKpiPercent.textContent = formatPercent(trashPercentAvg || 0);
  updatePredictive(trashKgAvg, capacity);

  renderUnits(units, thresholds, capacity);

  const locationAlerts = location?.alerts || [];
  alertsKpiCount.textContent = `${locationAlerts.length} warning${locationAlerts.length === 1 ? "" : "s"}`;
  renderAlerts(locationAlerts);

  if (alertBanner && alertBannerText) {
    if (location?.alerts?.length) {
      alertBannerText.textContent = location.alerts[0].message;
      alertBanner.style.display = "flex";
    } else {
      alertBanner.style.display = "none";
    }
  }

  const hasCritical = location?.alerts?.some((alert) => alert.level === "critical");
  document.body.classList.toggle("critical-flash", Boolean(hasCritical));
  if (hasCritical) {
    playAlertTone();
  }
}

async function refresh() {
  try {
    const payload = await fetchStatus();
    latestPayload = payload;
    updateUI(payload);
  } catch (error) {
    console.error("Failed to fetch status", error);
    if (!latestPayload) {
      updateUI(fallbackPayload);
    }
  }
}

const buttons = document.querySelectorAll("button[data-action]");
buttons.forEach((button) => {
  button.addEventListener("click", async () => {
    const action = button.dataset.action;
    button.disabled = true;
    button.textContent = "Processing...";

    try {
      const payload = await sendControl(action);
      if (payload.ok) {
        updateUI({ state: payload.state });
      }
    } catch (error) {
      console.error("Failed to send control", error);
    } finally {
      button.disabled = false;
      button.textContent = action === "reset" ? "Reset system" : "Manual trash collection";
    }
  });
});

if (alertDismiss && alertBanner) {
  alertDismiss.addEventListener("click", () => {
    alertBanner.style.display = "none";
  });
}

if (noteForm) {
  noteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = noteInput.value.trim();
    if (!text) {
      return;
    }
    const response = await addNote(text);
    if (response.ok) {
      renderNotes(response.notes || []);
      noteInput.value = "";
    }
  });
}

if (maintenanceForm) {
  maintenanceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = maintenanceTitle.value.trim();
    const date = maintenanceDate.value;
    if (!title || !date) {
      return;
    }
    const response = await addMaintenance(title, date);
    if (response.ok) {
      renderMaintenance(response.items || []);
      maintenanceTitle.value = "";
      maintenanceDate.value = "";
    }
  });
}

if (taskForm) {
  taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = taskTitle.value.trim();
    if (!title) {
      return;
    }
    const response = await addTask(title, taskAssignee.value.trim(), taskDue.value);
    if (response.ok) {
      renderTasks(response.tasks || []);
      taskTitle.value = "";
      taskAssignee.value = "";
      taskDue.value = "";
    }
  });
}

if (photoForm) {
  photoForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!photoFile.files.length) {
      return;
    }
    const response = await uploadPhoto(photoFile.files[0]);
    if (response.ok) {
      renderPhotos(response.photos || []);
      photoFile.value = "";
    }
  });
}

if (costForm) {
  costForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const item = costItem.value.trim();
    const amount = Number(costAmount.value);
    if (!item || !Number.isFinite(amount)) {
      return;
    }
    const response = await addCost(item, amount, costDate.value);
    if (response.ok) {
      renderCosts(response.costs || []);
      costItem.value = "";
      costAmount.value = "";
      costDate.value = "";
    }
  });
}

if (notifySms) {
  notifySms.addEventListener("click", async () => {
    await sendNotification("sms", "Smart Drainage Monitor test alert.");
  });
}

if (notifyEmail) {
  notifyEmail.addEventListener("click", async () => {
    await sendNotification("email", "Smart Drainage Monitor email test alert.");
  });
}

if (exportCsvButton) {
  exportCsvButton.addEventListener("click", () => {
    if (!latestPayload?.location) {
      return;
    }
    const rows = [
      ["Location", latestPayload.location.name],
      ["Unit", "Water Level (%)", "Water (m)", "Trash (kg)", "Status"],
      ...latestPayload.location.units.map((unit) => [
        unit.name,
        unit.waterLevel,
        unit.waterLevelMeters,
        unit.trashWeightKg,
        unit.status
      ])
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${latestPayload.location.name}-drainage.csv`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

if (themeToggle) {
  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    applyChartTheme();
  };
  const storedTheme = localStorage.getItem("theme") || "light";
  applyTheme(storedTheme);
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  });
}

if (comparisonMetric && comparisonWindow) {
  comparisonMetric.addEventListener("change", updateComparisonChart);
  comparisonWindow.addEventListener("change", updateComparisonChart);
}

const chartCanvas = document.getElementById("historyChart");
if (chartCanvas && window.Chart) {
  const ctx = chartCanvas.getContext("2d");
  historyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
      datasets: [
        {
          label: "Water Level",
          data: [1.8, 1.9, 2.5, 2.3, 2.1, 1.9],
          borderColor: "#2f80ed",
          backgroundColor: "rgba(47, 128, 237, 0.18)",
          fill: true,
          tension: 0.35
        },
        {
          label: "Trash Weight",
          data: [1.2, 1.8, 2.5, 3.2, 4.7, 6.1],
          borderColor: "#f4a261",
          backgroundColor: "rgba(244, 162, 97, 0.2)",
          borderDash: [6, 4],
          fill: true,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#4a6156",
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: "#1a3d2b",
          titleColor: "#e8f0eb",
          bodyColor: "#e8f0eb",
          padding: 10
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: "#6b7f74"
          }
        },
        y: {
          grid: {
            color: "rgba(26, 61, 43, 0.08)"
          },
          ticks: {
            color: "#6b7f74"
          }
        }
      }
    }
  });
}

initComparisonChart();
updateComparisonChart();
applyChartTheme();

refresh();
setInterval(refresh, 4000);

async function loadPhase3Data() {
  try {
    const [tasks, photos, costs] = await Promise.all([fetchTasks(), fetchPhotos(), fetchCosts()]);
    if (tasks.ok) {
      renderTasks(tasks.tasks || []);
    }
    if (photos.ok) {
      renderPhotos(photos.photos || []);
    }
    if (costs.ok) {
      renderCosts(costs.costs || []);
    }
  } catch (error) {
    console.error("Failed to load phase 3 data", error);
  }
}

if (qrImage) {
  const qrUrl = encodeURIComponent(window.location.href);
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrUrl}`;
}

loadPhase3Data();

// Quick Access button navigation
document.querySelectorAll(".btn-quick").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sectionId = btn.dataset.section;
    if (!sectionId) {
      return;
    }

    const target = document.getElementById(sectionId);
    if (!target) {
      console.warn(`Quick access target not found: ${sectionId}`);
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.style.outline = "2px solid #1a3d2b";
    target.style.outlineOffset = "4px";
    setTimeout(() => {
      target.style.outline = "none";
    }, 1800);
  });
});
