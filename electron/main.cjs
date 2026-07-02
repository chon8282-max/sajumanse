const { app, BrowserWindow, screen, ipcMain, Notification } = require('electron');
const path = require('path');

let reservationWindow = null;

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: Math.round(screenWidth * 0.8),
    height: Math.round(screenHeight * 0.8),
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      serviceWorkers: false,
    },
    title: '지천명 만세력 PRO',
    show: false,
  });

  // window.open 가로채기 → 예약창 전용으로 처리
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('/reservation')) {
      createReservationWindow();
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  function tryLoad() {
    win.loadURL('http://localhost:5000').catch(() => {
      setTimeout(tryLoad, 1000);
    });
  }
  setTimeout(tryLoad, 3000);
  win.once('ready-to-show', () => win.show());
}

function createReservationWindow() {
  if (reservationWindow && !reservationWindow.isDestroyed()) {
    reservationWindow.focus();
    return;
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  reservationWindow = new BrowserWindow({
    width: Math.round(screenWidth * 0.7),
    height: Math.round(screenHeight * 0.7),
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: '예약관리',
    show: false,
  });

  function tryLoad() {
    reservationWindow.loadURL('http://localhost:5000/reservation?standalone=1').catch(() => {
      setTimeout(tryLoad, 300);
    });
  }
  tryLoad();
  reservationWindow.once('ready-to-show', () => reservationWindow.show());
  reservationWindow.on('closed', () => { reservationWindow = null; });
}

ipcMain.on('open-reservation-window', () => {
  createReservationWindow();
});

ipcMain.on('open-reservation-from-popup', () => {
  createReservationWindow();
});

// 알람 체크 (1분마다)
function checkAlarms() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const timeStr = `${hh}:${min}`;

  const alarmOffsets = {
    '10min': 10, '30min': 30, '1hour': 60, '1day': 1440, '3day': 4320
  };

  const http = require('http');
  const url = `http://localhost:5000/api/reservations?start=${todayStr}&end=${todayStr}`;
  http.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      let json;
try { json = JSON.parse(data); } catch(e) { return; }
      if (!json.success) return;
      json.data.forEach(reservation => {
        if (!reservation.alarms || !Array.isArray(reservation.alarms)) return;
        reservation.alarms.forEach(alarm => {
          const offsetMin = alarmOffsets[alarm.timing];
          if (!offsetMin) return;

          const [resH, resM] = reservation.time.split(':').map(Number);
          const resDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), resH, resM);
          const alarmTime = new Date(resDate.getTime() - offsetMin * 60 * 1000);

          const alarmHH = String(alarmTime.getHours()).padStart(2, '0');
          const alarmMM = String(alarmTime.getMinutes()).padStart(2, '0');

          console.log(`알람체크: 예약=${reservation.time} ${reservation.title}, 알람시간=${alarmHH}:${alarmMM}, 현재=${hh}:${min}`);
          // 알람 시간과 현재 시간 비교 (분 단위)
          const alarmTotalMin = parseInt(alarmHH) * 60 + parseInt(alarmMM);
          const nowTotalMin = parseInt(hh) * 60 + parseInt(min);
          const diff = nowTotalMin - alarmTotalMin;
          if (diff >= 0 && diff <= 2) {
            const notif = new Notification({
              title: '📅 예약 알림',
              body: `${reservation.time} ${reservation.title}`,
              silent: false,
            });
            notif.on('click', () => {
              createReservationWindow();
            });
            notif.show();

            // 별도 팝업 창
            const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
            const popup = new BrowserWindow({
      width: 380,
      height: 160,
      frame: true,
      alwaysOnTop: true,
      skipTaskbar: false,
      resizable: false,
      title: '📅 예약 알림',
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });
            const popupHtml =`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:16px;background:#3d2c1a;color:#f5d78e;font-family:sans-serif;cursor:pointer;user-select:none;" onclick="require('electron').ipcRenderer.send('open-reservation-window');window.close()"><div style="font-size:12px;font-weight:bold;margin-bottom:6px;">📅 예약 알림</div><div style="font-size:14px;font-weight:bold;">${reservation.time} ${reservation.title}</div><div style="font-size:11px;margin-top:6px;opacity:0.7;">클릭하면 예약창으로 이동</div></body></html>`;
            popup.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(popupHtml));
            setTimeout(() => { if (!popup.isDestroyed()) popup.close(); }, 8000);
          }
        });
      });
    });
  }).on('error', () => {});
}

app.whenReady().then(() => {
  createWindow();
  // 1분마다 알람 체크
  setInterval(checkAlarms, 10 * 1000);
  setTimeout(checkAlarms, 3 * 1000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});