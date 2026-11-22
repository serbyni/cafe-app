import * as THREE from "three";
import { PAGE_H, PAGE_W } from "@/lib/book/paginate";

/*
 * 3D book (three.js, no React): a stack of bendable sheets around a spine. Page p is on sheet
 * floor(p / 2) — front when p is even, back when odd. "k" = number of turned sheets: the open
 * spread shows page 2k − 1 (left) and 2k (right); k = 0 is the closed cover, k = sheets is the
 * back cover. Right-to-left books (Arabic) hinge on the right and turn the other way.
 */

const SEG = 24;
const W = 1;
const H = PAGE_H / PAGE_W;
const TURN_MS = 650;
const Z_GAP = 0.0025;

type Anim = { from: number; to: number; start: number; ms: number };

export type BookState = { k: number; sheets: number; zoomed: boolean; open: boolean };

export type BookOptions = {
  pageCount: number;
  rtl: boolean;
  reducedMotion: boolean;
  /** Texture of page p (drawn on demand); null = blank paper for now. */
  texture: (page: number) => THREE.Texture | null;
  /** The page is no longer near the open spread: its texture can be freed. */
  release: (page: number) => void;
  /** A tap on page p at page coordinates (x, y), e.g. a contents line. Return true if used. */
  onPageTap: (page: number, x: number, y: number) => boolean;
  onChange: (s: BookState) => void;
  paperColor: string;
};

class Sheet {
  readonly front: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  readonly back: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  t = 0;
  anim: Anim | null = null;
  loaded = false;

  constructor(
    readonly index: number,
    private readonly dir: number,
    paper: THREE.Color,
  ) {
    const make = (side: THREE.Side, flipU: boolean) => {
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array((SEG + 1) * 2 * 3);
      const uv = new Float32Array((SEG + 1) * 2 * 2);
      const idx: number[] = [];
      for (let i = 0; i <= SEG; i++) {
        const s = i / SEG;
        // u along the sheet from the spine: LTR spine is the page's left edge, RTL its right edge;
        // the back face is seen from behind, so its u runs the other way.
        let u = this.dir > 0 ? s : 1 - s;
        if (flipU) u = 1 - u;
        uv.set([u, 1, u, 0], i * 4);
        if (i < SEG) {
          const a = i * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx);
      const m = new THREE.MeshStandardMaterial({
        color: paper,
        side,
        roughness: 0.92,
        metalness: 0,
      });
      return new THREE.Mesh(g, m);
    };
    // The geometry's winding faces +z for LTR; RTL sheets extend to −x, which flips it.
    this.front = make(dir > 0 ? THREE.FrontSide : THREE.BackSide, false);
    this.back = make(dir > 0 ? THREE.BackSide : THREE.FrontSide, true);
    this.front.userData.sheet = this;
    this.back.userData.sheet = this;
  }

  /** Bends the sheet for turn progress t (0 = right side, 1 = turned), stacked at height z0. */
  shape(z0: number) {
    const t = this.t;
    const curl = Math.sin(Math.PI * t) * 0.9;
    for (const mesh of [this.front, this.back]) {
      const pos = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      let x = 0;
      let z = z0;
      for (let i = 0; i <= SEG; i++) {
        if (i > 0) {
          const s = (i - 0.5) / SEG;
          const a = Math.PI * t + curl * (s - 0.5);
          x += this.dir * Math.cos(a) * (W / SEG);
          z += Math.sin(a) * (W / SEG);
        }
        pos.setXYZ(i * 2, x, H / 2, z);
        pos.setXYZ(i * 2 + 1, x, -H / 2, z);
      }
      pos.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeBoundingSphere();
    }
  }
}

export class BookScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  private book = new THREE.Group();
  private sheets: Sheet[] = [];
  private k = 0;
  private opened = false;
  private raf = 0;
  private dirty = true;
  private zoom = 1;
  private pan = new THREE.Vector2();
  private shiftX = 0;
  private tilt = -0.32;
  private pointers = new Map<number, { x: number; y: number }>();
  private gesture:
    | { kind: "none" }
    | { kind: "maybe"; x: number; y: number; t: number }
    | {
        kind: "turn";
        sheet: Sheet;
        forward: boolean;
        x: number;
        lastX: number;
        lastT: number;
        v: number;
      }
    | { kind: "pan"; x: number; y: number; px: number; py: number }
    | { kind: "pinch"; d: number; zoom: number } = { kind: "none" };
  private lastTap = { t: 0, x: 0, y: 0 };
  private tapTimer: ReturnType<typeof setTimeout> | null = null;
  private ro: ResizeObserver;
  private raycaster = new THREE.Raycaster();
  private readonly dir: number;

