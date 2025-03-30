import * as THREE from 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r150/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r150/examples/jsm/controls/OrbitControls.js';

console.log("✅ scene.js loaded");

// === Basic Setup ===
let camera, scene, renderer, snowball;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clock = new THREE.Clock();

init();
animate();

function init() {
  console.log("🎬 Initializing scene");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaaccff);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;

  // Lighting
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(0, 20, 10);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xcccccc, 0.5);
  scene.add(ambient);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Snowball
  const ballGeo = new THREE.SphereGeometry(1, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  snowball = new THREE.Mesh(ballGeo, ballMat);
  snowball.position.y = 1;
  scene.add(snowball);

  // Dummy trees
  for (let i = 0; i < 30; i++) {
    const tree = new THREE.Mesh(
      new THREE.ConeGeometry(1, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0x226622 })
    );
    tree.position.set((Math.random() - 0.5) * 80, 2, (Math.random() - 0.5) * 80);
    scene.add(tree);
  }

  // Load project thumbnails
  fetch("projects.json")
    .then(res => res.json())
    .then(projects => {
      projects.forEach((proj) => {
        const texture = new THREE.TextureLoader().load(proj.image);
        const mat = new THREE.MeshBasicMaterial({ map: texture });
        const geo = new THREE.PlaneGeometry(3, 3.5);
        const frame = new THREE.Mesh(geo, mat);
        frame.position.set((Math.random() - 0.5) * 80, 1.75, (Math.random() - 0.5) * 80);
        frame.userData = proj;
        scene.add(frame);
      });
    });

  // Resizing
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Click detection
  window.addEventListener('click', onClick, false);
}

function onClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children);
  for (let i = 0; i < intersects.length; i++) {
    const obj = intersects[i].object;
    if (obj.userData && obj.userData.title) {
      showModal(obj.userData);
      break;
    }
  }
}

function showModal(data) {
  document.getElementById('modal-title').textContent = data.title;
  document.getElementById('modal-description').textContent = data.description;
  document.getElementById('modal-image').src = data.image;
  document.getElementById('overlay').classList.remove('hidden');
}

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  snowball.position.x = Math.sin(t) * 10;
  snowball.position.z = Math.cos(t) * 10;
  renderer.render(scene, camera);
}
