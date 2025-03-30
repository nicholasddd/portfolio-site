import * as THREE from 'three';
// OrbitControls are removed for the fixed isometric follow-cam
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Global Variables ---
let camera, scene, renderer, snowball;
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickableFrames = []; // Keep track of clickable objects

// --- Camera Configuration ---
const frustumSize = 25; // *** ADJUST this value to zoom in/out ***
const isometricOffset = new THREE.Vector3(20, 20, 20); // *** ADJUST x,y,z for camera angle/distance ***

// --- Modal Elements ---
const overlay = document.getElementById('overlay');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalImage = document.getElementById('modal-image');
const closeModalButton = document.getElementById('close-modal');
// const modalLink = document.getElementById('modal-link'); // Optional link

// --- Initialization and Animation ---
init();
animate();

// --- Initialization Function ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaaccff); // Light blue background

    // --- Camera: Orthographic for Isometric View ---
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        frustumSize / -2,
        1,          // Near plane
        1000        // Far plane
    );
    // Camera position is set later, relative to the snowball's starting point

    // --- Renderer ---
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // --- Controls: Removed ---
    // OrbitControls are not used for the fixed follow-camera setup.

    // --- Lighting ---
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(5, 20, 10);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0xcccccc, 0.8);
    scene.add(ambient);

    // --- Ground ---
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // --- Snowball ---
    const ballGeo = new THREE.SphereGeometry(1, 12, 8); // Lower poly
    const ballMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.8,
        metalness: 0.1
     });
    snowball = new THREE.Mesh(ballGeo, ballMat);
    snowball.position.y = 1; // Place it on the ground (initial x/z is 0)
    scene.add(snowball);

    // --- Set Initial Camera Position & LookAt ---
    // Position the camera based on the snowball's STARTING position + offset
    // This ensures the camera starts looking at the snowball correctly
    camera.position.copy(snowball.position).add(isometricOffset);
    camera.lookAt(snowball.position); // Make camera point at the snowball

    // --- Trees (Low Poly Cones) ---
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x226622 });
    const treeGeo = new THREE.ConeGeometry(1, 4, 8);
    for (let i = 0; i < 30; i++) {
        const tree = new THREE.Mesh(treeGeo, treeMat);
        tree.position.set(
            (Math.random() - 0.5) * 80,
            2, // Cone base on ground (height/2)
            (Math.random() - 0.5) * 80
        );
        scene.add(tree);
    }

    // --- Project Thumbnails ---
    fetch("projects.json")
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(projects => {
            const textureLoader = new THREE.TextureLoader();
            const frameGeo = new THREE.PlaneGeometry(3, 3.5);

            projects.forEach((proj) => {
                const texture = textureLoader.load(proj.image);
                const frameMat = new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide });
                const frame = new THREE.Mesh(frameGeo, frameMat);

                frame.position.set(
                    (Math.random() - 0.5) * 70,
                    1.75,
                    (Math.random() - 0.5) * 70
                 );
                // Optional: Make frames face the camera initially or keep them fixed
                // frame.lookAt(camera.position); // If enabled, they will turn as camera moves in animate()

                frame.userData = proj; // Store project data
                scene.add(frame);
                clickableFrames.push(frame); // Add to array for specific raycasting
            });
        })
        .catch(error => {
            console.error("Error loading projects.json:", error);
         });

    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onClick);

    // --- Modal Event Listeners ---
    // Ensure these run after the modal elements exist in the DOM
    if (closeModalButton) {
        closeModalButton.addEventListener('click', hideModal);
    } else {
        console.error("Could not find close modal button with ID 'close-modal'");
    }
    if (overlay) {
        overlay.addEventListener('click', (event) => {
            // Close modal only if the click is on the overlay background itself
            if (event.target === overlay) {
                hideModal();
            }
        });
    } else {
         console.error("Could not find overlay element with ID 'overlay'");
    }
}

// --- Resize Handler ---
function onWindowResize() {
    // Update Orthographic Camera parameters on resize
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix(); // Crucial for Orthographic resize

    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Click Handler (Raycasting) ---
function onClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(clickableFrames);

    if (intersects.length > 0) {
        const firstIntersected = intersects[0].object;
        if (firstIntersected.userData && firstIntersected.userData.title) {
             showModal(firstIntersected.userData);
        }
    }
}

// --- Modal Display Functions ---
function showModal(data) {
    // Check if modal elements exist before trying to set properties
    if (!modalTitle || !modalDescription || !modalImage || !overlay) {
        console.error("Modal elements not found. Cannot show modal.");
        return;
    }
    modalTitle.textContent = data.title || 'No Title';
    modalDescription.textContent = data.description || 'No Description';
    modalImage.src = data.image || '';
    modalImage.alt = data.title || 'Project Image';
    // Optional: Set link
    // if (data.url && modalLink) {
    //     modalLink.href = data.url;
    //     modalLink.style.display = 'inline-block';
    // } else if (modalLink) {
    //     modalLink.style.display = 'none';
    // }

    overlay.classList.remove('hidden'); // Show the modal
}

function hideModal() {
     if (overlay) {
        overlay.classList.add('hidden'); // Hide the modal
     }
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate); // Loop animation

    const delta = clock.getDelta(); // Time since last frame
    const t = clock.getElapsedTime(); // Total time elapsed

    // --- Snowball Movement ---
    // Update snowball position first based on time or user input
    snowball.position.x = Math.sin(t * 0.5) * 10; // Example: circular motion
    snowball.position.z = Math.cos(t * 0.5) * 10;

    // --- Camera Following ---
    // Update camera position to follow the snowball, maintaining the offset
    camera.position.copy(snowball.position).add(isometricOffset);
    // Ensure the camera always points at the snowball's current position
    camera.lookAt(snowball.position);

    // Optional: Make frames always face the camera ("Billboard" effect)
    // clickableFrames.forEach(frame => {
    //     frame.lookAt(camera.position);
    // });

    // --- Render the Scene ---
    renderer.render(scene, camera);
}
