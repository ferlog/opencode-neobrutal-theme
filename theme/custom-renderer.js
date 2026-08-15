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
      'button[data-component="icon-button"], button[data-slot*="button"], button[role="button"]'
    )
    buttons.forEach((btn) => {
      const txt = (btn.textContent || "").trim()
      if (txt.length > 2) return
      const hasSvg = btn.querySelector("svg")
      if (!hasSvg) return
      if (isStop(btn)) {
        addLabel(btn, "Detener")
        btn.dataset.ocAction = "stop"
      } else if (isSend(btn)) {
        addLabel(btn, "Enviar")
        btn.dataset.ocAction = "send"
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

    const wrap = document.createElement("div")
    wrap.setAttribute("data-oc-panel", "true")
    wrap.style.cssText =
      "position:fixed;bottom:152px;right:16px;z-index:9999;width:230px;border-radius:14px;" +
      "border:2px solid #212121;background:#7b1fa2;box-shadow:4px 4px 0 0 #212121;padding:8px;" +
      "font-family:inherit;"

    const header = document.createElement("div")
    header.textContent = "🤖 iavirtualuser"
    header.style.cssText =
      "font-size:13px;font-weight:800;color:#fff;padding:2px 4px 7px;border-bottom:1px solid rgba(255,255,255,0.15);"

    const toggleOjos = makeToggle("👁 Utilizar ojos OCR", "ojos", true, onToggleChange)
    const toggleManos = makeToggle("🖐 Utilizar manos", "manos", true, onToggleChange)

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

    wrap.appendChild(header)
    wrap.appendChild(toggleOjos.row)
    wrap.appendChild(toggleManos.row)
    wrap.appendChild(verBtn)
    document.body.appendChild(wrap)

    // Cargar estado persistido
    try {
      const api = window.api || {}
      if (typeof api.configGet === "function") {
        api.configGet().then((r) => {
          if (r && r.ok) {
            toggleOjos.apply(!!r.ojos)
            toggleManos.apply(!!r.manos)
          }
        }).catch(() => {})
      }
    } catch (e) { /* ignore */ }
  }

  function onToggleChange(key, value) {
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
  function run() {
    enhance()
    addControlPanel()
    if (attempts < 12) {
      attempts++
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
    mo.observe(document.body, { childList: true, subtree: true })
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
      lines.push("=== BUTTONS (texto + attrs) ===")
      document.querySelectorAll("button").forEach((b) => {
        const txt = (b.textContent || "").trim().slice(0, 20)
        const attrs = []
        for (const a of b.attributes) {
          if (/data-|aria-|title|class|role/.test(a.name)) attrs.push(`${a.name}=${a.value.slice(0, 60)}`)
        }
        if (txt || /data-component|data-slot|titlebar/.test(b.outerHTML)) {
          lines.push(`BTN txt="${txt}" ${attrs.join(" ")}`)
        }
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
      api.ocDump(lines.join("\n")).catch(() => {})
    } catch (e) { /* ignore */ }
  }
  setTimeout(ocDump, 5000)
  // ------------------------------------------------------------------
})()
