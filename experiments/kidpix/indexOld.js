import * as THREE from 'three';

async function loadShader(path) {
    const response = await fetch(path);
    return response.text();
}

export class SlimeSimulation {
    constructor() {
        this.init();
        this.animate();
    }

    init() {
        this.initScene();
        this.camera.position.z = 5;
        window.addEventListener('resize', () => this.onWindowResize());
        this.renderer.render(this.scene, this.camera);
    }

    async initScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('.container') });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.quad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.MeshBasicMaterial()
        );
        this.scene.add(this.quad);
        this.renderer.render(this.scene, this.camera);
        await this.initShaders();
        this.initSimulation();
        this.quad.material = this.renderMaterial;
    }

    async initShaders() {
        this.vertexShader = await loadShader('./sim.vert');
        this.simulationShader = await loadShader('./sim.frag');
        this.renderShader = await loadShader('./render.frag');
        
        console.log('Vertex Shader:', this.vertexShader);
        console.log('Render Shader:', this.renderShader);
    }

    initSimulation() {
        const size = 512;
        this.size = size;
        
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

        this.simulationMaterial = new THREE.ShaderMaterial({
            vertexShader: this.vertexShader,
            fragmentShader: this.simulationShader,
            uniforms: {
                uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                uTexture: { value: null }
            }
        });

        this.renderMaterial = new THREE.ShaderMaterial({
            vertexShader: this.vertexShader,
            fragmentShader: this.renderShader,
            uniforms: {
                uState: { value: this.renderTargets[0].texture }
            }
        });

    }

    onMouseMove(event) {
        this.simulationMaterial.uniforms.uMouse.value.set(event.clientX / window.innerWidth, event.clientY / window.innerHeight);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

const slimeSimulation = new SlimeSimulation();
slimeSimulation.init();