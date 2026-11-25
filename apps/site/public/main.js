/* Mi Sagrado Corazón · web pública · «El camino de la luz».
   Se carga en <head> sin defer para marcar <html class="js"> antes de pintar (sin JS, todo se ve). */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* ---------- Titular letra a letra: sube 35 px en 0,4 s, 39 ms entre letras, desde 0,8 s ---------- */
  function splitTitle() {
    var i = 0;
    $$(".hero__line").forEach(function (line) {
      var text = line.textContent;
      line.textContent = "";
      text.split("").forEach(function (ch) {
        var s = document.createElement("span");
        s.className = "hero__l";
        s.textContent = ch === " " ? " " : ch;
        s.style.animationDelay = (0.8 + i * 0.039).toFixed(3) + "s";
        i++;
        line.appendChild(s);
      });
    });
  }

  /* ---------- Portada: velas que se encienden al pasar la mano ---------- */
  function hero() {
    var root = $(".hero");
    var canvas = $(".hero__canvas");
    var out = $("[data-lit]");
    if (!root || !canvas || !canvas.getContext) return;

    var off = new Image();
    var on = new Image();
    off.src = "/img/corazon_velas_apagado.webp";
    on.src = "/img/corazon_velas_encendido.webp";

    var mask = document.createElement("canvas");
    var layer = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var m = mask.getContext("2d");
    var L = layer.getContext("2d");

    var cells = new Map();
    var count = 0;
    var step = 96;
    var heart = 0;
    var raf = 0;
    var visible = true;

    // Vida de una luz: entra 0,2 s, crece 1 s, se mantiene hasta 4,2 s y se apaga en 1 s.
    var LIFE = 5.2;

    function light(x, y) {
      var gx = Math.round(x / step);
      var gy = Math.round(y / step);
      var k = gx + ":" + gy;
      var now = performance.now();
      var c = cells.get(k);
      if (!c || now - c.t > LIFE * 1000) {
        cells.set(k, { gx: gx, gy: gy, t: now, r: 0.8 + Math.random() * 0.5 });
        count++;
        if (out) out.textContent = count < 10 ? "0" + count : String(count);
      }
    }

    function cover(img, W, H) {
      var r = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      var w = img.naturalWidth * r;
      var h = img.naturalHeight * r;
      return [(W - w) / 2, (H - h) / 2, w, h];
    }

    function draw(now) {
      if (!off.complete || !on.complete || !off.naturalWidth || !on.naturalWidth) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var W = canvas.clientWidth;
      var H = canvas.clientHeight;
      var PW = Math.round(W * dpr);
      var PH = Math.round(H * dpr);
      if (canvas.width !== PW || canvas.height !== PH) {
        canvas.width = mask.width = layer.width = PW;
        canvas.height = mask.height = layer.height = PH;
      }
      step = Math.max(64, W / 15);
      var rect = cover(off, PW, PH);

      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(off, rect[0], rect[1], rect[2], rect[3]);

      m.clearRect(0, 0, PW, PH);
      cells.forEach(function (cell, k) {
        var age = (now - cell.t) / 1000;
        if (age > LIFE) {
          cells.delete(k);
          return;
        }
        var a = age < 0.2 ? age / 0.2 : age < 4.2 ? 1 : 1 - (age - 4.2);
        var grow = reduce ? 1 : Math.min(1, 0.55 + Math.min(age, 1.2) * 0.375);
        var x = cell.gx * step * dpr;
        var y = cell.gy * step * dpr;
        var R = step * 1.5 * cell.r * grow * dpr;
        var g = m.createRadialGradient(x, y, 0, x, y, R);
        g.addColorStop(0, "rgba(0,0,0," + a + ")");
        g.addColorStop(0.55, "rgba(0,0,0," + a * 0.6 + ")");
        g.addColorStop(1, "rgba(0,0,0,0)");
        m.fillStyle = g;
        m.fillRect(x - R, y - R, R * 2, R * 2);
      });

      // El corazón despierta: 50,5 % de ancho, 30 % de alto, radio 34 % del alto de la imagen.
      var hx = rect[0] + rect[2] * 0.505;
      var hy = rect[1] + rect[3] * 0.3;
      var hr = rect[3] * 0.34;
      heart += (Math.min(1, count / 60) - heart) * 0.03;
      var pulse = reduce ? 1 : 0.9 + Math.sin(now / 900) * 0.1;
      if (heart > 0.001) {
        var hg = m.createRadialGradient(hx, hy, 0, hx, hy, hr);
        hg.addColorStop(0, "rgba(0,0,0," + heart * pulse + ")");
        hg.addColorStop(0.6, "rgba(0,0,0," + heart * pulse * 0.7 + ")");
        hg.addColorStop(1, "rgba(0,0,0,0)");
        m.fillStyle = hg;
        m.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
      }

      L.globalCompositeOperation = "source-over";
      L.clearRect(0, 0, PW, PH);
      L.drawImage(on, rect[0], rect[1], rect[2], rect[3]);
      L.globalCompositeOperation = "destination-in";
      L.drawImage(mask, 0, 0);
      ctx.drawImage(layer, 0, 0);
    }

    function tick(now) {
      draw(now);
      raf = visible ? requestAnimationFrame(tick) : 0;
    }
    function start() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    root.addEventListener("pointermove", function (e) {
      var r = root.getBoundingClientRect();
      light(e.clientX - r.left, e.clientY - r.top);
    });
    root.addEventListener(
      "pointerdown",
      function (e) {
        var r = root.getBoundingClientRect();
        light(e.clientX - r.left, e.clientY - r.top);
      },
      { passive: true },
    );

    // Fuera de pantalla no se dibuja.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) start();
      }).observe(root);
    }
    off.onload = on.onload = start;
    start();
  }

  /* ---------- Raíl: el rayo crece con el scroll ---------- */
  function rail() {
    var path = $(".path");
    var beam = $(".rail__beam");
    if (!path || !beam) return;
    var pending = false;
    function update() {
      pending = false;
      var r = path.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = Math.max(0, Math.min(1, (vh * 0.6 - r.top) / r.height));
      beam.style.transform = "scaleY(" + p.toFixed(4) + ")";
    }
    function req() {
      if (!pending) {
        pending = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    update();
  }

  /* ---------- Estaciones: el punto se enciende y los bloques aparecen (umbral 0,25) ---------- */
  function stations() {
    var secs = $$(".sec");
    if (!("IntersectionObserver" in window)) {
      secs.forEach(function (s) {
        s.classList.add("is-in");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.25 },
    );
    secs.forEach(function (s) {
      io.observe(s);
    });
  }

  /* ---------- I · Encender las velas ---------- */
  function velas() {
    var btn = $("[data-velas]");
    var grid = $("[data-velas-grid]");
    if (!btn || !grid) return;
    // Precarga la foto encendida para que el cambio sea inmediato.
    new Image().src = "/img/corazon_velas_encendido.webp";
    btn.addEventListener("click", function () {
      var onNow = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(onNow));
      btn.textContent = onNow ? "Velas encendidas" : "Encender las velas";
      grid.classList.toggle("is-lit", onNow);
    });
  }

  /* ---------- II · Tu día: la aguja gira al momento elegido ---------- */
  function dia() {
    var defs = [
      {
        a: 210,
        text: "El primer anclaje del día, en audio: suena el aviso, le das al play y te acompaña mientras te preparas.",
      },
      { a: 270, text: "Su historia, a qué se le invoca y su oración, contada en audio." },
      { a: 0, text: "El evangelio del día con una meditación breve." },
      { a: 120, text: "Para cerrar el día en calma, también en audio y con la pantalla bloqueada." },
    ];
    var NS = "http://www.w3.org/2000/svg";
    var ticks = $("[data-ticks]");
    var dotsG = $("[data-dots]");
    var hand = $("[data-hand]");
    var text = $("[data-day-text]");
    var items = $$("[data-day]");
    if (!ticks || !dotsG || !hand) return;

    for (var i = 0; i < 24; i++) {
      var l = document.createElementNS(NS, "line");
      l.setAttribute("x1", "200");
      l.setAttribute("y1", "24");
      l.setAttribute("x2", "200");
      l.setAttribute("y2", i % 6 === 0 ? "44" : "34");
      l.setAttribute("stroke", "rgba(255,241,224,0.35)");
      l.setAttribute("stroke-width", "1");
      l.setAttribute("transform", "rotate(" + i * 15 + " 200 200)");
      ticks.appendChild(l);
    }
    var dots = defs.map(function (d) {
      var rad = ((d.a - 90) * Math.PI) / 180;
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", (200 + 165 * Math.cos(rad)).toFixed(1));
      c.setAttribute("cy", (200 + 165 * Math.sin(rad)).toFixed(1));
      dotsG.appendChild(c);
      return c;
    });

    function pick(idx) {
      items.forEach(function (b, j) {
        b.setAttribute("aria-pressed", String(j === idx));
      });
      dots.forEach(function (c, j) {
        c.setAttribute("r", j === idx ? "9" : "5");
        c.setAttribute("fill", j === idx ? "#FFC56B" : "rgba(255,241,224,0.6)");
      });
      hand.style.transform = "rotate(" + defs[idx].a + "deg)";
      if (text) text.textContent = defs[idx].text;
    }
    items.forEach(function (b) {
      b.addEventListener("click", function () {
        pick(Number(b.getAttribute("data-day")));
      });
    });
    pick(0);
  }

  /* ---------- V · Rezo por ti: ejemplos, se tachan y suman +1 ---------- */
  function wall() {
    $$("[data-wall] .card").forEach(function (card) {
      var n = Number(card.getAttribute("data-n"));
      var cta = $("[data-cta]", card);
      var count = $("[data-count]", card);
      card.addEventListener("click", function () {
        var done = card.getAttribute("aria-pressed") !== "true";
        card.setAttribute("aria-pressed", String(done));
        cta.textContent = done ? "Rezas por esta intención" : "Rezo por ti";
        count.textContent = n + (done ? 1 : 0) + " rezan";
      });
    });
  }

  /* ---------- VI · Lista de espera (maqueta: aún sin destino para los correos) ---------- */
  function form() {
    var f = $("[data-form]");
    var status = $("[data-form-status]");
    if (!f || !status) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var mail = f.elements.namedItem("email");
      var consent = f.elements.namedItem("consent");
      status.classList.remove("is-error");
      if (!mail.value || !mail.checkValidity()) {
        status.classList.add("is-error");
        status.textContent = "Escribe un correo válido.";
        mail.focus();
        return;
      }
      if (!consent.checked) {
        status.classList.add("is-error");
        status.textContent = "Marca la casilla para que podamos avisarte.";
        consent.focus();
        return;
      }
      status.textContent = "Maqueta: el formulario aún no está conectado a ninguna lista.";
    });
  }

  function init() {
    splitTitle();
    hero();
    rail();
    stations();
    velas();
    dia();
    wall();
    form();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
