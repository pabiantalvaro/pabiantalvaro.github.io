function loadDashboardData() {
  // Checks if your config file script loaded cleanly into global memory
  if (typeof dashboardConfig !== 'undefined') {
    initializeDashboard(dashboardConfig);
  } else {
    console.error("Configuration tracking data profile 'config.js' could not be found. Make sure it is linked in index.html above app.js.");
  }
}

function initializeDashboard(data) {
  renderQuotes(data.quotes);
  renderRoutine(data.woRoutine); 
  renderTimeline(data.schedule);
  initLongTermCountdowns(data.longTermEvents);
  startDailyScheduler(data.schedule);

  
  displayCurrentDate(); 
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

function renderRoutine(woRoutine) {
  const routineContainer = document.getElementById('workout-container');
  if (!routineContainer) return; 

  const today = new Date().getDay();

  // If it's a weekend, stop the function right here so it doesn't try to load data
  if (today === 0 || today === 6) return;

  // Grab TODAY'S specific workout from your config array
  const todaysWorkout = woRoutine[today - 1]; 

  // Inject only that ONE workout into the HTML (No more .map() loop needed!)
  routineContainer.innerHTML = `
    <div class="routine-activity">
      <span class="activity-name">${todaysWorkout.activity}</span>
      <span class="muscle-target">${todaysWorkout.muscleTarget}</span>
    </div>
  `;
}

function startDailyScheduler(schedule) {
  const mainTimerEl = document.getElementById('main-timer');
  const currentTaskEl = document.getElementById('current-task');
  const progressRing = document.getElementById('progress-ring');
  const ringCircumference = 377; // Matches radius 80

  function updateScheduleTracking() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    let currentItem = null;
    let nextItem = null;

    // Sort chronologically
    const sorted = [...schedule].sort((a,b) => {
      const [aH, aM] = a.time.split(':').map(Number);
      const [bH, bM] = b.time.split(':').map(Number);
      return (aH * 60 + aM) - (bH * 60 + bM);
    });

    // Clear previous active states
    document.querySelectorAll('.timeline-item').forEach(el => el.classList.remove('active'));

    // Find active event block
    for (let i = 0; i < sorted.length; i++) {
      const [h, m] = sorted[i].time.split(':').map(Number);
      const itemMinutes = h * 60 + m;
      
      const [nextH, nextM] = (sorted[i + 1] ? sorted[i + 1].time : sorted[0].time).split(':').map(Number);
      let nextMinutes = nextH * 60 + nextM;

      // Handle block spanning across midnight wrap
      if (nextMinutes <= itemMinutes) {
        nextMinutes += 24 * 60;
      }

      let adjustedCurrentMinutes = currentMinutes;
      if (currentMinutes < itemMinutes && nextMinutes > 24 * 60) {
        adjustedCurrentMinutes += 24 * 60;
      }

      if (adjustedCurrentMinutes >= itemMinutes && adjustedCurrentMinutes < nextMinutes) {
        currentItem = sorted[i];
        nextItem = sorted[i + 1] || sorted[0];
        break;
      }
    }

    if (currentItem && nextItem) {
      const activeEl = document.getElementById(`task-${currentItem.time.replace(':', '')}`);
      if (activeEl) activeEl.classList.add('active');
      currentTaskEl.innerText = currentItem.title;

      const [nextH, nextM] = nextItem.time.split(':').map(Number);
      let targetMinutes = nextH * 60 + nextM;
      if (targetMinutes <= currentMinutes) {
        targetMinutes += 24 * 60;
      }

      const [startH, startM] = currentItem.time.split(':').map(Number);
      let startMinutes = startH * 60 + startM;
      if (startMinutes > currentMinutes) {
        startMinutes -= 24 * 60;
      }
      
      const totalBlockSeconds = (targetMinutes - startMinutes) * 60;
      const targetTimeSecs = (targetMinutes * 60);
      const currentTimeSecs = (currentMinutes * 60) + now.getSeconds();
      const remainingSeconds = Math.max(0, targetTimeSecs - currentTimeSecs);

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

function displayCurrentDate() {
  const dateEl = document.getElementById('current-date');
  if (!dateEl) return;

  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateEl.innerText = now.toLocaleDateString('en-US', options);
}

function handleDynamicRoutines() {
  // We use querySelector to grab the outer container so the <h2> title hides too
  const routinesSection = document.querySelector('.routines');
  if (!routinesSection) return;

  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday

  // If today is Sunday (0) OR Saturday (6)
  if (today === 0 || today === 6) {
    routinesSection.style.display = 'none'; // Hide it on weekends
  } else {
    routinesSection.style.display = 'block'; // Show it on weekdays
  }
}

// Fire calculation system execution on startup
loadDashboardData();
