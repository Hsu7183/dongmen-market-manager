import { useEffect, useMemo, useState } from "react";

type Page = "dashboard" | "vendors";
type StallId = "A1" | "A2" | "B1" | "B2";
type StallStatus = "empty" | "reserved" | "arrived" | "noShow" | "longTerm";

type Vendor = {
  id: string;
  stallName: string;
  contactName: string;
  phone: string;
  line: string;
  product: string;
  longTerm: boolean;
  weekdays: number[];
  preferredStall: StallId | "";
};

type StallRecord = {
  status: StallStatus;
  vendorId: string;
  note: string;
  locked: boolean;
};

type DayRecords = Record<StallId, StallRecord>;
type ScheduleMap = Record<string, DayRecords>;

const STALLS: StallId[] = ["A1", "A2", "B1", "B2"];
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const defaultVendors: Vendor[] = [
  {
    id: "v1",
    stallName: "王家水果",
    contactName: "王老闆",
    phone: "0912-000-001",
    line: "wangfruit",
    product: "水果",
    longTerm: false,
    weekdays: [2, 4, 6],
    preferredStall: "A1",
  },
  {
    id: "v2",
    stallName: "李家青菜",
    contactName: "李小姐",
    phone: "0912-000-002",
    line: "livegetable",
    product: "青菜",
    longTerm: false,
    weekdays: [1, 3, 5],
    preferredStall: "A2",
  },
];

const emptyDayRecords = (): DayRecords => ({
  A1: { status: "empty", vendorId: "", note: "", locked: false },
  A2: { status: "empty", vendorId: "", note: "", locked: false },
  B1: { status: "empty", vendorId: "", note: "", locked: false },
  B2: { status: "empty", vendorId: "", note: "", locked: false },
});

const getDateKey = (date: Date) => date.toISOString().slice(0, 10);
const formatShortDate = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;

