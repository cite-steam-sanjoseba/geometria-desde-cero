/* ===========================================================
   Geometría desde cero — lógica de la web
   Sin dependencias. Progreso en localStorage.
   =========================================================== */
(function () {
  "use strict";

  var STORE_KEY = "geometria_desde_cero_v1";

  /* Secciones que cuentan para el progreso (5 bloques + medida) */
  var BLOQUES = ["b1", "b2", "b3", "b4", "b5", "medida"];

  /* --------- Estado en localStorage (con try/catch) --------- */
  function leerEstado() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* localStorage no disponible */ }
    return { bloques: {}, ejercicios: {}, reto: { hecho: false, puntuacion: 0 }, fecha: null };
  }
  function guardarEstado(est) {
    try {
      est.fecha = new Date().toISOString();
      localStorage.setItem(STORE_KEY, JSON.stringify(est));
    } catch (e) { /* ignorar si no se puede */ }
  }
  var estado = leerEstado();

  /* --------- Navegación entre secciones --------- */
  var secciones = document.querySelectorAll(".seccion");
  var navBtns = document.querySelectorAll(".nav-btn");

  function irA(id) {
    secciones.forEach(function (s) { s.classList.toggle("activa", s.id === id); });
    navBtns.forEach(function (b) { b.classList.toggle("activa-nav", b.dataset.goto === id); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("click", function (e) {
    var goto = e.target.closest("[data-goto]");
    if (goto) { irA(goto.dataset.goto); return; }
    var accion = e.target.closest("[data-accion]");
    if (accion) {
      if (accion.dataset.accion === "imprimir") prepararEImprimir();
      if (accion.dataset.accion === "reiniciar") reiniciar();
    }
  });

  /* --------- Utilidades --------- */
  function setFeedback(ej, texto, ok) {
    var fb = ej.querySelector(".feedback");
    if (!fb) return;
    fb.textContent = texto;
    fb.classList.remove("ok", "err");
    fb.classList.add(ok ? "ok" : "err");
  }

  function marcarResuelto(ej) {
    var id = ej.dataset.id;
    if (!id) return;
    ej.classList.add("resuelto");
    estado.ejercicios[id] = true;
    guardarEstado(estado);
    comprobarBloque(ej.dataset.bloque);
  }

  /* --------- Ejercicios numéricos (respuesta fija) --------- */
  function comprobarNumerico(ej) {
    var input = ej.querySelector("input[type=number]");
    var esperado = parseFloat(ej.dataset.respuesta);
    var tol = parseFloat(ej.dataset.tol || "0.1");
    var val = parseFloat((input.value || "").replace(",", "."));
    if (isNaN(val)) { setFeedback(ej, "✏️ Escribe un número primero.", false); return false; }
    if (Math.abs(val - esperado) <= tol) {
      setFeedback(ej, "✓ ¡Correcto!", true);
      marcarResuelto(ej);
      return true;
    }
    setFeedback(ej, "✗ Aún no. Revisa el cálculo e inténtalo otra vez.", false);
    return false;
  }

  /* --------- Ejercicios de opción múltiple --------- */
  function comprobarOpcion(ej, btn) {
    if (ej.classList.contains("resuelto")) return;
    var correcta = ej.dataset.correcta;
    var elegido = btn.dataset.val;
    if (elegido === correcta) {
      btn.classList.add("sel-ok");
      setFeedback(ej, "✓ ¡Correcto!", true);
      ej.querySelectorAll(".opcion").forEach(function (o) { o.disabled = true; });
      marcarResuelto(ej);
    } else {
      btn.classList.add("sel-err");
      setFeedback(ej, "✗ Esa no es. Prueba con otra opción.", false);
    }
  }

  /* --------- Medida real (se calcula desde las medidas) --------- */
  function valor(ej, clase) {
    var el = ej.querySelector("." + clase);
    if (!el) return NaN;
    return parseFloat((el.value || "").replace(",", "."));
  }
  function calcularEsperado(ej) {
    var fig = ej.dataset.figura, mag = ej.dataset.magnitud, PI = 3.14;
    if (fig === "rectangulo" && mag === "area") return valor(ej, "m-base") * valor(ej, "m-altura");
    if (fig === "rectangulo" && mag === "perimetro") return 2 * (valor(ej, "m-base") + valor(ej, "m-altura"));
    if (fig === "cuadrado" && mag === "area") return valor(ej, "m-lado") * valor(ej, "m-lado");
    if (fig === "cuadrado" && mag === "perimetro") return 4 * valor(ej, "m-lado");
    if (fig === "circulo" && mag === "area") return PI * valor(ej, "m-radio") * valor(ej, "m-radio");
    if (fig === "circulo" && mag === "perimetro") return 2 * PI * valor(ej, "m-radio");
    if (fig === "ortoedro" && mag === "volumen") return valor(ej, "m-largo") * valor(ej, "m-ancho") * valor(ej, "m-alto");
    if (fig === "cilindro" && mag === "volumen") return PI * valor(ej, "m-radio") * valor(ej, "m-radio") * valor(ej, "m-altura");
    return NaN;
  }
  function comprobarMedida(ej) {
    var medidas = ej.querySelectorAll(".medida-inputs input:not(.m-res)");
    var faltan = false;
    medidas.forEach(function (i) { if (isNaN(parseFloat((i.value || "").replace(",", ".")))) faltan = true; });
    if (faltan) { setFeedback(ej, "✏️ Primero anota todas tus medidas.", false); return; }
    var esperado = calcularEsperado(ej);
    var res = valor(ej, "m-res");
    if (isNaN(res)) { setFeedback(ej, "✏️ Escribe tu resultado del cálculo.", false); return; }
    var tol = parseFloat(ej.dataset.tol || "1");
    var aprox = Math.round(esperado * 100) / 100;
    if (Math.abs(res - esperado) <= tol) {
      setFeedback(ej, "✓ ¡Bien aplicado! Con tus medidas, el resultado es ≈ " + aprox + ".", true);
      marcarResuelto(ej);
    } else {
      setFeedback(ej, "✗ Con tus medidas debería salir ≈ " + aprox + ". Revisa la operación.", false);
    }
  }

  /* --------- Enganchar todos los controles --------- */
  document.querySelectorAll(".btn-check").forEach(function (btn) {
    btn.addEventListener("click", function () { comprobarNumerico(btn.closest(".ejercicio")); });
  });
  document.querySelectorAll(".btn-check-medida").forEach(function (btn) {
    btn.addEventListener("click", function () { comprobarMedida(btn.closest(".ejercicio")); });
  });
  document.querySelectorAll(".quiz .opcion").forEach(function (op) {
    op.addEventListener("click", function () {
      var ej = op.closest(".ejercicio");
      if (ej.classList.contains("reto-item")) { seleccionarRetoOpcion(ej, op); }
      else { comprobarOpcion(ej, op); }
    });
  });
  /* Permitir Enter en los inputs numéricos */
  document.querySelectorAll(".ejercicio:not(.reto-item) input[type=number]").forEach(function (inp) {
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var ej = inp.closest(".ejercicio");
        var btn = ej.querySelector(".btn-check, .btn-check-medida");
        if (btn) btn.click();
      }
    });
  });

  /* --------- Completar un bloque --------- */
  function comprobarBloque(bloque) {
    if (!bloque) return;
    var ejs = document.querySelectorAll('.ejercicio[data-bloque="' + bloque + '"]');
    if (!ejs.length) return;
    var todos = true;
    ejs.forEach(function (ej) { if (!estado.ejercicios[ej.dataset.id]) todos = false; });
    if (todos) {
      estado.bloques[bloque] = true;
      guardarEstado(estado);
      var aviso = document.querySelector('.captura[data-captura="' + bloque + '"]');
      if (aviso) aviso.hidden = false;
    }
    actualizarProgreso();
  }

  /* --------- Barra de progreso global --------- */
  function actualizarProgreso() {
    var hechos = BLOQUES.filter(function (b) { return estado.bloques[b]; }).length;
    var extra = estado.reto.hecho ? " + reto" : "";
    var txt = document.getElementById("progreso-texto");
    var barra = document.getElementById("barra-rell");
    if (txt) txt.textContent = hechos + "/" + BLOQUES.length + " secciones" + extra;
    if (barra) barra.style.width = Math.round((hechos / BLOQUES.length) * 100) + "%";
    /* marcar mini-bloques completados en inicio */
    document.querySelectorAll(".mini-bloque[data-goto]").forEach(function (mb) {
      mb.classList.toggle("completado", !!estado.bloques[mb.dataset.goto]);
    });
  }

  /* --------- Restaurar estado al cargar --------- */
  function restaurar() {
    /* ejercicios numéricos y de opción ya resueltos */
    document.querySelectorAll(".ejercicio[data-id]").forEach(function (ej) {
      if (ej.classList.contains("reto-item")) return;
      if (estado.ejercicios[ej.dataset.id]) {
        ej.classList.add("resuelto");
        if (ej.classList.contains("quiz")) {
          var correcta = ej.dataset.correcta;
          ej.querySelectorAll(".opcion").forEach(function (o) {
            o.disabled = true;
            if (o.dataset.val === correcta) o.classList.add("sel-ok");
          });
          setFeedback(ej, "✓ ¡Correcto!", true);
        } else {
          var inp = ej.querySelector("input[type=number]");
          if (inp && ej.dataset.respuesta) inp.value = ej.dataset.respuesta;
          setFeedback(ej, "✓ ¡Correcto!", true);
        }
      }
    });
    /* avisos de captura de bloques completados */
    BLOQUES.forEach(function (b) {
      if (estado.bloques[b]) {
        var aviso = document.querySelector('.captura[data-captura="' + b + '"]');
        if (aviso) aviso.hidden = false;
      }
    });
    if (estado.reto.hecho) mostrarResultadoReto(estado.reto.puntuacion, false);
    actualizarProgreso();
  }

  /* ===================== RETO FINAL ===================== */
  function seleccionarRetoOpcion(ej, op) {
    ej.querySelectorAll(".opcion").forEach(function (o) { o.classList.remove("sel-ok", "sel-err"); o.removeAttribute("data-elegido"); });
    op.classList.add("sel-ok");
    op.setAttribute("data-elegido", "1");
  }

  function corregirReto() {
    var items = document.querySelectorAll("#reto-lista .reto-item");
    var aciertos = 0;
    items.forEach(function (ej) {
      var ok = false;
      if (ej.classList.contains("quiz")) {
        var elegido = ej.querySelector(".opcion[data-elegido]");
        ok = elegido && elegido.dataset.val === ej.dataset.correcta;
        ej.querySelectorAll(".opcion").forEach(function (o) {
          o.disabled = true;
          o.classList.remove("sel-ok", "sel-err");
          if (o.dataset.val === ej.dataset.correcta) o.classList.add("sel-ok");
          else if (o.hasAttribute("data-elegido")) o.classList.add("sel-err");
        });
      } else {
        var inp = ej.querySelector("input[type=number]");
        var val = parseFloat((inp.value || "").replace(",", "."));
        var tol = parseFloat(ej.dataset.tol || "0.1");
        ok = !isNaN(val) && Math.abs(val - parseFloat(ej.dataset.respuesta)) <= tol;
        inp.disabled = true;
      }
      setFeedback(ej, ok ? "✓ Correcta" : "✗ Era: " + (ej.dataset.correcta || ej.dataset.respuesta), ok);
      if (ok) aciertos++;
    });
    estado.reto = { hecho: true, puntuacion: aciertos };
    guardarEstado(estado);
    mostrarResultadoReto(aciertos, true);
    actualizarProgreso();
  }

  function mostrarResultadoReto(aciertos, scroll) {
    var box = document.getElementById("reto-resultado");
    var msg = aciertos >= 7 ? "¡Muy bien! Dominas lo básico. 🎉"
            : aciertos >= 4 ? "¡Vas por buen camino! Repasa lo que falló."
            : "Repasa los bloques y vuelve a intentarlo. ¡Tú puedes!";
    box.innerHTML = '<span class="nota">' + aciertos + '/10</span>' + msg;
    box.hidden = false;
    document.getElementById("btn-rehacer-reto").hidden = false;
    document.querySelector('.captura[data-captura="reto"]').hidden = false;
    if (scroll) box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function rehacerReto() {
    document.querySelectorAll("#reto-lista .reto-item").forEach(function (ej) {
      ej.classList.remove("resuelto");
      setFeedback(ej, "", true);
      ej.querySelector(".feedback").className = "feedback";
      ej.querySelectorAll(".opcion").forEach(function (o) { o.disabled = false; o.classList.remove("sel-ok", "sel-err"); o.removeAttribute("data-elegido"); });
      var inp = ej.querySelector("input[type=number]"); if (inp) { inp.disabled = false; inp.value = ""; }
    });
    document.getElementById("reto-resultado").hidden = true;
    document.getElementById("btn-rehacer-reto").hidden = true;
    document.querySelector('.captura[data-captura="reto"]').hidden = true;
  }

  var btnCorr = document.getElementById("btn-corregir-reto");
  var btnReh = document.getElementById("btn-rehacer-reto");
  if (btnCorr) btnCorr.addEventListener("click", corregirReto);
  if (btnReh) btnReh.addEventListener("click", rehacerReto);

  /* ===================== IMPRIMIR FICHA ===================== */
  function prepararEImprimir() {
    var hechos = BLOQUES.filter(function (b) { return estado.bloques[b]; });
    var nombres = { b1: "Figuras", b2: "Perímetros y áreas", b3: "Compuestas", b4: "Pitágoras", b5: "Cuerpos", medida: "Mídelo tú" };
    var lista = hechos.length ? hechos.map(function (b) { return nombres[b]; }).join(", ") : "ninguna todavía";
    var reto = estado.reto.hecho ? (" · Reto: " + estado.reto.puntuacion + "/10") : "";
    var p = document.getElementById("ficha-progreso-txt");
    if (p) p.textContent = "Secciones completadas (" + hechos.length + "/6): " + lista + reto;
    window.print();
  }

  /* ===================== REINICIAR ===================== */
  function reiniciar() {
    if (!window.confirm("¿Seguro que quieres borrar todo tu progreso? Esta acción no se puede deshacer.")) return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    estado = { bloques: {}, ejercicios: {}, reto: { hecho: false, puntuacion: 0 }, fecha: null };
    /* recargar para dejar todo limpio */
    window.location.reload();
  }

  /* ===================== ARRANQUE ===================== */
  restaurar();
  irA("inicio");

})();
