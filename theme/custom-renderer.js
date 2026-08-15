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
})()
