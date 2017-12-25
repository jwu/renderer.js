// gamma-correction
// approximate version from http://chilliant.blogspot.com.au/2012/08/srgb-approximations-for-hlsl.html?m=1
// also used by Unity builtin shaders(2017.2.0f3)
vec4 gammaToLinearSpaceRGBA(vec4 sRGBA) { // TODO: use half maybe better.
  return sRGBA * (sRGBA * (sRGBA * 0.305306011 + 0.682171111) + 0.012522878);
}

vec4 linearToGammaSpaceRGBA(vec4 lRGBA) { // TODO: use half maybe better.
  lRGBA = max(lRGBA, vec4(0.0));
  return max(1.055 * pow(lRGBA, vec4(0.416666667)) - vec4(0.055), vec4(0.0));
}

vec3 gammaToLinearSpaceRGB(vec3 sRGB) { // TODO: use half maybe better.
  return sRGB * (sRGB * (sRGB * 0.305306011 + 0.682171111) + 0.012522878);
}

vec3 linearToGammaSpaceRGB(vec3 lRGB) { // TODO: use half maybe better.
  lRGB = max(lRGB, vec3(0.0));
  return max(1.055 * pow(lRGB, vec3(0.416666667)) - vec3(0.055), vec3(0.0));
}

// exact version
float gammaToLinearSpaceExact(float val) {
  if (val <= 0.04045) {
    return val / 12.92;
  } else if (val < 1.0) {
    return pow((val + 0.055) / 1.055, 2.4);
  } else {
    return pow(val, 2.2);
  }
}

float linearToGammaSpaceExact(float val) {
  if (val <= 0.0) {
    return 0.0;
  } else if (val <= 0.0031308) {
    return 12.92 * val;
  } else if (val < 1.0) {
    return 1.055 * pow(val, 0.4166667) - 0.055;
  } else {
    return pow(val, 0.45454545);
  }
}