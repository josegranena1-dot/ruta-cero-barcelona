import * as THREE from "three";

const view = document.querySelector("#game");
const loading = document.querySelector("#loading");
const errorMessage = document.querySelector("#error-message");
const ui = {
  startScreen: document.querySelector("#start-screen"),
  startButton: document.querySelector("#start-button"),
  speed: document.querySelector("#speed"),
  speedFill: document.querySelector("#speed-fill"),
  gear: document.querySelector("#gear"),
  timer: document.querySelector("#timer"),
  timerLabel: document.querySelector(".timer-row strong"),
  progressFill: document.querySelector("#progress-fill"),
  progressText: document.querySelector("#progress-text"),
  objectiveName: document.querySelector("#objective-name"),
  objectiveDistance: document.querySelector("#objective-distance"),
  missionTitle: document.querySelector("#mission-title"),
  missionCopy: document.querySelector("#mission-copy"),
  missionEyebrow: document.querySelector(".eyebrow"),
  toast: document.querySelector("#toast"),
  sound: document.querySelector("#sound-toggle"),
  musicPanel: document.querySelector("#music-panel"),
  musicFile: document.querySelector("#music-file"),
  localPlayer: document.querySelector("#local-player"),
  musicPause: document.querySelector("#music-pause"),
  musicNext: document.querySelector("#music-next"),
  minimap: document.querySelector("#minimap"),
  district: document.querySelector("#district"),
  vehicleName: document.querySelector("#vehicle-name"),
  controlLabels: document.querySelectorAll(".bottom-left .control-label"),
  touchExit: document.querySelector("#touch-exit"),
};

const scene = new THREE.Scene();
scene.background = new THREE.Color("#b8aaa0");
scene.fog = new THREE.Fog("#b8aaa0", 250, 1050);

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1600);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.domElement.id = "world";
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
view.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight("#d8dfe0", "#343b38", 1.55));
const sun = new THREE.DirectionalLight("#ffe0ab", 3.2);
sun.position.set(-80, 120, 45);
sun.castShadow = true;
sun.shadow.mapSize.set(768, 768);
sun.shadow.camera.left = -95;
sun.shadow.camera.right = 95;
sun.shadow.camera.top = 95;
sun.shadow.camera.bottom = -95;
scene.add(sun);

let seed = 3917;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const cityGridRadius = 6;
const roadSpacing = 34;
const cityEdge = cityGridRadius * roadSpacing + 9;

function noiseTexture(base, speckle, density = 14000) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  context.fillStyle = base;
  context.fillRect(0, 0, 256, 256);
  for (let index = 0; index < density; index++) {
    context.globalAlpha = 0.15 + random() * 0.22;
    context.fillStyle = speckle;
    const size = random() > 0.92 ? 2 : 1;
    context.fillRect(random() * 256, random() * 256, size, size);
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const mats = {
  asphalt: new THREE.MeshStandardMaterial({ color: "#a09c91", map: noiseTexture("#444741", "#bbb5a5"), roughness: 0.96 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: "#aaa392", map: noiseTexture("#999587", "#e3d9c4", 9000), roughness: 1 }),
  ground: new THREE.MeshStandardMaterial({ color: "#999184", map: noiseTexture("#716f68", "#b4a58f", 7000), roughness: 1 }),
  sand: new THREE.MeshStandardMaterial({ color: "#c8b28c", map: noiseTexture("#c6ad83", "#ead5ac", 8000), roughness: 1 }),
  water: new THREE.MeshStandardMaterial({ color: "#286c75", roughness: 0.29, metalness: 0.12 }),
  dock: new THREE.MeshStandardMaterial({ color: "#79604a", roughness: 0.92 }),
  concrete: ["#b7a58d", "#b5b1a4", "#c2ad91", "#928e83", "#b59d8d"].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.82 })),
  terracotta: new THREE.MeshStandardMaterial({ color: "#ad6046", roughness: 0.78 }),
  glass: ["#526c6d", "#85918a", "#465f5f"].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.15 })),
  white: new THREE.MeshStandardMaterial({ color: "#eee8d7", roughness: 0.55 }),
  yellow: new THREE.MeshStandardMaterial({ color: "#e7be5b", roughness: 0.7 }),
  stripe: new THREE.MeshStandardMaterial({ color: "#eee8d8", roughness: 1 }),
};

function box(parent, width, height, depth, material, x, y, z, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const landDepth = 600 + cityEdge;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, landDepth), mats.ground);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.13;
ground.position.z = (cityEdge - 600) / 2;
ground.receiveShadow = true;
scene.add(ground);

const beach = new THREE.Mesh(new THREE.PlaneGeometry(1000, 27), mats.sand);
beach.rotation.x = -Math.PI / 2;
beach.position.set(0, -0.02, cityEdge - 1.5);
beach.receiveShadow = true;
scene.add(beach);

const waterGeometry = new THREE.PlaneGeometry(1400, 1400, 32, 32);
waterGeometry.rotateX(-Math.PI / 2);
const waterPositions = waterGeometry.attributes.position;
const waterBaseHeights = new Float32Array(waterPositions.count);
for (let vertex = 0; vertex < waterPositions.count; vertex++) waterBaseHeights[vertex] = waterPositions.getY(vertex);
const water = new THREE.Mesh(waterGeometry, mats.water);
water.position.set(0, -0.24, cityEdge + 700);
water.receiveShadow = true;
scene.add(water);

const roads = new THREE.Group();
scene.add(roads);
const dashesPerRoad = Math.floor((cityEdge * 2) / 10) + 1;
const roadDashCount = (cityGridRadius * 2 + 1) * dashesPerRoad;
const roadDashesAlongX = new THREE.InstancedMesh(new THREE.BoxGeometry(5.1, 0.025, 0.12), mats.yellow, roadDashCount);
const roadDashesAlongZ = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.025, 5.1), mats.yellow, roadDashCount);
const dashTransform = new THREE.Object3D();
let dashIndex = 0;
for (let axis = -cityGridRadius; axis <= cityGridRadius; axis++) {
  const center = axis * roadSpacing;
  const roadX = new THREE.Mesh(new THREE.PlaneGeometry(cityEdge * 2, 18), mats.asphalt);
  roadX.rotation.x = -Math.PI / 2;
  roadX.position.set(0, -0.08, center);
  roads.add(roadX);
  const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(18, cityEdge * 2), mats.asphalt);
  roadZ.rotation.x = -Math.PI / 2;
  roadZ.position.set(center, -0.075, 0);
  roads.add(roadZ);
  for (let offset = -cityEdge; offset <= cityEdge; offset += 10) {
    dashTransform.position.set(offset, 0.005, center);
    dashTransform.updateMatrix();
    roadDashesAlongX.setMatrixAt(dashIndex, dashTransform.matrix);
    dashTransform.position.set(center, 0.005, offset);
    dashTransform.updateMatrix();
    roadDashesAlongZ.setMatrixAt(dashIndex, dashTransform.matrix);
    dashIndex++;
  }
}
for (const dashes of [roadDashesAlongX, roadDashesAlongZ]) {
  dashes.instanceMatrix.needsUpdate = true;
  dashes.castShadow = false;
  dashes.receiveShadow = false;
  dashes.computeBoundingSphere();
}
roads.add(roadDashesAlongX, roadDashesAlongZ);

const zebraGeometry = new THREE.BoxGeometry(14.5, 0.025, 0.42);
const zebraSideGeometry = new THREE.BoxGeometry(0.42, 0.025, 14.5);
const crossingCount = (cityGridRadius * 2 + 1) ** 2 * 2 * 5;
const zebraAlongX = new THREE.InstancedMesh(zebraGeometry, mats.stripe, crossingCount);
const zebraAlongZ = new THREE.InstancedMesh(zebraSideGeometry, mats.stripe, crossingCount);
const stripeTransform = new THREE.Object3D();
let stripeIndex = 0;
for (let gridX = -cityGridRadius; gridX <= cityGridRadius; gridX++) {
  for (let gridZ = -cityGridRadius; gridZ <= cityGridRadius; gridZ++) {
    const intersectionX = gridX * roadSpacing;
    const intersectionZ = gridZ * roadSpacing;
    for (const side of [-1, 1]) {
      for (let stripe = -2; stripe <= 2; stripe++) {
        stripeTransform.position.set(intersectionX, 0.015, intersectionZ + side * 10 + stripe * 0.78);
        stripeTransform.updateMatrix();
        zebraAlongX.setMatrixAt(stripeIndex, stripeTransform.matrix);
        stripeTransform.position.set(intersectionX + side * 10 + stripe * 0.78, 0.015, intersectionZ);
        stripeTransform.updateMatrix();
        zebraAlongZ.setMatrixAt(stripeIndex, stripeTransform.matrix);
        stripeIndex++;
      }
    }
  }
}
roads.add(zebraAlongX, zebraAlongZ);

const city = new THREE.Group();
scene.add(city);

function chamferedFootprint(width, depth) {
  const cut = Math.min(2.3, width * 0.18, depth * 0.18);
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2 + cut, -depth / 2);
  shape.lineTo(width / 2 - cut, -depth / 2);
  shape.lineTo(width / 2, -depth / 2 + cut);
  shape.lineTo(width / 2, depth / 2 - cut);
  shape.lineTo(width / 2 - cut, depth / 2);
  shape.lineTo(-width / 2 + cut, depth / 2);
  shape.lineTo(-width / 2, depth / 2 - cut);
  shape.lineTo(-width / 2, -depth / 2 + cut);
  shape.closePath();
  return shape;
}

