import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { colorFor, type Day, type ThemeName } from './themes.js';

// Grid spacing between bar centers and the footprint of each bar.
const CELL = 1;
const BAR_SIZE = 0.82;
// Height tuning: empty days are a short flat tile; non-empty days scale up.
const EMPTY_HEIGHT = 0.08;
const MAX_HEIGHT = 10;

export class Scene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly scene: THREE.Scene;
  private readonly controls: OrbitControls;
  private readonly barsGroup: THREE.Group;
  private readonly boxGeometry: THREE.BoxGeometry;
  private readonly mount: HTMLElement;

  constructor(mount: HTMLElement) {
    this.mount = mount;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0d1117');

    const { clientWidth: w, clientHeight: h } = mount;
    this.camera = new THREE.PerspectiveCamera(50, w / h || 1, 0.1, 1000);
    this.camera.position.set(30, 30, 40);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(w || 1, h || 1);
    mount.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    // Lighting.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const directional = new THREE.DirectionalLight(0xffffff, 1.1);
    directional.position.set(20, 40, 20);
    this.scene.add(directional);

    // Subtle ground plane.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: '#161b22', roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);

    this.barsGroup = new THREE.Group();
    this.scene.add(this.barsGroup);

    // Shared unit-cube geometry reused by every bar.
    this.boxGeometry = new THREE.BoxGeometry(BAR_SIZE, 1, BAR_SIZE);

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  /** Rebuild the grid from a new dataset. Clears any previous bars first. */
  build(days: Day[], maxCount: number, theme: ThemeName): void {
    this.clearBars();

    if (days.length === 0) return;

    // X is the week index, Z is the weekday (0..6).
    // GitHub returns days ordered week-by-week, so derive the week index by
    // counting weekday wraps rather than trusting external ordering.
    let weekIndex = 0;
    let prevWeekday = -1;
    const heightScale = maxCount > 0 ? MAX_HEIGHT / maxCount : 0;

    let minX = Infinity;
    let maxX = -Infinity;

    for (const day of days) {
      if (day.weekday <= prevWeekday) {
        weekIndex += 1;
      }
      prevWeekday = day.weekday;

      const height =
        day.count > 0
          ? Math.max(EMPTY_HEIGHT, day.count * heightScale)
          : EMPTY_HEIGHT;

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorFor(day, maxCount, theme)),
        roughness: 0.55,
        metalness: 0.05,
      });
      const mesh = new THREE.Mesh(this.boxGeometry, material);
      const x = weekIndex * CELL;
      const z = day.weekday * CELL;
      mesh.scale.y = height;
      mesh.position.set(x, height / 2, z);
      this.barsGroup.add(mesh);

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }

    this.frameGrid(minX, maxX);
  }

  /** Re-center the camera and orbit target on the grid bounds. */
  private frameGrid(minX: number, maxX: number): void {
    const gridWidth = maxX - minX;
    const gridDepth = 6 * CELL;
    const centerX = (minX + maxX) / 2;
    const centerZ = gridDepth / 2;

    this.controls.target.set(centerX, 0, centerZ);

    const span = Math.max(gridWidth, gridDepth, 1);
    this.camera.position.set(centerX, span * 0.75, centerZ + span * 0.95);
    this.camera.near = 0.1;
    this.camera.far = span * 10;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private clearBars(): void {
    for (const child of [...this.barsGroup.children]) {
      this.barsGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        // Geometry is shared and reused, so only dispose the per-bar material.
        const mat = child.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    }
  }

  private readonly onResize = (): void => {
    const { clientWidth: w, clientHeight: h } = this.mount;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private readonly animate = (): void => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}
