(function () {
  var THEME = {
    backgroundCss: "#050505",
    backgroundInt: 0x050505,
    gridMinorInt: 0x141414,
    gridMajorInt: 0x1d1d1d,
    gridAxisInt: 0x292929,
    accents: {
      tealInt: 0x63b4d1,
      tealCss: "#63b4d1",
      blueInt: 0x5f7fe7,
      blueCss: "#5f7fe7",
      orangeInt: 0xf29a4b,
      orangeCss: "#f29a4b",
      coralInt: 0xef7b68,
      coralCss: "#ef7b68",
      mintInt: 0x7fd39c,
      mintCss: "#7fd39c",
      pinkInt: 0xf06ba4,
      pinkCss: "#f06ba4",
      ivoryInt: 0xf1ede6,
      ivoryCss: "#f1ede6",
      iceInt: 0x8ebceb,
      iceCss: "#8ebceb"
    }
  };

  var DEMO_ENTRIES = [
    {
      slug: "mesh-cleanup",
      title: "Area from Boundary",
      summary: "Boundary sums recover area without depending on one cone fan."
    },
    {
      slug: "cnc-kernel-simulator",
      title: "CNC Tool Motion",
      summary: "One motor combines spindle rotation, feed motion, and a swept cut sketch."
    },
    {
      slug: "look-ma-no-matrices",
      title: "Look, Ma, No Matrices!",
      summary: "A 3D carrier frame and child sensor frame composed directly with PGA motors."
    },
    {
      slug: "gear-rotation-linkage",
      title: "Gear Hierarchy",
      summary: "A parent-child motion chain built from local and world transforms."
    },
    {
      slug: "meshless-fea-wos",
      title: "Heat by Sphere Walks",
      summary: "A meshless heat solve with PGA walls, an SDF disk, and Walk on Spheres."
    }
  ];

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

      return THEME.backgroundCss;
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
      if (!canvas || typeof canvas.getContext !== "function") {
        return;
      }

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

  function createPlaneGrid3D(pointFactory, options) {
    var settings = options || {};
    var size = settings.size || 6;
    var step = settings.step || 1;
    var majorEvery = settings.majorEvery || 2;
    var planeZ = typeof settings.z === "number" ? settings.z : 0;
    var minor = [];
    var major = [];
    var axis = [];

    function segment(x1, y1, x2, y2) {
      return [
        pointFactory(x1, y1, planeZ),
        pointFactory(x2, y2, planeZ)
      ];
    }

    for (var value = -size; value <= size + 1e-9; value += step) {
      var rounded = Math.round(value * 1000) / 1000;
      if (Math.abs(rounded) < 1e-9) {
        axis.push(segment(rounded, -size, rounded, size));
        axis.push(segment(-size, rounded, size, rounded));
        continue;
      }

      var target = Math.abs(Math.round(rounded / step)) % majorEvery === 0 ? major : minor;
      target.push(segment(rounded, -size, rounded, size));
      target.push(segment(-size, rounded, size, rounded));
    }

    return [
      THEME.gridMinorInt, ...minor,
      THEME.gridMajorInt, ...major,
      THEME.gridAxisInt, ...axis
    ];
  }

  function mountDemoShell(options) {
    var settings = options || {};
    var detailsPanel = document.querySelector(settings.detailsSelector || "#ui-panel");
    var stageElement = document.querySelector(settings.stageSelector || "#canvas-container");
    var instructions = document.querySelector(settings.instructionsSelector || "#instructions");

    if (!detailsPanel || !stageElement) {
      return null;
    }

    document.body.classList.add("cad-pga-demo-page");

    var legacyNav = document.getElementById("nav-links");
    if (legacyNav && legacyNav.parentNode) {
      legacyNav.parentNode.removeChild(legacyNav);
    }

    var shell = document.createElement("div");
    shell.className = "cad-pga-demo-shell";

    var stageGrid = document.createElement("div");
    stageGrid.className = "cad-pga-stage-grid";

    var stageSlot = document.createElement("div");
    stageSlot.className = "cad-pga-stage-slot";
    stageSlot.appendChild(stageElement);

    var topbar = createTopbar(settings);
    var menuPanel = createMenuPanel(settings);
    var readmePanel = createReadmePanel(settings);
    var thumbbar = createThumbbar();
    var scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "cad-pga-shell-scrim";
    scrim.setAttribute("aria-label", "Close overlays");

    detailsPanel.classList.add("cad-pga-details-panel");
    detailsPanel.setAttribute("tabindex", "-1");

    if (instructions) {
      appendControlsBlock(detailsPanel, instructions.innerHTML);
      instructions.remove();
    }

    stageGrid.appendChild(stageSlot);
    stageGrid.appendChild(scrim);
    stageGrid.appendChild(topbar);
    stageGrid.appendChild(menuPanel.root);
    detailsPanel.id = "cad-pga-details-panel";
    stageGrid.appendChild(detailsPanel);
    stageGrid.appendChild(readmePanel.root);
    stageGrid.appendChild(thumbbar.root);
    shell.appendChild(stageGrid);

    document.body.insertBefore(shell, document.body.firstChild);

    var isDesktop = window.matchMedia("(min-width: 1040px)");
    var state = {
      menuOpen: false,
      detailsOpen: isDesktop.matches,
      readmeOpen: false
    };

    function closeOverlays() {
      state.menuOpen = false;
      state.detailsOpen = false;
      state.readmeOpen = false;
      applyState();
    }

    function toggleMenu() {
      state.menuOpen = !state.menuOpen;
      if (state.menuOpen) {
        state.readmeOpen = false;
        if (!isDesktop.matches) {
          state.detailsOpen = false;
        }
      }
      applyState();
    }

    function toggleDetails() {
      state.detailsOpen = !state.detailsOpen;
      if (state.detailsOpen) {
        state.menuOpen = false;
        state.readmeOpen = false;
      }
      applyState();
    }

    function toggleReadme() {
      state.readmeOpen = !state.readmeOpen;
      if (state.readmeOpen) {
        state.menuOpen = false;
        if (!isDesktop.matches) {
          state.detailsOpen = false;
        }
      }
      applyState();
    }

    function applyState() {
      document.body.classList.toggle("cad-pga-menu-open", state.menuOpen);
      document.body.classList.toggle("cad-pga-details-open", state.detailsOpen);
      document.body.classList.toggle("cad-pga-readme-open", state.readmeOpen);
      thumbbar.menuButton.setAttribute("aria-expanded", state.menuOpen ? "true" : "false");
      thumbbar.detailsButton.setAttribute("aria-expanded", state.detailsOpen ? "true" : "false");
      thumbbar.readmeButton.setAttribute("aria-expanded", state.readmeOpen ? "true" : "false");
      menuPanel.root.setAttribute("aria-hidden", state.menuOpen ? "false" : "true");
      detailsPanel.setAttribute("aria-hidden", state.detailsOpen ? "false" : "true");
      readmePanel.root.setAttribute("aria-hidden", state.readmeOpen ? "false" : "true");
    }

    thumbbar.menuButton.addEventListener("click", toggleMenu);
    thumbbar.detailsButton.addEventListener("click", toggleDetails);
    thumbbar.readmeButton.addEventListener("click", toggleReadme);
    menuPanel.readmeButton.addEventListener("click", toggleReadme);
    menuPanel.closeButton.addEventListener("click", closeOverlays);
    readmePanel.closeButton.addEventListener("click", closeOverlays);
    scrim.addEventListener("click", closeOverlays);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeOverlays();
      }
    });

    isDesktop.addEventListener("change", function (event) {
      if (event.matches) {
        state.detailsOpen = true;
      } else {
        state.menuOpen = false;
        state.detailsOpen = false;
        state.readmeOpen = false;
      }
      applyState();
    });

    if (new URLSearchParams(window.location.search).get("readme") === "1") {
      state.readmeOpen = true;
      if (!isDesktop.matches) {
        state.detailsOpen = false;
      }
    }

    applyState();

    return {
      closeOverlays: closeOverlays,
      toggleMenu: toggleMenu,
      toggleDetails: toggleDetails,
      toggleReadme: toggleReadme
    };
  }

  function createTopbar(settings) {
    var title = document.createElement("div");
    title.className = "cad-pga-topbar-title";
    title.textContent = settings.title || document.title.replace(/\s+-\s+CAD PGA$/, "");

    var root = document.createElement("header");
    root.className = "cad-pga-topbar";
    root.appendChild(title);
    return root;
  }

  function createMenuPanel(settings) {
    var currentSlug = settings.slug || "";
    var panel = document.createElement("nav");
    panel.className = "cad-pga-menu-panel";
    panel.id = "cad-pga-menu-panel";
    panel.setAttribute("aria-label", "CAD PGA example menu");
    panel.setAttribute("aria-hidden", "true");

    var head = document.createElement("div");
    head.className = "cad-pga-menu-head";

    var headBar = document.createElement("div");
    headBar.className = "cad-pga-menu-headbar";
    headBar.innerHTML =
      '<div class="cad-pga-menu-copyblock">' +
        '<p class="cad-pga-menu-eyebrow">CAD PGA</p>' +
        '<h2 class="cad-pga-menu-heading">Examples</h2>' +
      '</div>';

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "cad-pga-menu-close";
    closeButton.textContent = "Close";
    closeButton.setAttribute("aria-label", "Close menu");
    headBar.appendChild(closeButton);

    var subtitle = document.createElement("p");
    subtitle.className = "cad-pga-menu-subtitle";
    subtitle.textContent = "Browse the example library, open the current README, or return to the library home page.";

    var utilities = document.createElement("div");
    utilities.className = "cad-pga-menu-utilities";

    var homeLink = document.createElement("a");
    homeLink.className = "cad-pga-menu-utility";
    homeLink.href = "../";
    homeLink.textContent = "Home";

    var readmeButton = document.createElement("button");
    readmeButton.type = "button";
    readmeButton.className = "cad-pga-menu-utility";
    readmeButton.textContent = "README";

    utilities.appendChild(homeLink);
    utilities.appendChild(readmeButton);
    head.appendChild(headBar);
    head.appendChild(subtitle);
    head.appendChild(utilities);

    var list = document.createElement("div");
    list.className = "cad-pga-menu-list";

    DEMO_ENTRIES.forEach(function (entry) {
      var demoLink = document.createElement("a");
      demoLink.className = "cad-pga-menu-link";
      demoLink.href = "../" + entry.slug + "/";
      if (entry.slug === currentSlug) {
        demoLink.setAttribute("aria-current", "page");
        demoLink.setAttribute("data-current", "true");
      }

      var copy = document.createElement("div");
      copy.className = "cad-pga-menu-copy";

      var title = document.createElement("strong");
      title.textContent = entry.title;

      var summary = document.createElement("span");
      summary.textContent = entry.summary;

      copy.appendChild(title);
      copy.appendChild(summary);
      demoLink.appendChild(copy);

      var route = document.createElement("span");
      route.className = "cad-pga-menu-route";
      route.textContent = "/" + entry.slug;
      demoLink.appendChild(route);

      list.appendChild(demoLink);
    });

    panel.appendChild(head);
    panel.appendChild(list);
    return {
      root: panel,
      closeButton: closeButton,
      readmeButton: readmeButton
    };
  }

  function createReadmePanel(settings) {
    var panel = document.createElement("section");
    panel.className = "cad-pga-readme-panel";
    panel.id = "cad-pga-readme-panel";
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("aria-label", (settings.title || "Example") + " README");

    var shell = document.createElement("div");
    shell.className = "cad-pga-readme-shell";

    var head = document.createElement("div");
    head.className = "cad-pga-readme-head";

    var titleBlock = document.createElement("div");
    titleBlock.className = "cad-pga-readme-copy";
    titleBlock.innerHTML =
      '<p class="cad-pga-menu-eyebrow">README</p>' +
      '<h2 class="cad-pga-menu-heading">' + escapeHtml(settings.title || "Example") + '</h2>';

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "cad-pga-menu-close";
    closeButton.textContent = "Close";
    closeButton.setAttribute("aria-label", "Close README");

    head.appendChild(titleBlock);
    head.appendChild(closeButton);

    var status = document.createElement("p");
    status.className = "cad-pga-readme-status";
    status.setAttribute("data-demo-readme-status", "");
    status.textContent = "Loading README...";

    var body = document.createElement("div");
    body.className = "cad-pga-readme-body";
    body.setAttribute("data-demo-readme-body", "");

    shell.appendChild(head);
    shell.appendChild(status);
    shell.appendChild(body);
    panel.appendChild(shell);

    return {
      root: panel,
      closeButton: closeButton,
      status: status,
      body: body
    };
  }

  function createThumbbar() {
    var root = document.createElement("div");
    root.className = "cad-pga-thumbbar";

    var grid = document.createElement("div");
    grid.className = "cad-pga-thumbbar-grid";

    var menuButton = createThumbButton("button", "Menu");
    menuButton.type = "button";
    menuButton.setAttribute("data-demo-toggle", "menu");
    menuButton.setAttribute("aria-controls", "cad-pga-menu-panel");

    var detailsButton = createThumbButton("button", "Details");
    detailsButton.type = "button";
    detailsButton.setAttribute("data-demo-toggle", "details");
    detailsButton.setAttribute("aria-controls", "cad-pga-details-panel");

    var readmeButton = createThumbButton("button", "README");
    readmeButton.type = "button";
    readmeButton.setAttribute("data-demo-toggle", "readme");
    readmeButton.setAttribute("aria-controls", "cad-pga-readme-panel");

    var homeLink = createThumbButton("link", "Home");
    homeLink.href = "../";

    grid.appendChild(menuButton);
    grid.appendChild(detailsButton);
    grid.appendChild(readmeButton);
    grid.appendChild(homeLink);
    root.appendChild(grid);

    return {
      root: root,
      menuButton: menuButton,
      detailsButton: detailsButton,
      readmeButton: readmeButton
    };
  }

  function createThumbButton(kind, labelText) {
    var element = kind === "link" ? document.createElement("a") : document.createElement("button");
    element.className = "cad-pga-thumb-button";

    var label = document.createElement("span");
    label.className = "cad-pga-thumb-label";
    label.textContent = labelText;

    element.appendChild(label);
    return element;
  }

  function appendControlsBlock(detailsPanel, html) {
    var block = document.createElement("section");
    block.className = "cad-pga-controls-block";

    var label = document.createElement("p");
    label.className = "cad-pga-controls-label";
    label.textContent = "Controls";

    var copy = document.createElement("div");
    copy.className = "cad-pga-controls-copy";
    copy.innerHTML = html.replace(/<b>\s*Controls:\s*<\/b>/i, "");

    block.appendChild(label);
    block.appendChild(copy);
    detailsPanel.appendChild(block);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  window.CadPgaDemo = {
    registerServiceWorker: registerServiceWorker,
    attachGraphInteractions: attachGraphInteractions,
    mountDemoShell: mountDemoShell,
    createPlaneGrid3D: createPlaneGrid3D,
    theme: THEME
  };
}());
