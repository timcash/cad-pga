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
    var panSpeed = settings.panSpeed || 4;
    var zoomSpeed = settings.zoomSpeed || 0.01;
    var desiredBackground = settings.backgroundColor;

    var viewState = {
      isRightPanning: false,
      lastClientX: 0,
      lastClientY: 0
    };

    var cameraState = {
      rotation: null,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0
    };

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

    function extractRotationMotor(camera) {
      if (!canUseCameraMotor(camera)) {
        return camera;
      }

      var rotation = new camera.constructor();
      rotation[0] = typeof camera.s === "number" ? camera.s : camera[0] || 1;

      if ("e12" in rotation) {
        rotation.e12 = camera.e12 || 0;
        rotation.e13 = camera.e13 || 0;
        rotation.e23 = camera.e23 || 0;
      }

      return rotation.Normalized || rotation;
    }

    function extractTranslationState(camera) {
      return {
        x: camera && typeof camera.e01 === "number" ? 2 * camera.e01 : 0,
        y: camera && typeof camera.e02 === "number" ? 2 * camera.e02 : 0,
        z: camera && typeof camera.e03 === "number" ? 2 * camera.e03 : 0
      };
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

    function syncCameraFromState() {
      if (!canUseCameraMotor(cameraState.rotation)) {
        return null;
      }

      var translation = makeTranslator(
        cameraState.rotation,
        cameraState.offsetX,
        cameraState.offsetY,
        cameraState.offsetZ
      );
      var camera = cameraState.rotation.Mul(translation);
      graphOptions.camera = camera.Normalized || camera;
      return graphOptions.camera;
    }

    function translateCameraLocal(dx, dy, dz) {
      cameraState.offsetX += dx;
      cameraState.offsetY += dy;
      cameraState.offsetZ += dz;
      return syncCameraFromState();
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
    cameraState.rotation = extractRotationMotor(graphOptions.camera);

    if (canUseCameraMotor(graphOptions.camera)) {
      var initialTranslation = extractTranslationState(graphOptions.camera);
      cameraState.offsetX = initialTranslation.x;
      cameraState.offsetY = initialTranslation.y;
      cameraState.offsetZ = initialTranslation.z;
      syncCameraFromState();
    }

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
      translateCameraLocal(0, 0, event.deltaY * zoomSpeed);
    }, { passive: false, capture: true });

    window.addEventListener("mousemove", function (event) {
      var rect = canvas.getBoundingClientRect();
      var dx = event.clientX - viewState.lastClientX;
      var dy = event.clientY - viewState.lastClientY;

      if (viewState.isRightPanning) {
        var normalizedX = dx / rect.width;
        var normalizedY = dy / rect.height;
        var currentScale = graphOptions.scale || 1;

        translateCameraLocal(
          (-normalizedX * panSpeed) / currentScale,
          (normalizedY * panSpeed) / currentScale,
          0
        );

        viewState.lastClientX = event.clientX;
        viewState.lastClientY = event.clientY;
        return;
      }

      if ((event.buttons & 1) !== 0 && canUseCameraMotor(graphOptions.camera)) {
        cameraState.rotation = extractRotationMotor(graphOptions.camera);
        syncCameraFromState();
      }
    });

    window.addEventListener("mouseup", stopRightPan);
    window.addEventListener("blur", stopRightPan);
  }

  window.CadPgaDemo = {
    registerServiceWorker: registerServiceWorker,
    attachGraphInteractions: attachGraphInteractions
  };
}());
