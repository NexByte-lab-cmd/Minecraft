import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { TextureAtlas } from './textures';
import { buildChunkGeometry } from './mesher';
import { chunkKey, type VoxelWorld } from '../world/world';
import {
  animateArticulatedMesh,
  buildCharacterMesh,
  buildMobMesh,
  PLAYER_SKINS,
} from '../entities/catalog';
import type { ActiveMob } from '../entities/ai';
import type { GameMode, RealmId } from '../network/commands';

export interface RemotePeerVisual {
  id: string;
  name: string;
  skinId: string;
  realm: RealmId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  moving: number;
  swing: number;
  talking: boolean;
}

export interface DroppedItemVisual {
  uid: number;
  x: number;
  y: number;
  z: number;
  color: string;
}

export interface ProjectileVisual {
  x: number;
  y: number;
  z: number;
  kind: 'arrow' | 'fireball' | 'sonic';
}

interface ChunkMeshGroup {
  group: THREE.Group;
  opaque?: THREE.Mesh;
  cutout?: THREE.Mesh;
  translucent?: THREE.Mesh;
  emissivePoints: Array<{ x: number; y: number; z: number; color: string }>;
  waterfalls: Array<{ x: number; y: number; z: number }>;
}

interface BreakParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  color: THREE.Color;
}

interface MistParticle {
  x: number;
  y: number;
  z: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class VoxelRenderer {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public isSoftwareGl = false;
  public atlas: TextureAtlas;

  private container: HTMLElement;
  private worldGroup = new THREE.Group();
  private chunkMeshes = new Map<string, ChunkMeshGroup>();

  private opaqueMat: THREE.MeshStandardMaterial;
  private cutoutMat: THREE.MeshStandardMaterial;
  private translucentMat: THREE.MeshStandardMaterial;

  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private sunDisc: THREE.Mesh;
  private sunHalo: THREE.Mesh;
  private moonDisc: THREE.Mesh;
  private starPoints: THREE.Points;
  private cloudGroup = new THREE.Group();
  private rainPoints: THREE.Points;
  private dynamicLights: THREE.PointLight[] = [];

  private playerMesh: THREE.Group | null = null;
  private playerSkinId = '';
  private fpHandGroup = new THREE.Group();
  private fpArmMesh: THREE.Mesh;
  private fpToolMesh: THREE.Mesh;
  private fpToolMat: THREE.MeshStandardMaterial;
  private fpPickGroup = new THREE.Group();
  private fpPickHeadMesh: THREE.Mesh;
  private fpPickHeadMat: THREE.MeshStandardMaterial;
  private fpArmMat: THREE.MeshStandardMaterial;

  private remoteMeshes = new Map<string, { group: THREE.Group; skinId: string; label: THREE.Sprite; talking: boolean }>();
  private mobMeshes = new Map<number, THREE.Group>();
  private dropMeshes = new Map<number, THREE.Mesh>();
  private projGroup = new THREE.Group();

  private targetBox: THREE.LineSegments;
  private crackBox: THREE.Mesh;
  private crackMat: THREE.MeshBasicMaterial;

  private particleInstanced: THREE.InstancedMesh;
  private particles: BreakParticle[] = [];
  private mistInstanced: THREE.InstancedMesh;
  private mists: MistParticle[] = [];
  private firefliesPoints: THREE.Points;
  private dummyObj = new THREE.Object3D();

  private disposed = false;
  private afterDrawTimer = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    const probeCanvas = document.createElement('canvas');
    const probeGl = (probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (probeGl) {
      const dbg = probeGl.getExtension('WEBGL_debug_renderer_info');
      const rStr = dbg ? String(probeGl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
      this.isSoftwareGl = /SwiftShader|llvmpipe|Software|Mesa OffScreen/i.test(rStr);
      probeGl.getExtension('WEBGL_lose_context')?.loseContext();
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#7ec4f8');
    this.scene.fog = new THREE.FogExp2('#9fd4fa', 0.0072);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(72, w / Math.max(1, h), 0.1, 360);
    this.scene.add(this.camera);

    // First-person arm + held item/tool attached to camera
    this.fpArmMat = new THREE.MeshStandardMaterial({ color: '#c48d62', roughness: 0.78 });
    this.fpArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.38, 0.13), this.fpArmMat);
    this.fpArmMesh.position.set(0.41, -0.34, -0.49);
    this.fpArmMesh.rotation.set(0.58, -0.24, 0.18);

    this.fpToolMat = new THREE.MeshStandardMaterial({ color: '#8f6942', roughness: 0.55 });
    this.fpToolMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), this.fpToolMat);
    this.fpToolMesh.position.set(0.32, -0.22, -0.62);
    this.fpToolMesh.rotation.set(0.2, 0.5, 0.1);