function chamferedPrism(width, depth, height, material) {
  const geometry = new THREE.ExtrudeGeometry(chamferedFootprint(width, depth), { depth: height, bevelEnabled: false, steps: 1 });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function facadeTexture(baseColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 384;
  const context = canvas.getContext("2d");
  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < 10; row++) {
    const top = 18 + row * 36;
    context.fillStyle = "rgb(27 34 32 / 32%)";
    context.fillRect(0, top + 26, canvas.width, 3);
    for (let column = 0; column < 4; column++) {
      const x = 17 + column * 44;
      context.fillStyle = random() > 0.73 ? "#e4bd7b" : "#526469";
      context.fillRect(x, top, 26, 21);
      context.fillStyle = "rgb(240 225 191 / 32%)";
      context.fillRect(x + 2, top + 2, 1, 17);
      context.fillRect(x + 2, top + 18, 22, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cityReflectionMap() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const sky = context.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, "#526673");
  sky.addColorStop(0.48, "#c5a88e");
  sky.addColorStop(0.62, "#e7b883");
  sky.addColorStop(1, "#303b3b");
  context.fillStyle = sky;
  context.fillRect(0, 0, 512, 256);
  const sunGlow = context.createRadialGradient(350, 142, 2, 350, 142, 78);
  sunGlow.addColorStop(0, "rgb(255 218 158 / 90%)");
  sunGlow.addColorStop(0.14, "rgb(255 207 145 / 38%)");
  sunGlow.addColorStop(1, "rgb(255 207 145 / 0%)");
  context.fillStyle = sunGlow;
  context.fillRect(260, 52, 180, 180);
  context.fillStyle = "#25302f";
  let x = 0;
  while (x < 512) {
    const width = 13 + random() * 28;
    const height = 20 + random() * 68;
    context.fillRect(x, 204 - height, width, height + 52);
    x += width + 3;
  }
  context.fillStyle = "rgb(246 204 139 / 75%)";
  for (let windowIndex = 0; windowIndex < 130; windowIndex++) {
    const wx = random() * 512;
    const wy = 150 + random() * 47;
    context.fillRect(wx, wy, 2, 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

scene.environment = cityReflectionMap();
scene.environmentIntensity = 0.58;

const maxBuildings = (cityGridRadius * 2) ** 2;
const facadeColors = ["#b5a18a", "#b4b0a2", "#a58d7b", "#c2ad91", "#999286"];
const neutralInstanceMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.82 });
const unitBuildingGeometry = new THREE.ExtrudeGeometry(chamferedFootprint(1, 1), { depth: 1, bevelEnabled: false, steps: 1 });
unitBuildingGeometry.rotateX(-Math.PI / 2);
const buildingBodies = new THREE.InstancedMesh(unitBuildingGeometry, neutralInstanceMaterial, maxBuildings);
const buildingRoofs = new THREE.InstancedMesh(unitBuildingGeometry, mats.sidewalk, maxBuildings);
const facadeMaterial = new THREE.MeshStandardMaterial({ map: facadeTexture("#ffffff"), roughness: 0.72, metalness: 0.04, side: THREE.DoubleSide });
const facadeBatch = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), facadeMaterial, maxBuildings * 4);
const balconyCapacity = maxBuildings * Math.ceil((Math.floor(37 / 3.5) - 1) / 2) * 4;
const balconyBatch = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.sidewalk, balconyCapacity);
const awningBatch = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.terracotta, maxBuildings);
const buildingTransform = new THREE.Object3D();
let buildingIndex = 0;
let facadeIndex = 0;
let balconyIndex = 0;
let awningIndex = 0;
city.add(buildingBodies, buildingRoofs, facadeBatch, balconyBatch, awningBatch);

for (let gridX = -cityGridRadius; gridX < cityGridRadius; gridX++) {
  for (let gridZ = -cityGridRadius; gridZ < cityGridRadius; gridZ++) {
    if (gridX === -1 && gridZ === 4) continue;
    const cx = gridX * roadSpacing + roadSpacing / 2;
    const cz = gridZ * roadSpacing + roadSpacing / 2;
    if (random() < 0.18) {
      const tree = new THREE.Group();
      tree.position.set(cx + (random() - 0.5) * 6, 0, cz + (random() - 0.5) * 6);
      box(tree, 0.5, 3.1, 0.5, new THREE.MeshStandardMaterial({ color: "#5c4936" }), 0, 1.5, 0);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), new THREE.MeshStandardMaterial({ color: random() > 0.5 ? "#52664a" : "#68754c", roughness: 1 }));
      crown.position.y = 4;
      crown.castShadow = true;
      tree.add(crown);
      city.add(tree);
      continue;
    }
    const width = 8 + random() * 11;
    const depth = 8 + random() * 11;
    const height = 12 + random() * 25;
    const buildingX = cx + (random() - 0.5) * 6;
    const buildingZ = cz + (random() - 0.5) * 6;
    const bodyMat = mats.concrete[Math.floor(random() * mats.concrete.length)];
    buildingTransform.position.set(buildingX, 0, buildingZ);
    buildingTransform.rotation.set(0, 0, 0);
    buildingTransform.scale.set(width, height, depth);
    buildingTransform.updateMatrix();
    buildingBodies.setMatrixAt(buildingIndex, buildingTransform.matrix);
    buildingBodies.setColorAt(buildingIndex, bodyMat.color);
    buildingTransform.position.y = height;
    buildingTransform.scale.set(width + 0.65, 0.48, depth + 0.65);
    buildingTransform.updateMatrix();
    buildingRoofs.setMatrixAt(buildingIndex, buildingTransform.matrix);
    buildingIndex++;
    const facadeColor = new THREE.Color(facadeColors[Math.floor(random() * facadeColors.length)]);
    buildingTransform.position.set(buildingX, height * 0.51, buildingZ + depth / 2 + 0.07);
    buildingTransform.rotation.set(0, 0, 0);
    buildingTransform.scale.set(width * 0.78, height * 0.84, 1);
    buildingTransform.updateMatrix();
    facadeBatch.setMatrixAt(facadeIndex, buildingTransform.matrix);
    facadeBatch.setColorAt(facadeIndex++, facadeColor);
    buildingTransform.position.z = buildingZ - depth / 2 - 0.07;
    buildingTransform.rotation.y = Math.PI;
    buildingTransform.updateMatrix();
    facadeBatch.setMatrixAt(facadeIndex, buildingTransform.matrix);
    facadeBatch.setColorAt(facadeIndex++, facadeColor);
    for (const side of [-1, 1]) {
      buildingTransform.position.set(buildingX + side * (width / 2 + 0.07), height * 0.51, buildingZ);
      buildingTransform.rotation.y = side * Math.PI / 2;
      buildingTransform.scale.set(depth * 0.78, height * 0.84, 1);
      buildingTransform.updateMatrix();
      facadeBatch.setMatrixAt(facadeIndex, buildingTransform.matrix);
      facadeBatch.setColorAt(facadeIndex++, facadeColor);
    }
    const floors = Math.floor(height / 3.5);
    buildingTransform.rotation.set(0, 0, 0);
    for (let floor = 1; floor < floors; floor += 2) {
      const balconyY = 2.5 + floor * 3.5;
      for (const side of [-1, 1]) {
        buildingTransform.position.set(buildingX, balconyY, buildingZ + side * (depth / 2 + 0.16));
        buildingTransform.scale.set(width * 0.68, 0.08, 0.28);
        buildingTransform.updateMatrix();
        balconyBatch.setMatrixAt(balconyIndex++, buildingTransform.matrix);
        buildingTransform.position.set(buildingX + side * (width / 2 + 0.16), balconyY, buildingZ);
        buildingTransform.scale.set(0.28, 0.08, depth * 0.68);
        buildingTransform.updateMatrix();
        balconyBatch.setMatrixAt(balconyIndex++, buildingTransform.matrix);
      }
    }
    buildingTransform.rotation.set(0, 0, 0);
    buildingTransform.position.set(buildingX, 3.2, buildingZ + depth / 2 + 0.3);
    buildingTransform.scale.set(width * 0.68, 0.12, 0.58);
    buildingTransform.updateMatrix();
    awningBatch.setMatrixAt(awningIndex++, buildingTransform.matrix);
  }
}

buildingBodies.count = buildingIndex;
buildingRoofs.count = buildingIndex;
facadeBatch.count = facadeIndex;
balconyBatch.count = balconyIndex;
awningBatch.count = awningIndex;
for (const batch of [buildingBodies, buildingRoofs, facadeBatch, balconyBatch, awningBatch]) {
  batch.instanceMatrix.needsUpdate = true;
  if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
  batch.computeBoundingSphere();
}


// EXTENSIÓN DEL MAPA: corredor árido y zona desértica al norte de la ciudad.
const desert = new THREE.Group();
scene.add(desert);

const desertSand = new THREE.MeshStandardMaterial({
  color: "#b98d5d",
  map: noiseTexture("#a97d4f", "#d2ae79", 11000),
  roughness: 1
});
const desertRock = new THREE.MeshStandardMaterial({ color: "#665348", roughness: 1 });
const dryGrass = new THREE.MeshStandardMaterial({ color: "#827044", roughness: 1 });

const desertFloor = new THREE.Mesh(new THREE.PlaneGeometry(1000, 360), desertSand);
desertFloor.rotation.x = -Math.PI / 2;
desertFloor.position.set(0, -0.045, -390);
desertFloor.receiveShadow = true;
desert.add(desertFloor);

// Dunas con perfiles suaves para romper el terreno plano.
for (let i = 0; i < 28; i++) {
  const dune = new THREE.Mesh(
    new THREE.SphereGeometry(1, 18, 10),
    desertSand
  );
  const side = (random() - 0.5) * 2;
  dune.position.set(
    side * (150 + random() * 260),
    -0.15 + random() * 0.18,
    -270 - random() * 235
  );
  dune.scale.set(22 + random() * 42, 2.4 + random() * 4.8, 14 + random() * 34);
  dune.rotation.y = random() * Math.PI;
  dune.receiveShadow = true;
  desert.add(dune);
}

// Formaciones rocosas y pequeñas montañas en el horizonte.
for (let i = 0; i < 34; i++) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1, 1),
    desertRock
  );
  rock.position.set(
    (random() - 0.5) * 820,
    2 + random() * 5,
    -300 - random() * 285
  );
  const scale = 2.5 + random() * 8;
  rock.scale.set(scale * (0.8 + random() * 0.6), scale * (1.0 + random() * 1.8), scale * (0.7 + random() * 0.8));
  rock.rotation.set(random() * .4, random() * Math.PI, random() * .3);
  rock.castShadow = true;
  rock.receiveShadow = true;
  desert.add(rock);
}

// Silueta montañosa lejana.
for (let i = 0; i < 12; i++) {
  const mountain = new THREE.Mesh(
    new THREE.ConeGeometry(32 + random() * 34, 70 + random() * 75, 7),
    new THREE.MeshStandardMaterial({ color: "#5b5149", roughness: 1 })
  );
  mountain.position.set(-420 + i * 75 + random() * 28, 25 + random() * 12, -555 + random() * 20);
  mountain.scale.z = 0.72 + random() * 0.45;
  mountain.rotation.y = random() * Math.PI;
  mountain.castShadow = true;
  desert.add(mountain);
}

