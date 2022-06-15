// inspired by: https://play.google.com/store/apps/details?id=com.ketchapp.stack&hl=in&gl=KR
// Source 1: https://www.youtube.com/watch?v=hBiGFpBle7E
// Source 2: https://www.codegrepper.com/code-examples/javascript/function+for+random+colour+in+js
// Source 3: https://www.tabnine.com/code/javascript/functions/cannon/World/gravity
// Source 4(remove object in scene): https://dev-qa.com/1585834/in-three-js-to-remove-replace-the-mesh-of-the-object

let camera, scene, renderer;
let stack;
let overhangs;
let gameStarted = false;
let world;
const boxHeight = 1;
const originalBoxSize = 3; //panjang dan lebar kotak
const scoreElement = document.getElementById("score");
const announcement = document.getElementById("announcement");

const addLayer = (x, z, width, depth, direction) => {
  const y = boxHeight * stack.length;

  const layer = generateBox(x, y, z, width, depth, false);
  layer.direction = direction;
  stack.push(layer);
};

const addOverhang = (x, z, width, depth) => {
  const y = boxHeight * (stack.length - 1);
  const overhang = generateBox(x, y, z, width, depth, true);
  overhangs.push(overhang);
};
const generateBox = (x, y, z, width, depth, falls) => {
  // ThreeJS
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
  //Source 2
  var r = () => (Math.random() * 256) >> 0;
  var color = `rgb(${r()}, ${r()}, ${r()})`;
  const material = new THREE.MeshLambertMaterial({ color: color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  // CannonJS
  const shape = new CANNON.Box(
    new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
  );
  let mass = falls ? 5 : 0;
  const body = new CANNON.Body({ mass, shape });
  body.position.set(x, y, z);
  world.addBody(body);
  return {
    threejs: mesh,
    cannonjs: body,
    width,
    depth,
  };
};

const updatePhysics = () => {
  world.step(1 / 60);
  //copy animasi cannonjs ke threejs
  overhangs.forEach((e) => {
    e.threejs.position.copy(e.cannonjs.position);
    e.threejs.quaternion.copy(e.cannonjs.quaternion);
  });
};
const init = () => {
  stack = [];
  overhangs = [];
  // Source 3 dan 1
  // Setup CannonJS
  world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 40;

  //setup ThreeJS
  scene = new THREE.Scene();
  addLayer(0, 0, originalBoxSize, originalBoxSize);
  addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");

  // menggunakan orthograpic camera karena ukuran akan sama saja dilihat dari berbagai arah
  // kalau perspective kamera semakin jauh semakin kecil objeknya (view point dari sudut yang lebih rendah)
  // perspektif camera
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(90, aspect, 1, 1000);
  // orthographic camera
  const width = 15;
  const height = width / aspect;
  // camera = new THREE.OrthographicCamera(
  //   width / -2,
  //   width / 2,
  //   height / 2,
  //   height / -2,
  //   1,
  //   100
  // );
  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // const geometry = new THREE.BoxGeometry(3, 1, 3);
  // const material = new THREE.MeshLambertMaterial({ color: "#ACD1AF" });
  // const mesh = new THREE.Mesh(geometry, material);
  // mesh.position.set(0, 0, 0);
  // scene.add(mesh);

  // cahaya utama > menerangi seluruh sisi
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // cahaya sorot dari atas
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(10, 25, 5);
  scene.add(directionalLight);

  document.body.appendChild(renderer.domElement);

  function draw() {
    requestAnimationFrame(draw);
    renderer.render(scene, camera);
  }
  draw();
};

window.addEventListener("resize", function () {
  renderer.setSize(this.window.innerWidth, this.window.innerHeight);
  camera.aspect = this.window.innerWidth / this.window.innerHeight;
  camera.updateProjectionMatrix();
});

window.addEventListener("click", () => {
  if (!gameStarted) {
    renderer.setAnimationLoop(animation);
    gameStarted = true;
  } else {
    // Source 1
    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];
    const direction = topLayer.direction;
    const delta =
      topLayer.threejs.position[direction] -
      previousLayer.threejs.position[direction];
    const overhangSize = Math.abs(delta);
    const size = direction == "x" ? topLayer.width : topLayer.depth;

    // overlap = lebar kotak yang tidak dipotong
    // overhang = lebar kotak yang dipotong
    const overlap = size - overhangSize;
    if (overlap > 0) {
      //potong layer
      const newWidth = direction == "x" ? overlap : topLayer.width;
      const newDepth = direction == "z" ? overlap : topLayer.depth;
      //update ukuran top layer
      topLayer.width = newWidth;
      topLayer.depth = newDepth;
      //update threejs model
      topLayer.threejs.scale[direction] = overlap / size;
      topLayer.threejs.position[direction] -= delta / 2;
      //update Cannonjs model
      topLayer.cannonjs.position[direction] -= delta / 2;
      //cannon js tidak bisa scaling untuk ubah ukuran
      const shape = new CANNON.Box(
        new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
      );
      topLayer.cannonjs.shapes = [];
      topLayer.cannonjs.addShape(shape);

      //overhang
      const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
      const overhangX =
        direction == "x"
          ? topLayer.threejs.position.x + overhangShift
          : topLayer.threejs.position.x;
      const overhangZ =
        direction == "z"
          ? topLayer.threejs.position.z + overhangShift
          : topLayer.threejs.position.z;

      const overhangWidth = direction == "x" ? overhangSize : newWidth;
      const overhangDepth = direction == "z" ? overhangSize : newDepth;
      addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

      //next layer
      const nextX = direction == "x" ? topLayer.threejs.position.x : -10;
      const nextZ = direction == "z" ? topLayer.threejs.position.z : -10;
      const nextDirection = direction == "x" ? "z" : "x";
      if (scoreElement) scoreElement.innerText = stack.length - 1;
      addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
    } else {
      console.log("kalah");
      const topLayer = stack[stack.length - 1];
      addOverhang(
        topLayer.threejs.position.x,
        topLayer.threejs.position.z,
        topLayer.width,
        topLayer.depth
      );
      world.remove(topLayer.cannonjs);
      scene.remove(topLayer.threejs);
      if (announcement)
        announcement.innerText =
          "KAMU KALAH ! \n SCORE KAMU " +
          (stack.length - 2) +
          "\n Click Kanan untuk Mengulang";
      if (announcement) announcement.style.display = "flex";
    }
  }
});

// Restart Game click kanan
window.addEventListener("contextmenu", function (event) {
  console.log(scene);
  event.preventDefault();
  stack = [];
  overhangs = [];

  if (scoreElement) scoreElement.innerText = 0;
  if (announcement) announcement.style.display = "none";

  // Source 4
  // Remove Objek CannonJS
  if (world) {
    console.log(world);
    while (world.bodies.length > 0) {
      world.remove(world.bodies[0]);
    }
  }

  // Remove objek ThreeJS
  if (scene) {
    while (scene.children.find((c) => c.type == "Mesh")) {
      const mesh = scene.children.find((c) => c.type == "Mesh");
      scene.remove(mesh);
    }

    // Foundation
    addLayer(0, 0, originalBoxSize, originalBoxSize);

    // First layer
    addLayer(-10, 0, originalBoxSize, originalBoxSize, "x");
  }

  if (camera) {
    // Reset camera positions
    camera.position.set(4, 4, 4);
    camera.lookAt(0, 0, 0);
  }
  return false;
});

const animation = () => {
  const speed = 0.05;
  const topLayer = stack[stack.length - 1];
  topLayer.threejs.position[topLayer.direction] += speed;
  topLayer.cannonjs.position[topLayer.direction] += speed;
  if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
    camera.position.y += speed;
  }
  updatePhysics();
  renderer.render(scene, camera);
};

init();
