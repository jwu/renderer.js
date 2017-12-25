attribute vec3 a_position;
attribute vec3 a_normal;

varying vec3 pos_w;
varying vec3 normal_w;

uniform mat4 model;
uniform mat4 viewProj;
uniform mat3 normalMatrix;

#if defined(USE_NORMAL_TEXTURE) || defined(USE_ALBEDO_TEXTURE) || defined(USE_METALLIC_ROUGHNESS_TEXTURE) || defined(USE_METALLIC_TEXTURE) || defined(USE_ROUGHNESS_TEXTURE) || defined(USE_AO_TEXTURE) || defined(USE_OPACITY_TEXTURE)
  attribute vec2 a_uv0;
  varying vec2 uv0;
#endif

#ifdef USE_SKINNING
  #include <skinning.vert>
#endif

#ifdef USE_SHADOW_MAP
  #if NUM_SHADOW_LIGHTS > 0
    #pragma for id in range(0, NUM_SHADOW_LIGHTS)
      uniform mat4 lightViewProjMatrix_{id};
      uniform float minDepth_{id};
      uniform float maxDepth_{id};
      varying vec4 pos_lightspace_{id};
      varying float vDepth_{id};
    #pragma endFor
  #endif
#endif

void main () {
  vec4 pos = vec4(a_position, 1);

  #ifdef USE_SKINNING
    mat4 skinMat = skinMatrix();
    pos = skinMat * pos;
  #endif

  pos_w = (model * pos).xyz;
  pos = viewProj * model * pos;

  #if defined(USE_NORMAL_TEXTURE) || defined(USE_ALBEDO_TEXTURE) || defined(USE_METALLIC_ROUGHNESS_TEXTURE) || defined(USE_METALLIC_TEXTURE) || defined(USE_ROUGHNESS_TEXTURE) || defined(USE_AO_TEXTURE) || defined(USE_OPACITY_TEXTURE)
    uv0 = a_uv0;
  #endif

  vec4 normal = vec4(a_normal, 0);
  #ifdef USE_SKINNING
    normal = skinMat * normal;
  #endif
  normal_w = normalMatrix * normal.xyz;

  #ifdef USE_SHADOW_MAP
    #if NUM_SHADOW_LIGHTS > 0
      #pragma for id in range(0, NUM_SHADOW_LIGHTS)
        pos_lightspace_{id} = lightViewProjMatrix_{id} * vec4(pos_w, 1.0);
        vDepth_{id} = (pos_lightspace_{id}.z + minDepth_{id}) / (minDepth_{id} + maxDepth_{id});
      #pragma endFor
    #endif
  #endif

  gl_Position = pos;
}