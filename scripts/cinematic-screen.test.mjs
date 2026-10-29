import test from "node:test";
import assert from "node:assert/strict";
import { createCinemaScreen } from "../frontend/src/three/cinemaScreen.js";

function fixture({ observers = true } = {}) {
  const previous = new Map();
  const install = (name, value) => {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true });
  };
  const frames = new Map();
  const state = {
    renders: 0,
    killed: 0,
    reverted: 0,
    paused: 0,
    resumed: 0,
    rendererDisposed: 0,
    renderListsDisposed: 0,
    losses: 0,
    fallback: 0,
    resources: [],
    failRender: false,
  };
  const paint = {
    createLinearGradient: () => ({ addColorStop() {} }),
    fillRect() {},
    fillText() {},
  };
  const gl = { getExtension: () => ({ loseContext: () => state.losses++ }) };
  const canvas = new EventTarget();
  canvas.getContext = (kind) => (kind === "2d" ? paint : gl);
  canvas.remove = () => {
    state.attached = false;
  };
  const document = new EventTarget();
  document.hidden = false;
  document.createElement = () => canvas;
  const window = new EventTarget();
  window.devicePixelRatio = 3;
  const host = {
    dataset: {},
    getBoundingClientRect: () => ({ width: 800, height: 240 }),
    appendChild: () => {
      state.attached = true;
    },
  };
  let nextFrame = 0;
  install("document", document);
  install("window", window);
  install("requestAnimationFrame", (callback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  install("cancelAnimationFrame", (id) => frames.delete(id));
  class Observer {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }
  install(
    "IntersectionObserver",
    observers
      ? class extends Observer {
          constructor(callback) {
            super(callback);
            state.intersection = this;
          }
        }
      : undefined,
  );
  install(
    "ResizeObserver",
    observers
      ? class extends Observer {
          constructor(callback) {
            super(callback);
            state.resize = this;
          }
        }
      : undefined,
  );
  class Resource {
    constructor() {
      this.disposals = 0;
      state.resources.push(this);
    }
    dispose() {
      this.disposals++;
    }
  }
  class Geometry extends Resource {
    attributes = {
      position: {
        count: 2,
        getX: () => 0,
        getY: () => 0,
        setXYZ() {},
      },
    };
    computeVertexNormals() {}
  }
  class Object3D {
    position = { set() {} };
    rotation = {};
    constructor(_geometry, material) {
      this.material = material;
    }
  }
  const THREE = {
    WebGLRenderer: class {
      renderLists = { dispose: () => state.renderListsDisposed++ };
      setClearColor() {}
      setPixelRatio(value) {
        state.dpr = value;
      }
      setSize() {}
      render() {
        if (state.failRender) throw new Error("WebGL interrupted");
        state.renders++;
      }
      setAnimationLoop() {}
      dispose() {
        state.rendererDisposed++;
      }
      forceContextLoss() {
        state.losses++;
      }
    },
    Scene: class {
      add() {}
      clear() {}
    },
    PerspectiveCamera: class extends Object3D {
      lookAt() {}
      updateProjectionMatrix() {}
    },
    CanvasTexture: Resource,
    PlaneGeometry: Geometry,
    CylinderGeometry: Geometry,
    MeshStandardMaterial: Resource,
    MeshBasicMaterial: Resource,
    Mesh: Object3D,
    AmbientLight: Object3D,
    PointLight: Object3D,
  };
  const timeline = {
    to() {
      return this;
    },
    pause: () => state.paused++,
    resume: () => state.resumed++,
    kill: () => state.killed++,
  };
  const gsap = {
    timeline: () => timeline,
    context: (callback) => {
      callback();
      return { revert: () => state.reverted++ };
    },
  };
  const dispose = createCinemaScreen(host, THREE, gsap, () => state.fallback++);
  return {
    state,
    host,
    frames,
    document,
    window,
    canvas,
    dispose,
    close() {
      dispose();
      for (const [name, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    },
  };
}

function assertReleased({ state, frames, host }) {
  assert.equal(frames.size, 0);
  assert.equal(state.attached, false);
  assert.equal(state.rendererDisposed, 1);
  assert.equal(state.renderListsDisposed, 1);
  assert.equal(state.losses, 1);
  assert.equal(state.killed, 1);
  assert.equal(state.reverted, 1);
  assert.ok(state.resources.length > 0);
  assert.ok(state.resources.every((resource) => resource.disposals === 1));
  assert.deepEqual(host.dataset, {});
}

test("Cinemascope works without observers and removes the resize fallback on idempotent cleanup", () => {
  const f = fixture({ observers: false });
  try {
    assert.equal(f.host.dataset.rendering, "active");
    assert.equal(f.state.dpr, 2);
    const before = f.state.renders;
    f.window.dispatchEvent(new Event("resize"));
    assert.equal(f.state.renders, before + 1);
    f.dispose();
    f.dispose();
    f.window.dispatchEvent(new Event("resize"));
    assert.equal(f.state.renders, before + 1);
    assertReleased(f);
  } finally {
    f.close();
  }
});

test("Cinemascope suspends both rendering and GSAP when offscreen or the tab is hidden", () => {
  const f = fixture();
  try {
    assert.equal(f.frames.size, 1);
    f.state.intersection.callback([{ isIntersecting: false }]);
    assert.equal(f.host.dataset.rendering, "paused");
    assert.equal(f.frames.size, 0);
    f.state.intersection.callback([{ isIntersecting: true }]);
    assert.equal(f.host.dataset.rendering, "active");
    f.document.hidden = true;
    f.document.dispatchEvent(new Event("visibilitychange"));
    assert.equal(f.frames.size, 0);
    assert.equal(f.host.dataset.rendering, "paused");
    f.document.hidden = false;
    f.document.dispatchEvent(new Event("visibilitychange"));
    assert.equal(f.frames.size, 1);
    assert.equal(f.host.dataset.rendering, "active");
    f.dispose();
    assert.equal(f.state.intersection.disconnected, true);
    assert.equal(f.state.resize.disconnected, true);
    assertReleased(f);
  } finally {
    f.close();
  }
});

test("an asynchronous resize render failure falls back once instead of escaping the observer", () => {
  const f = fixture();
  try {
    f.state.failRender = true;
    assert.doesNotThrow(() => f.state.resize.callback());
    assert.equal(f.state.fallback, 1);
    f.state.resize.callback();
    assert.equal(f.state.fallback, 1);
    assertReleased(f);
  } finally {
    f.close();
  }
});

test("a lost WebGL context stops animation, releases owned GPU resources and keeps static fallback", () => {
  const f = fixture();
  try {
    const event = new Event("webglcontextlost", { cancelable: true });
    f.canvas.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(f.state.fallback, 1);
    f.canvas.dispatchEvent(new Event("webglcontextlost"));
    assert.equal(f.state.fallback, 1);
    assertReleased(f);
  } finally {
    f.close();
  }
});
