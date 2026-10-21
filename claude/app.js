/* ΜοτοΠίστα — λογική εφαρμογής: μελέτη, κάρτες Leitner, κουίζ, δοκιμαστική εξέταση */
(function () {
  'use strict';
  const D = window.DATA;
  const TOPICS = D.topics, CARDS = D.cards, QS = D.questions;
  const TOPIC = Object.fromEntries(TOPICS.map(t => [t.id, t]));
  const DAY = 864e5;
  const INTERVALS = [0, 0, 1, 3, 7, 16];
  const LEVELS = [[0, 'Μαθητευόμενος'], [100, 'Στη γραμμή εκκίνησης'], [300, 'Μάστορας των κώνων'], [600, 'Βασιλιάς της βραδυπορίας'], [1000, 'Έτοιμος για εξετάσεις']];
  const EXAM_N = 12, EXAM_PASS = 10;
  const GOALS = [10, 20, 30, 50];
  const KIND_CLASS = { 'Πίστα': 'k-pista', 'Ερωτήσεις': 'k-erot' };

  /* ---------- βοηθητικά ---------- */
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/==(.+?)==/g, '<mark>$1</mark>');
  function rich(s) {
    const out = []; let ul = [];
    const flush = () => { if (ul.length) { out.push('<ul>' + ul.map(x => '<li>' + fmt(x) + '</li>').join('') + '</ul>'); ul = []; } };
    String(s).split('\n').forEach(l => { if (l.startsWith('• ')) ul.push(l.slice(2)); else { flush(); out.push('<p>' + fmt(l) + '</p>'); } });
    flush(); return out.join('');
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const pad = n => String(n).padStart(2, '0');
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  const yesterdayKey = () => dayKey(new Date(Date.now() - DAY));
  const plural = (n, one, many) => n === 1 ? one : many;
  const LET = ['Α', 'Β', 'Γ', 'Δ'];

  const IC = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5"/><path d="M9 8h6"/></svg>',
    cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 012 2v12"/></svg>',
    quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.2 9.2a3 3 0 115 2c-.9.7-2.2 1.2-2.2 2.6"/><path d="M12 17.2h.01"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 13A9 9 0 1111 3a7 7 0 0010 10z"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
  };
  const NAV = [['home', 'Αρχική', 'home'], ['learn', 'Μελέτη', 'book'], ['cards', 'Κάρτες', 'cards'], ['quiz', 'Κουίζ', 'quiz'], ['exam', 'Εξέταση', 'flag']];

  /* ---------- κατάσταση (localStorage με προστασία) ---------- */
  const KEY = 'motopista.v1';
  const defaults = () => ({ cards: {}, q: {}, read: {}, daily: {}, xp: 0, streak: 0, last: '', mistakes: [], goal: 20, theme: 'system', exams: [] });
  let S = defaults();
  try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(defaults(), JSON.parse(raw)); } catch (e) { /* χωρίς αποθήκευση */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* αγνοείται */ } }

  function touch(n) {
    const t = dayKey();
    S.daily[t] = (S.daily[t] || 0) + (n || 1);
    if (S.last !== t) { S.streak = S.last === yesterdayKey() ? S.streak + 1 : 1; S.last = t; }
    save();
  }
  const streakNow = () => (S.last === dayKey() || S.last === yesterdayKey()) ? S.streak : 0;
  const todayCount = () => S.daily[dayKey()] || 0;
  function addXp(n) { S.xp += n; }
  function levelInfo() {
    let i = 0; LEVELS.forEach((l, k) => { if (S.xp >= l[0]) i = k; });
    const cur = LEVELS[i], nxt = LEVELS[i + 1];
    return { name: cur[1], next: nxt ? nxt[1] : null, pct: nxt ? (S.xp - cur[0]) / (nxt[0] - cur[0]) : 1, need: nxt ? nxt[0] - S.xp : 0 };
  }
  function dueCards(topics) {
    const now = Date.now();
    return CARDS.filter(c => (!topics || topics.has(c.topic)) && (!S.cards[c.id] || S.cards[c.id].due <= now));
  }
  function topicStats(tid) {
    const cs = CARDS.filter(c => c.topic === tid), qs = QS.filter(q => q.topic === tid);
    let sum = 0;
    cs.forEach(c => { const s = S.cards[c.id]; sum += s ? s.box / 5 : 0; });
    qs.forEach(q => { const s = S.q[q.id]; sum += s ? Math.min(s.streak, 3) / 3 : 0; });
    const n = cs.length + qs.length;
    return { pct: n ? Math.round(sum / n * 100) : 0, cards: cs.length, qs: qs.length };
  }
  function overallAcc() {
    let ok = 0, n = 0; Object.values(S.q).forEach(s => { ok += s.ok; n += s.n; });
    return n ? Math.round(ok / n * 100) : null;
  }

  /* ---------- θέμα εμφάνισης ---------- */
  function applyTheme() {
    const r = document.documentElement;
    if (S.theme === 'light' || S.theme === 'dark') r.setAttribute('data-theme', S.theme); else r.removeAttribute('data-theme');
    const b = $('#themeBtn');
    if (b) { b.innerHTML = IC[S.theme === 'light' ? 'sun' : S.theme === 'dark' ? 'moon' : 'auto']; b.title = 'Εμφάνιση: ' + (S.theme === 'light' ? 'φωτεινή' : S.theme === 'dark' ? 'σκούρα' : 'αυτόματη'); }
  }

  /* ---------- διαγράμματα πίστας (SVG) ---------- */
  const DIAG = {
    slalom() {
      let cones = '', path = 'M27.5 85';
      for (let i = 0; i < 7; i++) {
        const cx = 70 + i * 85;
        cones += `<polygon class="d-cone" points="${cx - 10},96 ${cx + 10},96 ${cx},72"/>`;
        path += ` Q${cx} ${i % 2 === 0 ? 128 : 42} ${cx + 42.5} 85`;
      }
      return `<svg viewBox="0 0 680 184" role="img" aria-label="Slalom με 7 κώνους"><rect class="d-road" x="10" y="20" width="660" height="130" rx="14"/><path class="d-white" d="M10 34H670M10 136H670"/>${cones}<path class="d-path" d="${path}"/><path class="d-dim" d="M70 160V168M155 160V168M70 164H155"/><text class="d-tm" x="112" y="181" text-anchor="middle">3,5 μ. · Α2: 4 μ.</text><text class="d-t" x="600" y="14" text-anchor="end">7 κώνοι, 1η ταχύτητα</text></svg>`;
    },
    slow() {
      return `<svg viewBox="0 0 680 150" role="img" aria-label="Γραμμή βραδυπορίας"><rect class="d-road" x="10" y="40" width="660" height="64" rx="12"/><path class="d-dash" d="M24 72H94"/><rect x="94" y="62" width="535" height="20" fill="var(--surface)" class="d-white"/><circle cx="62" cy="72" r="8" fill="var(--ink)"/><path stroke="var(--cone)" stroke-width="3" d="M94 38V108M629 38V108"/><text class="d-t" x="60" y="28" text-anchor="middle">3 μ. ελεύθερα</text><text class="d-t" x="361" y="28" text-anchor="middle">25 μ. · πλάτος 40 εκ.</text><text class="d-tm" x="361" y="76" text-anchor="middle">≥ 15″ (FIFO)</text><text class="d-t ink" x="94" y="128">Ο χρόνος ξεκινά: μπαίνει η μπροστινή ρόδα</text><text class="d-t ink" x="629" y="146" text-anchor="end">Ο χρόνος σταματά: βγαίνει η μπροστινή ρόδα</text></svg>`;
    },
    obstacle() {
      return `<svg viewBox="0 0 680 170" role="img" aria-label="Επιτάχυνση με αποφυγή εμποδίου"><path class="d-dim" d="M20 26V34M515 26V34M20 30H515"/><text class="d-tm" x="268" y="22" text-anchor="middle">55 μ. (Α1) · 40 μ. (Α2, Α)</text><rect class="d-zone" x="425" y="67" width="90" height="36"/><rect x="20" y="67" width="495" height="36" fill="none" class="d-white"/><path class="d-dash" d="M20 85H515"/><rect class="d-obst" x="434" y="74" width="18" height="22" rx="3"/><polygon points="515,49 600,67 600,103 515,121" fill="none" class="d-white"/><polygon class="d-cone" points="590,70 600,70 595,60"/><polygon class="d-cone" points="590,110 600,110 595,100"/><text class="d-t" x="470" y="140" text-anchor="middle">βούλες: γκάζι κλειστό (10 μ.)</text><text class="d-t" x="443" y="62" text-anchor="middle">εμπόδιο 2 μ. (7 μ. πριν την έξοδο)</text><text class="d-t" x="557" y="160" text-anchor="middle">«χωνί»: είσοδος 4 μ., έξοδος 2 μ.</text><text class="d-t" x="20" y="130">πλάτος 2 μ.</text></svg>`;
    },
    brake() {
      return `<svg viewBox="0 0 680 160" role="img" aria-label="Επιτάχυνση με φρενάρισμα έκτακτης ανάγκης"><path class="d-dim" d="M20 22V30M460 22V30M20 26H460"/><text class="d-tm" x="240" y="18" text-anchor="middle">55 μ. (Α1) · 40 μ. (Α2, Α)</text><rect class="d-zone" x="380" y="55" width="80" height="40"/><rect x="460" y="55" width="160" height="40" fill="var(--cone-soft)" stroke="none"/><rect x="20" y="55" width="440" height="40" fill="none" class="d-white"/><path class="d-dash" d="M20 75H620"/><polygon class="d-cone" points="450,55 470,55 460,38"/><polygon class="d-cone" points="450,112 470,112 460,95"/><path class="d-white" d="M620 45V105" style="stroke-width:5"/><path class="d-dim" d="M460 122V130M620 122V130M460 126H620"/><text class="d-tm" x="540" y="146" text-anchor="middle">20 μ. φρενάρισμα</text><text class="d-t" x="420" y="116" text-anchor="middle">βούλες 10 μ.</text><text class="d-t" x="560" y="40" text-anchor="middle">γραμμή στάσης</text><text class="d-t" x="30" y="120">ξεκινά το φρένο ανάμεσα στους κώνους εξόδου</text></svg>`;
    }
  };
  const DIAG_CAP = {
    slalom: 'Σχηματικό σχέδιο, όχι υπό κλίμακα. Η διαδρομή περνά ελικοειδώς, από όποια μεριά θέλεις.',
    slow: 'Σχηματικό σχέδιο, όχι υπό κλίμακα. Οι 3 μέτρα ελεύθερα είναι πριν μπει η μπροστινή ρόδα.',
    obstacle: 'Σχηματικό σχέδιο, όχι υπό κλίμακα. Η απαγόρευση φρένου ισχύει σε όλο τον διάδρομο.',
    brake: 'Σχηματικό σχέδιο, όχι υπό κλίμακα. Το φρενάρισμα ξεκινά μόνο μετά τους κώνους εξόδου.'
  };

  /* ---------- όψεις ---------- */
  const signText = t => t.id.replace('t', '');

  function footerHtml() {
    return `<footer class="foot"><span>Βασισμένο στις σημειώσεις της σχολής. Ο εξεταστής και ο ΚΟΚ έχουν τον τελευταίο λόγο.</span><button data-act="reset" id="resetBtn">Μηδενισμός προόδου</button></footer>`;
  }

  function viewHome() {
    const due = dueCards().length, today = todayCount(), pct = Math.min(1, today / S.goal);
    const C = 2 * Math.PI * 46, lv = levelInfo();
    const learned = Object.values(S.cards).filter(c => c.box >= 4).length;
    const acc = overallAcc();
    const boxes = [0, 0, 0, 0, 0, 0];
    CARDS.forEach(c => { const s = S.cards[c.id]; boxes[s ? s.box : 0]++; });
    const stats = TOPICS.map(t => Object.assign({ t }, topicStats(t.id)));
    const weakest = stats.slice().sort((a, b) => a.pct - b.pct)[0];
    const lead = due > 0
      ? `Σήμερα έχεις <strong>${due}</strong> ${plural(due, 'κάρτα', 'κάρτες')} για επανάληψη. Λίγα λεπτά ανάκλησης από μνήμης αξίζουν περισσότερο από μία ώρα ξαναδιαβάσματος.`
      : `Δεν έχεις κάρτες σε αναμονή. Δοκίμασε κουίζ ή διάβασε το πιο αδύναμο θέμα σου: <strong>${esc(weakest.t.title)}</strong>.`;
    return `
    <section class="hero">
      <div class="panel hero-main">
        <span class="eyebrow">Εξετάσεις δικύκλου · πίστα και έλεγχοι</span>
        <h1>Έτοιμος για την πίστα;</h1>
        <p>${lead}</p>
        <div class="row">
          ${due > 0 ? `<button class="btn" data-act="start-cards" data-mode="due">Επανάληψη ${due} καρτών ${IC.arrow}</button>` : `<button class="btn" data-act="open-topic" data-id="${weakest.t.id}">Μελέτη: ${esc(weakest.t.title)} ${IC.arrow}</button>`}
          <button class="btn ghost" data-go="quiz">Κουίζ</button>
        </div>
        <svg class="lane" viewBox="0 0 600 64" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="M0 52H600" stroke="var(--line)" stroke-width="3" stroke-dasharray="14 12"/><path d="M40 50C120 50 120 12 200 12S280 50 360 50 440 12 520 12" fill="none" stroke="var(--accent)" stroke-width="3"/><polygon points="188,54 212,54 200,26" fill="var(--cone)"/><polygon points="348,54 372,54 360,26" fill="var(--cone)" opacity=".7"/><polygon points="508,54 532,54 520,26" fill="var(--cone)" opacity=".4"/></svg>
      </div>
      <div class="panel stats">
        <div class="ring" role="img" aria-label="Σημερινός στόχος ${today} από ${S.goal}">
          <svg viewBox="0 0 112 112"><circle class="track" cx="56" cy="56" r="46" fill="none" stroke-width="12"/><circle class="val ${pct >= 1 ? 'done' : ''}" cx="56" cy="56" r="46" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}"/></svg>
          <div class="ring-label"><b>${today}</b><span>από ${S.goal}</span></div>
        </div>
        <div class="stat-list">
          <div><span>Σερί ημερών</span><b>${streakNow()}</b></div>
          <div><span>Κάρτες που ξέρεις</span><b>${learned}/${CARDS.length}</b></div>
          <div><span>Σωστές απαντήσεις</span><b>${acc === null ? '–' : acc + '%'}</b></div>
          <div><span>Στόχος ημέρας</span><b><button class="chip" data-act="goal" title="Αλλαγή στόχου">${S.goal} ${IC.arrow.replace('<svg', '<svg width="12" height="12"')}</button></b></div>
        </div>
        <div class="level"><div class="l-row"><span>${esc(lv.name)}</span><span class="muted">${S.xp} XP</span></div><div class="meter"><i style="width:${Math.round(lv.pct * 100)}%"></i></div>${lv.next ? `<span class="muted" style="font-size:12px">Ακόμα ${lv.need} XP για: ${esc(lv.next)}</span>` : ''}</div>
      </div>
    </section>

    <section>
      <div class="section-title"><h2>Κουτιά μνήμης</h2><span class="muted" style="font-size:14px">Όσο πιο ψηλά το κουτί, τόσο αργότερα ξαναρωτάει η κάρτα</span></div>
      <div class="leitner">${boxes.map((n, i) => `<div class="box ${n ? 'on' : ''}"><b>${n}</b><span>${i === 0 ? 'Νέες' : 'Κουτί ' + i}</span></div>`).join('')}</div>
    </section>

    <section>
      <div class="section-title"><h2>Ύλη και πρόοδος</h2><button class="btn ghost small" data-go="learn">Όλη η ύλη</button></div>
      <div class="topic-list">
        ${stats.map(s => `<button class="topic-row" data-act="open-topic" data-id="${s.t.id}">
          <span class="sign ${KIND_CLASS[s.t.kind] || ''}">${signText(s.t)}</span>
          <span><h3>${esc(s.t.title)}</h3><p>${esc(s.t.blurb)}</p></span>
          <span class="lane-wrap"><div class="lane-bar" aria-hidden="true"><i style="width:${s.pct}%"></i></div><div class="lane-meta"><span>${S.read[s.t.id] ? '✓ διαβάστηκε' : 'δεν διαβάστηκε'}</span><span>${s.pct}%</span></div></span>
        </button>`).join('')}
      </div>
    </section>

    <section>
      <div class="section-title"><h2>Πώς μαθαίνεις εδώ</h2></div>
      <div class="methods">
        <div class="panel method"><span class="eyebrow">Ενεργή ανάκληση</span><h3>Θυμήσου πριν δεις</h3><p>Οι κάρτες και η «Δοκιμή μνήμης» στη μελέτη κρύβουν την απάντηση. Η προσπάθεια να τη θυμηθείς είναι αυτή που τη δένει στη μνήμη.</p></div>
        <div class="panel method"><span class="eyebrow">Επαναληπτική εξάσκηση</span><h3>Σωστό ρυθμό επανάληψης</h3><p>Αυτό που ξέρεις γυρίζει πίσω μετά από 1, 3, 7 και 16 μέρες. Αυτό που δυσκολεύεσαι ξαναρωτιέται αμέσως.</p></div>
        <div class="panel method"><span class="eyebrow">Ανάμειξη θεμάτων</span><h3>Μην μαθαίνεις κατά κεφάλαιο</h3><p>Το κουίζ και η δοκιμαστική εξέταση ανακατεύουν τα θέματα, όπως θα σε ρωτήσει ο εξεταστής.</p></div>
      </div>
    </section>`;
  }

  function viewLearn(id) {
    if (!id) {
      return `<section><div class="section-title"><h1 style="font-size:clamp(34px,5vw,48px)">Μελέτη</h1></div>
      <div class="topic-grid">${TOPICS.map(t => { const st = topicStats(t.id); return `<button class="topic-card" data-act="open-topic" data-id="${t.id}">
        <div class="row"><span class="sign ${KIND_CLASS[t.kind] || ''}">${signText(t)}</span><span class="kind ${KIND_CLASS[t.kind] || ''}">${esc(t.kind)}</span></div>
        <h3>${esc(t.title)}</h3><p>${esc(t.blurb)}</p>
        <div><div class="lane-bar"><i style="width:${st.pct}%"></i></div><div class="lane-meta"><span>${st.cards} κάρτες · ${st.qs} ερωτήσεις</span><span>${S.read[t.id] ? '✓ ' : ''}${st.pct}%</span></div></div>
      </button>`; }).join('')}</div></section>`;
    }
    const t = TOPIC[id], idx = TOPICS.indexOf(t), next = TOPICS[idx + 1];
    const body = t.sections.map(sec => {
      switch (sec.t) {
        case 'h': return `<h2>${fmt(sec.text)}</h2>`;
        case 'p': return `<p>${fmt(sec.text)}</p>`;
        case 'list': return `<ul class="list">${sec.items.map(i => `<li><span class="rv">${fmt(i)}</span></li>`).join('')}</ul>`;
        case 'steps': return `<ol class="steps">${sec.items.map(i => `<li><span class="t rv">${fmt(i)}</span></li>`).join('')}</ol>`;
        case 'facts': return `<dl class="facts">${sec.items.map(i => `<div><dt>${fmt(i[0])}</dt><dd class="rv">${rich(i[1])}</dd></div>`).join('')}</dl>`;
        case 'rule': return `<div class="callout ${sec.tone === 'warn' ? 'warn' : ''}"><span class="lbl">${sec.tone === 'warn' ? 'Προσοχή' : 'Σημείωση'}</span>${fmt(sec.text)}</div>`;
        case 'mnemo': return `<div class="callout mn"><span class="lbl">Μνημονικό</span>${fmt(sec.text)}</div>`;
        case 'fail': return `<div class="fail"><h3>${esc(sec.title)}</h3><ul>${sec.items.map(i => `<li><span class="rv">${fmt(i)}</span></li>`).join('')}</ul></div>`;
        case 'qa': return `<div class="qa">${sec.items.map((i, k) => `<details${k === 0 ? ' open' : ''}><summary>${fmt(i[0])}</summary><div class="qa-body rv">${rich(i[1])}</div></details>`).join('')}</div>`;
        case 'diagram': return `<figure class="diagram" style="margin:0"><div class="scroll">${DIAG[sec.id]()}</div><figcaption>${esc(DIAG_CAP[sec.id])}</figcaption></figure>`;
        case 'tyre': return tyreHtml();
        default: return '';
      }
    }).join('');
    return `
    <div class="crumbs"><button data-go="learn">Μελέτη</button><span>/</span><span>${esc(t.title)}</span></div>
    <header class="topic-head">
      <div class="row"><span class="kind ${KIND_CLASS[t.kind] || ''}">${esc(t.kind)}</span><span class="muted" style="font-size:14px">Θέμα ${idx + 1} από ${TOPICS.length}</span></div>
      <h1>${esc(t.title)}</h1><p class="sub">${esc(t.blurb)}</p>
      <div class="study-bar">
        <button class="btn ghost small" id="recallBtn" data-act="recall" aria-pressed="false">${IC.eye} Δοκιμή μνήμης</button>
        <button class="btn small" data-act="start-cards" data-mode="all" data-topic="${t.id}">Κάρτες του θέματος</button>
        <button class="btn ghost small" data-act="start-quiz" data-topic="${t.id}">Κουίζ του θέματος</button>
      </div>
      <p class="recall-note">Οι απαντήσεις είναι θολές. Προσπάθησε να τις πεις από μνήμης και πάτα πάνω τους για να τις δεις.</p>
    </header>
    <article class="article">${body}</article>
    <div class="row between">
      <button class="btn ${S.read[t.id] ? 'ghost' : ''}" data-act="read" data-id="${t.id}">${S.read[t.id] ? '✓ Διαβάστηκε' : 'Το διάβασα'}</button>
      ${next ? `<button class="btn ghost" data-act="open-topic" data-id="${next.id}">Επόμενο: ${esc(next.title)} ${IC.arrow}</button>` : ''}
    </div>`;
  }

  function tyreHtml() {
    return `<div class="panel tyre" id="tyre">
      <h3>Διάβασε ένα ελαστικό</h3>
      <p class="muted" style="font-size:14px">Άλλαξε τους αριθμούς και δες τι σημαίνουν. Στο πλάι του ελαστικού γράφεται π.χ. 180/55/17.</p>
      <div class="tyre-grid">
        <label class="field" for="tw">Πλάτος (mm)<input id="tw" type="number" inputmode="numeric" min="60" max="320" value="180"></label>
        <label class="field" for="tp">Προφίλ (%)<input id="tp" type="number" inputmode="numeric" min="30" max="100" value="55"></label>
        <label class="field" for="tr">Ζάντα (ίντσες)<input id="tr" type="number" inputmode="numeric" min="10" max="21" value="17"></label>
      </div>
      <div class="tyre-out" id="tyreOut"></div>
      <div class="tyre-section">
        <label class="field" for="td" style="max-width:220px">Ημερομηνία κατασκευής (4 ψηφία)<input id="td" type="text" inputmode="numeric" maxlength="4" value="2921"></label>
        <div class="tyre-out" id="dotOut"></div>
      </div>
    </div>`;
  }
  function tyreUpdate() {
    if (!$('#tw')) return;
    const w = +$('#tw').value, p = +$('#tp').value, r = +$('#tr').value;
    const out = $('#tyreOut'); if (!out) return;
    if (w > 0 && p > 0 && r > 0) {
      const side = Math.round(w * p / 100), dia = Math.round(r * 25.4 + 2 * side);
      out.innerHTML = `<div><span>Πλάτος ελαστικού</span><b><mark>${w} mm</mark></b></div><div><span>Ύψος προφίλ (${p}% του πλάτους)</span><b><mark>${side} mm</mark></b></div><div><span>Διάμετρος ζάντας</span><b><mark>${r}″</mark></b></div><div><span>Συνολική διάμετρος τροχού</span><b><mark>${dia} mm</mark></b></div>`;
    } else out.innerHTML = '<div><span>Συμπλήρωσε και τους τρεις αριθμούς.</span></div>';
    const d = $('#td').value.trim(), dot = $('#dotOut');
    if (/^\d{4}$/.test(d) && +d.slice(0, 2) >= 1 && +d.slice(0, 2) <= 53) {
      dot.innerHTML = `<div><span>Εβδομάδα κατασκευής</span><b><mark>${+d.slice(0, 2)}η</mark></b></div><div><span>Έτος</span><b><mark>20${d.slice(2)}</mark></b></div>`;
    } else dot.innerHTML = '<div><span>Γράψε 4 ψηφία: εβδομάδα (01-53) και έτος, π.χ. 2921.</span></div>';
  }

  /* ---------- κάρτες (Leitner) ---------- */
  let cardCfg = { topics: new Set(), mode: 'due' };
  let cs = null;

  function topicChips(sel, attr) {
    return `<div class="chips">
      <button class="chip" ${attr}="all" aria-pressed="${sel.size === 0}">Όλα</button>
      ${TOPICS.map(t => `<button class="chip" ${attr}="${t.id}" aria-pressed="${sel.has(t.id)}">${esc(t.title)}</button>`).join('')}
    </div>`;
  }
  function viewCardsSetup() {
    const sel = cardCfg.topics;
    const topicsSet = sel.size ? sel : null;
    const due = dueCards(topicsSet).length;
    const all = CARDS.filter(c => !topicsSet || topicsSet.has(c.topic)).length;
    const n = cardCfg.mode === 'due' ? due : all;
    return `<section class="setup">
      <h1>Κάρτες</h1>
      <p class="muted">Διάβασε την ερώτηση, πες την απάντηση από μνήμης και μετά γύρνα την κάρτα. Βαθμολόγησε πόσο εύκολα τη θυμήθηκες και η επόμενη επανάληψη προγραμματίζεται μόνη της.</p>
      <div><div class="eyebrow" style="margin-bottom:8px">Θέματα</div>${topicChips(sel, 'data-tc')}</div>
      <div><div class="eyebrow" style="margin-bottom:8px">Ποιες κάρτες</div>
        <div class="seg"><button data-act="cmode" data-m="due" aria-pressed="${cardCfg.mode === 'due'}">Για σήμερα (${due})</button><button data-act="cmode" data-m="all" aria-pressed="${cardCfg.mode === 'all'}">Όλες (${all})</button></div></div>
      <div class="row"><button class="btn" data-act="start-cards" data-mode="${cardCfg.mode}" ${n ? '' : 'disabled'}>Ξεκίνα με ${n} ${plural(n, 'κάρτα', 'κάρτες')} ${IC.arrow}</button>${n ? '' : '<span class="muted">Δεν υπάρχουν κάρτες σε αναμονή. Διάλεξε «Όλες» για ελεύθερη εξάσκηση.</span>'}</div>
    </section>`;
  }
  function startCards(mode, topic) {
    const set = topic ? new Set([topic]) : (cardCfg.topics.size ? cardCfg.topics : null);
    let list = mode === 'due' ? dueCards(set) : CARDS.filter(c => !set || set.has(c.topic));
    if (!list.length) { list = CARDS.filter(c => !set || set.has(c.topic)); }
    const queue = shuffle(list.map(c => c.id));
    cs = { queue, total: queue.length, done: 0, flipped: false, tally: [0, 0, 0, 0, 0], finished: false };
    go('cards', 'session');
  }
  function intervalLabel(card, r) {
    const st = S.cards[card.id] || { box: 0 };
    if (r === 1) return 'ξανά σε λίγο';
    const nb = nextBox(st.box, r);
    if (nb <= 1) return '10 λεπτά';
    const d = INTERVALS[nb]; return d === 1 ? 'αύριο' : d + ' μέρες';
  }
  function nextBox(box, r) {
    if (r === 1) return 1;
    if (r === 2) return Math.max(1, box);
    if (r === 3) return Math.min(5, Math.max(box, 1) + 1);
    return Math.min(5, Math.max(box, 1) + 2);
  }
  function viewCardSession() {
    if (!cs) return viewCardsSetup();
    if (cs.finished || !cs.queue.length) {
      const t = cs.tally, learned = t[3] + t[4];
      return `<section class="session"><div class="panel result">
        <span class="eyebrow">Τέλος επανάληψης</span>
        <div class="big good">${cs.total}</div><p>${plural(cs.total, 'κάρτα', 'κάρτες')} ολοκληρώθηκαν${learned ? `, ${learned} με άνεση` : ''}.</p>
        <div class="tally"><div><b>${t[1]}</b><span>Ξανά</span></div><div><b>${t[2]}</b><span>Δύσκολο</span></div><div><b>${t[3]}</b><span>Καλά</span></div><div><b>${t[4]}</b><span>Εύκολο</span></div></div>
        <div class="row" style="justify-content:center"><button class="btn" data-go="quiz">Δοκίμασε κουίζ</button><button class="btn ghost" data-go="cards" data-reset="1">Άλλη επανάληψη</button><button class="btn ghost" data-go="home">Αρχική</button></div>
      </div></section>`;
    }
    const card = CARDS.find(c => c.id === cs.queue[0]), t = TOPIC[card.topic];
    const pct = Math.round(cs.done / cs.total * 100);
    return `<section class="session">
      <div class="session-top">
        <div class="progress-meta"><span>${cs.done} από ${cs.total}</span><span class="chip">${esc(t.title)}</span></div>
        <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      </div>
      <div class="flip ${cs.flipped ? 'flipped' : ''}" id="flip" data-act="flip" role="button" tabindex="0" aria-label="Γύρνα την κάρτα">
        <div class="flip-in">
          <div class="face front"><span class="eyebrow">Ερώτηση</span><div class="q">${fmt(card.q)}</div><div class="hint">Πες την απάντηση από μνήμης, μετά πάτα για να γυρίσεις την κάρτα (Space)</div></div>
          <div class="face back"><span class="eyebrow">Απάντηση</span><div class="a-body">${rich(card.a)}</div></div>
        </div>
      </div>
      <div class="rate" id="rate" ${cs.flipped ? '' : 'hidden'}>
        ${[1, 2, 3, 4].map(r => `<button class="r${r}" data-act="rate" data-r="${r}">${['Ξανά', 'Δύσκολο', 'Καλά', 'Εύκολο'][r - 1]}<small>${intervalLabel(card, r)}</small><kbd>${r}</kbd></button>`).join('')}
      </div>
    </section>`;
  }
  function flipCard() {
    if (!cs || cs.flipped) return;
    cs.flipped = true;
    const f = $('#flip'), r = $('#rate');
    if (f) { f.classList.add('flipped'); f.setAttribute('aria-label', 'Κάρτα γυρισμένη'); }
    if (r) r.hidden = false;
  }
  function rateCard(r) {
    if (!cs || !cs.flipped || !cs.queue.length) return;
    const id = cs.queue.shift();
    const st = S.cards[id] || { box: 0, seen: 0, lapses: 0, due: 0 };
    const nb = nextBox(st.box, r);
    st.box = nb; st.seen++; if (r === 1) st.lapses++;
    st.due = Date.now() + (nb <= 1 ? 10 * 60e3 : INTERVALS[nb] * DAY);
    S.cards[id] = st;
    cs.tally[r]++;
    if (r === 1) cs.queue.splice(Math.min(3, cs.queue.length), 0, id); else cs.done++;
    addXp([0, 1, 2, 4, 5][r]); touch(1);
    cs.flipped = false;
    if (!cs.queue.length) cs.finished = true;
    render(false);
  }

  /* ---------- κουίζ και δοκιμαστική εξέταση ---------- */
  let quizCfg = { topics: new Set(), mode: 'mix', n: 10 };
  let qs = null;
  let timer = null;
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function viewQuizSetup() {
    const sel = quizCfg.topics;
    const pool = QS.filter(q => !sel.size || sel.has(q.topic)).length;
    const mist = S.mistakes.filter(id => QS.some(q => q.id === id)).length;
    return `<section class="setup">
      <h1>Κουίζ</h1>
      <p class="muted">Ερωτήσεις πολλαπλής επιλογής και ασκήσεις σειράς, με άμεση εξήγηση. Όταν τα θέματα είναι ανακατεμένα, η μνήμη σου δουλεύει πιο σκληρά και κρατά περισσότερο.</p>
      <div><div class="eyebrow" style="margin-bottom:8px">Θέματα</div>${topicChips(sel, 'data-qc')}</div>
      <div><div class="eyebrow" style="margin-bottom:8px">Τρόπος</div>
        <div class="seg"><button data-act="qmode" data-m="mix" aria-pressed="${quizCfg.mode === 'mix'}">Μικτό</button><button data-act="qmode" data-m="mistakes" aria-pressed="${quizCfg.mode === 'mistakes'}">Τα λάθη μου (${mist})</button></div></div>
      <div><div class="eyebrow" style="margin-bottom:8px">Πλήθος ερωτήσεων</div>
        <div class="seg">${[5, 10, 20].map(n => `<button data-act="qn" data-n="${n}" aria-pressed="${quizCfg.n === n}">${n}</button>`).join('')}</div></div>
      <div class="row"><button class="btn" data-act="start-quiz" ${quizCfg.mode === 'mistakes' && !mist ? 'disabled' : ''}>Ξεκίνα ${IC.arrow}</button><span class="muted">${quizCfg.mode === 'mix' ? pool + ' ερωτήσεις διαθέσιμες' : (mist ? '' : 'Δεν έχεις λάθη να επαναλάβεις. Μπράβο!')}</span></div>
    </section>`;
  }
  function prepQ(q) {
    if (q.type === 'mc') return Object.assign({}, q, { order: shuffle(q.opts.map((_, i) => i)), picked: null, checked: false, ok: null });
    return Object.assign({}, q, { pool: shuffle(q.items.map((_, i) => i)), seq: [], checked: false, ok: null });
  }
  function startQuiz(topic) {
    let list;
    const sel = topic ? new Set([topic]) : quizCfg.topics;
    if (!topic && quizCfg.mode === 'mistakes') list = QS.filter(q => S.mistakes.includes(q.id));
    else list = QS.filter(q => !sel.size || sel.has(q.topic));
    const n = topic ? 10 : quizCfg.n;
    const items = shuffle(list).slice(0, n).map(prepQ);
    if (!items.length) return;
    qs = { kind: 'quiz', items, i: 0, start: Date.now() };
    go('quiz', 'session');
  }
  function startExam() {
    const byTopic = {}; QS.filter(q => q.type === 'mc').forEach(q => (byTopic[q.topic] = byTopic[q.topic] || []).push(q));
    const lists = Object.values(byTopic).map(shuffle); const pick = [];
    let k = 0;
    while (pick.length < EXAM_N && lists.some(l => l.length)) { const l = lists[k % lists.length]; if (l.length) pick.push(l.shift()); k++; }
    qs = { kind: 'exam', items: shuffle(pick).map(prepQ), i: 0, start: Date.now() };
    go('exam', 'session');
  }
  function recordQ(q, ok) {
    const s = S.q[q.id] || { n: 0, ok: 0, streak: 0 };
    s.n++; if (ok) { s.ok++; s.streak++; } else s.streak = 0;
    S.q[q.id] = s;
    const m = S.mistakes.indexOf(q.id);
    if (ok && m >= 0 && s.streak >= 1) S.mistakes.splice(m, 1);
    if (!ok && m < 0) S.mistakes.push(q.id);
    addXp(ok ? 5 : 1); touch(1);
  }
  const fmtTime = ms => { const s = Math.round(ms / 1000); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };

  function viewQuestion() {
    const q = qs.items[qs.i], exam = qs.kind === 'exam';
    const pct = Math.round(qs.i / qs.items.length * 100);
    let inner = '';
    if (q.type === 'mc') {
      inner = `<div class="opts">${q.order.map((oi, pos) => {
        let cls = '';
        if (q.checked) cls = oi === 0 ? 'ok' : (q.picked === pos ? 'no' : '');
        else if (q.picked === pos) cls = 'sel';
        return `<button class="opt ${cls}" data-act="pick" data-i="${pos}" ${q.checked ? 'disabled' : ''}><span class="l">${LET[pos]}</span><span>${esc(q.opts[oi])}</span></button>`;
      }).join('')}</div>`;
    } else {
      const slots = q.items.map((_, p) => {
        const idx = q.seq[p];
        let cls = idx === undefined ? '' : 'filled';
        if (q.checked) cls = idx === p ? 'ok' : 'no';
        return `<button class="order-slot ${cls}" data-act="orem" data-p="${p}" ${q.checked || idx === undefined ? 'disabled' : ''}><span class="n">${p + 1}</span><span>${idx === undefined ? '<span class="muted">Βήμα ' + (p + 1) + '</span>' : esc(q.items[idx])}</span></button>`;
      }).join('');
      inner = `<div class="order-zone">${slots}</div>
        ${q.checked ? '' : `<div class="pool">${q.pool.map(i => `<button class="${q.seq.includes(i) ? 'used' : ''}" data-act="oadd" data-i="${i}">${esc(q.items[i])}</button>`).join('')}</div>`}`;
    }
    let fb = '';
    if (q.checked && !exam) {
      fb = `<div class="fb ${q.ok ? 'ok' : 'no'}"><b>${q.ok ? 'Σωστά!' : 'Όχι ακριβώς.'}</b><span>${q.type === 'order' && !q.ok ? 'Η σωστή σειρά: ' + q.items.map((t, i) => (i + 1) + ') ' + esc(t)).join(' · ') : fmt(q.exp)}</span></div>`;
    }
    const canNext = exam ? q.picked !== null : q.checked;
    const last = qs.i === qs.items.length - 1;
    const action = (q.type === 'order' && !q.checked)
      ? `<button class="btn" data-act="ocheck" ${q.seq.length === q.items.length ? '' : 'disabled'}>Έλεγχος σειράς</button>`
      : `<button class="btn" data-act="next" ${canNext ? '' : 'disabled'}>${last ? 'Τέλος' : 'Επόμενη'} ${IC.arrow}</button>`;
    return `<section class="session">
      <div class="session-top">
        <div class="progress-meta"><span>Ερώτηση ${qs.i + 1} από ${qs.items.length}</span>${exam ? `<span class="timer" id="timer">${fmtTime(Date.now() - qs.start)}</span>` : `<span class="chip">${esc(TOPIC[q.topic].title)}</span>`}</div>
        <div class="progress"><i style="width:${pct}%"></i></div>
      </div>
      <div class="panel q-card"><h2>${fmt(q.q)}</h2>${inner}${fb}<div class="row between">${q.type === 'order' ? '<span class="muted" style="font-size:14px">Πάτα τα βήματα με τη σειρά. Πάτα ένα τοποθετημένο βήμα για να το βγάλεις.</span>' : '<span></span>'}${action}</div></div>
    </section>`;
  }
  function viewQuizResult() {
    const exam = qs.kind === 'exam', total = qs.items.length;
    const score = qs.items.filter(q => q.ok).length, wrong = qs.items.filter(q => !q.ok);
    const secs = Date.now() - qs.start;
    const pass = exam ? score >= EXAM_PASS : score / total >= .8;
    const review = wrong.map(q => {
      const right = q.type === 'mc' ? q.opts[0] : q.items.map((t, i) => (i + 1) + ') ' + t).join(' · ');
      const yours = q.type === 'mc' ? (q.picked === null ? '' : q.opts[q.order[q.picked]]) : q.seq.map(i => q.items[i]).join(' · ');
      return `<div class="item no"><b>${fmt(q.q)}</b>${yours ? `<span class="your">Η απάντησή σου: ${esc(yours)}</span>` : ''}<span class="right">Σωστό: ${esc(right)}</span><span class="muted" style="font-size:14px">${fmt(q.exp)}</span></div>`;
    }).join('');
    return `<section class="session"><div class="panel result">
      <span class="eyebrow">${exam ? 'Δοκιμαστική εξέταση' : 'Αποτέλεσμα κουίζ'}</span>
      <div class="big ${pass ? 'good' : 'bad'}">${score}/${total}</div>
      <p>${exam ? (pass ? 'Πέρασες τη δοκιμαστική (ενδεικτικό όριο ' + EXAM_PASS + '/' + EXAM_N + ').' : 'Λείπουν λίγα για το ενδεικτικό όριο ' + EXAM_PASS + '/' + EXAM_N + '. Δες τα λάθη και ξαναδοκίμασε.') : (pass ? 'Πολύ καλά. Τα λάθη σου μπήκαν στη λίστα επανάληψης.' : 'Τα λάθη σου μπήκαν στη λίστα «Τα λάθη μου» για επανάληψη.')} Χρόνος ${fmtTime(secs)}.</p>
      <div class="row" style="justify-content:center"><button class="btn" data-act="${exam ? 'start-exam' : 'start-quiz'}">Ξανά</button>${wrong.length && !exam ? '<button class="btn ghost" data-act="mistakes-run">Επανάληψη λαθών</button>' : ''}<button class="btn ghost" data-go="cards">Κάρτες</button></div>
      ${wrong.length ? `<div class="review"><h3 style="font-size:24px">Τα λάθη σου</h3>${review}</div>` : ''}
    </div></section>`;
  }
  function finishQuiz() {
    stopTimer();
    if (qs.kind === 'exam') {
      const score = qs.items.filter(q => q.ok).length;
      S.exams.push({ d: dayKey(), s: score, n: qs.items.length, t: Date.now() - qs.start }); S.exams = S.exams.slice(-10); save();
    }
    qs.done = true; render(false);
  }
  function viewExamSetup() {
    const last = S.exams.slice(-5).reverse();
    return `<section class="setup">
      <h1>Δοκιμαστική εξέταση</h1>
      <p class="muted">${EXAM_N} ερωτήσεις από όλα τα θέματα, χωρίς βοήθεια και χωρίς άμεση διόρθωση, με χρονόμετρο. Το αποτέλεσμα και οι εξηγήσεις εμφανίζονται στο τέλος. Ενδεικτικό όριο επιτυχίας: ${EXAM_PASS}/${EXAM_N}.</p>
      <div class="row"><button class="btn" data-act="start-exam">Ξεκίνα ${IC.arrow}</button></div>
      ${last.length ? `<div class="panel"><div class="eyebrow" style="margin-bottom:10px">Τελευταίες προσπάθειες</div><div class="stat-list">${last.map(e => `<div><span>${esc(e.d)} · ${fmtTime(e.t)}</span><b style="color:${e.s >= EXAM_PASS ? 'var(--good)' : 'var(--bad)'}">${e.s}/${e.n}</b></div>`).join('')}</div></div>` : ''}
    </section>`;
  }

  /* ---------- δρομολόγηση και απόδοση ---------- */
  const app = $('#app');
  let route = { v: 'home', p: null };

  function render(scroll) {
    let html;
    switch (route.v) {
      case 'home': html = viewHome(); break;
      case 'learn': html = viewLearn(route.p); break;
      case 'cards': html = route.p === 'session' ? viewCardSession() : viewCardsSetup(); break;
      case 'quiz': html = route.p === 'session' && qs && qs.kind === 'quiz' ? (qs.done ? viewQuizResult() : viewQuestion()) : viewQuizSetup(); break;
      case 'exam': html = route.p === 'session' && qs && qs.kind === 'exam' ? (qs.done ? viewQuizResult() : viewQuestion()) : viewExamSetup(); break;
      default: html = viewHome();
    }
    app.innerHTML = '<div class="view' + (scroll === false ? '' : ' fade') + '">' + html + '</div>' + footerHtml();
    if (route.v === 'learn' && route.p) { tyreUpdate(); }
    if (route.v === 'exam' && route.p === 'session' && qs && !qs.done && !timer) {
      timer = setInterval(() => { const t = $('#timer'); if (t) t.textContent = fmtTime(Date.now() - qs.start); }, 1000);
    }
    updateNav();
    if (scroll !== false) window.scrollTo(0, 0);
  }
  function go(v, p) { stopTimer(); route = { v, p: p || null }; render(); }
  function updateNav() {
    document.querySelectorAll('#nav button, #tabbar button').forEach(b => {
      if (b.dataset.go === route.v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }
  function buildNav() {
    $('#nav').innerHTML = NAV.map(n => `<button data-go="${n[0]}">${n[1]}</button>`).join('');
    $('#tabbar').innerHTML = NAV.map(n => `<button data-go="${n[0]}">${IC[n[2]]}<span>${n[1]}</span></button>`).join('');
  }

  /* ---------- γεγονότα ---------- */
  function toggleSet(set, id) { if (id === 'all') set.clear(); else if (set.has(id)) set.delete(id); else set.add(id); }

  document.addEventListener('click', e => {
    const rv = e.target.closest('.rv');
    if (rv && document.body.querySelector('.recall') && !rv.classList.contains('shown')) { rv.classList.add('shown'); return; }
    const g = e.target.closest('[data-go]');
    if (g) {
      if (g.dataset.reset) { cs = null; }
      go(g.dataset.go, null);
      return;
    }
    const tc = e.target.closest('[data-tc]'); if (tc) { toggleSet(cardCfg.topics, tc.dataset.tc); render(false); return; }
    const qc = e.target.closest('[data-qc]'); if (qc) { toggleSet(quizCfg.topics, qc.dataset.qc); render(false); return; }
    const el = e.target.closest('[data-act]'); if (!el) return;
    const d = el.dataset;
    switch (d.act) {
      case 'open-topic': go('learn', d.id); break;
      case 'read': S.read[d.id] = !S.read[d.id]; if (S.read[d.id]) { addXp(10); touch(1); } save(); render(false); break;
      case 'recall': {
        const root = $('.view'); const on = !root.classList.contains('recall');
        root.classList.toggle('recall', on); el.setAttribute('aria-pressed', on);
        el.innerHTML = IC.eye + (on ? ' Τέλος δοκιμής' : ' Δοκιμή μνήμης');
        if (!on) document.querySelectorAll('.rv.shown').forEach(n => n.classList.remove('shown'));
        break;
      }
      case 'cmode': cardCfg.mode = d.m; render(false); break;
      case 'start-cards': startCards(d.mode || cardCfg.mode, d.topic); break;
      case 'flip': flipCard(); break;
      case 'rate': rateCard(+d.r); break;
      case 'qmode': quizCfg.mode = d.m; render(false); break;
      case 'qn': quizCfg.n = +d.n; render(false); break;
      case 'start-quiz': startQuiz(d.topic); break;
      case 'mistakes-run': quizCfg.mode = 'mistakes'; startQuiz(); break;
      case 'start-exam': startExam(); break;
      case 'pick': pickOption(+d.i); break;
      case 'oadd': { const q = qs.items[qs.i]; if (!q.checked && !q.seq.includes(+d.i)) { q.seq.push(+d.i); render(false); } break; }
      case 'orem': { const q = qs.items[qs.i]; if (!q.checked) { q.seq.splice(+d.p, 1); render(false); } break; }
      case 'ocheck': { const q = qs.items[qs.i]; q.checked = true; q.ok = q.seq.every((v, i) => v === i); recordQ(q, q.ok); render(false); break; }
      case 'next': nextQ(); break;
      case 'theme': S.theme = S.theme === 'system' ? 'light' : S.theme === 'light' ? 'dark' : 'system'; save(); applyTheme(); break;
      case 'goal': S.goal = GOALS[(GOALS.indexOf(S.goal) + 1) % GOALS.length]; save(); render(false); break;
      case 'reset': {
        if (el.dataset.armed) { S = defaults(); save(); cs = null; qs = null; applyTheme(); go('home'); }
        else { el.dataset.armed = '1'; el.textContent = 'Σίγουρα; Πάτα ξανά για διαγραφή'; setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.textContent = 'Μηδενισμός προόδου'; } }, 4000); }
        break;
      }
    }
  });

  function pickOption(pos) {
    const q = qs && qs.items[qs.i]; if (!q || q.type !== 'mc' || q.checked) return;
    q.picked = pos;
    if (qs.kind === 'quiz') { q.checked = true; q.ok = q.order[pos] === 0; recordQ(q, q.ok); }
    else { q.ok = q.order[pos] === 0; }
    render(false);
  }
  function nextQ() {
    const q = qs.items[qs.i];
    if (qs.kind === 'exam') { if (q.picked === null) return; recordQ(q, q.ok); }
    if (qs.i >= qs.items.length - 1) { finishQuiz(); window.scrollTo(0, 0); return; }
    qs.i++; render(false); window.scrollTo(0, 0);
  }

  document.addEventListener('input', e => { if (e.target.closest('#tyre')) tyreUpdate(); });

  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const onCtl = e.target.closest('button, summary, a');
    if (route.v === 'cards' && route.p === 'session' && cs && !cs.finished) {
      if ((e.key === ' ' || e.key === 'Enter') && !cs.flipped && (!onCtl || e.target.id === 'flip')) { e.preventDefault(); flipCard(); }
      else if (cs.flipped && '1234'.includes(e.key) && e.key) { rateCard(+e.key); }
    } else if ((route.v === 'quiz' || route.v === 'exam') && route.p === 'session' && qs && !qs.done) {
      const q = qs.items[qs.i];
      if (q.type === 'mc' && !q.checked && '1234'.includes(e.key) && e.key) { pickOption(+e.key - 1); }
      else if (e.key === 'Enter' && !onCtl) { const nb = $('[data-act="next"]'); if (nb && !nb.disabled) nextQ(); }
    }
  });
  const flipEl = () => $('#flip');
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === flipEl()) { e.preventDefault(); flipCard(); }
  });

  /* ---------- εκκίνηση ---------- */
  buildNav(); applyTheme();
  const h = (location.hash || '').replace('#', '');
  if (['home', 'learn', 'cards', 'quiz', 'exam'].includes(h)) route = { v: h, p: null };
  render(false);
})();
