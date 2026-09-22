/* Five-One — gate, workshop, play loop. Actor and stills are stubbed. */
(function () {
  const CFG = window.FIVEONE || {};
  const ANG = window.ANG;
  const STORE = "fiveone:v1";
  const MINOR_RE = /\b(minor|underage|under[- ]?18|child|children|kid|kids|toddler|infant|preteen|pre-teen|tween|teen|teens|teenaged?|teenager|schoolgirl|schoolboy|high ?school|middle ?school|(?:[1-9]|1[0-7])\s*(?:years? ?old|y\/?o))\b/i;

  const DEFAULT_NIGHT = {
    title: "Half-packed studio",
    blurb: "Ang is taping the kitchen. You are in the room with her.",
    location: "her White Plains studio",
    playerPlace: "on the floor between two boxes",
    sizeMode: "giant",
    tags: ["aware", "unintentional", "mixed", "awake"],
    gut: "off",
    hook: "Stay in this studio. Boxes, tape, the last stretch before she leaves.",
    opening: {
      moment: "The kitchen is already in boxes. Ang crouches over a strip of tape, hoodie sleeves shoved up, bun listing to one side.",
      line: "If you coming over, sit on the floor or help tape a box.",
    },
    shot: "look",
  };

  const TAGS = {
    size: [
      { id: "giant", label: "Giantess" },
      { id: "same", label: "Same size" },
    ],
    aware: [
      { id: "aware", label: "Aware" },
      { id: "unaware", label: "Unaware" },
    ],
    intent: [
      { id: "intentional", label: "Intentional" },
      { id: "unintentional", label: "Unintentional" },
    ],
    tone: [
      { id: "caring", label: "Caring" },
      { id: "mixed", label: "Mixed" },
      { id: "mean", label: "Mean" },
    ],
    sleep: [
      { id: "awake", label: "Awake" },
      { id: "sleeping", label: "Asleep" },
    ],
    gut: [
      { id: "off", label: "Off" },
      { id: "path", label: "Swallow path" },
      { id: "in", label: "Already in" },
    ],
  };

  let db = loadAll();
  let unlocked = !!db.remember;
  let view = "gate";
  let composeMode = "say";
  let busy = false;
  let digestTimer = null;
  let nightDraft = null;
  let plateDraft = db.activePlate || "anon";

  const els = {
    gate: document.getElementById("gate"),
    workshop: document.getElementById("workshop"),
    play: document.getElementById("play"),
    dock: document.getElementById("dock"),
    live: document.getElementById("live"),
    log: document.getElementById("log"),
    input: document.getElementById("input"),
    send: document.getElementById("send"),
    look: document.getElementById("look"),
    talk: document.getElementById("talk"),
    hide: document.getElementById("hide"),
    tease: document.getElementById("tease"),
    meter: document.getElementById("meter"),
    depthFill: document.getElementById("depthFill"),
    digestMeter: document.getElementById("digestMeter"),
    dmTitle: document.getElementById("dmTitle"),
    dmClock: document.getElementById("dmClock"),
    dmFill: document.getElementById("dmFill"),
    shotchip: document.getElementById("shotchip"),
    composeHint: document.getElementById("composeHint"),
    goneNote: document.getElementById("goneNote"),
  };

  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "{}") || {};
    } catch {
      return {};
    }
  }
  function saveAll() {
    try { localStorage.setItem(STORE, JSON.stringify(db)); } catch {}
  }

  async function sha(text) {
    const data = new TextEncoder().encode("five-one|" + text);
    if (!crypto.subtle) {
      return btoa(unescape(encodeURIComponent(String(text))));
    }
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function setLive(text, kind) {
    els.live.textContent = text;
    els.live.className = "chip " + (kind || "wait");
  }

  function toast(title, body, kind) {
    const n = document.createElement("div");
    n.className = "toast " + (kind || "");
    n.innerHTML = "<b></b><span></span>";
    n.querySelector("b").textContent = title;
    n.querySelector("span").textContent = body;
    document.getElementById("toasts").appendChild(n);
    setTimeout(() => n.remove(), 4200);
  }

  function actorReady() {
    return !!(CFG.actorUrl && /^https?:\/\//i.test(CFG.actorUrl));
  }

  function showView(name) {
    view = name;
    ["gate", "workshop", "play"].forEach((id) => {
      document.getElementById(id).classList.toggle("show", id === name);
    });
    els.dock.hidden = name !== "play";
    document.body.classList.toggle("in-play", name === "play");
    if (name === "play") applyScene();
  }

  function route() {
    if (!unlocked) {
      paintGate();
      showView("gate");
      return;
    }
    if (db.save && db.save.game && db.save.night) {
      showView("play");
      restorePlay();
      return;
    }
    paintWorkshop();
    showView("workshop");
  }

  function paintGate() {
    const hasPin = !!(db.pinHash || CFG.invitePin);
    const first = !hasPin;
    document.getElementById("gateLabel").textContent = first ? "Create a key" : "Key";
    document.getElementById("gateLede").textContent = first
      ? "Set a key for this browser. You will need it if you lock the device. Cloud sync comes later."
      : "Five-One is locked. Enter the key for this site.";
    document.getElementById("gateHint").textContent = first
      ? "Pick something you will remember. It stays on this device until we wire Supabase."
      : (db.remember ? "This device was remembered. Enter the key once if you locked it." : "");
    document.getElementById("gateErr").textContent = "";
    document.getElementById("gatePin").value = "";
  }

  async function submitGate() {
    const raw = (document.getElementById("gatePin").value || "").trim();
    const err = document.getElementById("gateErr");
    err.textContent = "";
    if (raw.length < 4) {
      err.textContent = "Use at least 4 characters.";
      return;
    }
    const hash = await sha(raw);
    if (CFG.invitePin) {
      const want = await sha(CFG.invitePin);
      if (hash !== want) { err.textContent = "Wrong key."; return; }
      db.pinHash = want;
    } else if (!db.pinHash) {
      db.pinHash = hash;
    } else if (hash !== db.pinHash) {
      err.textContent = "Wrong key.";
      return;
    }
    db.remember = true;
    unlocked = true;
    saveAll();
    route();
  }

  function lockDevice() {
    db.remember = false;
    unlocked = false;
    saveAll();
    paintGate();
    showView("gate");
  }

  function plates() {
    return {
      anon: { id: "anon", name: "", pronouns: "", relationship: "", about: "", treat: "", label: "Anonymous", blurb: "Blank plate. She does not invent a name." },
      conor: Object.assign({ label: "Conor", blurb: ANG.conorPlate.relationship }, ANG.conorPlate),
      custom: Object.assign({ id: "custom", label: "Custom", blurb: "Name, look, and what you are to her." }, db.customPlate || {}),
    };
  }

  function activePlate() {
    const all = plates();
    return all[db.activePlate] || all.anon;
  }

  function paintWorkshop() {
    nightDraft = Object.assign({}, DEFAULT_NIGHT, db.workshopNight || {});
    plateDraft = db.activePlate || "anon";
    const grid = document.getElementById("plateGrid");
    grid.innerHTML = "";
    Object.values(plates()).forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "plate-btn" + (p.id === plateDraft ? " on" : "");
      b.innerHTML = "<b></b><span></span>";
      b.querySelector("b").textContent = p.label;
      b.querySelector("span").textContent = p.blurb;
      b.addEventListener("click", () => {
        plateDraft = p.id;
        db.activePlate = p.id;
        saveAll();
        paintWorkshop();
      });
      grid.appendChild(b);
    });
    const custom = document.getElementById("customPlate");
    custom.hidden = plateDraft !== "custom";
    const cp = db.customPlate || {};
    document.getElementById("plName").value = cp.name || "";
    document.getElementById("plPronouns").value = cp.pronouns || "they/them";
    document.getElementById("plRel").value = cp.relationship || "";
    document.getElementById("plAbout").value = cp.about || "";
    document.getElementById("plTreat").value = cp.treat || "";

    document.getElementById("nTitle").value = nightDraft.title || "";
    document.getElementById("nBlurb").value = nightDraft.blurb || "";
    document.getElementById("nLoc").value = nightDraft.location || "";
    document.getElementById("nPlace").value = nightDraft.playerPlace || "";
    document.getElementById("nHook").value = nightDraft.hook || "";
    document.getElementById("nOpenM").value = (nightDraft.opening && nightDraft.opening.moment) || "";
    document.getElementById("nOpenL").value = (nightDraft.opening && nightDraft.opening.line) || "";

    paintPills("sizePills", TAGS.size, nightDraft.sizeMode, (id) => { nightDraft.sizeMode = id; });
    paintPills("awarePills", TAGS.aware, tagOf(["aware", "unaware"]), (id) => setTagGroup(["aware", "unaware"], id));
    paintPills("intentPills", TAGS.intent, tagOf(["intentional", "unintentional"]), (id) => setTagGroup(["intentional", "unintentional"], id));
    paintPills("tonePills", TAGS.tone, tagOf(["caring", "mixed", "mean"]), (id) => setTagGroup(["caring", "mixed", "mean"], id));
    paintPills("sleepPills", TAGS.sleep, tagOf(["awake", "sleeping"]), (id) => setTagGroup(["awake", "sleeping"], id));
    paintPills("gutPills", TAGS.gut, nightDraft.gut || "off", (id) => { nightDraft.gut = id; });

    const canContinue = !!(db.save && db.save.game);
    document.getElementById("continueNightBtn").style.display = canContinue ? "block" : "none";
  }

  function tagOf(group) {
    const tags = nightDraft.tags || [];
    return group.find((x) => tags.includes(x)) || group[0];
  }
  function setTagGroup(group, id) {
    nightDraft.tags = (nightDraft.tags || []).filter((t) => group.indexOf(t) < 0);
    nightDraft.tags.push(id);
  }
  function paintPills(hostId, options, current, onPick) {
    const host = document.getElementById(hostId);
    host.innerHTML = "";
    options.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = opt.label;
      b.className = opt.id === current ? "on" : "";
      b.addEventListener("click", () => {
        onPick(opt.id);
        persistWorkshop();
        paintWorkshop();
      });
      host.appendChild(b);
    });
  }

  function persistWorkshop() {
    if (plateDraft === "custom") {
      db.customPlate = {
        id: "custom",
        name: document.getElementById("plName").value.trim(),
        pronouns: document.getElementById("plPronouns").value.trim() || "they/them",
        relationship: document.getElementById("plRel").value.trim(),
        about: document.getElementById("plAbout").value.trim(),
        treat: document.getElementById("plTreat").value.trim(),
      };
    }
    nightDraft.title = document.getElementById("nTitle").value.trim() || DEFAULT_NIGHT.title;
    nightDraft.blurb = document.getElementById("nBlurb").value.trim() || DEFAULT_NIGHT.blurb;
    nightDraft.location = document.getElementById("nLoc").value.trim() || DEFAULT_NIGHT.location;
    nightDraft.playerPlace = document.getElementById("nPlace").value.trim() || DEFAULT_NIGHT.playerPlace;
    nightDraft.hook = document.getElementById("nHook").value.trim();
    nightDraft.opening = {
      moment: document.getElementById("nOpenM").value.trim(),
      line: document.getElementById("nOpenL").value.trim(),
    };
    db.workshopNight = nightDraft;
    db.activePlate = plateDraft;
    saveAll();
  }

  function personaLooksMinor(p) {
    const blob = [p.name, p.pronouns, p.relationship, p.about, p.treat].filter(Boolean).join(" ");
    return MINOR_RE.test(blob);
  }

  function freshGame(night, plate) {
    const gutIn = night.sizeMode === "giant" && night.gut === "in";
    const gutPath = night.sizeMode === "giant" && night.gut === "path";
    return {
      characterId: "ang",
      location: night.location,
      playerPlace: night.playerPlace,
      playerName: plate.name || "",
      mood: "",
      noticed: !(night.tags || []).includes("unaware"),
      shot: night.shot || "look",
      fate: gutIn ? "swallowed" : "",
      depth: gutIn ? 3 : gutPath ? 1 : 0,
      gone: false,
      afterPasses: 0,
      gutEnteredAt: gutIn ? Date.now() : null,
      digestMeter: null,
      bowel: null,
      bowelDone: false,
      sizeMode: night.sizeMode,
      tags: (night.tags || []).slice(),
    };
  }

  function startNight() {
    persistWorkshop();
    const plate = activePlate();
    if (plate.id === "custom") {
      if (!plate.name) { toast("Plate", "Name yourself first, or pick Anonymous.", "warn"); return; }
      if (personaLooksMinor(plate)) {
        toast("Plate", "Everyone on stage is an adult — take the underage wording out.", "bad");
        return;
      }
    }
    const night = Object.assign({}, nightDraft, { id: "n-" + Date.now().toString(36) });
    if (night.sizeMode === "same") night.gut = "off";
    const game = freshGame(night, plate);
    db.save = { night, plate, game, history: [], logTurns: [] };
    saveAll();
    showView("play");
    restorePlay(true);
  }

  function restorePlay(isNew) {
    const save = db.save;
    if (!save) { paintWorkshop(); showView("workshop"); return; }
    paintActions();
    paintMeter();
    applyScene();
    setCompose(composeMode);
    els.log.innerHTML = "";
    if (!save.logTurns || !save.logTurns.length) {
      const open = save.night.opening || {};
      if (open.moment || open.line) {
        addTurn({ moment: open.moment, line: open.line }, true);
        save.logTurns = save.logTurns || [];
        if (!save.logTurns.length) save.logTurns.push({ moment: open.moment, line: open.line });
      } else {
        els.log.innerHTML = '<div class="rp-empty"><b>The night is open.</b><span>Say something, or use the dock.</span></div>';
      }
    } else {
      save.logTurns.forEach((t) => addTurn(t, true));
    }
    if (isNew) persist();
    setBusy(false);
    if (save.game.sizeMode === "giant" && (save.game.depth || 0) >= 3 && !save.game.gone && !save.game.digestMeter) armDigest();
    if (save.game.digestMeter && save.game.digestMeter.active) startDigestTicker();
    if (save.game.bowel && save.game.bowel.active) startDigestTicker();
    setLive(actorReady() ? "Live" : "No actor", actorReady() ? "ready" : "wait");
  }

  function persist() {
    saveAll();
  }

  function applyScene() {
    const g = db.save && db.save.game;
    const root = document.documentElement;
    root.classList.remove("scene-mouth", "scene-throat", "scene-gut");
    if (!g || g.sizeMode !== "giant") {
      els.shotchip.textContent = "same-size";
      return;
    }
    const d = g.depth || 0;
    if (d >= 3) { root.classList.add("scene-gut"); els.shotchip.textContent = "gut"; }
    else if (d >= 2) { root.classList.add("scene-throat"); els.shotchip.textContent = "throat"; }
    else if (d >= 1) { root.classList.add("scene-mouth"); els.shotchip.textContent = "mouth"; }
    else els.shotchip.textContent = "outside";
  }

  function actionPrompts() {
    const g = db.save && db.save.game;
    if (!g || g.sizeMode !== "giant") {
      return { look: "Look", talk: "Talk", hide: "Step back", tease: "Tease" };
    }
    if (g.bowel && g.bowel.active) return { look: "Brace", talk: "Gripe", hide: "Go limp", tease: "Kick" };
    if ((g.depth || 0) >= 3 || (g.digestMeter && g.digestMeter.active)) {
      return { look: "Rub", talk: "Beg", hide: "Attempt", tease: "Struggle" };
    }
    if ((g.depth || 0) >= 1) return { look: "Hold on", talk: "Beg", hide: "Attempt", tease: "Struggle" };
    return { look: "Look", talk: "Talk", hide: "Hide", tease: "Tease" };
  }
  function paintActions() {
    const p = actionPrompts();
    els.look.textContent = p.look;
    els.talk.textContent = p.talk;
    els.hide.textContent = p.hide;
    els.tease.textContent = p.tease;
  }

  function setCompose(mode) {
    composeMode = mode === "do" ? "do" : "say";
    document.getElementById("modeSay").classList.toggle("on", composeMode === "say");
    document.getElementById("modeDo").classList.toggle("on", composeMode === "do");
    const g = db.save && db.save.game;
    const d = (g && g.depth) || 0;
    const place = !g || g.sizeMode !== "giant" ? "the room, her arm, the space between you"
      : d >= 3 ? "her lining, navel, a fold"
      : d >= 1 ? "her tongue, a tooth, spit"
      : "a finger, palm, waistband";
    els.input.placeholder = composeMode === "say" ? "Talk to her…" : ("What do you do to " + place + "?");
    els.composeHint.innerHTML = composeMode === "say"
      ? "Chat. Wrap contact in <b>*asterisks*</b>."
      : "Acting on <b>" + place + "</b>. Wrap words in <b>\"quotes\"</b> to talk.";
  }

  function setBusy(on) {
    busy = on;
    const g = db.save && db.save.game;
    const gone = !!(g && g.gone);
    els.dock.classList.toggle("gone", gone);
    els.dock.classList.toggle("busy", on);
    const off = on || gone || !actorReady();
    els.input.disabled = gone || !actorReady();
    els.send.disabled = off;
    [els.look, els.talk, els.hide, els.tease].forEach((b) => { b.disabled = off; });
    paintActions();
    if (on) setLive("Wait", "busy");
    else setLive(actorReady() ? "Live" : "No actor", actorReady() ? "ready" : "wait");
  }

  function addTurn(t, skipStore) {
    const empty = els.log.querySelector(".rp-empty");
    if (empty) empty.remove();
    const wrap = document.createElement("div");
    wrap.className = "turn";
    if (t.you) {
      const you = document.createElement("div");
      you.className = "you";
      parsePlayer(t.you).forEach((p) => {
        const s = document.createElement("div");
        s.className = p.kind === "do" ? "you-do" : "you-say";
        s.textContent = p.text;
        you.appendChild(s);
      });
      wrap.appendChild(you);
    }
    if (t.moment) {
      const m = document.createElement("div");
      m.className = "moment";
      m.innerHTML = "<b>Moment</b>";
      m.appendChild(document.createTextNode(t.moment));
      wrap.appendChild(m);
    }
    if (t.line) {
      const l = document.createElement("div");
      l.className = "line";
      l.innerHTML = "<b>Ang</b>";
      l.appendChild(document.createTextNode(t.line));
      wrap.appendChild(l);
    }
    els.log.appendChild(wrap);
    els.log.scrollTop = els.log.scrollHeight;
    if (!skipStore && db.save) {
      db.save.logTurns = db.save.logTurns || [];
      db.save.logTurns.push({ you: t.you || "", moment: t.moment || "", line: t.line || "" });
    }
  }

  function composePlayer(raw, mode) {
    let text = raw.trim();
    if (!text) return "";
    const forced = text.match(/^\/(me|do|say)\s+/i);
    if (forced) {
      mode = forced[1].toLowerCase() === "say" ? "say" : "do";
      text = text.slice(forced[0].length);
    }
    const parts = [];
    const push = (kind, t) => {
      t = t.replace(/\s*\n\s*/g, " ").trim();
      t = kind === "say" ? t.replace(/^["“”']+|["“”']+$/g, "").trim() : t.replace(/^\*+|\*+$/g, "").trim();
      if (t) parts.push({ kind, text: t });
    };
    const re = mode === "say" ? /\*([^*]+)\*/g : /["“]([^"”]+)["”]/g;
    const inner = mode === "say" ? "do" : "say";
    let last = 0, m;
    while ((m = re.exec(text))) {
      push(mode, text.slice(last, m.index));
      push(inner, m[1]);
      last = re.lastIndex;
    }
    push(mode, text.slice(last));
    return parts.map((p) => (p.kind === "say" ? "SPEECH: " : "ACTION: ") + p.text).join("\n");
  }

  function parsePlayer(stored) {
    const t = String(stored || "");
    if (/^(SPEECH|ACTION|SAY|DO):/m.test(t)) {
      return t.split(/\n/).map((ln) => {
        const m = ln.match(/^(SPEECH|ACTION|SAY|DO):\s*(.*)$/i);
        if (!m) return null;
        return { kind: /^(SPEECH|SAY)$/i.test(m[1]) ? "say" : "do", text: m[2].trim() };
      }).filter(Boolean);
    }
    return [{ kind: "do", text: t }];
  }

  function playerPersonaPrompt() {
    const p = db.save && db.save.plate;
    if (!p || p.id === "anon" || !p.name) {
      return "PLAYER PLATE: anonymous. Do not invent a name, job, or relationship. The player may reveal that in play, or never.";
    }
    const out = ["PLAYER CHARACTER (who is with Ang)"];
    out.push("Name: " + p.name + ". Use that name.");
    if (p.pronouns) out.push("Pronouns: " + p.pronouns + ".");
    out.push("Age: adult.");
    if (p.relationship) out.push("Relationship to Ang: " + p.relationship + ".");
    if (p.about) out.push("About them: " + p.about);
    if (p.treat) out.push("How Ang treats them: " + p.treat);
    return out.join("\n");
  }

  function buildMessages(userText, extra) {
    const save = db.save;
    const night = save.night;
    const game = save.game;
    const tags = game.tags || night.tags || [];
    const slices = ANG.pickSlices(night, game);
    const state = [
      "STATE",
      "Night: " + night.title + " — " + night.blurb,
      "Location: " + (game.location || night.location),
      "Player place: " + (game.playerPlace || night.playerPlace),
      "Scale: " + (game.sizeMode === "same" ? "same ordinary size. No swallow path." : "Ang is giantess-scale; the player is tiny."),
      "Tags: " + tags.join(", "),
      "Noticed: " + (game.noticed ? "yes" : "no"),
      "Depth: " + (game.sizeMode === "giant" ? (game.depth || 0) : "n/a"),
      game.gone ? "The player is digested and gone as a speaker. Ang remembers who they were if they had a name." : "The player can still act.",
      night.hook ? ("HOOK: " + night.hook) : "",
    ].filter(Boolean).join("\n");

    const system = [
      ANG.constitution,
      "",
      ANG.card,
      "",
      "RELEVANT SLICES",
      slices.join("\n"),
      "",
      playerPersonaPrompt(),
      "",
      state,
      extra || "",
    ].join("\n");

    const messages = [{ role: "system", content: system }];
    const hist = (save.history || []).slice(-(CFG.historyTurns || 36));
    hist.forEach((h) => messages.push(h));
    messages.push({ role: "user", content: userText });
    return messages;
  }

  function parseActor(raw) {
    const text = String(raw || "").trim();
    const grab = (name) => {
      const re = new RegExp("(?:^|\\n)\\s*" + name + ":\\s*([\\s\\S]*?)(?=\\n\\s*(?:MOMENT|SAY|SHOT):|$)", "i");
      const m = text.match(re);
      return m ? m[1].trim() : "";
    };
    let moment = grab("MOMENT");
    let line = grab("SAY");
    if (!moment && !line) moment = text.slice(0, 520);
    return { moment: moment.slice(0, 520), line: line.slice(0, 280) };
  }

  async function askActor(messages) {
    if (!actorReady()) throw new Error("Actor is not wired yet. Add actorUrl in config.js after we stand up Gemini.");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CFG.timeoutMs || 120000);
    try {
      const res = await fetch(CFG.actorUrl, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          temperature: CFG.temperature,
          max_tokens: CFG.maxTokens,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ("Actor failed (" + res.status + ")"));
      return data.text || data.content || (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    } catch (e) {
      if (e && e.name === "AbortError") throw new Error("She took too long to answer.");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  function applyActionHints(text) {
    const g = db.save.game;
    if (g.sizeMode !== "giant" || g.gone) return;
    const t = text.toLowerCase();
    if (/\b(stomach|gut|navel|lining|digest)\b/.test(t) && (g.depth || 0) >= 2) {
      g.depth = 3;
      g.playerPlace = "in the dark warm chamber";
      if (!g.gutEnteredAt) g.gutEnteredAt = Date.now();
    } else if (/\b(swallow|gulp|throat)\b/.test(t) && (g.depth || 0) >= 1) {
      g.depth = Math.max(g.depth, 2);
      g.playerPlace = "on the swallow path";
    } else if (/\b(tongue|mouth|taste|lip|tooth)\b/.test(t)) {
      g.depth = Math.max(g.depth, 1);
      g.playerPlace = "wet on her tongue";
    }
    if (g.depth >= 3 && !g.digestMeter) armDigest();
  }

  function armDigest() {
    const g = db.save.game;
    if (g.sizeMode !== "giant" || g.gone) return;
    const total = 8 * 60 * 1000;
    g.digestMeter = { active: true, totalMs: total, remainingMs: total, lastTick: Date.now() };
    startDigestTicker();
    paintMeter();
  }

  function startDigestTicker() {
    if (digestTimer) clearInterval(digestTimer);
    digestTimer = setInterval(tickDigest, 1000);
  }
  function tickDigest() {
    const g = db.save && db.save.game;
    if (!g || !g.digestMeter || !g.digestMeter.active || document.hidden) return;
    const now = Date.now();
    const dt = now - (g.digestMeter.lastTick || now);
    g.digestMeter.lastTick = now;
    g.digestMeter.remainingMs = Math.max(0, g.digestMeter.remainingMs - dt);
    if (g.digestMeter.remainingMs <= 0) finishDigest();
    paintMeter();
    persist();
  }
  function finishDigest() {
    const g = db.save.game;
    if (g.gone) return;
    g.gone = true;
    g.fate = "digested";
    if (g.digestMeter) g.digestMeter.active = false;
    if (digestTimer) { clearInterval(digestTimer); digestTimer = null; }
    g.bowel = { active: true, remainingMs: 4 * 60 * 1000, totalMs: 4 * 60 * 1000, lastTick: Date.now(), alive: false };
    startDigestTicker();
    addTurn({ moment: "The chamber finishes what it started. Ang’s night does not reset.", line: "" });
    setBusy(false);
    toast("Gone", "The digest clock ran out. Continue her night when you want.", "warn");
    persist();
  }
  function nudgeDigest(ms) {
    const g = db.save && db.save.game;
    if (!g || !g.digestMeter || !g.digestMeter.active) return;
    g.digestMeter.remainingMs = Math.max(5000, Math.min(g.digestMeter.totalMs, g.digestMeter.remainingMs + ms));
    paintMeter();
    persist();
  }

  function paintMeter() {
    const g = db.save && db.save.game;
    if (!g || g.sizeMode !== "giant") {
      els.meter.classList.remove("show");
      return;
    }
    els.meter.classList.add("show");
    const d = g.depth || 0;
    els.depthFill.style.width = ((d / 3) * 100) + "%";
    const clock = g.digestMeter && g.digestMeter.active ? g.digestMeter
      : (g.bowel && g.bowel.active ? g.bowel : null);
    if (!clock) {
      els.digestMeter.classList.remove("show", "hot", "critical");
      return;
    }
    els.digestMeter.classList.add("show");
    const ratio = clock.totalMs ? clock.remainingMs / clock.totalMs : 0;
    els.dmFill.style.width = (ratio * 100) + "%";
    const s = Math.ceil(clock.remainingMs / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    els.dmClock.textContent = mm + ":" + ss;
    const bowel = !!(g.bowel && g.bowel.active);
    els.dmTitle.textContent = bowel ? "Disposal" : "Digest";
    els.digestMeter.classList.toggle("hot", ratio < 0.45 && ratio > 0.18);
    els.digestMeter.classList.toggle("critical", ratio <= 0.18);
  }

  async function speak(userText, opts) {
    opts = opts || {};
    const g = db.save && db.save.game;
    if (!g || (g.gone && !opts.after) || busy) return;
    applyActionHints(userText);
    applyScene();
    paintMeter();
    setBusy(true);
    try {
      const extra = opts.after
        ? " AFTER MODE: continue Ang in the SAME night. Do not reset location. The player cannot answer."
        : "";
      const raw = await askActor(buildMessages(userText, extra));
      const parsed = parseActor(raw);
      addTurn({ you: opts.after ? "" : userText, moment: parsed.moment, line: parsed.line });
      db.save.history = db.save.history || [];
      if (!opts.after) db.save.history.push({ role: "user", content: userText });
      db.save.history.push({ role: "assistant", content: raw });
      persist();
    } catch (err) {
      const n = document.createElement("div");
      n.className = "notice";
      n.textContent = String(err && err.message ? err.message : err);
      els.log.appendChild(n);
      els.log.scrollTop = els.log.scrollHeight;
      setLive("Error", "bad");
    }
    setBusy(false);
  }

  function submitCompose() {
    if (!actorReady()) {
      toast("Actor", "Gemini is not wired yet. Workshop and meters work; she cannot answer.", "warn");
      return;
    }
    const composed = composePlayer(els.input.value, composeMode);
    if (!composed) { els.input.focus(); return; }
    els.input.value = "";
    speak(composed);
  }

  function clickAction(key) {
    const labels = actionPrompts();
    const map = { look: labels.look, talk: labels.talk, hide: labels.hide, tease: labels.tease };
    speak("ACTION: " + map[key]);
  }

  function continueAfter() {
    const g = db.save && db.save.game;
    if (!g || !g.gone) return;
    g.afterPasses = (g.afterPasses || 0) + 1;
    speak("ACTION: I am gone. Keep THIS scene.", { after: true });
  }

  document.getElementById("gateGo").addEventListener("click", submitGate);
  document.getElementById("gatePin").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitGate();
  });
  document.getElementById("lockBtn").addEventListener("click", lockDevice);
  document.getElementById("homeBtn").addEventListener("click", () => {
    if (!unlocked) return route();
    if (db.save) { showView("play"); restorePlay(); }
    else { paintWorkshop(); showView("workshop"); }
  });
  document.getElementById("workshopBtn").addEventListener("click", () => {
    if (!unlocked) return;
    persistWorkshop();
    paintWorkshop();
    showView("workshop");
  });
  document.getElementById("startNight").addEventListener("click", startNight);
  document.getElementById("continueNightBtn").addEventListener("click", () => {
    if (db.save) { showView("play"); restorePlay(); }
  });
  ["plName","plPronouns","plRel","plAbout","plTreat","nTitle","nBlurb","nLoc","nPlace","nHook","nOpenM","nOpenL"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", persistWorkshop);
  });
  document.getElementById("modeSay").addEventListener("click", () => setCompose("say"));
  document.getElementById("modeDo").addEventListener("click", () => setCompose("do"));
  els.send.addEventListener("click", submitCompose);
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitCompose(); }
  });
  els.look.addEventListener("click", () => clickAction("look"));
  els.talk.addEventListener("click", () => clickAction("talk"));
  els.hide.addEventListener("click", () => clickAction("hide"));
  els.tease.addEventListener("click", () => clickAction("tease"));
  document.getElementById("keepGoing").addEventListener("click", continueAfter);
  document.getElementById("newFromGone").addEventListener("click", () => {
    paintWorkshop();
    showView("workshop");
  });
  document.getElementById("dmMinus").addEventListener("click", () => nudgeDigest(-60000));
  document.getElementById("dmPlus").addEventListener("click", () => nudgeDigest(60000));
  document.addEventListener("visibilitychange", () => {
    const g = db.save && db.save.game;
    if (g && g.digestMeter && g.digestMeter.active) g.digestMeter.lastTick = Date.now();
  });
  if (window.visualViewport) {
    const vv = window.visualViewport;
    const sync = () => {
      const hidden = window.innerHeight - vv.height - vv.offsetTop;
      document.documentElement.style.setProperty("--kb", Math.max(0, hidden) + "px");
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
  }

  route();
})();
