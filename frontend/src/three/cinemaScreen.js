// Loaded only after the decorative screen enters the viewport.
export function createCinemaScreen(host, THREE, gsap, onLost) {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: true });
  if (!gl) return () => {};
  const resources = new Set();
  const own = (resource) => {
    resources.add(resource);
    return resource;
  };
  let renderer,
    scene,
    timeline,
    context,
    observer,
    resizeObserver,
    resizeListener,
    frame = 0,
    disposed = false,
    visible = true,
    lastFrame = 0;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    resizeObserver?.disconnect();
    if (resizeListener) window.removeEventListener("resize", resizeListener);
    document.removeEventListener("visibilitychange", update);
    canvas.removeEventListener("webglcontextlost", lost);
    timeline?.kill();
    context?.revert();
    for (const resource of resources) resource.dispose();
    resources.clear();
    scene?.clear();
    renderer?.setAnimationLoop(null);
    renderer?.renderLists.dispose();
    renderer?.dispose();
    if (renderer) renderer.forceContextLoss();
    else gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
    delete host.dataset.rendering;
    delete host.dataset.dpr;
  };
  function lost(event) {
    event.preventDefault();
    dispose();
    onLost();
  }
  function update() {
    if (disposed || !timeline) return;
    cancelAnimationFrame(frame);
    const active = visible && !document.hidden;
    host.dataset.rendering = active ? "active" : "paused";
    if (active) {
      timeline.resume();
      frame = requestAnimationFrame(draw);
    } else timeline.pause();
  }
  let camera;
  function draw(time) {
    if (disposed) return;
    if (time - lastFrame >= 1000 / 30) {
      try {
        renderer.render(scene, camera);
        lastFrame = time;
      } catch {
        dispose();
        onLost();
        return;
      }
    }
    frame = requestAnimationFrame(draw);
  }
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 3, 0.1, 50);
    camera.position.set(0, 1.3, 8);
    camera.lookAt(0, 0, 0);
    const surface = document.createElement("canvas");
    surface.width = 768;
    surface.height = 256;
    const paint = surface.getContext("2d");
    if (!paint) throw new Error("Canvas unavailable");
    const gradient = paint.createLinearGradient(0, 0, 768, 256);
    gradient.addColorStop(0, "#38bdf8");
    gradient.addColorStop(0.5, "#6366f1");
    gradient.addColorStop(1, "#ec4899");
    paint.fillStyle = gradient;
    paint.fillRect(0, 0, 768, 256);
    paint.fillStyle = "rgba(255,255,255,.84)";
    paint.textAlign = "center";
    paint.font = "700 58px sans-serif";
    paint.fillText("N O V A", 384, 133);
    paint.font = "16px sans-serif";
    paint.fillText("C I N E M A S C O P E", 384, 176);
    const texture = own(new THREE.CanvasTexture(surface));
    texture.colorSpace = THREE.SRGBColorSpace;
    function curved(width, height) {
      const geometry = own(new THREE.PlaneGeometry(width, height, 72, 12));
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i),
          angle = x / 12;
        positions.setXYZ(
          i,
          Math.sin(angle) * 12,
          positions.getY(i),
          (1 - Math.cos(angle)) * 8,
        );
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      return geometry;
    }
    const screen = new THREE.Mesh(
      curved(10, 3.5),
      own(
        new THREE.MeshStandardMaterial({
          map: texture,
          emissiveMap: texture,
          emissive: 0xffffff,
          emissiveIntensity: 0.35,
          roughness: 0.5,
          side: THREE.DoubleSide,
        }),
      ),
    );
    const rim = new THREE.Mesh(
      curved(10.25, 3.7),
      own(
        new THREE.MeshBasicMaterial({
          color: 0x889aff,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
        }),
      ),
    );
    rim.position.z = -0.05;
    scene.add(rim, screen, new THREE.AmbientLight(0xcddaff, 1.2));
    const projector = new THREE.PointLight(0xa3eaff, 55, 30, 2);
    projector.position.set(0, 3.5, 8);
    scene.add(projector);
    const beamMaterial = own(
      new THREE.MeshBasicMaterial({
        color: 0x63caff,
        transparent: true,
        opacity: 0.025,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const beam = new THREE.Mesh(
      own(new THREE.CylinderGeometry(0.08, 4.3, 8, 32, 1, true)),
      beamMaterial,
    );
    beam.position.set(0, 1.2, 4);
    beam.rotation.x = 1.25;
    scene.add(beam);
    context = gsap.context(() => {
      timeline = gsap.timeline({
        repeat: -1,
        yoyo: true,
        defaults: { duration: 2.8, ease: "sine.inOut" },
      });
      timeline
        .to(projector, { intensity: 85 }, 0)
        .to(beamMaterial, { opacity: 0.065 }, 0)
        .to(screen.material, { emissiveIntensity: 0.52 }, 0);
    }, host);
    function resize() {
      if (disposed) return;
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      try {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);
        host.dataset.dpr = String(dpr);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      } catch {
        // ResizeObserver chạy bất đồng bộ: lỗi WebGL phải về nền tĩnh an toàn.
        dispose();
        onLost();
      }
    }
    host.appendChild(canvas);
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
    } else {
      resizeListener = resize;
      window.addEventListener("resize", resizeListener);
    }
    resize();
    if (disposed) return () => {};
    canvas.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", update);
    if (typeof IntersectionObserver === "function") {
      observer = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        update();
      });
      observer.observe(host);
    }
    update();
    return dispose;
  } catch {
    dispose();
    return () => {};
  }
}
