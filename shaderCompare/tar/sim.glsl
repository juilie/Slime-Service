 precision highp float;
        varying vec2 vUv;
        uniform sampler2D uPreviousState;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform bool uIsMouseDown;
        uniform float uTime;
        uniform float uNoiseFactor;
        uniform float uNeighborThreshold;
        uniform float uSpeed;

        vec4 getNeighborhood(vec2 uv) {
            vec2 texel = 1.0 / uResolution;
            float alive = 0.0;
            float total = 0.0;
            
            // Increased radius for more spread
            float radius = 6.0;
            float count = 0.0;
            
            for(float y = -radius; y <= radius; y++) {
                for(float x = -radius; x <= radius; x++) {
                    vec2 offset = vec2(x, y) * texel;
                    float dist = length(offset * uResolution / radius);
                    
                    if(dist <= radius) {
                        // Adjusted weight calculation for zoomed effect
                        float weight = exp(-dist * dist / 8.0);
                        
                        vec4 state = texture2D(uPreviousState, uv + offset);
                        alive += state.r * weight;
                        total += weight;
                        count += 1.0;
                    }
                }
            }
            
            alive = alive / total;
            float neighborFactor = 1.0 - abs(alive - 0.375) * 4.0;
            
            return vec4(alive, neighborFactor, count, total);
        }

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
            // Scale UV coordinates to create zoom effect
            vec2 zoomedUV = (vUv - 0.5) * 2.0 + 0.5;
            vec4 prevState = texture2D(uPreviousState, vUv);
            vec4 neighborhood = getNeighborhood(vUv);
            
            float currentMass = prevState.r;
            float currentVelocity = prevState.g;
            float currentHeight = prevState.b;
            
            // Adjusted parameters for zoomed view
            float birthRate = 0.99;
            float deathRate = 0.1;
            float sustainRate = 0.985;
            
            float neighborFactor = neighborhood.y;
            float targetMass = 0.0;
            
            if(neighborFactor > uNeighborThreshold) {
                targetMass = 10.0;
            }
            else if(neighborFactor < 0.89) {
                targetMass = 0.0;
            }
            else {
                targetMass = currentMass * sustainRate;
            }
            
            float noise = hash(vUv + vec2(uTime * 0.01));
            float noiseFactor = uNoiseFactor;
            
            float newMass = mix(currentMass, targetMass, uSpeed) + (noise - 0.5) * noiseFactor;
            float newVelocity = currentVelocity * 0.97;
            float newHeight = currentHeight * 0.99 + newMass * 0.15;
            
            // Adjusted mouse interaction for zoomed view
            vec2 mouseDist = vUv - uMouse;
            if(uIsMouseDown && length(mouseDist) < 0.05) {
                newMass = 0.6;
                newHeight += 0.4;
                newVelocity += length(mouseDist) * 3.0;
            }
            
            newMass = clamp(newMass, 0.0, 1.0);
            newHeight = clamp(newHeight, 0.0, 1.0);
            
            gl_FragColor = vec4(newMass, newVelocity, newHeight, 1.0);
        }