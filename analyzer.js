// ============================================================
// EXCEPTION ANALYZER - AI-Powered License Plate Exception Tool
// ============================================================

// Remove existing panel if already open
const existing = document.getElementById('__exception_analyzer__');
if (existing) { existing.remove(); return; }

// ── HELPERS ─────────────────────────────────────────────────

function similarity(a, b) {
  a = a.toUpperCase(); b = b.toUpperCase();
  if (a === b) return 100;
  let matches = 0;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }
  return Math.round((matches / len) * 100);
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

// ── SCRAPE PAGE DATA ─────────────────────────────────────────

const bodyText = document.body.innerText;

// Registered plate — sits after "Plates\n\n" in the page text
let registeredPlate = null;
const plateMatch = bodyText.match(/Plates\n+([A-Z0-9]{4,10})/i);
if (plateMatch) registeredPlate = plateMatch[1].toUpperCase();

// Triggered plate — always in the input#LicensePlate field
const lpInput = document.querySelector('input#LicensePlate, input[name="LicensePlate"]');
let triggeredPlate = lpInput ? lpInput.value.toUpperCase().trim() : null;

// Payment history — timestamps + LP numbers
const historyItems = [];
const tsMatches = [...bodyText.matchAll(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/g)];
const lpMatches = [...bodyText.matchAll(/LP Number\s+([A-Z0-9]{4,10})/gi)];
tsMatches.forEach((ts, i) => {
  historyItems.push({
    timestamp: ts[1],
    plate: lpMatches[i] ? lpMatches[i][1].toUpperCase() : 'Unknown'
  });
});
const lastVisit = historyItems.length > 0 ? historyItems[0] : null;
const daysSinceVisit = lastVisit
  ? daysSince(lastVisit.timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$1-$2'))
  : null;

// Exception rating
const ratingMatch = bodyText.match(/Exception Rating\s+(\d+)/i);
const exceptionRating = ratingMatch ? parseInt(ratingMatch[1]) : 0;

// Customer name
const firstMatch = bodyText.match(/First Name\s+(\w+)/i);
const lastMatch = bodyText.match(/Last Name\s+(\w+)/i);
const customerName = (firstMatch && lastMatch) ? `${firstMatch[1]} ${lastMatch[1]}` : 'Unknown';

// Camera images
const images = [...document.querySelectorAll('img')].filter(img =>
  img.src && !img.src.includes('logo') && !img.src.includes('icon') && img.naturalWidth > 100
);
const frontImg = images[0] || null;
const rearImg = images[1] || null;

// Plate similarity score
const simScore = (registeredPlate && triggeredPlate) ? similarity(registeredPlate, triggeredPlate) : 0;
const simColor = simScore > 70 ? '#4ade80' : simScore > 40 ? '#f97316' : '#ff3b3b';

// ── BUILD UI ─────────────────────────────────────────────────

const panel = document.createElement('div');
panel.id = '__exception_analyzer__';
panel.innerHTML = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@400;600;700&display=swap');
    #__exception_analyzer__ {
      position: fixed; top: 20px; right: 20px; z-index: 999999;
      width: 360px; background: #0d0d0d; border: 1px solid #2a2a2a;
      border-radius: 12px; box-shadow: 0 0 40px rgba(0,0,0,0.8);
      font-family: 'Barlow Condensed', sans-serif; color: #e0e0e0;
      overflow: hidden; animation: __eaSlide__ 0.3s ease;
      max-height: 90vh; overflow-y: auto;
    }
    @keyframes __eaSlide__ { from { opacity:0; transform: translateX(30px); } to { opacity:1; transform: translateX(0); } }
    #__exception_analyzer__ .hdr {
      background: #111; padding: 14px 16px; display: flex;
      align-items: center; justify-content: space-between;
      border-bottom: 1px solid #222; position: sticky; top: 0; z-index: 1;
    }
    #__exception_analyzer__ .hdr h2 { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: 2px; color: #fff; }
    #__exception_analyzer__ .hdr span { color: #ff3b3b; font-size: 10px; letter-spacing: 1px; }
    #__exception_analyzer__ .xbtn { background: none; border: none; color: #555; font-size: 18px; cursor: pointer; }
    #__exception_analyzer__ .xbtn:hover { color: #fff; }
    #__exception_analyzer__ .sec { padding: 12px 16px; border-bottom: 1px solid #1a1a1a; }
    #__exception_analyzer__ .lbl { font-size: 10px; letter-spacing: 2px; color: #555; text-transform: uppercase; margin-bottom: 4px; }
    #__exception_analyzer__ .pr { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
    #__exception_analyzer__ .plt {
      font-family: 'Share Tech Mono', monospace; font-size: 20px;
      background: #111; border: 1px solid #2a2a2a; border-radius: 6px;
      padding: 6px 10px; flex: 1; text-align: center; letter-spacing: 3px;
    }
    #__exception_analyzer__ .ig { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    #__exception_analyzer__ .ic { background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 8px 10px; }
    #__exception_analyzer__ .ic .v { font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px; }
    #__exception_analyzer__ .ab {
      background: #0a0a0a; border: 1px solid #1e1e1e; border-radius: 8px;
      padding: 10px 12px; margin-top: 8px; min-height: 60px;
      font-size: 13px; line-height: 1.5; color: #aaa;
    }
    #__exception_analyzer__ .rc { border-radius: 8px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; }
    #__exception_analyzer__ .rc h3 { margin: 0 0 2px; font-size: 15px; font-weight: 700; letter-spacing: 1px; }
    #__exception_analyzer__ .rc p { margin: 0; font-size: 12px; color: #888; }
    #__exception_analyzer__ .acts { display: flex; gap: 8px; padding: 12px 16px; position: sticky; bottom: 0; background: #0d0d0d; border-top: 1px solid #1a1a1a; }
    #__exception_analyzer__ .btn {
      flex: 1; padding: 10px 6px; border: none; border-radius: 8px;
      font-family: 'Barlow Condensed', sans-serif; font-size: 12px;
      font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer;
      transition: all 0.2s;
    }
    #__exception_analyzer__ .btn:hover { filter: brightness(1.2); transform: translateY(-1px); }
    #__exception_analyzer__ .bc { background: #4ade80; color: #000; }
    #__exception_analyzer__ .bu { background: #3b82f6; color: #fff; }
    #__exception_analyzer__ .bt { background: #ff3b3b; color: #fff; }
    #__exception_analyzer__ .dot {
      width: 6px; height: 6px; border-radius: 50%; background: #ff3b3b;
      animation: __eaPulse__ 1.5s infinite; display: inline-block; margin-right: 6px;
    }
    @keyframes __eaPulse__ { 0%,100%{opacity:1} 50%{opacity:0.3} }
  </style>

  <div class="hdr">
    <div>
      <h2><span class="dot"></span>Exception Analyzer</h2>
      <span>AI-POWERED · LICENSE PLATE REVIEW</span>
    </div>
    <button class="xbtn" onclick="document.getElementById('__exception_analyzer__').remove()">✕</button>
  </div>

  <div class="sec">
    <div class="lbl">Customer</div>
    <div style="font-size:18px;font-weight:700;color:#fff;letter-spacing:1px;">${customerName}</div>
  </div>

  <div class="sec">
    <div class="lbl">Plate Comparison</div>
    <div class="pr">
      <div>
        <div class="lbl" style="margin-bottom:2px">Registered</div>
        <div class="plt" style="color:#4ade80;border-color:#1a3a26;">${registeredPlate || '—'}</div>
      </div>
      <div style="color:#555;font-size:18px;margin-top:16px;">↔</div>
      <div>
        <div class="lbl" style="margin-bottom:2px">Triggered</div>
        <div class="plt" style="color:#f97316;border-color:#3a1a0a;">${triggeredPlate || '—'}</div>
      </div>
    </div>
    <div style="margin-top:8px;">
      <div style="background:#1a1a1a;border-radius:4px;height:6px;overflow:hidden;">
        <div style="width:${simScore}%;height:100%;background:${simColor};border-radius:4px;transition:width 0.6s;"></div>
      </div>
      <div style="font-size:11px;color:#888;margin-top:4px;display:flex;justify-content:space-between;">
        <span>Similarity</span>
        <span style="color:${simColor};">${simScore}%</span>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="ig">
      <div class="ic">
        <div class="lbl">Last Visit</div>
        <div class="v">${daysSinceVisit !== null ? daysSinceVisit + 'd ago' : '—'}</div>
      </div>
      <div class="ic">
        <div class="lbl">Last Plate</div>
        <div class="v" style="font-family:'Share Tech Mono',monospace;font-size:13px;">${lastVisit ? lastVisit.plate : '—'}</div>
      </div>
      <div class="ic">
        <div class="lbl">Exception Rating</div>
        <div class="v" style="color:${exceptionRating > 2 ? '#ff3b3b' : '#4ade80'};">${exceptionRating}</div>
      </div>
      <div class="ic">
        <div class="lbl">Total Visits</div>
        <div class="v">${historyItems.length}</div>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="lbl">🤖 AI Color & Image Analysis</div>
    <div class="ab" id="__ea_ai__" style="color:#555;font-style:italic;">Analyzing camera images...</div>
  </div>

  <div class="sec">
    <div class="lbl">Recommendation</div>
    <div class="rc" id="__ea_rec__" style="background:#1a1a1a;">
      <div style="font-size:24px;">⏳</div>
      <div>
        <h3 style="margin:0 0 2px;font-size:15px;color:#fff;">Analyzing...</h3>
        <p style="margin:0;font-size:12px;color:#888;">Waiting for AI</p>
      </div>
    </div>
  </div>

  <div class="acts">
    <button class="btn bc" onclick="window.__eaClose__()">✓ Close</button>
    <button class="btn bu" onclick="window.__eaUpdate__()">↺ Update</button>
    <button class="btn bt" onclick="window.__eaTrigger__()">⚠ Trigger</button>
  </div>
