#ifdef USE_NORMAL_TEXTURE
#extension GL_OES_standard_derivatives : enable
#endif

#ifdef USE_TEX_LOD
#extension GL_EXT_shader_texture_lod: enable
#endif

#include <common.frag>
#include <gamma-correction.frag>
#include <pbr-lighting.frag>

#ifdef USE_SHADOW_MAP
  #include <packing.frag>
  #include <shadow-mapping.frag>
#endif

uniform vec3 eye;

varying vec3 pos_w;
varying vec3 normal_w;

#if defined(USE_NORMAL_TEXTURE) || defined(USE_ALBEDO_TEXTURE) || defined(USE_METALLIC_ROUGHNESS_TEXTURE) || defined(USE_METALLIC_TEXTURE) || defined(USE_ROUGHNESS_TEXTURE) || defined(USE_AO_TEXTURE) || defined(USE_OPACITY_TEXTURE)
  varying vec2 uv0;
#endif

#ifdef USE_IBL
  uniform samplerCube diffuseEnvTexture;
  uniform samplerCube specularEnvTexture;
  uniform sampler2D brdfLUT;
  #ifdef USE_TEX_LOD
    uniform float maxReflectionLod;
  #endif
#endif

// material parameters
uniform vec4 albedo;
#ifdef USE_ALBEDO_TEXTURE
  uniform vec2 albedoTiling;
  uniform vec2 albedoOffset;
  uniform sampler2D albedoTexture;
#endif

#ifdef USE_METALLIC_ROUGHNESS_TEXTURE
  uniform vec2 metalRoughnessTiling;
  uniform vec2 metalRoughnessOffset;
  uniform vec2 sampler2D metalRoughnessTexture;
#endif

uniform float metallic;
#ifdef USE_METALLIC_TEXTURE
  uniform vec2 metallicTiling;
  uniform vec2 metallicOffset;
  uniform sampler2D metallicTexture;
#endif

uniform float roughness;
#ifdef USE_ROUGHNESS_TEXTURE
  uniform vec2 roughnessTiling;
  uniform vec2 roughnessOffset;
  uniform sampler2D roughnessTexture;
#endif

uniform float ao;
#ifdef USE_AO_TEXTURE
  uniform vec2 aoTiling;
  uniform vec2 aoOffset;
  uniform sampler2D aoTexture;
#endif

#ifdef USE_ALPHA_TEST
  uniform float alphaTestThreshold;
#endif

#ifdef USE_NORMAL_TEXTURE
  uniform vec2 normalMapTiling;
  uniform vec2 normalMapOffset;
  uniform sampler2D normalTexture;
  // get world-space normal from normal texture
  vec3 getNormalFromTexture() {
    vec3 tangentNormal = texture2D(normalTexture, uv0).rgb * 2.0 - 1.0;
    vec3 q1  = dFdx(pos_w);
    vec3 q2  = dFdy(pos_w);
    vec2 uv  = uv0 * normalMapTiling + normalMapOffset;
    vec2 st1 = dFdx(uv);
    vec2 st2 = dFdy(uv);
    vec3 N   = normalize(normal_w);
    vec3 T   = normalize(q1*st2.t - q2*st1.t);
    vec3 B   = -normalize(cross(N, T));
    mat3 TBN = mat3(T, B, N);

    return normalize(TBN * tangentNormal);
  }
#endif

