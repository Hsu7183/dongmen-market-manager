function TodayVendors() {
  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: "32px" }}>
        今日攤販
      </h1>

      <div
        style={{
          marginTop: "20px",
          display: "grid",
          gap: "15px",
        }}
      >
        <div style={cardStyle}>
          🍎 水果攤 王老闆
        </div>

        <div style={cardStyle}>
          🥬 青菜攤 李小姐
        </div>

        <div style={cardStyle}>
          🐟 魚販 陳先生
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "16px",
  fontSize: "24px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

export default TodayVendors;