`;

document.body.appendChild(panel);

// ── ACTION FUNCTIONS ─────────────────────────────────────────

window.__eaClose__ = function() {
  const btn = [...document.querySelectorAll('button, a')].find(el =>
    el.innerText.trim().toLowerCase().includes('close exception')
  );
  if (btn) { btn.click(); panel.remove(); }
  else alert('Close Exception button not found.');
};

window.__eaTrigger__ = function() {
  const btn = [...document.querySelectorAll('button, a')].find(el =>
    el.innerText.trim().toLowerCase().includes('trigger exception')
  );
  if (btn) { btn.click(); panel.remove(); }
  else alert('Trigger Exception button not found.');
};

window.__eaUpdate__ = function() {
  if (!triggeredPlate) { alert('No triggered plate found.'); return; }
  const plateField = document.querySelector('input#LicensePlate, input[name="LicensePlate"]');
  if (plateField) {
    plateField.value = triggeredPlate;
    plateField.dispatchEvent(new Event('input', { bubbles: true }));
    plateField.dispatchEvent(new Event('change', { bubbles: true }));
    const submitBtn = [...document.querySelectorAll('button, input[type=submit]')].find(el =>
      el.innerText?.toLowerCase().includes('submit') || el.value?.toLowerCase().includes('submit')
    );
    if (submitBtn) {
      submitBtn.click();
      alert(`✅ Plate updated to ${triggeredPlate}`);
      panel.remove();
    } else {
      alert(`Plate set to ${triggeredPlate} — click Submit manually.`);
    }
  } else {
    alert('Plate input field not found.');
  }
};

// ── AI ANALYSIS ──────────────────────────────────────────────

async function runAIAnalysis() {
  const aiBox = document.getElementById('__ea_ai__');
  const recBox = document.getElementById('__ea_rec__');

  // Fallback recommendation logic (used if AI fails)
  function showFallback(reason) {
    let r;
    if (simScore > 70) {
      r = { bg:'#051a0a', border:'#003a15', icon:'✅', color:'#4ade80', title:'CLOSE EXCEPTION', desc:`Plates ${simScore}% similar — likely a misread` };
    } else if (daysSinceVisit !== null && daysSinceVisit > 30) {
      r = { bg:'#0a0a1a', border:'#00153a', icon:'🔄', color:'#60a5fa', title:'UPDATE PLATE', desc:`No visit in ${daysSinceVisit} days — likely new vehicle` };
    } else {
      r = { bg:'#1a0505', border:'#3a0000', icon:'🚨', color:'#ff3b3b', title:'TRIGGER EXCEPTION', desc:`Plates different + visited ${daysSinceVisit}d ago` };
    }
    aiBox.innerHTML = `<span style="color:#f97316;">⚠ ${reason} — using rule-based logic</span>`;
    recBox.style.background = r.bg;
    recBox.style.border = `1px solid ${r.border}`;
    recBox.innerHTML = `<div style="font-size:24px;">${r.icon}</div><div><h3 style="margin:0 0 2px;font-size:15px;color:${r.color};">${r.title}</h3><p style="margin:0;font-size:12px;color:#888;">${r.desc}</p></div>`;
  }

  // Convert image to base64
  async function imgToBase64(imgEl) {
    if (!imgEl) return null;
    try {
      const res = await fetch(imgEl.src);
      const blob = await res.blob();
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  const [frontB64, rearB64] = await Promise.all([imgToBase64(frontImg), imgToBase64(rearImg)]);
  const hasImages = frontB64 || rearB64;

  const context = `You are analyzing a car wash license plate exception.

