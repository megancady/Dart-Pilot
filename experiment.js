// experiment.js (full rewrite with hidden reward zones + participant number leaderboard)

// ---------- Global state ----------
let score = 0;
let participantId = "000";

// Top-5 leaderboard scores (fixed, like you requested)
let leaderboard = [
  { id: "007", score: 400 },
  { id: "010", score: 370 },
  { id: "001", score: 360 },
  { id: "023", score: 350 },
  { id: "019", score: 340 },
];

// ---------- Utilities ----------
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function downloadCSV(jsPsych) {
  const csv = jsPsych.data.get().csv();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `dart_pilot_${participantId}_${Date.now()}.csv`;
  a.textContent = "Download data as CSV";
  a.style.fontSize = "18px";
  a.style.display = "inline-block";
  a.style.marginTop = "16px";

  document.body.appendChild(a);
}

// Safe participant number extraction across plugin variations
function parseParticipantId(data) {
  let candidate = "";
  try {
    if (typeof data.responses === "string") {
      const obj = JSON.parse(data.responses);
      candidate = (obj.Q0 ?? "").trim();
    } else if (data.responses && typeof data.responses === "object") {
      candidate = (data.responses.Q0 ?? "").trim();
    } else if (data.response && typeof data.response === "object") {
      candidate = (data.response.Q0 ?? "").trim();
    }
  } catch {
    candidate = "";
  }

  // keep only digits
  candidate = candidate.replace(/\D/g, "");

  // format as 3-digit string (e.g., 7 -> 007)
  if (candidate.length === 0) return "000";
  const num = Math.max(0, Math.min(999, parseInt(candidate, 10)));
  return String(num).padStart(3, "0");
}

// Render leaderboard; highlight participant if they are top-5
function leaderboardHTML(final = false) {
  const sorted = leaderboard.slice().sort((a, b) => b.score - a.score);

  const rows = sorted.map((x, i) => {
    const isMe = x.id === participantId;
    return `
      <div style="
        display:flex; justify-content:space-between; width:360px;
        padding:8px 10px; border-radius:10px;
        ${isMe ? "background:#fff3b0; border:2px solid #ffb703;" : "border:1px solid #eee;"}
      ">
        <span>${i + 1}. <b>${escapeHtml(x.id)}</b></span>
        <span><b>${x.score}</b></span>
      </div>
    `;
  }).join("");

  const header = final ? "Final High Scores" : "High Scores";

  return `
    <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
      <div style="font-size:26px; font-weight:800;">${header}</div>
      <div class="muted">Try to beat the top scores.</div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${rows}
      </div>
      <div class="pill">You: <b>${escapeHtml(participantId)}</b> &nbsp;|&nbsp; Current score: <b>${score}</b></div>
    </div>
  `;
}

// Insert participant score into leaderboard if top-5; keep only top 5
function updateLeaderboardWithParticipant() {
  // Remove any existing entry for this participant id
  leaderboard = leaderboard.filter(x => x.id !== participantId);

  // Insert their score
  leaderboard.push({ id: participantId, score });

  // Keep top 5
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 5);
}

// ---------- Onboarding trials (NO mention of gust) ----------
const welcome = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div style="max-width:760px;">
      <h2>Dart Challenge</h2>
      <p>You’ll throw darts at a target to earn points.</p>
      <p>Your goal is to get the <b>highest score</b> possible.</p>
      <p class="muted">(This screen stays up briefly so you can read.)</p>
    </div>
  `,
  choices: ["Continue"],
  on_load: () => {
    const btn = document.querySelector("button");
    if (!btn) return;
    btn.disabled = true;
    setTimeout(() => (btn.disabled = false), 2500);
  },
};

const participantEntry = {
  type: jsPsychSurveyText,
  questions: [
    {
      prompt: `Enter your participant number (3 digits, e.g., 001, 007, 010):`,
      placeholder: "e.g., 007",
      required: true,
    },
  ],
  button_label: "Submit",
  on_finish: (data) => {
    participantId = parseParticipantId(data);
  },
};

const showLeaderboard = {
  type: jsPsychHtmlButtonResponse,
  stimulus: () => leaderboardHTML(false),
  choices: ["Start practice"],
  on_load: () => {
    const btn = document.querySelector("button");
    if (!btn) return;
    btn.disabled = true;
    setTimeout(() => (btn.disabled = false), 2000);
  },
};

const practiceIntro = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div style="max-width:760px;">
      <h3>Practice (5 throws)</h3>
      <p><b>How to throw:</b> Press and hold the dart at the bottom, drag upward, and release.</p>
      <p>Try to earn as many points as possible.</p>
      <p class="muted">(Button unlocks after a moment.)</p>
    </div>
  `,
  choices: ["Begin practice"],
  on_load: () => {
    const btn = document.querySelector("button");
    if (!btn) return;
    btn.disabled = true;
    setTimeout(() => (btn.disabled = false), 2500);
  },
};

