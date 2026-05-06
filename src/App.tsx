import { useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import TodayVendors from "./pages/TodayVendors";

<<<<<<< Updated upstream
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
  arrived: "已出租有來",
  noShow: "預約沒來",
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
  {
    id: "v3",
    stallName: "陳記熟食",
    contactName: "陳先生",
    phone: "0912-000-003",
    line: "chenfood",
    product: "熟食",
    longTerm: true,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    preferredStall: "B1",
  },
];

const emptyDayRecords = (): DayRecords => ({
  A1: { status: "empty", vendorId: "", note: "" },
  A2: { status: "empty", vendorId: "", note: "" },
  B1: { status: "empty", vendorId: "", note: "" },
  B2: { status: "empty", vendorId: "", note: "" },
});

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDate = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAYS[date.getDay()]}）`;
};

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

function App() {
  const [page, setPage] = useState<Page>("calendar");
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [vendors, setVendors] = useState<Vendor[]>(() =>
    loadJson("dongmen-vendors-v2", defaultVendors)
  );
  const [schedule, setSchedule] = useState<ScheduleMap>(() =>
    loadJson("dongmen-schedule-v2", {})
  );
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
    localStorage.setItem("dongmen-vendors-v2", JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem("dongmen-schedule-v2", JSON.stringify(schedule));
  }, [schedule]);

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + index);
      return date;
    });
  }, []);

  const selectedDayRecords = schedule[selectedDate] ?? emptyDayRecords();

  function updateStall(dateKey: string, stall: StallId, patch: Partial<StallRecord>) {
    setSchedule((prev) => {
      const currentDay = prev[dateKey] ?? emptyDayRecords();
      return {
        ...prev,
        [dateKey]: {
          ...currentDay,
          [stall]: {
            ...currentDay[stall],
            ...patch,
          },
        },
      };
    });
  }

  function addVendor() {
    if (!newVendor.stallName.trim() || !newVendor.contactName.trim()) {
      alert("請至少輸入攤販名稱與聯絡人姓名");
      return;
    }

    const vendor: Vendor = {
      id: `v-${Date.now()}`,
      ...newVendor,
    };

    setVendors((prev) => [vendor, ...prev]);
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

  function toggleWeekday(day: number) {
    setNewVendor((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(day)
        ? prev.weekdays.filter((item) => item !== day)
        : [...prev.weekdays, day],
    }));
  }

  function getCallList(dateKey: string, stall: StallId) {
    const date = new Date(`${dateKey}T00:00:00`);
    const weekday = date.getDay();
    return vendors.filter(
      (vendor) =>
        vendor.weekdays.includes(weekday) || vendor.preferredStall === stall
    );
  }

  if (page === "vendors") {
    return (
      <Shell title="攤販名單" onBack={() => setPage("calendar")}>
        <Card>
          <div style={styles.sectionTitle}>新增攤販</div>
          <TextInput label="攤販名稱" value={newVendor.stallName} onChange={(value) => setNewVendor({ ...newVendor, stallName: value })} />
          <TextInput label="聯絡人姓名" value={newVendor.contactName} onChange={(value) => setNewVendor({ ...newVendor, contactName: value })} />
          <TextInput label="手機門號" value={newVendor.phone} onChange={(value) => setNewVendor({ ...newVendor, phone: value })} />
          <TextInput label="LINE" value={newVendor.line} onChange={(value) => setNewVendor({ ...newVendor, line: value })} />
          <TextInput label="賣什麼" value={newVendor.product} onChange={(value) => setNewVendor({ ...newVendor, product: value })} />

          <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={newVendor.longTerm}
              onChange={(event) => setNewVendor({ ...newVendor, longTerm: event.target.checked })}
            />
            長租攤位
          </label>

          <div style={styles.formLabel}>常用星期</div>
          <div style={styles.weekGrid}>
            {WEEKDAYS.map((label, index) => (
              <button
                key={label}
                style={newVendor.weekdays.includes(index) ? styles.smallActiveButton : styles.smallButton}
                onClick={() => toggleWeekday(index)}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={styles.formLabel}>常用攤位</div>
          <select
            style={styles.input}
            value={newVendor.preferredStall}
            onChange={(event) => setNewVendor({ ...newVendor, preferredStall: event.target.value as StallId | "" })}
          >
            <option value="">未指定</option>
            {STALLS.map((stall) => (
              <option key={stall} value={stall}>{stall}</option>
            ))}
          </select>

          <button style={styles.primaryButton} onClick={addVendor}>新增攤販</button>
        </Card>

        {vendors.map((vendor) => (
          <Card key={vendor.id}>
            <div style={styles.cardTitle}>{vendor.stallName}</div>
            <div style={styles.cardText}>聯絡人：{vendor.contactName}</div>
            <div style={styles.cardText}>手機：{vendor.phone || "未填"}</div>
            <div style={styles.cardText}>LINE：{vendor.line || "未填"}</div>
            <div style={styles.cardText}>商品：{vendor.product || "未填"}</div>
            <div style={styles.cardText}>常用星期：{vendor.weekdays.map((day) => WEEKDAYS[day]).join("、") || "未填"}</div>
            <div style={styles.cardText}>常用攤位：{vendor.preferredStall || "未指定"}</div>
            <div style={vendor.longTerm ? styles.blueTag : styles.grayTag}>{vendor.longTerm ? "長租" : "短租/臨租"}</div>
          </Card>
        ))}
      </Shell>
    );
  }

  if (page === "day") {
    return (
      <Shell title={`${formatDate(selectedDate)} 攤位管理`} onBack={() => setPage("calendar")}>
        {STALLS.map((stall) => {
          const record = selectedDayRecords[stall];
          const callList = record.status === "empty" ? getCallList(selectedDate, stall) : [];

          return (
            <Card key={stall}>
              <div style={styles.stallHeader}>
                <div style={styles.stallName}>{stall}</div>
                <StatusDot status={record.status} />
              </div>

              <div style={styles.formLabel}>狀態</div>
              <select
                style={styles.input}
                value={record.status}
                onChange={(event) => updateStall(selectedDate, stall, { status: event.target.value as StallStatus })}
              >
                {Object.entries(STATUS_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <div style={styles.formLabel}>指定攤販</div>
              <select
                style={styles.input}
                value={record.vendorId}
                onChange={(event) => updateStall(selectedDate, stall, { vendorId: event.target.value })}
              >
                <option value="">未指定</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>{vendor.stallName}｜{vendor.contactName}</option>
                ))}
              </select>

              <TextInput
                label="備註"
                value={record.note}
                onChange={(value) => updateStall(selectedDate, stall, { note: value })}
              />

              {callList.length > 0 && (
                <div style={styles.callBox}>
                  <div style={styles.sectionTitle}>可聯絡攤販</div>
                  {callList.map((vendor) => (
                    <div key={vendor.id} style={styles.callItem}>
                      <div style={styles.callName}>{vendor.stallName}｜{vendor.product}</div>
                      <div>聯絡人：{vendor.contactName}</div>
                      <div>手機：{vendor.phone || "未填"}</div>
                      <div>LINE：{vendor.line || "未填"}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </Shell>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>東門市場家庭管理系統</h1>
      <div style={styles.topActions}>
        <button style={styles.primaryButton} onClick={() => setPage("calendar")}>月曆</button>
        <button style={styles.secondaryButton} onClick={() => setPage("vendors")}>攤販名單</button>
      </div>
      <div style={styles.legend}>
        <Legend status="empty" label="空位" />
        <Legend status="reserved" label="預約" />
        <Legend status="arrived" label="已出租" />
        <Legend status="noShow" label="沒來" />
        <Legend status="longTerm" label="長租" />
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
              <div style={styles.dayNumber}>{date.getMonth() + 1}/{date.getDate()}</div>
              <div style={styles.weekText}>{WEEKDAYS[date.getDay()]}</div>
              <div style={styles.dotsRow}>
                {STALLS.map((stall) => (
                  <StatusDot key={stall} status={records[stall].status} small />
                ))}
              </div>
              <div style={styles.stallLabels}>A1 A2 B1 B2</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Shell({ title, children, onBack }: { title: string; children: React.ReactNode; onBack: () => void }) {
  return (
    <div style={styles.page}>
      <button style={styles.backButton} onClick={onBack}>← 返回月曆</button>
      <h1 style={styles.title}>{title}</h1>
      <div style={styles.list}>{children}</div>
    </div>
  );
=======
type StallStatus = "empty" | "rented" | "noshow" | "reserved" | "longterm";

interface DayData {
  date: Date;
  stallStatus: Record<string, StallStatus>;
}

const STALL_IDS = ["A1", "A2", "B1", "B2"];

// 生成 Mock 数据 - 为42天生成随机摊位状态
function generateMockData(): Map<string, DayData> {
  const dataMap = new Map<string, DayData>();
  const today = new Date();
  
  for (let i = 0; i < 42; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const stallStatus: Record<string, StallStatus> = {};
    const statuses: StallStatus[] = ["empty", "rented", "noshow", "reserved", "longterm"];
    
    STALL_IDS.forEach((stallId) => {
      stallStatus[stallId] = statuses[Math.floor(Math.random() * statuses.length)];
    });
    
    dataMap.set(dateStr, {
      date,
      stallStatus,
    });
  }
  
  return dataMap;
}

const mockData = generateMockData();

function Calendar() {
  const navigate = useNavigate();

  const calendarDays = useMemo(() => {
    const days: DayData[] = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = mockData.get(dateStr);
      if (dayData) {
        days.push(dayData);
      }
    }
    
    return days;
  }, []);

  const handleDateClick = (_date: Date) => {
    navigate('/today');
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>東門市場 4 攤位排班租位系統 v2</h1>
      
      <div style={styles.calendarGrid}>
        {calendarDays.map((dayData) => {
          const date = dayData.date;
          const weekDayName = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
          const dateStr = date.toISOString().split('T')[0];
          
          return (
            <div
              key={dateStr}
              style={styles.dayCard}
              onClick={() => handleDateClick(date)}
            >
              <div style={styles.dateHeader}>
                <div style={styles.dayNumber}>{date.getMonth() + 1}/{date.getDate()}</div>
                <div style={styles.weekDay}>{weekDayName}</div>
              </div>
              
              <div style={styles.stallsContainer}>
                {STALL_IDS.map((stallId) => {
                  const status = dayData.stallStatus[stallId];
                  const stallColor = getColorForStatus(status);
                  
                  return (
                    <div
                      key={stallId}
                      style={{
                        ...styles.stallDot,
                        backgroundColor: stallColor,
                      }}
                      title={`${stallId}: ${getStatusText(status)}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Calendar />} />
        <Route path="/today" element={<TodayVendors />} />
      </Routes>
    </Router>
  );
}

