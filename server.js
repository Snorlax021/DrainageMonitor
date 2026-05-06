const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const thresholds = {
  waterLevelHigh: 75,
  waterLevelCritical: 90,
  trashWeightHigh: 7.5,
  trashWeightCritical: 9,
  trashCapacity: 10,
  maxWaterMeters: 3
};

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const notesPath = path.join(dataDir, "notes.json");
const maintenancePath = path.join(dataDir, "maintenance.json");
const tasksPath = path.join(dataDir, "tasks.json");
const photosPath = path.join(dataDir, "photos.json");
const costsPath = path.join(dataDir, "costs.json");

function loadJson(filePath, fallback) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    return fallback;
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const defaultLocations = [
  {
    id: "loc-1",
    name: "North Gate",
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
      }
    ]
  },
  {
    id: "loc-2",
    name: "Main Street",
    units: [
      {
        id: "unit-3",
        name: "Drainage 3",
        waterLevel: 28,
        waterLevelMeters: 0.8,
        trashWeightKg: 2.1,
        status: "Idle"
      },
      {
        id: "unit-4",
        name: "Drainage 4",
        waterLevel: 46,
        waterLevelMeters: 1.4,
        trashWeightKg: 4.2,
        status: "Active"
      }
    ]
  },
  {
    id: "loc-3",
    name: "Riverside",
    units: [
      {
        id: "unit-5",
        name: "Drainage 5",
        waterLevel: 35,
        waterLevelMeters: 1.0,
        trashWeightKg: 5.2,
        status: "Active"
      },
      {
        id: "unit-6",
        name: "Drainage 6",
        waterLevel: 52,
        waterLevelMeters: 1.6,
        trashWeightKg: 7.6,
        status: "Active"
      }
    ]
  }
];

const state = {
  locations: defaultLocations,
  status: "Active",
  alerts: [],
  lastAction: null,
  updatedAt: new Date().toISOString()
};

const notesStore = loadJson(notesPath, {
  "loc-1": [],
  "loc-2": [],
  "loc-3": []
});

const maintenanceStore = loadJson(maintenancePath, {
  "loc-1": [],
  "loc-2": [],
  "loc-3": []
});

const tasksStore = loadJson(tasksPath, {
  "loc-1": [],
  "loc-2": [],
  "loc-3": []
});

const photosStore = loadJson(photosPath, {
  "loc-1": [],
  "loc-2": [],
  "loc-3": []
});

const costsStore = loadJson(costsPath, {
  "loc-1": [],
  "loc-2": [],
  "loc-3": []
});

const upload = multer({
  dest: path.join(__dirname, "uploads")
});

function updateAlerts() {
  const alerts = [];
  const statuses = [];

  state.locations.forEach((location) => {
    const locationAlerts = [];

    location.units.forEach((unit) => {
      if (unit.waterLevel >= thresholds.waterLevelCritical) {
        locationAlerts.push({
          id: `${unit.id}-water-critical`,
          level: "critical",
          message: `${location.name}: ${unit.name} critical water level.`
        });
      } else if (unit.waterLevel >= thresholds.waterLevelHigh) {
        locationAlerts.push({
          id: `${unit.id}-water-high`,
          level: "warning",
          message: `${location.name}: ${unit.name} water level approaching limit.`
        });
      }

      if (unit.trashWeightKg >= thresholds.trashWeightCritical) {
        locationAlerts.push({
          id: `${unit.id}-trash-critical`,
          level: "critical",
          message: `${location.name}: ${unit.name} trash overload detected.`
        });
      } else if (unit.trashWeightKg >= thresholds.trashWeightHigh) {
        locationAlerts.push({
          id: `${unit.id}-trash-high`,
          level: "warning",
          message: `${location.name}: ${unit.name} trash nearing ${thresholds.trashCapacity}kg.`
        });
      }

      if (unit.status === "Maintenance") {
        locationAlerts.push({
          id: `${unit.id}-maintenance`,
          level: "info",
          message: `${location.name}: ${unit.name} in maintenance.`
        });
      }
    });

    location.alerts = locationAlerts;
    alerts.push(...locationAlerts);
    statuses.push(...location.units.map((unit) => unit.status));
  });

  state.alerts = alerts;

  if (statuses.includes("Maintenance")) {
    state.status = "Maintenance";
  } else if (statuses.includes("Active")) {
    state.status = "Active";
  } else {
    state.status = "Idle";
  }
}

