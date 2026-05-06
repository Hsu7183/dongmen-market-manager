import { useEffect, useMemo, useState } from "react";

type Page = "home" | "vendors" | "fees" | "arrears" | "summary";

type Vendor = {
  id: number;
  name: string;
  category: string;
  phone: string;
  defaultFee: number;
  location: string;
};

type RecordItem = {
  vendorId: number;
  attended: boolean;
  paid: boolean;
  amountPaid: number;
  note: string;
};

const vendors: Vendor[] = [
  { id: 1, name: "王老闆", category: "水果攤", phone: "0912-000-001", defaultFee: 500, location: "A1" },
  { id: 2, name: "李小姐", category: "青菜攤", phone: "0912-000-002", defaultFee: 400, location: "A2" },
  { id: 3, name: "陳先生", category: "魚販", phone: "0912-000-003", defaultFee: 600, location: "B1" },
  { id: 4, name: "林太太", category: "熟食攤", phone: "0912-000-004", defaultFee: 450, location: "B2" },
];

const todayKey = `dongmen-records-${new Date().toISOString().slice(0, 10)}`;

function makeDefaultRecords(): RecordItem[] {
  return vendors.map((v) => ({
    vendorId: v.id,
    attended: true,
    paid: false,
    amountPaid: v.defaultFee,
    note: "",
  }));
}

