import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- Firebase 初始化配置 ---
const firebaseConfig = {
  apiKey: "AIzaSyARVVuOfxBRx5BfQ0oEY7bfjuA_DmQQBV0",
  authDomain: "mfgoutput.firebaseapp.com",
  projectId: "mfgoutput",
  storageBucket: "mfgoutput.firebasestorage.app",
  messagingSenderId: "251776937464",
  appId: "1:251776937464:web:63f08c2e1e9edaa2c5fa0d",
  measurementId: "G-7TWGHT1FNZ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const docRef = doc(db, "mfg_data", "main_config");

// --- 全域變數定義 ---
window.currentUser = null;
window.logoUrl = "";
window.chartInstances = {};

const defaultColumns1 = [
  { key: "month", title: "月份/時間" },
  { key: "item_0", title: "石墨產出市值(NT$)" },
  { key: "item_1", title: "石墨產出數量(PCS)" },
  { key: "item_6", title: "合計產出市值(NT$)" },
  { key: "item_7", title: "合計產出數量(PCS)" },
  { key: "item_12", title: "刀具費/產值" },
  { key: "item_14", title: "報廢/產值" },
  { key: "item_10", title: "加班費/產值" }
];

const defaultColumns2 = [
  { key: "month", title: "月份/時間" },
  { key: "c1", title: "鎢鉬鉭刀具費" },
  { key: "c2", title: "鎢鉬鉭刀具費/成本" },
  { key: "c3", title: "鎢鉬鉭產品成本" },
  { key: "c4", title: "石墨刀具費" },
  { key: "c5", title: "石墨刀具費/成本" },
  { key: "c6", title: "石墨產品成本" },
  { key: "c7", title: "其他刀具費" },
  { key: "c8", title: "其他刀具費/成本" },
  { key: "c9", title: "其他產品成本" }
];

window.sheets = [
  { id: "s1", name: "產能量能分析", columns: JSON.parse(JSON.stringify(defaultColumns1)), data: [] },
  { id: "s2", name: "刀具費佔成本", columns: JSON.parse(JSON.stringify(defaultColumns2)), data: [] }
];
window.activeSheetId = "s1";

window.sheet1ChartConfigs = [
  { id: "s1_chart_1", title: "📈 合計產出市值(NT$) / 產出數量(PCS) 趨勢圖", type: "combo" },
  { id: "s1_chart_2", title: "📊 報廢/產值 分析圖", type: "line", dataKey: "報廢/產值" },
  { id: "s1_chart_3", title: "📊 刀具費/產值 分析圖", type: "line", dataKey: "刀具費/產值" },
  { id: "s1_chart_4", title: "📊 加班費/產值 分析圖", type: "line", dataKey: "加班費/產值" }
];

window.sheet2ChartConfigs = [
  { id: "s2_chart_1", title: "鎢鉬鉭刀具費金額與佔比趨勢圖", type: "combo_bar_line", barKey: "鎢鉬鉭刀具費", lineKey: "鎢鉬鉭刀具費/成本" },
  { id: "s2_chart_2", title: "鎢鉬鉭刀具費與成本趨勢圖", type: "double_line", line1Key: "鎢鉬鉭刀具費", line2Key: "鎢鉬鉭產品成本" },
  { id: "s2_chart_3", title: "石墨刀具費金額與佔比趨勢圖", type: "combo_bar_line", barKey: "石墨刀具費", lineKey: "石墨刀具費/成本" },
  { id: "s2_chart_4", title: "石墨刀具費與成本趨勢圖", type: "double_line", line1Key: "石墨刀具費", line2Key: "石墨產品成本" },
  { id: "s2_chart_5", title: "其他刀具費金額與佔比趨勢圖", type: "combo_bar_line", barKey: "其他刀具費", lineKey: "其他刀具費/成本" },
  { id: "s2_chart_6", title: "其他刀具費與成本趨勢圖", type: "double_line", line1Key: "其他刀具費", line2Key: "其他產品成本" }
];

// --- Auth 狀態監聽 ---
onAuthStateChanged(auth, (user) => {
  window.currentUser = user;
  const authBtn = document.getElementById('auth-btn');
  const authBtnText = document.getElementById('auth-btn-text');
  const name = document.getElementById('user-name');
  const emailText = document.getElementById('user-email-text');
  const addBtn = document.getElementById('btn-add-tab');
  const importBtn = document.getElementById('btn-import-excel');

  if (user) {
    authBtnText.innerText = "登出";
    authBtn.className = "btn btn-danger";
    emailText.innerText = user.email;
    name.style.display = "inline-block";

    addBtn.disabled = false;
    importBtn.classList.remove('disabled');
  } else {
    authBtnText.innerText = "管理員登入";
    authBtn.className = "btn btn-light";
    name.style.display = "none";

    addBtn.disabled = true;
    importBtn.classList.add('disabled');
  }
  
  window.renderTabs();
  window.renderMainContent();
});

document.getElementById('auth-btn').addEventListener('click', () => {
  if (window.currentUser) {
    signOut(auth).then(() => alert('已成功登出！'));
  } else {
    document.getElementById('login-modal').style.display = 'flex';
  }
});

document.getElementById('do-login-btn').addEventListener('click', () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) return alert('請輸入 Email 與密碼！');

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      window.closeLoginModal();
      alert('登入成功！已解除編輯鎖定。');
    })
    .catch(error => {
      console.error("登入失敗:", error);
      alert('登入失敗：' + error.message);
    });
});

