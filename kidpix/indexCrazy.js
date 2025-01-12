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
  width: window.innerWidth,
  height: window.innerHeight
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

//Screen resolution
const resolution = new THREE.Vector3(
  sizes.width,
  sizes.height,
  window.devicePixelRatio
);

/**
 * Render Buffers
 */
// Create a new framebuffer we will use to render to
// the video card memory
let renderBufferA = new THREE.WebGLRenderTarget(
    sizes.width,
    sizes.height,
    {
        // In this demo UV coordinates are float values in the range of [0,1]. 
        // If you render these values into a 32bit RGBA buffer (a render target in format RGBA and type UnsignedByte), you will lose precision since you can only store 8 bit (256 possible integer values) per color channel. 
        // This loss is visible if you use the sampled uv coordinates for a texture fetch.
        // You can fix the issue if you add this parameter when creating the render target type: THREE.FloatType. 
        // The underlying texture is now a float texture that can hold your uv coordinates and retain precision.
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        stencilBuffer: false
    }
)

let renderBufferB = new THREE.WebGLRenderTarget(
    sizes.width,
    sizes.height,
    {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        stencilBuffer: false
    }
)

// Buffer Material
const bufferMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTexture: { value: dataTexture },
        uResolution: {
            value: resolution
        },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0 }
    },
    vertexShader: document.getElementById("vertexShader").textContent,
  fragmentShader: document.getElementById("fragmentShaderBuffer").textContent
});

//Screen Material
const quadMaterial = new THREE.ShaderMaterial({
  uniforms: {
    //The screen will receive it's texture from our off screen framebuffer
    uTexture: { value: null },
    uResolution: {
      value: resolution
    }
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
const renderer = new THREE.WebGLRenderer()
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement);

const onWindowResize = () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    // camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    //update uniforms
    quadMaterial.uniforms.uResolution.value.x = sizes.width
    quadMaterial.uniforms.uResolution.value.y = sizes.height
}

window.addEventListener('resize', onWindowResize)

/**
 * Camera
 */
// Base camera
const camera = new THREE.OrthographicCamera(- 1, 1, 1, - 1, 0, 1);


/**
 * Animate
 */

const tick = () => {
    // Update time uniform
    bufferMaterial.uniforms.uTime.value += 0.016;
    
    // Explicitly set renderBufferA as the framebuffer to render to
    //the output of this rendering pass will be stored in the texture associated with renderBufferA
    renderer.setRenderTarget(renderBufferA)
    // This will contain the ping-pong accumulated texture
    renderer.render(bufferScene, camera)
  
    mesh.material.uniforms.uTexture.value = renderBufferA.texture;
    //This will set the default framebuffer (i.e. the screen) back to being the output
    renderer.setRenderTarget(null)
  //Render to screen
    renderer.render(scene, camera);
  
    // Ping-pong the framebuffers by swapping them
    // at the end of each frame render
    //Now prepare for the next cycle by swapping renderBufferA and renderBufferB
    //so that the previous frame's *output* becomes the next frame's *input*
    const temp = renderBufferA
    renderBufferA = renderBufferB
    renderBufferB = temp
    bufferMaterial.uniforms.uTexture.value = renderBufferB.texture;


    // Call tick again on the next frame
    window.requestAnimationFrame(tick)

}

window.addEventListener('mousemove', (event) => {
    bufferMaterial.uniforms.uMouse.value.x = event.clientX / sizes.width
    bufferMaterial.uniforms.uMouse.value.y = event.clientY / sizes.height
})

tick()


/**
 * CREATE RANDOM NOISY TEXTURE
 */

function createDataTexture() {
  // create a buffer with color data

  var size = sizes.width * sizes.height;
  var data = new Uint8Array(4 * size);

  for (var i = 0; i < size; i++) {
    var stride = i * 4;

    if (Math.random() < 0.5) {
      data[stride] = 255;
      data[stride + 1] = 255;
      data[stride + 2] = 255;
      data[stride + 3] = 255;
    } else {
      data[stride] = 0;
      data[stride + 1] = 0;
      data[stride + 2] = 0;
      data[stride + 3] = 255;
    }
  }

  // used the buffer to create a DataTexture

  console.log(data);
  var texture = new THREE.DataTexture(
    data,
    sizes.width,
    sizes.height,
    THREE.RGBAFormat
  );

  // just a weird thing that Three.js wants you to do after you set the data for the texture
  texture.needsUpdate = true;

  return texture;
}
