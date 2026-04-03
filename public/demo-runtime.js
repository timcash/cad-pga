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

    function applyCanvasTransform() {
      canvas.style.transform = "translate3d(" + viewState.panX + "px, " + viewState.panY + "px, 0)";
    }

    function canUseCameraMotor(camera) {
      return !!(camera && typeof camera.Mul === "function" && camera.constructor);
    }

    function isPointCamera(camera) {
      return !!(
        camera &&
        typeof camera.e123 === "number" &&
        Math.abs(camera.e123) > 1e-8 &&
        typeof camera.e012 === "number" &&
        typeof camera.e013 === "number" &&
        typeof camera.e023 === "number"
      );
    }

    function makeTranslator(camera, dx, dy, dz) {
      var translator = new camera.constructor();
      translator[0] = 1;

      if ("e01" in translator) {
        translator.e01 = 0.5 * dx;
        translator.e02 = 0.5 * dy;
        translator.e03 = 0.5 * dz;
      }

      return translator;
    }

    function coerceCameraMotor(camera) {
      if (!canUseCameraMotor(camera)) {
        return camera;
      }

      if (!isPointCamera(camera)) {
        return camera;
      }

      var x = -camera.e012 / camera.e123;
      var y = camera.e013 / camera.e123;
      var z = camera.e023 / camera.e123;

      return makeTranslator(camera, x, y, z);
    }

    function translateCameraLocal(camera, dz) {
      var baseCamera = coerceCameraMotor(camera);
      if (!canUseCameraMotor(baseCamera)) {
        return null;
      }

      var translated = baseCamera.Mul(makeTranslator(baseCamera, 0, 0, dz));
      return translated.Normalized || translated;
    }

    function stopRightPan() {
      if (!viewState.isRightPanning) {
        return;
      }

      viewState.isRightPanning = false;
      canvas.style.cursor = "default";
    }

    canvas.style.transformOrigin = "center center";
    graphOptions.camera = coerceCameraMotor(graphOptions.camera);
    applyCanvasTransform();

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
      graphOptions.scale = clamp((graphOptions.scale || 1) * zoomFactor, minScale, maxScale);

      var movedCamera = translateCameraLocal(graphOptions.camera, event.deltaY * 0.01);
      if (movedCamera) {
        graphOptions.camera = movedCamera;
      }
    }, { passive: false, capture: true });

    window.addEventListener("mousemove", function (event) {
      if (!viewState.isRightPanning) {
        return;
      }

      viewState.panX += event.clientX - viewState.lastClientX;
      viewState.panY += event.clientY - viewState.lastClientY;
      viewState.lastClientX = event.clientX;
      viewState.lastClientY = event.clientY;
      applyCanvasTransform();
    });

    window.addEventListener("mouseup", stopRightPan);
    window.addEventListener("blur", stopRightPan);
  }

  window.CadPgaDemo = {
    registerServiceWorker: registerServiceWorker,
    attachGraphInteractions: attachGraphInteractions
  };
}());
