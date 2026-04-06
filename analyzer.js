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

  function getText(selector) {
    const el = document.querySelector(selector);
    return el ? el.innerText.trim() : null;
  }

  function getTextByLabel(label) {
    const els = document.querySelectorAll('*');
    for (const el of els) {
      if (el.childElementCount === 0 && el.innerText && el.innerText.trim() === label) {
        const next = el.nextElementSibling || el.parentElement?.nextElementSibling;
        if (next) return next.innerText.trim();
      }
    }
    return null;
  }

  // ── SCRAPE PAGE DATA ─────────────────────────────────────────

  const bodyText = document.body.innerText;

  // Registered plate (from "Plates" section)
  let registeredPlate = null;
  const plateMatch = bodyText.match(/Plates\s+([A-Z0-9]{4,8})/i);
  if (plateMatch) registeredPlate = plateMatch[1].toUpperCase();

  // Triggered plate (from LicensePlate input field)
  const lpInput = document.querySelector('input[id*="license"], input[name*="license"], input[placeholder*="plate"]');
  let triggeredPlate = lpInput ? lpInput.value.toUpperCase() : null;
  if (!triggeredPlate) {
    const lpMatch = bodyText.match(/LicensePlate\s+([A-Z0-9]{4,8})/i);
    if (lpMatch) triggeredPlate = lpMatch[1].toUpperCase();
  }

  // Payment history — find all timestamps and LP numbers
  const historyItems = [];
  const tsMatches = [...bodyText.matchAll(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/g)];
  const lpMatches = [...bodyText.matchAll(/LP Number\s+([A-Z0-9]{4,8})/gi)];
  tsMatches.forEach((ts, i) => {
    historyItems.push({
      timestamp: ts[1],
      plate: lpMatches[i] ? lpMatches[i][1].toUpperCase() : 'Unknown'
    });
  });
  const lastVisit = historyItems.length > 0 ? historyItems[0] : null;
  const daysSinceVisit = lastVisit ? daysSince(lastVisit.timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$1-$2')) : null;

  // Exception rating
  const ratingMatch = bodyText.match(/Exception Rating\s+(\d+)/i);
  const exceptionRating = ratingMatch ? parseInt(ratingMatch[1]) : 0;

  // Customer name
  const firstMatch = bodyText.match(/First Name\s+(\w+)/i);
  const lastMatch = bodyText.match(/Last Name\s+(\w+)/i);
  const customerName = (firstMatch && lastMatch) ? `${firstMatch[1]} ${lastMatch[1]}` : 'Unknown';

  // Camera images (front driver + rear plate)
  const images = [...document.querySelectorAll('img')].filter(img =>
    img.src && !img.src.includes('logo') && !img.src.includes('icon') && img.naturalWidth > 100
  );
  const frontImg = images[0] || null;
  const rearImg = images[1] || null;

  // Plate similarity score
  const simScore = (registeredPlate && triggeredPlate) ? similarity(registeredPlate, triggeredPlate) : 0;

  // ── BUILD UI ─────────────────────────────────────────────────

  const panel = document.createElement('div');
  panel.id = '__exception_analyzer__';
  panel.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@400;600;700&display=swap');
      #__exception_analyzer__ {
        position: fixed; top: 20px; right: 20px; z-index: 999999;
        width: 360px; background: #0d0d0d; border: 1px solid #2a2a2a;
        border-radius: 12px; box-shadow: 0 0 40px rgba(0,0,0,0.8), 0 0 0 1px #1a1a1a;
        font-family: 'Barlow Condensed', sans-serif; color: #e0e0e0;
        overflow: hidden; animation: slideIn 0.3s ease;
      }
      @keyframes slideIn { from { opacity:0; transform: translateX(30px); } to { opacity:1; transform: translateX(0); } }
      #__exception_analyzer__ .header {
        background: linear-gradient(135deg, #111 0%, #1a1a1a 100%);
        padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
        border-bottom: 1px solid #222;
      }
      #__exception_analyzer__ .header h2 {
        margin: 0; font-size: 15px; font-weight: 700; letter-spacing: 2px;
        text-transform: uppercase; color: #fff;
      }
      #__exception_analyzer__ .header span { color: #ff3b3b; font-size: 11px; letter-spacing: 1px; }
      #__exception_analyzer__ .close-btn {
        background: none; border: none; color: #555; font-size: 18px;
        cursor: pointer; padding: 0; line-height: 1;
      }
      #__exception_analyzer__ .close-btn:hover { color: #fff; }
      #__exception_analyzer__ .section {
        padding: 12px 16px; border-bottom: 1px solid #1a1a1a;
      }
      #__exception_analyzer__ .label {
        font-size: 10px; letter-spacing: 2px; color: #555; text-transform: uppercase; margin-bottom: 4px;
      }
      #__exception_analyzer__ .plates-row {
        display: flex; align-items: center; gap: 10px; margin-top: 4px;
      }
      #__exception_analyzer__ .plate {
        font-family: 'Share Tech Mono', monospace; font-size: 22px;
        background: #111; border: 1px solid #2a2a2a; border-radius: 6px;
        padding: 6px 12px; flex: 1; text-align: center; letter-spacing: 3px;
      }
      #__exception_analyzer__ .plate.registered { color: #4ade80; border-color: #1a3a26; }
      #__exception_analyzer__ .plate.triggered { color: #f97316; border-color: #3a1a0a; }
      #__exception_analyzer__ .sim-bar-wrap { margin-top: 8px; }
      #__exception_analyzer__ .sim-bar-bg {
        background: #1a1a1a; border-radius: 4px; height: 6px; overflow: hidden;
      }
      #__exception_analyzer__ .sim-bar-fill {
        height: 100%; border-radius: 4px; transition: width 0.6s ease;
      }
      #__exception_analyzer__ .sim-label {
        font-size: 11px; color: #888; margin-top: 4px; display: flex; justify-content: space-between;
      }
      #__exception_analyzer__ .info-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      }
      #__exception_analyzer__ .info-card {
        background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 8px 10px;
      }
      #__exception_analyzer__ .info-card .val {
        font-size: 16px; font-weight: 700; color: #fff; margin-top: 2px;
      }
      #__exception_analyzer__ .ai-box {
        background: #0a0a0a; border: 1px solid #1e1e1e; border-radius: 8px;
        padding: 10px 12px; margin-top: 8px; min-height: 60px;
        font-size: 13px; line-height: 1.5; color: #ccc;
      }
      #__exception_analyzer__ .ai-box.loading { color: #555; font-style: italic; }
      #__exception_analyzer__ .recommendation {
        border-radius: 8px; padding: 12px 14px; margin: 0;
        display: flex; align-items: center; gap: 10px;
      }
      #__exception_analyzer__ .recommendation.trigger { background: #1a0505; border: 1px solid #3a0000; }
      #__exception_analyzer__ .recommendation.close { background: #051a0a; border: 1px solid #003a15; }
      #__exception_analyzer__ .recommendation.update { background: #0a0a1a; border: 1px solid #00153a; }
      #__exception_analyzer__ .rec-icon { font-size: 28px; }
      #__exception_analyzer__ .rec-text h3 { margin: 0 0 2px; font-size: 16px; font-weight: 700; letter-spacing: 1px; }
      #__exception_analyzer__ .rec-text p { margin: 0; font-size: 12px; color: #888; line-height: 1.4; }
      #__exception_analyzer__ .recommendation.trigger .rec-text h3 { color: #ff3b3b; }
      #__exception_analyzer__ .recommendation.close .rec-text h3 { color: #4ade80; }
      #__exception_analyzer__ .recommendation.update .rec-text h3 { color: #60a5fa; }
      #__exception_analyzer__ .actions {
        display: flex; gap: 8px; padding: 12px 16px;
      }
      #__exception_analyzer__ .btn {
        flex: 1; padding: 10px 8px; border: none; border-radius: 8px;
        font-family: 'Barlow Condensed', sans-serif; font-size: 13px;
        font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
        cursor: pointer; transition: all 0.2s;
      }
      #__exception_analyzer__ .btn:hover { transform: translateY(-1px); filter: brightness(1.2); }
      #__exception_analyzer__ .btn-trigger { background: #ff3b3b; color: #fff; }
      #__exception_analyzer__ .btn-close-ex { background: #4ade80; color: #000; }
      #__exception_analyzer__ .btn-update { background: #3b82f6; color: #fff; }
      #__exception_analyzer__ .status-dot {
        width: 6px; height: 6px; border-radius: 50%; background: #ff3b3b;
        animation: pulse 1.5s infinite; display: inline-block; margin-right: 6px;
      }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      #__exception_analyzer__ .customer-name {
        font-size: 18px; font-weight: 700; color: #fff; letter-spacing: 1px;
      }
    </style>

    <div class="header">
      <div>
        <h2><span class="status-dot"></span>Exception Analyzer</h2>
        <span>AI-POWERED · LICENSE PLATE REVIEW</span>
      </div>
      <button class="close-btn" onclick="document.getElementById('__exception_analyzer__').remove()">✕</button>
    </div>

    <div class="section">
      <div class="label">Customer</div>
      <div class="customer-name">${customerName}</div>
    </div>

    <div class="section">
      <div class="label">Plate Comparison</div>
      <div class="plates-row">
        <div>
          <div class="label" style="margin-bottom:2px">Registered</div>
          <div class="plate registered">${registeredPlate || '—'}</div>
        </div>
        <div style="color:#555;font-size:20px;margin-top:16px">↔</div>
        <div>
          <div class="label" style="margin-bottom:2px">Triggered</div>
          <div class="plate triggered">${triggeredPlate || '—'}</div>
        </div>
      </div>
      <div class="sim-bar-wrap">
        <div class="sim-bar-bg">
          <div class="sim-bar-fill" id="__sim_fill__" style="width:${simScore}%; background: ${simScore > 70 ? '#4ade80' : simScore > 40 ? '#f97316' : '#ff3b3b'}"></div>
        </div>
        <div class="sim-label">
          <span>Similarity</span>
          <span style="color:${simScore > 70 ? '#4ade80' : simScore > 40 ? '#f97316' : '#ff3b3b'}">${simScore}%</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Last Visit</div>
          <div class="val">${daysSinceVisit !== null ? daysSinceVisit + 'd ago' : '—'}</div>
        </div>
        <div class="info-card">
          <div class="label">Last Plate Used</div>
          <div class="val" style="font-family:'Share Tech Mono',monospace;font-size:14px">${lastVisit ? lastVisit.plate : '—'}</div>
        </div>
        <div class="info-card">
          <div class="label">Exception Rating</div>
          <div class="val" style="color:${exceptionRating > 2 ? '#ff3b3b' : '#4ade80'}">${exceptionRating}</div>
        </div>
        <div class="info-card">
          <div class="label">Visit Count</div>
          <div class="val">${historyItems.length}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="label">🤖 AI Color & Image Analysis</div>
      <div class="ai-box loading" id="__ai_analysis__">Analyzing camera images...</div>
    </div>

    <div class="section" id="__rec_section__">
      <div class="label">Recommendation</div>
      <div class="recommendation" id="__rec_box__">
        <div class="rec-icon">⏳</div>
        <div class="rec-text">
          <h3>Analyzing...</h3>
          <p>Waiting for AI analysis to complete</p>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="btn btn-close-ex" onclick="__closeException__()">✓ Close</button>
      <button class="btn btn-update" onclick="__updatePlate__()">↺ Update Plate</button>
      <button class="btn btn-trigger" onclick="__triggerException__()">⚠ Trigger</button>
    </div>
  `;

  document.body.appendChild(panel);

  // ── ACTION FUNCTIONS ─────────────────────────────────────────

  window.__closeException__ = function() {
    const btn = [...document.querySelectorAll('button, a')].find(el =>
      el.innerText.trim().toLowerCase().includes('close exception')
    );
    if (btn) { btn.click(); panel.remove(); }
    else alert('Close Exception button not found on page.');
  };

  window.__triggerException__ = function() {
    const btn = [...document.querySelectorAll('button, a')].find(el =>
      el.innerText.trim().toLowerCase().includes('trigger exception')
    );
    if (btn) { btn.click(); panel.remove(); }
    else alert('Trigger Exception button not found on page.');
  };

  window.__updatePlate__ = function() {
    if (!triggeredPlate) { alert('No triggered plate found.'); return; }
    // Find the license plate input field
    const inputs = [...document.querySelectorAll('input')].filter(i =>
      i.value && /^[A-Z0-9]{4,8}$/i.test(i.value.trim())
    );
    const plateInput = inputs.find(i => i.value.toUpperCase() === registeredPlate) || inputs[0];
    if (plateInput) {
      plateInput.value = triggeredPlate;
      plateInput.dispatchEvent(new Event('input', { bubbles: true }));
      plateInput.dispatchEvent(new Event('change', { bubbles: true }));
      // Click Submit
      const submitBtn = [...document.querySelectorAll('button, input[type=submit]')].find(el =>
        el.innerText?.toLowerCase().includes('submit') || el.value?.toLowerCase().includes('submit')
      );
      if (submitBtn) {
        submitBtn.click();
        alert(`✅ Plate updated from ${registeredPlate} to ${triggeredPlate}`);
        panel.remove();
      } else {
        alert(`Plate field updated to ${triggeredPlate} — click Submit manually.`);
      }
    } else {
      alert('Could not find plate input field.');
    }
  };

  // ── AI ANALYSIS ──────────────────────────────────────────────

  async function runAIAnalysis() {
    const aiBox = document.getElementById('__ai_analysis__');
    const recBox = document.getElementById('__rec_box__');

    // Convert images to base64 if available
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

    const [frontB64, rearB64] = await Promise.all([
      imgToBase64(frontImg),
      imgToBase64(rearImg)
    ]);

    const hasImages = frontB64 || rearB64;

    // Build prompt
    const context = `
