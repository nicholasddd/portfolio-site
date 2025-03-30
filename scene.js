import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, snowball;
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickableFrames = []; // Keep track of clickable objects

// --- Modal Elements ---
const overlay = document.getElementById('overlay');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalImage = document.getElementById('modal-image');
const closeModalButton = document.getElementById('close-modal');
// const modalLink = document.getElementById('modal-link'); // Optional link

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaaccff); // Light blue background

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 20); // Initial camera position

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // --- Controls ---
    // Note: You disabled pan/zoom. Re-enable if needed for exploration.
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    // controls.target.set(0, 1, 0); // Optional: Focus controls slightly above ground
    // controls.update();

    // --- Lighting ---
    const light = new THREE.DirectionalLight(0xffffff, 1.5); // Slightly brighter light
    light.position.set(5, 20, 10);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0xcccccc, 0.8); // Slightly brighter ambient
    scene.add(ambient);

    // --- Ground ---
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        // Use MeshStandardMaterial for better lighting interaction if desired
        new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    scene.add(ground);

    // --- Snowball ---
    // Reduced segments for a more low-poly look
    const ballGeo = new THREE.SphereGeometry(1, 12, 8);
    // Use MeshStandardMaterial for potentially better look
    const ballMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.8, // Less shiny
        metalness: 0.1
     });
    snowball = new THREE.Mesh(ballGeo, ballMat);
    snowball.position.y = 1; // Place it on the ground
    scene.add(snowball);

    // --- Trees (Low Poly Cones) ---
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x226622 }); // Dark green
    const treeGeo = new THREE.ConeGeometry(1, 4, 8); // Base radius, height, segments
    for (let i = 0; i < 30; i++) {
        const tree = new THREE.Mesh(treeGeo, treeMat);
        // Position randomly, ensuring they stand on the ground (y=height/2)
        tree.position.set(
            (Math.random() - 0.5) * 80,
            2, // Cone geometry origin is center, so height/2 puts base on ground
            (Math.random() - 0.5) * 80
        );
        tree.castShadow = true; // Optional: if you add shadows later
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
            const frameGeo = new THREE.PlaneGeometry(3, 3.5); // Adjust aspect ratio if needed

            projects.forEach((proj) => {
                const texture = textureLoader.load(proj.image);
                // Use MeshLambertMaterial so it reacts to light like other objects
                const frameMat = new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide });
                const frame = new THREE.Mesh(frameGeo, frameMat);

                // Position randomly, slightly above ground & tilted like a photo
                frame.position.set(
                    (Math.random() - 0.5) * 70, // Slightly smaller range than trees
                    1.75, // Centered height of the frame
                    (Math.random() - 0.5) * 70
                 );
                // frame.rotation.x = -Math.PI / 12; // Slight tilt back
                frame.lookAt(camera.position); // Make frame initially face camera (or 0,0,0)

                frame.userData = proj; // Store project data
                scene.add(frame);
                clickableFrames.push(frame); // Add to array for specific raycasting
            });
        })
        .catch(error => {
            console.error("Error loading projects.json:", error);
            // Handle error display to the user if needed
         });

    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onClick);
    closeModalButton.addEventListener('click', hideModal);
    overlay.addEventListener('click', (event) => {
        // Close modal if clicked outside the content area
        if (event.target === overlay) {
            hideModal();
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    // Intersect only the clickable frames for efficiency
    const intersects = raycaster.intersectObjects(clickableFrames);

    if (intersects.length > 0) {
        const firstIntersected = intersects[0].object;
        if (firstIntersected.userData && firstIntersected.userData.title) {
             showModal(firstIntersected.userData);
        }
    }
}

function showModal(data) {
    modalTitle.textContent = data.title || 'No Title';
    modalDescription.textContent = data.description || 'No Description';
    modalImage.src = data.image || '';
    modalImage.alt = data.title || 'Project Image';
    // Optional: Set link
    // if (data.url) {
    //     modalLink.href = data.url;
    //     modalLink.style.display = 'inline-block';
    // } else {
    //     modalLink.style.display = 'none';
    // }

    overlay.classList.remove('hidden');
}

function hideModal() {
    overlay.classList.add('hidden');
    // Optional: Reset modal content if needed
    // modalTitle.textContent = '';
    // modalDescription.textContent = '';
    // modalImage.src = '';
    // modalLink.href='#';
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta(); // Time since last frame (useful for consistent speed)
    const t = clock.getElapsedTime(); // Total time elapsed

    // --- Snowball Movement (Current: Circular Path) ---
    // TODO: Replace this with your desired movement logic (e.g., keyboard input)
    snowball.position.x = Math.sin(t * 0.5) * 10; // Slower rotation
    snowball.position.z = Math.cos(t * 0.5) * 10;

    // Add rolling animation if snowball moves
    // Example: If moving along Z, rotate around X
    // snowball.rotation.x += movementSpeed * delta; // Adjust axis based on direction

    // Update controls if they change (e.g., target follows snowball)
    // controls.update();

    // Make frames always face the camera (optional "Billboard" effect)
    // clickableFrames.forEach(frame => {
    //     frame.lookAt(camera.position);
    // });


    renderer.render(scene, camera);
}
