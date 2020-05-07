#version 300 es
#extension GL_OES_standard_derivatives : enable
precision highp float;

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