// Carretera rápida que conecta Barcelona con el desierto.
const desertRoad = new THREE.Mesh(new THREE.PlaneGeometry(12, 390), mats.asphalt);
desertRoad.rotation.x = -Math.PI / 2;
desertRoad.position.set(0, -0.035, -335);
desertRoad.receiveShadow = true;
desert.add(desertRoad);

for (let z = -145; z > -525; z -= 10) {
  box(desert, 0.22, 0.025, 5.2, mats.yellow, -5.7, 0.008, z, false);
  box(desert, 0.22, 0.025, 5.2, mats.yellow, 5.7, 0.008, z, false);
  box(desert, 0.16, 0.025, 5.0, mats.stripe, 0, 0.01, z, false);
}

// Postes de carretera y vegetación seca.
for (let i = 0; i < 42; i++) {
  const z = -155 - i * 8.5;
  for (const side of [-1, 1]) {
    const x = side * (9 + random() * 10);
    box(desert, 0.08, 1.05, 0.08, desertRock, x, 0.52, z, false);
    box(desert, 0.55, 0.06, 0.08, mats.white, x, 0.93, z, false);
  }
  if (i % 2 === 0) {
    const plant = new THREE.Group();
    plant.position.set((random() - .5) * 70, 0, z + random() * 5);
    box(plant, .09, .75, .09, dryGrass, 0, .37, 0, false);
    box(plant, .65, .07, .07, dryGrass, 0, .58, 0, false);
    box(plant, .42, .06, .07, dryGrass, -.1, .4, 0, false);
    desert.add(plant);
  }
}

// Mirador/estación de servicio estilizada en el límite del bioma.
const desertTrim = new THREE.MeshStandardMaterial({ color: "#172221", metalness: 0.55, roughness: 0.28 });
const desertStation = new THREE.Group();
desertStation.position.set(26, 0, -238);
box(desertStation, 16, .35, 11, mats.concrete[2], 0, .18, 0);
box(desertStation, 13, 3.8, 8, mats.concrete[0], 0, 2.1, 0);
box(desertStation, 14.5, .35, 9.5, mats.terracotta, 0, 4.2, 0);
box(desertStation, 8, 2.1, .08, mats.glass[0], 0, 2.35, -4.05, false);
for (const x of [-4.4, 4.4]) box(desertStation, .18, 4.2, .18, desertTrim, x, 2.2, 0, false);
desert.add(desertStation);

const landmarks = new THREE.Group();
scene.add(landmarks);
function createSagradaFamilia() {
  const basilica = new THREE.Group();
  basilica.position.set(-17, 0, 153);
  const stone = new THREE.MeshStandardMaterial({ color: "#c2a982", roughness: 0.8 });
  const carvedStone = new THREE.MeshStandardMaterial({ color: "#9d825e", roughness: 0.86 });
  const stainedGlass = new THREE.MeshStandardMaterial({ color: "#377f83", emissive: "#1e4d52", emissiveIntensity: 0.55, roughness: 0.28 });
  box(basilica, 29, 1.4, 23, mats.sand, 0, 0.7, 0);
  box(basilica, 25, 14, 19, stone, 0, 8, 0);
  box(basilica, 27, 1.4, 21, carvedStone, 0, 15.1, 0);
  box(basilica, 18, 2.2, 15, stone, 0, 16.7, 1);
  const roseWindow = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.18, 10, 32), carvedStone);
  roseWindow.position.set(0, 10, -9.62);
  roseWindow.rotation.y = Math.PI;
  basilica.add(roseWindow);
  const windowGlass = new THREE.Mesh(new THREE.CircleGeometry(1.28, 24), stainedGlass);
  windowGlass.position.set(0, 10, -9.58);
  windowGlass.rotation.y = Math.PI;
  basilica.add(windowGlass);
  for (const x of [-5.4, -2.7, 2.7, 5.4]) {
    box(basilica, 0.48, 6.8, 0.45, carvedStone, x, 4.8, -9.83);
  }
  function spire(x, z, height, radius) {
    const shaftHeight = height * 0.72;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.68, radius, shaftHeight, 12, 5), stone);
    shaft.position.set(x, 17.4 + shaftHeight / 2, z);
    shaft.castShadow = true;
    basilica.add(shaft);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.78, height * 0.28, 12, 2), carvedStone);
    crown.position.set(x, 17.4 + shaftHeight + height * 0.14, z);
    crown.castShadow = true;
    basilica.add(crown);
    const crossStem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.3, 8), carvedStone);
    crossStem.position.set(x, 17.4 + height + 0.5, z);
    basilica.add(crossStem);
    box(basilica, 0.68, 0.1, 0.1, carvedStone, x, 17.4 + height + 0.66, z, false);
    for (let level = 1; level <= 3; level++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(radius * (0.78 - level * 0.1), radius * (0.82 - level * 0.1), 0.22, 12), carvedStone);
      band.position.set(x, 17.4 + level * shaftHeight / 4, z);
      basilica.add(band);
    }
  }
  [-8, -2.8, 2.8, 8].forEach((x, index) => spire(x, -7.5, 26 + (index % 2) * 3, 1.65));
  [-7, -2.5, 2.5, 7].forEach((x, index) => spire(x, 6.5, 34 + (index % 2) * 4, 1.8));
  spire(-1.3, 0, 46, 2.2);
  spire(1.3, 0, 43, 2.0);
  const plaqueCanvas = document.createElement("canvas");
  plaqueCanvas.width = 512;
  plaqueCanvas.height = 96;
  const plaqueContext = plaqueCanvas.getContext("2d");
  plaqueContext.fillStyle = "#e9dfc7";
  plaqueContext.fillRect(0, 0, 512, 96);
  plaqueContext.fillStyle = "#38594e";
  plaqueContext.font = "600 38px sans-serif";
  plaqueContext.textAlign = "center";
  plaqueContext.textBaseline = "middle";
  plaqueContext.fillText("SAGRADA FAMÍLIA", 256, 48);
  const plaqueTexture = new THREE.CanvasTexture(plaqueCanvas);
  plaqueTexture.colorSpace = THREE.SRGBColorSpace;
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.5), new THREE.MeshStandardMaterial({ map: plaqueTexture, side: THREE.DoubleSide }));
  plaque.position.set(0, 1.8, -10);
  plaque.rotation.y = Math.PI;
  basilica.add(plaque);
  landmarks.add(basilica);
}

function createLibertyIsland() {
  const island = new THREE.Group();
  island.position.set(-70, 0, cityEdge + 230);
  const stone = new THREE.MeshStandardMaterial({ color: "#849b86", roughness: 0.78, metalness: 0.08 });
  const pedestal = new THREE.MeshStandardMaterial({ color: "#91836e", roughness: 0.9 });
  const flame = new THREE.MeshStandardMaterial({ color: "#f5c665", emissive: "#f07d32", emissiveIntensity: 1.2, roughness: 0.3 });
  const islandBase = new THREE.Mesh(new THREE.CylinderGeometry(18, 21, 1.6, 48), mats.sand);
  islandBase.position.y = 0;
  islandBase.receiveShadow = true;
  island.add(islandBase);
  const terrace = new THREE.Mesh(new THREE.CylinderGeometry(12, 13, 4.5, 12), pedestal);
  terrace.position.y = 3;
  island.add(terrace);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(5, 8, 10, 8), pedestal);
  tower.position.y = 10;
  island.add(tower);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5, 1.4, 8), pedestal);
  cap.position.y = 15.5;
  island.add(cap);
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 3.4, 8, 12), stone);
  robe.position.y = 20.2;
  island.add(robe);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.9, 5.3, 12), stone);
  torso.position.y = 26.4;
  island.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), stone);
  head.position.set(0, 29.7, 0);
  island.add(head);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.58, 8), stone);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 29.55, -0.92);
  island.add(nose);
  for (let spike = 0; spike < 7; spike++) {
    const angle = (spike / 7) * Math.PI * 2;
    const crownRay = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 1.5, 6), stone);
    crownRay.position.set(Math.cos(angle) * 0.85, 30.5, Math.sin(angle) * 0.85);
    crownRay.rotation.z = Math.cos(angle) * -0.35;
    crownRay.rotation.x = Math.sin(angle) * 0.35;
    island.add(crownRay);
  }
  function segment(start, end, radius) {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.75, radius, from.distanceTo(to), 10), stone);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
    mesh.castShadow = true;
    island.add(mesh);
  }
  segment([1, 27.5, 0], [3.6, 29.8, 0], 0.52);
  segment([3.6, 29.8, 0], [4.3, 33.2, 0], 0.4);
  segment([-1, 27.5, 0], [-3.5, 25.8, -0.1], 0.5);
  segment([-3.5, 25.8, -0.1], [-4.1, 23.6, -0.1], 0.38);
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.1, 0.48), stone);
  tablet.position.set(-4.15, 22.6, -0.1);
  island.add(tablet);
  const torchHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 2.3, 10), pedestal);
  torchHandle.position.set(4.3, 34.1, 0);
  island.add(torchHandle);
  const torchBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.28, 0.75, 12), pedestal);
  torchBowl.position.set(4.3, 35.55, 0);
  island.add(torchBowl);
  const torchFlame = new THREE.Mesh(new THREE.SphereGeometry(0.54, 12, 10), flame);
  torchFlame.position.set(4.3, 36.35, 0);
  torchFlame.scale.set(0.7, 1.45, 0.7);
  island.add(torchFlame);
  landmarks.add(island);
  return island;
}

createSagradaFamilia();
const libertyIsland = createLibertyIsland();

const streetFurniture = new THREE.Group();
scene.add(streetFurniture);
const lampMetal = new THREE.MeshStandardMaterial({ color: "#333a37", metalness: 0.65, roughness: 0.42 });
const lampGlow = new THREE.MeshStandardMaterial({ color: "#f2d39a", emissive: "#e5a74e", emissiveIntensity: 1.1, roughness: 0.34 });
for (let gridX = -cityGridRadius + 1; gridX < cityGridRadius; gridX += 2) {
  for (let gridZ = -cityGridRadius + 1; gridZ < cityGridRadius; gridZ += 2) {
    const x = gridX * roadSpacing + 9.5;
    const z = gridZ * roadSpacing + 9.5;
    box(streetFurniture, 0.14, 5.8, 0.14, lampMetal, x, 2.9, z);
    box(streetFurniture, 1.35, 0.12, 0.14, lampMetal, x + 0.55, 5.65, z);
    box(streetFurniture, 0.36, 0.13, 0.42, lampGlow, x + 1.08, 5.58, z, false);
  }
}

