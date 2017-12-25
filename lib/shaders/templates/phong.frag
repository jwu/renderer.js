#ifdef USE_NORMAL_TEXTURE
#extension GL_OES_standard_derivatives : enable
#endif

#include <common.frag>
#include <gamma-correction.frag>
#include <phong-lighting.frag>

#ifdef USE_SHADOW_MAP
  #include <packing.frag>
  #include <shadow-mapping.frag>
#endif

uniform vec3 eye;
uniform vec3 sceneAmbient;

varying vec3 normal_w;
varying vec3 pos_w;

#if defined(USE_NORMAL_TEXTURE) || defined(USE_DIFFUSE_TEXTURE) || defined(USE_EMISSIVE_TEXTURE) || defined(USE_OPACITY_TEXTURE)
  varying vec2 uv0;
#endif

struct phongMaterial
{
  vec3 diffuse;
  vec3 emissive;
  vec3 specular;
  float glossiness;
  float opacity;
};

uniform vec4 diffuseColor;
#ifdef USE_DIFFUSE_TEXTURE
  uniform vec2 diffuseTiling;
  uniform vec2 diffuseOffset;
  uniform sampler2D diffuseTexture;
#endif

uniform vec3 emissiveColor;
#ifdef USE_EMISSIVE_TEXTURE
  uniform vec2 emissiveTiling;
  uniform vec2 emissiveOffset;
  uniform sampler2D emissiveTexture;
#endif

uniform vec3 specularColor;
uniform float glossiness;
#ifdef USE_SPECULAR_TEXTURE
  uniform vec2 specularTiling;
  uniform vec2 specularOffset;
  uniform sampler2D specularTexture;
#endif

#ifdef USE_NORMAL_TEXTURE
  uniform vec2 normalMapTiling;
  uniform vec2 normalMapOffset;
  uniform sampler2D normalTexture;
  uniform float normalScale;  //this is not used yet
  vec3 getNormal(vec3 pos, vec3 normal) {
    vec3 q0 = vec3( dFdx( pos.x ), dFdx( pos.y ), dFdx( pos.z ) );
    vec3 q1 = vec3( dFdy( pos.x ), dFdy( pos.y ), dFdy( pos.z ) );
    vec2 uv = uv0 * normalMapTiling + normalMapOffset;
    vec2 st0 = dFdx( uv.st );
    vec2 st1 = dFdy( uv.st );
    vec3 S = normalize( q0 * st1.t - q1 * st0.t );
    vec3 T = normalize( -q0 * st1.s + q1 * st0.s );
    vec3 N = normalize( normal );
    vec3 mapN = texture2D(normalTexture, uv0).rgb * 2.0 - 1.0;
    mapN.xy = 1.0 * mapN.xy;
    mat3 tsn = mat3( S, T, N );
    return normalize( tsn * mapN );
  }
#endif

#ifdef USE_ALPHA_TEST
  uniform float alphaTestThreshold;
#endif

phongMaterial getPhongMaterial() {
  phongMaterial result;
  vec2 uv;

  #ifdef USE_DIFFUSE_TEXTURE
    uv = uv0 * diffuseTiling + diffuseOffset;
    vec4 baseColor = gammaToLinearSpaceRGBA(texture2D(diffuseTexture, uv).rgba);
    result.diffuse = baseColor.rgb;
    result.opacity = baseColor.a;
  #else
    vec4 baseColor = gammaToLinearSpaceRGBA(diffuseColor);
    result.diffuse = baseColor.rgb;
    result.opacity = baseColor.a;
  #endif

  result.emissive = emissiveColor;
  #ifdef USE_EMISSIVE_TEXTURE
    uv = uv0 * emissiveTiling + emissiveOffset;
    result.emissive = gammaToLinearSpaceRGB(texture2D(emissiveTexture, uv).rgb);
  #endif

  result.specular = specularColor;
  #ifdef USE_SPECULAR_TEXTURE
    uv = uv0 * specularTiling + specularOffset;
    result.specular = gammaToLinearSpaceRGB(texture2D(specularTexture, uv).rgb);
  #endif

  result.glossiness = glossiness;

  return result;
}

vec4 composePhongShading(LightInfo lighting, phongMaterial mtl, float shadow)
{
  vec4 o = vec4(0.0, 0.0, 0.0, 1.0);

  //diffuse is always calculated
  o.xyz = lighting.diffuse * mtl.diffuse;
  o.xyz += mtl.emissive;
  o.xyz += lighting.specular * mtl.specular;
  o.xyz *= shadow;
  o.w = mtl.opacity;

  return o;
}

void main () {
  LightInfo phongLighting;
  vec3 viewDirection = normalize(eye - pos_w);

  phongMaterial mtl = getPhongMaterial();
  #ifdef USE_ALPHA_TEST
    if(mtl.opacity < alphaTestThreshold) discard;
  #endif
  vec3 normal = normal_w;
  #ifdef USE_NORMAL_TEXTURE
    normal = getNormal(pos_w, normal);
  #endif
  phongLighting = getPhongLighting(normal, pos_w, viewDirection, mtl.glossiness);
  phongLighting.diffuse += sceneAmbient;

  #ifdef USE_SHADOW_MAP
    float shadow = 1.0;
    #if NUM_SHADOW_LIGHTS > 0
      #pragma for id in range(0, NUM_SHADOW_LIGHTS)
        shadow *= computeShadowESM(shadowMap_{id}, pos_lightspace_{id}, vDepth_{id}, depthScale_{id}, darkness_{id}, frustumEdgeFalloff_{id});
      #pragma endFor
    #endif
    vec4 finalColor = composePhongShading(phongLighting, mtl, shadow);
  #else
    vec4 finalColor = composePhongShading(phongLighting, mtl, 1.0);
  #endif

  gl_FragColor = linearToGammaSpaceRGBA(finalColor);
}