updateAlerts();

app.get("/api/status", (req, res) => {
  const locationId = req.query.locationId;
  const location = locationId
    ? state.locations.find((item) => item.id === locationId)
    : state.locations[0];
  const locationNotes = notesStore[location?.id] || [];
  const locationMaintenance = maintenanceStore[location?.id] || [];

  res.json({
    state,
    thresholds,
    location,
    locations: state.locations.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.units.some((unit) => unit.status === "Active") ? "Active" : "Idle",
      alertCount: item.alerts ? item.alerts.length : 0
    })),
    notes: locationNotes,
    maintenance: locationMaintenance
  });
});

app.post("/api/sensor", (req, res) => {
  const { locationId, unitId, waterLevel, waterLevelMeters, trashWeightKg, status } = req.body;
  const location = state.locations.find((item) => item.id === locationId) || state.locations[0];
  const unit = location.units.find((item) => item.id === unitId) || location.units[0];

  if (Number.isFinite(waterLevel)) {
    unit.waterLevel = Math.max(0, Math.min(100, Number(waterLevel)));
    unit.waterLevelMeters = Number(((unit.waterLevel / 100) * thresholds.maxWaterMeters).toFixed(1));
  }

  if (Number.isFinite(waterLevelMeters)) {
    unit.waterLevelMeters = Math.max(0, Number(waterLevelMeters));
    unit.waterLevel = Math.max(
      0,
      Math.min(100, Math.round((unit.waterLevelMeters / thresholds.maxWaterMeters) * 100))
    );
  }

  if (Number.isFinite(trashWeightKg)) {
    unit.trashWeightKg = Math.max(0, Math.min(thresholds.trashCapacity, Number(trashWeightKg)));
  }

  if (typeof status === "string") {
    unit.status = status;
  }

  state.updatedAt = new Date().toISOString();
  updateAlerts();

  res.json({
    ok: true,
    state
  });
});

app.post("/api/control", (req, res) => {
  const { action, unitId, locationId } = req.body;
  const location = state.locations.find((item) => item.id === locationId) || state.locations[0];
  const targets = unitId
    ? location.units.filter((unit) => unit.id === unitId)
    : location.units;

  if (action === "reset") {
    targets.forEach((unit) => {
      unit.waterLevel = 0;
      unit.waterLevelMeters = 0;
      unit.trashWeightKg = 0;
      unit.status = "Active";
    });
    state.lastAction = unitId ? `Reset ${unitId}` : `Reset ${location.id}`;
  } else if (action === "manual_collect") {
    targets.forEach((unit) => {
      unit.trashWeightKg = 0;
    });
    state.lastAction = unitId ? `Manual collection ${unitId}` : `Manual collection ${location.id}`;
  } else {
    return res.status(400).json({
      ok: false,
      error: "Unknown action"
    });
  }

  state.updatedAt = new Date().toISOString();
  updateAlerts();

  return res.json({
    ok: true,
    state
  });
});

app.get("/api/notes", (req, res) => {
  const locationId = req.query.locationId || "loc-1";
  res.json({
    ok: true,
    notes: notesStore[locationId] || []
  });
});

app.post("/api/notes", (req, res) => {
  const { locationId, text } = req.body;
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (!trimmed) {
    return res.status(400).json({
      ok: false,
      error: "Note text required"
    });
  }

  const targetId = locationId || "loc-1";
  const entry = {
    id: `note-${Date.now()}`,
    text: trimmed,
    createdAt: new Date().toISOString()
  };

  if (!notesStore[targetId]) {
    notesStore[targetId] = [];
  }
  notesStore[targetId].unshift(entry);
  saveJson(notesPath, notesStore);

  res.json({
    ok: true,
    notes: notesStore[targetId]
  });
});