const buildScheduleDates = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 21 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
};

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [vendors, setVendors] = useState<Vendor[]>(() => {
    const raw = localStorage.getItem("vendors");
    return raw ? (JSON.parse(raw) as Vendor[]) : defaultVendors;
  });
  const [schedule, setSchedule] = useState<ScheduleMap>(() => {
    const raw = localStorage.getItem("schedule");
    return raw ? (JSON.parse(raw) as ScheduleMap) : {};
  });

  const [newVendor, setNewVendor] = useState({
    stallName: "",
    contactName: "",
    phone: "",
    line: "",
    product: "",
    longTerm: false,
    weekdays: [] as number[],
    preferredStall: "" as StallId | "",
  });

  useEffect(() => {
    localStorage.setItem("vendors", JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem("schedule", JSON.stringify(schedule));
  }, [schedule]);

  const scheduleDates = useMemo(() => buildScheduleDates(), []);
  const vendorMap = useMemo(
    () =>
      vendors.reduce((map, vendor) => {
        map[vendor.id] = vendor;
        return map;
      }, {} as Record<string, Vendor>),
    [vendors]
  );

  const statusLabel = (status: StallStatus) => {
    switch (status) {
      case "reserved":
        return "預約";
      case "arrived":
        return "到攤";
      case "noShow":
        return "未到";
      case "longTerm":
        return "長租";
      default:
        return "空攤";
    }
  };

  const statusColor = (status: StallStatus) => {
    switch (status) {
      case "reserved":
        return "#fff8e1";
      case "arrived":
        return "#e8f5e9";
      case "noShow":
        return "#ffebee";
      case "longTerm":
        return "#e3f2fd";
      default:
        return "#ffffff";
    }
  };

  const updateStall = (dateKey: string, stall: StallId, patch: Partial<StallRecord>) => {
    setSchedule((prev) => {
      const current = prev[dateKey] ?? emptyDayRecords();
      return {
        ...prev,
        [dateKey]: {
          ...current,
          [stall]: {
            ...current[stall],
            ...patch,
          },
        },
      };
    });
  };

  const handleVendorDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    vendorId: string
  ) => {
    event.dataTransfer.setData("text/plain", vendorId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    dateKey: string,
    stall: StallId
  ) => {
    event.preventDefault();
    const vendorId = event.dataTransfer.getData("text/plain");
    if (!vendorId) return;

    const current = schedule[dateKey] ?? emptyDayRecords();
    if (current[stall].locked) return;

    updateStall(dateKey, stall, {
      status: "reserved",
      vendorId,
    });
  };

  const handleCycleStatus = (dateKey: string, stall: StallId) => {
    const current = schedule[dateKey] ?? emptyDayRecords();
    const record = current[stall];
    if (record.locked) return;

    const nextStatus: StallStatus =
      record.status === "empty"
        ? "reserved"
        : record.status === "reserved"
        ? "arrived"
        : record.status === "arrived"
        ? "noShow"
        : record.status === "noShow"
        ? "empty"
        : "longTerm";

    updateStall(dateKey, stall, {
      status: nextStatus,
      vendorId: nextStatus === "empty" ? "" : record.vendorId,
    });
  };

  const toggleLock = (dateKey: string, stall: StallId) => {
    const current = schedule[dateKey] ?? emptyDayRecords();
    updateStall(dateKey, stall, {
      locked: !current[stall].locked,
    });
  };

  const addVendor = () => {
    if (!newVendor.stallName || !newVendor.contactName) {
      alert("請輸入攤販名稱與聯絡人");
      return;
    }

    setVendors((prev) => [
      {
        id: `v-${Date.now()}`,
        ...newVendor,
      },
      ...prev,
    ]);

    setNewVendor({
      stallName: "",
      contactName: "",
      phone: "",
      line: "",
      product: "",
      longTerm: false,
      weekdays: [],
      preferredStall: "",
    });
  };

  if (page === "vendors") {
    return (
      <div style={styles.page}>
        <button style={styles.backButton} onClick={() => setPage("dashboard")}>← 返回排攤看板</button>
        <h1 style={styles.title}>攤販名單</h1>

        <div style={styles.card}>
          <input
            style={styles.input}
            placeholder="攤販名稱"
            value={newVendor.stallName}
            onChange={(e) => setNewVendor({ ...newVendor, stallName: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="聯絡人"
            value={newVendor.contactName}
            onChange={(e) => setNewVendor({ ...newVendor, contactName: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="手機"
            value={newVendor.phone}
            onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="LINE"
            value={newVendor.line}
            onChange={(e) => setNewVendor({ ...newVendor, line: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="賣什麼"
            value={newVendor.product}
            onChange={(e) => setNewVendor({ ...newVendor, product: e.target.value })}
          />
          <div style={styles.checkboxRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newVendor.longTerm}
                onChange={(e) => setNewVendor({ ...newVendor, longTerm: e.target.checked })}
              />
              長租攤位
            </label>
          </div>
          <div style={styles.toggleGroup}>
            <div style={styles.toggleLabel}>常用星期</div>
            <div style={styles.toggleRow}>
              {WEEKDAYS.map((day, index) => {
                const active = newVendor.weekdays.includes(index);
                return (
                  <button
                    key={day}
                    type="button"
                    style={{
                      ...styles.toggleButton,
                      background: active ? "#1976d2" : "#fff",
                      color: active ? "#fff" : "#333",
                      border: active ? "1px solid #1976d2" : "1px solid #ccc",
                    }}
                    onClick={() => {
                      const next = newVendor.weekdays.includes(index)
                        ? newVendor.weekdays.filter((w) => w !== index)
                        : [...newVendor.weekdays, index];
                      setNewVendor({ ...newVendor, weekdays: next });
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={styles.toggleGroup}>
            <div style={styles.toggleLabel}>常用攤位</div>
            <div style={styles.toggleRow}>
              {STALLS.map((stall) => {
                const active = newVendor.preferredStall === stall;
                return (
                  <button
                    key={stall}
                    type="button"
                    style={{
                      ...styles.toggleButton,
                      minWidth: "64px",
                      background: active ? "#1976d2" : "#fff",
                      color: active ? "#fff" : "#333",
                      border: active ? "1px solid #1976d2" : "1px solid #ccc",
                    }}
                    onClick={() => setNewVendor({ ...newVendor, preferredStall: stall })}
                  >
                    {stall}
                  </button>
                );
              })}
            </div>
          </div>
          <button style={styles.primaryButton} onClick={addVendor}>新增攤販</button>
        </div>

        {vendors.map((vendor) => (
          <div key={vendor.id} style={styles.card}>
            <div style={styles.vendorTitle}>{vendor.stallName}</div>
            <div>{vendor.contactName}</div>
            <div>{vendor.phone}</div>
            <div>{vendor.product}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>東門市場拖曳式排攤看板</h1>
      <div style={styles.topButtons}>
        <button style={{ ...styles.primaryButton, ...styles.activeNavButton }} disabled>
          排攤看板
        </button>
        <button style={styles.secondaryButton} onClick={() => setPage("vendors")}>攤販名單</button>
      </div>

      <div style={styles.infoCard}>
        <div>將攤販從下方清單拖曳到 21 日格中。</div>
        <div>點擊格子切換狀態，鎖定後不允許更改。</div>
      </div>

      <div style={styles.dashboardGrid}>
        <div style={styles.vendorPanel}>
          <h2 style={styles.sectionTitle}>可拖曳攤販</h2>
          <div style={styles.vendorList}>
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                draggable
                onDragStart={(event) => handleVendorDragStart(event, vendor.id)}
                style={styles.vendorCard}
              >
                <div style={styles.vendorTitle}>{vendor.stallName}</div>
                <div style={styles.vendorInfo}>{vendor.contactName}</div>
                <div style={styles.vendorInfo}>{vendor.product}</div>
                <div style={styles.vendorInfo}>{vendor.phone}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.boardPanel}>
          <h2 style={styles.sectionTitle}>21 日排攤</h2>
          <div style={styles.boardWrapper}>
            <div style={styles.boardGrid}>
              <div style={styles.headerCell} />
              {scheduleDates.map((date) => (
                <div key={getDateKey(date)} style={styles.headerCell}>
                  <div style={styles.headerDate}>{formatShortDate(date)}</div>
                  <div style={styles.headerWeekday}>{WEEKDAYS[date.getDay()]}</div>
                </div>
              ))}

              {STALLS.map((stall) => (
                <>
                  <div key={`${stall}-label`} style={styles.stallLabel}>
                    {stall}
                  </div>
                  {scheduleDates.map((date) => {
                    const dateKey = getDateKey(date);
                    const dayRecords = schedule[dateKey] ?? emptyDayRecords();
                    const record = dayRecords[stall];
                    const vendor = vendorMap[record.vendorId];

                    return (
                      <div
                        key={`${dateKey}-${stall}`}
                        style={{
                          ...styles.cell,
                          background: statusColor(record.status),
                          borderColor: record.locked ? "#d32f2f" : "#ccc",
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDrop(event, dateKey, stall)}
                      >
                        <div style={styles.cellHeader}>
                          <span style={styles.cellStatus}>{statusLabel(record.status)}</span>
                          <button
                            type="button"
                            style={styles.smallButton}
                            onClick={() => handleCycleStatus(dateKey, stall)}
                          >
                            切換
                          </button>
                          <button
                            type="button"
                            style={styles.lockButtonCell}
                            onClick={() => toggleLock(dateKey, stall)}
                          >
                            {record.locked ? "鎖定" : "開放"}
                          </button>
                        </div>
                        <div style={styles.cellBody}>
                          {vendor ? (
                            <>
                              <div style={styles.vendorName}>{vendor.stallName}</div>
                              <div style={styles.vendorInfoSmall}>{vendor.contactName}</div>
                            </>
                          ) : (
                            <div style={styles.emptyText}>拖曳攤販到此</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "14px",
    background: "#f3f6fb",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    margin: 0,
    marginBottom: "16px",
    fontSize: "30px",
    textAlign: "center",
    color: "#1f2937",
  },
  topButtons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "16px",
  },
  primaryButton: {
    height: "52px",
    borderRadius: "14px",
    border: "none",
    background: "#1976d2",
    color: "white",
    fontSize: "18px",
    fontWeight: "700",
  },
  secondaryButton: {
    height: "52px",
    borderRadius: "14px",
    border: "none",
    background: "#455a64",
    color: "white",
    fontSize: "18px",
    fontWeight: "700",
  },
  activeNavButton: {
    opacity: 0.95,
  },
  infoCard: {
    padding: "14px",
    marginBottom: "16px",
    borderRadius: "18px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#334155",
    fontSize: "16px",
    display: "grid",
    gap: "8px",
  },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: "16px",
  },
  vendorPanel: {
    display: "grid",
    gap: "12px",
  },
  boardPanel: {
    display: "grid",
    gap: "12px",
  },
  sectionTitle: {
    margin: 0,
    marginBottom: "8px",
    fontSize: "22px",
    color: "#0f172a",
  },
  vendorList: {
    display: "grid",
    gap: "12px",
  },
  vendorCard: {
    background: "white",
    borderRadius: "16px",
    border: "1px solid #d1d5db",
    padding: "12px",
    cursor: "grab",
    boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
  },
  vendorTitle: {
    fontSize: "18px",
    fontWeight: 700,
    marginBottom: "6px",
  },
  vendorInfo: {
    fontSize: "14px",
    color: "#475569",
  },
  boardWrapper: {
    overflowX: "auto",
  },
  boardGrid: {
    display: "grid",
    gridTemplateColumns: `120px repeat(21, minmax(180px, 1fr))`,
    gap: "4px",
    alignItems: "stretch",
  },
  headerCell: {
    padding: "10px 8px",
    minWidth: "100px",
    borderRadius: "12px",
    background: "#1d4ed8",
    color: "white",
    textAlign: "center",
    fontSize: "14px",
    fontWeight: 700,
  },
  headerDate: {
    fontSize: "16px",
  },
  headerWeekday: {
    opacity: 0.85,
  },
  stallLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "120px",
    borderRadius: "12px",
    background: "#e2e8f0",
    fontWeight: 700,
    color: "#0f172a",
    fontSize: "16px",
  },
  cell: {
    minHeight: "120px",
    borderRadius: "12px",
    border: "1px solid #ccc",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "10px",
  },
  cellHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  cellStatus: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#1e293b",
  },
  smallButton: {
    borderRadius: "12px",
    border: "1px solid #94a3b8",
    background: "white",
    padding: "4px 8px",
    fontSize: "12px",
    cursor: "pointer",
  },
  lockButtonCell: {
    borderRadius: "12px",
    border: "1px solid #94a3b8",
    background: "#f8fafc",
    padding: "4px 8px",
    fontSize: "12px",
    cursor: "pointer",
  },
  cellBody: {
    flexGrow: 1,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: "8px",
  },
  vendorName: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827",
  },
  vendorInfoSmall: {
    fontSize: "13px",
    color: "#475569",
  },
  emptyText: {
    color: "#64748b",
    fontSize: "14px",
  },
  card: {
    background: "white",
    borderRadius: "18px",
    border: "1px solid #d1d5db",
    padding: "16px",
    boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
    marginBottom: "12px",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    marginBottom: "12px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    fontSize: "16px",
  },
  checkboxRow: {
    marginBottom: "12px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "15px",
    color: "#334155",
  },
  toggleGroup: {
    marginBottom: "12px",
  },
  toggleLabel: {
    marginBottom: "6px",
    color: "#334155",
    fontSize: "14px",
    fontWeight: 700,
  },
  toggleRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  toggleButton: {
    borderRadius: "14px",
    border: "1px solid #ccc",
    padding: "8px 12px",
    fontSize: "14px",
    cursor: "pointer",
    minWidth: "44px",
  },
  backButton: {
    border: "none",
    background: "none",
    color: "#111827",
    fontSize: "16px",
    marginBottom: "12px",
    cursor: "pointer",
  },
};

export default App;
