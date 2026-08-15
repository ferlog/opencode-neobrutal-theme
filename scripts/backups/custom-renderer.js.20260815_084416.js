// =====================================================================
// OpenCode — custom-renderer.js
// Mejoras de UI para que TODOS los botones/menús tengan texto legible
// (clave para la OCR de iavirtualuser) + panel de toggles:
//   - 👁 Ver pantalla  (captura + OCR vía iavirtualuser)
//   - Toggles "utilizar ojos OCR" y "utilizar manos" (persisten en config.json)
// =====================================================================
(function () {
  "use strict"

  // ------------------------------------------------------------------
  // 0) Logging de errores (renderer → archivo temp vía IPC)
  // ------------------------------------------------------------------
  function ocLog(msg, level) {
    try {
      const api = window.api || {}
      if (typeof api.ocLog === "function") {
        api.ocLog(String(msg), level || "info").catch(() => {})
      }
    } catch (e) { /* ignore */ }
  }
  try {
    window.addEventListener("error", (ev) => {
      ocLog("ERROR: " + (ev.message || "") + " @ " + (ev.filename || "") + ":" + (ev.lineno || ""), "error")
    })
    window.addEventListener("unhandledrejection", (ev) => {
      ocLog("UNHANDLEDREJECTION: " + ((ev.reason && (ev.reason.stack || ev.reason.message)) || String(ev.reason)), "error")
    })
    const origErr = console.error
    console.error = function () {
      try { ocLog("CONSOLE.ERROR: " + Array.prototype.slice.call(arguments).join(" "), "error") } catch (e) { /* ignore */ }
      return origErr.apply(console, arguments)
    }
    ocLog("custom-renderer cargado en " + location.pathname, "info")
  } catch (e) { /* ignore */ }

  // ------------------------------------------------------------------
  // 1) Etiquetas de texto en botones de icono (Enviar / Detener)
  // ------------------------------------------------------------------
  function addLabel(btn, text) {
    if (!btn || btn.dataset.ocLabel) return
    if (btn.querySelector('[data-oc-label]')) return
    const span = document.createElement("span")
    span.setAttribute("data-oc-label", "true")
    span.textContent = text
    span.style.cssText =
      "margin-left:6px;font-size:12px;font-weight:600;letter-spacing:.02em;color:inherit;white-space:nowrap;"
    btn.appendChild(span)
    btn.dataset.ocLabel = "1"
    btn.style.display = "inline-flex"
    btn.style.alignItems = "center"
    btn.style.justifyContent = "center"
    // Adaptar el ancho al contenido para que el texto no desborde ni se superponga
    btn.style.width = "auto"
    btn.style.minWidth = "0"
    btn.style.maxWidth = "220px"
    btn.style.boxSizing = "border-box"
    btn.style.flex = "none"
  }

  function isSend(btn) {
    const aria = (btn.getAttribute("aria-label") || "").toLowerCase()
    const text = (btn.textContent || "").toLowerCase()
    if (aria.includes("send") || aria.includes("enviar") || aria.includes("submit")) return true
    if (text.includes("send") || text.includes("enviar")) return true
    return false
  }

  function isStop(btn) {
    const aria = (btn.getAttribute("aria-label") || "").toLowerCase()
    const icon = btn.getAttribute("data-icon") || ""
    if (icon === "stop") return true
    if (aria.includes("stop") || aria.includes("detener")) return true
    return false
  }

  function enhance() {
    const buttons = document.querySelectorAll(
      'button[data-component="icon-button"], button[data-slot*="button"], button[role="button"], button[data-component="icon-button-v2"]'
    )
    buttons.forEach((btn) => {
      if (btn.dataset.ocLabel) return
      const txt = (btn.textContent || "").trim()
      const hasSvg = btn.querySelector("svg")
      if (txt.length <= 2 && hasSvg) {
        if (isStop(btn)) {
          addLabel(btn, "Detener")
          btn.dataset.ocAction = "stop"
        } else if (isSend(btn)) {
          addLabel(btn, "Enviar")
          btn.dataset.ocAction = "send"
        }
      }
      // Etiquetar con el aria-label para que la OCR pueda leer los botones de icono
      const aria = (btn.getAttribute("aria-label") || "").trim()
      if (aria && !btn.dataset.ocLabel && btn.querySelector("svg") && (btn.textContent || "").trim().length <= 2) {
        addLabel(btn, aria)
      }
      // "Nueva sesión" → botón verde con texto
      if (aria && /nueva sesi/i.test(aria)) {
        btn.dataset.ocAction = "new-session"
        btn.style.background = "#2e7d32"
        btn.style.color = "#fff"
        btn.style.borderRadius = "999px"
        btn.style.padding = "0 12px"
        btn.style.height = "34px"
        btn.style.boxShadow = "0 0 0 2px #1b5e20"
      }
      // "Mostrar u ocultar revisión" → botón nativo más grande, verde y legible
      if (aria && /mostrar u ocultar/i.test(aria)) {
        btn.style.width = "auto"
        btn.style.minWidth = "190px"
        btn.style.height = "36px"
        btn.style.padding = "0 16px"
        btn.style.background = "#2e7d32"
        btn.style.color = "#fff"
        btn.style.border = "2px solid #1b5e20"
        btn.style.borderRadius = "999px"
        btn.style.justifyContent = "center"
        btn.style.boxShadow = "0 0 0 2px rgba(255,255,255,0.15)"
        btn.style.gap = "8px"
      }
      // "Copiar respuesta" → botón azul con texto blanco, siempre visible y más ancho
      if (aria && /copiar respuesta/i.test(aria)) {
        btn.style.width = "auto"
        btn.style.minWidth = "150px"
        btn.style.height = "30px"
        btn.style.padding = "0 14px"
        btn.style.background = "#1565c0"
        btn.style.color = "#fff"
        btn.style.border = "2px solid #0d47a1"
        btn.style.borderRadius = "999px"
        btn.style.justifyContent = "center"
        btn.style.opacity = "1"
        btn.style.boxShadow = "0 0 0 2px rgba(255,255,255,0.12)"
        btn.style.gap = "6px"
      }
      // "Menú de OpenCode" → sacarlo de la barra superior y ponerlo flotando
      // encima del panel iavirtualuser (abajo a la izquierda)
      if (aria && /menú de opencode/i.test(aria)) {
        btn.style.position = "fixed"
        btn.style.width = "150px"
        btn.style.height = "34px"
        btn.style.zIndex = "10000"
        btn.style.left = "16px"
        const panel = document.querySelector("[data-oc-panel]")
        let fromBottom = 400
        if (panel) {
          const pr = panel.getBoundingClientRect()
          fromBottom = window.innerHeight - pr.top
        }
        btn.style.bottom = fromBottom + 64 + "px"
        btn.style.padding = "0 16px"
        btn.style.background = "#1a237e"
        btn.style.color = "#fff"
        btn.style.border = "2px solid #0d1b4a"
        btn.style.borderRadius = "8px"
        btn.style.justifyContent = "center"
        btn.style.gap = "8px"
        btn.style.whiteSpace = "nowrap"
        btn.style.overflow = "visible"
        btn.style.flexShrink = "0"
        btn.style.boxShadow = "0 0 0 2px rgba(255,255,255,0.12)"
        if (!btn.dataset.ocClick) {
          btn.dataset.ocClick = "1"
          btn.addEventListener("click", () => ocLog("CLICK-MENU: boton presionado", "info"))
        }
      }
      // "Inicio" → sacarlo de la barra superior y ponerlo flotando bajo el Menú
      if (aria && /^inicio$/i.test(aria)) {
        btn.style.position = "fixed"
        btn.style.setProperty("width", "120px", "important")
        btn.style.height = "34px"
        btn.style.zIndex = "10000"
        btn.style.left = "16px"
        const panel = document.querySelector("[data-oc-panel]")
        let fromBottom = 400
        if (panel) {
          const pr = panel.getBoundingClientRect()
          fromBottom = window.innerHeight - pr.top
        }
        btn.style.bottom = fromBottom + 22 + "px"
        btn.style.padding = "0 16px"
        btn.style.background = "#004d40"
        btn.style.color = "#fff"
        btn.style.border = "2px solid #00251a"
        btn.style.borderRadius = "8px"
        btn.style.justifyContent = "center"
        btn.style.gap = "6px"
        btn.style.whiteSpace = "nowrap"
        btn.style.overflow = "visible"
        btn.style.flexShrink = "0"
        btn.style.boxShadow = "0 0 0 2px rgba(255,255,255,0.12)"
        if (!btn.dataset.ocClick) {
          btn.dataset.ocClick = "1"
          btn.addEventListener("click", () => ocLog("CLICK-INICIO: boton presionado", "info"))
        }
      }
      // Deduplicar etiquetas (ej. "Detener Detener"): si el botón ya tiene
      // el texto nativo, quitar nuestro span y no volver a etiquetarlo.
      const low2 = (btn.textContent || "").toLowerCase()
      for (const w of ["detener", "enviar"]) {
        if (low2.split(w).length - 1 >= 2) {
          btn.querySelectorAll("[data-oc-label]").forEach((s) => s.remove())
          btn.dataset.ocLabel = "1"
        }
      }
    })
  }

  // ------------------------------------------------------------------
  // 2) Panel de control: toggles + Ver pantalla
  // ------------------------------------------------------------------
  function findChatInput() {
    const selectors = [
      '[contenteditable="true"]',
      'textarea[data-slot*="input"]',
      'textarea',
      '[data-slot*="prompt-input"]',
      '[data-component="prompt-input"]'
    ]
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el && el.offsetParent !== null) return el
    }
    return null
  }

  function setInputValue(input, value) {
    if (!input) return
    if (input.isContentEditable) {
      input.focus()
      input.textContent = value
      input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }))
    } else {
      const proto = Object.getPrototypeOf(input)
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
      if (setter) {
        setter.call(input, value)
        input.dispatchEvent(new Event("input", { bubbles: true }))
      } else {
        input.value = value
        input.dispatchEvent(new Event("input", { bubbles: true }))
      }
    }
  }

  function makeToggle(label, key, initial, onChange) {
    const row = document.createElement("div")
    row.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;gap:10px;" +
      "padding:7px 6px;border-bottom:1px solid rgba(255,255,255,0.12);"
    const lab = document.createElement("span")
    lab.textContent = label
    lab.style.cssText = "font-size:12.5px;font-weight:600;color:#fff;line-height:1.2;"
    const sw = document.createElement("button")
    sw.type = "button"
    sw.setAttribute("role", "switch")
    sw.setAttribute("aria-checked", initial ? "true" : "false")
    sw.setAttribute("data-oc-toggle", key)
    const state = document.createElement("span")
    state.textContent = initial ? "ON" : "OFF"
    state.style.cssText =
      "font-size:10px;font-weight:800;letter-spacing:.04em;color:#fff;min-width:34px;text-align:center;"
    const pill = document.createElement("span")
    pill.style.cssText =
      "width:30px;height:16px;border-radius:999px;background:" + (initial ? "#2e7d32" : "#555") + ";" +
      "position:relative;transition:background .15s;border:1px solid rgba(255,255,255,0.3);"
    const knob = document.createElement("span")
    knob.style.cssText =
      "width:12px;height:12px;border-radius:50%;background:#fff;position:absolute;top:1px;" +
      "left:" + (initial ? "15px" : "2px") + ";transition:left .15s;"
    pill.appendChild(knob)
    sw.style.cssText =
      "display:inline-flex;align-items:center;gap:8px;background:transparent;border:none;cursor:pointer;padding:2px;"
    sw.appendChild(pill)
    sw.appendChild(state)

    let current = initial
    function apply(v) {
      current = v
      pill.style.background = v ? "#2e7d32" : "#555"
      knob.style.left = v ? "15px" : "2px"
      sw.setAttribute("aria-checked", v ? "true" : "false")
      state.textContent = v ? "ON" : "OFF"
    }
    sw.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      apply(!current)
      onChange(key, current)
    })

    row.appendChild(lab)
    row.appendChild(sw)
    return { row, apply, get: () => current }
  }

  function addControlPanel() {
    if (document.querySelector('[data-oc-panel]')) return
    ocLog("addControlPanel: creando panel", "debug")

    const wrap = document.createElement("div")
    wrap.setAttribute("data-oc-panel", "true")
    wrap.style.cssText =
      "position:fixed;bottom:16px;left:16px;z-index:9999;width:230px;border-radius:14px;" +
      "border:2px solid #212121;background:#7b1fa2;box-shadow:4px 4px 0 0 #212121;padding:8px;" +
      "font-family:inherit;"

    const header = document.createElement("div")
    header.textContent = "🤖 iavirtualuser"
    header.style.cssText =
      "font-size:13px;font-weight:800;color:#fff;padding:2px 4px 7px;border-bottom:1px solid rgba(255,255,255,0.15);"

    const toggleOjos = makeToggle("👁 Utilizar ojos OCR", "ojos", true, onToggleChange)
    const toggleManos = makeToggle("🖐 Utilizar manos", "manos", true, onToggleChange)
    const toggleSonidos = makeToggle("🔊 Sonidos", "sonidos", true, onToggleChange)
    const toggleAlarmas = makeToggle("🔔 Alarmas", "alarmas", true, onToggleChange)
    const toggleLeer = makeToggle("🗣 Leer respuesta", "leer", false, onToggleChange)

    const verBtn = document.createElement("button")
    verBtn.type = "button"
    verBtn.setAttribute("data-oc-ver-pantalla", "true")
    verBtn.textContent = "📷 Ver pantalla"
    verBtn.style.cssText =
      "width:100%;margin-top:8px;display:inline-flex;align-items:center;justify-content:center;gap:6px;" +
      "padding:8px 10px;border-radius:10px;border:2px solid #212121;cursor:pointer;" +
      "background:#311b92;color:#fff;box-shadow:2px 2px 0 0 #212121;font-weight:700;font-size:12.5px;"
    verBtn.addEventListener("mouseenter", () => (verBtn.style.background = "#4527a0"))
    verBtn.addEventListener("mouseleave", () => (verBtn.style.background = "#311b92"))
    verBtn.addEventListener("mousedown", (e) => {
      e.preventDefault()
      e.stopPropagation()
    })
    verBtn.addEventListener("click", onVerPantalla)

    const probarBtn = document.createElement("button")
    probarBtn.type = "button"
    probarBtn.setAttribute("data-oc-probar-tts", "true")
    probarBtn.textContent = "🔊 Probar lectura"
    probarBtn.style.cssText =
      "width:100%;margin-top:8px;display:inline-flex;align-items:center;justify-content:center;gap:6px;" +
      "padding:8px 10px;border-radius:10px;border:2px solid #212121;cursor:pointer;" +
      "background:#00695c;color:#fff;box-shadow:2px 2px 0 0 #212121;font-weight:700;font-size:12.5px;"
    probarBtn.addEventListener("mouseenter", () => (probarBtn.style.background = "#00897b"))
    probarBtn.addEventListener("mouseleave", () => (probarBtn.style.background = "#00695c"))
    probarBtn.addEventListener("mousedown", (e) => {
      e.preventDefault()
      e.stopPropagation()
    })
    probarBtn.addEventListener("click", () => {
      const original = probarBtn.textContent
      probarBtn.textContent = "🔊 Leyendo..."
      const prueba = "Hola, soy la lectura en voz alta de iavirtualuser. Si escuchas esto, el sistema de texto a voz funciona correctamente."
      speakText(prueba)
      setTimeout(() => (probarBtn.textContent = original), 1500)
    })

    wrap.appendChild(header)
    wrap.appendChild(toggleOjos.row)
    wrap.appendChild(toggleManos.row)
    wrap.appendChild(toggleSonidos.row)
    wrap.appendChild(toggleAlarmas.row)
    wrap.appendChild(toggleLeer.row)
    wrap.appendChild(verBtn)
    wrap.appendChild(probarBtn)
    document.body.appendChild(wrap)

    // Cargar estado persistido
    try {
      const api = window.api || {}
      if (typeof api.configGet === "function") {
        api.configGet().then((r) => {
          if (r && r.ok) {
            toggleOjos.apply(!!r.ojos)
            toggleManos.apply(!!r.manos)
            if (typeof r.sonidos !== "undefined") toggleSonidos.apply(!!r.sonidos)
            if (typeof r.leer !== "undefined") { toggleLeer.apply(!!r.leer); leerOn = !!r.leer }
            if (typeof r.alarmas !== "undefined") { toggleAlarmas.apply(!!r.alarmas); alarmasOn = !!r.alarmas }
            applyAudioState()
            applyTtsState()
          }
        }).catch(() => {})
      }
    } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------------
  // Sonidos: mutear todos los <audio> de OpenCode según el toggle
  // ------------------------------------------------------------------
  let sonidosOn = true
  function applyAudioState() {
    window.__ocSonidos = sonidosOn
    document.querySelectorAll("audio, video").forEach((el) => {
      el.muted = !sonidosOn
      if (!sonidosOn) {
        try { el.pause() } catch (e) { /* ignore */ }
      }
    })
  }

  // ------------------------------------------------------------------
  // Leer respuesta (TTS) + Alarma (sonido corto) al terminar una respuesta
  // ------------------------------------------------------------------
  let leerOn = false
  let lastSpoken = ""
  let alarmasOn = true
  let ttsObs = null
  let wasStreaming = false
  let lastSeen = ""
  let readTimer = null

  function isStreaming() {
    const sendBtn = document.querySelector('[data-action="prompt-submit"]')
    if (sendBtn) {
      const d = sendBtn.getAttribute("data-disabled")
      if (sendBtn.disabled === true || (d && d.length > 0)) return true
    }
    if (document.querySelector('[data-oc-action="stop"], [data-icon="stop"]')) return true
    return false
  }

  function playAlarma() {
    try {
      const api = window.api || {}
      if (typeof api.alarma === "function") {
        api.alarma("doble").catch(() => {})
      }
    } catch (e) { /* ignore */ }
  }

  function stopSpeaking() {
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    } catch (e) { /* ignore */ }
  }

  function speakText(text) {
    try {
      // Vía nativa (fiable en Electron): TTS de Windows vía IPC/Python
      const api = window.api || {}
      if (typeof api.speak === "function") {
        api.speak(text).catch(() => { /* fallback abajo */ })
        return
      }
      // Fallback: speechSynthesis del navegador
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = "es-ES"
        u.rate = 1
        u.pitch = 1
        window.speechSynthesis.speak(u)
      }
    } catch (e) { /* ignore */ }
  }

  function cleanForSpeech(text) {
    return text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^>\s*/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+[.)]\s+/gm, "")
      .replace(/\|/g, " ")
      .replace(/^[-=]{3,}$/gm, "")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/[*_~`>]/g, "")
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  function extractBetweenMarkers(text) {
    // Lee SOLO el contenido entre el renglón "inicio de respuesta" y el
    // renglón "fin de respuesta" (los marcadores pueden llevar hora/fecha).
    const lines = text.split(/\r?\n/)
    let start = -1
    let end = -1
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].toLowerCase()
      if (start === -1 && l.includes("inicio de respuesta")) start = i
      if (l.includes("fin de respuesta")) end = i
    }
    if (start === -1) return text
    if (end === -1) end = lines.length
    return lines.slice(start + 1, end).join(" ")
  }

  function getLastAssistantText() {
    // El asistente termina su respuesta: buscar el último bloque de texto
    // dentro del timeline. Se prioriza data-timeline-part-id (partes de texto).
    const parts = Array.from(document.querySelectorAll('[data-timeline-part-id]'))
    for (let i = parts.length - 1; i >= 0; i--) {
      const t = (parts[i].textContent || "").trim()
      if (t.length > 1) return cleanForSpeech(extractBetweenMarkers(t))
    }
    return ""
  }

  function applyTtsState() {
    if (!leerOn) { stopSpeaking() }
    // El observer se mantiene activo mientras haga falta leer o sonar la alarma.
    if ((!leerOn && !alarmasOn) || ttsObs) return
    // Detecta el FIN de una generación (no depende del botón Detener):
    // solo cuando OpenCode deja de estar "streaming" leemos la respuesta final.
    // Así NO leemos todo el historial ni mensajes antiguos al hacer scroll.
    ttsObs = new MutationObserver(function () {
      if (!leerOn && !alarmasOn) return
      if (isStreaming()) {
        wasStreaming = true
        return
      }
      if (!wasStreaming) return
      // Ya no está generando → respuesta completada
      const text = getLastAssistantText()
      if (!text || text === lastSeen) { wasStreaming = false; return }
      lastSeen = text
      clearTimeout(readTimer)
      readTimer = setTimeout(() => {
        wasStreaming = false
        const now = getLastAssistantText()
        if (now && now === lastSeen && now !== lastSpoken) {
          lastSpoken = now
          if (alarmasOn) playAlarma()
          if (leerOn) speakText(now.slice(0, 800))
        }
      }, 900)
    })
    ttsObs.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["data-disabled", "disabled", "data-icon", "data-interrupted"]
    })
  }

  function onToggleChange(key, value) {
    if (key === "sonidos") { sonidosOn = value; applyAudioState() }
    if (key === "leer") { leerOn = value; applyTtsState() }
    if (key === "alarmas") { alarmasOn = value; applyTtsState() }
    try {
      const api = window.api || {}
      if (typeof api.configSet === "function") {
        api.configSet({ [key]: value }).catch(() => {})
      }
    } catch (e) { /* ignore */ }
  }

  async function onVerPantalla(e) {
    e.preventDefault()
    e.stopPropagation()
    const btn = e.currentTarget
    if (btn.dataset.ocBusy) return
    btn.dataset.ocBusy = "1"
    const original = btn.textContent
    btn.textContent = "⏳ Leyendo pantalla..."
    btn.style.background = "#4527a0"
    try {
      const api = window.api || {}
      let result
      if (typeof api.verPantalla === "function") {
        result = await api.verPantalla(false)
      }
      if (result && result.ok) {
        const input = findChatInput()
        const texto = result.texto || "(sin texto detectado)"
        const mensaje = "[VER PANTALLA - texto visible detectado por OCR]\n" + texto
        if (input) {
          setInputValue(input, mensaje)
          input.focus()
        } else {
          window.alert(mensaje)
        }
        btn.style.background = "#1b5e20"
        btn.textContent = "✓ Leído"
      } else {
        const err = (result && result.error) || "No se pudo leer la pantalla"
        btn.style.background = "#b71c1c"
        btn.textContent = "✗ Error"
        window.alert("Ver pantalla: " + err)
      }
    } catch (err2) {
      btn.style.background = "#b71c1c"
      btn.textContent = "✗ Error"
      window.alert("Ver pantalla: " + err2)
    } finally {
      setTimeout(() => {
        btn.textContent = original
        btn.style.background = "#311b92"
        delete btn.dataset.ocBusy
      }, 1500)
    }
  }



  // ------------------------------------------------------------------
  // Arranque
  // ------------------------------------------------------------------
  let attempts = 0
  // ------------------------------------------------------------------
  // 3) Desplazar la franja de pestañas a la derecha (evitar encimarse
  //    con los botones Menú/Inicio)
  // ------------------------------------------------------------------
  function shiftTabs() {
    try {
      const tabList = document.querySelector('[data-titlebar-tab-list]')
      if (!tabList) return
      tabList.style.position = "relative"
      tabList.style.left = "200px"
      tabList.style.zIndex = "50"
      ocLog("shiftTabs: franja de pestañas desplazada 200px a la derecha", "debug")
    } catch (e) { /* ignore */ }
  }

  function run() {
    enhance()
    addControlPanel()
    shiftTabs()
    if (attempts < 14) {
      attempts++
      ocLog("run: attempt " + attempts, "debug")
      setTimeout(run, 1200)
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run)
  } else {
    run()
  }

  try {
    const mo = new MutationObserver(function () {
      enhance()
    })
    mo.observe(document.body, { childList: true, subtree: true, characterData: true })
  } catch (e) { /* ignore */ }

  // ------------------------------------------------------------------
  // Dump DOM (temporal, inofensivo): ayuda a inspeccionar el DOM real.
  // Escribe estructura a un archivo temp al arrancar la app.
  // ------------------------------------------------------------------
  function ocDump() {
    try {
      const api = window.api || {}
      if (typeof api.ocDump !== "function") return
      const lines = []
      lines.push("=== BUTTONS (texto + attrs + SIZE) ===")
      document.querySelectorAll("button").forEach((b) => {
        const txt = (b.textContent || "").trim().slice(0, 24)
        const rect = b.getBoundingClientRect()
        const sz = `size=${Math.round(rect.width)}x${Math.round(rect.height)}`
        const attrs = []
        for (const a of b.attributes) {
          if (/data-|aria-|title|class|role/.test(a.name)) attrs.push(`${a.name}=${a.value.slice(0, 60)}`)
        }
        lines.push(`BTN "${txt}" ${sz} ${attrs.join(" ")}`)
      })
      lines.push("")
      lines.push("=== TITLEBAR RIGHT (window controls) ===")
      const tr = document.getElementById("opencode-titlebar-right") ||
        document.querySelector('[id*="titlebar"][id*="right"]')
      lines.push(tr ? tr.outerHTML.slice(0, 4000) : "NO titlebar-right")
      lines.push("")
      lines.push("=== WINDOW CONTROL BUTTONS ===")
      document.querySelectorAll('button[aria-label*="minim"], button[aria-label*="maxim"], button[aria-label*="cerrar"], button[aria-label*="close"], button[data-slot*="window"]').forEach((b) => {
        const r = b.getBoundingClientRect()
        lines.push(`WINBTN aria="${b.getAttribute("aria-label")}" size=${Math.round(r.width)}x${Math.round(r.height)} ${b.outerHTML.slice(0, 400)}`)
      })
      lines.push("")
      lines.push("=== DOCK-PROMPT ===")
      const dock = document.querySelector('[data-component="dock-prompt"]')
      lines.push(dock ? dock.outerHTML.slice(0, 4000) : "NO dock-prompt")
      lines.push("")
      lines.push("=== PROMPT CONTROLS (agent/model) ===")
      document.querySelectorAll('[data-component*="prompt-"], [data-component*="agent"], [data-slot*="agent"]').forEach((el) => {
        lines.push(`${el.tagName} ${el.outerHTML.slice(0, 400)}`)
      })
      lines.push("")
      lines.push("=== TOP-LEVEL divs ===")
      document.querySelectorAll("body > div").forEach((el) => {
        lines.push(`TOP ${el.getAttribute("data-component") || el.getAttribute("data-slot") || el.className.slice(0, 60)}`)
      })
      lines.push("")
      lines.push("=== TIMELINE PARTS ===")
      document.querySelectorAll("[data-timeline-part-id]").forEach((p) => {
        const txt = (p.textContent || "").trim()
        const msgId = p.closest("[data-message-id]")
        const roleAttr = msgId ? Array.from(msgId.attributes).filter((a) => /role|author/i.test(a.name)).map((a) => a.name + "=" + a.value).join(" ") : ""
        lines.push(`PART id=${p.getAttribute("data-timeline-part-id")} len=${txt.length} msg=${msgId ? msgId.getAttribute("data-message-id") : "-"} ${roleAttr} :: ${txt.slice(0, 70)}`)
      })
      lines.push("")
      lines.push("=== MESSAGE ROLES ===")
      document.querySelectorAll("[data-message-id]").forEach((m) => {
        const attrs = []
        for (const a of m.attributes) {
          if (/role|author|data-message/.test(a.name)) attrs.push(a.name + "=" + a.value.slice(0, 40))
        }
        lines.push(`MSG ${m.getAttribute("data-message-id")} ${attrs.join(" ")} :: ${(m.textContent || "").trim().slice(0, 50)}`)
      })
      lines.push("")
      lines.push("=== TAB STRIP ===")
      const tl = document.querySelector('[data-titlebar-tab-list]')
      if (tl) {
        const r = tl.getBoundingClientRect()
        lines.push(`TABLIST x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.width)} h=${Math.round(r.height)} pos=${tl.style.position} L=${tl.style.left} parentW=${tl.parentElement ? Math.round(tl.parentElement.getBoundingClientRect().width) : "-"}`)
        tl.querySelectorAll('[data-titlebar-tab], [data-tab-key], a[href]').forEach((t) => {
          const tr = t.getBoundingClientRect()
          lines.push(`  TAB x=${Math.round(tr.x)} w=${Math.round(tr.width)} txt="${(t.textContent || "").trim().slice(0, 30)}"`)
        })
      } else {
        lines.push("NO tab-list")
      }
      lines.push("")
      lines.push("=== TOP BAR RECTS ===")
      document.querySelectorAll("button").forEach((b) => {
        const r = b.getBoundingClientRect()
        if (r.y < 70 && r.width > 0) {
          const p = b.parentElement
          const pr = p ? p.getBoundingClientRect() : null
          lines.push(`RECT aria="${(b.getAttribute("aria-label") || "").slice(0, 30)}" x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.width)} h=${Math.round(r.height)} parentX=${pr ? Math.round(pr.x) : "-"} parentW=${pr ? Math.round(pr.width) : "-"} pos=${(b.style.position || "static")} L=${b.style.left || "-"} M=${b.style.marginLeft || "-"}`)
        }
      })
      lines.push("")
      lines.push("=== DATA ATTRS (inventario) ===")
      const attrNames = {}
      document.querySelectorAll("body *").forEach((el) => {
        for (const a of el.attributes) {
          if (a.name.startsWith("data-")) attrNames[a.name] = (attrNames[a.name] || 0) + 1
        }
      })
      Object.entries(attrNames)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 45)
        .forEach(([k, v]) => lines.push(`${k}: ${v}`))
      api.ocDump(lines.join("\n")).catch(() => {})
      ocLog("ocDump generado: " + lines.length + " líneas", "debug")
    } catch (e) { /* ignore */ }
  }
  setTimeout(ocDump, 5000)
  // ------------------------------------------------------------------
})()

// Log de carga del script (fuera del IIFE para atrapar errores de parseo)
try {
  if (window.api && typeof window.api.ocLog === "function") {
    window.api.ocLog("custom-renderer.js evaluado OK", "info").catch(() => {})
  }
} catch (e) { /* ignore */ }