// 获取状态文本
function getStatusText(status: StallStatus): string {
  const statusMap: Record<StallStatus, string> = {
    empty: "空位",
    rented: "已出租",
    noshow: "預約沒來",
    reserved: "已預約",
    longterm: "長租",
  };
  return statusMap[status];
>>>>>>> Stashed changes
}

// 获取状态对应的颜色
function getColorForStatus(status: StallStatus): string {
  const colorMap: Record<StallStatus, string> = {
    empty: "#ffffff",        // 白色
    rented: "#2e7d32",      // 绿色
    noshow: "#c62828",      // 红色
    reserved: "#f9a825",    // 黄色
    longterm: "#1976d2",    // 蓝色
  };
  return colorMap[status];
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={styles.labelBlock}>
      <div style={styles.formLabel}>{label}</div>
      <input style={styles.input} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function StatusDot({ status, small = false }: { status: StallStatus; small?: boolean }) {
  return (
    <span
      title={STATUS_LABEL[status]}
      style={{
        width: small ? 18 : 28,
        height: small ? 18 : 28,
        borderRadius: "50%",
        display: "inline-block",
        background: STATUS_COLOR[status],
        border: status === "empty" ? "2px solid #bdbdbd" : "2px solid transparent",
      }}
    />
  );
}

function Legend({ status, label }: { status: StallStatus; label: string }) {
  return (
    <div style={styles.legendItem}>
      <StatusDot status={status} small />
      <span>{label}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f5f5",
<<<<<<< Updated upstream
    padding: "18px",
=======
    padding: "16px",
    fontFamily: "Arial, sans-serif",
>>>>>>> Stashed changes
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  },
  title: {
<<<<<<< Updated upstream
    fontSize: "30px",
    textAlign: "center",
    margin: "18px 0 20px",
    color: "#222",
  },
  topActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    maxWidth: "620px",
    margin: "0 auto 16px",
  },
  primaryButton: {
    height: "64px",
    fontSize: "24px",
    borderRadius: "16px",
    border: "none",
    background: "#1976d2",
    color: "#fff",
    fontWeight: "bold",
  },
  secondaryButton: {
    height: "64px",
    fontSize: "24px",
    borderRadius: "16px",
    border: "none",
    background: "#455a64",
    color: "#fff",
    fontWeight: "bold",
  },
  backButton: {
    height: "56px",
    fontSize: "22px",
    borderRadius: "16px",
    border: "none",
    background: "#444",
    color: "#fff",
    padding: "0 18px",
    fontWeight: "bold",
  },
  legend: {
    maxWidth: "620px",
    margin: "0 auto 16px",
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "center",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "16px",
    background: "#fff",
    padding: "6px 10px",
    borderRadius: "999px",
  },
  calendarGrid: {
    maxWidth: "760px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
  },
  dayCard: {
    minHeight: "118px",
    background: "#fff",
    border: "none",
    borderRadius: "18px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    padding: "12px",
    textAlign: "left",
  },
  dayNumber: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#222",
  },
  weekText: {
    fontSize: "18px",
    color: "#666",
    marginBottom: "10px",
  },
  dotsRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  stallLabels: {
    fontSize: "13px",
    color: "#777",
    marginTop: "7px",
    letterSpacing: "3px",
  },
  list: {
    display: "grid",
    gap: "16px",
    maxWidth: "680px",
    margin: "0 auto",
  },
  card: {
    background: "#fff",
    padding: "18px",
    borderRadius: "18px",
    fontSize: "20px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  sectionTitle: {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "14px",
  },
  cardTitle: {
    fontSize: "25px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  cardText: {
    fontSize: "19px",
    marginBottom: "6px",
    color: "#333",
  },
  formLabel: {
    fontSize: "19px",
    fontWeight: "bold",
    margin: "10px 0 6px",
  },
  labelBlock: {
    display: "block",
  },
  input: {
    width: "100%",
    height: "54px",
    fontSize: "20px",
    borderRadius: "14px",
    border: "1px solid #cfcfcf",
    padding: "0 12px",
    boxSizing: "border-box",
    marginBottom: "10px",
    background: "#fff",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "21px",
    marginTop: "8px",
  },
  weekGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "6px",
    marginBottom: "12px",
  },
  smallButton: {
    height: "44px",
    fontSize: "18px",
    borderRadius: "12px",
    border: "1px solid #ccc",
    background: "#eee",
  },
  smallActiveButton: {
    height: "44px",
    fontSize: "18px",
    borderRadius: "12px",
    border: "none",
    background: "#1976d2",
    color: "white",
    fontWeight: "bold",
  },
  stallHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stallName: {
    fontSize: "30px",
    fontWeight: "bold",
  },
  callBox: {
    marginTop: "16px",
    background: "#fff8e1",
    borderRadius: "16px",
    padding: "12px",
  },
  callItem: {
    borderTop: "1px solid #eadca0",
    paddingTop: "10px",
    marginTop: "10px",
    fontSize: "18px",
  },
  callName: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "4px",
  },
  blueTag: {
    display: "inline-block",
    background: "#1e88e5",
    color: "#fff",
    borderRadius: "999px",
    padding: "6px 12px",
    marginTop: "8px",
    fontSize: "17px",
    fontWeight: "bold",
  },
  grayTag: {
    display: "inline-block",
    background: "#e0e0e0",
    color: "#333",
    borderRadius: "999px",
    padding: "6px 12px",
    marginTop: "8px",
    fontSize: "17px",
    fontWeight: "bold",
=======
    fontSize: "24px",
    textAlign: "center",
    margin: "16px 0 20px",
    color: "#222",
    fontWeight: "bold",
  },
  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
    width: "100%",
    margin: "0 auto",
  },
  dayCard: {
    background: "white",
    padding: "8px 4px",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    userSelect: "none",
    minHeight: "80px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  dateHeader: {
    textAlign: "center",
    marginBottom: "4px",
  },
  dayNumber: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#222",
    lineHeight: "1",
  },
  weekDay: {
    fontSize: "10px",
    color: "#666",
    marginTop: "2px",
  },
  stallsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "4px",
  },
  stallDot: {
    width: "100%",
    aspectRatio: "1",
    borderRadius: "4px",
    border: "1px solid #ddd",
    cursor: "pointer",
    transition: "transform 0.2s",
>>>>>>> Stashed changes
  },
};

export default App;
