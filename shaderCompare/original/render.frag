precision highp float;
varying vec2 vUv;
uniform sampler2D uState;
uniform float uTime;
uniform vec3 uBaseColor;
uniform vec4 uSecondaryColor;
uniform float uRoughness;
uniform float uMetalness;
uniform sampler2D uImageTexture;
uniform bool uGlassEffect
uniform float uToneMappingDenominator


uniform bool uSmoothNormals
uniform float uLightPosZ
uniform vec3 uSpecularColor
uniform bool uSpotlightDampening

// Return to original PBR parameters
const float roughness = 0.2;
const float metalness = 0.0;
const vec3 baseColor = vec3(0.1,0.01, 0.8);

vec3 calculateNormal(vec2 uv) {
    vec2 texel = vec2(1.0) / vec2(textureSize(uState, 0));
    float left = texture2D(uState, uv - vec2(texel.x, 0.0)).b;
    float right = texture2D(uState, uv + vec2(texel.x, 0.0)).b;
    float top = texture2D(uState, uv - vec2(0.0, texel.y)).b;
    float bottom = texture2D(uState, uv + vec2(0.0, texel.y)).b;
    
    vec3 normal = normalize(vec3(
        (right - left) * 2.0,
        (bottom - top) * 2.0,
        1.0
    ));
    
    // Smooth normals based on height
    if(uSmoothNormals) {
        float height = texture2D(uState, uv).b;
        return mix(vec3(0.0, 0.0, 1.0), normal, smoothstep(0.1, 0.8, height));
    }
    return normal;
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
    vec3 lightPos = vec3(2.0 * cos(uTime * 0.5), 2.0 * sin(uTime * 0.5), uLightPosZ);
    vec3 viewPos = vec3(0.0, 0.0, 2.0);
    vec3 worldPos = vec3(vUv * 2.0 - 1.0, height);
    
    vec3 N = normal;
    vec3 V = normalize(viewPos - worldPos);
    vec3 L = normalize(lightPos - worldPos);
    vec3 H = normalize(V + L);
    
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float HdotV = max(dot(H, V), 0.0);
    
    vec3 F0 = mix(uSpecularColor, baseColor, metalness);
    vec3 F = fresnelSchlick(HdotV, F0);
    float D = ggxDistribution(NdotH, roughness);
    float G = geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
    
    // Apply height-based specular dampening while keeping original material properties
    vec3 specular = (D * F * G) / (4.0 * NdotV * NdotL + 0.001);
    specular *= uSpotlightDampening ? smoothstep(0.0, 0.3, height) : 1.0; // This line controls spotlight visibility
    
    vec3 kD = (vec3(1.0) - F) * (1.0 - metalness);
    vec3 diffuse = kD * baseColor / 3.14159;
    
    vec3 color = (diffuse + specular) * NdotL;
    
    // Original emission and ambient values
    // color += baseColor * mass * 0.399;
    // color += baseColor * 0.29;
    // if(uSecondaryColor.a > 0.0) {
    //     color += uSecondaryColor.rgb * uSecondaryColor.a * mass;
    // } else {
    //     color += baseColor * mass * 0.399;
    // }
    color += mix(baseColor * mass * 0.399, uSecondaryColor.rgb * uSecondaryColor.a * mass, step(0.0, uSecondaryColor.a));
    color += uBaseColor;

    if(uGlassEffect) {
        // Sample the image texture with UV distortion based on height and mass
        vec2 distortedUV = vUv + normal.xy * height * 0.1;
        vec3 imageColor = texture2D(uImageTexture, distortedUV).rgb;
        // Create a more dynamic blend factor
        float blendFactor = smoothstep(0.0, 0.8, mass * 0.7 + height * 0.5);
        // Blend colors with distortion
        vec3 distortedColor = mix(
            imageColor,
            color,
            blendFactor
        );
            color = mix(
        distortedColor,
        color + imageColor * mass,
        blendFactor * 0.7
    );

        if (blendFactor > 0.1) {
        vec2 aberrationOffset = normal.xy * height * 0.02;
        vec3 redChannel = texture2D(uImageTexture, distortedUV + aberrationOffset).rgb;
        vec3 blueChannel = texture2D(uImageTexture, distortedUV - aberrationOffset).rgb;
        color.r = mix(color.r, redChannel.r, blendFactor * 0.3);
        color.b = mix(color.b, blueChannel.b, blendFactor * 0.3);
    }
    }
    
    // Original tone mapping and gamma correction
    color = color / (color + vec3(1.0));
    color = pow(color, vec3(1.0/uToneMappingDenominator));
    
    gl_FragColor = vec4(color, 1.0);
}