function addStreetSign(label, x, z, rotation) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.fillStyle = "#e8dfca";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#36594f";
  context.lineWidth = 8;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = "#294b42";
  context.font = "500 33px 'DM Mono', monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, canvas.width / 2, canvas.height / 2, canvas.width - 28);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.75, side: THREE.DoubleSide });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.55), material);
  sign.position.set(x, 3.55, z);
  sign.rotation.y = rotation;
  streetFurniture.add(sign);
}

addStreetSign("CARRER DE MALLORCA", 9.5, 9.5, Math.PI);
addStreetSign("PASSEIG DE GRÀCIA", 43.5, 9.5, Math.PI);
addStreetSign("CARRER DE SARDENYA", 9.5, 43.5, -Math.PI / 2);

const pier = new THREE.Group();
scene.add(pier);
const pierStart = cityEdge + 8;
box(pier, 6.2, 0.34, 34, mats.dock, 0, 0.14, pierStart + 9);
for (const x of [-2.7, 2.7]) {
  for (const z of [pierStart - 4, pierStart + 8, pierStart + 20]) {
    box(pier, 0.42, 1.1, 0.42, mats.dock, x, -0.35, z);
  }
}
for (let plank = -15; plank <= 15; plank += 2.1) {
  box(pier, 6.1, 0.025, 0.08, mats.sidewalk, 0, 0.32, pierStart + 9 + plank, false);
}

const boat = new THREE.Group();
const boatHullMaterial = new THREE.MeshStandardMaterial({ color: "#243e45", metalness: 0.36, roughness: 0.3 });
const boatDeckMaterial = new THREE.MeshStandardMaterial({ color: "#e3ddca", metalness: 0.16, roughness: 0.48 });
const boatGlassMaterial = new THREE.MeshPhysicalMaterial({ color: "#30555b", metalness: 0.25, roughness: 0.13, transparent: true, opacity: 0.86, side: THREE.DoubleSide });
const boatMetalMaterial = new THREE.MeshStandardMaterial({ color: "#bec8c3", metalness: 0.88, roughness: 0.2 });
const boatHull = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), boatHullMaterial);
boatHull.scale.set(1.45, 0.38, 4.35);
boatHull.position.y = -0.04;
boat.add(boatHull);
box(boat, 2.65, 0.17, 5.9, boatDeckMaterial, 0, 0.24, 0.18);
box(boat, 1.92, 1.34, 2.2, boatDeckMaterial, 0, 0.9, 0.1);
box(boat, 1.7, 0.68, 0.12, boatGlassMaterial, 0, 1.47, -1.03, false);
box(boat, 1.28, 0.22, 0.95, boatHullMaterial, 0, 1.72, 0.15);
box(boat, 1.9, 0.16, 1.5, boatDeckMaterial, 0, 0.84, 2.1);
box(boat, 0.18, 0.12, 0.25, mats.terracotta, -1.18, 0.44, -3.4, false);
box(boat, 0.18, 0.12, 0.25, mats.white, 1.18, 0.44, -3.4, false);
const bow = new THREE.Mesh(new THREE.ConeGeometry(1.38, 1.65, 16), boatHullMaterial);
bow.rotation.x = -Math.PI / 2;
bow.position.set(0, -0.02, -3.75);
boat.add(bow);
for (const side of [-1, 1]) {
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 5.2, 6), boatMetalMaterial);
  rail.rotation.x = Math.PI / 2;
  rail.position.set(side * 1.24, 0.6, 0);
  boat.add(rail);
  for (const z of [-1.9, 2.2]) box(boat, 0.08, 0.56, 0.08, boatMetalMaterial, side * 1.24, 0.55, z, false);
}
boat.position.set(0, 0.26, cityEdge + 27);
boat.rotation.y = Math.PI;
scene.add(boat);
const boatWake = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.045, 4, 32), new THREE.MeshBasicMaterial({ color: "#d2e0d8", transparent: true, opacity: 0.46 }));
boatWake.rotation.x = Math.PI / 2;
boatWake.position.set(0, -0.06, 4.6);
boat.add(boatWake);

const traffic = [];
const trafficPaints = ["#56706b", "#d5d0c1", "#bd873d", "#536273", "#e3dfd2"].map((color) => new THREE.MeshStandardMaterial({ color, metalness: 0.28, roughness: 0.4 }));
const trafficGlass = new THREE.MeshStandardMaterial({ color: "#56696a", metalness: 0.1, roughness: 0.24 });
const tireMat = new THREE.MeshStandardMaterial({ color: "#242827", roughness: 0.93 });
const taillight = new THREE.MeshStandardMaterial({ color: "#bd312a", emissive: "#6a0e09", emissiveIntensity: 0.4 });
function makeTrafficCar(paint) {
  const car = new THREE.Group();
  box(car, 1.9, 0.68, 3.9, paint, 0, 0.82, 0);
  box(car, 1.58, 0.65, 1.8, trafficGlass, 0, 1.46, -0.28, false);
  box(car, 0.42, 0.15, 0.13, mats.white, -0.62, 0.77, -1.97, false);
  box(car, 0.42, 0.15, 0.13, taillight, 0.62, 0.77, 1.97, false);
  for (const wheelX of [-0.95, 0.95]) {
    for (const wheelZ of [-1.25, 1.25]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.23, 12), tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wheelX, 0.38, wheelZ);
      wheel.castShadow = true;
      car.add(wheel);
    }
  }
  return car;
}

for (let index = 0; index < 20; index++) {
  const alongZ = index % 2 === 0;
  const direction = random() > 0.5 ? 1 : -1;
  const lane = random() > 0.5 ? 4.2 : -4.2;
  const road = (Math.floor(random() * (cityGridRadius * 2 - 1)) - (cityGridRadius - 1)) * roadSpacing;
  const car = makeTrafficCar(trafficPaints[index % trafficPaints.length]);
  car.position.set(alongZ ? road + lane : (random() - 0.5) * cityEdge * 1.8, 0, alongZ ? (random() - 0.5) * cityEdge * 1.8 : road + lane);
  car.rotation.y = alongZ ? (direction > 0 ? Math.PI : 0) : (direction > 0 ? -Math.PI / 2 : Math.PI / 2);
  scene.add(car);
  traffic.push({ car, dx: alongZ ? 0 : direction, dz: alongZ ? direction : 0, speed: 7 + random() * 5, lastHit: 0 });
}

const pedestrians = [];
const skinMaterial = new THREE.MeshStandardMaterial({ color: "#b98365", roughness: 0.88 });
const hairMaterials = ["#211d1a", "#4a342a", "#777268", "#292626"].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.94 }));
const trouserMaterials = ["#343a3a", "#4b514e", "#292e34", "#625e54"].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
const shoeMaterial = new THREE.MeshStandardMaterial({ color: "#252827", roughness: 0.72 });
const jacketDetailMaterial = new THREE.MeshStandardMaterial({ color: "#303a37", metalness: 0.12, roughness: 0.72 });
const torsoGeometry = new THREE.CapsuleGeometry(0.24, 0.42, 5, 10);
const headGeometry = new THREE.SphereGeometry(0.14, 14, 10);
const legGeometry = new THREE.CapsuleGeometry(0.085, 0.38, 4, 8);
const lowerLegGeometry = new THREE.CapsuleGeometry(0.07, 0.25, 4, 8);
const armGeometry = new THREE.CapsuleGeometry(0.073, 0.37, 4, 8);
const forearmGeometry = new THREE.CapsuleGeometry(0.06, 0.23, 4, 8);
const faceDetailGeometry = new THREE.SphereGeometry(0.025, 8, 6);

function createPedestrian(index) {
  const person = new THREE.Group();
  const coatColors = ["#52645f", "#8b5546", "#4b596b", "#b1a68f", "#444847", "#6c7553"];
  const coat = new THREE.MeshStandardMaterial({ color: coatColors[index % coatColors.length], roughness: 0.84 });
  const torso = new THREE.Mesh(torsoGeometry, coat);
  torso.position.y = 1.08;
  torso.castShadow = true;
  person.add(torso);
  box(person, 0.018, 0.42, 0.018, jacketDetailMaterial, 0, 1.08, -0.235, false);
  for (const side of [-1, 1]) {
    box(person, 0.09, 0.12, 0.018, jacketDetailMaterial, side * 0.13, 1.02, -0.23, false);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.12, 10), skinMaterial);
  neck.position.y = 1.48;
  person.add(neck);
  const head = new THREE.Mesh(headGeometry, skinMaterial);
  head.position.y = 1.64;
  head.scale.set(0.82, 1.08, 0.86);
  head.castShadow = true;
  person.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), skinMaterial);
  nose.position.set(0, 1.62, -0.126);
  nose.scale.set(0.72, 0.8, 1.25);
  person.add(nose);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), skinMaterial);
    ear.position.set(side * 0.112, 1.64, 0);
    ear.scale.set(0.55, 0.85, 0.68);
    person.add(ear);
  }
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMaterials[index % hairMaterials.length]);
  hair.position.set(0, 1.72, 0.005);
  person.add(hair);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(faceDetailGeometry, shoeMaterial);
    eye.position.set(side * 0.047, 1.66, -0.113);
    person.add(eye);
  }
  const legs = [];
  const arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.115, 0.77, 0);
    const trouser = new THREE.Mesh(legGeometry, trouserMaterials[index % trouserMaterials.length]);
    trouser.position.y = -0.24;
    trouser.castShadow = true;
    leg.add(trouser);
    const knee = new THREE.Group();
    knee.position.y = -0.37;
    const shin = new THREE.Mesh(lowerLegGeometry, trouserMaterials[index % trouserMaterials.length]);
    shin.position.y = -0.16;
    shin.castShadow = true;
    knee.add(shin);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.26), shoeMaterial);
    shoe.position.set(0, -0.35, -0.055);
    knee.add(shoe);
    leg.add(knee);
    leg.userData.knee = knee;
    person.add(leg);
    legs.push(leg);

    const arm = new THREE.Group();
    arm.position.set(side * 0.245, 1.31, 0);
    const sleeve = new THREE.Mesh(armGeometry, coat);
    sleeve.position.y = -0.22;
    sleeve.castShadow = true;
    arm.add(sleeve);
    const elbow = new THREE.Group();
    elbow.position.y = -0.39;
    const forearm = new THREE.Mesh(forearmGeometry, coat);
    forearm.position.y = -0.14;
    forearm.castShadow = true;
    elbow.add(forearm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), skinMaterial);
    hand.position.y = -0.29;
    elbow.add(hand);
    arm.add(elbow);
    arm.userData.elbow = elbow;
    person.add(arm);
    arms.push(arm);
  }
  person.traverse((object) => { if (object.isMesh) object.castShadow = true; });
  return { person, legs, arms, torso, head };
}

