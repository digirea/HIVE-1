#ifdef LSGL_ES
#extension GL_LSGL_trace : enable
#extension GL_OES_texture_3D : enable
#endif

#ifdef GL_ES
precision mediump float;
#endif

uniform sampler3D tex0;
uniform vec2      resolution;
uniform vec3      eye;
uniform vec3      lookat;
uniform vec3      up;
uniform vec3      eyedir;
uniform vec3 volumescale;
uniform vec3 volumedim;
uniform vec3 offset;

// Transfer function parameters
uniform sampler2D trans;
uniform float     volumemin;
uniform float     volumemax;
uniform float     tf_opacity;

#define EPS        0.005
#define SAMPLES    500.0
#define num_steps  SAMPLES

vec4 samplingVolume(vec3 texpos) {
	vec4 col = texture3D(tex0, texpos);
	return col;
}

int IntersectP(vec3 rayorg, vec3 raydir, vec3 pMin, vec3 pMax, out float hit0, out float hit1) {
    float t0 = -10000.0, t1 = 10000.0;
    hit0 = t0;
    hit1 = t1;

    vec3 tNear = (pMin - rayorg) / raydir;
    vec3 tFar  = (pMax - rayorg) / raydir;
    if (tNear.x > tFar.x) {
        float tmp = tNear.x;
        tNear.x = tFar.x;
        tFar.x = tmp;
    }
    t0 = max(tNear.x, t0);
    t1 = min(tFar.x, t1);

    if (tNear.y > tFar.y) {
        float tmp = tNear.y;
        tNear.y = tFar.y;
        tFar.y = tmp;
    }
    t0 = max(tNear.y, t0);
    t1 = min(tFar.y, t1);

    if (tNear.z > tFar.z) {
        float tmp = tNear.z;
        tNear.z = tFar.z;
        tFar.z = tmp;
    }
    t0 = max(tNear.z, t0);
    t1 = min(tFar.z, t1);

    if (t0 <= t1) {
        hit0 = t0;
        hit1 = t1;
        return 1;
    }
    return 0;
}

void  main(void) {
	vec3 p;
    vec3 n;
    vec3 dir;
    isectinfo(p, n, dir);

    vec3 rayorg = eye;
	vec3 raydir = p - eye;
    raydir = normalize(raydir);
    vec4 sum   = vec4(0.0, 0.0, 0.0, 0.0);
    vec4 sum_k = vec4(0.0, 0.0, 0.0, 0.0);
    vec3 pmin = vec3(-0.5, -0.5, -0.5) * volumescale + offset;
    vec3 pmax = vec3( 0.5,  0.5,  0.5) * volumescale + offset;
    float tmin, tmax;
    IntersectP(rayorg, raydir, pmin, pmax, tmin, tmax);
	tmin = max(0.0, tmin);
	tmax = max(0.0, tmax);
	
    // raymarch.
    float t = tmin;
    float tstep = (tmax - tmin) / num_steps;
    float cnt = 0.0;
    float subcnt = 0.0;
	float state = 0.0;
	float press  = 0.0;
	float kotai  = 0.0;
	float ekitai = 0.0;
	float count = 0.0;
	float pu  = 0.0;
	float pp  = 0.0;
	float phi = 0.0;
	float psi = 0.0;
	
	vec3 sumN = vec3(0.0);
	vec4 col  = vec4(0.0, 0.0, 0.0, 0.0);

	float i = 0.0;
	while((i < SAMPLES) && (min(min(col.x, col.y), col.z) < 1.0) && (col.w < 0.999)) {
		vec3 p = rayorg + t * raydir; // [-0.5*volscale, 0.5*volscale]^3 + offset
		vec3 texpos = (p - offset) / volumescale + 0.5; // [0, 1]^3
        texpos = clamp(texpos, 0.0, 1.0);
		vec4 temp = samplingVolume(texpos);

        float f = clamp(temp.x, volumemin, volumemax);
        float x = (f - volumemin) / (volumemax - volumemin); // normalize

        vec4 tfCol = texture2D(trans, vec2(x, 0));
        tfCol = tf_opacity * vec4(tfCol.rgb, 1.0);
        col += (1.0 - col.w) * tfCol;
        col += tfCol;
		count = count + 1.0;
		t += tstep;
		i = i + 1.0;
	}
	//col.xyz  /= count;
	col.w = 1.0;

	gl_FragColor = col;
}