  constructor(
    private readonly container: HTMLElement,
    private readonly o: BookOptions,
  ) {
    this.dir = o.rtl ? -1 : 1;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.style.display = "block";
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xfff4e6, 1.4);
    sun.position.set(-1.5, 2, 4);
    this.scene.add(sun);

    const paper = new THREE.Color(o.paperColor);
    const count = Math.ceil(o.pageCount / 2);
    for (let i = 0; i < count; i++) {
      const s = new Sheet(i, this.dir, paper);
      this.sheets.push(s);
      this.book.add(s.front, s.back);
    }
    this.book.add(this.shadow());
    this.scene.add(this.book);

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointercancel", this.onUp);
    el.addEventListener("wheel", this.onWheel, { passive: false });
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.layout(true);
    this.loop();
    this.emit();
  }

  /* ── Public API ── */

  get sheetCount() {
    return this.sheets.length;
  }
  get spread() {
    return this.k;
  }

  next() {
    if (this.k >= this.sheets.length || this.zoom > 1.01) return;
    this.opened = true;
    this.turnTo(this.k + 1);
  }
  prev() {
    if (this.k <= 0 || this.zoom > 1.01) return;
    this.turnTo(this.k - 1);
  }
  /** Opens the spread that shows page p (several sheets turn, one after the other). */
  goToPage(p: number) {
    this.opened = true;
    this.turnTo(Math.max(0, Math.min(this.sheets.length, Math.ceil(p / 2))));
  }
  setZoom(z: number) {
    this.zoom = Math.max(1, Math.min(3, z));
    if (this.zoom <= 1.01) this.pan.set(0, 0);
    this.clampPan();
    this.dirty = true;
    this.emit();
  }
  zoomBy(f: number) {
    this.setZoom(this.zoom * f);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    if (this.tapTimer) clearTimeout(this.tapTimer);
    this.ro.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.onDown);
    el.removeEventListener("pointermove", this.onMove);
    el.removeEventListener("pointerup", this.onUp);
    el.removeEventListener("pointercancel", this.onUp);
    el.removeEventListener("wheel", this.onWheel);
    for (const s of this.sheets)
      for (const m of [s.front, s.back]) {
        m.geometry.dispose();
        m.material.dispose();
      }
    this.renderer.dispose();
    el.remove();
  }

  /** A sample of the drawn frame (tests: the canvas is not blank). */
  get canvas() {
    return this.renderer.domElement;
  }

  /* ── Turning ── */

  private turnTo(k: number) {
    const from = this.k;
    this.k = k;
    const now = performance.now();
    const ms = this.o.reducedMotion ? 0 : TURN_MS;
    const steps = Math.abs(k - from);
    const stagger = steps > 1 ? Math.min(120, 600 / steps) : 0;
    this.sheets.forEach((s, i) => {
      const target = i < k ? 1 : 0;
      if (s.t === target && !s.anim) return;
      const order = k > from ? i - from : from - 1 - i;
      s.anim = { from: s.t, to: target, start: now + Math.max(0, order) * stagger, ms };
    });
    this.dirty = true;
    this.emit();
  }

  private stackZ(s: Sheet) {
    const n = this.sheets.length;
    return (1 - s.t) * (n - s.index) * Z_GAP + s.t * (s.index + 1) * Z_GAP;
  }

  /** Book position (closed cover/back cover centred), tilt, textures near the spread. */
  private layout(instant = false) {
    const n = this.sheets.length;
    const targetShift = this.k === 0 ? -this.dir * (W / 2) : this.k === n ? this.dir * (W / 2) : 0;
    const targetTilt = this.opened ? -0.06 : -0.32;
    const f = instant || this.o.reducedMotion ? 1 : 0.14;
    this.shiftX += (targetShift - this.shiftX) * f;
    this.tilt += (targetTilt - this.tilt) * f;
    this.book.position.x = this.shiftX;
    this.book.rotation.x = this.tilt;
    const moving =
      Math.abs(targetShift - this.shiftX) > 0.001 || Math.abs(targetTilt - this.tilt) > 0.001;

    // Textures: sheets within 2 of the open spread.
    for (const s of this.sheets) {
      const near = s.index >= this.k - 2 && s.index <= this.k + 1;
      if (near && !s.loaded) {
        s.front.material.map = this.o.texture(s.index * 2);
        s.back.material.map = this.o.texture(s.index * 2 + 1);
        for (const m of [s.front.material, s.back.material]) {
          m.color.set(m.map ? 0xffffff : this.o.paperColor);
          m.needsUpdate = true;
        }
        s.loaded = true;
      } else if (!near && s.loaded) {
        s.front.material.map = null;
        s.back.material.map = null;
        for (const m of [s.front.material, s.back.material]) {
          m.color.set(this.o.paperColor);
          m.needsUpdate = true;
        }
        this.o.release(s.index * 2);
        this.o.release(s.index * 2 + 1);
        s.loaded = false;
      }
    }
    return moving;
  }

  /** A page texture changed (e.g. a photo arrived): redraw. */
  refresh() {
    for (const s of this.sheets) {
      if (!s.loaded) continue;
      for (const m of [s.front.material, s.back.material]) if (m.map) m.map.needsUpdate = true;
    }
    this.dirty = true;
  }
  /** Textures must be fetched again (e.g. language change). */
  reloadTextures() {
    for (const s of this.sheets) s.loaded = false;
    this.dirty = true;
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    let animating = this.layout();
    for (const s of this.sheets) {
      if (s.anim) {
        const a = s.anim;
        const p = a.ms === 0 ? 1 : Math.min(1, Math.max(0, (now - a.start) / a.ms));
        const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        s.t = a.from + (a.to - a.from) * e;
        if (p >= 1) {
          s.t = a.to;
          s.anim = null;
        }
        animating = true;
      }
      if (animating || this.dirty) s.shape(this.stackZ(s));
    }
    if (animating || this.dirty) {
      this.applyCamera();
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }
  };

  /* ── Camera ── */

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${w}px`;
    this.renderer.domElement.style.height = `${h}px`;
    this.camera.aspect = w / h;
    this.dirty = true;
  }

  private applyCamera() {
    // Fit the open spread (2 pages + margin) in the view.
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const needH = H * 1.04;
    const needW = 2 * W * 1.03;
    const dist = Math.max(needH, needW / this.camera.aspect) / (2 * Math.tan(fov / 2));
    this.camera.position.set(this.pan.x, this.pan.y, dist);
    this.camera.zoom = this.zoom;
    this.camera.lookAt(this.pan.x, this.pan.y, 0);
    this.camera.updateProjectionMatrix();
  }

  private clampPan() {
    const lim = (this.zoom - 1) / this.zoom;
    this.pan.x = Math.max(-W * lim, Math.min(W * lim, this.pan.x));
    this.pan.y = Math.max((-H / 2) * lim, Math.min((H / 2) * lim, this.pan.y));
  }

  private shadow() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, "rgba(0,0,0,0.28)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 2.6, H * 1.25),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(c),
        transparent: true,
        depthWrite: false,
      }),
    );
    m.position.z = -0.02;
    return m;
  }

  /* ── Pointer gestures ── */

  private onDown = (e: PointerEvent) => {
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.cancelTurn();
      this.gesture = { kind: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.zoom };
      return;
    }
    if (this.zoom > 1.01)
      this.gesture = { kind: "pan", x: e.clientX, y: e.clientY, px: this.pan.x, py: this.pan.y };
    else this.gesture = { kind: "maybe", x: e.clientX, y: e.clientY, t: performance.now() };
  };

  private onMove = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = this.gesture;
    const width = this.container.clientWidth;
    if (g.kind === "pinch" && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.setZoom(g.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / g.d));
      return;
    }
    if (g.kind === "pan") {
      const scale = (2 * W * 1.03) / width / this.zoom;
      this.pan.set(g.px - (e.clientX - g.x) * scale, g.py + (e.clientY - g.y) * scale);
      this.clampPan();
      this.dirty = true;
      return;
    }
    if (g.kind === "maybe") {
      const dx = e.clientX - g.x;
      if (Math.abs(dx) < 10) return;
      // Forward = dragging away from the open edge towards the spine side.
      const forward = dx * this.dir < 0;
      const sheet = forward ? this.sheets[this.k] : this.sheets[this.k - 1];
      if (!sheet) return;
      this.opened = true;
      sheet.anim = null;
      this.gesture = {
        kind: "turn",
        sheet,
        forward,
        x: g.x,
        lastX: e.clientX,
        lastT: performance.now(),
        v: 0,
      };
    }
    const t = this.gesture;
    if (t.kind === "turn") {
      const now = performance.now();
      t.v = (e.clientX - t.lastX) / Math.max(1, now - t.lastT);
      t.lastX = e.clientX;
      t.lastT = now;
      const p = Math.max(0, Math.min(1, ((t.x - e.clientX) * this.dir) / (width * 0.55)));
      t.sheet.t = t.forward
        ? p
        : 1 - Math.max(0, Math.min(1, ((e.clientX - t.x) * this.dir) / (width * 0.55)));
      this.dirty = true;
    }
  };

  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    const g = this.gesture;
    if (g.kind === "pinch") {
      if (this.pointers.size === 0) this.gesture = { kind: "none" };
      return;
    }
    if (g.kind === "turn") {
      const flick = -g.v * this.dir > 0.5;
      const flickBack = g.v * this.dir > 0.5;
      const done = g.forward ? g.sheet.t > 0.35 || flick : g.sheet.t < 0.65 || flickBack;
      const k = g.forward ? (done ? this.k + 1 : this.k) : done ? this.k - 1 : this.k;
      this.gesture = { kind: "none" };
      this.turnTo(k);
      return;
    }
    if (g.kind === "maybe" && performance.now() - g.t < 350) this.tap(e.clientX, e.clientY);
    this.gesture = { kind: "none" };
  };

  private cancelTurn() {
    if (this.gesture.kind === "turn") this.turnTo(this.k);
  }

  private onWheel = (e: WheelEvent) => {
    // Trackpad pinch (ctrlKey) always zooms; a plain wheel zooms only once zoomed in or in
    // fullscreen, so the page can still scroll past the book.
    if (!e.ctrlKey && this.zoom <= 1.01 && !document.fullscreenElement) return;
    e.preventDefault();
    this.zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)));
  };

  private tap(x: number, y: number) {
    const now = performance.now();
    const double =
      now - this.lastTap.t < 300 && Math.hypot(x - this.lastTap.x, y - this.lastTap.y) < 40;
    this.lastTap = { t: now, x, y };
    if (this.tapTimer) {
      clearTimeout(this.tapTimer);
      this.tapTimer = null;
    }
    if (double) {
      if (this.zoom > 1.01) this.setZoom(1);
      else {
        const hit = this.hit(x, y);
        this.setZoom(2.2);
        if (hit) {
          this.pan.set(hit.point.x - this.book.position.x, hit.point.y);
          this.clampPan();
        }
      }
      return;
    }
    // Wait a moment to tell a single tap from a double tap.
    this.tapTimer = setTimeout(() => {
      this.tapTimer = null;
      if (this.zoom > 1.01) return;
      if (this.k === 0) return this.next();
      if (this.k === this.sheets.length) return this.prev();
      const hit = this.hit(x, y);
      if (hit?.uv) {
        const sheet = hit.object.userData.sheet as Sheet;
        const isBack = hit.object === sheet.back;
        const page = sheet.index * 2 + (isBack ? 1 : 0);
        if (this.o.onPageTap(page, hit.uv.x * PAGE_W, (1 - hit.uv.y) * PAGE_H)) return;
      }
      const rect = this.renderer.domElement.getBoundingClientRect();
      const rightHalf = x - rect.left > rect.width / 2;
      if (rightHalf === this.dir > 0) this.next();
      else this.prev();
    }, 260);
  }

  private hit(x: number, y: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes = this.sheets.flatMap((s) => [s.front, s.back]);
    return this.raycaster.intersectObjects(meshes, false)[0] ?? null;
  }

  private emit() {
    this.o.onChange({
      k: this.k,
      sheets: this.sheets.length,
      zoomed: this.zoom > 1.01,
      open: this.opened,
    });
  }
}
