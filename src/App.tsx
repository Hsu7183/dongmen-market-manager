import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";

type Page = "dashboard" | "vendors";
type StallId = "A1" | "A2" | "B1" | "B2";
type StallStatus = "empty" | "reserved" | "arrived" | "noShow";

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
  A1: { status: "empty", vendorId: "", locked: false },
  A2: { status: "empty", vendorId: "", locked: false },
  B1: { status: "empty", vendorId: "", locked: false },
  B2: { status: "empty", vendorId: "", locked: false },
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

const statusLabel = (status: StallStatus, locked: boolean) => {
  if (locked) return "鎖";
  switch (status) {
    case "reserved":
      return "預";
    case "arrived":
      return "到";
    case "noShow":
      return "沒";
    default:
      return "空";
  }
};

const statusColor = (status: StallStatus, locked: boolean) => {
  if (locked) return "#d1d5db";
  switch (status) {
    case "reserved":
      return "#fff9c4";
    case "arrived":
      return "#dcedc8";
    case "noShow":
      return "#ffcdd2";
    default:
      return "#ffffff";
  }
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
  const [mobileDragVendorId, setMobileDragVendorId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ dateKey: string; stall: StallId } | null>(null);
  const [lockTouchTarget, setLockTouchTarget] = useState<{ dateKey: string; stall: StallId } | null>(null);
  const [dragMessage, setDragMessage] = useState<string | null>(null);

  const touchDragTimerRef = useRef<number | null>(null);
  const touchStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const lockTouchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem("vendors", JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem("schedule", JSON.stringify(schedule));
  }, [schedule]);

  const scheduleDates = useMemo(() => buildScheduleDates(), []);

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
        : "empty";

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

  const handleDesktopDrop = (
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

  const handleVendorTouchStart = (vendorId: string, event: TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    touchStartPointRef.current = {
      x: event.touches[0]?.clientX ?? 0,
      y: event.touches[0]?.clientY ?? 0,
    };
    window.clearTimeout(touchDragTimerRef.current ?? undefined);
    touchDragTimerRef.current = window.setTimeout(() => {
      setMobileDragVendorId(vendorId);
      setDragMessage("長按拖曳中，移動到日期格放開");
    }, 300);
  };

  const handleVendorTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const startPoint = touchStartPointRef.current;
    if (!startPoint || mobileDragVendorId) return;
    const currentX = event.touches[0]?.clientX ?? 0;
    const currentY = event.touches[0]?.clientY ?? 0;
    const distance = Math.hypot(currentX - startPoint.x, currentY - startPoint.y);
    if (distance > 10) {
      window.clearTimeout(touchDragTimerRef.current ?? undefined);
      touchDragTimerRef.current = null;
    }
  };

  const handleVendorTouchEnd = () => {
    window.clearTimeout(touchDragTimerRef.current ?? undefined);
    touchDragTimerRef.current = null;
    touchStartPointRef.current = null;
    if (mobileDragVendorId) {
      setMobileDragVendorId(null);
      setDragMessage(null);
      setDragOverCell(null);
    }
  };

  const handleMobileDrop = (dateKey: string, stall: StallId, vendorId: string) => {
    const current = schedule[dateKey] ?? emptyDayRecords();
    if (current[stall].locked) return;
    updateStall(dateKey, stall, {
      status: "reserved",
      vendorId,
    });
  };

  useEffect(() => {
    if (!mobileDragVendorId) return;

    let currentDrop: { dateKey: string; stall: StallId } | null = null;

    const handleTouchMove = (event: globalThis.TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
      if (!target) {
        currentDrop = null;
        setDragOverCell(null);
        return;
      }
      const cell = target.closest("[data-drop-cell]") as HTMLElement | null;
      if (!cell) {
        currentDrop = null;
        setDragOverCell(null);
        return;
      }
      const dateKey = cell.dataset.dateKey;
      const stall = cell.dataset.stall as StallId | undefined;
      if (dateKey && stall) {
        currentDrop = { dateKey, stall };
        setDragOverCell({ dateKey, stall });
      } else {
        currentDrop = null;
        setDragOverCell(null);
      }
    };

    const handleTouchEnd = () => {
      if (currentDrop) {
        handleMobileDrop(currentDrop.dateKey, currentDrop.stall, mobileDragVendorId);
      }
      setMobileDragVendorId(null);
      setDragMessage(null);
      setDragOverCell(null);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [mobileDragVendorId, schedule]);

  const handleCellTouchStart = (dateKey: string, stall: StallId, event: TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (mobileDragVendorId) return;
    window.clearTimeout(lockTouchTimerRef.current ?? undefined);
    lockTouchTimerRef.current = window.setTimeout(() => {
      setLockTouchTarget({ dateKey, stall });
    }, 500);
  };

  const handleCellTouchEnd = (dateKey: string, stall: StallId, event: TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (mobileDragVendorId) return;
    if (lockTouchTarget?.dateKey === dateKey && lockTouchTarget.stall === stall) {
      toggleLock(dateKey, stall);
      setLockTouchTarget(null);
      window.clearTimeout(lockTouchTimerRef.current ?? undefined);
      lockTouchTimerRef.current = null;
      return;
    }
    window.clearTimeout(lockTouchTimerRef.current ?? undefined);
    lockTouchTimerRef.current = null;
    setLockTouchTarget(null);
    handleCycleStatus(dateKey, stall);
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

      <div style={styles.topSection}>
        <div style={styles.calendarHeader}>
          {WEEKDAYS.map((day) => (
            <div key={day} style={styles.weekdayCell}>{day}</div>
          ))}
        </div>

        <div style={styles.dateGrid}>
          {scheduleDates.map((date) => {
            const dateKey = getDateKey(date);
            const dayRecords = schedule[dateKey] ?? emptyDayRecords();
            return (
              <div key={dateKey} style={styles.dateCard}>
                <div style={styles.dateTitle}>{formatShortDate(date)}</div>
                <div style={styles.stallGrid}>
                  {STALLS.map((stall) => {
                    const record = dayRecords[stall];
                    const isDragOver =
                      dragOverCell?.dateKey === dateKey && dragOverCell?.stall === stall;
                    return (
                      <div
                        key={stall}
                        data-drop-cell
                        data-date-key={dateKey}
                        data-stall={stall}
                        style={{
                          ...styles.stallCell,
                          background: statusColor(record.status, record.locked),
                          borderColor: isDragOver ? "#2563eb" : "#cbd5e1",
                          opacity: record.locked ? 0.8 : 1,
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDesktopDrop(event, dateKey, stall)}
                        onTouchStart={(event) => handleCellTouchStart(dateKey, stall, event)}
                        onTouchEnd={(event) => handleCellTouchEnd(dateKey, stall, event)}
                      >
                        <div style={styles.stallId}>{stall}</div>
                        <div style={styles.stallStatus}>{statusLabel(record.status, record.locked)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.bottomSection}>
        <div style={styles.bottomHeader}>
          <h2 style={styles.sectionTitle}>攤販列表</h2>
          <div style={styles.dragHint}>{dragMessage || "長按攤販後拖到上方日期格"}</div>
        </div>
        <div style={styles.vendorBottomList}>
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/plain", vendor.id)}
              onTouchStart={(event) => handleVendorTouchStart(vendor.id, event)}
              onTouchMove={handleVendorTouchMove}
              onTouchEnd={handleVendorTouchEnd}
              onTouchCancel={handleVendorTouchEnd}
              style={{
                ...styles.vendorCardHorizontal,
                opacity: mobileDragVendorId === vendor.id ? 0.6 : 1,
              }}
            >
              <div style={styles.avatar}>{vendor.contactName.charAt(0)}</div>
              <div style={styles.vendorMeta}>
                <div style={styles.vendorTitle}>{vendor.stallName}</div>
                <div style={styles.vendorInfo}>{vendor.product}</div>
                <div style={styles.vendorInfo}>{vendor.phone}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#eef2ff",
    padding: "12px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  },
  title: {
    margin: 0,
    fontSize: "26px",
    textAlign: "center",
    color: "#1e293b",
    marginBottom: "12px",
  },
  topButtons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "12px",
  },
  primaryButton: {
    height: "48px",
    borderRadius: "14px",
    border: "none",
    background: "#2563eb",
    color: "white",
    fontSize: "16px",
    fontWeight: 700,
  },
  secondaryButton: {
    height: "48px",
    borderRadius: "14px",
    border: "none",
    background: "#475569",
    color: "white",
    fontSize: "16px",
    fontWeight: 700,
  },
  activeNavButton: {
    opacity: 0.95,
  },
  topSection: {
    flex: 2,
    overflowY: "auto",
    paddingRight: "4px",
    marginBottom: "12px",
  },
  calendarHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: "4px",
    marginBottom: "8px",
  },
  weekdayCell: {
    textAlign: "center",
    padding: "8px 0",
    borderRadius: "12px",
    background: "#4338ca",
    color: "white",
    fontWeight: 700,
    fontSize: "14px",
  },
  dateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: "8px",
  },
  dateCard: {
    background: "white",
    borderRadius: "18px",
    padding: "10px",
    boxShadow: "0 1px 4px rgba(15,23,42,0.08)",
    minHeight: "154px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  dateTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "#0f172a",
  },
  stallGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "6px",
    flex: 1,
  },
  stallCell: {
    minHeight: "52px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "6px",
    gap: "4px",
    userSelect: "none",
    touchAction: "manipulation",
  },
  stallId: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#1f2937",
  },
  stallStatus: {
    fontSize: "13px",
    color: "#334155",
  },
  bottomSection: {
    flex: 1,
    minHeight: "180px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  bottomHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },
  dragHint: {
    color: "#475569",
    fontSize: "14px",
    textAlign: "right",
    flex: 1,
  },
  vendorBottomList: {
    display: "grid",
    gap: "10px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  vendorCardHorizontal: {
    display: "flex",
    alignItems: "center",
    background: "white",
    borderRadius: "18px",
    padding: "12px",
    border: "1px solid #cbd5e1",
    boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
    gap: "12px",
    touchAction: "manipulation",
  },
  avatar: {
    width: "52px",
    height: "52px",
    borderRadius: "50%",
    background: "#2563eb",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontSize: "20px",
    fontWeight: 700,
  },
  vendorMeta: {
    display: "grid",
    gap: "4px",
  },
  vendorTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#0f172a",
  },
  vendorInfo: {
    fontSize: "13px",
    color: "#475569",
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