app.get("/api/maintenance", (req, res) => {
  const locationId = req.query.locationId || "loc-1";
  res.json({
    ok: true,
    items: maintenanceStore[locationId] || []
  });
});

app.post("/api/maintenance", (req, res) => {
  const { locationId, title, date } = req.body;
  const targetId = locationId || "loc-1";
  const trimmedTitle = typeof title === "string" ? title.trim() : "";
  if (!trimmedTitle || !date) {
    return res.status(400).json({
      ok: false,
      error: "Title and date required"
    });
  }

  const entry = {
    id: `maint-${Date.now()}`,
    title: trimmedTitle,
    date,
    status: "Scheduled"
  };

  if (!maintenanceStore[targetId]) {
    maintenanceStore[targetId] = [];
  }
  maintenanceStore[targetId].unshift(entry);
  saveJson(maintenancePath, maintenanceStore);

  res.json({
    ok: true,
    items: maintenanceStore[targetId]
  });
});

app.get("/api/tasks", (req, res) => {
  const locationId = req.query.locationId || "loc-1";
  res.json({
    ok: true,
    tasks: tasksStore[locationId] || []
  });
});

app.post("/api/tasks", (req, res) => {
  const { locationId, title, assignee, due, status } = req.body;
  const trimmedTitle = typeof title === "string" ? title.trim() : "";
  if (!trimmedTitle) {
    return res.status(400).json({
      ok: false,
      error: "Task title required"
    });
  }

  const targetId = locationId || "loc-1";
  const entry = {
    id: `task-${Date.now()}`,
    title: trimmedTitle,
    assignee: assignee || "Unassigned",
    due: due || "",
    status: status || "Open"
  };

  if (!tasksStore[targetId]) {
    tasksStore[targetId] = [];
  }
  tasksStore[targetId].unshift(entry);
  saveJson(tasksPath, tasksStore);

  res.json({
    ok: true,
    tasks: tasksStore[targetId]
  });
});

app.get("/api/photos", (req, res) => {
  const locationId = req.query.locationId || "loc-1";
  res.json({
    ok: true,
    photos: photosStore[locationId] || []
  });
});

app.post("/api/photos", upload.single("photo"), (req, res) => {
  const locationId = req.body.locationId || "loc-1";
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: "Photo file required"
    });
  }

  const entry = {
    id: `photo-${Date.now()}`,
    name: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    createdAt: new Date().toISOString()
  };

  if (!photosStore[locationId]) {
    photosStore[locationId] = [];
  }
  photosStore[locationId].unshift(entry);
  saveJson(photosPath, photosStore);

  res.json({
    ok: true,
    photos: photosStore[locationId]
  });
});

app.get("/api/costs", (req, res) => {
  const locationId = req.query.locationId || "loc-1";
  res.json({
    ok: true,
    costs: costsStore[locationId] || []
  });
});

app.post("/api/costs", (req, res) => {
  const { locationId, item, amount, date } = req.body;
  const trimmedItem = typeof item === "string" ? item.trim() : "";
  if (!trimmedItem || !Number.isFinite(Number(amount))) {
    return res.status(400).json({
      ok: false,
      error: "Item and amount required"
    });
  }

  const targetId = locationId || "loc-1";
  const entry = {
    id: `cost-${Date.now()}`,
    item: trimmedItem,
    amount: Number(amount),
    date: date || new Date().toISOString().slice(0, 10)
  };

  if (!costsStore[targetId]) {
    costsStore[targetId] = [];
  }
  costsStore[targetId].unshift(entry);
  saveJson(costsPath, costsStore);

  res.json({
    ok: true,
    costs: costsStore[targetId]
  });
});

app.post("/api/notify", (req, res) => {
  const { channel, message } = req.body;
  console.log(`Notification placeholder (${channel || "sms"}): ${message}`);
  res.json({
    ok: true,
    status: "queued"
  });
});

app.listen(port, () => {
  console.log(`Dashboard server running at http://localhost:${port}`);
});
