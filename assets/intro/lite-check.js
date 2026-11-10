/* XIRI LA SAL - decides, BEFORE first paint, whether this device gets the 3D tin intro or the plain page.
   Adds html.lite (+ data-intro, data-lite-why). Override for testing: ?intro=lite  or  ?intro=3d
   Thresholds live here on purpose (single place to tune). */
(function () {
  var root = document.documentElement, why = '', forced3d = false;

  function weakGpu() {
    try {
      var cv = document.createElement('canvas');
      // null when the browser would fall back to software rendering (or has no WebGL at all)
      var gl = cv.getContext('webgl', { failIfMajorPerformanceCaveat: true });
      if (!gl) return 'no-hw-webgl';
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      var renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
      var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      if (/swiftshader|llvmpipe|software|mali-4|mali-t|adreno \(tm\) ?[2-4]\d\d|powervr|vivante|videocore/i.test(renderer)) return 'weak-gpu';
    } catch (e) {}
    return '';
  }

  try {
    var q = /[?&]intro=(lite|3d)(?:&|$)/.exec(location.search);
    if (q) { if (q[1] === 'lite') why = 'forced'; else forced3d = true; }
    else {
      var n = navigator, c = n.connection || n.mozConnection || n.webkitConnection || {};
      var mem = n.deviceMemory, cores = n.hardwareConcurrency;
      var phone = matchMedia('(pointer: coarse)').matches;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) why = 'reduced-motion';
      else if (c.saveData) why = 'save-data';
      else if (/^(slow-2g|2g|3g)$/.test(c.effectiveType || '')) why = 'slow-network';
      else if (mem && mem <= 2) why = 'low-memory';
      else if (cores && cores <= 2) why = 'low-cpu';
      else if (phone && ((mem && mem <= 4) || (cores && cores <= 4))) why = 'weak-phone';
      else why = weakGpu();
    }
  } catch (e) {}

  if (why) {
    root.classList.add('lite');
    root.setAttribute('data-intro', 'lite'); root.setAttribute('data-lite-why', why);
  } else {
    root.setAttribute('data-intro', '3d');
    // 3D path only: start the module chain early (the entry script imports it dynamically)
    ['/assets/intro/scroll-tin-3d.js', '/assets/intro/vendor/three.module.js'].forEach(function (h) {
      var l = document.createElement('link'); l.rel = 'modulepreload'; l.href = h; document.head.appendChild(l);
    });
  }
})();