    const handleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.28, 0.04),
      new THREE.MeshStandardMaterial({ color: '#6e4a2a', roughness: 0.75 }),
    );
    this.fpPickHeadMat = new THREE.MeshStandardMaterial({ color: '#b8c4d0', roughness: 0.38, metalness: 0.25 });
    this.fpPickHeadMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.05), this.fpPickHeadMat);
    this.fpPickHeadMesh.position.set(0, 0.12, 0);
    this.fpPickGroup.add(handleMesh, this.fpPickHeadMesh);
    this.fpPickGroup.position.set(0.32, -0.17, -0.61);
    this.fpPickGroup.rotation.set(-0.32, -0.2, -0.18);

    this.fpHandGroup.add(this.fpArmMesh, this.fpToolMesh, this.fpPickGroup);
    this.fpHandGroup.visible = false;
    this.camera.add(this.fpHandGroup);

    this.atlas = new TextureAtlas();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.atlas.texture.anisotropy = Math.min(4, maxAniso || 1);

    // Greedy-meshed opaque material with per-vertex atlas tile rect wrapping
    this.opaqueMat = new THREE.MeshStandardMaterial({
      map: this.atlas.texture,
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.04,
    });
    this.opaqueMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
attribute vec4 aTileRect;
varying vec4 vTileRect;
varying vec2 vGreedyUv;`,
        )
        .replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
vTileRect = aTileRect;
vGreedyUv = uv;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec4 vTileRect;
varying vec2 vGreedyUv;`,
        )
        .replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
  vec2 greedyAtlasUv = vTileRect.xy + fract(vGreedyUv) * vTileRect.zw;
  vec4 sampledDiffuseColor = texture2D( map, greedyAtlasUv );
  diffuseColor *= sampledDiffuseColor;