window.closeLoginModal = function() {
  document.getElementById('login-modal').style.display = 'none';
  document.getElementById('login-password').value = '';
};

// --- Firebase 資料同步 ---
window.saveToFirebase = async function() {
  if (!window.currentUser) {
    alert("權限不足！請先點擊右上角「管理員登入」再進行資料修改。");
    return;
  }

  try {
    const statusEl = document.getElementById('firebase-status');
    if (statusEl) { statusEl.className = 'status-badge loading'; statusEl.innerText = '● Firebase 儲存中...'; }
    
    await setDoc(docRef, {
      sheets: window.sheets,
      logoUrl: window.logoUrl,
      updatedAt: new Date().toISOString()
    });

    if (statusEl) { statusEl.className = 'status-badge success'; statusEl.innerText = '● Firebase 已連線同步'; }
  } catch (e) {
    console.error("Firebase 寫入失敗:", e);
    alert("資料同步失敗，請確認帳號權限！");
  }
};

onSnapshot(docRef, (docSnap) => {
  const statusEl = document.getElementById('firebase-status');
  if (statusEl) { 
    statusEl.className = window.currentUser ? 'status-badge success' : 'status-badge read-only'; 
    statusEl.innerText = window.currentUser ? '● Firebase 已連線 (管理員權限)' : '● Firebase 唯讀模式 (未登入)'; 
  }

  if (docSnap.exists()) {
    const data = docSnap.data();
    if (data.sheets && Array.isArray(data.sheets)) {
      window.sheets = data.sheets.map(s => ({
        id: s.id,
        name: s.name,
        columns: s.columns ? JSON.parse(JSON.stringify(s.columns)) : JSON.parse(JSON.stringify(defaultColumns1)),
        data: s.data || []
      }));
    }
    if (data.logoUrl !== undefined) {
      window.logoUrl = data.logoUrl;
      window.renderLogo();
    }
  }
  
  window.renderTabs();
  window.renderMainContent();
});

// --- Excel 檔案解析 ---
document.getElementById('upload-excel').addEventListener('change', function(e) {
  if (!window.currentUser) return alert('請先登入管理員帳號後再進行匯入！');
  
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "-" });

      if (rawData.length === 0) return alert('Excel 檔案無資料！');

      const firstCell = String(rawData[0][0]).trim();
      let parsedColumns = [];
      let parsedData = [];

      if (firstCell === "項目" || firstCell.includes("項目")) {
        const itemNames = [];
        for (let i = 1; i < rawData.length; i++) {
          const name = rawData[i][0] ? String(rawData[i][0]).trim() : `欄位_${i}`;
          if (name && name !== "-") itemNames.push(name);
        }

        parsedColumns = [
          { key: "month", title: "月份/時間" },
          ...itemNames.map((name, idx) => ({ key: `item_${idx}`, title: name }))
        ];

        const headerRow = rawData[0];
        for (let colIdx = 1; colIdx < headerRow.length; colIdx++) {
          const monthName = headerRow[colIdx];
          if (!monthName || monthName === "-") continue;

          const rowData = { month: monthName };
          itemNames.forEach((_, itemIdx) => {
            const val = (rawData[itemIdx + 1] && rawData[itemIdx + 1][colIdx] !== undefined)
              ? rawData[itemIdx + 1][colIdx]
              : "-";
            rowData[`item_${itemIdx}`] = val;
          });
          parsedData.push(rowData);
        }
      } else {
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "-" });
        parsedColumns = Object.keys(rawJson[0]).map(h => ({ key: h, title: h }));
        parsedData = rawJson;
      }

      const targetIndex = window.sheets.findIndex(s => s.id === window.activeSheetId);
      if (targetIndex !== -1) {
        window.sheets[targetIndex].columns = parsedColumns;
        window.sheets[targetIndex].data = parsedData;
        
        window.saveToFirebase();
        window.renderMainContent();
      } else {
        alert('找不到目前選取的工作表，匯入失敗！');
      }

    } catch (err) {
      console.error(err);
      alert('解析 Excel 失敗！');
    }
    e.target.value = '';
  };
  reader.readAsArrayBuffer(file);
});

