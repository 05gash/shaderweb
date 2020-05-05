#version 300 es
in vec3 coordinates;
in vec2 start;
out float dist;
uniform float iTime;
uniform float width;

#define pi 3.141592


// Some useful functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

//
// Description : GLSL 2D simplex noise function
//      Author : Ian McEwan, Ashima Arts
//  Maintainer : ijm
//     Lastmod : 20110822 (ijm)
//     License :
//  Copyright (C) 2011 Ashima Arts. All rights reserved.
//  Distributed under the MIT License. See LICENSE file.
//  https://github.com/ashima/webgl-noise
//
float snoise(vec2 v) {

	// Precompute values for skewed triangular grid
	const vec4 C = vec4(0.211324865405187,
			// (3.0-sqrt(3.0))/6.0
			0.366025403784439,
			// 0.5*(sqrt(3.0)-1.0)
			-0.577350269189626,
			// -1.0 + 2.0 * C.x
			0.024390243902439);
	// 1.0 / 41.0

	// First corner (x0)
	vec2 i  = floor(v + dot(v, C.yy));
	vec2 x0 = v - i + dot(i, C.xx);

	// Other two corners (x1, x2)
	vec2 i1 = vec2(0.0);
	i1 = (x0.x > x0.y)? vec2(1.0, 0.0):vec2(0.0, 1.0);
	vec2 x1 = x0.xy + C.xx - i1;
	vec2 x2 = x0.xy + C.zz;

	// Do some permutations to avoid
	// truncation effects in permutation
	i = mod289(i);
	vec3 p = permute(
			permute( i.y + vec3(0.0, i1.y, 1.0))
			+ i.x + vec3(0.0, i1.x, 1.0 ));

	vec3 m = max(0.5 - vec3(
				dot(x0,x0),
				dot(x1,x1),
				dot(x2,x2)
			       ), 0.0);

	m = m*m ;
	m = m*m ;

	// Gradients:
	//  41 pts uniformly over a line, mapped onto a diamond
	//  The ring size 17*17 = 289 is close to a multiple
	//      of 41 (41*7 = 287)

	vec3 x = 2.0 * fract(p * C.www) - 1.0;
	vec3 h = abs(x) - 0.5;
	vec3 ox = floor(x + 0.5);
	vec3 a0 = x - ox;

	// Normalise gradients implicitly by scaling m
	// Approximation of: m *= inversesqrt(a0*a0 + h*h);
	m *= 1.79284291400159 - 0.85373472095314 * (a0*a0+h*h);

	// Compute final noise value at P
	vec3 g = vec3(0.0);
	g.x  = a0.x  * x0.x  + h.x  * x0.y;
	g.yz = a0.yz * vec2(x1.x,x2.x) + h.yz * vec2(x1.y,x2.y);
	return 130.0 * dot(m, g);
}

vec3 srgb2lin( vec3 cs )
{
	vec3 c_lo = cs / 12.92;
	vec3 c_hi = pow( (cs + 0.055) / 1.055, vec3(2.4) );
	vec3 s = step(vec3(0.04045), cs);
	return mix( c_lo, c_hi, s );
}

vec3 lin2srgb( vec3 cl )
{
	//cl = clamp( cl, 0.0, 1.0 );
	vec3 c_lo = 12.92 * cl;
	vec3 c_hi = 1.055 * pow(cl,vec3(0.41666)) - 0.055;
	vec3 s = step( vec3(0.0031308), cl);
	return mix( c_lo, c_hi, s );
}

float getFlowField(vec2 p){
	return snoise(p);
}
vec3 doWalk(int numSteps){
	float stepSize = 0.01;
	vec2 pos = start;
	float theta;
	for (int i = 0; i<numSteps+int(iTime); i++){
		theta = getFlowField(pos);
		pos += stepSize*vec2(cos(theta), sin(theta));	
	}
	return vec3(pos, theta);
}

void main(void) {
	vec3 pos = doWalk(gl_VertexID/2) + coordinates.xyz;

	if (gl_VertexID % 2 == 0){
		gl_Position = vec4(pos.xy + 2.*width*vec2(cos(pos.z+pi/2.), sin(pos.z+pi/2.)), 0.0, 1.0);
		dist = 2.*width;
	}
	else{
		gl_Position = vec4(pos.xy - 2.*width*vec2(cos(pos.z+pi/2.), sin(pos.z+pi/2.)), 0.0, 1.0);
		dist = -2.*width;
	}
	gl_Position.xy *=2.0;
	gl_Position.xy -=1.0;
}
