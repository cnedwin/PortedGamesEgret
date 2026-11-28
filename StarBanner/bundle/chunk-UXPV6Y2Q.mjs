// Generated from StarBanner and vendored Egret sources. See vendor/LICENSE, vendor/NOTICE and third-party licences.
import{$ as re,A as Z,Aa as Ee,Ba as Te,Ca as ve,Da as _e,E as $,Ea as xe,Fa as ge,T as ee,X as B,Y as te,_ as ie,a as p,ba as oe,ca as F,ia as ne,ja as se,ka as ae,la as k,m as K,ma as le,na as V,oa as fe,p as Q,pa as ue,qa as C,ra as ce,sa as de,ta as he,wa as pe,xa as me,y as J,ya as H,za as N}from"./chunk-HSD5GAD7.mjs";import{a as w}from"./chunk-2PKRZAXY.mjs";var W=class{static{w(this,"PostChainWebGL23D")}scene=new F(1,1,{format:"rgba16f",depthTexture:!0,name:"world3d.post.scene"});mask=new F(1,1,{name:"world3d.post.mask"});maskMaterial=(()=>{let i=new $("unlit",{side:"double"});return i.fog=!1,i.toneMapped=!1,i})();#e;#i;#n;#o=[];#a;#s;#f;#t=null;#c=new Float32Array(8);#h;#l=!1;#u;#d;constructor(i,t){this.#e=i,this.#i=t,this.#n=t.floatTargets}surface(i,t,e,r){let o=this.#e;if(i&&i.width===t&&i.height===e)return i;let n=i?.texture??o.createTexture(),s=i?.framebuffer??o.createFramebuffer();if(!n||!s)throw new p("WORLD3D_CONTEXT_LOST","post surface");return o.bindTexture(o.TEXTURE_2D,n),r?o.texImage2D(o.TEXTURE_2D,0,o.RGBA16F,t,e,0,o.RGBA,o.HALF_FLOAT,null):o.texImage2D(o.TEXTURE_2D,0,o.RGBA8,t,e,0,o.RGBA,o.UNSIGNED_BYTE,null),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MIN_FILTER,o.LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MAG_FILTER,o.LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_S,o.CLAMP_TO_EDGE),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_T,o.CLAMP_TO_EDGE),o.bindFramebuffer(o.FRAMEBUFFER,s),o.framebufferTexture2D(o.FRAMEBUFFER,o.COLOR_ATTACHMENT0,o.TEXTURE_2D,n,0),{texture:n,framebuffer:s,width:t,height:e}}pass(i,t,e,r,o,n,s){let a=this.#e,f=i.uniforms;a.useProgram(i.program),a.bindFramebuffer(a.FRAMEBUFFER,e),a.viewport(0,0,r,o),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,t),f.uSource&&a.uniform1i(f.uSource,0),f.uBloom&&a.uniform1i(f.uBloom,1),f.uA&&a.uniform4f(f.uA,n[0],n[1],n[2],n[3]),f.uB&&a.uniform4f(f.uB,s[0],s[1],s[2],s[3]),f.uDepth&&a.uniform1i(f.uDepth,2),f.uAo&&a.uniform1i(f.uAo,3),f.uMask&&a.uniform1i(f.uMask,4);let u=this.#d;f.uOutline&&a.uniform4f(f.uOutline,u?u.outlineColor[0]:0,u?u.outlineColor[1]:0,u?u.outlineColor[2]:0,u?u.outlineThickness:0);let c=this.#h;f.uInverseProjection&&c&&a.uniformMatrix4fv(f.uInverseProjection,!1,c.inverseProjection),f.uFlags&&a.uniform4f(f.uFlags,0,this.#l?1:0,1/r,1/o);let l=f["uPostCustom[0]"]??f.uPostCustom;l&&this.#u&&a.uniform4fv(l,this.#u),a.drawArrays(a.TRIANGLES,0,3)}run(i,t,e,r,o,n,s,a,f,u,c){let l=this.#e,T=this.#i;l.bindVertexArray(c),l.disable(l.DEPTH_TEST),l.disable(l.CULL_FACE),l.disable(l.BLEND),l.disable(l.SCISSOR_TEST),l.depthMask(!1),l.colorMask(!0,!0,!0,!0);let g=0;this.#h=r,this.#l=!1,this.#u=void 0,this.#d=e?f:void 0;let _=f.ssao&&t!==void 0&&f.ssaoIntensity>0?this.#s=this.surface(this.#s,o,n,!1):void 0;if(l.activeTexture(l.TEXTURE2),l.bindTexture(l.TEXTURE_2D,t??null),l.activeTexture(l.TEXTURE0),_){let x=T.program("post/ssao",()=>({vertex:N,fragment:Ee}));this.pass(x,i,_.framebuffer,o,n,[Math.max(f.ssaoRadius,.001),f.ssaoIntensity,f.ssaoBias,0],[0,0,0,0]),g++}if(f.dof&&t!==void 0&&f.dofRadius>0){let x=this.#f=this.surface(this.#f,o,n,this.#n),X=T.program("post/dof",()=>({vertex:N,fragment:_e}));this.pass(X,i,x.framebuffer,o,n,[f.dofFocus,Math.max(f.dofRange,.001),f.dofRadius,0],[0,0,0,0]),i=x.texture,g++}let E=me(f,o,n);if(E>0){let x=T.program("post/down",()=>({vertex:N,fragment:Te})),X=T.program("post/up",()=>({vertex:N,fragment:ve})),M=o,y=n,U=i;for(let D=0;D<E;D++){let S=M,L=y;M=Math.max(M>>1,1),y=Math.max(y>>1,1);let q=this.#o[D]=this.surface(this.#o[D],M,y,this.#n);this.pass(x,U,q.framebuffer,M,y,[1/S,1/L,f.bloomThreshold,Math.min(Math.max(f.bloomKnee,0),1)],[D===0?1:0,0,0,0]),U=q.texture,g++}l.enable(l.BLEND),l.blendFunc(l.ONE,l.ONE);for(let D=E-1;D>0;D--){let S=this.#o[D],L=this.#o[D-1];this.pass(X,S.texture,L.framebuffer,L.width,L.height,[1/S.width,1/S.height,0,0],[0,0,0,0]),g++}l.disable(l.BLEND)}this.#t||(this.#t=l.createTexture(),l.activeTexture(l.TEXTURE0),l.bindTexture(l.TEXTURE_2D,this.#t),l.texImage2D(l.TEXTURE_2D,0,l.RGBA8,1,1,0,l.RGBA,l.UNSIGNED_BYTE,new Uint8Array(4)));let b=f.fxaa?this.#a=this.surface(this.#a,o,n,!1):void 0;l.activeTexture(l.TEXTURE1),l.bindTexture(l.TEXTURE_2D,E>0?this.#o[0].texture:this.#t),l.activeTexture(l.TEXTURE4),l.bindTexture(l.TEXTURE_2D,e??this.#t),l.activeTexture(l.TEXTURE3),l.bindTexture(l.TEXTURE_2D,_?_.texture:this.#t),this.#l=_!==void 0;let R=t!==void 0&&f.custom?.glsl!==void 0?f.custom:void 0;this.#u=R?.uniforms;let P=T.program("post/composite"+(R?"|"+R.key:""),()=>({vertex:N,fragment:xe(R?.glsl)})),v=this.#c;if(b){H(v,f,E,u,!0),this.pass(P,i,b.framebuffer,o,n,[v[0],v[1],v[2],v[3]],[v[4],v[5],v[6],v[7]]);let x=T.program("post/fxaa",()=>({vertex:N,fragment:ge}));this.pass(x,b.texture,s,o,n,[1/o,1/n,a?1:0,0],[0,0,0,0]),g+=2}else H(v,f,E,u,!a),this.pass(P,i,s,o,n,[v[0],v[1],v[2],v[3]],[v[4],v[5],v[6],v[7]]),g++;return l.activeTexture(l.TEXTURE4),l.bindTexture(l.TEXTURE_2D,null),l.activeTexture(l.TEXTURE3),l.bindTexture(l.TEXTURE_2D,null),l.activeTexture(l.TEXTURE2),l.bindTexture(l.TEXTURE_2D,null),l.activeTexture(l.TEXTURE1),l.bindTexture(l.TEXTURE_2D,null),l.activeTexture(l.TEXTURE0),l.bindTexture(l.TEXTURE_2D,null),l.bindFramebuffer(l.FRAMEBUFFER,null),l.bindVertexArray(null),l.depthMask(!0),g}dispose(i=!1){let t=this.#e;if(!i){for(let e of[...this.#o,...this.#a?[this.#a]:[],...this.#s?[this.#s]:[],...this.#f?[this.#f]:[]])t.deleteTexture(e.texture),t.deleteFramebuffer(e.framebuffer);this.#t&&t.deleteTexture(this.#t)}this.#o.length=0,this.#a=void 0,this.#s=void 0,this.#f=void 0,this.#t=null,this.scene.dispose(),this.mask.dispose(),this.maskMaterial.dispose()}};var Pe=64,z=class{static{w(this,"WebGL2FrameMetrics3D")}gl;#e;#i;#n;#o=[];constructor(i){this.gl=i}capture(i,t){if(this.#e)throw new p("WORLD3D_INPUT_INVALID","nested frame measurement");(t||this.#o.length>0)&&this.poll();let e={passes:[],gpu:t,cpuSubmissionMs:0,viewIndex:0,reflections:{rendered:0,reused:0}};this.#e=e;try{let r=i();if(r&&typeof r.then=="function")throw Promise.resolve(r).catch(()=>{}),new p("WORLD3D_INPUT_INVALID","frame measurement must be synchronous");let o=Object.freeze(e.passes),n=0,s=0;for(let a of o)n+=a.drawCalls,s+=a.triangles;return Object.freeze({drawCalls:n,triangles:s,cpuSubmissionMs:e.cpuSubmissionMs,passes:o,reflections:Object.freeze(e.reflections)})}finally{this.#e=void 0}}recordReflection(i){this.#e&&this.#e.reflections[i]++}beginView(){return this.#e?this.#e.viewIndex++:-1}endView(i){this.#e&&(this.#e.cpuSubmissionMs+=performance.now()-i)}begin(i,t,e,r,o,n){let s=this.#e;if(!s)return;let a=Object.freeze({status:"disabled"}),f={view:i,viewIndex:t,kind:e,width:r,height:o,...n?{shadowMapSizes:Object.freeze(n)}:{},drawCalls:0,triangles:0,cpuSubmissionMs:0,get gpuTime(){return a}},u=s.gpu?this.startQuery(c=>{a=Object.freeze(c)}):void 0;return this.#i=f,{pass:f,started:performance.now(),...u?{timer:u}:{}}}end(i){if(!i)return;let{pass:t,timer:e}=i;if(t.cpuSubmissionMs=performance.now()-i.started,this.#i=void 0,this.#e?.passes.push(Object.freeze(t)),!!e){if(this.gl.isContextLost()){e.setResult({status:"context-lost"});return}this.gl.endQuery(this.#n.TIME_ELAPSED_EXT),this.#o.push(e)}}record(i,t){let e=this.#i;e&&(e.drawCalls+=i,e.triangles+=t)}startQuery(i){let t=this.gl;if(t.isContextLost()){i({status:"context-lost"});return}if(this.#n===void 0){let o=t.getExtension("EXT_disjoint_timer_query_webgl2"),n=o&&t.getQuery(o.TIME_ELAPSED_EXT,o.QUERY_COUNTER_BITS_EXT);this.#n=typeof n=="number"&&n>0?o:null}let e=this.#n;if(!e){i({status:"unsupported"});return}if(this.#o.length>=Pe||t.getQuery(e.TIME_ELAPSED_EXT,t.CURRENT_QUERY)){i({status:"unavailable"});return}let r=t.createQuery();if(!r){i({status:"unavailable"});return}return this.#o.length||t.getParameter(e.GPU_DISJOINT_EXT),t.beginQuery(e.TIME_ELAPSED_EXT,r),i({status:"pending"}),{query:r,setResult:i}}poll(){if(!this.#o.length)return;let i=this.gl,t=this.#n;if(i.isContextLost()){this.reset(!0);return}let e=0;for(;e<this.#o.length&&i.getQueryParameter(this.#o[e].query,i.QUERY_RESULT_AVAILABLE);)e++;if(i.getParameter(t.GPU_DISJOINT_EXT)){this.settlePending("disjoint",!0);return}for(let r=0;r<e;r++){let{query:o,setResult:n}=this.#o[r],s=i.getQueryParameter(o,i.QUERY_RESULT);i.deleteQuery(o),n(typeof s=="number"&&Number.isFinite(s)&&s>=0?{status:"ready",milliseconds:s/1e6}:{status:"unavailable"})}e>0&&this.#o.splice(0,e)}reset(i){this.settlePending(i?"context-lost":"unavailable",!i),this.#n=void 0}settlePending(i,t){for(let{query:e,setResult:r}of this.#o)t&&this.gl.deleteQuery(e),r({status:i});this.#o.length=0}};var I=Object.freeze({position:0,normal:1,uv:2,tangent:3,color:4,joints:5,weights:6,uv1:7,instanceMatrix:8,instanceColor:12,instanceAnimation:13,instanceAnimation2:14,instanceLook:15}),m=Object.freeze({map:0,normalMap:1,metallicRoughnessMap:2,occlusionMap:3,emissiveMap:4,environment:5,shadow:6,bones:7,morph:8,lightMap:9,sceneColor:10,reflectionMap:11,sceneDepth:12,tiledLights:13}),O=8,Re=`
layout(std140) uniform Frame {
    mat4 uViewProjection;
    mat4 uView;
    vec4 uCameraPosition;
    vec4 uFogColor;
    vec4 uFogParams;       // x: 0 none, 1 linear, 2 exponential; y: near or density; z: far
    vec4 uAmbient;
    vec4 uHemisphereSky;
    vec4 uHemisphereGround;
    vec4 uLightCounts;     // directional, point, spot
    vec4 uDirectionalDirection[4]; // xyz: travel direction; w: shadow slot or -1
    vec4 uDirectionalColor[4];
    vec4 uPointPosition[8];        // w: range, 0 = unbounded
    vec4 uPointColor[8];
    vec4 uSpotPosition[4];         // w: range
    vec4 uSpotDirection[4];        // w: shadow slot or -1
    vec4 uSpotColor[4];
    vec4 uSpotCone[4];             // x: cos(outer), y: cos(inner)
    mat4 uShadowMatrix[4];
    vec4 uShadowRect[4];           // atlas uv offset (xy) and scale (zw)
    vec4 uShadowParams[4];         // x: depth bias, y: normal bias, z: filter radius in atlas uv
    vec4 uOutput;                  // x: environment intensity, y: environment max mip, z: exposure, w: tone mapping
    vec4 uCascadeSplits;           // view-space far distance of each cascade
    vec4 uCascadeInfo;             // x: cascaded directional light index or -1, y: cascade count, z: blend fraction
    vec4 uPointShadow;             // x: shadowed point light index or -1, y: first of its four slots
    vec4 uClipPlanes[4];           // world-space planes; the negative side is discarded
    vec4 uClipInfo;                // x: plane count; zw: share of the output the view covers
    vec4 uTileGrid;                // tiles across, tiles down, tile edge in pixels, viewport origin x
    vec4 uTileInfo;                // x: tiled point lights (0 = none), y: header base, z: index base, w: viewport origin y
};
`,Ue=`
layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
layout(location = 3) in vec4 aTangent;
layout(location = 4) in vec4 aColor;
layout(location = 5) in uvec4 aJoints;
layout(location = 6) in vec4 aWeights;
layout(location = 7) in vec2 aUv1;
layout(location = 8) in mat4 aInstanceMatrix;
layout(location = 12) in vec4 aInstanceColor;
layout(location = 13) in vec4 aInstanceAnimation;  // first frame, second frame, blend, shared numbers
layout(location = 14) in vec4 aInstanceAnimation2; // the same for a second clip, and its weight
layout(location = 15) in vec4 aInstanceLook;       // rotation of the look bone
${Re}
uniform mat4 uModel;
uniform mat3 uNormalMatrix;
uniform mat3 uUvTransform;
#ifdef DEPTH_ONLY
uniform mat4 uDepthViewProjection;
#endif
#ifdef USE_SKINNING
uniform highp sampler2D uBoneTexture;
uniform mat4 uBindMatrix;
#endif
#ifdef USE_SKIN_INSTANCING
uniform highp sampler2D uBoneTexture; // every frame of every clip: four texels per bone matrix, rows wrap
#endif
#ifdef USE_MORPH
uniform highp sampler2D uMorphTexture;
uniform ivec3 uMorphLayout;      // vertex count, texture width, attributes per target
uniform int uMorphCount;
uniform int uMorphIndices[${O}];
uniform float uMorphWeights[${O}];
#endif
#ifdef BILLBOARD
uniform vec4 uSprite;            // x: rotation, y: size attenuation flag
#endif
#ifdef POINTS
uniform vec2 uPointSize;         // x: size in pixels, y: size attenuation flag
#endif
out vec3 vWorldPosition;
out vec3 vNormal;
out vec2 vUv;
out vec2 vUv1;
out vec4 vTangent;
out vec4 vColor;

#ifdef USE_SKINNING
mat4 boneMatrix(uint index) {
    int row = int(index);
    return mat4(texelFetch(uBoneTexture, ivec2(0, row), 0), texelFetch(uBoneTexture, ivec2(1, row), 0),
        texelFetch(uBoneTexture, ivec2(2, row), 0), texelFetch(uBoneTexture, ivec2(3, row), 0));
}
#endif
#ifdef USE_SKIN_INSTANCING
// The fourth float carries what every instance shares: matrices per frame, and the bone that may turn.
int crowdStride() { return int(mod(aInstanceAnimation.w, 2048.0)); }
mat4 bakedBone(int joint, float frame) {
    int texel = (int(frame) * crowdStride() + joint) * 4, width = textureSize(uBoneTexture, 0).x;
    ivec2 at = ivec2(texel % width, texel / width);
    return mat4(texelFetch(uBoneTexture, at, 0), texelFetch(uBoneTexture, at + ivec2(1, 0), 0),
        texelFetch(uBoneTexture, at + ivec2(2, 0), 0), texelFetch(uBoneTexture, at + ivec2(3, 0), 0));
}
// One table entry for this instance: between two frames of its clip, and of a second clip when it has one.
mat4 bakedBlend(int joint) {
    mat4 pose = bakedBone(joint, aInstanceAnimation.x) * (1.0 - aInstanceAnimation.z) + bakedBone(joint, aInstanceAnimation.y) * aInstanceAnimation.z;
    if (aInstanceAnimation2.w > 0.0) {
        pose = pose * (1.0 - aInstanceAnimation2.w)
            + (bakedBone(joint, aInstanceAnimation2.x) * (1.0 - aInstanceAnimation2.z) + bakedBone(joint, aInstanceAnimation2.y) * aInstanceAnimation2.z) * aInstanceAnimation2.w;
    }
    return pose;
}
mat4 bakedJoint(uint joint) {
    mat4 pose = bakedBlend(int(joint));
    int look = int(aInstanceAnimation.w / 2048.0) - 1;
    if (int(joint) == look) {
        // Turn the bone about its joint, whose place in the bind pose is kept in frame 0.
        vec3 pivot = bakedBone(look, 0.0)[3].xyz, v = aInstanceLook.xyz;
        float w = aInstanceLook.w;
        mat3 turn = mat3(1.0 - 2.0 * (v.y * v.y + v.z * v.z), 2.0 * (v.x * v.y + v.z * w), 2.0 * (v.x * v.z - v.y * w),
            2.0 * (v.x * v.y - v.z * w), 1.0 - 2.0 * (v.x * v.x + v.z * v.z), 2.0 * (v.y * v.z + v.x * w),
            2.0 * (v.x * v.z + v.y * w), 2.0 * (v.y * v.z - v.x * w), 1.0 - 2.0 * (v.x * v.x + v.y * v.y));
        pose = pose * mat4(vec4(turn[0], 0.0), vec4(turn[1], 0.0), vec4(turn[2], 0.0), vec4(pivot - turn * pivot, 1.0));
    }
    return pose;
}
#endif
#ifdef USE_MORPH
vec3 morphDelta(int targetIndex, int channel) {
    int texel = (targetIndex * uMorphLayout.z + channel) * uMorphLayout.x + gl_VertexID;
    return texelFetch(uMorphTexture, ivec2(texel % uMorphLayout.y, texel / uMorphLayout.y), 0).xyz;
}
#endif

#if defined(CUSTOM_VERTEX) || defined(GPU_PARTICLES)
uniform vec4 uCustom[4];
#endif
#ifdef CUSTOM_VERTEX
/*CUSTOM_VERTEX*/
#endif
void main() {
    vec3 position = aPosition;
    #ifdef USE_NORMAL
    vec3 normal = aNormal;
    #else
    vec3 normal = vec3(0.0, 0.0, 1.0);
    #endif
    #if defined(USE_MORPH) && defined(USE_SKIN_INSTANCING)
    // Baked instances read their morph weights from the last entry of their frames.
    mat4 bakedWeights = bakedBlend(crowdStride() - 1);
    for (int i = 0; i < uMorphCount; i++) {
        position += morphDelta(i, 0) * bakedWeights[i / 4][i % 4];
        #ifdef USE_MORPH_NORMALS
        normal += morphDelta(i, 1) * bakedWeights[i / 4][i % 4];
        #endif
    }
    #elif defined(USE_MORPH)
    for (int i = 0; i < uMorphCount; i++) {
        position += morphDelta(uMorphIndices[i], 0) * uMorphWeights[i];
        #ifdef USE_MORPH_NORMALS
        normal += morphDelta(uMorphIndices[i], 1) * uMorphWeights[i];
        #endif
    }
    #endif
    mat4 model = uModel;
    mat3 normalMatrix = uNormalMatrix;
    #ifdef USE_SKINNING
    mat4 skin = aWeights.x * boneMatrix(aJoints.x) + aWeights.y * boneMatrix(aJoints.y)
        + aWeights.z * boneMatrix(aJoints.z) + aWeights.w * boneMatrix(aJoints.w);
    model = skin * uBindMatrix;
    normalMatrix = mat3(model);
    #endif
    float spriteTurn = 0.0;
    #ifdef GPU_PARTICLES
    // The instance slots carry a particle's start and birth, velocity and life, sizes and angles;
    // where it is now follows from the time alone.
    vec4 particleStart = aInstanceMatrix[0], particleMotion = aInstanceMatrix[1], particleLook = aInstanceMatrix[2];
    float particleLife = max(particleMotion.w, 0.0001), particleTime = uCustom[0].x - particleStart.w;
    bool particleAlive = true;
    if (uCustom[0].y > 0.5) particleTime = mod(particleTime, particleLife);
    else particleAlive = particleTime >= 0.0 && particleTime <= particleLife;
    float particleAge = clamp(particleTime / particleLife, 0.0, 1.0);
    float particleTravel = uCustom[1].w > 0.0001 ? (1.0 - exp(-uCustom[1].w * particleTime)) / uCustom[1].w : particleTime;
    vec3 particleCenter = particleStart.xyz + particleMotion.xyz * particleTravel + uCustom[1].xyz * (0.5 * particleTime * particleTime);
    if (uCustom[3].y > 0.5) {
        // A floor: find when the particle comes down on it, then let it leave again slower, once. Drag is not applied on this path.
        vec3 pull = uCustom[1].xyz, launch = particleMotion.xyz;
        float a = 0.5 * pull.y, b = launch.y, c = particleStart.y - uCustom[3].z, hit = -1.0;
        if (c == 0.0 && (b < 0.0 || (b == 0.0 && a < 0.0))) hit = 0.0;
        else if (abs(a) > 0.000001) {
            float discriminant = b * b - 4.0 * a * c;
            if (discriminant > 0.0) {
                float root = sqrt(discriminant);
                hit = b < 0.0 ? 2.0 * c / (root - b) : (-b - root) / (2.0 * a);
            }
        } else if (b < 0.0) hit = -c / b;
        particleCenter = particleStart.xyz + launch * particleTime + pull * (0.5 * particleTime * particleTime);
        if (c >= 0.0 && hit >= 0.0 && particleTime >= hit) {
            vec3 landed = particleStart.xyz + launch * hit + pull * (0.5 * hit * hit), away = (launch + pull * hit) * vec3(uCustom[3].w, -uCustom[3].w, uCustom[3].w);
            float since = particleTime - hit;
            particleCenter = landed + away * since + pull * (0.5 * since * since);
            particleCenter.y = max(particleCenter.y, uCustom[3].z);
        }
    }
    // Particles left behind in the world carry world positions and ignore the emitter's transform.
    if (uCustom[3].x > 0.5) model = mat4(1.0);
    float particleSize = mix(particleLook.x, particleLook.y, particleAge);
    model = model * mat4(vec4(particleSize, 0.0, 0.0, 0.0), vec4(0.0, particleSize, 0.0, 0.0), vec4(0.0, 0.0, particleSize, 0.0), vec4(particleCenter, 1.0));
    spriteTurn = particleLook.z + particleLook.w * particleTime;
    #elif defined(USE_INSTANCING)
    model = model * aInstanceMatrix;
    normalMatrix = normalMatrix * mat3(aInstanceMatrix);
    #endif
    #ifdef USE_SKIN_INSTANCING
    // Each instance is posed in its own space before its transform places it.
    model = model * (aWeights.x * bakedJoint(aJoints.x) + aWeights.y * bakedJoint(aJoints.y) + aWeights.z * bakedJoint(aJoints.z) + aWeights.w * bakedJoint(aJoints.w));
    normalMatrix = mat3(model);
    #endif
    vec4 world = model * vec4(position, 1.0);
    #ifdef CUSTOM_VERTEX
    #ifdef USE_VERTEX_COLOR
    world.xyz = customVertex(world.xyz, position, normal, aUv, aColor);
    #else
    world.xyz = customVertex(world.xyz, position, normal, aUv, vec4(1.0));
    #endif
    #endif
    #ifdef DEPTH_ONLY
    mat4 viewProjection = uDepthViewProjection;
    #else
    mat4 viewProjection = uViewProjection;
    #endif
    #ifdef SCREEN_SPACE
    // Positions are already in normalized device coordinates.
    world = vec4(uCameraPosition.xyz, 1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
    #elif defined(BILLBOARD)
    // Expand the quad in view space around the transformed node origin.
    vec4 center = uView * (model * vec4(0.0, 0.0, 0.0, 1.0));
    vec2 scale = vec2(length(model[0].xyz), length(model[1].xyz));
    if (uSprite.y < 0.5) scale *= -center.z;
    float c = cos(uSprite.x + spriteTurn), s = sin(uSprite.x + spriteTurn);
    vec2 corner = position.xy * scale;
    center.xy += vec2(c * corner.x - s * corner.y, s * corner.x + c * corner.y);
    world = inverse(uView) * center;
    gl_Position = viewProjection * world;
    normal = vec3(0.0, 0.0, 1.0);
    normalMatrix = transpose(mat3(uView));
    #else
    gl_Position = viewProjection * world;
    #endif
    #ifdef POINTS
    gl_PointSize = uPointSize.y > 0.5 ? uPointSize.x / max(gl_Position.w, 0.0001) : uPointSize.x;
    #endif
    vWorldPosition = world.xyz;
    vNormal = normalMatrix * normal;
    vUv = (uUvTransform * vec3(aUv, 1.0)).xy;
    vUv1 = aUv1;
    vTangent = vec4(mat3(model) * aTangent.xyz, aTangent.w);
    vColor = vec4(1.0);
    #ifdef USE_VERTEX_COLOR
    vColor = aColor;
    #endif
    #ifdef USE_INSTANCE_COLOR
    vColor *= aInstanceColor;
    #endif
    #ifdef GPU_PARTICLES
    // From the instance's color to the shared end color over the particle's life, fading at both ends.
    vColor = mix(aInstanceColor, uCustom[2], particleAge);
    vColor.a *= smoothstep(0.0, max(uCustom[0].z, 0.0001), particleAge) * (1.0 - smoothstep(1.0 - max(uCustom[0].w, 0.0001), 1.0, particleAge));
    if (!particleAlive) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    #endif
}
`,Le=`
${Re}
uniform vec4 uColor;             // linear rgb and opacity
uniform vec3 uEmissive;
uniform vec4 uSurface;           // metallic, roughness, normal scale, occlusion strength
uniform vec4 uSpecular;          // rgb and shininess
uniform float uAlphaCutoff;
uniform vec2 uClearcoat;         // strength and roughness
uniform float uEnvironmentScale;
uniform sampler2D uMap;
uniform sampler2D uNormalMap;
uniform sampler2D uMetallicRoughnessMap;
uniform sampler2D uOcclusionMap;
uniform sampler2D uEmissiveMap;
uniform sampler2D uLightMap;
uniform vec4 uSheen;             // color scaled by strength, roughness
uniform vec2 uExtra;             // light map intensity, transmission
uniform highp sampler2D uTiledLights; // tiled point lights: lights, tile headers, light indices
vec4 tiledTexel(int i) {
    return texelFetch(uTiledLights, ivec2(i % 512, i / 512), 0);
}
#ifdef USE_TRANSMISSION
uniform sampler2D uSceneColor;   // what was drawn before the see-through surfaces
uniform vec4 uRefraction;        // index of refraction, thickness, attenuation distance (0 = none)
uniform vec3 uAttenuation;
#endif
#ifdef USE_SOFT_DEPTH
uniform highp sampler2D uSceneDepth; // depth of the solid scene, drawn before the frame
uniform float uSoftness;
#endif
#ifdef USE_SPLAT
uniform sampler2D uSplatWeights;
uniform sampler2D uSplat0;
uniform sampler2D uSplat1;
uniform sampler2D uSplat2;
uniform sampler2D uSplat3;
uniform vec4 uSplatRepeat;
#endif
// Distance from the camera plane to the solid scene behind this pixel and to the surface itself;
// hooks may read them. Without a depth image the scene counts as far away.
float sceneDistance = 1.0e9;
float surfaceDistance = 0.0;
// This pixel's place on the output, counted from the top row when a depth image tells its height.
vec2 surfacePixel = vec2(0.0);
#ifdef USE_REFLECTION_MAP
uniform sampler2D uReflectionMap; // mirror image of the scene, read at the pixel's place on screen
uniform vec2 uReflection;         // strength, distortion by the normal
#endif
uniform samplerCube uEnvironment;
uniform highp sampler2DShadow uShadowMap;
in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vUv;
in vec2 vUv1;
in vec4 vTangent;
in vec4 vColor;
out vec4 outColor;

const float PI = 3.141592653589793;

#ifndef DEPTH_ONLY
vec3 surfaceNormal() {
    #if defined(FLAT_SHADED) || !defined(USE_NORMAL)
    vec3 n = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
    #else
    vec3 n = normalize(vNormal);
    #ifdef DOUBLE_SIDED
    if (!gl_FrontFacing) n = -n;
    #endif
    #endif
    #ifdef USE_NORMAL_MAP
    vec3 mapped = texture(uNormalMap, vUv).xyz * 2.0 - 1.0;
    mapped.xy *= uSurface.z;
    #ifdef USE_TANGENT
    vec3 t = normalize(vTangent.xyz);
    vec3 b = cross(n, t) * vTangent.w;
    #else
    // Derive a cotangent frame from screen-space derivatives.
    vec3 dp1 = dFdx(vWorldPosition), dp2 = dFdy(vWorldPosition);
    vec2 duv1 = dFdx(vUv), duv2 = dFdy(vUv);
    vec3 dp2perp = cross(dp2, n), dp1perp = cross(n, dp1);
    vec3 t = dp2perp * duv1.x + dp1perp * duv2.x;
    vec3 b = dp2perp * duv1.y + dp1perp * duv2.y;
    float invmax = inversesqrt(max(dot(t, t), dot(b, b)));
    t *= invmax; b *= invmax;
    #endif
    n = normalize(mat3(t, b, n) * mapped);
    #endif
    return n;
}

#ifdef RECEIVE_SHADOW
float shadowFactor(int slot, vec3 at, vec3 normal) {
    vec4 params = uShadowParams[slot];
    vec4 clip = uShadowMatrix[slot] * vec4(at + normal * params.y, 1.0);
    vec3 ndc = clip.xyz / clip.w * 0.5 + 0.5;
    if (clip.w <= 0.0 || any(lessThan(ndc, vec3(0.0))) || any(greaterThan(ndc, vec3(1.0)))) return 1.0;
    vec4 rect = uShadowRect[slot];
    float depth = ndc.z - params.x;
    vec2 lower = rect.xy + params.z, upper = rect.xy + rect.zw - params.z;
    float lit = 0.0;
    // 3x3 taps on top of hardware 2x2 comparison filtering.
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 uv = clamp(rect.xy + ndc.xy * rect.zw + vec2(float(x), float(y)) * params.z, lower, upper);
            lit += texture(uShadowMap, vec3(uv, depth));
        }
    }
    return lit / 9.0;
}
// Read the four packed split distances through fixed components. Dynamic vector
// indexing here can fail ANGLE's D3D11 draw-time pixel shader compilation.
int selectCascade(float viewDepth, int count, out float edge) {
    if (count > 3 && viewDepth > uCascadeSplits.z) { edge = uCascadeSplits.w; return 3; }
    if (count > 2 && viewDepth > uCascadeSplits.y) { edge = uCascadeSplits.z; return 2; }
    if (count > 1 && viewDepth > uCascadeSplits.x) { edge = uCascadeSplits.y; return 1; }
    edge = uCascadeSplits.x;
    return 0;
}
// One unfiltered lookup for a point in the air, as fog marching needs many; the flag picks the cascade for that depth.
float volumeShadow(int slot, vec3 at, bool cascaded) {
    if (cascaded) {
        float viewDepth = -(uView * vec4(at, 1.0)).z;
        float edge;
        int cascade = selectCascade(viewDepth, int(uCascadeInfo.y), edge);
        if (viewDepth >= edge) return 1.0;
        slot += cascade;
    }
    vec4 clip = uShadowMatrix[slot] * vec4(at, 1.0);
    vec3 ndc = clip.xyz / clip.w * 0.5 + 0.5;
    if (clip.w <= 0.0 || any(lessThan(ndc, vec3(0.0))) || any(greaterThan(ndc, vec3(1.0)))) return 1.0;
    vec4 rect = uShadowRect[slot];
    return texture(uShadowMap, vec3(rect.xy + ndc.xy * rect.zw, ndc.z - uShadowParams[slot].x));
}
float pointShadowFactor(int slot, vec3 fromLight, vec3 at, vec3 normal) {
    // Faces of the tetrahedron the four maps were rendered through.
    const float k = 0.5773502691896258;
    float d0 = dot(fromLight, vec3(k, k, k)), d1 = dot(fromLight, vec3(-k, -k, k)), d2 = dot(fromLight, vec3(-k, k, -k)), d3 = dot(fromLight, vec3(k, -k, -k));
    int face = 0; float best = d0;
    if (d1 > best) { best = d1; face = 1; }
    if (d2 > best) { best = d2; face = 2; }
    if (d3 > best) face = 3;
    return shadowFactor(slot + face, at, normal);
}
float cascadedShadowFactor(int slot, vec3 at, vec3 normal) {
    float viewDepth = -(uView * vec4(at, 1.0)).z;
    int count = int(uCascadeInfo.y);
    float edge;
    int cascade = selectCascade(viewDepth, count, edge);
    if (viewDepth >= edge) return 1.0;
    float visible = shadowFactor(slot + cascade, at, normal);
    // Blend into the next cascade, or out to unshadowed past the last one.
    float t = smoothstep(edge * (1.0 - uCascadeInfo.z), edge, viewDepth);
    if (t > 0.0) visible = mix(visible, cascade < count - 1 ? shadowFactor(slot + cascade + 1, at, normal) : 1.0, t);
    return visible;
}
#endif