// --- UI 渲染與事件綁定 (掛載到 window) ---
window.renderLogo = function() {
  const logoBox = document.getElementById('logo-box');
  if (!logoBox) return;
  if (window.logoUrl && window.logoUrl.trim() !== '') {
    logoBox.innerHTML = `<img src="${window.logoUrl}" alt="Logo" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fa-solid fa-chart-line\\'></i>';" />`;
  } else {
    logoBox.innerHTML = `<i class="fa-solid fa-chart-line" id="logo-icon"></i>`;
  }
};

window.changeLogoUrl = function() {
  if (!window.currentUser) return alert('請登入管理員帳號後再更換 Logo！');
  const inputUrl = prompt("請輸入 Logo 圖示的圖片網址 (URL)：\n(清空則回復為預設圖示)", window.logoUrl || "");
  if (inputUrl !== null) {
    window.logoUrl = inputUrl.trim();
    window.renderLogo();
    if (window.saveToFirebase) window.saveToFirebase();
  }
};

window.renderTabs = function() {
  const container = document.getElementById('sheet-tabs-list');
  if (!container) return;
  let html = '';
  const isLogined = !!window.currentUser;

  window.sheets.forEach(s => {
    const isActive = s.id === window.activeSheetId ? 'active' : '';
    html += `
      <div class="tab-item ${isActive}" onclick="switchTab('${s.id}')">
        <div>
          <i class="fa-solid fa-table" style="margin-right: 6px;"></i>
          <span id="sheet-title-${s.id}" ${isLogined ? `ondblclick="editSheetName('${s.id}')"` : ''}>${s.name}</span>
        </div>
        <div>
          ${isLogined ? `<i class="fa-solid fa-pen-to-square tab-edit-icon" title="修改名稱" onclick="event.stopPropagation(); editSheetName('${s.id}');"></i>` : ''}
          ${(window.sheets.length > 1 && isLogined) ? `<i class="fa-solid fa-xmark tab-delete-btn" title="刪除工作表" onclick="deleteSheet(event, '${s.id}')"></i>` : ''}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
};

window.switchTab = function(sheetId) {
  window.activeSheetId = sheetId;
  window.renderTabs();
  window.renderMainContent();
};

window.editSheetName = function(sheetId) {
  if (!window.currentUser) return;
  const targetSheet = window.sheets.find(s => s.id === sheetId);
  const newName = prompt("請輸入新的工作表名稱：", targetSheet?.name || "");
  if (newName && newName.trim() !== "") {
    targetSheet.name = newName.trim();
    if (window.saveToFirebase) window.saveToFirebase();
    window.renderTabs();
    window.renderMainContent();
  }
};

window.addNewSheet = function() {
  if (!window.currentUser) return alert('請登入管理員帳號後再進行編輯！');
  const newId = `s_${Date.now()}`;
  const newName = `工作表${window.sheets.length + 1}`;
  
  const defaultCols = [
    { key: "month", title: "月份/時間" },
    { key: "col_1", title: "項目一" },
    { key: "col_2", title: "項目二" }
  ];

  window.sheets.push({ id: newId, name: newName, columns: defaultCols, data: [] });
  window.activeSheetId = newId;
  if (window.saveToFirebase) window.saveToFirebase();
  window.renderTabs();
  window.renderMainContent();
};

window.deleteSheet = function(e, sheetId) {
  e.stopPropagation();
  if (!window.currentUser) return alert('請登入管理員帳號後再進行編輯！');
  if (window.sheets.length <= 1) return alert('至少需保留一個工作表！');
  if (confirm('確定要刪除此工作表嗎？')) {
    window.sheets = window.sheets.filter(s => s.id !== sheetId);
    if (window.activeSheetId === sheetId) {
      window.activeSheetId = window.sheets[0].id;
    }
    if (window.saveToFirebase) window.saveToFirebase();
    window.renderTabs();
    window.renderMainContent();
  }
};

window.addRow = function() {
  if (!window.currentUser) return alert('請先登入管理員帳號！');
  const curSheet = window.sheets.find(s => s.id === window.activeSheetId);
  if (!curSheet) return;

  const newRow = {};
  (curSheet.columns || []).forEach(col => newRow[col.key] = "-");
  curSheet.data.push(newRow);

  if (window.saveToFirebase) window.saveToFirebase();
  window.renderMainContent();
};

window.deleteRow = function() {
  if (!window.currentUser) return alert('請先登入管理員帳號！');
  const curSheet = window.sheets.find(s => s.id === window.activeSheetId);
  if (!curSheet || curSheet.data.length === 0) return;

  curSheet.data.pop();
  if (window.saveToFirebase) window.saveToFirebase();
  window.renderMainContent();
};

window.addColumn = function() {
  if (!window.currentUser) return alert('請先登入管理員帳號！');
  const curSheet = window.sheets.find(s => s.id === window.activeSheetId);
  if (!curSheet) return;

  const colName = prompt("請輸入新增欄位名稱：", "新欄位");
  if (!colName || colName.trim() === "") return;

  const newKey = `custom_col_${Date.now()}`;
  curSheet.columns.push({ key: newKey, title: colName.trim() });
  curSheet.data.forEach(row => { row[newKey] = "-"; });

  if (window.saveToFirebase) window.saveToFirebase();
  window.renderMainContent();
};

window.deleteColumn = function() {
  if (!window.currentUser) return alert('請先登入管理員帳號！');
  const curSheet = window.sheets.find(s => s.id === window.activeSheetId);
  if (!curSheet || curSheet.columns.length <= 1) return alert('至少需要保留一個欄位！');

  const deletedCol = curSheet.columns.pop();
  curSheet.data.forEach(row => { delete row[deletedCol.key]; });

  if (window.saveToFirebase) window.saveToFirebase();
  window.renderMainContent();
};

window.updateCellData = function(rowIndex, colKey, value) {
  const curSheet = window.sheets.find(s => s.id === window.activeSheetId);
  if (curSheet && curSheet.data[rowIndex]) {
    curSheet.data[rowIndex][colKey] = value.trim();
    if (window.saveToFirebase) window.saveToFirebase();
    window.renderMainContent();
  }
};

window.renderMainContent = function() {
  const container = document.getElementById('main-content');
  const currentSheet = window.sheets.find(s => s.id === window.activeSheetId) || window.sheets[0];
  const isLogined = !!window.currentUser;
  const sheetColumns = currentSheet.columns || [];

  let html = '';

  if (isLogined) {
    html += `
      <div class="table-toolbar">
        <button class="btn btn-light" onclick="addRow()"><i class="fa-solid fa-plus"></i> 新增列 (Row)</button>
        <button class="btn btn-light" onclick="deleteRow()"><i class="fa-solid fa-minus"></i> 刪除最後一列</button>
        <button class="btn btn-light" onclick="addColumn()"><i class="fa-solid fa-columns"></i> 新增欄位 (Column)</button>
        <button class="btn btn-light" onclick="deleteColumn()"><i class="fa-solid fa-trash-can"></i> 刪除最後一欄</button>
      </div>
    `;
  }

  if (!currentSheet || !currentSheet.data || currentSheet.data.length === 0) {
    html += `<div style="text-align:center; padding: 40px; color:#94a3b8; background:#fff; border-radius:8px; margin-bottom:24px;">目前【${currentSheet.name}】無資料。${isLogined ? '可點擊上方按鈕新增列/欄或匯入專屬 Excel' : '（請登入管理員帳號以進行編輯）'}</div>`;
  } else {
    html += `<div class="table-responsive-wrapper"><table class="custom-table"><thead><tr>`;
    sheetColumns.forEach(col => { html += `<th>${col.title}</th>`; });
    html += `</tr></thead><tbody>`;

    currentSheet.data.forEach((row, rIdx) => {
      html += `<tr>`;
      sheetColumns.forEach(col => {
        html += `<td ${isLogined ? `contenteditable="true" onblur="updateCellData(${rIdx}, '${col.key}', this.innerText)"` : ''}>${row[col.key] || '-'}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table></div>`;
  }

  const isFirstSheet = (currentSheet.id === "s1" || currentSheet.name === "產能量能分析");
  const isSecondSheet = (currentSheet.id === "s2" || currentSheet.name === "刀具費佔成本");

  if (isFirstSheet && currentSheet.data && currentSheet.data.length > 0) {
    html += `
      <div class="charts-section-title">
        <i class="fa-solid fa-chart-line"></i> 分析圖表 (資料來源：${currentSheet.name})
      </div>
      <div class="charts-grid">
    `;

    window.sheet1ChartConfigs.forEach(cp => {
      html += `
        <div class="chart-page" id="export-area-${cp.id}">
          <div class="chart-header">
            <div class="chart-title"><i class="fa-solid fa-chart-area" style="color:#7e22ce;"></i> ${cp.title}</div>
            <button class="btn btn-success" onclick="exportChartToPNG('${cp.id}', '${cp.title}')">
              <i class="fa-solid fa-download"></i> 匯出 PNG 圖片
            </button>
          </div>
          <div class="chart-wrapper">
            <canvas id="canvas-${cp.id}"></canvas>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  } else if (isSecondSheet && currentSheet.data && currentSheet.data.length > 0) {
    html += `
      <div class="charts-section-title">
        <i class="fa-solid fa-chart-pie"></i> 刀具費與成本趨勢分析 (資料來源：${currentSheet.name})
      </div>
      <div class="charts-grid-2col">
    `;

    window.sheet2ChartConfigs.forEach(cp => {
      html += `
        <div class="chart-page" id="export-area-${cp.id}">
          <div class="chart-header">
            <div class="chart-title"><i class="fa-solid fa-chart-column" style="color:#0284c7;"></i> ${cp.title}</div>
            <button class="btn btn-success" onclick="exportChartToPNG('${cp.id}', '${cp.title}')">
              <i class="fa-solid fa-download"></i> 匯出 PNG
            </button>
          </div>
          <div class="chart-wrapper">
            <canvas id="canvas-${cp.id}"></canvas>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  }

  container.innerHTML = html;

  if (isFirstSheet && currentSheet.data && currentSheet.data.length > 0) {
    setTimeout(() => {
      window.sheet1ChartConfigs.forEach(cp => buildChartSheet1(cp, currentSheet));
    }, 100);
  } else if (isSecondSheet && currentSheet.data && currentSheet.data.length > 0) {
    setTimeout(() => {
      window.sheet2ChartConfigs.forEach(cp => buildChartSheet2(cp, currentSheet));
    }, 100);
  }
};

// --- Chart.js 畫線與輔助 Plugin ---
const yearSeparatorPlugin = {
  id: 'yearSeparatorPlugin',
  afterDraw(chart) {
    const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
    const labels = chart.data.labels || [];
    const yearGroups = {};
    
    labels.forEach((lbl, idx) => {
      const yrMatch = String(lbl).match(/\d{2}$/);
      const yr = yrMatch ? yrMatch[0] : 'Other';
      if (!yearGroups[yr]) yearGroups[yr] = [];
      yearGroups[yr].push(idx);
    });

    const yearKeys = Object.keys(yearGroups);
    ctx.save();

    yearKeys.forEach((yr, keyIdx) => {
      if (keyIdx > 0) {
        const prevLastIdx = yearGroups[yearKeys[keyIdx - 1]].slice(-1)[0];
        const currFirstIdx = yearGroups[yr][0];

        const prevLastX = x.getPixelForValue(prevLastIdx);
        const currFirstX = x.getPixelForValue(currFirstIdx);
        const separatorX = (prevLastX + currFirstX) / 2;

        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.moveTo(separatorX, top);
        ctx.lineTo(separatorX, bottom);
        ctx.stroke();
      }
    });

    ctx.restore();
  }
};

function parseNum(val, isPercentageHint = false) {
  if (val === undefined || val === null || val === "-" || val === "") return 0;
  
  let str = String(val).trim().replace(/,/g, '').replace(/NT\$/gi, '').replace(/\$/g, '');
  let hasPercentSign = str.includes('%');
  str = str.replace(/%/g, '');
  
  let num = parseFloat(str);
  if (isNaN(num)) return 0;

  if (hasPercentSign) {
    return num;
  } else if (isPercentageHint && Math.abs(num) <= 1.0 && num !== 0) {
    return num * 100;
  }
  
  return num;
}

function getColumnKeyByTitle(sheet, targetTitle) {
  const col = (sheet.columns || []).find(c => c.title.trim() === targetTitle.trim() || c.title.includes(targetTitle));
  return col ? col.key : null;
}

function buildChartSheet1(config, sheet) {
  const canvas = document.getElementById(`canvas-${config.id}`);
  if (!canvas) return;

  if (window.chartInstances[config.id]) {
    window.chartInstances[config.id].destroy();
  }

  const labels = sheet.data.map(r => r.month || '');

  if (config.type === "combo") {
    const valKey = getColumnKeyByTitle(sheet, "合計產出市值");
    const qtyKey = getColumnKeyByTitle(sheet, "合計產出數量");

    const valData = sheet.data.map(r => parseNum(r[valKey]));
    const qtyData = sheet.data.map(r => parseNum(r[qtyKey]));

    window.chartInstances[config.id] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar',
            label: '合計產出市值(NT$)',
            data: valData,
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            borderColor: '#3b82f6',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: '合計產出數量(PCS)',
            data: qtyData,
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            borderWidth: 2,
            tension: 0.2,
            pointRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
      plugins: [yearSeparatorPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: '市值 (NT$)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: '數量 (PCS)' }
          }
        }
      }
    });
  } else if (config.type === "line") {
    const dataKey = getColumnKeyByTitle(sheet, config.dataKey);
    const lineData = sheet.data.map(r => parseNum(r[dataKey], true));

    window.chartInstances[config.id] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: config.dataKey,
          data: lineData,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: true,
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 4
        }]
      },
      plugins: [yearSeparatorPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: {
            ticks: {
              callback: function(value) { return value + '%'; }
            }
          }
        }
      }
    });
  }
}

function buildChartSheet2(config, sheet) {
  const canvas = document.getElementById(`canvas-${config.id}`);
  if (!canvas) return;

  if (window.chartInstances[config.id]) {
    window.chartInstances[config.id].destroy();
  }

  const labels = sheet.data.map(r => r.month || '');

  if (config.type === "combo_bar_line") {
    const barKey = getColumnKeyByTitle(sheet, config.barKey);
    const lineKey = getColumnKeyByTitle(sheet, config.lineKey);

    const barData = sheet.data.map(r => parseNum(r[barKey]));
    const lineData = sheet.data.map(r => parseNum(r[lineKey], true));

    window.chartInstances[config.id] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar',
            label: config.barKey,
            data: barData,
            backgroundColor: 'rgba(2, 132, 199, 0.75)',
            borderColor: '#0284c7',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: config.lineKey,
            data: lineData,
            borderColor: '#f59e0b',
            backgroundColor: '#f59e0b',
            borderWidth: 2,
            tension: 0.2,
            pointRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
      plugins: [yearSeparatorPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: '金額 (NT$)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { callback: function(v) { return v + '%'; } },
            title: { display: true, text: '佔比 (%)' }
          }
        }
      }
    });
  } else if (config.type === "double_line") {
    const line1Key = getColumnKeyByTitle(sheet, config.line1Key);
    const line2Key = getColumnKeyByTitle(sheet, config.line2Key);

    const data1 = sheet.data.map(r => parseNum(r[line1Key]));
    const data2 = sheet.data.map(r => parseNum(r[line2Key]));

    window.chartInstances[config.id] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: config.line1Key,
            data: data1,
            borderColor: '#06b6d4',
            backgroundColor: '#06b6d4',
            borderWidth: 2,
            tension: 0.2,
            pointRadius: 4
          },
          {
            label: config.line2Key,
            data: data2,
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            borderWidth: 2,
            tension: 0.2,
            pointRadius: 4
          }
        ]
      },
      plugins: [yearSeparatorPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: {
            type: 'linear',
            display: true,
            title: { display: true, text: '金額 (NT$)' }
          }
        }
      }
    });
  }
}

window.exportChartToPNG = function(chartId, title) {
  const element = document.getElementById(`export-area-${chartId}`);
  if (!element) return;

  html2canvas(element, { scale: 2 }).then(canvas => {
    const link = document.createElement('a');
    link.download = `${title.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(err => {
    console.error("圖片匯出失敗:", err);
    alert("匯出圖片失敗，請稍後再試！");
  });
};