// Cook-Torrance BRDF model
// D() Normal distribution function (Trowbridge-Reitz GGX)
// https://disney-animation.s3.amazonaws.com/library/s2012_pbs_disney_brdf_notes_v2.pdf
float distributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;
  float nom   = a2;
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;

  return nom / denom;
}
// G() Geometry function (Smith's Schlick GGX)
// https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
float geometrySchlickGGX(float NdotV, float roughness) {
  float r = (roughness + 1.0);
  float k = (r * r) / 8.0;
  float nom   = NdotV;
  float denom = NdotV * (1.0 - k) + k;

  return nom / denom;
}
float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);
  float ggx2 = geometrySchlickGGX(NdotV, roughness);
  float ggx1 = geometrySchlickGGX(NdotL, roughness);

  return ggx1 * ggx2;
}
// F() Fresnel equation (Fresnel-Schlick approximation)
// Optimized variant (presented by Epic at SIGGRAPH '13)
// https://cdn2.unrealengine.com/Resources/files/2013SiggraphPresentationsNotes-26915738.pdf
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  float fresnel = exp2((-5.55473 * cosTheta - 6.98316) * cosTheta);
  return F0 + (1.0 - F0) * fresnel;
}
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
  float fresnel = exp2((-5.55473 * cosTheta - 6.98316) * cosTheta);
  return F0 + (max(vec3(1.0 - roughness), F0) - F0) * fresnel;
}

// BRDF equation
vec3 brdf(LightInfo lightInfo, vec3 N, vec3 V, vec3 F0, vec3 albedo, float metallic, float roughness) {
  vec3 H = normalize(V + lightInfo.lightDir);
  float NDF = distributionGGX(N, H, roughness);
  float G   = geometrySmith(N, V, lightInfo.lightDir, roughness);
  vec3 F    = fresnelSchlick(max(dot(H, V), 0.0), F0);
  vec3 nominator    = NDF * G * F;
  float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, lightInfo.lightDir), 0.0) + 0.001; // 0.001 to prevent divide by zero.
  vec3 specular = nominator / denominator;
  // kS is equal to Fresnel
  vec3 kS = F;
  // for energy conservation, the diffuse and specular light can't
  // be above 1.0 (unless the surface emits light); to preserve this
  // relationship the diffuse component (kD) should equal 1.0 - kS.
  vec3 kD = vec3(1.0) - kS;
  // multiply kD by the inverse metalness such that only non-metals
  // have diffuse lighting, or a linear blend if partly metal (pure metals
  // have no diffuse light).
  kD *= 1.0 - metallic;
  float NdotL = max(dot(N, lightInfo.lightDir), 0.0);

  return (kD * albedo / PI + specular) * lightInfo.radiance * NdotL;
}