float rangeFalloff(float dist, float range) {
    float inverseSquare = 1.0 / max(dist * dist, 0.0001);
    if (range <= 0.0) return inverseSquare;
    float ratio = dist / range;
    float window = clamp(1.0 - ratio * ratio * ratio * ratio, 0.0, 1.0);
    return inverseSquare * window * window;
}

struct Surface {
    vec3 albedo;
    vec3 normal;
    vec3 view;
    vec3 f0;
    float roughness;
    float metallic;
};

// Radiance leaving the surface for one light of unit-normalized direction l.
vec3 shade(Surface s, vec3 l, vec3 radiance) {
    float nl = max(dot(s.normal, l), 0.0);
    if (nl <= 0.0) return vec3(0.0);
    #if defined(SHADING_LAMBERT)
    return s.albedo * radiance * nl;
    #elif defined(SHADING_TOON)
    // uSpecular.w carries the band count for toon shading.
    return s.albedo * radiance * (ceil(nl * uSpecular.w - 0.001) / max(uSpecular.w, 1.0));
    #elif defined(SHADING_PHONG)
    vec3 h = normalize(l + s.view);
    float specular = pow(max(dot(s.normal, h), 0.0), max(uSpecular.w, 1.0));
    return (s.albedo + uSpecular.rgb * specular) * radiance * nl;
    #else
    vec3 h = normalize(l + s.view);
    float nv = max(dot(s.normal, s.view), 0.0001), nh = max(dot(s.normal, h), 0.0), vh = max(dot(s.view, h), 0.0);
    float a = s.roughness * s.roughness, a2 = a * a;
    float d = nh * nh * (a2 - 1.0) + 1.0;
    float distribution = a2 / (PI * d * d);
    float visibility = 0.5 / max(nl * sqrt(nv * nv * (1.0 - a2) + a2) + nv * sqrt(nl * nl * (1.0 - a2) + a2), 0.0001);
    vec3 fresnel = s.f0 + (1.0 - s.f0) * pow(1.0 - vh, 5.0);
    vec3 diffuse = s.albedo * (1.0 - s.metallic) * (1.0 - fresnel);
    // Light units are scaled by PI so a unit white light fully lights a white diffuse surface.
    vec3 lit = diffuse + distribution * visibility * fresnel * PI;
    if (uSheen.r + uSheen.g + uSheen.b > 0.0) {
        // Cloth lobe: an inverted Gaussian that brightens toward grazing angles.
        float inverse = 1.0 / max(uSheen.w, 0.07);
        lit += uSheen.rgb * ((2.0 + inverse) * pow(max(1.0 - nh * nh, 0.0), inverse * 0.5) / (2.0 * PI)) / (4.0 * (nl + nv - nl * nv)) * PI;
    }
    if (uClearcoat.x > 0.0) {
        // A second, dielectric lobe on top; the base layer loses what the coat reflects.
        float ca = max(uClearcoat.y, 0.045); ca *= ca;
        float ca2 = ca * ca, cd = nh * nh * (ca2 - 1.0) + 1.0;
        float coatFresnel = (0.04 + 0.96 * pow(1.0 - vh, 5.0)) * uClearcoat.x;
        lit = lit * (1.0 - coatFresnel) + ca2 / (PI * cd * cd) * (0.25 / max(vh * vh, 0.0001)) * coatFresnel * PI;
    }
    return lit * radiance * nl;
    #endif
}

