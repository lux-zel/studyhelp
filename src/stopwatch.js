const TODAY_KEY = 'stopwatch_today';
const ALL_TIME_KEY = 'stopwatch_alltime';
const SESSIONS_KEY = 'stopwatch_sessions';

function encryptData(data) {
    return btoa(JSON.stringify(data));
}

function decryptData(encoded) {
    try {
        return JSON.parse(atob(encoded));
    } catch {
        return null;
    }
}

function validateStoredData(data) {
    if (!data || typeof data !== 'object') return null;
    if (typeof data.total !== 'number' || data.total < 0) return null;
    if (typeof data.sessions !== 'number' || data.sessions < 0) return null;
    return data;
}

function validateSession(session) {
    if (!session || typeof session !== 'object') return null;
    if (typeof session.duration !== 'number' || session.duration < 1000) return null;
    if (typeof session.timestamp !== 'number') return null;
    return session;
}

let startTime = 0;
let elapsed = 0;
let running = false;
let interval;

let todayData = null;
let allTimeData = null;
let sessions = null;

try {
    const storedToday = localStorage.getItem(TODAY_KEY);
    todayData = storedToday ? decryptData(storedToday) : null;
    todayData = validateStoredData(todayData) || { total: 0, sessions: 0 };
} catch {
    todayData = { total: 0, sessions: 0 };
}

try {
    const storedAllTime = localStorage.getItem(ALL_TIME_KEY);
    allTimeData = storedAllTime ? decryptData(storedAllTime) : null;
    allTimeData = validateStoredData(allTimeData) || { total: 0, sessions: 0 };
} catch {
    allTimeData = { total: 0, sessions: 0 };
}

try {
    const storedSessions = localStorage.getItem(SESSIONS_KEY);
    sessions = storedSessions ? decryptData(storedSessions) : null;
    sessions = Array.isArray(sessions) ? sessions.filter(s => validateSession(s)) : [];
} catch {
    sessions = [];
}

export function toggle() {
    if (!running) {
        startTime = Date.now() - elapsed;
        interval = setInterval(updateTimer, 1000);
        const controlBtn = document.getElementById('control');
        if (controlBtn) controlBtn.textContent = 'STOP';
        running = true;
    } else {
        clearInterval(interval);
        running = false;
        const controlBtn = document.getElementById('control');
        if (controlBtn) controlBtn.textContent = 'START';
    }
}

function updateTimer() {
    elapsed = Date.now() - startTime;
    const timerDisplay = document.getElementById('timer');
    if (timerDisplay) timerDisplay.textContent = formatTime(elapsed);
}

function formatTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function saveSession() {
    if (elapsed < 1000) return;
    
    const session = {
        duration: elapsed,
        formatted: formatTime(elapsed),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        timestamp: Date.now()
    };
    
    if (!validateSession(session)) {
        console.error('Invalid session data');
        return;
    }
    
    sessions.unshift(session); 
    if (sessions.length > 20) sessions = sessions.slice(0, 20); 
    
    const newTotal = todayData.total + elapsed;
    if (newTotal < todayData.total) {
        console.error('Total overflow detected');
        return; 
    }
    
    todayData.total = newTotal;
    todayData.sessions += 1;
    
    const newAllTimeTotal = allTimeData.total + elapsed;
    if (newAllTimeTotal < allTimeData.total) {
        console.error('All-time total overflow detected');
        return;
    }
    
    allTimeData.total = newAllTimeTotal;
    allTimeData.sessions += 1;
    
    elapsed = 0;
    const timerDisplay = document.getElementById('timer');
    if (timerDisplay) timerDisplay.textContent = '00:00:00';
    if (running) {
        clearInterval(interval);
        running = false;
        const controlBtn = document.getElementById('control');
        if (controlBtn) controlBtn.textContent = 'START';
    }
    
    saveAllData();
    updateDisplay();
}

function saveAllData() {
    try {
        localStorage.setItem(TODAY_KEY, encryptData(todayData));
        localStorage.setItem(ALL_TIME_KEY, encryptData(allTimeData));
        localStorage.setItem(SESSIONS_KEY, encryptData(sessions));
    } catch (err) {
        console.error('Failed to save data:', err);
    }
}

export function updateDisplay() {
    const todayTotal = document.getElementById('todayTotal');
    const todayCount = document.getElementById('todayCount');
    const allTimeTotal = document.getElementById('allTimeTotal');
    const totalSessions = document.getElementById('totalSessions');
    
    if (todayTotal) todayTotal.textContent = formatTime(todayData.total);
    if (todayCount) todayCount.textContent = todayData.sessions;
    if (allTimeTotal) allTimeTotal.textContent = formatTime(allTimeData.total);
    if (totalSessions) totalSessions.textContent = allTimeData.sessions;
    
    const historyDiv = document.getElementById('history');
    if (!historyDiv) return;
    
    historyDiv.innerHTML = '';
    
    sessions.forEach(session => {
        if (!validateSession(session)) return;
        const div = document.createElement('div');
        div.textContent = `${session.formatted} - ${session.date} ${session.time}`;
        historyDiv.appendChild(div);
    });
    
    if (sessions.length === 0) {
        historyDiv.innerHTML = '<div>No sessions saved yet</div>';
    }
}

export function clearAll() {
    if (confirm('Clear ALL data? This cannot be undone.')) {
        todayData = { total: 0, sessions: 0 };
        allTimeData = { total: 0, sessions: 0 };
        sessions = [];
        elapsed = 0;
        saveAllData();
        updateDisplay();
        const timerDisplay = document.getElementById('timer');
        if (timerDisplay) timerDisplay.textContent = '00:00:00';
        if (running) {
            clearInterval(interval);
            running = false;
            const controlBtn = document.getElementById('control');
            if (controlBtn) controlBtn.textContent = 'START';
        }
    }
}

function checkNewDay() {
    const today = new Date().toDateString();
    const lastSaved = localStorage.getItem('stopwatch_lastdate');
    
    if (lastSaved !== today) {
        localStorage.setItem('stopwatch_lastdate', today);
        todayData = { total: 0, sessions: 0 };
        saveAllData();
    }
}

checkNewDay();
updateDisplay();