import * as THREE from 'three';
import { TransitionManager } from './transManager.js';
import { shaders } from './shaderLoader.js';


async function loadShader(shaderType, name) {
    if (shaderType === 'vert') {
        console.log('vertex shader loading');
        return shaders.vert;
    }
    return shaders[shaderType][name];
}

async function loadTexture(url) {
    return new Promise((resolve) => {
        new THREE.TextureLoader().load(url, resolve);
    });
}

async function loadShaderConfig(shaderName) {
    return shaders[shaderName].config;
}

export class SlimeSimulation {
    constructor(options = {}) {
        this.shaders = ['dissolve', 'glass', 'original', 'image'];
        this.currentShader = options.slimeType ||  'original';
        this.imageUrl = options.imageUrl || null;
        this.init();
    }

    async init() {
        await this.loadCurrentShaderConfig();
        if (this.imageUrl) {
            await this.initImageTexture(this.imageUrl);
        } else {
            // Create a default 1x1 white texture if no image is provided
            const defaultTexture = new THREE.DataTexture(
                new Uint8Array([255, 255, 255, 255]),
                1, 1,
                THREE.RGBAFormat
            );
            defaultTexture.needsUpdate = true;
            this.imageTexture = defaultTexture;
        }
        await this.initRenderer();
        await this.initShaders();
        this.initScene();
        this.initSimulation();
        this.initTransitionState();
        this.addEventListeners();
        this.animate();
        this.mouseTimeout = null;
    }

    loadCurrentShaderConfig = async () => {
        this.currentConfig = await loadShaderConfig(this.currentShader);
    }

    initShaders = async () => {
        this.vertexShader = await loadShader('vert', null);
        this.simulationShader = await loadShader(this.currentShader, 'sim');
        this.renderShader = await loadShader(this.currentShader, 'render');
    }

    initTransitionState() {
        this.transitionManager = new TransitionManager(this.simulationMaterial, this.renderMaterial);
    }

    startTransition(newState) {
        this.transitionManager.startTransition(newState);
    }

    initRenderer = async () => {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quad = new THREE.PlaneGeometry(2, 2);
    }

    initSimulation() {
        const size = 512;
        this.size = size;
        

        // Create render targets for ping-pong (same as before)
        this.renderTargets = [
            new THREE.WebGLRenderTarget(size, size, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.FloatType
            }),
            new THREE.WebGLRenderTarget(size, size, {
                minFilter: THREE.LinearFilter,
                magFilter: THREE.LinearFilter,
                format: THREE.RGBAFormat,
                type: THREE.FloatType
            })
        ];

        // Updated simulation material with config values
        this.simulationMaterial = new THREE.ShaderMaterial({
            vertexShader: this.vertexShader,
            fragmentShader: this.simulationShader,
            uniforms: {
                uPreviousState: { value: null },
                uResolution: { value: new THREE.Vector2(size, size) },
                uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                uIsMouseDown: { value: false },
                uTime: { value: 0 },
                uNoiseFactor: { value: this.currentConfig.noiseFactor },
                uNeighborThreshold: { value: this.currentConfig.neighborThreshold },
                uSpeed: { value: this.currentConfig.speed },
                uZoomFactor: { value: this.currentConfig.zoomFactor },
                uBirthRate: { value: this.currentConfig.birthRate },
                uDeathRate: { value: this.currentConfig.deathRate },
                uSustainRate: { value: this.currentConfig.sustainRate },
                uVelocityDecay: { value: this.currentConfig.velocityDecay },
                uHeightDecay: { value: this.currentConfig.heightDecay },
                uHeightGain: { value: this.currentConfig.heightGain },
                uMouseRadius: { value: this.currentConfig.mouseRadius },
                uMouseForce: { value: this.currentConfig.mouseForce },
                uMouseMassGain: { value: this.currentConfig.mouseMassGain },
                uMouseHeightGain: { value: this.currentConfig.mouseHeightGain },
                uLowerThreshold: { value: this.currentConfig.lowerThreshold },
                uTargetMass: { value: this.currentConfig.targetMass }
            }
        });

        // Updated render material with config values
        this.renderMaterial = new THREE.ShaderMaterial({
            vertexShader: this.vertexShader,
            fragmentShader: this.renderShader,
            uniforms: {
                uState: { value: null },
                uTime: { value: 0 },
                uBaseColor: { 
                    value: new THREE.Vector3(...this.currentConfig.baseColor.slice(0, 3))
                },
                uSecondaryColor: { 
                    value: new THREE.Vector4(...this.currentConfig.secondaryColor)
                },
                uRoughness: { value: this.currentConfig.roughness },
                uMetalness: { value: this.currentConfig.metalness },
                uImageTexture: { value: this.imageTexture }
            }
        });