void main() {
  float opacity = 1.0;

  #ifdef USE_ALBEDO_TEXTURE
    vec2 albedoUV  = uv0 * albedoTiling + albedoOffset;
    vec4 baseColor = gammaToLinearSpaceRGBA(texture2D(albedoTexture, albedoUV).rgba);
    vec3 albedo    = baseColor.rgb;
    opacity = baseColor.a;
  #else
    vec4 baseColor = gammaToLinearSpaceRGBA(albedo);
    vec3 albedo    = baseColor.rgb;
    opacity = baseColor.a;
  #endif

  #ifdef USE_ALPHA_TEST
    if(opacity < alphaTestThreshold) discard;
  #endif

  #ifdef USE_METALLIC_ROUGHNESS_TEXTURE
    // Roughness is stored in the 'g' channel, metallic is stored in the 'b' channel.
    // This layout intentionally reserves the 'r' channel for (optional) occlusion map data
    vec2 metalRoughnessUV = uv0 * metalRoughnessTiling + metalRoughnessOffset;
    vec3 metalRoughness = texture2D(metalRoughnessTexture, metalRoughnessUV).rgb;
    float metallic = metalRoughness.b;
    float roughness = metalRoughness.g;
  #else
    #ifdef USE_METALLIC_TEXTURE
      vec2 metallicUV = uv0 * metallicTiling + metallicOffset;
      float metallic  = texture2D(metallicTexture, metallicUV).r;
    #endif
    #ifdef USE_ROUGHNESS_TEXTURE
      vec2 roughnessUV = uv0 * roughnessTiling + roughnessOffset;
      float roughness  = texture2D(roughnessTexture, roughnessUV).r;
    #endif
  #endif

  #ifdef USE_AO_TEXTURE
    vec2 aoUV = uv0 * aoTiling + aoOffset;
    float ao  = texture2D(aoTexture, aoUV).r;
  #endif

  vec3 N = normalize(normal_w);
  #ifdef USE_NORMAL_TEXTURE
    N = getNormalFromTexture();
  #endif
  vec3 V = normalize(eye - pos_w);

  // calculate reflectance at normal incidence; if dia-electric (like plastic) use F0
  // of 0.04 and if it's a metal, use the albedo color as F0 (metallic workflow)
  vec3 F0 = vec3(0.04);
  F0 = mix(F0, albedo, metallic);

  // reflection
  vec3 Lo = vec3(0.0);

  // point light (a 'for' loop to accumulate all light sources)
  #if NUM_POINT_LIGHTS > 0
    #pragma for id in range(0, NUM_POINT_LIGHTS)
      LightInfo pointLight{id};
      pointLight{id} = computePointLighting(point_light{id}_position, pos_w, point_light{id}_color, point_light{id}_range);
      Lo += brdf(pointLight{id}, N, V, F0, albedo, metallic, roughness);
    #pragma endFor
  #endif

  #if NUM_DIR_LIGHTS > 0
    #pragma for id in range(0, NUM_DIR_LIGHTS)
      LightInfo directionalLight{id};
      directionalLight{id} = computeDirectionalLighting(dir_light{id}_direction, dir_light{id}_color);
      Lo += brdf(directionalLight{id}, N, V, F0, albedo, metallic, roughness);
    #pragma endFor
  #endif

  #if NUM_SPOT_LIGHTS > 0
    #pragma for id in range(0, NUM_SPOT_LIGHTS)
      LightInfo spotLight{id};
      spotLight{id} = computeSpotLighting(spot_light{id}_position, pos_w, spot_light{id}_direction, spot_light{id}_color, spot_light{id}_spot, spot_light{id}_range);
      Lo += brdf(spotLight{id}, N, V, F0, albedo, metallic, roughness);
    #pragma endFor
  #endif

  // ambient lighting, will be replaced by IBL if IBL used.
  vec3 ambient = vec3(0.03) * albedo * ao;

  #ifdef USE_IBL
    // generate ambient when using IBL.
    vec3 F = fresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness);
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;
    vec3 diffuseEnv = textureCube(diffuseEnvTexture, N).rgb;
    vec3 diffuse = diffuseEnv * albedo;
    // sample both the specularEnvTexture and the BRDF lut and combine them together as per the Split-Sum approximation to get the IBL specular part.
    vec3 R = reflect(-V, N);
    #ifdef USE_TEX_LOD
      vec3 specularEnv = textureCubeLodEXT(specularEnvTexture, R, roughness * maxReflectionLod).rgb;
    #else
      vec3 specularEnv = textureCube(specularEnvTexture, R).rgb;
    #endif
    vec2 brdf  = texture2D(brdfLUT, vec2(max(dot(N, V), 0.0), roughness)).rg;
    vec3 specular = specularEnv * (F * brdf.x + brdf.y);
    ambient = (kD * diffuse + specular) * ao;
  #endif

  #ifdef USE_SHADOW_MAP
    float shadow = 1.0;
    #if NUM_SHADOW_LIGHTS > 0
      #pragma for id in range(0, NUM_SHADOW_LIGHTS)
        shadow *= computeShadowESM(shadowMap_{id}, pos_lightspace_{id}, vDepth_{id}, depthScale_{id}, darkness_{id}, frustumEdgeFalloff_{id});
      #pragma endFor
    #endif
    vec3 color = (ambient + Lo) * shadow;
  #else
    vec3 color = ambient + Lo;
  #endif

  // HDR tone mapping.
  color = color / (color + vec3(1.0));
  // gamma correction.
  vec4 finalColor = vec4(color, opacity);

  gl_FragColor = linearToGammaSpaceRGBA(finalColor);
}