for (let index = 0; index < 32; index++) {
  const alongZ = index % 2 === 0;
  const direction = random() > 0.5 ? 1 : -1;
  const road = (Math.floor(random() * (cityGridRadius * 2 - 1)) - (cityGridRadius - 1)) * roadSpacing;
  const sidewalkSide = random() > 0.5 ? 1 : -1;
  const model = createPedestrian(index);
  model.person.position.set(alongZ ? road + sidewalkSide * 10 : (random() - 0.5) * cityEdge * 1.8, 0, alongZ ? (random() - 0.5) * cityEdge * 1.8 : road + sidewalkSide * 10);
  model.person.rotation.y = alongZ ? (direction > 0 ? Math.PI : 0) : (direction > 0 ? -Math.PI / 2 : Math.PI / 2);
  scene.add(model.person);
  pedestrians.push({ ...model, alongZ, direction, speed: 0.7 + random() * 0.45, phase: random() * Math.PI * 2, lastHit: 0 });
}

const player = new THREE.Group();
scene.add(player);
const carPaint = new THREE.MeshPhysicalMaterial({ color: "#116d75", metalness: 0.68, roughness: 0.23, clearcoat: 1, clearcoatRoughness: 0.12 });
const darkTrim = new THREE.MeshStandardMaterial({ color: "#172221", metalness: 0.55, roughness: 0.28 });
const glassMaterial = new THREE.MeshPhysicalMaterial({ color: "#1c353a", metalness: 0.28, roughness: 0.13, clearcoat: 1, transparent: true, opacity: 0.94, side: THREE.DoubleSide });
const alloy = new THREE.MeshStandardMaterial({ color: "#bec8c3", metalness: 0.88, roughness: 0.2 });
const headlamp = new THREE.MeshStandardMaterial({ color: "#f3ead2", emissive: "#b7d2d0", emissiveIntensity: 0.7, metalness: 0.15, roughness: 0.18 });
const wheelGroups = [];
const bodyShape = new THREE.Shape();
bodyShape.moveTo(-2.32, 0.57);
bodyShape.lineTo(-2.24, 0.79);
bodyShape.lineTo(-1.58, 0.91);
bodyShape.lineTo(-0.9, 0.95);
bodyShape.lineTo(1.03, 0.92);
bodyShape.lineTo(2.03, 0.81);
bodyShape.lineTo(2.25, 0.66);
bodyShape.lineTo(2.22, 0.55);
bodyShape.lineTo(-2.32, 0.57);
const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, { depth: 1.86, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.07, bevelThickness: 0.055, curveSegments: 8 });
bodyGeometry.translate(0, 0, -0.93);
bodyGeometry.rotateY(-Math.PI / 2);
const body = new THREE.Mesh(bodyGeometry, carPaint);
body.castShadow = true;
body.receiveShadow = true;
player.add(body);

function addQuad(points, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  player.add(mesh);
  return mesh;
}

function addBeam(start, end, radius, material) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius, from.distanceTo(to), 8), material);
  beam.position.copy(from).add(to).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
  beam.castShadow = true;
  player.add(beam);
}

box(player, 1.28, 0.15, 1.08, carPaint, 0, 1.55, -0.12);
for (const side of [-1, 1]) {
  addBeam([side * 0.78, 0.98, -1.16], [side * 0.67, 1.51, -0.64], 0.065, carPaint);
  addBeam([side * 0.67, 1.51, -0.64], [side * 0.62, 1.52, 0.51], 0.065, carPaint);
  addBeam([side * 0.62, 1.52, 0.51], [side * 0.82, 0.97, 1.02], 0.065, carPaint);
  addQuad([[side * 0.8, 1.07, -0.99], [side * 0.69, 1.42, -0.58], [side * 0.64, 1.42, 0.39], [side * 0.77, 1.06, 0.84]], glassMaterial);
  addBeam([side * 0.94, 0.74, -0.6], [side * 1.08, 0.76, -0.6], 0.045, darkTrim);
  const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), carPaint);
  mirror.position.set(side * 1.08, 0.79, -0.63);
  mirror.scale.set(0.78, 0.62, 1.2);
  player.add(mirror);
}
addQuad([[-0.67, 1.49, -0.65], [0.67, 1.49, -0.65], [0.78, 1.02, -1.17], [-0.78, 1.02, -1.17]], glassMaterial);
addQuad([[-0.62, 1.48, 0.53], [0.62, 1.48, 0.53], [0.78, 1.03, 1.02], [-0.78, 1.03, 1.02]], glassMaterial);

box(player, 1.95, 0.14, 0.18, darkTrim, 0, 0.61, -2.22);
box(player, 1.9, 0.16, 0.2, darkTrim, 0, 0.62, 2.19);
box(player, 0.84, 0.2, 0.08, darkTrim, 0, 0.78, -2.22, false);
box(player, 0.78, 0.08, 0.13, darkTrim, 0, 0.58, 2.31);
for (const x of [-0.71, 0.71]) {
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), headlamp);
  light.position.set(x, 0.82, -2.2);
  light.scale.set(1.15, 0.45, 0.36);
  player.add(light);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.11, 0.08), taillight);
  tail.position.set(x, 0.86, 2.18);
  player.add(tail);
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.15, 12), alloy);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(x * 0.65, 0.57, 2.28);
  player.add(exhaust);
}
for (const x of [-1.02, 1.02]) {
  for (const z of [-1.38, 1.38]) {
    const wheel = new THREE.Group();
    wheel.position.set(x, 0.42, z);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.27, 16), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheel.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.29, 24), alloy);
    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);
    const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.31, 16), darkTrim);
    centerCap.rotation.z = Math.PI / 2;
    wheel.add(centerCap);
    player.add(wheel);
    wheelGroups.push(wheel);
  }
}
player.traverse((object) => { if (object.isMesh) object.castShadow = true; });
const avatarModel = createPedestrian(15);
avatarModel.person.visible = false;
scene.add(avatarModel.person);

const checkpoints = [
  { x: 33, z: -2, name: "Plaça de Catalunya", color: "#d4f36b" },
  { x: 65, z: -35, name: "Arc de Triomf", color: "#ffb866" },
  { x: -33, z: -68, name: "Montjuïc", color: "#d4f36b" },
  { x: -65, z: 35, name: "Gràcia", color: "#ffb866" },
  { x: 0, z: 68, name: "Port Vell", color: "#d4f36b" },
  { x: -17, z: 153, name: "Sagrada Família", color: "#ffb866" },
];
const ringMeshes = checkpoints.map((point, index) => {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.18, 8, 32), new THREE.MeshBasicMaterial({ color: point.color }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(point.x, 1.2, point.z);
  ring.userData.checkpoint = index;
  scene.add(ring);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 8, 5), new THREE.MeshBasicMaterial({ color: point.color, transparent: true, opacity: 0.28 }));
  post.position.set(point.x, 4, point.z);
  scene.add(post);
  return ring;
});

const state = { speed: 0, heading: Math.PI, boatSpeed: 0, boatHeading: Math.PI, checkpoint: 0, time: 120, started: false, ended: false, onFoot: false, onBoat: false, avatarGait: 0, waterFrame: 0, toastTimeout: null, last: performance.now() };

const actionState = {
  cooldown: 0,
  shots: 0,
  hitTargets: 0,
  muzzleFlash: 0,
  lastPedHit: 0,
};
const projectiles = [];
const trainingTargets = [];

function createActionUI() {
  const style = document.createElement("style");
  style.textContent = `
    #action-hud{position:absolute;right:24px;bottom:112px;z-index:20;pointer-events:none;
      font:600 12px/1.1 "DM Mono",monospace;letter-spacing:.08em;color:#eef3e9;
      text-shadow:0 1px 5px #000;display:flex;flex-direction:column;align-items:flex-end;gap:7px}
    #action-hud strong{font:700 17px/1 "Barlow Condensed",sans-serif;letter-spacing:.04em}
    #crosshair{position:absolute;left:50%;top:50%;width:22px;height:22px;transform:translate(-50%,-50%);
      z-index:19;pointer-events:none;opacity:.8}
    #crosshair:before,#crosshair:after{content:"";position:absolute;background:#e7f2df}
    #crosshair:before{left:10px;top:2px;width:2px;height:18px}
    #crosshair:after{left:2px;top:10px;width:18px;height:2px}
    #action-flash{position:absolute;inset:0;z-index:18;pointer-events:none;background:rgba(255,245,190,.08);opacity:0}
  `;
  document.head.appendChild(style);
  const hud = document.createElement("div");
  hud.id = "action-hud";
  hud.innerHTML = '<strong id="ammo-count">BLÁSTER · 12</strong><span id="hit-count">OBJETIVOS 0</span><span>F / CLIC · DISPARAR</span>';
  view.appendChild(hud);
  const crosshair = document.createElement("div");
  crosshair.id = "crosshair";
  view.appendChild(crosshair);
  const flash = document.createElement("div");
  flash.id = "action-flash";
  view.appendChild(flash);
}
createActionUI();

function refreshActionUI() {
  const ammo = 12 - (actionState.shots % 12);
  const ammoEl = document.querySelector("#ammo-count");
  const hitEl = document.querySelector("#hit-count");
  if (ammoEl) ammoEl.textContent = `BLÁSTER · ${ammo}`;
  if (hitEl) hitEl.textContent = `OBJETIVOS ${actionState.hitTargets}`;
}

function spawnTrainingTarget(position) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.34, 1.0, 12),
    new THREE.MeshStandardMaterial({color:"#6f7d77",roughness:.65,metalness:.2})
  );
  body.position.y = .55;
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(.34,.34,.08,24),
    new THREE.MeshStandardMaterial({color:"#d8c66d",roughness:.5,emissive:"#4a3e12",emissiveIntensity:.18})
  );
  disc.rotation.x = Math.PI/2;
  disc.position.set(0,.85,-.18);
  group.add(body,disc);
  group.position.copy(position);
  group.userData.baseY = position.y;
  group.userData.cooldown = 0;
  scene.add(group);
  trainingTargets.push(group);
}

