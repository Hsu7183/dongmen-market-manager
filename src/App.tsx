import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";

type StallId = "頭攤" | "門前" | "左1" | "中2" | "右3" | "魚攤";
type StallStatus = "empty" | "occupied";

type Vendor = {
  id: string;
  stallName: string;
  contactName: string;
  phone: string;
  line: string;
  product: string;
  gender: "男" | "女";
  photo?: string;
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

const STALLS: StallId[] = ["頭攤", "門前", "左1", "中2", "右3", "魚攤"];
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const defaultVendors: Vendor[] = [
  {
    id: "v1",
    stallName: "王家水果",
    contactName: "王老闆",
    phone: "0912-000-001",
    line: "wangfruit",
    product: "水果",
    gender: "男",
    longTerm: false,
    weekdays: [2, 4, 6],
    preferredStall: "頭攤",
  },
  {
    id: "v2",
    stallName: "李家青菜",
    contactName: "李小姐",
    phone: "0912-000-002",
    line: "livegetable",
    product: "青菜",
    gender: "女",
    longTerm: false,
    weekdays: [1, 3, 5],
    preferredStall: "門前",
  },
];

const emptyDayRecords = (): DayRecords => ({
  "頭攤": { status: "empty", vendorId: "", locked: false },
  "門前": { status: "empty", vendorId: "", locked: false },
  "左1": { status: "empty", vendorId: "", locked: false },
  "中2": { status: "empty", vendorId: "", locked: false },
  "右3": { status: "empty", vendorId: "", locked: false },
  "魚攤": { status: "empty", vendorId: "", locked: false },
});

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const formatShortDate = (date: Date) => `${date.getDate()}`;

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>(() => {
    const raw = localStorage.getItem("vendors");
    const saved = raw ? (JSON.parse(raw) as Partial<Vendor>[]) : defaultVendors;
    return saved.map((vendor) => ({
      id: vendor.id ?? `v-${Date.now()}`,
      stallName: vendor.stallName ?? "",
      contactName: vendor.contactName ?? "",
      phone: vendor.phone ?? "",
      line: vendor.line ?? "",
      product: vendor.product ?? "",
      gender: vendor.gender ?? "男",
      photo: vendor.photo ?? "",
      longTerm: vendor.longTerm ?? false,
      weekdays: vendor.weekdays ?? [],
      preferredStall: vendor.preferredStall ?? "",
    }));
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
    gender: "男" as "男" | "女",
    photo: "",
    longTerm: false,
    weekdays: [] as number[],
    preferredStall: "" as StallId | "",
  });
  const [mobileDragVendorId, setMobileDragVendorId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ dateKey: string; stall: StallId } | null>(null);
  const [dragMessage, setDragMessage] = useState<string | null>(null);
  const [activeVendorActions, setActiveVendorActions] = useState<string | null>(null);

  const touchDragTimerRef = useRef<number | null>(null);
  const touchStartPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    localStorage.setItem("vendors", JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem("schedule", JSON.stringify(schedule));
  }, [schedule]);

  const scheduleDates = useMemo(() => buildScheduleDates(), []);
  const firstWeekday = scheduleDates[0].getDay();
  const scheduleMonthLabel = `${scheduleDates[0].getFullYear()}年${scheduleDates[0].getMonth() + 1}月`;
  const vendorMap = useMemo(
    () =>
      vendors.reduce((map, vendor) => {
        map[vendor.id] = vendor;
        return map;
      }, {} as Record<string, Vendor>),
    [vendors]
  );
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
      status: "occupied",
      vendorId,
      locked: true,
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
      setDragMessage("拖曳到上方攤位格放開");
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

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setNewVendor((prev) => ({ ...prev, photo: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMobileDrop = (dateKey: string, stall: StallId, vendorId: string) => {
    const current = schedule[dateKey] ?? emptyDayRecords();
    if (current[stall].locked) return;
    updateStall(dateKey, stall, {
      status: "occupied",
      vendorId,
      locked: true,
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

  const handleStallClick = (dateKey: string, stall: StallId) => {
    const current = schedule[dateKey] ?? emptyDayRecords();
    const record = current[stall];
    if (record.locked) {
      updateStall(dateKey, stall, {
        status: "empty",
        vendorId: "",
        locked: false,
      });
    }
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
      gender: "男",
      photo: "",
      longTerm: false,
      weekdays: [],
      preferredStall: "",
    });
    setShowAddForm(false);
  };

  return (
    <div style={styles.page}>
      <main style={styles.mainPanel}>
        <div style={styles.calendarHeaderSection}>
          <div style={styles.monthTitle}>{scheduleMonthLabel}</div>
          <div style={styles.calendarSubtitle}>攤位排班</div>
        </div>

        <div style={styles.calendarHeader}>
          {WEEKDAYS.map((day) => (
            <div key={day} style={styles.weekdayCell}>{day}</div>
          ))}
        </div>

        <div style={styles.dateGrid}>
          {Array.from({ length: firstWeekday }).map((_, index) => (
            <div key={`blank-${index}`} style={styles.blankDateCard} />
          ))}
          {scheduleDates.map((date) => {
            const dateKey = getDateKey(date);
            const dayRecords = schedule[dateKey] ?? emptyDayRecords();
            return (
              <div key={dateKey} style={styles.dateCard}>
                <div style={styles.dateTitle}>{formatShortDate(date)}</div>
                <div style={styles.stallGrid}>
                  {STALLS.map((stall) => {
                    const record = dayRecords[stall];
                    const vendor = vendorMap[record.vendorId];
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
                          background: record.status === "occupied" ? "#e7f7ed" : "#ffffff",
                          borderColor: isDragOver ? "#9bbcff" : "#e8e8ef",
                          opacity: record.locked ? 0.95 : 1,
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDesktopDrop(event, dateKey, stall)}
                        onClick={() => handleStallClick(dateKey, stall)}
                      >
                        <div style={styles.stallName}>{stall}</div>
                        {record.status === "occupied" && vendor ? (
                          <>
                            <div 
                              style={{
                                ...styles.vendorAvatarLarge,
                                background: vendor.photo ? "transparent" : vendor.gender === "女" ? "#ffd6e7" : "#d0e8ff",
                              }}
                            >
                              {vendor.photo ? (
                                <img src={vendor.photo} alt="avatar" style={styles.avatarImage} />
                              ) : (
                                <span style={{ color: vendor.gender === "女" ? "#c2006e" : "#0d47a1" }}>
                                  {vendor.contactName.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div style={styles.vendorNameSmall}>{vendor.stallName}</div>
                            <div style={styles.lockIcon}>🔒</div>
                          </>
                        ) : (
                          <div style={styles.stallStatusText}>空</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <aside style={styles.sidebar}>
        <div style={styles.sidebarInner}>
          <div style={styles.sidebarScroll}>
              {showAddForm ? (
                <div style={styles.formContainer}>
                  <div style={styles.sidebarTitle}>新增攤販</div>
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
                  <div style={styles.fieldRow}>
                    <label style={styles.fieldLabel}>
                      性別
                      <select
                        style={styles.select}
                        value={newVendor.gender}
                        onChange={(e) => setNewVendor({ ...newVendor, gender: e.target.value as "男" | "女" })}
                      >
                        <option value="男">男</option>
                        <option value="女">女</option>
                      </select>
                    </label>
                  </div>
                  <label style={styles.fieldLabel}>
                    照片（拍照）
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={styles.fileInput}
                      onChange={handlePhotoChange}
                    />
                  </label>
                  <label style={styles.fieldLabel}>
                    照片（選檔）
                    <input
                      type="file"
                      accept="image/*"
                      style={styles.fileInput}
                      onChange={handlePhotoChange}
                    />
                  </label>
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
                              background: active ? "#007aff" : "#f2f2f7",
                              color: active ? "#fff" : "#333",
                              border: active ? "1px solid #007aff" : "1px solid #c7c7cc",
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
                              background: active ? "#007aff" : "#f2f2f7",
                              color: active ? "#fff" : "#333",
                              border: active ? "1px solid #007aff" : "1px solid #c7c7cc",
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
              ) : (
                <div style={styles.vendorCircleList}>
                  <div style={styles.dragHint}>{dragMessage || "長按攤販卡片開始拖曳"}</div>
                  {vendors.map((vendor) => {
                    const activeBg = vendor.photo ? "transparent" : vendor.gender === "女" ? "#ffd6e7" : "#d0e8ff";
                    return (
                      <div key={vendor.id} style={styles.vendorCircleItem}>
                        <div
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData("text/plain", vendor.id)}
                          onTouchStart={(event) => handleVendorTouchStart(vendor.id, event)}
                          onTouchMove={handleVendorTouchMove}
                          onTouchEnd={handleVendorTouchEnd}
                          onTouchCancel={handleVendorTouchEnd}
                          onClick={() => setActiveVendorActions(activeVendorActions === vendor.id ? null : vendor.id)}
                          style={{
                            ...styles.vendorCircleAvatar,
                            background: activeBg,
                            cursor: "grab",
                            position: "relative",
                          }}
                        >
                          {vendor.photo ? (
                            <img src={vendor.photo} alt="avatar" style={styles.avatarImage} />
                          ) : (
                            <span style={{ color: vendor.gender === "女" ? "#c2006e" : "#0d47a1", fontSize: "18px", fontWeight: 700 }}>
                              {vendor.contactName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div style={styles.vendorCircleLabel}>{vendor.stallName.substring(0, 4)}</div>
                        {activeVendorActions === vendor.id && (
                          <div style={styles.vendorQuickActionsMobile}>
                            <button
                              type="button"
                              style={styles.quickActionButtonMobile}
                              onClick={(event) => {
                                event.stopPropagation();
                                window.location.href = `tel:${vendor.phone}`;
                              }}
                            >
                              📞
                            </button>
                            <button
                              type="button"
                              style={styles.quickActionButtonMobile}
                              onClick={(event) => {
                                event.stopPropagation();
                                alert(vendor.line ? `LINE ID：${vendor.line}` : "沒有 LINE ID");
                              }}
                            >
                              💬
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <button style={styles.addButton} onClick={() => setShowAddForm((prev) => !prev)}>
              {showAddForm ? "← 返回" : "+ 新增"}
            </button>
          </div>
        </aside>
      </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "row",
    background: "#f4f5f7",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    overflow: "hidden",
  },
  mainPanel: {
    width: "87.5vw",
    height: "100vh",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    padding: "10px 14px",
    overflow: "hidden",
  },
  sidebar: {
    width: "12.5vw",
    height: "100vh",
    position: "fixed",
    right: 0,
    top: 0,
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
    borderLeft: "1px solid #e8e8ef",
    overflow: "hidden",
  },
  sidebarInner: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "14px 10px",
    overflow: "hidden",
  },
  sidebarScroll: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    paddingRight: "2px",
  },
  sidebarSection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  sidebarTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#1c1c1e",
  },
  calendarHeaderSection: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "12px",
    flexShrink: 0,
  },
  calendarSubtitle: {
    color: "#6b7280",
    fontSize: "14px",
  },
  calendarHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: "6px",
    flexShrink: 0,
  },
  weekdayCell: {
    textAlign: "center",
    padding: "12px 0",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#334155",
    fontWeight: 700,
    fontSize: "13px",
    boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
  },
  dateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: "8px",
    flex: 1,
    overflowY: "auto",
    paddingBottom: "12px",
    minHeight: 0,
  },
  blankDateCard: {
    height: "240px",
    borderRadius: "18px",
    background: "transparent",
  },
  dateCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "12px",
    boxShadow: "0 10px 20px rgba(15,23,42,0.07)",
    height: "240px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  monthTitle: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: "4px",
  },
  stallName: {
    fontSize: "11px",
    color: "#475569",
    fontWeight: 700,
  },
  stallStatusText: {
    fontSize: "13px",
    color: "#475569",
    fontWeight: 600,
  },
  vendorAvatarLarge: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: "14px",
    fontWeight: 700,
    flexShrink: 0,
  },
  vendorToolCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "16px",
    padding: "10px 10px",
    border: "1px solid #e7e7ef",
    background: "#ffffff",
    cursor: "grab",
    boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
    minHeight: "56px",
  },
  sidebarVendorBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  vendorToolMeta: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#0f172a",
    lineHeight: 1.2,
  },
  vendorQuickActions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    marginTop: "auto",
    width: "100%",
    borderRadius: "18px",
    border: "none",
    background: "#0f75ff",
    color: "white",
    fontSize: "16px",
    fontWeight: 700,
    padding: "12px 0",
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(15,23,42,0.14)",
    flexShrink: 0,
  },
  vendorCircleList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    alignItems: "center",
  },
  vendorCircleItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    position: "relative",
  },
  vendorCircleAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
    cursor: "grab",
  },
  vendorCircleLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#1c1c1e",
    textAlign: "center",
    lineHeight: 1.2,
    maxWidth: "60px",
    wordBreak: "break-word",
  },
  vendorQuickActionsMobile: {
    display: "flex",
    gap: "4px",
    position: "absolute",
    bottom: "-50px",
    flexDirection: "column",
  },
  quickActionButtonMobile: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "none",
    background: "#f2f2f7",
    fontSize: "16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    overflowY: "auto",
  },
  fieldRow: {
    display: "grid",
    gap: "12px",
    marginBottom: "12px",
  },
  fieldLabel: {
    display: "grid",
    gap: "8px",
    fontSize: "14px",
    color: "#1c1c1e",
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #d1d1d6",
    fontSize: "15px",
    background: "#fafafa",
  },
  fileInput: {
    width: "100%",
    padding: "10px 0",
    fontSize: "14px",
  },
  vendorCardCompact: {
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e5e5ea",
    padding: "14px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  vendorCardRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  vendorMetaCompact: {
    display: "grid",
    gap: "4px",
  },
  rentDays: {
    color: "#6b7280",
    fontSize: "13px",
  },
  quickActions: {
    display: "flex",
    gap: "10px",
    marginTop: "8px",
  },
  quickActionButton: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    border: "none",
    background: "#f2f2f7",
    fontSize: "18px",
    cursor: "pointer",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
  },
  dateTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#1c1c1e",
    textAlign: "center",
  },
  stallGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gridTemplateRows: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
    flex: 1,
  },
  stallCell: {
    minHeight: "50px",
    borderRadius: "16px",
    border: "1px solid #e8e8ef",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "8px",
    gap: "4px",
    userSelect: "none",
    touchAction: "manipulation",
    cursor: "pointer",
    position: "relative",
    height: "100%",
    maxHeight: "80px",
  },
  emptyText: {
    fontSize: "14px",
    color: "#8e8e93",
  },
  vendorAvatarSmall: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "#007aff",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontSize: "12px",
    fontWeight: 700,
  },
  vendorNameSmall: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#1c1c1e",
    textAlign: "center",
    lineHeight: 1.2,
  },
  lockIcon: {
    fontSize: "12px",
    position: "absolute",
    top: "2px",
    right: "2px",
  },
  vendorSection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#1c1c1e",
  },
  dragHint: {
    color: "#8e8e93",
    fontSize: "14px",
  },
  vendorList: {
    display: "grid",
    gap: "10px",
  },
  vendorCardHorizontal: {
    display: "flex",
    alignItems: "center",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "16px",
    border: "1px solid #e5e5ea",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    gap: "12px",
    touchAction: "manipulation",
    cursor: "grab",
  },
  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "#007aff",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontSize: "18px",
    fontWeight: 700,
  },
  vendorMeta: {
    display: "grid",
    gap: "2px",
  },
  vendorTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#1c1c1e",
  },
  vendorInfo: {
    fontSize: "14px",
    color: "#8e8e93",
  },
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e5e5ea",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: "16px",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    marginBottom: "12px",
    borderRadius: "12px",
    border: "1px solid #d1d1d6",
    fontSize: "16px",
    background: "#f9f9f9",
  },
  checkboxRow: {
    marginBottom: "12px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "15px",
    color: "#1c1c1e",
  },
  toggleGroup: {
    marginBottom: "16px",
  },
  toggleLabel: {
    marginBottom: "8px",
    color: "#1c1c1e",
    fontSize: "15px",
    fontWeight: 600,
  },
  toggleRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  toggleButton: {
    borderRadius: "12px",
    border: "1px solid #c7c7cc",
    padding: "10px 14px",
    fontSize: "14px",
    cursor: "pointer",
    minWidth: "44px",
    background: "#f2f2f7",
  },
  primaryButton: {
    width: "100%",
    height: "50px",
    borderRadius: "12px",
    border: "none",
    background: "#007aff",
    color: "white",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
  },
  vendorCard: {
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e5e5ea",
    padding: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    marginBottom: "12px",
  },
};

export default App;