const mainIntro = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div style="max-width:760px;">
      <h3>Main Round</h3>
      <p>Now your score really counts. Try to beat the leaderboard.</p>
      <p class="muted">(Button unlocks after a moment.)</p>
    </div>
  `,
  choices: ["Start main round"],
  on_load: () => {
    const btn = document.querySelector("button");
    if (!btn) return;
    btn.disabled = true;
    setTimeout(() => (btn.disabled = false), 2500);
  },
};

const iti = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: "",
  choices: "NO_KEYS",
  trial_duration: 450,
};

// ---------- Dart trial with hidden bonus zones ----------
function makeDartTrial({
  // "gust trial" parameters
  isGustTrial = false,
  gustWarningMs = 4500,  // show "Here comes a gust of wind..." for 4-5 seconds
  gustFlightMs = 3200,   // slow veer animation
  baseFlightMs = 900,
  feedbackMs = 1200,

  lockoutMs = 900,
  minHoldMs = 250,
  minDragPx = 45,

  // hidden bonus zones (INVISIBLE to participant)
  // Example: top-right gives +50; bottom-right gives +80
  bonusZones = [
    { id: "TR50", x: 620, y: 70, r: 55, bonus: 50 },
    { id: "BR80", x: 620, y: 390, r: 60, bonus: 80 },
  ],
} = {}) {

  const canvasW = 700;
  const canvasH = 450;

  // fun colors
  const colors = {
    outer: "#36C2CE",
    inner: "#FFD23F",
    bull:  "#FF4D6D",
    stroke: "#111"
  };

  const target = {
    cx: canvasW / 2,
    cy: canvasH / 2 - 30,
    rOuter: 70,
    rInner: 40,
    rBull: 15,
  };

  const dartStart = { x: canvasW / 2, y: canvasH - 45 };

  function insideGrabZone(x, y) {
    return (
      x >= dartStart.x - 60 &&
      x <= dartStart.x + 60 &&
      y >= dartStart.y - 25 &&
      y <= dartStart.y + 55
    );
  }

  function getBonusAt(x, y) {
    // returns {zoneId, bonus} or null
    for (const z of bonusZones) {
      const d = Math.hypot(x - z.x, y - z.y);
      if (d <= z.r) return { zoneId: z.id, bonus: z.bonus };
    }
    return null;
  }

  function drawScene({ dartPos = dartStart, aimLine = null, showDart = true, bannerText = "" } = {}) {
    const ctx = this;
    ctx.clearRect(0, 0, canvasW, canvasH);

    // background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // banner text
    if (bannerText) {
      ctx.fillStyle = "#111";
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(bannerText, canvasW / 2, 32);
      ctx.textAlign = "left";
    }

    // target rings
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors.stroke;

    ctx.beginPath();
    ctx.arc(target.cx, target.cy, target.rOuter, 0, Math.PI * 2);
    ctx.fillStyle = colors.outer;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(target.cx, target.cy, target.rInner, 0, Math.PI * 2);
    ctx.fillStyle = colors.inner;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(target.cx, target.cy, target.rBull, 0, Math.PI * 2);
    ctx.fillStyle = colors.bull;
    ctx.fill();
    ctx.stroke();

    // aim line
    if (aimLine) {
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(aimLine.x0, aimLine.y0);
      ctx.lineTo(aimLine.x1, aimLine.y1);
      ctx.stroke();
    }

    // dart icon
    if (showDart) {
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.moveTo(dartPos.x, dartPos.y - 10);
      ctx.lineTo(dartPos.x - 8, dartPos.y + 10);
      ctx.lineTo(dartPos.x + 8, dartPos.y + 10);
      ctx.closePath();
      ctx.fill();
    }

    // grab zone pad
    ctx.fillStyle = "#efefef";
    ctx.fillRect(dartStart.x - 70, dartStart.y + 18, 140, 22);
    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    ctx.fillText("Grab dart here", dartStart.x - 42, dartStart.y + 34);
  }

  function bigRed(feedbackEl, html) {
    feedbackEl.innerHTML = `<div class="big-red">${html}</div>`;
  }

  function posAlongArc(sx, sy, ex, ey, t, arcHeight) {
    const x = sx + (ex - sx) * t;
    const y = sy + (ey - sy) * t - arcHeight * 4 * t * (1 - t);
    return { x, y };
  }

  return {
    type: jsPsychHtmlKeyboardResponse,
    choices: "NO_KEYS",
    stimulus: `
      <div id="dart-wrap">
        <div id="score">Score: ...</div>
        <div id="instr" class="muted">Press and hold the dart, drag upward, and release to throw.</div>
        <canvas id="dart-canvas" width="${canvasW}" height="${canvasH}"></canvas>
        <div id="feedback" style="min-height: 52px;"></div>
        <div id="status" class="muted"></div>
      </div>
    `,
    on_load: () => {
      const canvas = document.getElementById("dart-canvas");
      const ctx = canvas.getContext("2d");
      const feedback = document.getElementById("feedback");
      const status = document.getElementById("status");
      const scoreEl = document.getElementById("score");

      scoreEl.textContent = `Score: ${score}`;

      let allowThrow = false;
      let finished = false;

      // TRIAL TYPE LOGIC:
      // - Normal trials: lockout then allow throw
      // - Gust trials: show warning for 4-5 sec, THEN allow throw, then force drift to top-right zone
      if (isGustTrial) {
        drawScene.call(ctx, { bannerText: "Here comes a gust of wind..." });
        status.textContent = "Wait...";
        setTimeout(() => {
          allowThrow = true;
          drawScene.call(ctx, { bannerText: "" });
          status.textContent = "Throw whenever you're ready.";
        }, gustWarningMs);
      } else {
        drawScene.call(ctx, {});
        status.textContent = "Get ready...";
        setTimeout(() => {
          allowThrow = true;
          status.textContent = "Throw whenever you're ready.";
        }, lockoutMs);
      }

      // pointer state
      let pointerDown = false;
      let startPt = null;
      let lastPt = null;
      let downTime = null;

      canvas.addEventListener("pointerdown", (e) => {
        if (finished) return;
        if (!allowThrow) {
          status.textContent = "Wait...";
          return;
        }

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (!insideGrabZone(x, y)) {
          status.textContent = "Grab the dart at the bottom first.";
          return;
        }

        pointerDown = true;
        downTime = performance.now();
        startPt = { x, y };
        lastPt = { x, y };
        canvas.setPointerCapture(e.pointerId);

        status.textContent = "Drag upward and release to throw.";
        drawScene.call(ctx, { aimLine: { x0: startPt.x, y0: startPt.y, x1: x, y1: y } });
      });

      canvas.addEventListener("pointermove", (e) => {
        if (!pointerDown || finished) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        lastPt = { x, y };
        drawScene.call(ctx, { aimLine: { x0: startPt.x, y0: startPt.y, x1: x, y1: y } });
      });

      canvas.addEventListener("pointerup", () => {
        if (!pointerDown || finished) return;
        pointerDown = false;

        const heldMs = performance.now() - downTime;
        const dx = lastPt.x - startPt.x;
        const dy = lastPt.y - startPt.y;
        const dragDist = Math.sqrt(dx * dx + dy * dy);

        if (heldMs < minHoldMs || dragDist < minDragPx) {
          status.textContent = "Make a longer throw (hold + drag upward).";
          drawScene.call(ctx, {});
          return;
        }
        if (dy > -10) {
          status.textContent = "Try dragging upward to throw.";
          drawScene.call(ctx, {});
          return;
        }

        // intended landing (near release)
        let intendedX = clamp(lastPt.x, 0, canvasW);
        let intendedY = clamp(lastPt.y, 0, canvasH);

        const strength = clamp((-dy) / 180, 0.2, 1.0);
        const noise = (1 - strength) * 18;
        intendedX = clamp(intendedX + (Math.random() * 2 - 1) * noise, 0, canvasW);
        intendedY = clamp(intendedY + (Math.random() * 2 - 1) * noise, 0, canvasH);

        // final landing:
        // - normal trial: final = intended
        // - gust trial: force drift to top-right bonus zone center (TR50)
        let finalX = intendedX;
        let finalY = intendedY;

        let gustForced = false;
        let gustTargetZone = null;

        if (isGustTrial) {
          const tr = bonusZones.find(z => z.id === "TR50") || bonusZones[0];
          finalX = tr.x;
          finalY = tr.y;
          gustForced = true;
          gustTargetZone = tr.id;
        }

        // points from target rings
        const dist = Math.hypot(finalX - target.cx, finalY - target.cy);
        let basePts = 0;
        if (dist <= target.rBull) basePts = 20;
        else if (dist <= target.rInner) basePts = 10;
        else if (dist <= target.rOuter) basePts = 5;

        // hidden bonus zone points
        const bonusHit = getBonusAt(finalX, finalY);
        const bonusPts = bonusHit ? bonusHit.bonus : 0;

        const points = basePts + bonusPts;

        finished = true;
        feedback.innerHTML = "";
        status.textContent = "Throwing...";

        // animation
        const startX = dartStart.x;
        const startY = dartStart.y;

        const arcHeight = 130;
        const t0 = performance.now();

        // in gust trials, make animation slow + veer
        const flightMs = isGustTrial ? gustFlightMs : baseFlightMs;

        function animate(now) {
          const t = clamp((now - t0) / flightMs, 0, 1);

          let dartPos;
          let banner = "";

          if (!isGustTrial) {
            dartPos = posAlongArc(startX, startY, finalX, finalY, t, arcHeight);
          } else {
            // two stage: toward intended, then drift to forced target
            if (t < 0.45) {
              const t1 = t / 0.45;
              dartPos = posAlongArc(startX, startY, intendedX, intendedY, t1, arcHeight);
            } else {
              banner = "Gust of wind...";
              const t2 = (t - 0.45) / 0.55;
              const x = intendedX + (finalX - intendedX) * t2;
              const y = intendedY + (finalY - intendedY) * t2 - 35 * Math.sin(Math.PI * t2);
              dartPos = { x, y };
            }
          }

          drawScene.call(ctx, { dartPos, showDart: true, bannerText: banner });

          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            // final landing dot
            drawScene.call(ctx, { showDart: false });
            ctx.beginPath();
            ctx.arc(finalX, finalY, 7, 0, Math.PI * 2);
            ctx.fillStyle = "#111";
            ctx.fill();

            // update score
            score += points;
            scoreEl.textContent = `Score: ${score}`;

            // feedback:
            // We do NOT reveal "hidden zones" as zones.
            // We simply show big red points gained.
            bigRed(feedback, `+${points}`);

            status.textContent = "Next trial...";

            setTimeout(() => {
              jsPsych.finishTrial({
                participant_id: participantId,
                is_gust_trial: isGustTrial,
                gust_forced: gustForced,
                gust_target_zone: gustTargetZone,

                start_x: startPt.x,
                start_y: startPt.y,
                release_x: lastPt.x,
                release_y: lastPt.y,

                intended_x: intendedX,
                intended_y: intendedY,
                landing_x: finalX,
                landing_y: finalY,

                drag_dist: dragDist,
                held_ms: heldMs,
                strength_est: strength,

                base_points: basePts,
                bonus_points: bonusPts,
                bonus_zone_hit: bonusHit ? bonusHit.zoneId : null,

                points_earned: points,
                score_total: score,
              });
            }, feedbackMs);
          }
        }

        requestAnimationFrame(animate);
      });
    },
  };
}

// ---------- Initialize jsPsych ----------
const jsPsych = initJsPsych({
  on_finish: () => {
    // update leaderboard with participant final score (if top-5)
    updateLeaderboardWithParticipant();

    document.body.innerHTML = `
      ${leaderboardHTML(true)}
      <div style="margin-top:14px; font-size:18px;">
        Your final score: <b>${score}</b>
      </div>
      <div class="muted" style="margin-top:8px;">Download your data below.</div>
    `;

    downloadCSV(jsPsych);
  },
});

// ---------- Build timeline ----------
const timeline = [];
timeline.push(welcome);
timeline.push(participantEntry);
timeline.push(showLeaderboard);
timeline.push(practiceIntro);

// Practice: no gust warnings and no forced drift.
// Participants can discover bonus zones if they explore.
for (let i = 0; i < 5; i++) {
  timeline.push(makeDartTrial({ isGustTrial: false }));
  timeline.push(iti);
}

timeline.push(mainIntro);

// Main block:
// - Most trials normal
// - Occasionally a gust trial triggers a long warning, then forced drift to TR50 zone
//   (This creates an "unexpected" off-target big reward experience)
const totalMain = 24;
const gustEvery = 6; // every 6th trial is a gust trial (tune this)

for (let i = 1; i <= totalMain; i++) {
  const isGust = (i % gustEvery === 0);
  timeline.push(makeDartTrial({
    isGustTrial: isGust,
    gustWarningMs: 4700,
    gustFlightMs: 3400,
  }));
  timeline.push(iti);
}

jsPsych.run(timeline);