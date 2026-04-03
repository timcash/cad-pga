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

    var viewState = {
      panX: 0,
      panY: 0,
      isRightPanning: false,
      lastClientX: 0,
      lastClientY: 0
    };

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function applyCanvasPan() {
      canvas.style.transform = "translate3d(" + viewState.panX + "px, " + viewState.panY + "px, 0)";
    }

    function stopRightPan() {
      if (!viewState.isRightPanning) {
        return;
      }

      viewState.isRightPanning = false;
      canvas.style.cursor = "default";
    }

    canvas.style.transformOrigin = "center center";

    canvas.addEventListener("contextmenu", function (event) {
      event.preventDefault();
    }, { capture: true });

    canvas.addEventListener("mousedown", function (event) {
      if (event.button !== 2) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      viewState.isRightPanning = true;
      viewState.lastClientX = event.clientX;
      viewState.lastClientY = event.clientY;
      canvas.style.cursor = "grabbing";
    }, { capture: true });

    canvas.addEventListener("wheel", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      var zoomFactor = Math.exp(-event.deltaY * 0.0015);
      graphOptions.scale = clamp(graphOptions.scale * zoomFactor, minScale, maxScale);
    }, { passive: false, capture: true });

    window.addEventListener("mousemove", function (event) {
      if (!viewState.isRightPanning) {
        return;
      }

      viewState.panX += event.clientX - viewState.lastClientX;
      viewState.panY += event.clientY - viewState.lastClientY;
      viewState.lastClientX = event.clientX;
      viewState.lastClientY = event.clientY;
      applyCanvasPan();
    });

    window.addEventListener("mouseup", stopRightPan);
    window.addEventListener("blur", stopRightPan);
  }

  window.CadPgaDemo = {
    registerServiceWorker: registerServiceWorker,
    attachGraphInteractions: attachGraphInteractions
  };
}());
