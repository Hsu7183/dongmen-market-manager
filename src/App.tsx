import { useEffect, useMemo, useState } from "react";

type Page = "calendar" | "vendors" | "day";
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
};

type DayRecords = Record<StallId, StallRecord>;
type ScheduleMap = Record<string, DayRecords>;

const STALLS: StallId[] = ["A1", "A2", "B1", "B2"];
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const STATUS_LABEL: Record<StallStatus, string> = {
  empty: "空位",
  reserved: "已預約",
  arrived: "已出租",
  noShow: "沒來",
  longTerm: "長租",
};

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
  A1: { status: "empty", vendorId: "", note: "" },
  A2: { status: "empty", vendorId: "", note: "" },
  B1: { status: "empty", vendorId: "", note: "" },
  B2: { status: "empty", vendorId: "", note: "" },
});

const toDateKey = (date: Date) => {
  return date.toISOString().split("T")[0];
};

function App() {
  const [page, setPage] = useState<Page>("calendar");
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));

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

  const days = useMemo(() => {
    const today = new Date();

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  const selectedDay = schedule[selectedDate] ?? emptyDayRecords();

  function updateStall(
    stall: StallId,
    patch: Partial<StallRecord>
  ) {
    setSchedule((prev) => {
      const current = prev[selectedDate] ?? emptyDayRecords();

      return {
        ...prev,
        [selectedDate]: {
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

  function getCallList(stall: StallId) {
    const weekday = new Date(selectedDate).getDay();

    return vendors.filter(
      (v) =>
        v.weekdays.includes(weekday) ||
        v.preferredStall === stall
    );
  }

  if (page === "vendors") {
    return (
      <div style={styles.page}>
        <button style={styles.backButton} onClick={() => setPage("calendar")}>
          ← 返回月曆
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

  if (page === "day") {
    return (
      <div style={styles.page}>
        <button style={styles.backButton} onClick={() => setPage("calendar")}>
          ← 返回月曆
        </button>

        <h1 style={styles.title}>{selectedDate}</h1>

        {STALLS.map((stall) => {
          const record = selectedDay[stall];

          return (
            <div key={stall} style={styles.card}>
              <div style={styles.stallHeader}>
                <div style={styles.stallName}>{stall}</div>

                <div
                  style={{
                    ...styles.statusDot,
                    background: STATUS_COLOR[record.status],
                  }}
                />
              </div>

              <div style={styles.statusButtons}>
                {(Object.entries(STATUS_LABEL) as [StallStatus, string][]).map(
                  ([status, label]) => {
                    const active = record.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        style={{
                          ...styles.statusButton,
                          background: active ? STATUS_COLOR[status] : "#fff",
                          color: active ? "#fff" : "#333",
                          border: active
                            ? `1px solid ${STATUS_COLOR[status]}`
                            : "1px solid #ccc",
                        }}
                        onClick={() =>
                          updateStall(stall, {
                            status,
                          })
                        }
                      >
                        {label}
                      </button>
                    );
                  }
                )}
              </div>

              <select
                style={styles.input}
                value={record.vendorId}
                onChange={(e) =>
                  updateStall(stall, {
                    vendorId: e.target.value,
                  })
                }
              >
                <option value="">未指定</option>

                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.stallName}
                  </option>
                ))}
              </select>

              <input
                style={styles.input}
                placeholder="備註"
                value={record.note}
                onChange={(e) =>
                  updateStall(stall, {
                    note: e.target.value,
                  })
                }
              />

              {record.status === "empty" && (
                <div style={styles.callBox}>
                  <div style={styles.callTitle}>可聯絡攤販</div>

                  {getCallList(stall).map((v) => (
                    <div key={v.id} style={styles.callItem}>
                      {v.stallName}｜
                  <a
                    href={`tel:${v.phone.replace(/[^0-9+]/g, "")}`}
                    style={styles.phoneLink}
                  >
                    {v.phone}
                  </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>東門市場家庭管理系統</h1>

      <div style={styles.topButtons}>
        <button style={styles.primaryButton}>
          月曆
        </button>

        <button
          style={styles.secondaryButton}
          onClick={() => setPage("vendors")}
        >
          攤販名單
        </button>
      </div>

      <div style={styles.legend}>
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <div key={k} style={styles.legendItem}>
            <div
              style={{
                ...styles.statusDotSmall,
                background: STATUS_COLOR[k as StallStatus],
              }}
            />
            {v}
          </div>
        ))}
      </div>

      <div style={styles.weekdayHeader}>
        {WEEKDAYS.map((day) => (
          <div key={day} style={styles.weekdayHeaderItem}>
            {day}
          </div>
        ))}
      </div>

      <div style={styles.calendarGrid}>
        {days.map((date) => {
          const dateKey = toDateKey(date);
          const records = schedule[dateKey] ?? emptyDayRecords();

          return (
            <button
              key={dateKey}
              style={styles.dayCard}
              onClick={() => {
                setSelectedDate(dateKey);
                setPage("day");
              }}
            >
              <div style={styles.dayNumber}>
                {date.getMonth() + 1}/{date.getDate()}
              </div>

              <div style={styles.weekText}>
                {WEEKDAYS[date.getDay()]}
              </div>

              <div style={styles.dotsGrid}>
                {STALLS.map((stall) => (
                  <div
                    key={stall}
                    style={{
                      ...styles.statusDotSmall,
                      background:
                        STATUS_COLOR[records[stall].status],
                    }}
                  />
                ))}
              </div>
            </button>
          );
        })}
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
    fontSize: "22px",
    fontWeight: "bold",
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

  phoneLink: {
    color: "#1565c0",
    textDecoration: "none",
  },

  weekdayHeader: {
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
};

export default App;