#if defined(CUSTOM_FRAGMENT) || defined(CUSTOM_NORMAL)
uniform vec4 uCustom[4];
#endif
#ifdef CUSTOM_FRAGMENT
/*CUSTOM_FRAGMENT*/
#endif
#ifdef CUSTOM_NORMAL
/*CUSTOM_NORMAL*/
#endif

vec3 toneMap(vec3 color) {
    color *= uOutput.z;
    if (uOutput.w > 1.5) {
        // Filmic curve fit commonly used for ACES-like output.
        color = clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);
    } else if (uOutput.w > 0.5) color = color / (1.0 + color);
    return color;
}
vec3 encodeSrgb(vec3 color) {
    color = clamp(color, 0.0, 1.0);
    return mix(color * 12.92, 1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), color));
}
#endif

void main() {
    #ifndef DEPTH_ONLY
    for (int i = 0; i < int(uClipInfo.x); i++) if (dot(vWorldPosition, uClipPlanes[i].xyz) + uClipPlanes[i].w < 0.0) discard;
    #endif
    #ifndef DEPTH_ONLY
    surfacePixel = gl_FragCoord.xy;
    #endif
    vec4 base = uColor * vColor;
    #ifdef USE_MAP
    vec4 mapColor = texture(uMap, vUv);
    #ifdef MAP_FROM_TARGET
    // Target pixels carry alpha-weighted RGB. Material shading uses straight color.
    mapColor.rgb = mapColor.a > 0.0 ? mapColor.rgb / mapColor.a : vec3(0.0);
    #endif
    base *= mapColor;
    #endif
    #ifdef USE_SPLAT
    {
        // Ground layers, each weighted by its channel of the weight map.
        vec4 share = texture(uSplatWeights, vUv);
        float total = share.r + share.g + share.b + share.a;
        share = total > 0.0001 ? share / total : vec4(1.0, 0.0, 0.0, 0.0);
        base.rgb *= texture(uSplat0, vUv * uSplatRepeat.x).rgb * share.r + texture(uSplat1, vUv * uSplatRepeat.y).rgb * share.g
            + texture(uSplat2, vUv * uSplatRepeat.z).rgb * share.b + texture(uSplat3, vUv * uSplatRepeat.w).rgb * share.a;
    }
    #endif
    #ifdef USE_SOFT_DEPTH
    {
        // Fade out over the last stretch before the solid surface behind this pixel.
        float stored = texelFetch(uSceneDepth, ivec2(gl_FragCoord.xy), 0).r * 2.0 - 1.0;
        surfacePixel = vec2(gl_FragCoord.x, float(textureSize(uSceneDepth, 0).y) - gl_FragCoord.y);
        sceneDistance = uLightCounts.w > 0.5 ? (uPointShadow.w - stored) / uPointShadow.z : uPointShadow.w / (stored + uPointShadow.z);
        surfaceDistance = -(uView * vec4(vWorldPosition, 1.0)).z;
        #ifndef USE_TRANSMISSION
        base.a *= clamp((sceneDistance - surfaceDistance) / max(uSoftness, 0.0001), 0.0, 1.0);
        #endif
    }
    #endif
    #ifdef POINTS
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    #endif
    #ifdef ALPHA_MASK
    if (base.a < uAlphaCutoff) discard;
    #endif
    #ifdef DEPTH_ONLY
    #ifdef ALPHA_BLEND
    if (base.a < 0.5) discard;
    #endif
    outColor = vec4(1.0);
    #else
    vec3 color;
    #ifdef SHADING_UNLIT
    color = base.rgb;
    #elif defined(SHADING_MATCAP)
    vec3 viewNormal = normalize(mat3(uView) * surfaceNormal());
    color = base.rgb * texture(uEmissiveMap, viewNormal.xy * 0.5 + 0.5).rgb;
    #else
    Surface s;
    s.normal = surfaceNormal();
    #ifdef CUSTOM_NORMAL
    s.normal = normalize(customNormal(s.normal, vWorldPosition, vUv));
    #endif
    s.view = normalize(uCameraPosition.xyz - vWorldPosition);
    s.albedo = base.rgb;
    s.metallic = uSurface.x;
    s.roughness = uSurface.y;
    #ifdef USE_MR_MAP
    vec4 mr = texture(uMetallicRoughnessMap, vUv);
    s.metallic *= mr.b;
    s.roughness *= mr.g;
    #endif
    s.roughness = clamp(s.roughness, 0.045, 1.0);
    s.f0 = mix(vec3(0.04), s.albedo, s.metallic);
    float occlusion = 1.0;
    #ifdef USE_AO_MAP
    #ifdef AO_UV1
    occlusion = mix(1.0, texture(uOcclusionMap, vUv1).r, uSurface.w);
    #else
    occlusion = mix(1.0, texture(uOcclusionMap, vUv).r, uSurface.w);
    #endif
    #endif

    #ifdef USE_TRANSMISSION
    // Light that passes through replaces that share of the diffuse reflection.
    // What the surface reflects at this angle does not pass through it.
    float through = uExtra.y * (1.0 - s.metallic) * (1.0 - (0.04 + 0.96 * pow(1.0 - max(dot(s.normal, s.view), 0.0), 5.0)));
    vec3 passed = vec3(0.0);
    {
        vec3 bent = refract(-s.view, s.normal, 1.0 / max(uRefraction.x, 1.0));
        vec4 here = uViewProjection * vec4(vWorldPosition, 1.0), there = uViewProjection * vec4(vWorldPosition + bent * uRefraction.y, 1.0);
        vec2 at = gl_FragCoord.xy / vec2(textureSize(uSceneColor, 0)) + (there.xy / max(there.w, 0.0001) - here.xy / here.w) * 0.5 * uClipInfo.zw;
        // A rough surface scatters the view: average a spiral of taps that widens with roughness.
        float spread = s.roughness * s.roughness * 0.25 / max(here.w, 1.0);
        for (int i = 0; i < 12; i++) {
            float turn = float(i) * 2.399963, reach = sqrt((float(i) + 0.5) / 12.0) * spread;
            passed += texture(uSceneColor, clamp(at + vec2(cos(turn), sin(turn)) * reach, vec2(0.0), vec2(1.0))).rgb;
        }
        passed /= 12.0;
    }
    // Tint of the material, deepened by the distance travelled inside it.
    vec3 tint = s.albedo;
    float travelled = uRefraction.y;
    #ifdef USE_SOFT_DEPTH
    // With a depth image the light's path through the material is the real gap to what lies behind.
    travelled = max(sceneDistance - surfaceDistance, 0.0);
    #endif
    if (uRefraction.z > 0.0) tint *= pow(max(uAttenuation, vec3(0.0001)), vec3(travelled / uRefraction.z));
    s.albedo *= 1.0 - through;
    float clear = 1.0;
    #endif
    #ifdef USE_REFLECTION_MAP
    vec3 mirrored;
    float mirrorClear = 1.0;
    {
        // The mirror camera sees the scene flipped left to right.
        vec4 at = uViewProjection * vec4(vWorldPosition, 1.0);
        vec2 where = at.xy / max(at.w, 0.0001) * 0.5 + 0.5;
        where = vec2(1.0 - where.x, where.y) + s.normal.xz * uReflection.y;
        float facing = max(dot(s.normal, s.view), 0.0);
        mirrored = texture(uReflectionMap, clamp(where, vec2(0.002), vec2(0.998))).rgb * (s.f0 + (1.0 - s.f0) * pow(1.0 - facing, 5.0)) * uReflection.x;
    }
    #endif
    // Indirect light: ambient, hemisphere and optional environment map.
    vec3 diffuseAlbedo = s.albedo;
    #ifdef SHADING_STANDARD
    diffuseAlbedo *= 1.0 - s.metallic;
    #endif
    vec3 irradiance = uAmbient.rgb + mix(uHemisphereGround.rgb, uHemisphereSky.rgb, s.normal.y * 0.5 + 0.5);
    #ifdef USE_ENVIRONMENT
    irradiance += textureLod(uEnvironment, s.normal, uOutput.y).rgb * uOutput.x * uEnvironmentScale;
    #endif
    #ifdef USE_LIGHT_MAP
    #ifdef LIGHT_UV1
    irradiance += texture(uLightMap, vUv1).rgb * uExtra.x;
    #else
    irradiance += texture(uLightMap, vUv).rgb * uExtra.x;
    #endif
    #endif
    color = diffuseAlbedo * irradiance * occlusion;
    #if defined(USE_ENVIRONMENT) && defined(SHADING_STANDARD) && !defined(USE_REFLECTION_MAP)
    {
        vec3 reflected = reflect(-s.view, s.normal);
        float nv = max(dot(s.normal, s.view), 0.0);
        vec3 prefiltered = textureLod(uEnvironment, reflected, s.roughness * uOutput.y).rgb * uOutput.x * uEnvironmentScale;
        // Analytic approximation of the split-sum environment BRDF.
        vec4 r = s.roughness * vec4(-1.0, -0.0275, -0.572, 0.022) + vec4(1.0, 0.0425, 1.04, -0.04);
        float a004 = min(r.x * r.x, exp2(-9.28 * nv)) * r.x + r.y;
        vec2 scaleBias = vec2(-1.04, 1.04) * a004 + r.zw;
        color += prefiltered * (s.f0 * scaleBias.x + scaleBias.y) * occlusion;
    }
    #endif

    int directionalCount = int(uLightCounts.x), pointCount = int(uLightCounts.y), spotCount = int(uLightCounts.z);
    for (int i = 0; i < directionalCount; i++) {
        float visible = 1.0;
        #ifdef RECEIVE_SHADOW
        if (uDirectionalDirection[i].w >= 0.0) {
            visible = float(i) == uCascadeInfo.x ? cascadedShadowFactor(int(uDirectionalDirection[i].w), vWorldPosition, s.normal) : shadowFactor(int(uDirectionalDirection[i].w), vWorldPosition, s.normal);
        }
        #endif
        if (visible > 0.0) color += shade(s, -uDirectionalDirection[i].xyz, uDirectionalColor[i].rgb) * visible;
    }
    for (int i = 0; i < pointCount; i++) {
        vec3 toLight = uPointPosition[i].xyz - vWorldPosition;
        float dist = length(toLight);
        float visible = 1.0;
        #ifdef RECEIVE_SHADOW
        if (float(i) == uPointShadow.x) visible = pointShadowFactor(int(uPointShadow.y), -toLight, vWorldPosition, s.normal);
        #endif
        color += shade(s, toLight / max(dist, 0.0001), uPointColor[i].rgb * rangeFalloff(dist, uPointPosition[i].w)) * visible;
    }
    // Point lights past the eight: only those whose range reaches this pixel's screen tile are visited.
    if (uTileInfo.x > 0.5) {
        ivec2 tileAt = clamp(ivec2((gl_FragCoord.xy - vec2(uTileGrid.w, uTileInfo.w)) / uTileGrid.z), ivec2(0), ivec2(uTileGrid.xy) - 1);
        vec4 head = tiledTexel(int(uTileInfo.y) + tileAt.y * int(uTileGrid.x) + tileAt.x);
        int first = int(head.x), tileCount = int(head.y);
        for (int k = 0; k < 32; k++) {
            if (k >= tileCount) break;
            int slot = first + k;
            int lightIndex = int(tiledTexel(int(uTileInfo.z) + slot / 4)[slot % 4]);
            vec4 lightPosition = tiledTexel(lightIndex * 2), lightColor = tiledTexel(lightIndex * 2 + 1);
            vec3 toLight = lightPosition.xyz - vWorldPosition;
            float dist = length(toLight);
            if (dist >= lightPosition.w) continue;
            color += shade(s, toLight / max(dist, 0.0001), lightColor.rgb * rangeFalloff(dist, lightPosition.w));
        }
    }
    for (int i = 0; i < spotCount; i++) {
        vec3 toLight = uSpotPosition[i].xyz - vWorldPosition;
        float dist = length(toLight);
        vec3 l = toLight / max(dist, 0.0001);
        float cone = smoothstep(uSpotCone[i].x, uSpotCone[i].y, dot(-l, uSpotDirection[i].xyz));
        if (cone <= 0.0) continue;
        float visible = 1.0;
        #ifdef RECEIVE_SHADOW
        if (uSpotDirection[i].w >= 0.0) visible = shadowFactor(int(uSpotDirection[i].w), vWorldPosition, s.normal);
        #endif
        color += shade(s, l, uSpotColor[i].rgb * rangeFalloff(dist, uSpotPosition[i].w) * cone) * visible;
    }
    #endif

    #ifndef SHADING_MATCAP
    vec3 emissive = uEmissive;
    #ifdef USE_EMISSIVE_MAP
    #ifdef EMISSIVE_UV1
    emissive *= texture(uEmissiveMap, vUv1).rgb;
    #else
    emissive *= texture(uEmissiveMap, vUv).rgb;
    #endif
    #endif
    color += emissive;
    #endif

    #ifdef CUSTOM_FRAGMENT
    vec4 customized = customFragment(vec4(color, base.a), vWorldPosition, normalize(vNormal), vUv);
    color = customized.rgb; base.a = customized.a;
    #ifdef USE_TRANSMISSION
    // On a see-through material the hook's alpha is how much still passes: 0 covers what lies behind.
    through *= clamp(customized.a, 0.0, 1.0);
    #endif
    #endif
    #ifdef USE_FOG
    if (uFogParams.x > 0.5) {
        float dist = length(uCameraPosition.xyz - vWorldPosition);
        float fog = uFogParams.x > 1.5 ? 1.0 - exp(-uFogParams.y * uFogParams.y * dist * dist)
            : smoothstep(uFogParams.y, uFogParams.z, dist);
        color = mix(color, uFogColor.rgb, clamp(fog, 0.0, 1.0));
        #ifdef USE_TRANSMISSION
        clear = 1.0 - clamp(fog, 0.0, 1.0);
        #endif
        #ifdef USE_REFLECTION_MAP
        mirrorClear = 1.0 - clamp(fog, 0.0, 1.0);
        #endif
    }
    #endif
    #ifdef TONE_MAPPED
    color = toneMap(color);
    #endif
    #ifdef USE_TRANSMISSION
    // The stored scene is display-ready, so it joins after tone mapping; the canvas holds it sRGB-encoded.
    #ifndef LINEAR_OUTPUT
    passed = mix(passed / 12.92, pow((passed + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), passed));
    #endif
    color += passed * tint * through * clear;
    #endif
    #ifdef USE_REFLECTION_MAP
    // The mirror image is display-ready too.
    color += mirrored * mirrorClear;
    #endif
    #ifdef LINEAR_OUTPUT
    // sRGB render targets encode on write; hand them linear values. Fixed-point
    // targets clamp by themselves, and half-float targets must keep values above 1.
    color = max(color, vec3(0.0));
    #else
    color = encodeSrgb(color);
    #endif
    #ifdef ALPHA_BLEND
    #ifdef PREMULTIPLIED_ALPHA
    color *= base.a;
    #endif
    outColor = vec4(color, base.a);
    #else
    outColor = vec4(color, 1.0);
    #endif
    #endif
}
`;function be(h,i="",t="",e=""){let r=`#version 300 es
precision highp float;
precision highp int;
`+h.map(o=>"#define "+o+`
`).join("");return{vertex:r+Ue.replace("/*CUSTOM_VERTEX*/",()=>t),fragment:r+Le.replace("/*CUSTOM_FRAGMENT*/",()=>i).replace("/*CUSTOM_NORMAL*/",()=>e)}}w(be,"buildMaterialShader3D");var Se=Object.freeze({vertex:`#version 300 es
precision highp float;
uniform mat4 uInverseViewProjection;
out vec3 vDirection;
void main() {
    vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
    vec4 far = uInverseViewProjection * vec4(corner, 1.0, 1.0);
    vec4 near = uInverseViewProjection * vec4(corner, -1.0, 1.0);
    vDirection = far.xyz / far.w - near.xyz / near.w;
    gl_Position = vec4(corner, 1.0, 1.0);
}
`,fragment:`#version 300 es
precision highp float;
uniform samplerCube uEnvironment;
uniform vec4 uOutput; // x: intensity, y: 1 keeps linear output, z: exposure, w: tone mapping
in vec3 vDirection;
out vec4 outColor;
void main() {
    vec3 color = texture(uEnvironment, normalize(vDirection)).rgb * uOutput.x * uOutput.z;
    if (uOutput.w > 1.5) color = clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);
    else if (uOutput.w > 0.5) color = color / (1.0 + color);
    color = clamp(color, 0.0, 1.0);
    if (uOutput.y < 0.5) color = mix(color * 12.92, 1.055 * pow(color, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), color));
    outColor = vec4(color, 1.0);
}
`});var we=["position","normal","uv","tangent","color","joints","weights","uv1"],j=600,G=class{static{w(this,"GpuResources3D")}#e;#i=new Map;#n=new Map;#o;#a=new Map;#s=new Map;#f=new Map;#t=new Map;#c=new Map;#h=new Map;#l;#u;#d;floatTargets;#r=1;constructor(i){this.#e=i,this.#l=i.getExtension("EXT_texture_filter_anisotropic"),this.#u=this.#l?i.getParameter(34047):1,this.#d=i.getParameter(i.MAX_TEXTURE_SIZE),this.floatTargets=i.getExtension("EXT_color_buffer_float")!==null||i.getExtension("EXT_color_buffer_half_float")!==null}get counts(){return{programs:this.#i.size,geometries:this.#a.size,textures:this.#t.size}}get hasPendingPrograms(){return this.#n.size>0}canUsePreparedAlternative(i,t){return this.#n.has(i)&&this.#i.has(t)}program(i,t){let e=this.#i.get(i);return e||this.finishProgram(this.startProgram(i,t),!1)}async preparePrograms(i){let t=this.#e;if(this.requireProgramContext(),!i.some(({key:n})=>!this.#i.has(n)))return;let e=t.getExtension("KHR_parallel_shader_compile")?.COMPLETION_STATUS_KHR,r=new Set,o;try{for(let{key:n,sources:s}of i)this.#i.has(n)||r.add(this.startProgram(n,s))}catch(n){o={error:n}}for(;r.size;){this.requireProgramContext();for(let n of r)if(!(!n.result&&e!==void 0&&!t.getProgramParameter(n.program,e))){try{this.finishProgram(n,!0)}catch(s){o??={error:s}}r.delete(n)}r.size&&await new Promise(n=>setTimeout(n,0))}if(o)throw o.error}requireProgramContext(){if(this.#o==="disposed")throw new p("WORLD3D_DISPOSED","renderer");if(this.#o==="lost"||this.#e.isContextLost())throw new p("WORLD3D_CONTEXT_LOST","program preparation")}startProgram(i,t){this.requireProgramContext();let e=this.#n.get(i);if(e)return e;let r=this.#e,{vertex:o,fragment:n}=t(),s=[],a=null;try{for(let[u,c]of[[r.VERTEX_SHADER,o],[r.FRAGMENT_SHADER,n]]){let l=r.createShader(u);if(!l)throw new p("WORLD3D_CONTEXT_LOST","createShader");s.push(l),r.shaderSource(l,c),r.compileShader(l)}if(a=r.createProgram(),!a)throw new p("WORLD3D_CONTEXT_LOST","createProgram");for(let u of s)r.attachShader(a,u);r.linkProgram(a);let f={key:i,program:a,shaders:s};return this.#n.set(i,f),f}catch(f){if(!r.isContextLost()){for(let u of s)r.deleteShader(u);a&&r.deleteProgram(a)}throw f}}finishProgram(i,t){this.requireProgramContext();let e=i.result;if(e){if("error"in e)throw e.error;return e.value}let r=this.#e,{key:o,program:n,shaders:s}=i;try{let a=r.getProgramParameter(n,r.LINK_STATUS);if(this.requireProgramContext(),!a){let u=[...s.map(c=>r.getShaderInfoLog(c)),r.getProgramInfoLog(n)].filter(Boolean).join(`
`);throw new p("WORLD3D_SHADER_FAILED",o+`
`+u)}let f=this.initializeProgram(n,t);return this.requireProgramContext(),i.result={value:f},this.#i.set(o,f),f}catch(a){throw i.result={error:a},r.isContextLost()||r.deleteProgram(n),a}finally{if(this.#n.delete(o),!r.isContextLost())for(let a of s)r.deleteShader(a)}}initializeProgram(i,t){let e=this.#e,r={},o=e.getProgramParameter(i,e.ACTIVE_UNIFORMS);for(let f=0;f<o;f++){let u=e.getActiveUniform(i,f);if(!u)continue;let c=u.name.replace(/\[0\]$/,""),l=e.getUniformLocation(i,u.name);l&&(r[c]=l)}let n=e.getUniformBlockIndex(i,"Frame");n!==e.INVALID_INDEX&&e.uniformBlockBinding(i,n,0);let s={uMap:m.map,uNormalMap:m.normalMap,uMetallicRoughnessMap:m.metallicRoughnessMap,uOcclusionMap:m.occlusionMap,uEmissiveMap:m.emissiveMap,uLightMap:m.lightMap,uReflectionMap:m.reflectionMap,uSceneDepth:m.sceneDepth,uTiledLights:m.tiledLights,uSplatWeights:m.lightMap,uSplat0:m.map,uSplat1:m.emissiveMap,uSplat2:m.occlusionMap,uSplat3:m.metallicRoughnessMap,uEnvironment:m.environment,uShadowMap:m.shadow,uBoneTexture:m.bones,uMorphTexture:m.morph,uSceneColor:m.sceneColor},a=t?e.getParameter(e.CURRENT_PROGRAM):void 0;e.useProgram(i);try{for(let f in s)r[f]&&e.uniform1i(r[f],s[f])}finally{a!==void 0&&a!==i&&!e.isContextLost()&&e.useProgram(a)}return{id:this.#r++,program:i,uniforms:r}}upload(i,t,e){if(t.version===e.version)return;let r=this.#e,o=e.data;r.bindBuffer(i,t.buffer),t.byteLength===o.byteLength?r.bufferSubData(i,0,o):r.bufferData(i,o,e.dynamic?r.DYNAMIC_DRAW:r.STATIC_DRAW),t.byteLength=o.byteLength,t.version=e.version}glType(i){let t=this.#e;return i instanceof Float32Array?t.FLOAT:i instanceof Uint16Array?t.UNSIGNED_SHORT:i instanceof Uint32Array?t.UNSIGNED_INT:i instanceof Uint8Array?t.UNSIGNED_BYTE:i instanceof Int16Array?t.SHORT:t.BYTE}buffer(){let i=this.#e.createBuffer();if(!i)throw new p("WORLD3D_CONTEXT_LOST","createBuffer");return i}bindAttributes(i,t){let e=this.#e;for(let r of we){let o=I[r],n=i.getAttribute(r),s=t.buffers.get(r);if(!n||!s){e.disableVertexAttribArray(o);continue}e.bindBuffer(e.ARRAY_BUFFER,s.buffer),e.enableVertexAttribArray(o),r==="joints"?e.vertexAttribIPointer(o,n.itemSize,this.glType(n.data),0,0):e.vertexAttribPointer(o,n.itemSize,this.glType(n.data),n.normalized,0,0)}e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.index?t.index.buffer:null)}geometry(i){let t=this.#e,e=this.#a.get(i);if(e&&e.version===i.version&&e.layoutVersion===i.layoutVersion){let n=!1;for(let[s,a]of e.buffers)if(i.getAttribute(s)?.version!==a.version){n=!0;break}if(!n&&(!e.index||e.index.version===i.index?.version))return e}if(!e){let n=t.createVertexArray();if(!n)throw new p("WORLD3D_CONTEXT_LOST","createVertexArray");let s={vao:n,buffers:new Map,index:void 0,wire:void 0,layoutVersion:-1,version:-1,indexType:t.UNSIGNED_SHORT,indexed:!1,morph:void 0,unsubscribe:i.onDispose(()=>this.releaseGeometry(i))};this.#a.set(i,e=s)}let r=e.layoutVersion!==i.layoutVersion;t.bindVertexArray(null);for(let n of we){let s=i.getAttribute(n),a=e.buffers.get(n);if(!s){a&&(t.deleteBuffer(a.buffer),e.buffers.delete(n));continue}a||e.buffers.set(n,a={buffer:this.buffer(),version:-1,byteLength:-1}),this.upload(t.ARRAY_BUFFER,a,s)}let o=i.index;return o?(e.index??={buffer:this.buffer(),version:-1,byteLength:-1},t.bindVertexArray(e.vao),this.upload(t.ELEMENT_ARRAY_BUFFER,e.index,o),e.indexType=this.glType(o.data)):e.index&&(t.deleteBuffer(e.index.buffer),e.index=void 0),e.indexed=o!==void 0,r&&(t.bindVertexArray(e.vao),this.bindAttributes(i,e),this.buildMorph(i,e),this.releaseWire(e)),t.bindVertexArray(null),e.layoutVersion=i.layoutVersion,e.version=i.version,e}buildMorph(i,t){let e=this.#e,r=i.morphTargets;if(t.morph&&(e.deleteTexture(t.morph.texture),t.morph=void 0),r.length===0)return;let o=i.vertexCount,n=r.some(l=>l.normal)?2:1,s=r.length*n*o,a=Math.min(this.#d,Math.max(1,Math.ceil(Math.sqrt(s)))),f=Math.ceil(s/a);if(f>this.#d)throw new p("WORLD3D_BUDGET","morph target data");let u=new Float32Array(a*f*4);r.forEach((l,T)=>{[l.position,l.normal].slice(0,n).forEach((g,A)=>{if(!g)return;let _=(T*n+A)*o*4;for(let E=0;E<o;E++)u[_+E*4]=g[E*3],u[_+E*4+1]=g[E*3+1],u[_+E*4+2]=g[E*3+2]})});let c=this.dataTexture(a,f,u);t.morph={texture:c,width:a,attributes:n,vertexCount:o}}dataTexture(i,t,e){let r=this.#e,o=r.createTexture();if(!o)throw new p("WORLD3D_CONTEXT_LOST","createTexture");return r.activeTexture(r.TEXTURE0+m.morph),r.bindTexture(r.TEXTURE_2D,o),r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,!1),r.texImage2D(r.TEXTURE_2D,0,r.RGBA32F,i,t,0,r.RGBA,r.FLOAT,e),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.NEAREST),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.NEAREST),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),o}wireframe(i){let t=this.#a.get(i);if(t.wire&&t.wire.version===i.version)return t.wire;let e=this.#e,r=i.index?.data,o=Math.floor(i.drawCount/3),n=i.vertexCount>65535?new Uint32Array(o*6):new Uint16Array(o*6);for(let u=0;u<o;u++){let c=r?r[u*3]:u*3,l=r?r[u*3+1]:u*3+1,T=r?r[u*3+2]:u*3+2;n.set([c,l,l,T,T,c],u*6)}this.releaseWire(t);let s=this.buffer(),a=e.createVertexArray();if(!a)throw new p("WORLD3D_CONTEXT_LOST","createVertexArray");e.bindVertexArray(a),this.bindAttributes(i,t),e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,s),e.bufferData(e.ELEMENT_ARRAY_BUFFER,n,e.STATIC_DRAW),e.bindVertexArray(null);let f={vao:a,buffer:s,version:i.version,byteLength:n.byteLength,count:n.length,type:this.glType(n)};return t.wire=f,f}releaseWire(i){i.wire&&(this.#e.deleteBuffer(i.wire.buffer),this.#e.deleteVertexArray(i.wire.vao),i.wire=void 0)}releaseGeometry(i){let t=this.#a.get(i),e=this.#e;if(t){this.#a.delete(i);for(let r of t.buffers.values())e.deleteBuffer(r.buffer);t.index&&e.deleteBuffer(t.index.buffer),this.releaseWire(t),t.morph&&e.deleteTexture(t.morph.texture),e.deleteVertexArray(t.vao)}}instanceBuffer(){return{buffer:this.buffer(),source:void 0,version:-1,byteLength:-1,uploadedCount:0}}uploadInstances(i,t,e,r,o){if(i.source===t&&i.version===o&&r<=i.uploadedCount)return;let n=this.#e;n.bindBuffer(n.ARRAY_BUFFER,i.buffer),i.byteLength!==t.byteLength?(n.bufferData(n.ARRAY_BUFFER,t,n.DYNAMIC_DRAW),i.byteLength=t.byteLength,i.uploadedCount=t.length/e):(r>0&&n.bufferSubData(n.ARRAY_BUFFER,0,t,0,r*e),i.uploadedCount=r),i.source=t,i.version=o}instances(i,t){let e=this.#e,r=i.geometry;this.geometry(r);let o=this.#a.get(r),n=this.#s.get(i);if(!n){let _=e.createVertexArray();if(!_)throw new p("WORLD3D_CONTEXT_LOST","createVertexArray");this.#s.set(i,n={vao:_,matrices:this.instanceBuffer(),colors:void 0,layoutVersion:-1,geometryId:-1,lastFrame:t})}n.lastFrame=t;let s=i instanceof B?i:void 0,a=s?.drawMatrices??i.instanceMatrices,f=s?s.drawColors:i.instanceColors,u=s?.drawCount??i.count,c=s?.drawAnimation,l=n.layoutVersion!==r.layoutVersion||n.geometryId!==r.id||!!f!=!!n.colors?.source||c!==void 0&&!n.animation,T=s?void 0:ee(i),g=T?.matrices??i.instanceVersion,A=T?.colors??i.instanceVersion;if(this.uploadInstances(n.matrices,a,16,u,g),f?(n.colors??=this.instanceBuffer(),this.uploadInstances(n.colors,f,i.instanceColorSize,u,A)):n.colors&&(n.colors.source=void 0),c&&(n.animation??=this.instanceBuffer(),this.uploadInstances(n.animation,c,12,u,i.instanceVersion)),l){e.bindVertexArray(n.vao),this.bindAttributes(r,o),e.bindBuffer(e.ARRAY_BUFFER,n.matrices.buffer);for(let _=0;_<4;_++){let E=I.instanceMatrix+_;e.enableVertexAttribArray(E),e.vertexAttribPointer(E,4,e.FLOAT,!1,64,_*16),e.vertexAttribDivisor(E,1)}if(n.colors?.source?(e.bindBuffer(e.ARRAY_BUFFER,n.colors.buffer),e.enableVertexAttribArray(I.instanceColor),e.vertexAttribPointer(I.instanceColor,i.instanceColorSize,e.FLOAT,!1,0,0),e.vertexAttribDivisor(I.instanceColor,1)):n.colors&&e.disableVertexAttribArray(I.instanceColor),n.animation){e.bindBuffer(e.ARRAY_BUFFER,n.animation.buffer);for(let _=0;_<3;_++)e.enableVertexAttribArray(I.instanceAnimation+_),e.vertexAttribPointer(I.instanceAnimation+_,4,e.FLOAT,!1,48,_*16),e.vertexAttribDivisor(I.instanceAnimation+_,1)}e.bindVertexArray(null),n.layoutVersion=r.layoutVersion,n.geometryId=r.id}return n.vao}bones(i,t){let e=this.#e,r=i.bones.length,o=this.#c.get(i);return(!o||o.count!==r)&&(o&&e.deleteTexture(o.texture),this.#c.set(i,o={texture:this.dataTexture(4,Math.max(r,1),null),version:-1,count:r,lastFrame:t})),o.lastFrame=t,o.version!==i.version&&r>0&&(e.activeTexture(e.TEXTURE0+m.bones),e.bindTexture(e.TEXTURE_2D,o.texture),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.texSubImage2D(e.TEXTURE_2D,0,0,0,4,r,e.RGBA,e.FLOAT,i.boneMatrices),o.version=i.version),o.texture}animations(i){let t=this.#f.get(i);if(!t){let r=Math.max(1,Math.ceil(i.data.length/4/2048)),o=i.data;o.length!==2048*r*4&&(o=new Float32Array(2048*r*4),o.set(i.data)),t=this.dataTexture(2048,r,o),this.#f.set(i,t);let n=this.#e,s=t;i.onDispose(()=>{this.#f.get(i)===s&&(n.deleteTexture(s),this.#f.delete(i))})}return t}applySampler(i,t){let e=this.#e,r=w(n=>n==="clamp"?e.CLAMP_TO_EDGE:n==="mirror"?e.MIRRORED_REPEAT:e.REPEAT,"wrap");e.texParameteri(i,e.TEXTURE_WRAP_S,r(t.wrapS)),e.texParameteri(i,e.TEXTURE_WRAP_T,r(t.wrapT)),e.texParameteri(i,e.TEXTURE_MAG_FILTER,t.magFilter==="nearest"?e.NEAREST:e.LINEAR);let o=t.mipmaps?t.minFilter==="nearest"?e.NEAREST_MIPMAP_LINEAR:e.LINEAR_MIPMAP_LINEAR:t.minFilter==="nearest"?e.NEAREST:e.LINEAR;e.texParameteri(i,e.TEXTURE_MIN_FILTER,o),this.#l&&t.anisotropy>1&&e.texParameterf(i,this.#l.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(t.anisotropy,this.#u))}image(i,t,e){let r=this.#e;if(re(t))return r.texImage2D(i,0,e,t.width,t.height,0,r.RGBA,r.UNSIGNED_BYTE,t.data),Math.max(t.width,t.height);r.texImage2D(i,0,e,r.RGBA,r.UNSIGNED_BYTE,t);let o=t;return Math.max(o.videoWidth??o.width??1,o.videoHeight??o.height??1)}textureEntry(i){let t=this.#t.get(i);if(!t){let e=this.#e.createTexture();if(!e)throw new p("WORLD3D_CONTEXT_LOST","createTexture");let r={texture:e,version:-1,maxMip:0,unsubscribe:i.onDispose(()=>{this.#t.delete(i)&&this.#e.deleteTexture(e)})};this.#t.set(i,t=r)}return t}bindTexture(i,t){let e=this.#e;if(t.source instanceof F){let o=this.target(t.source).color;e.activeTexture(e.TEXTURE0+i),e.bindTexture(e.TEXTURE_2D,o);return}let r=this.textureEntry(t);e.activeTexture(e.TEXTURE0+i),e.bindTexture(e.TEXTURE_2D,r.texture),r.version!==t.version&&(e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,t.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.NONE),ie(t.source)?this.compressedImage(t.source,t.colorSpace==="srgb"):(e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAX_LEVEL,1e3),this.image(e.TEXTURE_2D,t.source,t.colorSpace==="srgb"?e.SRGB8_ALPHA8:e.RGBA8),t.mipmaps&&e.generateMipmap(e.TEXTURE_2D)),this.applySampler(e.TEXTURE_2D,t),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),r.version=t.version)}compressedFormat(i,t){let e=this.#e,o={bc1:[["WEBGL_compressed_texture_s3tc","WEBGL_compressed_texture_s3tc_srgb"],33777,35917],bc3:[["WEBGL_compressed_texture_s3tc","WEBGL_compressed_texture_s3tc_srgb"],33779,35919],bc7:[["EXT_texture_compression_bptc"],36492,36493],"etc2-rgb8":[["WEBGL_compressed_texture_etc"],37492,37493],"etc2-rgba8":[["WEBGL_compressed_texture_etc"],37496,37497],"astc-4x4":[["WEBGL_compressed_texture_astc"],37808,37840]}[i];if(!o)return;let n=o[0].length===2?[o[0][t?1:0]]:o[0];for(let s of n)if(!e.getExtension(s))return;return t?o[2]:o[1]}compressedImage(i,t){let e=this.#e,r=this.compressedFormat(i.format,t);if(r===void 0)throw new p("WORLD3D_RESOURCE_FAILED","compressed format "+i.format+" is not supported by this device");let o=i.width,n=i.height;i.levels.forEach((s,a)=>{e.compressedTexImage2D(e.TEXTURE_2D,a,r,o,n,0,s),o=Math.max(1,o>>1),n=Math.max(1,n>>1)}),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAX_LEVEL,i.levels.length-1)}bindCube(i,t){let e=this.#e,r=this.textureEntry(t);if(e.activeTexture(e.TEXTURE0+i),e.bindTexture(e.TEXTURE_CUBE_MAP,r.texture),r.version===t.version)return r.maxMip;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.NONE);let o=1;return t.faces.forEach((n,s)=>{o=this.image(e.TEXTURE_CUBE_MAP_POSITIVE_X+s,n,t.colorSpace==="srgb"?e.SRGB8_ALPHA8:e.RGBA8)}),t.mipmaps&&e.generateMipmap(e.TEXTURE_CUBE_MAP),this.applySampler(e.TEXTURE_CUBE_MAP,t),r.maxMip=t.mipmaps?Math.floor(Math.log2(o)):0,r.version=t.version,r.maxMip}target(i){let t=this.#e;if(i.isDisposed)throw new p("WORLD3D_DISPOSED","render target");let e=this.#h.get(i);if(e&&e.version===i.version)return e;if(i.width>this.#d||i.height>this.#d)throw new p("WORLD3D_BUDGET","render target size");let r=!e;if(!e){let a=t.createFramebuffer(),f=t.createTexture();if(!a||!f)throw a&&t.deleteFramebuffer(a),f&&t.deleteTexture(f),new p("WORLD3D_CONTEXT_LOST","createFramebuffer");e={framebuffer:a,color:f,depth:void 0,depthTexture:void 0,version:-1,unsubscribe:i.onDispose(()=>this.releaseTarget(i))},this.#h.set(i,e)}let o=t.getParameter(t.DRAW_FRAMEBUFFER_BINDING),n=t.getParameter(t.TEXTURE_BINDING_2D),s=t.getParameter(t.RENDERBUFFER_BINDING);try{if(t.bindTexture(t.TEXTURE_2D,e.color),i.format==="rgba16f"&&this.floatTargets?t.texImage2D(t.TEXTURE_2D,0,t.RGBA16F,i.width,i.height,0,t.RGBA,t.HALF_FLOAT,null):t.texImage2D(t.TEXTURE_2D,0,t.SRGB8_ALPHA8,i.width,i.height,0,t.RGBA,t.UNSIGNED_BYTE,null),this.applySampler(t.TEXTURE_2D,i.texture),t.bindFramebuffer(t.DRAW_FRAMEBUFFER,e.framebuffer),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,e.color,0),i.depthTexture){if(e.depthTexture??=t.createTexture()??void 0,!e.depthTexture)throw new p("WORLD3D_CONTEXT_LOST","createTexture");t.bindTexture(t.TEXTURE_2D,e.depthTexture),t.texImage2D(t.TEXTURE_2D,0,t.DEPTH_COMPONENT24,i.width,i.height,0,t.DEPTH_COMPONENT,t.UNSIGNED_INT,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.NEAREST),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.framebufferTexture2D(t.DRAW_FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.TEXTURE_2D,e.depthTexture,0)}else if(i.depth){if(e.depth??=t.createRenderbuffer()??void 0,!e.depth)throw new p("WORLD3D_CONTEXT_LOST","createRenderbuffer");t.bindRenderbuffer(t.RENDERBUFFER,e.depth),t.renderbufferStorage(t.RENDERBUFFER,t.DEPTH_COMPONENT24,i.width,i.height),t.framebufferRenderbuffer(t.DRAW_FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.RENDERBUFFER,e.depth)}if(t.checkFramebufferStatus(t.DRAW_FRAMEBUFFER)!==t.FRAMEBUFFER_COMPLETE&&!t.isContextLost())throw new p("WORLD3D_RESOURCE_FAILED","render target is incomplete");return e.version=i.version,e}catch(a){throw r&&(e.unsubscribe(),this.releaseTarget(i)),a}finally{t.bindFramebuffer(t.DRAW_FRAMEBUFFER,o),t.bindTexture(t.TEXTURE_2D,n),t.bindRenderbuffer(t.RENDERBUFFER,s)}}releaseTarget(i){let t=this.#h.get(i),e=this.#e;t&&(this.#h.delete(i),e.deleteFramebuffer(t.framebuffer),e.deleteTexture(t.color),t.depth&&e.deleteRenderbuffer(t.depth),t.depthTexture&&e.deleteTexture(t.depthTexture))}prune(i){if(i%j!==0)return;let t=this.#e;for(let[e,r]of this.#s)i-r.lastFrame<j||(t.deleteBuffer(r.matrices.buffer),r.colors&&t.deleteBuffer(r.colors.buffer),r.animation&&t.deleteBuffer(r.animation.buffer),t.deleteVertexArray(r.vao),this.#s.delete(e));for(let[e,r]of this.#c)i-r.lastFrame<j||(t.deleteTexture(r.texture),this.#c.delete(e))}reset(){this.#o="lost",this.#n.clear();for(let i of this.#a.values())i.unsubscribe();for(let i of this.#t.values())i.unsubscribe();for(let i of this.#h.values())i.unsubscribe();this.#i.clear(),this.#a.clear(),this.#s.clear(),this.#t.clear(),this.#c.clear(),this.#h.clear(),this.#f.clear()}dispose(){let i=this.#e;this.#o="disposed";for(let{program:t,shaders:e}of this.#n.values()){for(let r of e)i.deleteShader(r);i.deleteProgram(t)}this.#n.clear();for(let t of[...this.#a.keys()])this.#a.get(t).unsubscribe(),this.releaseGeometry(t);for(let t of this.#t.values())t.unsubscribe(),i.deleteTexture(t.texture);for(let t of this.#s.values())i.deleteBuffer(t.matrices.buffer),t.colors&&i.deleteBuffer(t.colors.buffer),t.animation&&i.deleteBuffer(t.animation.buffer),i.deleteVertexArray(t.vao);for(let t of this.#f.values())i.deleteTexture(t);this.#f.clear();for(let t of this.#c.values())i.deleteTexture(t.texture);for(let t of[...this.#h.keys()])this.#h.get(t).unsubscribe(),this.releaseTarget(t);for(let t of this.#i.values())i.deleteProgram(t.program);this.#i.clear(),this.#t.clear(),this.#s.clear(),this.#c.clear()}};var d=Object.freeze({normal:1,tangent:2,uv:4,color:8,skin:16,morph:32,morphNormals:64,instancing:128,instanceColor:256,receiveShadow:512,fog:1024,toneMapped:2048,environment:4096,points:8192,depthOnly:16384,linearOutput:32768,mapFromTarget:65536,uv1:131072,occlusionSecond:262144,emissiveSecond:524288,lightSecond:1048576,transmission:2097152,skinInstancing:4194304,gpuParticles:8388608,softDepth:16777216}),Ie=new Float32Array([1,0,0,0,1,0,0,0,1]);function Ae(h,i,t){let e=w(n=>(i&n)!==0,"has"),r=e(d.uv),o=[];if(t?o.push("DEPTH_ONLY"):o.push(h.shading==="unlit"?"SHADING_UNLIT":h.shading==="lambert"?"SHADING_LAMBERT":h.shading==="phong"?"SHADING_PHONG":h.shading==="toon"?"SHADING_TOON":h.shading==="matcap"?"SHADING_MATCAP":"SHADING_STANDARD"),e(d.normal)&&o.push("USE_NORMAL"),e(d.skin)&&o.push("USE_SKINNING"),e(d.morph)&&o.push("USE_MORPH"),e(d.morphNormals)&&(!t||h.shader?.glslVertex!==void 0)&&o.push("USE_MORPH_NORMALS"),e(d.instancing)&&o.push("USE_INSTANCING"),e(d.skinInstancing)&&o.push("USE_SKIN_INSTANCING"),e(d.gpuParticles)&&!t&&o.push("GPU_PARTICLES"),e(d.softDepth)&&o.push("USE_SOFT_DEPTH"),e(d.points)&&o.push("POINTS"),h.screenSpace?o.push("SCREEN_SPACE"):h.billboard&&o.push("BILLBOARD"),r&&h.map&&(o.push("USE_MAP"),e(d.mapFromTarget)&&o.push("MAP_FROM_TARGET")),r&&h.splat&&!t&&o.push("USE_SPLAT"),h.alphaMode==="mask"&&o.push("ALPHA_MASK"),h.alphaMode==="blend"&&(o.push("ALPHA_BLEND"),!t&&h.blending==="premultiplied"&&o.push("PREMULTIPLIED_ALPHA")),e(d.color)&&o.push("USE_VERTEX_COLOR"),!t){let n=h.shading!=="unlit"&&h.shading!=="matcap";e(d.instanceColor)&&o.push("USE_INSTANCE_COLOR"),n&&r&&h.normalMap&&(o.push("USE_NORMAL_MAP"),e(d.tangent)&&o.push("USE_TANGENT")),n&&r&&h.metallicRoughnessMap&&h.shading==="standard"&&o.push("USE_MR_MAP");let s=e(d.occlusionSecond),a=e(d.emissiveSecond);n&&(r||s)&&h.occlusionMap&&(o.push("USE_AO_MAP"),s&&o.push("AO_UV1")),(r||a)&&h.emissiveMap&&h.shading!=="matcap"&&(o.push("USE_EMISSIVE_MAP"),a&&o.push("EMISSIVE_UV1")),n&&h.lightMap&&(r||e(d.lightSecond))&&(o.push("USE_LIGHT_MAP"),e(d.lightSecond)&&o.push("LIGHT_UV1")),h.flatShading&&o.push("FLAT_SHADED"),h.side==="double"&&o.push("DOUBLE_SIDED"),n&&e(d.receiveShadow)&&o.push("RECEIVE_SHADOW"),n&&e(d.environment)&&o.push("USE_ENVIRONMENT"),e(d.fog)&&h.fog&&o.push("USE_FOG"),e(d.toneMapped)&&h.toneMapped&&o.push("TONE_MAPPED"),e(d.linearOutput)&&o.push("LINEAR_OUTPUT"),e(d.transmission)&&h.shading==="standard"&&o.push("USE_TRANSMISSION"),h.reflectionMap&&h.shading==="standard"&&o.push("USE_REFLECTION_MAP")}return o}w(Ae,"buildMaterialDefinesWebGL23D");function De(h,i,t,e,r,o){i.uColor&&h.uniform4f(i.uColor,r.color[0],r.color[1],r.color[2],r.opacity),i.uAlphaCutoff&&h.uniform1f(i.uAlphaCutoff,r.alphaCutoff);let n=i["uCustom[0]"]??i.uCustom;if(n&&r.shader&&h.uniform4fv(n,r.shader.uniforms),i.uMap&&r.map&&t.bindTexture(m.map,r.map),i.uUvTransform){let f=r.map;if(f?.hasTransform){let u=Math.cos(f.rotation),c=Math.sin(f.rotation),l=e;l[0]=u*f.repeat[0],l[1]=c*f.repeat[0],l[2]=0,l[3]=-c*f.repeat[1],l[4]=u*f.repeat[1],l[5]=0,l[6]=f.offset[0],l[7]=f.offset[1],l[8]=1,h.uniformMatrix3fv(i.uUvTransform,!1,l)}else h.uniformMatrix3fv(i.uUvTransform,!1,Ie)}if(i.uSprite&&h.uniform4f(i.uSprite,r.rotation,r.sizeAttenuation?1:0,0,0),i.uPointSize&&h.uniform2f(i.uPointSize,r.pointSize,r.sizeAttenuation?1:0),o)return;let s=r.emissiveIntensity;i.uEmissive&&h.uniform3f(i.uEmissive,r.emissive[0]*s,r.emissive[1]*s,r.emissive[2]*s),i.uClearcoat&&h.uniform2f(i.uClearcoat,r.clearcoat,r.clearcoatRoughness),i.uSurface&&h.uniform4f(i.uSurface,r.metallic,r.roughness,r.normalScale,r.occlusionStrength),i.uSpecular&&h.uniform4f(i.uSpecular,r.specular[0],r.specular[1],r.specular[2],r.shading==="toon"?r.toonSteps:r.shininess),i.uEnvironmentScale&&h.uniform1f(i.uEnvironmentScale,r.environmentIntensity),i.uNormalMap&&r.normalMap&&t.bindTexture(m.normalMap,r.normalMap),i.uMetallicRoughnessMap&&r.metallicRoughnessMap&&t.bindTexture(m.metallicRoughnessMap,r.metallicRoughnessMap),i.uOcclusionMap&&r.occlusionMap&&t.bindTexture(m.occlusionMap,r.occlusionMap),i.uEmissiveMap&&r.emissiveMap&&t.bindTexture(m.emissiveMap,r.emissiveMap),i.uLightMap&&r.lightMap&&t.bindTexture(m.lightMap,r.lightMap),i.uReflectionMap&&r.reflectionMap&&t.bindTexture(m.reflectionMap,r.reflectionMap);let a=r.splat;if(i.uSplatRepeat&&a){let f=w(u=>a.layers[u]??a.layers[0],"layer");t.bindTexture(m.map,f(0)),t.bindTexture(m.emissiveMap,f(1)),t.bindTexture(m.occlusionMap,f(2)),t.bindTexture(m.metallicRoughnessMap,f(3)),t.bindTexture(m.lightMap,a.weights),h.uniform4f(i.uSplatRepeat,a.repeat[0]??1,a.repeat[1]??1,a.repeat[2]??1,a.repeat[3]??1)}i.uSoftness&&h.uniform1f(i.uSoftness,r.softness),i.uReflection&&h.uniform2f(i.uReflection,r.reflectionStrength,r.reflectionDistortion),i.uSheen&&h.uniform4f(i.uSheen,r.sheenColor[0]*r.sheen,r.sheenColor[1]*r.sheen,r.sheenColor[2]*r.sheen,r.sheenRoughness),i.uExtra&&h.uniform2f(i.uExtra,r.lightMapIntensity,r.transmission),i.uRefraction&&h.uniform4f(i.uRefraction,r.ior,r.thickness,Number.isFinite(r.attenuationDistance)?r.attenuationDistance:0,0),i.uAttenuation&&h.uniform3f(i.uAttenuation,r.attenuationColor[0],r.attenuationColor[1],r.attenuationColor[2])}w(De,"applyMaterialWebGL23D");function ye(h,i,t){if(!t&&(h.layers&i.layerMask)===0)return!1;for(let e=h;e;e=e.parent)if(i.hidden.includes(e))return!1;return!0}w(ye,"includesReflectionMesh");var Fe=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);function Me(h,i,t,e){return(h?d.fog:0)|(i!=="none"?d.toneMapped:0)|(t?d.environment:0)|(e?d.linearOutput:0)}w(Me,"colorProgramFlags");var Y=class{static{w(this,"WebGL2Renderer3D")}canvas;toneMapping;exposure;shadowsEnabled;postProcess=pe();viewport;autoClear=!0;#e;#i;#n="main";#o;#a=new WeakSet;#s=-1;#f="none";info={frame:0,drawCalls:0,triangles:0,visited:0,culled:0,lightsDropped:0,lightsTiled:0,shadowMaps:0,programs:0,geometries:0,textures:0};#t;#c;#h;#l=new ae;#u=new Float32Array(le);#d=new Map;#r;#m=null;#R=null;#b;#S;#E;#L=!1;#G;#w=0;#I=!1;#p=!1;#x;#A="";#D="";#M;#v;#y=!1;#F;#W=new Float32Array(16);#P=new Float32Array(9);#C=new Float32Array(16);#H=new Int32Array(O);#j=new Float32Array(O);#N;#O;constructor(i){let t=i?.canvas;if(!t||typeof t.getContext!="function")throw new p("WORLD3D_INPUT_INVALID","canvas");this.#h=i,this.#c=i.alpha??!1;let e=t.getContext("webgl2",{alpha:this.#c,antialias:i.antialias??!0,depth:!0,stencil:!1,premultipliedAlpha:!0,powerPreference:i.powerPreference??"high-performance",preserveDrawingBuffer:i.preserveDrawingBuffer??!1});if(!e)throw new p("WORLD3D_CONTEXT_UNAVAILABLE","webgl2");this.canvas=t,this.#t=e,this.#i=new z(e),this.toneMapping=i.toneMapping??"aces",this.exposure=i.exposure??1,this.shadowsEnabled=i.shadows??!0,this.#G=Math.min(i.shadowAtlasSize??2048,e.getParameter(e.MAX_TEXTURE_SIZE)),this.#r=new G(e),this.#N=r=>{r.preventDefault(),this.#I=!0,this.#r.reset(),this.#i.reset(!0),this.#a=new WeakSet,i.onContextLost?.()},this.#O=()=>{this.#r.reset(),this.#r=new G(e),this.#e?.dispose(!0),this.#e=void 0,this.clearMaterialPrograms(),this.#m=this.#R=null,this.#T=null,this.#b=this.#S=void 0,this.#E=void 0,this.#L=!1,this.#_=void 0,this.resetState(),this.#I=!1,i.onContextRestored?.()},t.addEventListener("webglcontextlost",this.#N),t.addEventListener("webglcontextrestored",this.#O)}get isContextLost(){return this.#I||this.#t.isContextLost()}async preparePrograms(i,t={}){if(this.#p)throw new p("WORLD3D_DISPOSED","renderer");if(this.isContextLost)throw new p("WORLD3D_CONTEXT_LOST","program preparation");let e=[];for(let r of i){let{mesh:o,material:n,reflection:s}=r,a=s?.target??r.target;if(s&&r.target&&s.target!==r.target)throw new p("WORLD3D_INPUT_INVALID","reflection program target");let f=o.geometry;if(f.isDisposed||n.isDisposed||a?.isDisposed)throw new p("WORLD3D_DISPOSED","program preparation input");let u=r.pass??"color";if(u!=="color"&&u!=="shadow"&&u!=="depth-prepass")throw new p("WORLD3D_INPUT_INVALID","program preparation pass");let c=this.shadowsEnabled&&(s?.shadows??!0);if(s&&(u==="shadow"&&!c||!ye(o,s,u==="shadow")))continue;let l=!s&&this.postProcess.enabled,T=l?"none":k(s?.toneMapping??this.toneMapping,a),g=u==="color"?Me(r.fog===!0,T,r.environment===!0,l||!!a)|(r.receiveShadows&&(!s||c)?d.receiveShadow:0)|(r.softDepth?d.softDepth:0)|(r.transmission?d.transmission:0):d.depthOnly,A=f.morphTargets,_=A.length?A.some(b=>b.normal)?2:1:0,E=this.meshProgramVariant(o,f,n,g,_);if(e.push(this.programRequest(n,E)),t.includeAutoInstancing&&this.autoInstancing){o.updateWorldMatrix();let b=u==="shadow";se(o,n,b)&&(!b||c&&o.castShadow)&&(u==="color"||f.topology==="triangles")&&(u!=="depth-prepass"||n.depthWrite)&&e.push(this.programRequest(n,E|d.instancing))}}await this.#r.preparePrograms(e)}async prepareGeometries(i,t={}){let e=this.#t,r=this.#r,o=w(()=>{if(this.#p)throw new p("WORLD3D_DISPOSED","renderer");if(this.isContextLost||this.#r!==r)throw new p("WORLD3D_CONTEXT_LOST","geometry preparation")},"requireCurrent");if(o(),!Array.isArray(i)||!t||typeof t!="object")throw new p("WORLD3D_INPUT_INVALID","geometry preparation");if(i.length>16384)throw new p("WORLD3D_BUDGET","geometry preparation list");let{budgetMs:n=4,maxPerSlice:s=16,signal:a}=t;if(!Number.isFinite(n)||n<.25||n>16||!Number.isInteger(s)||s<1||s>64||a!==void 0&&(!a||typeof a!="object"||typeof a.aborted!="boolean"))throw new p("WORLD3D_INPUT_INVALID","geometry preparation options");let f=w(()=>{if(o(),a?.aborted)throw new p("WORLD3D_RESOURCE_FAILED","geometry preparation cancelled",a.reason)},"check");f();let u=new Set;for(let T of i){if(!(T instanceof Z))throw new p("WORLD3D_INPUT_INVALID","geometry preparation input");if(T.isDisposed)throw new p("WORLD3D_DISPOSED","geometry preparation input");u.add(T)}let c=[...u],l=0;for(;l<c.length;){await new Promise(x=>setTimeout(x,0)),f();let T=performance.now(),g=Math.min(c.length,l+s),A=e.getParameter(e.VERTEX_ARRAY_BINDING),_=e.getParameter(e.ARRAY_BUFFER_BINDING),E=c.slice(l,g).some(x=>x.morphTargets.length>0),b=e.TEXTURE0+m.morph,R,P=null,v=!1;try{E&&(R=e.getParameter(e.ACTIVE_TEXTURE),v=e.getParameter(e.UNPACK_FLIP_Y_WEBGL),e.activeTexture(b),P=e.getParameter(e.TEXTURE_BINDING_2D),e.activeTexture(R));do{f();let x=c[l];if(x.isDisposed)throw new p("WORLD3D_DISPOSED","geometry preparation input");r.geometry(x),l++,f()}while(l<g&&performance.now()-T<n)}finally{!this.#p&&this.#r===r&&!this.isContextLost&&(e.bindVertexArray(A&&e.isVertexArray(A)?A:null),e.bindBuffer(e.ARRAY_BUFFER,_&&e.isBuffer(_)?_:null),R!==void 0&&(e.activeTexture(b),e.bindTexture(e.TEXTURE_2D,P&&e.isTexture(P)?P:null),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,v),e.activeTexture(R)))}}f();for(let T of c)if(T.isDisposed)throw new p("WORLD3D_DISPOSED","geometry preparation input")}get context(){return this.#t}setSize(i,t,e=1){let r=Math.max(1,Math.floor(i*e)),o=Math.max(1,Math.floor(t*e));if(!Number.isFinite(r)||!Number.isFinite(o))throw new p("WORLD3D_INPUT_INVALID","size");this.canvas.width!==r&&(this.canvas.width=r),this.canvas.height!==o&&(this.canvas.height=o)}resizeToDisplaySize(i=1){let t=this.canvas;if(typeof t.clientWidth!="number")return!1;let e=Math.max(1,Math.floor(t.clientWidth*i)),r=Math.max(1,Math.floor(t.clientHeight*i));return t.width===e&&t.height===r?!1:(t.width=e,t.height=r,!0)}get autoInstancing(){return this.#l.autoInstanceThreshold>1}set autoInstancing(i){this.#l.autoInstanceThreshold=i?8:0}get tiledLights(){return this.#l.tiledLights}set tiledLights(i){this.#l.tiledLights=!!i}#B=new Float32Array(C.width*C.rows*4);#T=null;bindTiledLights(i,t,e,r,o){let n=this.#t,s=ce(this.#u,this.#B,this.#l.tiledPointLights,i.viewProjectionMatrix,t,e,!1,r,o);n.activeTexture(n.TEXTURE0+m.tiledLights),this.#T?n.bindTexture(n.TEXTURE_2D,this.#T):(this.#T=n.createTexture(),n.bindTexture(n.TEXTURE_2D,this.#T),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.texImage2D(n.TEXTURE_2D,0,n.RGBA32F,C.width,C.rows,0,n.RGBA,n.FLOAT,this.#B)),s>0&&n.texSubImage2D(n.TEXTURE_2D,0,0,0,C.width,C.rows,n.RGBA,n.FLOAT,this.#B),this.info.lightsTiled=s}measureFrame(i,t){if(this.#p)throw new p("WORLD3D_DISPOSED","renderer");return this.#i.capture(i,t?.gpuTiming===!0)}pollFrameTimings(){this.#i.poll()}render(i,t,e){return this.renderMeasuredView(i,t,e,e!==void 0&&this.#o===e?"reflection":e?"offscreen":"main")}renderReflection(i,t,e){let r=this.#o;this.#o=e;try{return this.recordReflection(e,this.render(i,t,e))}finally{this.#o=r}}renderReflectionPass(i,t,e){return this.recordReflection(e.target,this.renderMeasuredView(i,t,e.target,"reflection",e))}recordReflection(i,t){return t&&(this.#a.add(i),this.#i.recordReflection("rendered")),t}reuseReflection(i){return this.#p||this.isContextLost||!this.#a.has(i)?!1:(this.#i.recordReflection("reused"),!0)}renderMeasuredView(i,t,e,r,o){if(this.#p)throw new p("WORLD3D_DISPOSED","renderer");if(this.isContextLost)return!1;let n=this.#i.beginView(),s=!o&&this.postProcess.enabled;if(n<0)return s?this.renderPost(i,t,e):this.renderView(i,t,e,"color",o);let a=performance.now(),f=this.#s,u=this.#n;this.#s=n,this.#n=r;try{return s?this.renderPost(i,t,e):this.renderView(i,t,e,"color",o)}finally{this.#s=f,this.#n=u,this.#i.endView(a)}}renderView(i,t,e,r="color",o){if(e?.isDisposed)throw new p("WORLD3D_DISPOSED","render target");let n=this.#t,s=this.#l,a=this.info,f=this.#f=k(o?.toneMapping??this.toneMapping,e);s.build(i,t,o),a.frame=s.frame,a.drawCalls=a.triangles=0,a.visited=s.stats.visited,a.culled=s.stats.culled,a.lightsDropped=s.stats.lightsDropped,this.resetState(),this.bindFrameBlock(),this.renderShadows(t,this.shadowsEnabled&&(o?.shadows??!0)),this.#L=s.transparent.some(E=>E.material.softness>0)&&this.renderSceneDepth(t,e);let u=this.viewport,c=e?.width??n.drawingBufferWidth,l=e?.height??n.drawingBufferHeight,T=u?Math.max(Math.round(u[2]*c),1):c,g=u?Math.max(Math.round(u[3]*l),1):l,A=this.#i.begin(this.#n,this.#s,r,c,l);try{if(e){let v=this.#r.target(e);n.bindFramebuffer(n.FRAMEBUFFER,v.framebuffer),n.viewport(0,0,e.width,e.height)}else n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,n.drawingBufferWidth,n.drawingBufferHeight);this.#V=e!==void 0;let E=i.background;n.depthMask(!0),this.#v=!0;let b=e?v=>v:J;if(Array.isArray(E)?n.clearColor(b(E[0]),b(E[1]),b(E[2]),1):n.clearColor(0,0,0,(e||this.#c)&&!E?0:1),n.clear(this.autoClear?n.COLOR_BUFFER_BIT|n.DEPTH_BUFFER_BIT:n.DEPTH_BUFFER_BIT),u){let v=Math.round(u[0]*c),x=Math.round(u[1]*l);n.viewport(v,x,T,g),n.enable(n.SCISSOR_TEST),n.scissor(v,x,T,g)}let R=0;this.#k=i.environment,i.environment&&(R=this.#r.bindCube(m.environment,i.environment)),fe(this.#u,i,t,s,this.#z,{exposure:this.exposure,toneMapping:f,environmentMaxMip:R}),this.#u[V.clipInfo+2]=u?u[2]:1,this.#u[V.clipInfo+3]=u?u[3]:1,this.bindTiledLights(t,T,g,u?Math.round(u[0]*c):0,u?Math.round(u[1]*l):0),this.uploadFrameBlock();let P=Me(!!i.fog,f,!!i.environment,!!e);for(let v of s.opaque)this.draw(v,P);E instanceof oe&&this.drawSkybox(E,i.backgroundIntensity,t),this.#U=!1;for(let v of s.transparent)if(v.material.transmission>0&&v.material.shading==="standard"){this.#U=this.grabScene(e);break}for(let v of s.transparent)this.draw(v,P);this.#U=!1,n.bindVertexArray(null),u&&n.disable(n.SCISSOR_TEST),e&&n.bindFramebuffer(n.FRAMEBUFFER,null)}finally{this.#i.end(A)}this.#r.prune(s.frame);let _=this.#r.counts;return a.programs=_.programs,a.geometries=_.geometries,a.textures=_.textures,a.shadowMaps=this.#w,!0}renderPost(i,t,e){let r=this.#t;if(e?.isDisposed)throw new p("WORLD3D_DISPOSED","render target");let o=e?e.width:r.drawingBufferWidth,n=e?e.height:r.drawingBufferHeight,s=this.#e??=new W(r,this.#r);if(s.scene.setSize(Math.max(o,1),Math.max(n,1)),this.isContextLost||!this.renderView(i,t,s.scene))return!1;let a=e?this.#r.target(e).framebuffer:null,f;if(he(this.postProcess)){s.mask.setSize(Math.max(o,1),Math.max(n,1));let l={layerMask:t.layerMask,override:i.overrideMaterial,background:i.background,shadows:this.shadowsEnabled,planes:i.clippingPlanes};t.layerMask=this.postProcess.outlineLayers,i.overrideMaterial=s.maskMaterial,i.background=[0,0,0],this.shadowsEnabled=!1;let T={...this.info};try{!this.isContextLost&&this.renderView(i,t,s.mask,"outline-mask")&&(f=this.#r.target(s.mask).color)}finally{t.layerMask=l.layerMask,i.overrideMaterial=l.override,i.background=l.background,this.shadowsEnabled=l.shadows,Object.assign(this.info,T)}}let u=this.#r.target(s.scene),c=this.#i.begin(this.#n,this.#s,"postprocess",o,n);try{let l=s.run(u.color,u.depthTexture,f,de(t),o,n,a,e!==void 0,this.postProcess,e?.format==="rgba16f"?"none":this.toneMapping,this.#R??=r.createVertexArray());this.info.drawCalls+=l,this.#i.record(l,l)}finally{this.#i.end(c)}return this.resetState(),!0}grabScene(i){let t=this.#t,e=i?this.#r.target(i).framebuffer:null,r=i?i.width:t.drawingBufferWidth,o=i?i.height:t.drawingBufferHeight,n=i?i.format==="rgba16f"&&this.#r.floatTargets?t.RGBA16F:t.SRGB8_ALPHA8:this.#c?t.RGBA8:t.RGB8,s=this.#_;if(t.activeTexture(t.TEXTURE0+m.sceneColor),s)t.bindTexture(t.TEXTURE_2D,s.texture);else{let a=t.createTexture(),f=t.createFramebuffer();if(!a||!f)return a&&t.deleteTexture(a),f&&t.deleteFramebuffer(f),t.activeTexture(t.TEXTURE0),!1;s=this.#_={texture:a,framebuffer:f,width:0,height:0,format:0},t.bindTexture(t.TEXTURE_2D,a),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE)}return(s.width!==r||s.height!==o||s.format!==n)&&(n===t.RGBA16F?t.texImage2D(t.TEXTURE_2D,0,n,r,o,0,t.RGBA,t.HALF_FLOAT,null):n===t.RGB8?t.texImage2D(t.TEXTURE_2D,0,n,r,o,0,t.RGB,t.UNSIGNED_BYTE,null):t.texImage2D(t.TEXTURE_2D,0,n,r,o,0,t.RGBA,t.UNSIGNED_BYTE,null),s.width=r,s.height=o,s.format=n,t.bindFramebuffer(t.FRAMEBUFFER,s.framebuffer),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,s.texture,0)),i?(t.bindFramebuffer(t.READ_FRAMEBUFFER,e),t.bindFramebuffer(t.DRAW_FRAMEBUFFER,s.framebuffer),t.blitFramebuffer(0,0,r,o,0,0,r,o,t.COLOR_BUFFER_BIT,t.NEAREST),t.bindFramebuffer(t.FRAMEBUFFER,e)):(t.bindFramebuffer(t.FRAMEBUFFER,null),t.copyTexSubImage2D(t.TEXTURE_2D,0,0,0,0,0,r,o)),t.activeTexture(t.TEXTURE0),!0}#_;#U=!1;#Y={};resetState(){let i=this.#t;this.#g=void 0,this.#X=void 0,this.#x=void 0,this.#A="",this.#D="",this.#M=void 0,this.#v=void 0,this.#F=void 0,this.#y=!1,!this.#t.isContextLost()&&(i.frontFace(i.CCW),i.depthFunc(i.LEQUAL),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.colorMask(!0,!0,!0,!0))}bindFrameBlock(){let i=this.#t;this.#m||(this.#m=i.createBuffer(),i.bindBuffer(i.UNIFORM_BUFFER,this.#m),i.bufferData(i.UNIFORM_BUFFER,this.#u.byteLength,i.DYNAMIC_DRAW)),i.bindBufferBase(i.UNIFORM_BUFFER,0,this.#m)}uploadFrameBlock(){let i=this.#t;i.bindBuffer(i.UNIFORM_BUFFER,this.#m),i.bufferSubData(i.UNIFORM_BUFFER,0,this.#u)}#z=new Map;createShadowAtlas(i){let t=this.#t,e=t.createTexture(),r=t.createFramebuffer();if(!e||!r)throw e&&t.deleteTexture(e),r&&t.deleteFramebuffer(r),new p("WORLD3D_CONTEXT_LOST","shadow atlas");return t.activeTexture(t.TEXTURE0+m.shadow),t.bindTexture(t.TEXTURE_2D,e),t.texStorage2D(t.TEXTURE_2D,1,t.DEPTH_COMPONENT24,i,i),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_COMPARE_MODE,t.COMPARE_REF_TO_TEXTURE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_COMPARE_FUNC,t.LEQUAL),t.bindFramebuffer(t.FRAMEBUFFER,r),t.framebufferTexture2D(t.FRAMEBUFFER,t.DEPTH_ATTACHMENT,t.TEXTURE_2D,e,0),t.drawBuffers([t.NONE]),t.readBuffer(t.NONE),t.clearDepth(1),t.depthMask(!0),t.clear(t.DEPTH_BUFFER_BIT),t.bindFramebuffer(t.FRAMEBUFFER,null),{texture:e,framebuffer:r,size:i}}renderShadows(i,t){let e=this.#t,r=t?this.#b??=this.createShadowAtlas(this.#G):this.#S??=this.createShadowAtlas(1);this.#w=0,e.activeTexture(e.TEXTURE0+m.shadow),e.bindTexture(e.TEXTURE_2D,r.texture);let o=ue(this.#u,this.#l,r.size,t,!1,this.#z,i);if(o.length===0)return;let n=this.#s<0?void 0:this.#i.begin(this.#n,this.#s,"shadow",r.size,r.size,o.map(s=>s.tile));try{e.bindTexture(e.TEXTURE_2D,null),e.bindFramebuffer(e.FRAMEBUFFER,r.framebuffer),e.viewport(0,0,r.size,r.size),e.depthMask(!0),this.#v=!0,e.clear(e.DEPTH_BUFFER_BIT),e.enable(e.SCISSOR_TEST),e.enable(e.POLYGON_OFFSET_FILL),e.polygonOffset(1.5,4),e.colorMask(!1,!1,!1,!1);for(let s of o){e.viewport(s.x,s.y,s.tile,s.tile),e.scissor(s.x,s.y,s.tile,s.tile),this.#C=s.matrix;for(let a of s.casters)this.drawDepth(a)}e.colorMask(!0,!0,!0,!0),e.disable(e.SCISSOR_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.bindFramebuffer(e.FRAMEBUFFER,null),e.activeTexture(e.TEXTURE0+m.shadow),e.bindTexture(e.TEXTURE_2D,r.texture),this.#w=o.length,this.#x=void 0,this.#g=void 0}finally{this.#i.end(n)}}renderSceneDepth(i,t){let e=this.#t,r=t?t.width:e.drawingBufferWidth,o=t?t.height:e.drawingBufferHeight,n=this.viewport,s=n?Math.max(Math.round(n[2]*r),1):r,a=n?Math.max(Math.round(n[3]*o),1):o,f=this.#i.begin(this.#n,this.#s,"depth-prepass",r,o);try{let u=this.#E;if(!u||u.width!==r||u.height!==o){u&&(e.deleteTexture(u.texture),e.deleteFramebuffer(u.framebuffer),this.#E=void 0);let c=e.createTexture(),l=e.createFramebuffer();if(!c||!l)return c&&e.deleteTexture(c),l&&e.deleteFramebuffer(l),!1;e.activeTexture(e.TEXTURE0+m.sceneDepth),e.bindTexture(e.TEXTURE_2D,c),e.texStorage2D(e.TEXTURE_2D,1,e.DEPTH_COMPONENT24,r,o),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,l),e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,c,0),e.drawBuffers([e.NONE]),e.readBuffer(e.NONE),u=this.#E={texture:c,framebuffer:l,width:r,height:o}}e.activeTexture(e.TEXTURE0+m.sceneDepth),e.bindTexture(e.TEXTURE_2D,null),e.bindFramebuffer(e.FRAMEBUFFER,u.framebuffer),n?e.viewport(Math.round(n[0]*r),Math.round(n[1]*o),s,a):e.viewport(0,0,r,o),e.depthMask(!0),this.#v=!0,e.clearDepth(1),e.clear(e.DEPTH_BUFFER_BIT),this.#C=i.viewProjectionMatrix;for(let c of this.#l.opaque)c.geometry.topology==="triangles"&&c.material.depthWrite&&!c.material.billboard&&!c.material.screenSpace&&this.draw(c,0,"scene");return e.bindFramebuffer(e.FRAMEBUFFER,null),e.activeTexture(e.TEXTURE0+m.sceneDepth),e.bindTexture(e.TEXTURE_2D,u.texture),this.#x=void 0,this.#g=void 0,!0}finally{this.#i.end(f)}}depthItem={mesh:void 0,geometry:void 0,material:void 0,start:0,count:0,depth:0};drawDepth(i){let t=i.geometry,e=this.depthItem,r=t.groups;if(t.topology==="triangles")if(e.mesh=i,e.geometry=t,Array.isArray(i.material)&&r.length>0)for(let o of r)e.material=i.materialAt(o.materialIndex),e.start=o.start,e.count=o.count,e.material.visible&&!e.material.isDisposed&&!e.material.billboard&&this.draw(e,0,"shadow");else e.material=i.materialAt(0),e.start=0,e.count=t.drawCount,e.material.visible&&!e.material.isDisposed&&!e.material.billboard&&this.draw(e,0,"shadow")}selectProgram(i,t){let e=this.#d.get(i.id);if(e)e.version!==i.version&&(e.version=i.version,e.variants.clear());else{let s=i.onDispose(()=>{this.#d.delete(i.id)});e={version:i.version,variants:new Map,unsubscribe:s},this.#d.set(i.id,e)}let r=e.variants.get(t);if(r)return r;let{key:o,sources:n}=this.programRequest(i,t);return r=this.#r.program(o,n),e.variants.set(t,r),r}programRequest(i,t){let e=(t&d.depthOnly)!==0,r=Ae(i,t,e),o=e?void 0:i.shader?.glsl,n=i.shader?.glslVertex,s=e||i.shading==="unlit"||i.shading==="matcap"?void 0:i.shader?.glslNormal;return o!==void 0&&r.push("CUSTOM_FRAGMENT"),n!==void 0&&r.push("CUSTOM_VERTEX"),s!==void 0&&r.push("CUSTOM_NORMAL"),{key:r.join(" ")+(o===void 0&&n===void 0&&s===void 0?"":"|"+i.shader.key),sources:w(()=>be(r,o,n,s),"sources")}}applyMaterial(i,t,e){De(this.#t,i.uniforms,this.#r,this.#P,t,e)}applyState(i,t,e){let r=this.#t,o=t||i.side==="double"||i.billboard?"none":i.side;o!==this.#A&&(o==="none"?r.disable(r.CULL_FACE):(r.enable(r.CULL_FACE),r.cullFace(o==="back"?r.FRONT:r.BACK)),this.#A=o),e!==this.#y&&(r.frontFace(e?r.CW:r.CCW),this.#y=e);let n=i.depthTest,s=t||i.depthWrite;if(n!==this.#M&&(n?r.enable(r.DEPTH_TEST):r.disable(r.DEPTH_TEST),this.#M=n),s!==this.#v&&(r.depthMask(s),this.#v=s),t)return;let a=i.alphaMode==="blend"?i.blending:"off";a!==this.#D&&(a==="off"?r.disable(r.BLEND):(r.enable(r.BLEND),a==="additive"?r.blendFuncSeparate(r.SRC_ALPHA,r.ONE,r.ZERO,r.ONE):a==="multiply"?r.blendFuncSeparate(r.DST_COLOR,r.ZERO,r.ZERO,r.ONE):a==="premultiplied"?r.blendFunc(r.ONE,r.ONE_MINUS_SRC_ALPHA):r.blendFuncSeparate(r.SRC_ALPHA,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA)),this.#D=a);let f=i.polygonOffset;f!==this.#F&&(f?(r.enable(r.POLYGON_OFFSET_FILL),r.polygonOffset(f[0],f[1])):r.disable(r.POLYGON_OFFSET_FILL),this.#F=f)}meshProgramVariant(i,t,e,r,o){let n=(r&d.depthOnly)!==0,s=i.isInstanced,a=i.skeleton!==void 0&&t.getAttribute("joints")!==void 0&&t.getAttribute("weights")!==void 0;t.getAttribute("normal")&&(r|=d.normal);let f=i instanceof B&&i.skeleton===void 0;return t.getAttribute("tangent")&&!f&&(r|=d.tangent),t.getAttribute("uv1")&&!f&&(r|=d.uv1,!n&&e.occlusionMap?.channel===1&&(r|=d.occlusionSecond),!n&&e.emissiveMap?.channel===1&&(r|=d.emissiveSecond),!n&&e.lightMap?.channel===1&&(r|=d.lightSecond)),t.getAttribute("uv")&&(r|=d.uv,!n&&e.map?.source instanceof F&&(r|=d.mapFromTarget)),e.vertexColors&&t.getAttribute("color")&&!f&&(r|=d.color),a&&(r|=d.skin),o>0&&(r|=d.morph|(o===2?d.morphNormals:0)),s&&(r|=d.instancing|(i.instanceColors?d.instanceColor:0)),!a&&i instanceof B&&t.getAttribute("joints")!==void 0&&t.getAttribute("weights")!==void 0&&(r|=d.skinInstancing),s&&i instanceof te&&(r|=d.gpuParticles),t.topology==="points"&&(r|=d.points),n||(e.softness>0||(r&=~d.softDepth),i.receiveShadow||(r&=~d.receiveShadow),e.transmission>0||(r&=~d.transmission)),r}draw(i,t,e,r){let o=e!==void 0,n=e==="shadow",s=this.#t,{mesh:a,geometry:f,material:u}=i,c=this.#r,l=c.geometry(f),T=o?d.depthOnly:t|(this.#L?d.softDepth:0)|(this.#w>0?d.receiveShadow:0)|(this.#U?d.transmission:0),g=this.meshProgramVariant(a,f,u,T,l.morph?.attributes??0);if(r)g&=~d.instancing;else if(c.hasPendingPrograms&&a instanceof ne&&u.shader===void 0&&c.canUsePreparedAlternative(this.programRequest(u,g).key,this.programRequest(u,g&~d.instancing).key)){for(let S=0;S<a.count;S++)this.draw(i,t,e,a.instanceMatrices.subarray(S*16,S*16+16));return}let A=(g&d.instancing)!==0,_=(g&d.skin)!==0,E=(g&d.skinInstancing)!==0?a:void 0,b=this.selectProgram(u,g),R=b.uniforms,P=this.#l.frame;b!==this.#x&&(s.useProgram(b.program),this.#x=b);let v=o&&u.alphaMode==="opaque"&&u.shader===void 0?this.#Y:u;(b!==this.#g||v!==this.#X)&&(this.applyMaterial(b,u,o),this.#g=b,this.#X=v),o&&R.uDepthViewProjection&&s.uniformMatrix4fv(R.uDepthViewProjection,!1,this.#C);let x=r??a.matrixWorld,X=x[0]*(x[5]*x[10]-x[6]*x[9])-x[4]*(x[1]*x[10]-x[2]*x[9])+x[8]*(x[1]*x[6]-x[2]*x[5]);if(this.applyState(u,n,X<0&&!_),_){let S=c.bones(a.skeleton,P);s.activeTexture(s.TEXTURE0+m.bones),s.bindTexture(s.TEXTURE_2D,S),R.uBindMatrix&&s.uniformMatrix4fv(R.uBindMatrix,!1,a.bindMatrix),R.uModel&&s.uniformMatrix4fv(R.uModel,!1,Fe)}else{if(E){let S=c.animations(E.animations);s.activeTexture(s.TEXTURE0+m.bones),s.bindTexture(s.TEXTURE_2D,S)}if(R.uModel&&s.uniformMatrix4fv(R.uModel,!1,x),R.uNormalMatrix){if(r)for(let S=0;S<3;S++)for(let L=0;L<3;L++)this.#P[S*3+L]=x[S*4+L];else Q(this.#P,x);s.uniformMatrix3fv(R.uNormalMatrix,!1,this.#P)}}l.morph&&this.applyMorph(b,a,l),l.morph&&E&&R.uMorphCount&&s.uniform1i(R.uMorphCount,Math.min(O,E.animations.morphCount,f.morphTargets.length));let M=u.wireframe&&!n&&f.topology==="triangles"?c.wireframe(f):void 0;s.bindVertexArray(M?M.vao:A?c.instances(a,P):l.vao);let y=f.topology,U=M?s.LINES:y==="triangles"?s.TRIANGLES:y==="lines"?s.LINES:y==="line-strip"?s.LINE_STRIP:s.POINTS,D=a instanceof B?a.drawCount:A?a.count:1;if(!(D<=0)){if(M)A?s.drawElementsInstanced(U,M.count,M.type,0,D):s.drawElements(U,M.count,M.type,0);else if(l.indexed){let S=l.indexType===s.UNSIGNED_INT?4:l.indexType===s.UNSIGNED_SHORT?2:1;A?s.drawElementsInstanced(U,i.count,l.indexType,i.start*S,D):s.drawElements(U,i.count,l.indexType,i.start*S)}else A?s.drawArraysInstanced(U,i.start,i.count,D):s.drawArrays(U,i.start,i.count);this.#s>=0&&this.#i.record(1,U===s.TRIANGLES?Math.floor(i.count/3)*D:0),o||(this.info.drawCalls++,U===s.TRIANGLES&&(this.info.triangles+=i.count/3*D))}}applyMorph(i,t,e){let r=this.#t,o=i.uniforms,n=e.morph,s=t.morphWeights,a=this.#H,f=this.#j,u=0;for(let c=0;c<s.length;c++){let l=s[c];if(l===0)continue;if(u<O){a[u]=c,f[u]=l,u++;continue}let T=0;for(let g=1;g<u;g++)Math.abs(f[g])<Math.abs(f[T])&&(T=g);Math.abs(l)>Math.abs(f[T])&&(a[T]=c,f[T]=l)}r.activeTexture(r.TEXTURE0+m.morph),r.bindTexture(r.TEXTURE_2D,n.texture),o.uMorphLayout&&r.uniform3i(o.uMorphLayout,n.vertexCount,n.width,n.attributes),o.uMorphCount&&r.uniform1i(o.uMorphCount,u),o.uMorphIndices&&r.uniform1iv(o.uMorphIndices,a),o.uMorphWeights&&r.uniform1fv(o.uMorphWeights,f)}drawSkybox(i,t,e){let r=this.#t,o=this.#r.program("skybox",()=>Se),n=o.uniforms;if(r.useProgram(o.program),this.#x=o,this.#g=void 0,this.#r.bindCube(m.environment,i),!K(this.#W,e.viewProjectionMatrix))return;n.uInverseViewProjection&&r.uniformMatrix4fv(n.uInverseViewProjection,!1,this.#W),n.uOutput&&r.uniform4f(n.uOutput,t,this.#V?1:0,this.exposure,this.#f==="aces"?2:this.#f==="reinhard"?1:0),r.disable(r.CULL_FACE),this.#A="none",r.disable(r.BLEND),this.#D="off",r.enable(r.DEPTH_TEST),this.#M=!0,r.depthMask(!1),this.#v=!1,r.bindVertexArray(this.#R??=r.createVertexArray()),r.drawArrays(r.TRIANGLES,0,3),this.#s>=0&&this.#i.record(1,1),this.info.drawCalls++;let s=this.#k;s&&s!==i&&this.#r.bindCube(m.environment,s)}#k;#V=!1;#g;#X;assertReadbackAvailable(){if(this.#p)throw new p("WORLD3D_DISPOSED","renderer");if(this.isContextLost)throw new p("WORLD3D_CONTEXT_LOST","readback")}readFramebuffer(i,t,e,r,o){let n=this.#t,s=new Uint8Array(r*o*4),a=n.getParameter(n.READ_FRAMEBUFFER_BINDING);n.bindFramebuffer(n.READ_FRAMEBUFFER,i);try{n.readPixels(t,e,r,o,n.RGBA,n.UNSIGNED_BYTE,s)}finally{n.bindFramebuffer(n.READ_FRAMEBUFFER,a)}return s}readPixels(i=0,t=0,e=this.#t.drawingBufferWidth,r=this.#t.drawingBufferHeight){return this.assertReadbackAvailable(),this.readFramebuffer(null,i,t,e,r)}async readRenderTargetPixels(i){this.assertReadbackAvailable();let t=i.width,e=i.height;if(i.format==="rgba16f")throw new p("WORLD3D_INPUT_INVALID","half-float targets cannot be read back as bytes");let r=this.readFramebuffer(this.#r.target(i).framebuffer,0,0,t,e),o=new Uint8Array(r.length);for(let n=0;n<e;n++)o.set(r.subarray((e-1-n)*t*4,(e-n)*t*4),n*t*4);return o}clearMaterialPrograms(){for(let i of this.#d.values())i.unsubscribe();this.#d.clear()}supportsCompressedFormat(i){return this.#r.compressedFormat(i,!1)!==void 0}dispose(){if(this.#p)return;this.#p=!0,this.#i.reset(this.isContextLost);let i=this.#t;if(this.canvas.removeEventListener("webglcontextlost",this.#N),this.canvas.removeEventListener("webglcontextrestored",this.#O),this.#l.clear(),this.clearMaterialPrograms(),this.isContextLost){this.#e?.dispose(!0),this.#e=void 0,this.#r.reset();return}this.#e?.dispose(),this.#e=void 0,this.#r.dispose(),this.#m&&i.deleteBuffer(this.#m),this.#T&&i.deleteTexture(this.#T),this.#T=null,this.#R&&i.deleteVertexArray(this.#R);for(let t of[this.#b,this.#S])t&&(i.deleteTexture(t.texture),i.deleteFramebuffer(t.framebuffer));this.#b=this.#S=void 0,this.#_&&(i.deleteTexture(this.#_.texture),i.deleteFramebuffer(this.#_.framebuffer),this.#_=void 0),this.#E&&(i.deleteTexture(this.#E.texture),i.deleteFramebuffer(this.#E.framebuffer),this.#E=void 0)}};function Et(h){return new Y(h)}w(Et,"createWebGL2Renderer3D");export{Y as a,Et as b};
