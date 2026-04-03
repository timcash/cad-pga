(function () {
  function registerServiceWorker(scriptPath, scopePath) {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    window.addEventListener("load", function () {
      navigator.serviceWorker.register(scriptPath, { scope: scopePath }).catch(function (error) {
        console.error("Service worker registration failed:", error);
      });
    });
  }

  function attachGraphInteractions(canvas, graphOptions, options) {
    var settings = options || {};
    var minScale = settings.minScale || 0.35;
    var maxScale = settings.maxScale || 3;
    var desiredBackground = settings.backgroundColor;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function isOpaqueColor(value) {
      return !!value && value !== "transparent" && value !== "rgba(0, 0, 0, 0)";
    }

    function resolveBackgroundColor() {
      if (isOpaqueColor(desiredBackground)) {
        return desiredBackground;
      }

      var current = canvas.parentElement || document.body;
      while (current) {
        var computed = window.getComputedStyle(current).backgroundColor;
        if (isOpaqueColor(computed)) {
          return computed;
        }
        current = current.parentElement;
      }

      return "#111111";
    }

    function parseColorComponents(value) {
      if (!value) {
        return null;
      }

      if (value.charAt(0) === "#") {
        var hex = value.slice(1);
        if (hex.length === 3) {
          hex = hex.replace(/./g, "$&$&");
        }
        if (hex.length === 6) {
          return [
            parseInt(hex.slice(0, 2), 16) / 255,
            parseInt(hex.slice(2, 4), 16) / 255,
            parseInt(hex.slice(4, 6), 16) / 255,
            1
          ];
        }
      }

      var matches = value.match(/[\d.]+/g);
      if (!matches || matches.length < 3) {
        return null;
      }

      return [
        Number(matches[0]) / 255,
        Number(matches[1]) / 255,
        Number(matches[2]) / 255,
        matches.length > 3 ? Number(matches[3]) : 1
      ];
    }

    function applyGlBackground(color) {
      var components = parseColorComponents(color);
      if (!components) {
        return;
      }

      var gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) {
        return;
      }

      gl.clearColor(components[0], components[1], components[2], components[3]);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    function applyCanvasTransform() {
      var backgroundColor = resolveBackgroundColor();

      canvas.style.transform = "";
      canvas.style.display = "block";
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.backgroundColor = backgroundColor;
      applyGlBackground(backgroundColor);
    }

    canvas.style.transformOrigin = "center center";
    applyCanvasTransform();

    canvas.addEventListener("wheel", function (event) {
      event.preventDefault();
      graphOptions.scale = clamp(
        (graphOptions.scale || 1) * Math.exp(-event.deltaY * 0.0015),
        minScale,
        maxScale
      );

      if (!graphOptions.animate && typeof canvas.update === "function") {
        requestAnimationFrame(function () {
          canvas.update(canvas.value);
        });
      }
    }, { passive: false, capture: true });
  }

  window.CadPgaDemo = {
    registerServiceWorker: registerServiceWorker,
    attachGraphInteractions: attachGraphInteractions
  };
}());
