import * as THREE from 'three';

/**
 * Base
 */

// Scenes
const scene = new THREE.Scene();
const bufferScene = new THREE.Scene();

/**
 * Sizes
 */
const sizes = {
  width: 512,
  height: 512
};

/**
 * Textures
 */
const dataTexture = createDataTexture();

/**
 * Meshes
 */
// Geometry
const geometry = new THREE.PlaneGeometry(2, 2);

// Calculate simulation size with intentional stretch
const getSimulationSize = () => {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const baseResolution = 512; // Base resolution for height
    const stretchFactor = .8; // Adjust this to control amount of stretch
    
    // Always make width wider by stretchFactor
    return {
        width: Math.round(baseResolution * aspectRatio * stretchFactor),
        height: baseResolution
    };
};

const simulationSize = getSimulationSize();

/**
 * Render Buffers
 */
// 1. Create render targets with calculated size
const renderTargetOptions = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType
};

let renderBufferA = new THREE.WebGLRenderTarget(
    simulationSize.width,
    simulationSize.height,
    renderTargetOptions
);

let renderBufferB = new THREE.WebGLRenderTarget(
    simulationSize.width,
    simulationSize.height,
    renderTargetOptions
);

// Buffer Material
const bufferMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTexture: { value: dataTexture },
        uPreviousState: { value: null }, // Will be set to renderBufferB.texture
        uResolution: { value: new THREE.Vector2(simulationSize.width, simulationSize.height) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uIsMouseDown: { value: false },
        uTime: { value: 0.0 },
        uNoiseFactor: { value: 0.05 },
        uNeighborThreshold: { value: 0.99 },
        uSpeed: { value: 0.15 }
    },
    vertexShader: document.getElementById("vertexShader").textContent,
    fragmentShader: document.getElementById("fragmentShaderBuffer").textContent
});

//Screen Material
const quadMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uState: { value: null },  // This will receive the buffer texture
        uTime: { value: 0.0 },
        uBaseColor: { value: new THREE.Vector3(0.8, 0.91, 0.8) },  // Default blue-ish color
        uSecondaryColor: { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.0) },  // Default orange with alpha
        uRoughness: { value: 0.2 },
        uMetalness: { value: 0.0 },
        uNeighborThreshold: { value: 0.999 },
        uNoiseFactor: { value: 0.0 },
        uSpeed: { value: 0.15 }
    },
    vertexShader: document.getElementById("vertexShader").textContent,
    fragmentShader: document.getElementById("fragmentShaderScreen").textContent
});
// Meshes
const mesh = new THREE.Mesh(geometry, quadMaterial);
scene.add(mesh)

// Meshes
const bufferMesh = new THREE.Mesh(geometry, bufferMaterial);
bufferScene.add(bufferMesh)
/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ 
    powerPreference: 'high-performance',
    antialias: false // Disable if not needed
})
renderer.setSize(window.innerWidth, window.innerHeight)
// renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

// 2. Optimize resize handler with debouncing
const debounce = (fn, delay) => {
    let timeoutId
    return (...args) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }
}

const onResize = () => {
    const newSize = getSimulationSize();
    
    // Update render targets
    renderBufferA.setSize(newSize.width, newSize.height);
    renderBufferB.setSize(newSize.width, newSize.height);
    
    // Update resolution uniform
    resolution.set(newSize.width, newSize.height);
    
    // Update renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
};

window.addEventListener('resize', onResize);

/**
 * Camera
 */
// Base camera
const camera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);


/**
 * Animate
 */

const tick = () => {
    // Update time uniforms for both materials
    bufferMaterial.uniforms.uTime.value += 0.01;
    quadMaterial.uniforms.uTime.value += 0.01;
    
    // Update previous state uniform
    bufferMaterial.uniforms.uPreviousState.value = renderBufferB.texture;
    
    // Render to buffer
    renderer.setRenderTarget(renderBufferA);
    renderer.render(bufferScene, camera);
  
    // Update screen material with new state
    quadMaterial.uniforms.uState.value = renderBufferA.texture;
    
    // Render to screen
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  
    // Swap buffers
    const temp = renderBufferA;
    renderBufferA = renderBufferB;
    renderBufferB = temp;

    window.requestAnimationFrame(tick);
}

// 3. Optimize mouse move handler with throttling
const throttle = (fn, delay) => {
    let last = 0
    return (...args) => {
        const now = Date.now()
        if (now - last >= delay) {
            fn(...args)
            last = now
        }
    }
}

window.addEventListener('mousemove', throttle((event) => {
    bufferMaterial.uniforms.uIsMouseDown.value = true;
    bufferMaterial.uniforms.uMouse.value.set(
        event.clientX / window.innerWidth,
        1.0 - (event.clientY / window.innerHeight)
    )
}, 16)) // ~60fps

// Add mouse down/up event listeners
window.addEventListener('mousedown', () => {
    bufferMaterial.uniforms.uIsMouseDown.value = true;
});

window.addEventListener('mouseup', () => {
    bufferMaterial.uniforms.uIsMouseDown.value = false;
});

tick()


/**
 * CREATE EMPTY TEXTURE
 */
function createDataTexture() {
    const size = sizes.width * sizes.height;
    const data = new Uint8Array(4 * size).fill(0); // Initialize all pixels to black
    
    // Set alpha channel to fully opaque
    for (let i = 3; i < data.length; i += 4) {
        data[i] = 255;
    }

    const texture = new THREE.DataTexture(
        data,
        sizes.width,
        sizes.height,
        THREE.RGBAFormat
    );
    texture.needsUpdate = true;
    return texture;
}
