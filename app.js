async function loadDashboardData() {
  try {
    const response = await fetch('data.json');
    const data = await response.json();
    
    renderQuotes(data.quotes);
    renderTimeline(data.schedule);
    initLongTermCountdowns(data.longTermEvents);
    startDailyScheduler(data.schedule);
  } catch (error) {
    console.error("Error reading setup configuration data structures from local source:", error);
  }
}

function renderQuotes(quotes) {
  if(!quotes || quotes.length === 0) return;
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById('quote-display').innerText = `"${randomQuote}"`;
}

function renderTimeline(schedule) {
  const timelineEl = document.getElementById('timeline');
  timelineEl.innerHTML = schedule.map(item => `
    <div class="timeline-item" id="task-${item.time.replace(':', '')}">
      <span class="timeline-time">${item.time}</span>
      <span class="timeline-task">${item.title}</span>
    </div>
  `).join('');
}

function startDailyScheduler(schedule) {
  const mainTimerEl = document.getElementById('main-timer');
  const currentTaskEl = document.getElementById('current-task');
  const progressRing = document.getElementById('progress-ring');
  const ringCircumference = 502; // Adjusted circumference target match radius 80

  function updateScheduleTracking() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    let currentItem = null;
    let nextItem = null;

    const sorted = [...schedule].sort((a,b) => {
      const [aH, aM] = a.time.split(':').map(Number);
      const [bH, bM] = b.time.split(':').map(Number);
      return (aH * 60 + aM) - (bH * 60 + bM);
    });

    for (let i = 0; i < sorted.length; i++) {
      const [h, m] = sorted[i].time.split(':').map(Number);
      const itemMinutes = h * 60 + m;

      if (itemMinutes <= currentMinutes) {
        currentItem = sorted[i];
        nextItem = sorted[i + 1] || null;
      }
    }

    if (!currentItem && sorted.length > 0) {
      currentItem = sorted[sorted.length - 1];
      nextItem = sorted[0];
    }

    document.querySelectorAll('.timeline-item').forEach(el => el.classList.remove('active'));

    if (currentItem) {
      const activeEl = document.getElementById(`task-${currentItem.time.replace(':', '')}`);
      if (activeEl) activeEl.classList.add('active');
      currentTaskEl.innerText = currentItem.title;

      let targetMinutes = 24 * 60; 
      if (nextItem) {
        const [nH, nM] = nextItem.time.split(':').map(Number);
        targetMinutes = nH * 60 + nM;
      } else {
        const [fH, fM] = sorted[0].time.split(':').map(Number);
        targetMinutes = (24 * 60) + (fH * 60 + fM); 
      }

      const [startH, startM] = currentItem.time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      
      let totalBlockDuration = (targetMinutes >= startMinutes) ? (targetMinutes - startMinutes) : (24*60 - startMinutes + targetMinutes);
      let elapsedMinutes = (currentMinutes >= startMinutes) ? (currentMinutes - startMinutes) : (24*60 - startMinutes + currentMinutes);
      
      let totalBlockSeconds = totalBlockDuration * 60;
      let remainingSeconds = (totalBlockSeconds - (elapsedMinutes * 60 + now.getSeconds()));

      if (remainingSeconds < 0) remainingSeconds = 0;

      const hoursLeft = Math.floor(remainingSeconds / 3600);
      const minsLeft = Math.floor((remainingSeconds % 3600) / 60);
      const secsLeft = remainingSeconds % 60;

      let displayStr = "";
      if (hoursLeft > 0) {
        displayStr += `${String(hoursLeft).padStart(2, '0')}:`;
      }
      displayStr += `${String(minsLeft).padStart(2, '0')}:${String(secsLeft).padStart(2, '0')}`;
      mainTimerEl.innerText = displayStr;

      const percentageRemaining = remainingSeconds / totalBlockSeconds;
      const strokeOffset = ringCircumference * (1 - percentageRemaining);
      progressRing.style.strokeDashoffset = strokeOffset;
    }
  }

  setInterval(updateScheduleTracking, 1000);
  updateScheduleTracking();
}

function initLongTermCountdowns(events) {
  const container = document.getElementById('milestones-container');
  container.innerHTML = events.map((ev, index) => `
    <div class="milestone-card">
      <div class="milestone-title">${ev.title}</div>
      <div class="milestone-countdown" id="milestone-timer-${index}">
        <div class="countdown-unit"><span class="countdown-num" id="m-d-${index}">00</span><span class="countdown-label">Days</span></div>
        <div class="countdown-unit"><span class="countdown-num" id="m-h-${index}">00</span><span class="countdown-label">Hours</span></div>
      </div>
    </div>
  `).join('');

  function updateMilestones() {
    events.forEach((ev, index) => {
      const target = new Date(ev.targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        document.getElementById(`m-d-${index}`).innerText = String(days).padStart(2, '0');
        document.getElementById(`m-h-${index}`).innerText = String(hours).padStart(2, '0');
      } else {
        document.getElementById(`m-d-${index}`).innerText = "00";
        document.getElementById(`m-h-${index}`).innerText = "00";
      }
    });
  }

  setInterval(updateMilestones, 60000); 
  updateMilestones();
}

// Fire calculation setups on system window launch
loadDashboardData();