Data:
- Customer: ${customerName}
- Registered plate: ${registeredPlate}
- Triggered plate: ${triggeredPlate}
- Plate similarity: ${simScore}%
- Days since last visit: ${daysSinceVisit !== null ? daysSinceVisit : 'unknown'}
- Last plate used in history: ${lastVisit ? lastVisit.plate : 'unknown'}
- Exception rating: ${exceptionRating}
${hasImages ? '- Camera images attached: front driver view + rear plate view' : '- No camera images available'}

Decision rules:
1. CLOSE — car colors dont match between front/rear camera, OR plates are very similar (likely misread, similarity > 70%)
2. TRIGGER — plates completely different AND customer visited within last 30 days with a different plate
3. UPDATE_PLATE — plates different AND customer has NOT visited in over 30 days (likely changed vehicle)

${hasImages ? 'Analyze car colors in both images. Do both images show the same colored car?' : ''}

Respond ONLY in raw JSON, no markdown fences:
{"action":"CLOSE|TRIGGER|UPDATE_PLATE","color_match":true|false|null,"front_color":"string or null","rear_color":"string or null","reasoning":"one sentence","confidence":"HIGH|MEDIUM|LOW"}`;

  const messages = [{
    role: 'user',
    content: hasImages ? [
      ...(frontB64 ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frontB64 } }] : []),
      ...(rearB64 ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: rearB64 } }] : []),
      { type: 'text', text: context }
    ] : context
  }];

  try {
    // Use Cloudflare proxy to avoid CORS
    const res = await fetch('https://exception-ai-proxy.morantes.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500, messages })
    });

    if (!res.ok) throw new Error(`Proxy returned ${res.status}`);

    const data = await res.json();
    const text = data.content?.map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
    const result = JSON.parse(text);

    // Update AI box
    const colorInfo = result.front_color && result.rear_color
      ? `Front: <b style="color:#f97316">${result.front_color}</b> · Rear: <b style="color:#f97316">${result.rear_color}</b><br>`
      : '';
    const colorMatch = result.color_match === null ? '' :
      result.color_match
        ? `<span style="color:#4ade80">✓ Colors match</span><br>`
        : `<span style="color:#ff3b3b">✗ Colors don't match</span><br>`;
    aiBox.innerHTML = `${colorInfo}${colorMatch}<span>${result.reasoning}</span>`;

    // Update recommendation
    const map = {
      TRIGGER:     { bg:'#1a0505', border:'#3a0000', icon:'🚨', color:'#ff3b3b', title:'TRIGGER EXCEPTION', desc:'Plates different + recent visit detected' },
      CLOSE:       { bg:'#051a0a', border:'#003a15', icon:'✅', color:'#4ade80', title:'CLOSE EXCEPTION',   desc:'Likely misread or color mismatch' },
      UPDATE_PLATE:{ bg:'#0a0a1a', border:'#00153a', icon:'🔄', color:'#60a5fa', title:'UPDATE PLATE',      desc:'Customer likely changed vehicle' }
    };
    const r = map[result.action] || map.CLOSE;
    recBox.style.background = r.bg;
    recBox.style.border = `1px solid ${r.border}`;
    recBox.innerHTML = `
      <div style="font-size:24px;">${r.icon}</div>
      <div>
        <h3 style="margin:0 0 2px;font-size:15px;color:${r.color};">${r.title}</h3>
        <p style="margin:0;font-size:12px;color:#888;">${r.desc} · Confidence: <b>${result.confidence}</b></p>
      </div>`;

  } catch (err) {
    console.error('Exception Analyzer AI error:', err);
    showFallback(err.message.includes('Proxy') ? 'Proxy not set up yet' : 'AI unavailable');
  }
}

runAIAnalysis();