function App() {
  const [page, setPage] = useState<Page>("home");
  const [records, setRecords] = useState<RecordItem[]>(() => {
    const saved = localStorage.getItem(todayKey);
    return saved ? JSON.parse(saved) : makeDefaultRecords();
  });

  useEffect(() => {
    localStorage.setItem(todayKey, JSON.stringify(records));
  }, [records]);

  function updateRecord(vendorId: number, patch: Partial<RecordItem>) {
    setRecords((prev) =>
      prev.map((r) => (r.vendorId === vendorId ? { ...r, ...patch } : r))
    );
  }

  const summary = useMemo(() => {
    const attended = records.filter((r) => r.attended);
    const paid = attended.filter((r) => r.paid);
    const unpaid = attended.filter((r) => !r.paid);

    return {
      attendedCount: attended.length,
      paidTotal: paid.reduce((sum, r) => sum + r.amountPaid, 0),
      unpaidTotal: unpaid.reduce((sum, r) => {
        const vendor = vendors.find((v) => v.id === r.vendorId);
        return sum + (vendor?.defaultFee ?? 0);
      }, 0),
      unpaidCount: unpaid.length,
    };
  }, [records]);

  if (page === "vendors") {
    return (
      <PageShell title="今日攤販" onBack={() => setPage("home")}>
        {vendors.map((vendor) => {
          const record = records.find((r) => r.vendorId === vendor.id)!;
          return (
            <Card key={vendor.id}>
              <div style={styles.cardTitle}>
                {vendor.category} {vendor.name}
              </div>
              <div style={styles.cardSub}>位置：{vendor.location}</div>
              <div style={styles.row}>
                <button
                  style={record.attended ? styles.greenButton : styles.grayButton}
                  onClick={() => updateRecord(vendor.id, { attended: true })}
                >
                  有來
                </button>
                <button
                  style={!record.attended ? styles.redButton : styles.grayButton}
                  onClick={() => updateRecord(vendor.id, { attended: false, paid: false })}
                >
                  沒來
                </button>
              </div>
            </Card>
          );
        })}
      </PageShell>
    );
  }

  if (page === "fees") {
    return (
      <PageShell title="今日收費" onBack={() => setPage("home")}>
        {vendors.map((vendor) => {
          const record = records.find((r) => r.vendorId === vendor.id)!;
          if (!record.attended) return null;

          return (
            <Card key={vendor.id}>
              <div style={styles.cardTitle}>
                {vendor.category} {vendor.name}
              </div>
              <div style={styles.cardSub}>應收：{vendor.defaultFee} 元</div>

              <input
                type="number"
                value={record.amountPaid}
                onChange={(e) =>
                  updateRecord(vendor.id, { amountPaid: Number(e.target.value) })
                }
                style={styles.input}
              />

              <div style={styles.row}>
                <button
                  style={record.paid ? styles.greenButton : styles.grayButton}
                  onClick={() => updateRecord(vendor.id, { paid: true })}
                >
                  已收
                </button>
                <button
                  style={!record.paid ? styles.redButton : styles.grayButton}
                  onClick={() => updateRecord(vendor.id, { paid: false })}
                >
                  未收
                </button>
              </div>

              <input
                value={record.note}
                onChange={(e) => updateRecord(vendor.id, { note: e.target.value })}
                placeholder="備註，例如：明天補"
                style={styles.input}
              />
            </Card>
          );
        })}
      </PageShell>
    );
  }

  if (page === "arrears") {
    const arrears = vendors.filter((vendor) => {
      const record = records.find((r) => r.vendorId === vendor.id)!;
      return record.attended && !record.paid;
    });

    return (
      <PageShell title="欠款清單" onBack={() => setPage("home")}>
        {arrears.length === 0 && <Card>目前沒有欠款</Card>}

        {arrears.map((vendor) => {
          const record = records.find((r) => r.vendorId === vendor.id)!;
          return (
            <Card key={vendor.id}>
              <div style={styles.cardTitle}>
                {vendor.category} {vendor.name}
              </div>
              <div style={styles.cardSub}>未收：{vendor.defaultFee} 元</div>
              {record.note && <div style={styles.note}>備註：{record.note}</div>}
              <button
                style={styles.greenFullButton}
                onClick={() => updateRecord(vendor.id, { paid: true })}
              >
                補收完成
              </button>
            </Card>
          );
        })}
      </PageShell>
    );
  }

  if (page === "summary") {
    return (
      <PageShell title="月結統計" onBack={() => setPage("home")}>
        <Card>
          <div style={styles.bigNumber}>{summary.paidTotal} 元</div>
          <div style={styles.cardSub}>今日已收金額</div>
        </Card>

        <Card>
          <div style={styles.bigNumber}>{summary.unpaidTotal} 元</div>
          <div style={styles.cardSub}>今日未收金額</div>
        </Card>

        <Card>
          <div style={styles.bigNumber}>{summary.attendedCount} 攤</div>
          <div style={styles.cardSub}>今日出攤數</div>
        </Card>

        <Card>
          <div style={styles.bigNumber}>{summary.unpaidCount} 攤</div>
          <div style={styles.cardSub}>尚未收款</div>
        </Card>
      </PageShell>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>東門市場家庭管理系統</h1>

      <div style={styles.grid}>
        <button style={styles.mainButton} onClick={() => setPage("vendors")}>
          今日攤販
        </button>
        <button style={styles.mainButton} onClick={() => setPage("fees")}>
          今日收費
        </button>
        <button style={styles.mainButton} onClick={() => setPage("arrears")}>
          欠款清單
        </button>
        <button style={styles.mainButton} onClick={() => setPage("summary")}>
          月結統計
        </button>
      </div>

      <div style={styles.footer}>資料會自動儲存在這台裝置</div>
    </div>
  );
}

function PageShell({
  title,
  children,
  onBack,
}: {
  title: string;
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div style={styles.page}>
      <button style={styles.backButton} onClick={onBack}>
        ← 返回首頁
      </button>
      <h1 style={styles.title}>{title}</h1>
      <div style={styles.list}>{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={styles.card}>{children}</div>;
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f5f5",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },
  title: {
    fontSize: "32px",
    textAlign: "center",
    margin: "20px 0 30px",
    color: "#222",
  },
  grid: {
    display: "grid",
    gap: "20px",
    maxWidth: "520px",
    margin: "0 auto",
  },
  mainButton: {
    height: "90px",
    fontSize: "28px",
    borderRadius: "20px",
    border: "none",
    background: "#1976d2",
    color: "white",
    fontWeight: "bold",
  },
  backButton: {
    height: "56px",
    fontSize: "22px",
    borderRadius: "16px",
    border: "none",
    background: "#444",
    color: "white",
    padding: "0 20px",
    fontWeight: "bold",
  },
  list: {
    display: "grid",
    gap: "16px",
    maxWidth: "620px",
    margin: "0 auto",
  },
  card: {
    background: "white",
    padding: "20px",
    borderRadius: "18px",
    fontSize: "22px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  cardTitle: {
    fontSize: "26px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  cardSub: {
    fontSize: "22px",
    color: "#555",
    marginBottom: "14px",
  },
  note: {
    fontSize: "20px",
    color: "#777",
    marginBottom: "14px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "14px",
  },
  greenButton: {
    height: "64px",
    fontSize: "24px",
    borderRadius: "16px",
    border: "none",
    background: "#2e7d32",
    color: "white",
    fontWeight: "bold",
  },
  redButton: {
    height: "64px",
    fontSize: "24px",
    borderRadius: "16px",
    border: "none",
    background: "#c62828",
    color: "white",
    fontWeight: "bold",
  },
  grayButton: {
    height: "64px",
    fontSize: "24px",
    borderRadius: "16px",
    border: "none",
    background: "#ddd",
    color: "#333",
    fontWeight: "bold",
  },
  greenFullButton: {
    width: "100%",
    height: "64px",
    fontSize: "24px",
    borderRadius: "16px",
    border: "none",
    background: "#2e7d32",
    color: "white",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    height: "56px",
    fontSize: "22px",
    borderRadius: "14px",
    border: "1px solid #ccc",
    padding: "0 12px",
    boxSizing: "border-box",
    marginBottom: "12px",
  },
  bigNumber: {
    fontSize: "36px",
    fontWeight: "bold",
    color: "#1976d2",
    marginBottom: "8px",
  },
  footer: {
    textAlign: "center",
    marginTop: "30px",
    color: "#777",
    fontSize: "18px",
  },
};

export default App;