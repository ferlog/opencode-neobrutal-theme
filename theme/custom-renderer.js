// =====================================================================
// OpenCode — custom-renderer.js
// Mejoras de UI: añade texto a los botones de icono (enviar/detener)
// y hace visible el selector de agentes bajo el cuadro de diálogo.
// Se ejecuta después de que la app monta el DOM.
// =====================================================================
(function () {
  "use strict"

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
      // Evitar duplicar en botones que ya tienen texto largo
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

  // Ejecutar tras montaje y reintentar mientras la app carga
  let attempts = 0
  function run() {
    enhance()
    if (attempts < 8) {
      attempts++
      setTimeout(run, 1500)
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run)
  } else {
    run()
  }

  // Observar cambios en el DOM (SPA) para añadir etiquetas a botones nuevos
  try {
    const mo = new MutationObserver(function () {
      enhance()
    })
    mo.observe(document.body, { childList: true, subtree: true })
  } catch (e) {
    /* ignore */
  }

  // =====================================================================
  // BOTÓN "VER PANTALLA" (iavirtualuser)
  // Captura la pantalla + OCR y coloca el texto visible en el chat para
  // que el asistente "vea" la pantalla sin imágenes.
  // =====================================================================
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

  function addVerPantallaButton() {
    if (document.querySelector('[data-oc-ver-pantalla]')) return
    const btn = document.createElement("button")
    btn.type = "button"
    btn.setAttribute("data-oc-ver-pantalla", "true")
    btn.setAttribute("title", "Ver pantalla (OCR de iavirtualuser)")
    btn.innerHTML =
      '<span style="font-size:15px;line-height:1">👁</span>' +
      '<span style="margin-left:5px;font-size:12px;font-weight:700">Ver pantalla</span>'
    btn.style.cssText =
      "position:fixed;bottom:96px;right:16px;z-index:9999;display:inline-flex;align-items:center;" +
      "gap:2px;padding:6px 12px;border-radius:999px;border:2px solid #212121;cursor:pointer;" +
      "background:#7b1fa2;color:#fff;box-shadow:3px 3px 0 0 #212121;font-family:inherit;" +
      "transition:transform .1s ease;"
    btn.addEventListener("mouseenter", () => (btn.style.background = "#6a1b9a"))
    btn.addEventListener("mouseleave", () => (btn.style.background = "#7b1fa2"))
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault()
      e.stopPropagation()
    })
    btn.addEventListener("click", async (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (btn.dataset.ocBusy) return
      btn.dataset.ocBusy = "1"
      const original = btn.innerHTML
      btn.innerHTML = '<span style="font-size:13px">⏳</span><span style="margin-left:5px;font-size:12px;font-weight:700">Leyendo...</span>'
      try {
        const api = window.api || {}
        let result
        if (typeof api.verPantalla === "function") {
          result = await api.verPantalla(false)
        }
        if (result && result.ok) {
          const input = findChatInput()
          const texto = result.texto || "(sin texto detectado)"
          const mensaje =
            "[VER PANTALLA - texto visible detectado por OCR]\n" + texto
          if (input) {
            setInputValue(input, mensaje)
            input.focus()
          } else {
            window.alert(mensaje)
          }
          btn.style.background = "#2e7d32"
        } else {
          const err = (result && result.error) || "No se pudo leer la pantalla"
          btn.style.background = "#c62828"
          if (input) {
            setInputValue(input, "[ERROR VER PANTALLA] " + err)
          }
          window.alert("Ver pantalla: " + err)
        }
      } catch (err2) {
        btn.style.background = "#c62828"
        window.alert("Ver pantalla: " + err2)
      } finally {
        btn.innerHTML = original
        btn.style.background = "#7b1fa2"
        delete btn.dataset.ocBusy
      }
    })
    document.body.appendChild(btn)
  }

  let attempts2 = 0
  function run2() {
    addVerPantallaButton()
    if (attempts2 < 10) {
      attempts2++
      setTimeout(run2, 1200)
    }
  }
  setTimeout(run2, 800)
})()
