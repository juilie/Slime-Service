 precision highp float;
        varying vec2 vUv;
        uniform sampler2D uPreviousState;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform bool uIsMouseDown;
        uniform float uTime;
        uniform float uNoiseFactor;
        uniform float uBirthRate;
        uniform float uDeathRate;
        uniform float uSustainRate;
        uniform float uSpeed;
        uniform float uSampleRadius;
        uniform float uGrowthTarget;
        uniform float uMouseMass;
        uniform float uMouseRadius;
        // Continuous neighborhood counting
        vec4 getNeighborhood(vec2 uv) {
            vec2 texel = 1.0 / uResolution;
            float alive = 0.0;
            float total = 0.0;
            
            // Sample in a radius around the current position
            float radius = uSampleRadius;
            float count = 0.0;
            
            for(float y = -radius; y <= radius; y++) {
                for(float x = -radius; x <= radius; x++) {
                    vec2 offset = vec2(x, y) * texel;
                    float dist = length(offset * uResolution / radius);
                    
                    // Only count cells within a circle
                    if(dist <= radius) {
                        // Gaussian weight based on distance
                        float weight = exp(-dist * dist / 4.0);
                        
                        vec4 state = texture2D(uPreviousState, uv + offset);
                        alive += state.r * weight;
                        total += weight;
                        count += 1.0;
                    }
                }
            }
            
            // Normalize the count to 0-1 range
            alive = alive / total;
            
            // Calculate how close we are to having "3 neighbors"
            // Map the continuous value to peak at 3/8 (equivalent to 3 neighbors in discrete version)
            float neighborFactor = 1.0 - abs(alive - 0.375) * 4.0;
            
            return vec4(alive, neighborFactor, count, total);
        }

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
            vec4 prevState = texture2D(uPreviousState, vUv);
            vec4 neighborhood = getNeighborhood(vUv);
            
            float currentMass = prevState.r;
            float currentVelocity = prevState.g;
            float currentHeight = prevState.b;
            
            // Calculate state change based on neighborhood
            float neighborFactor = neighborhood.y;
            float targetMass = 0.0;
            
            // Birth rule (continuous version of "exactly 3 neighbors")
            if(neighborFactor > uBirthRate) {
                targetMass = uGrowthTarget;
            }
            // Death rule (continuous version of underpopulation/overpopulation)
            else if(neighborFactor < uDeathRate) {
                targetMass = 0.0;
            }
            // Sustain current state with slight decay
            else {
                targetMass = currentMass * uSustainRate;
            }
            
            // Add some noise and movement
            float noise = hash(vUv + vec2(uTime * 0.01));
            
            // Calculate new state
            float newMass = mix(currentMass, targetMass, uSpeed) + (noise - 0.5) * uNoiseFactor;
            float newVelocity = currentVelocity * 0.95;
            float newHeight = currentHeight * 0.98 + newMass * 0.1;
            
            // Mouse interaction
            vec2 mouseDist = vUv - uMouse;
            // Adjust for aspect ratio
            mouseDist.x *= uResolution.x / uResolution.y;

            if(uIsMouseDown && length(mouseDist) < uMouseRadius) {
                // Create a more organic, lumpy pattern
                float distFactor = 1.0 - length(mouseDist) / uMouseRadius;
                float angle = atan(mouseDist.y, mouseDist.x);
                
                // Add some variation based on angle and time
                float variation = sin(angle * 8.0 + uTime * 2.0) * 0.3 + 
                                 sin(angle * 4.0 - uTime * 3.0) * 0.2;
                
                // Modulate the mass and height based on the variation
                newMass = uMouseMass + variation * distFactor * 0.3;
                newHeight += (0.3 + variation * 0.2) * distFactor;
                newVelocity += length(mouseDist) * (1.0 + variation) * 2.0;
            }
            
            // Ensure values stay in valid range
            newMass = clamp(newMass, 0.0, 1.0);
            newHeight = clamp(newHeight, 0.0, 1.0);
            
            gl_FragColor = vec4(newMass, newVelocity, newHeight, 1.0);
        }