#endif`,
        );
    };

    this.cutoutMat = new THREE.MeshStandardMaterial({
      map: this.atlas.texture,
      vertexColors: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.04,
    });
    this.translucentMat = new THREE.MeshStandardMaterial({
      map: this.atlas.texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      roughness: 0.12,
      metalness: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.hemiLight = new THREE.HemisphereLight('#d6eeff', '#4a6142', 0.92);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff2d6', 1.7);
    this.sunLight.position.set(48, 70, -45);
    if (this.renderer.shadowMap.enabled) {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(1024, 1024);
      this.sunLight.shadow.camera.near = 10;
      this.sunLight.shadow.camera.far = 160;
      const d = 52;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
      this.sunLight.shadow.bias = -0.0005;
    }
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    for (let i = 0; i < 6; i++) {
      const pl = new THREE.PointLight('#ffb347', 0, 14, 1.8);
      this.scene.add(pl);
      this.dynamicLights.push(pl);
    }

    // Living Sun Disc + Outer Corona Halo + Moon
    this.sunDisc = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshBasicMaterial({ color: '#fff4bd', fog: false, side: THREE.DoubleSide }),
    );
    this.sunHalo = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 34),
      new THREE.MeshBasicMaterial({ color: '#ffd17a', transparent: true, opacity: 0.28, fog: false, side: THREE.DoubleSide }),
    );
    this.moonDisc = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: '#e6f0ff', fog: false, side: THREE.DoubleSide }),
    );
    this.scene.add(this.sunHalo, this.sunDisc, this.moonDisc);

    // Stars (gently rotate at night)
    const starPos = new Float32Array(320 * 3);
    for (let i = 0; i < 320; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.48;
      const r = 190;
      starPos[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
      starPos[i * 3 + 1] = Math.cos(phi) * r;
      starPos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.starPoints = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: '#ffffff', size: 1.5, transparent: true, opacity: 0.25, fog: false }),
    );
    this.scene.add(this.starPoints);

    // Layered Multi-Voxel Clouds matching coastal ocean & mountain screenshots
    const cloudMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.86 });
    const mainCloudGeo = new THREE.BoxGeometry(16, 2.4, 10);
    const wingCloudGeo = new THREE.BoxGeometry(10, 2.4, 7);
    for (let i = 0; i < 18; i++) {
      const grp = new THREE.Group();
      const c1 = new THREE.Mesh(mainCloudGeo, cloudMat);
      const c2 = new THREE.Mesh(wingCloudGeo, cloudMat);
      c2.position.set(7, 0.2, 5);
      grp.add(c1, c2);
      grp.position.set(((i * 41) % 220) - 110, 118 + (i % 4) * 3, ((i * 61) % 220) - 110);
      this.cloudGroup.add(grp);
    }
    this.scene.add(this.cloudGroup);

    // Rain Particles
    const rainPos = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 44;
      rainPos[i * 3 + 1] = Math.random() * 26;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    this.rainPoints = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: '#9ecbff', size: 0.28, transparent: true, opacity: 0.7 }),
    );
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);

    // Fireflies (ambient twilight / garden sparkle)
    const ffPos = new Float32Array(60 * 3);
    for (let i = 0; i < 60; i++) {
      ffPos[i * 3] = (Math.random() - 0.5) * 46;
      ffPos[i * 3 + 1] = (Math.random() - 0.3) * 8;
      ffPos[i * 3 + 2] = (Math.random() - 0.5) * 46;
    }
    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
    this.firefliesPoints = new THREE.Points(
      ffGeo,
      new THREE.PointsMaterial({ color: '#e6ff82', size: 0.32, transparent: true, opacity: 0.75 }),
    );
    this.scene.add(this.firefliesPoints);

    // Waterfall Splash Mist InstancedMesh (pooled 64)
    this.mistInstanced = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.28),
      new THREE.MeshBasicMaterial({ color: '#dff5ff', transparent: true, opacity: 0.65 }),
      64,
    );
    this.mistInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < 64; i++) {
      this.mists.push({ x: 0, y: -999, z: 0, vy: 0, life: 0, maxLife: 1 });
      this.dummyObj.position.set(0, -999, 0);
      this.dummyObj.scale.setScalar(0.001);
      this.dummyObj.updateMatrix();
      this.mistInstanced.setMatrixAt(i, this.dummyObj.matrix);
    }
    this.scene.add(this.mistInstanced);

    // Target Highlight & Mining Overlay
    const boxEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006));
    this.targetBox = new THREE.LineSegments(boxEdges, new THREE.LineBasicMaterial({ color: '#1a1d24', transparent: true, opacity: 0.8 }));
    this.targetBox.visible = false;
    this.scene.add(this.targetBox);

    this.crackMat = new THREE.MeshBasicMaterial({ color: '#0e1014', wireframe: true, transparent: true, opacity: 0 });
    this.crackBox = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), this.crackMat);
    this.crackBox.visible = false;
    this.scene.add(this.crackBox);

    // Break Particles
    this.particleInstanced = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.16),
      new THREE.MeshStandardMaterial({ roughness: 0.8 }),
      96,
    );
    this.particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < 96; i++) {
      this.particles.push({ active: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, color: new THREE.Color('#fff') });
      this.dummyObj.position.set(0, -999, 0);
      this.dummyObj.scale.setScalar(0.001);
      this.dummyObj.updateMatrix();
      this.particleInstanced.setMatrixAt(i, this.dummyObj.matrix);
      this.particleInstanced.setColorAt(i, new THREE.Color('#fff'));
    }
    this.scene.add(this.particleInstanced);

    this.scene.add(this.worldGroup);
    this.scene.add(this.projGroup);
  }

  public resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public spawnBreakParticles(x: number, y: number, z: number, hexColor: string): void {
    const col = new THREE.Color(hexColor);
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < 12; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x + 0.2 + Math.random() * 0.6;
        p.y = y + 0.2 + Math.random() * 0.6;
        p.z = z + 0.2 + Math.random() * 0.6;
        p.vx = (Math.random() - 0.5) * 4.5;
        p.vy = 1.8 + Math.random() * 3.5;
        p.vz = (Math.random() - 0.5) * 4.5;
        p.life = 0.45 + Math.random() * 0.35;
        p.color.copy(col);
        this.particleInstanced.setColorAt(i, p.color);
        spawned++;
      }
    }
    if (this.particleInstanced.instanceColor) {
      this.particleInstanced.instanceColor.needsUpdate = true;
    }
  }

  public syncWorldChunks(
    world: VoxelWorld,
    centerX: number,
    centerZ: number,
    viewDistChunks: number,
  ): void {
    const pcx = Math.floor(centerX / 16);
    const pcz = Math.floor(centerZ / 16);
    const keepKeys = new Set<string>();

    let rebuilt = 0;
    const maxRebuildPerFrame = this.isSoftwareGl ? 3 : 6;

    for (let r = 0; r <= viewDistChunks; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const cx = pcx + dx;
          const cz = pcz + dz;
          const key = chunkKey(cx, cz, world.realm);
          keepKeys.add(key);

          const chunk = world.getOrCreateChunk(cx, cz);
          const existing = this.chunkMeshes.get(key);
          if (!existing || chunk.dirty) {
            if (rebuilt >= maxRebuildPerFrame && existing) continue;
            if (rebuilt >= maxRebuildPerFrame + 2 && !existing) continue;
            rebuilt++;

            if (existing) {
              this.disposeChunkGroup(existing);
              this.worldGroup.remove(existing.group);
              this.chunkMeshes.delete(key);
            }

            const built = buildChunkGeometry(chunk, world, this.atlas);
            chunk.dirty = false;

            const grp = new THREE.Group();
            const entry: ChunkMeshGroup = {
              group: grp,
              emissivePoints: built.emissivePoints,
              waterfalls: built.waterfalls,
            };

            if (built.opaque) {
              const m = new THREE.Mesh(built.opaque, this.opaqueMat);
              m.receiveShadow = true;
              m.castShadow = !this.isSoftwareGl;
              grp.add(m);
              entry.opaque = m;
            }
            if (built.cutout) {
              const m = new THREE.Mesh(built.cutout, this.cutoutMat);
              m.receiveShadow = true;
              grp.add(m);
              entry.cutout = m;
            }
            if (built.translucent) {
              const m = new THREE.Mesh(built.translucent, this.translucentMat);
              m.renderOrder = 2;
              grp.add(m);
              entry.translucent = m;
            }

            this.worldGroup.add(grp);
            this.chunkMeshes.set(key, entry);
          }
        }
      }
    }

    for (const [k, entry] of this.chunkMeshes.entries()) {
      if (!keepKeys.has(k)) {
        this.disposeChunkGroup(entry);
        this.worldGroup.remove(entry.group);
        this.chunkMeshes.delete(k);
      }
    }
  }

  private disposeChunkGroup(entry: ChunkMeshGroup): void {
    entry.opaque?.geometry.dispose();
    entry.cutout?.geometry.dispose();
    entry.translucent?.geometry.dispose();
  }

  public updateAtmosphere(
    realm: RealmId,
    timeOfDay: number,
    weather: 'clear' | 'rain' | 'storm',
    px: number,
    py: number,
    pz: number,
    elapsed: number,
    mode?: GameMode,
    headUnderwater = false,
  ): void {
    const isHorror = mode === 'horror';

    if (headUnderwater) {
      this.scene.background = new THREE.Color('#134f85');
      (this.scene.fog as THREE.FogExp2).color.set('#165a96');
      (this.scene.fog as THREE.FogExp2).density = 0.068;
      this.hemiLight.intensity = 0.65;
      this.sunLight.intensity = 0.8;
    } else if (realm === 'nether') {
      this.scene.background = new THREE.Color('#3b120e');
      (this.scene.fog as THREE.FogExp2).color.set('#471712');
      (this.scene.fog as THREE.FogExp2).density = 0.019;
      this.hemiLight.color.set('#e86b42');
      this.hemiLight.groundColor.set('#260908');
      this.hemiLight.intensity = 0.8;
      this.sunLight.color.set('#ff8147');
      this.sunLight.intensity = 0.85;
      this.sunDisc.visible = false;
      this.sunHalo.visible = false;
      this.moonDisc.visible = false;
      this.starPoints.visible = false;
      this.cloudGroup.visible = false;
    } else if (realm === 'end') {
      this.scene.background = new THREE.Color('#130c21');
      (this.scene.fog as THREE.FogExp2).color.set('#1a102b');
      (this.scene.fog as THREE.FogExp2).density = 0.011;
      this.hemiLight.color.set('#9c70d6');
      this.hemiLight.groundColor.set('#171124');
      this.hemiLight.intensity = 0.72;
      this.sunLight.color.set('#c499ff');
      this.sunLight.intensity = 0.75;
      this.sunDisc.visible = false;
      this.sunHalo.visible = false;
      this.moonDisc.visible = false;
      this.starPoints.visible = true;
      this.cloudGroup.visible = false;
    } else {
      const norm = ((timeOfDay % 24000) + 24000) % 24000;
      const angle = ((norm - 6000) / 24000) * Math.PI * 2;
      const sunY = Math.sin(angle);
      const sunX = Math.cos(angle);
      const sunZ = -0.35;

      const isSunset = !isHorror && norm >= 11200 && norm <= 14500;
      const isNight = isHorror || (norm > 14500 && norm < 22500);

      const skyCol = new THREE.Color(
        isHorror
          ? '#070a12'
          : weather === 'storm'
            ? '#3b4554'
            : isNight
              ? '#111c36'
              : isSunset
                ? '#eb975e'
                : '#79c2fa',
      );
      const fogCol = new THREE.Color(
        isHorror
          ? '#0d101c'
          : weather === 'storm'
            ? '#4a5464'
            : isNight
              ? '#162340'
              : isSunset
                ? '#f4b078'
                : '#a4d4fa',
      );
      this.scene.background = skyCol;
      (this.scene.fog as THREE.FogExp2).color.copy(fogCol);
      (this.scene.fog as THREE.FogExp2).density = isHorror
        ? 0.036
        : weather === 'clear'
          ? 0.0062
          : 0.013;

      this.hemiLight.color.set(isHorror ? '#382a45' : isNight ? '#4d659c' : isSunset ? '#ffe0b2' : '#dcf0ff');
      this.hemiLight.groundColor.set(isHorror ? '#120d17' : isNight ? '#1b2238' : isSunset ? '#544a5c' : '#4d6644');
      this.hemiLight.intensity = isHorror ? 0.34 : isNight ? 0.58 : isSunset ? 0.94 : 1.02;

      this.sunLight.color.set(isHorror ? '#75547a' : isSunset ? '#ffbd75' : isNight ? '#82a2e0' : '#fff6e0');
      this.sunLight.intensity = isHorror ? 0.25 : isNight ? 0.48 : isSunset ? 1.5 : 1.75;
      this.sunLight.position.set(px + sunX * 65, py + Math.max(14, Math.abs(sunY) * 70), pz + sunZ * 65);
      this.sunLight.target.position.set(px, py, pz);

      this.sunDisc.visible = !isNight;
      this.sunHalo.visible = !isNight;
      this.sunDisc.position.set(px + sunX * 155, py + Math.max(-5, sunY * 155), pz + sunZ * 155);
      this.sunHalo.position.copy(this.sunDisc.position);
      this.sunDisc.lookAt(this.camera.position);
      this.sunHalo.lookAt(this.camera.position);

      this.moonDisc.visible = isNight;
      this.moonDisc.position.set(px - sunX * 155, py + Math.max(18, -sunY * 155), pz - sunZ * 155);
      this.moonDisc.lookAt(this.camera.position);

      this.starPoints.visible = isNight || isSunset;
      (this.starPoints.material as THREE.PointsMaterial).opacity = isNight ? 0.88 : 0.22;
      this.starPoints.position.set(px, py, pz);
      this.starPoints.rotation.y = elapsed * 0.012;

      this.cloudGroup.visible = !isHorror;
      this.cloudGroup.position.x = Math.sin(elapsed * 0.015) * 32;
      this.cloudGroup.position.z = Math.cos(elapsed * 0.01) * 14;
    }

    // Living Fireflies at dusk / night / lush haven
    this.firefliesPoints.visible = realm === 'overworld' && weather === 'clear';
    if (this.firefliesPoints.visible) {
      this.firefliesPoints.position.set(px, py, pz);
      this.firefliesPoints.rotation.y = elapsed * 0.08;
    }

    // Waterfall Mist Particles
    const wfSources: Array<{ x: number; y: number; z: number }> = [];
    for (const chunk of this.chunkMeshes.values()) {
      for (const wf of chunk.waterfalls) wfSources.push(wf);
    }
    let anyMist = false;
    for (let i = 0; i < this.mists.length; i++) {
      const m = this.mists[i];
      if (m.life <= 0) {
        if (wfSources.length > 0 && Math.random() < 0.35) {
          const src = wfSources[Math.floor(Math.random() * wfSources.length)];
          m.x = src.x + (Math.random() - 0.5) * 1.4;
          m.y = src.y + Math.random() * 0.6;
          m.z = src.z + (Math.random() - 0.5) * 1.4;
          m.vy = 1.2 + Math.random() * 1.6;
          m.maxLife = 0.7 + Math.random() * 0.6;
          m.life = m.maxLife;
        }
      }
      if (m.life > 0) {
        anyMist = true;
        m.life -= 0.016;
        m.y += m.vy * 0.016;
        this.dummyObj.position.set(m.x, m.y, m.z);
        this.dummyObj.scale.setScalar(Math.max(0.05, (m.life / m.maxLife) * 1.1));
        this.dummyObj.updateMatrix();
        this.mistInstanced.setMatrixAt(i, this.dummyObj.matrix);
      } else {
        this.dummyObj.position.set(0, -999, 0);
        this.dummyObj.scale.setScalar(0.001);
        this.dummyObj.updateMatrix();
        this.mistInstanced.setMatrixAt(i, this.dummyObj.matrix);
      }
    }
    if (anyMist || wfSources.length > 0) {
      this.mistInstanced.instanceMatrix.needsUpdate = true;
    }

    // Rain particles
    this.rainPoints.visible = realm === 'overworld' && weather !== 'clear';
    if (this.rainPoints.visible) {
      this.rainPoints.position.set(px, py - 4, pz);
      const posAttr = this.rainPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        let ry = posAttr.getY(i) - 0.55;
        if (ry < 0) ry = 26;
        posAttr.setY(i, ry);
      }
      posAttr.needsUpdate = true;
    }

    // Pool nearest 6 emissive block lights
    const cand: Array<{ x: number; y: number; z: number; color: string; d2: number }> = [];
    for (const chunk of this.chunkMeshes.values()) {
      for (const ep of chunk.emissivePoints) {
        const d2 = (ep.x - px) ** 2 + (ep.y - py) ** 2 + (ep.z - pz) ** 2;
        if (d2 < 900) cand.push({ ...ep, d2 });
      }
    }
    cand.sort((a, b) => a.d2 - b.d2);
    for (let i = 0; i < this.dynamicLights.length; i++) {
      const pl = this.dynamicLights[i];
      const item = cand[i];
      if (item) {
        pl.position.set(item.x, item.y, item.z);
        pl.color.set(item.color);
        pl.intensity = 2.6;
      } else {
        pl.intensity = 0;
      }
    }
  }

  public updateTargetHighlight(
    target: { x: number; y: number; z: number } | null,
    breakProgress: number,
  ): void {
    if (!target) {
      this.targetBox.visible = false;
      this.crackBox.visible = false;
      return;
    }
    this.targetBox.visible = true;
    this.targetBox.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
    if (breakProgress > 0.02) {
      this.crackBox.visible = true;
      this.crackBox.position.copy(this.targetBox.position);
      this.crackMat.opacity = Math.min(0.85, breakProgress);
    } else {
      this.crackBox.visible = false;
    }
  }

  public updateEntities(
    player: {
      x: number;
      y: number;
      z: number;
      yaw: number;
      skinId: string;
      moving: number;
      swing: number;
      visible: boolean;
      firstPerson: boolean;
      heldColor: string | null;
      heldKind?: 'tool' | 'sword' | 'block' | 'none';
    },
    mobs: ActiveMob[],
    remotes: RemotePeerVisual[],
    drops: DroppedItemVisual[],
    projectiles: ProjectileVisual[],
    currentRealm: RealmId,
    dt: number,
    elapsed: number,
  ): void {
    const skin = PLAYER_SKINS.find((s) => s.id === player.skinId) || PLAYER_SKINS[0];

    // First-Person Viewmodel Arm + Held Tool / Sword / Block
    this.fpHandGroup.visible = player.firstPerson;
    if (player.firstPerson) {
      this.fpArmMat.color.set(skin.bionicLeftArm ? '#c48d62' : skin.skin);
      const hk = player.heldKind || (player.heldColor ? 'block' : 'none');
      this.fpToolMesh.visible = hk === 'block' && Boolean(player.heldColor);
      this.fpPickGroup.visible = hk === 'tool' || hk === 'sword';
      if (player.heldColor) {
        this.fpToolMat.color.set(player.heldColor);
        this.fpPickHeadMat.color.set(player.heldColor);
      }
      if (hk === 'sword') {
        this.fpPickHeadMesh.scale.set(0.24, 3.8, 1);
        this.fpPickHeadMesh.position.set(0, 0.2, 0);
      } else {
        this.fpPickHeadMesh.scale.set(1, 1, 1);
        this.fpPickHeadMesh.position.set(0, 0.12, 0);
      }
      const bobX = Math.cos(elapsed * 7) * 0.018 * player.moving;
      const bobY = Math.abs(Math.sin(elapsed * 7)) * 0.022 * player.moving;
      const swingAng = Math.sin(player.swing * Math.PI) * 0.95;
      this.fpHandGroup.position.set(bobX, -bobY - swingAng * 0.12, -swingAng * 0.18);
      this.fpHandGroup.rotation.set(-swingAng * 0.85, swingAng * 0.35, 0);
    }

    // Local Player 3rd-person mesh
    if (!this.playerMesh || this.playerSkinId !== player.skinId) {
      if (this.playerMesh) this.scene.remove(this.playerMesh);
      this.playerMesh = buildCharacterMesh(skin);
      this.playerSkinId = player.skinId;
      this.scene.add(this.playerMesh);
    }
    this.playerMesh.visible = player.visible;
    if (player.visible) {
      this.playerMesh.position.set(player.x, player.y, player.z);
      this.playerMesh.rotation.y = player.yaw;
      animateArticulatedMesh(this.playerMesh, player.moving, elapsed, player.swing);
    }

    // Active Mobs
    const activeMobIds = new Set<number>();
    for (const m of mobs) {
      activeMobIds.add(m.id);
      let mesh = this.mobMeshes.get(m.id);
      if (!mesh) {
        mesh = buildMobMesh(m.def, m.tamed);
        this.mobMeshes.set(m.id, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(m.x, m.y, m.z);
      mesh.rotation.y = m.yaw;

      if (m.koTimer > 0) {
        const k = 1 - m.koTimer / 0.35;
        mesh.rotation.z = k * (Math.PI * 0.45);
        mesh.scale.setScalar(Math.max(0.05, 1 - k * 0.7));
      } else {
        mesh.rotation.z = 0;
        const fuseScale = m.fuseTimer > 0 ? 1 + Math.sin(elapsed * 26) * 0.12 : 1;
        mesh.scale.setScalar(m.baby ? 0.55 : fuseScale);
      }

      mesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
          if (m.flashTimer > 0) {
            obj.material.emissive.set('#ff2e2e');
            obj.material.emissiveIntensity = 0.75;
          } else if (!m.def.eyeColor) {
            obj.material.emissiveIntensity = 0;
          }
        }
      });

      const spd = Math.min(1, Math.hypot(m.vx, m.vz) / 2.2);
      animateArticulatedMesh(mesh, spd, elapsed + m.phase);
    }
    for (const [id, mesh] of this.mobMeshes.entries()) {
      if (!activeMobIds.has(id)) {
        this.scene.remove(mesh);
        this.mobMeshes.delete(id);
      }
    }

    // Remote Players + Floating Nameplates
    const activePeers = new Set<string>();
    for (const p of remotes) {
      if (p.realm !== currentRealm) continue;
      activePeers.add(p.id);
      let entry = this.remoteMeshes.get(p.id);
      if (!entry || entry.skinId !== p.skinId || entry.talking !== p.talking) {
        if (entry) this.scene.remove(entry.group);
        const rSkin = PLAYER_SKINS.find((s) => s.id === p.skinId) || PLAYER_SKINS[0];
        const grp = buildCharacterMesh(rSkin);
        const label = this.createNameSprite(p.name, p.talking);
        label.position.set(0, 2.35, 0);
        grp.add(label);
        this.scene.add(grp);
        entry = { group: grp, skinId: p.skinId, label, talking: p.talking };
        this.remoteMeshes.set(p.id, entry);
      }
      entry.group.position.lerp(new THREE.Vector3(p.x, p.y, p.z), 0.35);
      entry.group.rotation.y = p.yaw;
      animateArticulatedMesh(entry.group, p.moving, elapsed, p.swing);
    }
    for (const [pid, entry] of this.remoteMeshes.entries()) {
      if (!activePeers.has(pid)) {
        this.scene.remove(entry.group);
        this.remoteMeshes.delete(pid);
      }
    }

    // Dropped Items
    const activeDrops = new Set<number>();
    for (const d of drops) {
      activeDrops.add(d.uid);
      let mesh = this.dropMeshes.get(d.uid);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.28, 0.28),
          new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.5 }),
        );
        this.dropMeshes.set(d.uid, mesh);
        this.scene.add(mesh);
      }
      mesh.position.set(d.x, d.y + 0.2 + Math.sin(elapsed * 3 + d.uid) * 0.08, d.z);
      mesh.rotation.y = elapsed * 2 + d.uid;
    }
    for (const [uid, mesh] of this.dropMeshes.entries()) {
      if (!activeDrops.has(uid)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.dropMeshes.delete(uid);
      }
    }

    // Projectiles
    while (this.projGroup.children.length > 0) {
      const ch = this.projGroup.children[0] as THREE.Mesh;
      this.projGroup.remove(ch);
      ch.geometry.dispose();
    }
    for (const pr of projectiles) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshBasicMaterial({
          color: pr.kind === 'fireball' ? '#ff7b29' : pr.kind === 'sonic' ? '#cf63ff' : '#e6dec8',
        }),
      );
      m.position.set(pr.x, pr.y, pr.z);
      this.projGroup.add(m);
    }

    // Break Particles Step
    let anyActive = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyActive = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.dummyObj.position.set(0, -999, 0);
        this.dummyObj.scale.setScalar(0.001);
        this.dummyObj.updateMatrix();
        this.particleInstanced.setMatrixAt(i, this.dummyObj.matrix);
      } else {
        p.vy -= 18 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        this.dummyObj.position.set(p.x, p.y, p.z);
        this.dummyObj.scale.setScalar(Math.min(1, p.life * 2));
        this.dummyObj.updateMatrix();
        this.particleInstanced.setMatrixAt(i, this.dummyObj.matrix);
      }
    }
    if (anyActive) {
      this.particleInstanced.instanceMatrix.needsUpdate = true;
    }
  }

  private createNameSprite(name: string, talking: boolean): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 56;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(15, 18, 26, 0.72)';
    ctx.fillRect(16, 8, 224, 38);
    ctx.strokeStyle = talking ? '#5ce063' : 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 8, 224, 38);
    ctx.font = 'bold 21px monospace';
    ctx.fillStyle = talking ? '#86ff8d' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(talking ? `MIC ${name}` : name, 128, 28);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(2.2, 0.48, 1);
    return sp;
  }

  public renderFrame(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public afterDraw(nextTick: () => void): void {
    if (this.disposed) return;
    if (!this.isSoftwareGl) {
      requestAnimationFrame(nextTick);
      return;
    }
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function' && typeof gl.getSyncParameter === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      let polls = 0;
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        polls++;
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED && polls < 40) {
          this.afterDrawTimer = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.afterDrawTimer = window.setTimeout(() => {
            if (!this.disposed) requestAnimationFrame(nextTick);
          }, 80);
        }
      };
      this.afterDrawTimer = window.setTimeout(poll, 5);
    } else {
      this.afterDrawTimer = window.setTimeout(() => {
        if (!this.disposed) requestAnimationFrame(nextTick);
      }, 90);
    }
  }

  public dispose(): void {
    this.disposed = true;
    if (this.afterDrawTimer) clearTimeout(this.afterDrawTimer);
    for (const entry of this.chunkMeshes.values()) this.disposeChunkGroup(entry);
    this.chunkMeshes.clear();
    this.atlas.texture.dispose();
    this.opaqueMat.dispose();
    this.cutoutMat.dispose();
    this.translucentMat.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