You are analyzing a car wash license plate exception.

Data:
- Customer: ${customerName}
- Registered plate: ${registeredPlate}
- Triggered plate: ${triggeredPlate}
- Plate similarity: ${simScore}%
- Days since last visit: ${daysSinceVisit !== null ? daysSinceVisit : 'unknown'}
- Last plate used in history: ${lastVisit ? lastVisit.plate : 'unknown'}
- Exception rating: ${exceptionRating}
${hasImages ? '- Camera images are attached (front driver view + rear plate view)' : '- No camera images available'}

Rules:
1. CLOSE exception if: car colors don't match between front and rear camera, OR plates are similar (likely misread)
2. TRIGGER exception if: plates are completely different AND customer visited recently (within 30 days) with a different car
3. UPDATE PLATE if: plates are different AND customer has NOT visited in over 30 days (likely changed vehicle)

${hasImages ? 'Analyze the car colors in both images. Do the front and rear images show the same car color?' : ''}

Respond in JSON only, no markdown:
{
  "action": "CLOSE" | "TRIGGER" | "UPDATE_PLATE",
  "color_match": true | false | null,
  "front_color": "color or null",
  "rear_color": "color or null",
  "reasoning": "one sentence explanation",
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}`;

    const messages = [{
      role: 'user',
      content: hasImages ? [
        ...(frontB64 ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frontB64 } }] : []),
        ...(rearB64 ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: rearB64 } }] : []),
        { type: 'text', text: context }
      ] : context
    }];

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages
        })
      });

      const data = await res.json();
      const text = data.content?.map(c => c.text || '').join('');
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      // Update AI box
      aiBox.classList.remove('loading');
      const colorInfo = result.front_color && result.rear_color
        ? `Front: <strong style="color:#f97316">${result.front_color}</strong> · Rear: <strong style="color:#f97316">${result.rear_color}</strong><br>`
        : '';
      const colorMatch = result.color_match === null ? '' :
        result.color_match
          ? `<span style="color:#4ade80">✓ Colors match</span><br>`
          : `<span style="color:#ff3b3b">✗ Colors don't match</span><br>`;
      aiBox.innerHTML = `${colorInfo}${colorMatch}<span style="color:#aaa">${result.reasoning}</span>`;

      // Update recommendation
      const actions = {
        TRIGGER: {
          cls: 'trigger', icon: '🚨',
          title: 'TRIGGER EXCEPTION',
          desc: `Plates different + recent visit detected`
        },
        CLOSE: {
          cls: 'close', icon: '✅',
          title: 'CLOSE EXCEPTION',
          desc: `Likely misread or color mismatch`
        },
        UPDATE_PLATE: {
          cls: 'update', icon: '🔄',
          title: 'UPDATE PLATE',
          desc: `Customer likely changed vehicle`
        }
      };

      const rec = actions[result.action] || actions.CLOSE;
      recBox.className = `recommendation ${rec.cls}`;
      recBox.innerHTML = `
        <div class="rec-icon">${rec.icon}</div>
        <div class="rec-text">
          <h3>${rec.title}</h3>
          <p>${rec.desc} · Confidence: <strong>${result.confidence}</strong></p>
        </div>
      `;

    } catch (err) {
      aiBox.classList.remove('loading');
      aiBox.innerHTML = `<span style="color:#ff3b3b">AI analysis failed: ${err.message}</span>`;
      // Fallback logic without AI
      let action, cls, icon, title, desc;
      if (simScore > 70) {
        action = 'CLOSE'; cls = 'close'; icon = '✅';
        title = 'CLOSE EXCEPTION';
        desc = `Plates are ${simScore}% similar — likely a camera misread`;
      } else if (daysSinceVisit !== null && daysSinceVisit > 30) {
        action = 'UPDATE_PLATE'; cls = 'update'; icon = '🔄';
        title = 'UPDATE PLATE';
        desc = `Last visit was ${daysSinceVisit} days ago — customer likely changed vehicle`;
      } else {
        action = 'TRIGGER'; cls = 'trigger'; icon = '🚨';
        title = 'TRIGGER EXCEPTION';
        desc = `Plates are ${simScore}% similar + visited ${daysSinceVisit}d ago`;
      }
      recBox.className = `recommendation ${cls}`;
      recBox.innerHTML = `
        <div class="rec-icon">${icon}</div>
        <div class="rec-text">
          <h3>${title}</h3>
          <p>${desc} · <em>Fallback logic (no AI)</em></p>
        </div>
      `;
    }
  }

  runAIAnalysis();
