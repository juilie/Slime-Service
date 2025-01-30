  precision highp float;
        varying vec2 vUv;
        uniform sampler2D uState;
        uniform float uTime;

        uniform vec3 uBaseColor;
        uniform vec4 uSecondaryColor;
        uniform float uRoughness;
        uniform float uMetalness;

        vec3 calculateNormal(vec2 uv) {
            vec2 texel = vec2(1.0) / vec2(textureSize(uState, 0));
            float left = texture2D(uState, uv - vec2(texel.x, 0.0)).b;
            float right = texture2D(uState, uv + vec2(texel.x, 0.0)).b;
            float top = texture2D(uState, uv - vec2(0.0, texel.y)).b;
            float bottom = texture2D(uState, uv + vec2(0.0, texel.y)).b;
            
            return normalize(vec3(
                (right - left) * 4.0, // Increased normal strength
                (bottom - top) * 4.0,
                0.8 // Adjusted Z component for more pronounced effect
            ));
        }

        float ggxDistribution(float NdotH, float roughness) {
            float alpha = roughness * roughness;
            float alpha2 = alpha * alpha;
            float NdotH2 = NdotH * NdotH;
            float denom = NdotH2 * (alpha2 - 1.0) + 1.0;
            return alpha2 / (3.14159 * denom * denom);
        }

        float geometrySchlickGGX(float NdotV, float roughness) {
            float r = roughness + 1.0;
            float k = (r * r) / 8.0;
            return NdotV / (NdotV * (1.0 - k) + k);
        }

        vec3 fresnelSchlick(float cosTheta, vec3 F0) {
            return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
        }

        void main() {
            vec4 state = texture2D(uState, vUv);
            float mass = state.r;
            float height = state.b;
            
            vec3 normal = calculateNormal(vUv);
            vec3 lightPos = vec3(2.0 * cos(uTime * 0.5), 2.0 * sin(uTime * 0.5), 1.5);
            vec3 viewPos = vec3(0.0, 0.0, 1.5);
            vec3 worldPos = vec3(vUv * 2.0 - 1.0, height * 1.5); // Increased height effect
            
            vec3 N = normal;
            vec3 V = normalize(viewPos - worldPos);
            vec3 L = normalize(lightPos - worldPos);
            vec3 H = normalize(V + L);
            
            float NdotV = max(dot(N, V), 0.0);
            float NdotL = max(dot(N, L), 0.0);
            float NdotH = max(dot(N, H), 0.0);
            float HdotV = max(dot(H, V), 0.0);
            
            vec3 F0 = mix(vec3(0.04), uBaseColor, uMetalness);
            vec3 F = fresnelSchlick(HdotV, F0);
            float D = ggxDistribution(NdotH, uRoughness);
            float G = geometrySchlickGGX(NdotV, uRoughness) * geometrySchlickGGX(NdotL, uRoughness);
            
            vec3 specular = (D * F * G) / (4.0 * NdotV * NdotL + 0.001);
            vec3 kD = (vec3(1.0) - F) * (1.0 - uMetalness);
            vec3 diffuse = kD * uBaseColor / 3.14159;
            
            vec3 color = (diffuse + specular) * NdotL;
            
            // Enhanced emission effect
            color -= uBaseColor * mass * 0.25;
            color.b += mass * 0.02;
            color.g += mass * 0.012;
            
            color += uBaseColor * 0.85;
            
            color = color / (color + vec3(1.0));
            color = pow(color, vec3(1.0/2.2));
            
            gl_FragColor = vec4(color, 1.0);
        }