        // Initialize with random state
        const initialState = new Float32Array(size * size * 4);
        for (let i = 0; i < initialState.length; i += 4) {
            initialState[i] = Math.random() * 0.1; // mass
            initialState[i + 1] = 0; // velocity
            initialState[i + 2] = 0; // height
            initialState[i + 3] = 1; // alpha
        }

        this.renderer.setRenderTarget(this.renderTargets[0]);
        const texture = new THREE.DataTexture(
            initialState, size, size, THREE.RGBAFormat, THREE.FloatType
        );
        texture.needsUpdate = true;

        const mesh = new THREE.Mesh(this.quad, new THREE.MeshBasicMaterial({
            map: texture
        }));
        const tempScene = new THREE.Scene();
        tempScene.add(mesh);
        this.renderer.render(tempScene, this.camera);
        this.renderer.setRenderTarget(null);
    }

    initImageTexture = async (imageUrl) => {
        try {
            this.imageTexture = await loadTexture(imageUrl);
        } catch (error) {
            console.warn('Failed to load image texture:', error);
            // Fallback to a default texture
            const defaultTexture = new THREE.DataTexture(
                new Uint8Array([255, 255, 255, 255]),
                1, 1,
                THREE.RGBAFormat
            );
            defaultTexture.needsUpdate = true;
            this.imageTexture = defaultTexture;
        }
    }

    addEventListeners() {
        window.addEventListener('resize', this.onResize.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
    }

    onResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        this.simulationMaterial.uniforms.uMouse.value.x = event.clientX / window.innerWidth;
        this.simulationMaterial.uniforms.uMouse.value.y = 1 - (event.clientY / window.innerHeight);

        // Set mouse as active
        this.simulationMaterial.uniforms.uIsMouseDown.value = true;

        // Clear any existing timeout
        if (this.mouseTimeout) {
            clearTimeout(this.mouseTimeout);
        }

        // Set new timeout
        this.mouseTimeout = setTimeout(() => {
            this.simulationMaterial.uniforms.uIsMouseDown.value = false;
        }, 20);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const time = performance.now() * 0.001;
        this.simulationMaterial.uniforms.uTime.value = time;
        this.renderMaterial.uniforms.uTime.value = time;

        // Update transitions
        this.transitionManager.update();

        // Simulation step
        this.simulationMaterial.uniforms.uPreviousState.value = this.renderTargets[0].texture;
        this.renderer.setRenderTarget(this.renderTargets[1]);
        this.renderer.render(new THREE.Scene().add(new THREE.Mesh(this.quad, this.simulationMaterial)), this.camera);

        // Render step
        this.renderMaterial.uniforms.uState.value = this.renderTargets[1].texture;
        this.renderer.setRenderTarget(null);
        this.renderer.render(new THREE.Scene().add(new THREE.Mesh(this.quad, this.renderMaterial)), this.camera);

        // Swap buffers
        [this.renderTargets[0], this.renderTargets[1]] = [this.renderTargets[1], this.renderTargets[0]];
    }

    changeShader = async (shaderName) => {
        if (!this.shaders.includes(shaderName)) {
            console.error(`Invalid shader name: ${shaderName}`);
            return;
        }

        this.currentShader = shaderName;
        await this.loadCurrentShaderConfig();
        await this.initShaders();
        
        // Update materials with new config
        this.simulationMaterial.uniforms.uNoiseFactor.value = this.currentConfig.noiseFactor;
        this.simulationMaterial.uniforms.uNeighborThreshold.value = this.currentConfig.neighborThreshold;
        this.simulationMaterial.uniforms.uSpeed.value = this.currentConfig.speed;

        this.renderMaterial.uniforms.uBaseColor.value.set(...this.currentConfig.baseColor.slice(0, 3));
        this.renderMaterial.uniforms.uSecondaryColor.value.set(...this.currentConfig.secondaryColor);
        this.renderMaterial.uniforms.uRoughness.value = this.currentConfig.roughness;
        this.renderMaterial.uniforms.uMetalness.value = this.currentConfig.metalness;
    }

    async updateImage(newImageUrl) {
        if (!newImageUrl) {
            throw new Error('Image URL is required');
        }
        await this.initImageTexture(newImageUrl);
        this.renderMaterial.uniforms.uImageTexture.value = this.imageTexture;
    }
}