[
  [-24,0,-18],[24,0,-18],[-58,0,20],[58,0,20],
  [-24,0,54],[24,0,54]
].forEach(([x,y,z]) => spawnTrainingTarget(new THREE.Vector3(x,y,z)));

function getActionOrigin() {
  if (state.onFoot) return avatarModel.person.position.clone().add(new THREE.Vector3(0,1.25,0));
  return player.position.clone().add(new THREE.Vector3(0,1.15,0));
}

function getActionDirection() {
  if (state.onFoot) return new THREE.Vector3(-Math.sin(avatarModel.person.rotation.y),0,-Math.cos(avatarModel.person.rotation.y));
  return new THREE.Vector3(-Math.sin(state.heading),0,-Math.cos(state.heading));
}

function fireBlaster() {
  if (!state.started || state.ended || state.onBoat || actionState.cooldown > 0) return;
  actionState.cooldown = .22;
  actionState.shots++;
  actionState.muzzleFlash = .07;

  const origin = getActionOrigin();
  const direction = getActionDirection().normalize();
  const bolt = new THREE.Mesh(
    new THREE.SphereGeometry(.055,8,8),
    new THREE.MeshBasicMaterial({color:"#f5e9a8",emissive:"#f5e9a8"})
  );
  bolt.position.copy(origin).addScaledVector(direction,.8);
  scene.add(bolt);
  projectiles.push({mesh:bolt,direction:direction.clone(),life:1.15});

  const flashEl = document.querySelector("#action-flash");
  if (flashEl) flashEl.style.opacity = "1";
  refreshActionUI();
}

function updateAction(delta) {
  actionState.cooldown = Math.max(0, actionState.cooldown-delta);
  actionState.muzzleFlash = Math.max(0, actionState.muzzleFlash-delta);
  const flashEl = document.querySelector("#action-flash");
  if (flashEl) flashEl.style.opacity = actionState.muzzleFlash > 0 ? ".9" : "0";

  for (let i=projectiles.length-1;i>=0;i--) {
    const p = projectiles[i];
    p.mesh.position.addScaledVector(p.direction,34*delta);
    p.life -= delta;
    let remove = p.life <= 0;
    for (const target of trainingTargets) {
      if (target.userData.cooldown > 0) continue;
      if (p.mesh.position.distanceTo(target.position.clone().add(new THREE.Vector3(0,.65,0))) < .72) {
        target.userData.cooldown = 2.2;
        target.visible = false;
        actionState.hitTargets++;
        refreshActionUI();
        showToast("Objetivo alcanzado");
        remove = true;
        break;
      }
    }
    if (remove) {
      scene.remove(p.mesh);
      projectiles.splice(i,1);
    }
  }

  for (const target of trainingTargets) {
    if (target.userData.cooldown > 0) {
      target.userData.cooldown -= delta;
      if (target.userData.cooldown <= 0) target.visible = true;
    }
    if (target.visible) {
      target.rotation.y += delta*.9;
      target.position.y = target.userData.baseY + Math.sin(performance.now()*.002 + target.position.x)*.04;
    }
  }

  // Non-graphic pedestrian collision reaction: the NPC steps aside and temporarily pauses.
  if (!state.onFoot && !state.onBoat && state.started) {
    const now = performance.now();
    for (const walker of pedestrians) {
      if (now - walker.lastHit < 1800) continue;
      const distance = Math.hypot(
        player.position.x - walker.person.position.x,
        player.position.z - walker.person.position.z
      );
      if (distance < 2.15) {
        walker.lastHit = now;
        const away = walker.person.position.clone().sub(player.position);
        away.y = 0;
        if (away.lengthSq() > .001) {
          away.normalize();
          walker.person.position.addScaledVector(away, 2.2);
          walker.direction *= -1;
          walker.person.rotation.y += Math.PI;
        }
        state.speed *= .38;
        showToast("¡Cuidado! Peatón apartado");
      }
    }
  }
}

const keys = new Set();
const mapContext = ui.minimap.getContext("2d");
const cameraTarget = new THREE.Vector3();
const carForward = new THREE.Vector3();
let musicOpen = false;
let localTracks = [];
let localTrackIndex = 0;
let localTrackUrl = null;
let musicDatabasePromise = null;

