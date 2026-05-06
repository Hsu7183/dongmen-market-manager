import { useEffect, useState } from "react";

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

const STATUS_COLOR: Record<StallStatus, string> = {
  empty: "#ffffff",
  reserved: "#fdd835",
  arrived: "#43a047",
  noShow: "#e53935",
  longTerm: "#1e88e5",
};

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

const toDateKey = (date: Date) => {
  return date.toISOString().split("T")[0];
};

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedDate] = useState(toDateKey(new Date()));
  const [draggedVendorId, setDraggedVendorId] = useState<string | null>(null);

  const [vendors, setVendors] = useState<Vendor[]>(() => {
    const raw = localStorage.getItem("vendors");
    return raw ? JSON.parse(raw) : defaultVendors;
  });

  const [schedule, setSchedule] = useState<ScheduleMap>(() => {
    const raw = localStorage.getItem("schedule");
    return raw ? JSON.parse(raw) : {};
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

  const today = new Date();
  const days = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  function handleStallClick(dateKey: string, stall: StallId) {
    const record = (schedule[dateKey] ?? emptyDayRecords())[stall];
    if (record.locked) return;

    const nextStatus: StallStatus =
      record.status === "empty"
        ? "reserved"
        : record.status === "reserved"
        ? "arrived"
        : record.status === "arrived"
        ? "noShow"
        : "empty";

    updateStall(dateKey, stall, {
      status: nextStatus,
      vendorId: nextStatus === "empty" ? "" : record.vendorId,
    });
  }

  function handleStallLock(dateKey: string, stall: StallId) {
    const record = (schedule[dateKey] ?? emptyDayRecords())[stall];
    updateStall(dateKey, stall, {
      locked: !record.locked,
    });
  }

  function handleDrop(dateKey: string, stall: StallId) {
    if (!draggedVendorId) return;
    const record = (schedule[dateKey] ?? emptyDayRecords())[stall];
    if (record.locked) return;

    updateStall(dateKey, stall, {
      status: "reserved",
      vendorId: draggedVendorId,
    });
    setDraggedVendorId(null);
  }

  function updateStall(dateKey: string, stall: StallId, patch: Partial<StallRecord>) {
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
  }

  function addVendor() {
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
  }

  if (page === "vendors") {
    return (
      <div style={styles.page}>
        <button style={styles.backButton} onClick={() => setPage("dashboard")}>
          ← 返回排攤看板
        </button>

        <h1 style={styles.title}>攤販名單</h1>

        <div style={styles.card}>
          <input
            style={styles.input}
            placeholder="攤販名稱"
            value={newVendor.stallName}
            onChange={(e) =>
              setNewVendor({ ...newVendor, stallName: e.target.value })
            }
          />

          <input
            style={styles.input}
            placeholder="聯絡人"
            value={newVendor.contactName}
            onChange={(e) =>
              setNewVendor({ ...newVendor, contactName: e.target.value })
            }
          />

          <input
            style={styles.input}
            placeholder="手機"
            value={newVendor.phone}
            onChange={(e) =>
              setNewVendor({ ...newVendor, phone: e.target.value })
            }
          />

          <div style={styles.checkboxRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={newVendor.longTerm}
                onChange={(e) =>
                  setNewVendor({ ...newVendor, longTerm: e.target.checked })
                }
              />
              是否長租
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
                    onClick={() =>
                      setNewVendor({ ...newVendor, preferredStall: stall })
                    }
                  >
                    {stall}
                  </button>
                );
              })}
            </div>
          </div>

          <input
            style={styles.input}
            placeholder="LINE"
            value={newVendor.line}
            onChange={(e) =>
              setNewVendor({ ...newVendor, line: e.target.value })
            }
          />

          <input
            style={styles.input}
            placeholder="賣什麼"
            value={newVendor.product}
            onChange={(e) =>
              setNewVendor({ ...newVendor, product: e.target.value })
            }
          />

          <button style={styles.primaryButton} onClick={addVendor}>
            新增攤販
          </button>
        </div>

        {vendors.map((v) => (
          <div key={v.id} style={styles.card}>
            <div style={styles.vendorTitle}>{v.stallName}</div>
            <div>{v.contactName}</div>
            <div>{v.phone}</div>
            <div>{v.product}</div>
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

        <button
          style={styles.secondaryButton}
          onClick={() => setPage("vendors")}
        >
          攤販名單
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f5f5",
    padding: "12px",
    fontFamily: "Arial",
  },

  title: {
    textAlign: "center",
    fontSize: "28px",
    marginBottom: "16px",
  },

  topButtons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "16px",
  },

  primaryButton: {
    height: "56px",
    borderRadius: "14px",
    border: "none",
    background: "#1976d2",
    color: "white",
    fontSize: "20px",
    fontWeight: "bold",
  },

  activeNavButton: {
    opacity: 0.9,
  },

  secondaryButton: {
    height: "56px",
    borderRadius: "14px",
    border: "none",
    background: "#455a64",
    color: "white",
    fontSize: "22px",
    fontWeight: "bold",
  },

  backButton: {
    height: "50px",
    borderRadius: "12px",
    border: "none",
    background: "#444",
    color: "white",
    padding: "0 16px",
    marginBottom: "16px",
    fontSize: "18px",
  },

  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "center",
    marginBottom: "14px",
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "white",
    borderRadius: "999px",
    padding: "4px 8px",
    fontSize: "13px",
  },

  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
  },

  dayCard: {
    background: "white",
    border: "none",
    borderRadius: "10px",
    padding: "6px",
    minHeight: "78px",
  },

  dayNumber: {
    fontSize: "14px",
    fontWeight: "bold",
  },

  weekText: {
    fontSize: "10px",
    color: "#777",
    marginBottom: "4px",
  },

  dotsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "4px",
  },

  statusDotSmall: {
    width: "100%",
    aspectRatio: "1",
    borderRadius: "4px",
    border: "1px solid #ccc",
  },

  card: {
    background: "white",
    padding: "14px",
    borderRadius: "14px",
    marginBottom: "14px",
  },

  vendorTitle: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "6px",
  },

  stallHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },

  stallName: {
    fontSize: "28px",
    fontWeight: "bold",
  },

  statusDot: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    border: "2px solid #ccc",
  },

  input: {
    width: "100%",
    height: "48px",
    marginBottom: "10px",
    borderRadius: "12px",
    border: "1px solid #ccc",
    padding: "0 12px",
    fontSize: "18px",
    boxSizing: "border-box",
  },

  callBox: {
    background: "#fff8e1",
    padding: "10px",
    borderRadius: "12px",
    marginTop: "10px",
  },

  callTitle: {
    fontWeight: "bold",
    marginBottom: "8px",
  },

  callItem: {
    marginBottom: "6px",
  },
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
    marginBottom: "4px",
  },

  weekdayHeaderItem: {
    textAlign: "center",
    fontSize: "12px",
    fontWeight: "bold",
    color: "#444",
  },

  statusButtons: {
    display: "grid",
    gap: "8px",
    marginBottom: "12px",
  },

  statusButton: {
    height: "48px",
    borderRadius: "14px",
    border: "1px solid #ccc",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },

  checkboxRow: {
    marginBottom: "10px",
  },

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "16px",
    color: "#333",
  },

  toggleGroup: {
    marginBottom: "10px",
  },

  toggleLabel: {
    marginBottom: "6px",
    fontSize: "14px",
    color: "#444",
  },

  toggleRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: "6px",
  },

  toggleButton: {
    height: "44px",
    borderRadius: "12px",
    border: "1px solid #ccc",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  boardContainer: {
    display: "grid",
    gap: "20px",
  },

  scheduleBoard: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    overflowY: "auto",
    maxHeight: "60vh",
  },

  column: {
    display: "grid",
    gap: "8px",
  },

  dayBlock: {
    background: "#fff",
    borderRadius: "12px",
    padding: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },

  dayHeader: {
    textAlign: "center",
    marginBottom: "6px",
  },

  dayDate: {
    fontSize: "16px",
    fontWeight: "bold",
  },

  dayWeekday: {
    fontSize: "12px",
    color: "#666",
  },

  stallsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "6px",
  },

  stallSlot: {
    background: "#f9f9f9",
    borderRadius: "8px",
    padding: "6px",
    position: "relative",
    cursor: "pointer",
    minHeight: "60px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  stallLabel: {
    fontSize: "12px",
    fontWeight: "bold",
    textAlign: "center",
  },

  statusParts: {
    display: "flex",
    gap: "2px",
  },

  reservationPart: {
    flex: 1,
    borderRadius: "4px",
    fontSize: "10px",
    textAlign: "center",
    fontWeight: "bold",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  attendancePart: {
    flex: 1,
    borderRadius: "4px",
    fontSize: "10px",
    textAlign: "center",
    fontWeight: "bold",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  vendorInSlot: {
    fontSize: "10px",
    textAlign: "center",
    color: "#333",
    fontWeight: "bold",
  },

  lockButton: {
    position: "absolute",
    top: "2px",
    right: "2px",
    background: "none",
    border: "none",
    fontSize: "12px",
    cursor: "pointer",
  },

  vendorListSection: {
    display: "grid",
    gap: "12px",
  },

  sectionTitle: {
    fontSize: "20px",
    fontWeight: "700",
    marginBottom: "8px",
  },

  vendorCard: {
    display: "grid",
    gridTemplateColumns: "60px 1fr auto",
    gap: "12px",
    alignItems: "center",
    width: "100%",
    borderRadius: "18px",
    padding: "14px",
    border: "1px solid #ddd",
    textAlign: "left",
    cursor: "pointer",
  },

  vendorAvatar: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "#1976d2",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    fontWeight: "700",
  },

  vendorContent: {
    display: "grid",
    gap: "4px",
  },

  vendorMeta: {
    fontSize: "14px",
    color: "#555",
  },

  phoneLink: {
    color: "#1565c0",
    textDecoration: "none",
    fontSize: "14px",
  },
};

export default App;