function openMusicDatabase() {
  if (!("indexedDB" in window)) return Promise.reject(new Error("Almacenamiento local no disponible"));
  if (musicDatabasePromise) return musicDatabasePromise;
  musicDatabasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open("ruta-cero-music", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("tracks")) request.result.createObjectStore("tracks", { keyPath: "order" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return musicDatabasePromise;
}

async function restoreLocalTracks() {
  try {
    const database = await openMusicDatabase();
    const records = await new Promise((resolve, reject) => {
      const request = database.transaction("tracks", "readonly").objectStore("tracks").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    localTracks = records.sort((left, right) => left.order - right.order).map((record) => new File([record.blob], record.name, { type: record.type }));
    localTrackIndex = Math.min(localTrackIndex, Math.max(localTracks.length - 1, 0));
    if (localTracks.length) {
      ui.localPlayer.loop = localTracks.length === 1;
      playLocalTrack(localTrackIndex, true);
    }
  } catch (error) {
    console.warn("No se pudieron restaurar las canciones guardadas.", error);
  }
}

async function saveLocalTracks() {
  try {
    const database = await openMusicDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("tracks", "readwrite");
      const store = transaction.objectStore("tracks");
      store.clear();
      localTracks.forEach((track, order) => store.put({ order, name: track.name, type: track.type, blob: track }));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn("No se pudieron guardar las canciones localmente.", error);
  }
}

const savedTracksReady = restoreLocalTracks();

function showToast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add("is-visible");
  clearTimeout(state.toastTimeout);
  state.toastTimeout = setTimeout(() => ui.toast.classList.remove("is-visible"), 1800);
}

function toggleSound() {
  musicOpen = !musicOpen;
  ui.musicPanel.hidden = !musicOpen;
  ui.sound.setAttribute("aria-pressed", String(musicOpen));
  ui.sound.setAttribute("aria-label", musicOpen ? "Cerrar controles de música" : "Abrir controles de música");
  ui.sound.title = musicOpen ? "Cerrar controles de música" : "Abrir controles de música";
}

function playLocalTrack(index, autoplayAttempt = false) {
  if (!localTracks.length) return;
  localTrackIndex = (index + localTracks.length) % localTracks.length;
  if (localTrackUrl) URL.revokeObjectURL(localTrackUrl);
  localTrackUrl = URL.createObjectURL(localTracks[localTrackIndex]);
  ui.localPlayer.src = localTrackUrl;
  ui.localPlayer.loop = localTracks.length === 1;
  ui.localPlayer.play().catch(() => {});
  const blockedLabel = autoplayAttempt ? "El navegador bloqueó la reproducción automática; pulsa para iniciar" : "Pausar canción";
  ui.musicPause.setAttribute("aria-label", blockedLabel);
  ui.musicPause.title = blockedLabel;
}

function loadLocalTracks(files) {
  const addedTracks = Array.from(files).filter((file) => file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name));
  if (!addedTracks.length) return;
  const wasEmpty = localTracks.length === 0;
  localTracks.push(...addedTracks);
  ui.localPlayer.loop = localTracks.length === 1;
  saveLocalTracks();
  musicOpen = true;
  ui.musicPanel.hidden = false;
  ui.sound.setAttribute("aria-pressed", "true");
  ui.sound.setAttribute("aria-label", "Cerrar reproductor de música");
  ui.sound.title = "Cerrar reproductor de música";
  playLocalTrack(wasEmpty ? 0 : localTracks.length - addedTracks.length);
}

function toggleLocalPlayback() {
  if (!localTracks.length) {
    ui.musicFile.click();
    return;
  }
  if (ui.localPlayer.paused) {
    ui.localPlayer.play().catch(() => {});
    ui.musicPause.setAttribute("aria-label", "Pausar canción");
    ui.musicPause.title = "Pausar canción";
  } else {
    ui.localPlayer.pause();
    ui.musicPause.setAttribute("aria-label", "Reanudar canción");
    ui.musicPause.title = "Reanudar canción";
  }
}

function districtName(position) {
  if (position.z > cityEdge) return "MAR MEDITERRANI";
  if (position.z > 55) return "PORT VELL";
  if (position.z < -55) return "MONTJUÏC";
  if (position.x < -50) return "GRÀCIA";
  if (position.x > 50) return "POBLE NOU";
  return "L'EIXAMPLE";
}

function updateModeUI() {
  view.dataset.mode = state.onBoat ? "boating" : state.onFoot ? "walking" : "driving";
  ui.vehicleName.textContent = state.onBoat ? "BARCA" : state.onFoot ? "A PIE" : "BMW SERIE 1";
  ui.controlLabels[0].textContent = "";
  ui.controlLabels[1].textContent = "";
  ui.touchExit.textContent = "↔";
  ui.touchExit.setAttribute("aria-label", state.onBoat ? "Desembarcar" : state.onFoot ? "Subir al coche o embarcar" : "Bajar del coche");
}

function toggleVehicle() {
  if (state.onBoat) return;
  if (!state.started || state.ended) return;
  if (!state.onFoot) {
    if (Math.abs(state.speed) > 1.2) {
      showToast("Detén el coche para bajar");
      return;
    }
    state.speed = 0;
    state.onFoot = true;
    const exitSide = new THREE.Vector3(-Math.cos(state.heading), 0, Math.sin(state.heading));
    avatarModel.person.position.copy(player.position).addScaledVector(exitSide, 1.65);
    avatarModel.person.rotation.y = player.rotation.y;
    avatarModel.person.visible = true;
    showToast("Has bajado del coche");
  } else {
    const distance = avatarModel.person.position.distanceTo(player.position);
    if (distance > 4.2) {
      showToast("Acércate al coche para subir");
      return;
    }
    state.onFoot = false;
    avatarModel.person.visible = false;
    state.speed = 0;
    showToast("Has subido al coche");
  }
  updateModeUI();
}

function toggleBoat() {
  if (!state.started || (state.ended && !state.onBoat)) return;
  if (!state.onBoat) {
    const source = state.onFoot ? avatarModel.person.position : player.position;
    if (source.distanceTo(boat.position) > 14) {
      showToast("Acércate al embarcadero");
      return;
    }
    state.onBoat = true;
    state.onFoot = false;
    state.speed = 0;
    state.boatSpeed = 0;
    state.boatHeading = boat.rotation.y;
    avatarModel.person.visible = false;
    showToast("Lancha lista · W / S y A / D");
  } else {
    const nearBeach = boat.position.z < cityEdge + 45;
    const nearIsland = Math.hypot(boat.position.x - libertyIsland.position.x, boat.position.z - libertyIsland.position.z) < 24;
    if (!nearBeach && !nearIsland) {
      showToast("Busca la playa para desembarcar");
      return;
    }
    state.onBoat = false;
    state.onFoot = true;
    state.boatSpeed = 0;
    const exitSide = new THREE.Vector3(-Math.cos(state.boatHeading), 0, Math.sin(state.boatHeading));
    avatarModel.person.position.copy(boat.position).addScaledVector(exitSide, 3.2);
    if (nearIsland) avatarModel.person.position.y = 0.8;
    else avatarModel.person.position.y = 0;
    avatarModel.person.rotation.y = state.boatHeading;
    avatarModel.person.visible = true;
    showToast("Has bajado de la lancha");
  }
  updateModeUI();
}

function startGame() {
  state.started = true;
  state.ended = false;
  state.onFoot = false;
  state.onBoat = false;
  state.speed = 0;
  state.boatSpeed = 0;
  boat.position.set(0, 0.26, cityEdge + 27);
  boat.rotation.y = Math.PI;
  state.time = 120;
  state.checkpoint = 0;
  if (localTracks.length) {
    if (!ui.localPlayer.src) playLocalTrack(localTrackIndex);
    else ui.localPlayer.play().catch(() => {});
  } else {
    savedTracksReady.then(() => {
      if (state.started && localTracks.length && ui.localPlayer.paused) playLocalTrack(localTrackIndex);
    });
  }
  player.position.set(0, 0, 0);
  player.rotation.y = Math.PI;
  avatarModel.person.visible = false;
  updateModeUI();
  ui.missionTitle.innerHTML = "La última<br />entrega";
  ui.missionCopy.textContent = "Cruza Barcelona. Encuentra los puntos de control antes de que se agote el tiempo.";
  ui.missionEyebrow.innerHTML = '<span class="eyebrow-line"></span>ENCARGO 01 <span class="eyebrow-status">EN CURSO</span>';
  ui.startScreen.classList.add("is-hidden");
  ui.toast.classList.remove("is-visible");
  updateMission();
}

function updateMission() {
  const completed = Math.min(state.checkpoint, checkpoints.length);
  ui.progressText.textContent = `${completed} / ${checkpoints.length}`;
  ui.progressFill.style.width = `${(completed / checkpoints.length) * 100}%`;
  if (completed >= checkpoints.length) {
    ui.objectiveName.textContent = "Encargo completado";
    ui.objectiveDistance.textContent = "✓";
    state.ended = true;
    state.speed *= 0.45;
    ui.missionTitle.innerHTML = "Entrega<br />hecha";
    ui.missionCopy.textContent = "El distrito todavía tiene rutas por descubrir.";
    ui.missionEyebrow.innerHTML = '<span class="eyebrow-line"></span>ENCARGO 01 <span class="eyebrow-status">COMPLETADO</span>';
    showToast("¡Entrega completada!");
    return;
  }
  ui.objectiveName.textContent = checkpoints[state.checkpoint].name;
}

function drawMinimap() {
  const canvas = ui.minimap;
  const size = canvas.width;
  const context = mapContext;
  const actor = state.onBoat ? boat : state.onFoot ? avatarModel.person : player;
  context.clearRect(0, 0, size, size);
  context.fillStyle = "#18221e";
  context.fillRect(0, 0, size, size);
  const scale = size / (cityEdge * 2);
  context.save();
  context.translate(size / 2, size / 2);
  context.rotate(-actor.rotation.y);
  context.translate(-actor.position.x * scale, -actor.position.z * scale);
  context.fillStyle = "#245e68";
  context.fillRect(-cityEdge * 2.5 * scale, cityEdge * scale, cityEdge * 5 * scale, cityEdge * 5 * scale);
  context.fillStyle = "#c8b28c";
  context.fillRect(-cityEdge * 2.5 * scale, (cityEdge - 12) * scale, cityEdge * 5 * scale, 12 * scale);
  context.strokeStyle = "#74796a";
  context.lineWidth = 7;
  for (let road = -cityGridRadius; road <= cityGridRadius; road++) {
    context.beginPath();
    context.moveTo(-cityEdge * scale, road * roadSpacing * scale);
    context.lineTo(cityEdge * scale, road * roadSpacing * scale);
    context.stroke();
    context.beginPath();
    context.moveTo(road * roadSpacing * scale, -cityEdge * scale);
    context.lineTo(road * roadSpacing * scale, cityEdge * scale);
    context.stroke();
  }
  context.beginPath();
  context.fillStyle = "#d5eee6";
  context.arc(-70 * scale, (cityEdge + 230) * scale, 3.2, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.fillStyle = "#63d5d0";
  context.arc(boat.position.x * scale, boat.position.z * scale, 3, 0, Math.PI * 2);
  context.fill();
  checkpoints.slice(state.checkpoint).forEach((point, index) => {
    context.beginPath();
    context.fillStyle = index === 0 ? "#d4f36b" : "#e1c788";
    context.arc(point.x * scale, point.z * scale, index === 0 ? 4.2 : 2.4, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
  context.save();
  context.translate(size / 2, size / 2);
  context.rotate(-actor.rotation.y);
  context.fillStyle = state.onBoat ? "#63d5d0" : "#ff704c";
  context.beginPath();
  context.moveTo(0, -7);
  context.lineTo(-4.5, 5);
  context.lineTo(4.5, 5);
  context.closePath();
  context.fill();
  context.restore();
}

function resize() {
  const width = view.clientWidth;
  const height = view.clientHeight;
  camera.aspect = width / height;
  camera.fov = width < 700 ? 68 : 62;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function update(delta) {
  updateAction(delta);
  const accelerating = keys.has("w") || keys.has("arrowup");
  const braking = keys.has("s") || keys.has("arrowdown");
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  const handbrake = keys.has(" ");
  if (state.started && !state.ended) {
    state.time = Math.max(0, state.time - delta);
    if (state.time <= 0) {
      state.ended = true;
      ui.missionTitle.innerHTML = "Se acabó<br />el tiempo";
      ui.missionCopy.textContent = "Cada ruta tiene otra oportunidad. Inténtalo de nuevo.";
      ui.missionEyebrow.innerHTML = '<span class="eyebrow-line"></span>ENCARGO 01 <span class="eyebrow-status">FINALIZADO</span>';
      showToast("Tiempo agotado");
    }
    if (!state.onFoot && !state.onBoat) {
      if (accelerating) state.speed += 19 * delta;
      else if (braking) state.speed -= (state.speed > 3 ? 29 : 11) * delta;
      else state.speed -= Math.sign(state.speed) * Math.min(Math.abs(state.speed), 7 * delta);
    } else if (state.onFoot) {
      state.speed = 0;
      if (left) avatarModel.person.rotation.y += delta * 2.1;
      if (right) avatarModel.person.rotation.y -= delta * 2.1;
      const walkForward = new THREE.Vector3(-Math.sin(avatarModel.person.rotation.y), 0, -Math.cos(avatarModel.person.rotation.y));
      const walkSpeed = keys.has("shift") ? 5.4 : 3.2;
      if (accelerating) avatarModel.person.position.addScaledVector(walkForward, walkSpeed * delta);
      if (braking) avatarModel.person.position.addScaledVector(walkForward, -walkSpeed * 0.65 * delta);
    }
  }
  if (state.onBoat) {
    if (accelerating) state.boatSpeed += 8 * delta;
    else if (braking) state.boatSpeed -= (state.boatSpeed > 2 ? 12 : 6) * delta;
    else state.boatSpeed -= Math.sign(state.boatSpeed) * Math.min(Math.abs(state.boatSpeed), 2.3 * delta);
    state.boatSpeed = THREE.MathUtils.clamp(state.boatSpeed, -7, 18);
  }
  state.speed = THREE.MathUtils.clamp(state.speed, -12, 42);
  const speedRatio = Math.min(Math.abs(state.speed) / 42, 1);
  const turnInput = Number(left) - Number(right);
  if (state.started && !state.onFoot && Math.abs(state.speed) > 0.45) {
    state.heading += turnInput * delta * (0.58 + speedRatio * 0.96) * Math.sign(state.speed) * (handbrake ? 1.55 : 1);
  }
  carForward.set(-Math.sin(state.heading), 0, -Math.cos(state.heading));
  if (!state.onFoot) player.position.addScaledVector(carForward, state.speed * delta);
  if (!state.onBoat) {
    player.position.x = THREE.MathUtils.clamp(player.position.x, -470, 470);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -555, cityEdge - 3);
  }
  if (!state.onFoot && !state.onBoat && player.position.z > cityEdge - 3) {
    player.position.z = cityEdge - 3;
    state.speed = Math.min(state.speed, 0);
    showToast("Sigue a pie hasta el embarcadero");
  }
  player.rotation.y = state.heading;
  wheelGroups.forEach((wheel, index) => {
    wheel.rotation.x += (state.speed * delta) / 0.39;
    if (index < 2) wheel.rotation.y = THREE.MathUtils.damp(wheel.rotation.y, turnInput * -0.25, 8, delta);
  });
  traffic.forEach((vehicle) => {
    vehicle.car.position.x += vehicle.dx * vehicle.speed * delta;
    vehicle.car.position.z += vehicle.dz * vehicle.speed * delta;
    if (vehicle.car.position.x > cityEdge) vehicle.car.position.x = -cityEdge;
    if (vehicle.car.position.x < -cityEdge) vehicle.car.position.x = cityEdge;
    if (vehicle.car.position.z > cityEdge - 12) vehicle.car.position.z = -cityEdge;
    if (vehicle.car.position.z < -cityEdge) vehicle.car.position.z = cityEdge - 12;
    if (!state.onFoot && !state.onBoat && state.started && !state.ended && Math.hypot(player.position.x - vehicle.car.position.x, player.position.z - vehicle.car.position.z) < 2.8 && performance.now() - vehicle.lastHit > 2200) {
      state.speed *= 0.48;
      state.time = Math.max(0, state.time - 2);
      vehicle.lastHit = performance.now();
      showToast("¡Cuidado con el tráfico!");
    }
  });
  pedestrians.forEach((walker) => {
    const axis = walker.alongZ ? "z" : "x";
    walker.person.position[axis] += walker.direction * walker.speed * delta;
    if (Math.abs(walker.person.position[axis]) > cityEdge - 18) {
      walker.direction *= -1;
      walker.person.rotation.y = walker.alongZ ? (walker.direction > 0 ? Math.PI : 0) : (walker.direction > 0 ? -Math.PI / 2 : Math.PI / 2);
    }
    const stride = Math.sin(performance.now() * 0.006 + walker.phase) * 0.42;
    walker.legs[0].rotation.x = stride;
    walker.legs[1].rotation.x = -stride;
    walker.legs[0].userData.knee.rotation.x = Math.max(0, Math.cos(performance.now() * 0.006 + walker.phase)) * 0.42;
    walker.legs[1].userData.knee.rotation.x = Math.max(0, -Math.cos(performance.now() * 0.006 + walker.phase)) * 0.42;
    walker.arms[0].rotation.x = -stride * 0.72;
    walker.arms[1].rotation.x = stride * 0.72;
    walker.arms[0].userData.elbow.rotation.x = Math.max(0, stride) * 0.35;
    walker.arms[1].userData.elbow.rotation.x = Math.max(0, -stride) * 0.35;
    walker.person.position.y = Math.abs(stride) * 0.018;
  });

  if (state.onBoat) {
    state.boatHeading += turnInput * delta * (0.25 + Math.abs(state.boatSpeed) * 0.045) * Math.sign(state.boatSpeed || 1);
    boat.rotation.y = state.boatHeading;
    boat.position.addScaledVector(new THREE.Vector3(-Math.sin(state.boatHeading), 0, -Math.cos(state.boatHeading)), state.boatSpeed * delta);
  }

  const waveTime = performance.now() * 0.001;
  for (let vertex = 0; vertex < waterPositions.count; vertex++) {
    const x = waterPositions.getX(vertex);
    const z = waterPositions.getZ(vertex);
    waterPositions.setY(vertex, waterBaseHeights[vertex] + Math.sin(x * 0.026 + waveTime * 1.2) * 0.075 + Math.cos(z * 0.034 - waveTime) * 0.05);
  }
  waterPositions.needsUpdate = true;
  if (state.waterFrame++ % 3 === 0) waterGeometry.computeVertexNormals();
  boat.position.y = 0.2 + Math.sin(waveTime * 1.7 + boat.position.z * 0.02) * 0.08;

  const movingOnFoot = state.onFoot && (accelerating || braking);
  const sprinting = movingOnFoot && keys.has("shift");
  const gaitTarget = movingOnFoot ? (sprinting ? 1 : 0.68) : 0;
  state.avatarGait = THREE.MathUtils.damp(state.avatarGait, gaitTarget, 9, delta);
  const gaitPhase = performance.now() * (sprinting ? 0.012 : 0.0085);
  const stride = Math.sin(gaitPhase) * state.avatarGait * (sprinting ? 0.72 : 0.5);
  avatarModel.legs[0].rotation.x = stride;
  avatarModel.legs[1].rotation.x = -stride;
  avatarModel.legs[0].userData.knee.rotation.x = Math.max(0, Math.cos(gaitPhase)) * state.avatarGait * 0.48;
  avatarModel.legs[1].userData.knee.rotation.x = Math.max(0, -Math.cos(gaitPhase)) * state.avatarGait * 0.48;
  avatarModel.arms[0].rotation.x = -stride * 0.82;
  avatarModel.arms[1].rotation.x = stride * 0.82;
  avatarModel.arms[0].userData.elbow.rotation.x = Math.max(0, stride) * state.avatarGait * 0.3;
  avatarModel.arms[1].userData.elbow.rotation.x = Math.max(0, -stride) * state.avatarGait * 0.3;
  avatarModel.torso.rotation.x = sprinting ? -0.08 : 0;
  avatarModel.torso.rotation.z = Math.sin(performance.now() * 0.0017) * 0.012;
  avatarModel.torso.position.y = 1.08 + Math.sin(performance.now() * 0.0024) * 0.008 + Math.abs(stride) * 0.018;
  avatarModel.head.rotation.y = THREE.MathUtils.damp(avatarModel.head.rotation.y, turnInput * 0.055, 6, delta);
  avatarModel.person.position.y = Math.abs(stride) * 0.02;

  const actor = state.onBoat ? boat : state.onFoot ? avatarModel.person : player;
  const actorHeading = state.onBoat ? state.boatHeading : state.onFoot ? avatarModel.person.rotation.y : state.heading;
  ui.district.textContent = `${districtName(actor.position)} · BARCELONA`;
  if (state.onBoat) ui.touchExit.setAttribute("aria-label", "Desembarcar");
  else if (Math.hypot(actor.position.x - boat.position.x, actor.position.z - boat.position.z) < 14) ui.touchExit.setAttribute("aria-label", "Subir a la lancha");
  else ui.touchExit.setAttribute("aria-label", state.onFoot ? "Subir al coche" : "Bajar del coche");
  const target = new THREE.Vector3(actor.position.x, state.onBoat ? 0.75 : state.onFoot ? 1.05 : 1.5, actor.position.z);
  const cameraDistance = state.onBoat ? 13 : state.onFoot ? 4.8 : 9;
  const cameraOffset = new THREE.Vector3(Math.sin(actorHeading) * cameraDistance, state.onBoat ? 6.4 : state.onFoot ? 2.8 : 5.5, Math.cos(actorHeading) * cameraDistance);
  camera.position.lerp(target.clone().add(cameraOffset), 1 - Math.exp(-4.5 * delta));
  cameraTarget.copy(target).add(new THREE.Vector3(0, 0.7, 0));
  camera.lookAt(cameraTarget);

  if (state.started && !state.ended) {
    const checkpoint = checkpoints[state.checkpoint];
    if (checkpoint) {
      const distance = Math.hypot(actor.position.x - checkpoint.x, actor.position.z - checkpoint.z);
      ui.objectiveDistance.textContent = `${Math.round(distance)} m`;
      if (distance < 5.2) {
        state.checkpoint += 1;
        updateMission();
        if (state.checkpoint < checkpoints.length) showToast(`Punto ${state.checkpoint} / ${checkpoints.length}`);
      }
    }
    ui.timer.textContent = `${String(Math.floor(state.time / 60)).padStart(2, "0")}:${String(Math.floor(state.time % 60)).padStart(2, "0")}`;
    ui.timerLabel.classList.toggle("urgent", state.time < 20);
  }
  ringMeshes.forEach((ring, index) => {
    const active = index === state.checkpoint && !state.ended;
    ring.visible = index >= state.checkpoint && !state.ended;
    ring.rotation.z += delta * (active ? 0.7 : 0.25);
    const pulse = 1 + (active ? Math.sin(performance.now() * 0.004) * 0.08 : 0);
    ring.scale.setScalar(pulse);
  });
  const displayedSpeed = state.onBoat ? Math.abs(state.boatSpeed) * 3.6 : Math.abs(state.speed) * 4.1;
  ui.speed.textContent = String(Math.round(displayedSpeed)).padStart(3, "0");
  ui.speedFill.style.width = `${Math.min(displayedSpeed / 150, 1) * 100}%`;
  ui.gear.textContent = state.onBoat ? "B" : state.onFoot ? "P" : state.speed < -0.7 ? "R" : state.speed < 0.7 ? "N" : speedRatio > 0.75 ? "4" : speedRatio > 0.48 ? "3" : speedRatio > 0.23 ? "2" : "1";
  drawMinimap();
}

function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now - state.last) / 1000, 0.05);
  state.last = now;
  update(delta);
  renderer.render(scene, camera);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
  keys.add(key);
  if (key === "enter" && !state.started) startGame();
  if ((key === "f" || key === "enter") && !event.repeat) fireBlaster();
  if (key === "e" && !event.repeat) toggleVehicle();
  if (key === "b" && !event.repeat) toggleBoat();
  if (key === "r" && state.started && state.ended) startGame();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());
ui.startButton.addEventListener("click", startGame);
view.addEventListener("pointerdown", (event) => { if (state.started && !state.ended && event.button === 0 && event.target === renderer.domElement) fireBlaster(); });
ui.touchExit.addEventListener("click", () => {
  const actor = state.onBoat ? boat.position : state.onFoot ? avatarModel.person.position : player.position;
  if (state.onBoat || Math.hypot(actor.x - boat.position.x, actor.z - boat.position.z) < 14) toggleBoat();
  else toggleVehicle();
});
ui.sound.addEventListener("click", toggleSound);
document.querySelector("#music-add").addEventListener("click", () => ui.musicFile.click());
ui.musicFile.addEventListener("change", () => {
  loadLocalTracks(ui.musicFile.files || []);
  ui.musicFile.value = "";
});
ui.musicPause.addEventListener("click", toggleLocalPlayback);
ui.musicNext.addEventListener("click", () => playLocalTrack(localTrackIndex + 1));
ui.localPlayer.addEventListener("ended", () => {
  if (localTracks.length > 1) playLocalTrack(localTrackIndex + 1);
});
ui.localPlayer.addEventListener("play", () => ui.musicPause.setAttribute("aria-label", "Pausar canción"));
ui.localPlayer.addEventListener("pause", () => ui.musicPause.setAttribute("aria-label", "Reanudar canción"));

document.querySelectorAll("[data-drive-key]").forEach((button) => {
  const key = button.dataset.driveKey;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    keys.add(key);
  });
  const release = () => keys.delete(key);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
});

try {
  resize();
  camera.position.set(0, 7, 12);
  camera.lookAt(0, 1, 0);
  updateMission();
  refreshActionUI();
  requestAnimationFrame(animate);
  loading.classList.add("is-hidden");
  setTimeout(() => loading.remove(), 400);
} catch (error) {
  console.error(error);
  loading.classList.add("is-hidden");
  errorMessage.hidden = false;
}

window.addEventListener("error", (event) => {
  if (event.error instanceof Error && !renderer.info.render.frame) {
    loading.classList.add("is-hidden");
    errorMessage.hidden = false;
  }
});