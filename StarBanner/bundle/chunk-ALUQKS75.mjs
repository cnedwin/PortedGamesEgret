// Generated from StarBanner and vendored Egret sources. See vendor/LICENSE, vendor/NOTICE and third-party licences.
import{$ as Q,E as ge,Ga as Oe,Ha as Le,Ia as _e,Ja as Ie,Ka as Fe,La as Be,T as be,X as N,Y as re,Z as we,_ as ye,a as z,ba as xe,ca as V,ka as Me,la as Se,m as fe,ma as se,na as ae,oa as Te,p as me,pa as De,qa as oe,ra as Ae,sa as Pe,ta as Ee,ua as Ce,va as ze,wa as ke,xa as Re,y as ve,ya as ne}from"./chunk-HSD5GAD7.mjs";import{a as E}from"./chunk-2PKRZAXY.mjs";var Ke=64,Je=8,Qe=2,Ne=16,le=4,$=2,Y="rgba16float",X="rgba8unorm",Ze={down:Le,up:_e,fxaa:Be,ssao:Oe,dof:Ie},Z=class{static{E(this,"PostChainWebGPU3D")}scene=new V(1,1,{format:"rgba16f",depthTexture:!0,name:"world3d.post.scene"});mask=new V(1,1,{name:"world3d.post.mask"});maskMaterial=(()=>{let e=new ge("unlit",{side:"double"});return e.fog=!1,e.toneMapped=!1,e})();#d;#p;#f;#r;#n;#t;#b=new Map;#S=new Map;#e=[];#s=[];#l;#v;#c;#u=0;#w=new Float32Array(Ce);#y;#x;#g;#k;#R={inverseProjection:new Float32Array(16)};#T;#a;#i;#m=1;#h=1;constructor(e){this.#d=e,this.#p=e.createBindGroupLayout({entries:[{binding:0,visibility:$,buffer:{}},{binding:1,visibility:$,texture:{}},{binding:2,visibility:$,sampler:{}},{binding:3,visibility:$,texture:{}},{binding:4,visibility:$,texture:{sampleType:"depth"}},{binding:5,visibility:$,texture:{}},{binding:6,visibility:$,texture:{}}]}),this.#f=e.createPipelineLayout({bindGroupLayouts:[this.#p]}),this.#r=e.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"}),this.#n=e.createTexture({size:[1,1],format:X,usage:le|Qe}),e.queue.writeTexture({texture:this.#n},new Uint8Array(4),{},[1,1]),this.#t=this.#n.createView(),this.#g=e.createTexture({size:[1,1],format:"depth24plus",usage:le|Ne}),this.#k=this.#g.createView()}surface(e,t,i,o){if(e&&e.width===t&&e.height===i)return e;e?.texture.destroy();let a=this.#d.createTexture({size:[t,i],format:o,usage:Ne|le});return{texture:a,view:a.createView(),width:t,height:i}}pipeline(e,t,i){let o=e==="composite"?this.#i:void 0,a=o?"composite|"+o.key:e,r=a+"/"+t+(i?"/add":""),s=this.#S.get(r);if(s)return s;let c=this.#b.get(a);c||this.#b.set(a,c=this.#d.createShaderModule({code:e==="composite"?Fe(o?.wgsl):Ze[e],label:"post/"+a}));let l={color:{srcFactor:"one",dstFactor:"one"},alpha:{srcFactor:"one",dstFactor:"one"}};return s=this.#d.createRenderPipeline({label:"post/"+r,layout:this.#f,vertex:{module:c,entryPoint:"vertexMain"},fragment:{module:c,entryPoint:"fragmentMain",targets:[{format:t,...i?{blend:l}:{}}]},primitive:{topology:"triangle-list"}}),this.#S.set(r,s),s}pass(e,t,i,o,a,r,s,c){let l=this.#d,u=this.#s[this.#u];u||(u=this.#s[this.#u]={buffer:l.createBuffer({size:this.#w.byteLength,usage:Ke|Je}),group:void 0,source:void 0,bloom:void 0,depth:void 0,ao:void 0,mask:void 0}),this.#u++;let h=this.#w,d=this.#T??this.#k,v=this.#a??this.#t,m=this.#y??this.#t;ze(h,s,c,this.#R,this.#a!==void 0,this.#m,this.#h,this.#i,this.#x),l.queue.writeBuffer(u.buffer,0,h);let y=v===a?this.#t:v;(!u.group||u.source!==i||u.bloom!==o||u.depth!==d||u.ao!==y||u.mask!==m)&&(u.group=l.createBindGroup({layout:this.#p,entries:[{binding:0,resource:{buffer:u.buffer}},{binding:1,resource:i},{binding:2,resource:this.#r},{binding:3,resource:o},{binding:4,resource:d},{binding:5,resource:y},{binding:6,resource:m}]}),u.source=i,u.bloom=o,u.depth=d,u.ao=y,u.mask=m);let g=e.beginRenderPass({colorAttachments:[{view:a,loadOp:r?"load":"clear",storeOp:"store",clearValue:[0,0,0,0]}]});g.setPipeline(t),g.setBindGroup(0,u.group),g.draw(3),g.end()}run(e,t,i,o,a,r,s,c,l,u,h,d){this.#u=0,this.#R=a,this.#T=i,this.#a=void 0,this.#i=void 0,this.#m=r,this.#h=s,this.#y=o,this.#x=o?h:void 0;let v=this.#t;if(h.ssao&&i&&h.ssaoIntensity>0){let x=this.#v=this.surface(this.#v,r,s,X);this.pass(e,this.pipeline("ssao",X,!1),t,v,x.view,!1,[Math.max(h.ssaoRadius,.001),h.ssaoIntensity,h.ssaoBias,0],[0,0,0,0]),this.#a=x.view}if(h.dof&&i&&h.dofRadius>0){let x=this.#c=this.surface(this.#c,r,s,Y);this.pass(e,this.pipeline("dof",Y,!1),t,v,x.view,!1,[h.dofFocus,Math.max(h.dofRange,.001),h.dofRadius,0],[0,0,0,0]),t=x.view}let m=Re(h,r,s);if(m>0){let x=this.pipeline("down",Y,!1),_=this.pipeline("up",Y,!0),C=r,O=s,A=t;for(let b=0;b<m;b++){let P=C,D=O;C=Math.max(C>>1,1),O=Math.max(O>>1,1);let w=this.#e[b]=this.surface(this.#e[b],C,O,Y);this.pass(e,x,A,v,w.view,!1,[1/P,1/D,h.bloomThreshold,Math.min(Math.max(h.bloomKnee,0),1)],[b===0?1:0,0,0,0]),A=w.view}for(let b=m-1;b>0;b--){let P=this.#e[b],D=this.#e[b-1];this.pass(e,_,P.view,v,D.view,!0,[1/P.width,1/P.height,0,0],[0,0,0,0])}}this.#i=i&&h.custom?.wgsl!==void 0?h.custom:void 0;let y=m>0?this.#e[0].view:v,g=new Float32Array(8);if(h.fxaa){let x=this.#l=this.surface(this.#l,r,s,X);ne(g,h,m,d,!0),this.pass(e,this.pipeline("composite",X,!1),t,y,x.view,!1,[...g.subarray(0,4)],[...g.subarray(4,8)]),this.pass(e,this.pipeline("fxaa",l,!1),x.view,v,c,!1,[1/r,1/s,u?1:0,0],[0,0,0,0])}else ne(g,h,m,d,!u),this.pass(e,this.pipeline("composite",l,!1),t,y,c,!1,[...g.subarray(0,4)],[...g.subarray(4,8)]);return this.#u}dispose(){for(let e of this.#e)e.texture.destroy();this.#l?.texture.destroy(),this.#v?.texture.destroy(),this.#c?.texture.destroy(),this.#g.destroy();for(let e of this.#s)e.buffer.destroy();this.#n.destroy(),this.#e.length=0,this.#s.length=0,this.#l=void 0,this.#v=void 0,this.#c=void 0,this.#S.clear(),this.#b.clear(),this.scene.dispose(),this.mask.dispose(),this.maskMaterial.dispose()}};var et=`
struct Frame {
    viewProjection: mat4x4f,
    view: mat4x4f,
    cameraPosition: vec4f,
    fogColor: vec4f,
    fogParams: vec4f,
    ambient: vec4f,
    hemisphereSky: vec4f,
    hemisphereGround: vec4f,
    lightCounts: vec4f,
    directionalDirection: array<vec4f, 4>,
    directionalColor: array<vec4f, 4>,
    pointPosition: array<vec4f, 8>,
    pointColor: array<vec4f, 8>,
    spotPosition: array<vec4f, 4>,
    spotDirection: array<vec4f, 4>,
    spotColor: array<vec4f, 4>,
    spotCone: array<vec4f, 4>,
    shadowMatrix: array<mat4x4f, 4>,
    shadowRect: array<vec4f, 4>,
    shadowParams: array<vec4f, 4>,
    output: vec4f,
    cascadeSplits: vec4f,
    cascadeInfo: vec4f,
    pointShadow: vec4f,
    clipPlanes: array<vec4f, 4>,
    clipInfo: vec4f,
    tileGrid: vec4f,   // tiles across, tiles down, tile edge in pixels, viewport origin x
    tileInfo: vec4f,   // x: tiled point lights (0 = none), y: header base, z: index base, w: viewport origin y
}
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(8) var<storage, read> tiledLights: array<vec4f>;
@group(0) @binding(1) var shadowMap: texture_depth_2d;
@group(0) @binding(2) var shadowSampler: sampler_comparison;
@group(0) @binding(3) var environmentMap: texture_cube<f32>;
@group(0) @binding(4) var environmentSampler: sampler;
@group(0) @binding(5) var sceneColor: texture_2d<f32>;
@group(0) @binding(6) var sceneColorSampler: sampler;
@group(0) @binding(7) var sceneDepthMap: texture_depth_2d;
// Distance from the camera plane to the solid scene behind this pixel and to the surface itself;
// hooks may read them. Without a depth image the scene counts as far away.
var<private> sceneDistance: f32 = 1.0e9;
var<private> surfaceDistance: f32 = 0.0;
// This pixel's place on the output, counted from the top row.
var<private> surfacePixel: vec2f = vec2f(0.0);
`,tt=`
struct Frame {
    viewProjection: mat4x4f,
    view: mat4x4f,
}
@group(0) @binding(0) var<uniform> frame: Frame;
`,it=`
struct Material {
    color: vec4f,
    emissive: vec4f,
    surface: vec4f,      // metallic, roughness, normal scale, occlusion strength
    specular: vec4f,     // rgb and shininess
    params: vec4f,       // alpha cutoff, environment scale, clearcoat strength, clearcoat roughness
    uvRow0: vec4f,       // uv' = (dot(uvRow0.xyz, (uv, 1)), dot(uvRow1.xyz, (uv, 1)))
    uvRow1: vec4f,
    sprite: vec4f,       // rotation, size attenuation flag, mirror image distortion and strength
    custom: array<vec4f, 4>, // parameters of the optional fragment hook
    sheen: vec4f,        // color scaled by strength, roughness
    extra: vec4f,        // light map intensity, transmission, index of refraction, thickness
    attenuation: vec4f,  // color after the attenuation distance; w: that distance (0 = none)
    splat: vec4f,        // how often each ground layer repeats
}
@group(1) @binding(0) var<uniform> material: Material;
@group(1) @binding(1) var mapTexture: texture_2d<f32>;
@group(1) @binding(2) var mapSampler: sampler;
@group(1) @binding(3) var normalTexture: texture_2d<f32>;
@group(1) @binding(4) var normalSampler: sampler;
@group(1) @binding(5) var metallicRoughnessTexture: texture_2d<f32>;
@group(1) @binding(6) var metallicRoughnessSampler: sampler;
@group(1) @binding(7) var occlusionTexture: texture_2d<f32>;
@group(1) @binding(8) var occlusionSampler: sampler;
@group(1) @binding(9) var emissiveTexture: texture_2d<f32>;
@group(1) @binding(10) var emissiveSampler: sampler;
@group(1) @binding(11) var lightTexture: texture_2d<f32>;
@group(1) @binding(12) var lightSampler: sampler;
@group(1) @binding(13) var reflectionTexture: texture_2d<f32>;
@group(1) @binding(14) var reflectionSampler: sampler;

struct Object {
    model: mat4x4f,
    normal0: vec4f,
    normal1: vec4f,
    normal2: vec4f,
    bind: mat4x4f,
    morph: vec4i,                    // vertex count, channels per target, active count
    morphIndices: array<vec4i, 2>,
    morphWeights: array<vec4f, 2>,
}
@group(2) @binding(0) var<uniform> object: Object;
@group(3) @binding(0) var<storage, read> bones: array<mat4x4f>;
@group(3) @binding(1) var<storage, read> morphData: array<vec4f>;
`;function rt(n){let e=["@location(0) position: vec3f","@builtin(vertex_index) vertexIndex: u32"];return n.normal&&e.push("@location(1) normal: vec3f"),n.uv&&e.push("@location(2) uv: vec2f"),n.tangent&&e.push("@location(3) tangent: vec4f"),n.vertexColor&&e.push("@location(4) color: vec4f"),n.uv1&&e.push("@location(7) uv1: vec2f"),(n.skinning||n.skinInstancing)&&e.push("@location(5) joints: vec4u","@location(6) weights: vec4f"),n.skinInstancing&&e.push("@location(13) instanceAnimation: vec4f","@location(14) instanceAnimation2: vec4f","@location(15) instanceLook: vec4f"),n.instancing&&e.push("@location(8) instance0: vec4f","@location(9) instance1: vec4f","@location(10) instance2: vec4f","@location(11) instance3: vec4f"),n.instanceColor&&e.push("@location(12) instanceColor: vec4f"),`
struct VertexInput {
    ${e.join(`,
    `)},
}
struct VertexOutput {
    @builtin(position) clip: vec4f,
    @location(0) worldPosition: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) tangent: vec4f,
    @location(4) color: vec4f,
    @location(5) uv1: vec2f,
}
fn morphDelta(targetIndex: i32, channel: i32, vertexIndex: u32) -> vec3f {
    let texel = (targetIndex * object.morph.y + channel) * object.morph.x + i32(vertexIndex);
    return morphData[texel].xyz;
}
${n.skinInstancing?`
// The bones table holds every frame of every clip. The fourth float of an instance carries what all
// instances share: matrices per frame, and the bone that may turn.
fn bakedBone(joint: u32, frame: f32, packed: f32) -> mat4x4f {
    return bones[u32(frame) * (u32(packed) % 2048u) + joint];
}
// One table entry for an instance: between two frames of its clip, and of a second clip when it has one.
fn bakedBlend(joint: u32, a: vec4f, b: vec4f) -> mat4x4f {
    var pose = bakedBone(joint, a.x, a.w) * (1.0 - a.z) + bakedBone(joint, a.y, a.w) * a.z;
    if (b.w > 0.0) { pose = pose * (1.0 - b.w) + (bakedBone(joint, b.x, a.w) * (1.0 - b.z) + bakedBone(joint, b.y, a.w) * b.z) * b.w; }
    return pose;
}
fn bakedJoint(joint: u32, a: vec4f, b: vec4f, look: vec4f) -> mat4x4f {
    var pose = bakedBlend(joint, a, b);
    let bone = i32(u32(a.w) / 2048u) - 1;
    if (i32(joint) == bone) {
        // Turn the bone about its joint, whose place in the bind pose is kept in frame 0.
        let pivot = bakedBone(joint, 0.0, a.w)[3].xyz;
        let v = look.xyz;
        let w = look.w;
        let turn = mat3x3f(1.0 - 2.0 * (v.y * v.y + v.z * v.z), 2.0 * (v.x * v.y + v.z * w), 2.0 * (v.x * v.z - v.y * w),
            2.0 * (v.x * v.y - v.z * w), 1.0 - 2.0 * (v.x * v.x + v.z * v.z), 2.0 * (v.y * v.z + v.x * w),
            2.0 * (v.x * v.z + v.y * w), 2.0 * (v.y * v.z - v.x * w), 1.0 - 2.0 * (v.x * v.x + v.y * v.y));
        pose = pose * mat4x4f(vec4f(turn[0], 0.0), vec4f(turn[1], 0.0), vec4f(turn[2], 0.0), vec4f(pivot - turn * pivot, 1.0));
    }
    return pose;
}`:""}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var position = input.position;
    var normal = ${n.normal?"input.normal":"vec3f(0.0, 0.0, 1.0)"};
    ${n.morph&&n.skinInstancing?`
    // Baked instances read their morph weights from the last entry of their frames.
    let bakedWeights = bakedBlend(u32(input.instanceAnimation.w) % 2048u - 1u, input.instanceAnimation, input.instanceAnimation2);
    for (var i = 0; i < object.morph.z; i++) {
        position += morphDelta(i, 0, input.vertexIndex) * bakedWeights[i / 4][i % 4];
        ${n.morphNormals&&(!n.depthOnly||n.customVertexWgsl!==void 0)?"normal += morphDelta(i, 1, input.vertexIndex) * bakedWeights[i / 4][i % 4];":""}
    }`:n.morph?`
    for (var i = 0; i < object.morph.z; i++) {
        let targetIndex = object.morphIndices[i / 4][i % 4];
        let weight = object.morphWeights[i / 4][i % 4];
        position += morphDelta(targetIndex, 0, input.vertexIndex) * weight;
        ${n.morphNormals&&(!n.depthOnly||n.customVertexWgsl!==void 0)?"normal += morphDelta(targetIndex, 1, input.vertexIndex) * weight;":""}
    }`:""}
    var model = object.model;
    var normalMatrix = mat3x3f(object.normal0.xyz, object.normal1.xyz, object.normal2.xyz);
    ${n.skinning?`
    let skin = input.weights.x * bones[input.joints.x] + input.weights.y * bones[input.joints.y]
        + input.weights.z * bones[input.joints.z] + input.weights.w * bones[input.joints.w];
    model = skin * object.bind;
    normalMatrix = mat3x3f(model[0].xyz, model[1].xyz, model[2].xyz);`:""}
    var spriteTurn = 0.0;
    ${n.gpuParticles?`
    // The instance slots carry a particle's start and birth, velocity and life, sizes and angles;
    // where it is now follows from the time alone.
    let particleLife = max(input.instance1.w, 0.0001);
    var particleTime = material.custom[0].x - input.instance0.w;
    var particleAlive = true;
    if (material.custom[0].y > 0.5) { particleTime = particleTime - floor(particleTime / particleLife) * particleLife; }
    else { particleAlive = particleTime >= 0.0 && particleTime <= particleLife; }
    let particleAge = clamp(particleTime / particleLife, 0.0, 1.0);
    var particleTravel = particleTime;
    if (material.custom[1].w > 0.0001) { particleTravel = (1.0 - exp(-material.custom[1].w * particleTime)) / material.custom[1].w; }
    var particleCenter = input.instance0.xyz + input.instance1.xyz * particleTravel + material.custom[1].xyz * (0.5 * particleTime * particleTime);
    if (material.custom[3].y > 0.5) {
        // A floor: find when the particle comes down on it, then let it leave again slower, once. Drag is not applied on this path.
        let pull = material.custom[1].xyz;
        let launch = input.instance1.xyz;
        let a = 0.5 * pull.y;
        let b = launch.y;
        let c = input.instance0.y - material.custom[3].z;
        var hit = -1.0;
        if (c == 0.0 && (b < 0.0 || (b == 0.0 && a < 0.0))) { hit = 0.0; }
        else if (abs(a) > 0.000001) {
            let discriminant = b * b - 4.0 * a * c;
            if (discriminant > 0.0) {
                let root = sqrt(discriminant);
                if (b < 0.0) { hit = 2.0 * c / (root - b); } else { hit = (-b - root) / (2.0 * a); }
            }
        } else if (b < 0.0) { hit = -c / b; }
        particleCenter = input.instance0.xyz + launch * particleTime + pull * (0.5 * particleTime * particleTime);
        if (c >= 0.0 && hit >= 0.0 && particleTime >= hit) {
            let landed = input.instance0.xyz + launch * hit + pull * (0.5 * hit * hit);
            let away = (launch + pull * hit) * vec3f(material.custom[3].w, -material.custom[3].w, material.custom[3].w);
            let since = particleTime - hit;
            particleCenter = landed + away * since + pull * (0.5 * since * since);
            particleCenter.y = max(particleCenter.y, material.custom[3].z);
        }
    }
    // Particles left behind in the world carry world positions and ignore the emitter's transform.
    if (material.custom[3].x > 0.5) { model = mat4x4f(vec4f(1.0, 0.0, 0.0, 0.0), vec4f(0.0, 1.0, 0.0, 0.0), vec4f(0.0, 0.0, 1.0, 0.0), vec4f(0.0, 0.0, 0.0, 1.0)); }
    let particleSize = mix(input.instance2.x, input.instance2.y, particleAge);
    model = model * mat4x4f(vec4f(particleSize, 0.0, 0.0, 0.0), vec4f(0.0, particleSize, 0.0, 0.0), vec4f(0.0, 0.0, particleSize, 0.0), vec4f(particleCenter, 1.0));
    spriteTurn = input.instance2.z + input.instance2.w * particleTime;`:""}
    ${n.instancing&&!n.gpuParticles?`
    let instance = mat4x4f(input.instance0, input.instance1, input.instance2, input.instance3);
    model = model * instance;
    normalMatrix = normalMatrix * mat3x3f(instance[0].xyz, instance[1].xyz, instance[2].xyz);`:""}
    ${n.skinInstancing?`
    // Each instance is posed in its own space before its transform places it.
    let first = input.instanceAnimation;
    let second = input.instanceAnimation2;
    model = model * (input.weights.x * bakedJoint(input.joints.x, first, second, input.instanceLook) + input.weights.y * bakedJoint(input.joints.y, first, second, input.instanceLook)
        + input.weights.z * bakedJoint(input.joints.z, first, second, input.instanceLook) + input.weights.w * bakedJoint(input.joints.w, first, second, input.instanceLook));
    normalMatrix = mat3x3f(model[0].xyz, model[1].xyz, model[2].xyz);`:""}
    var world = model * vec4f(position, 1.0);
    ${n.customVertexWgsl!==void 0?`world = vec4f(customVertex(world.xyz, position, normal, ${n.uv?"input.uv":"vec2f(0.0)"}, ${n.vertexColor?"input.color":"vec4f(1.0)"}), world.w);`:""}
    ${n.billboard?`
    // Expand the quad along the camera's right and up axes around the node origin.
    let origin = model * vec4f(0.0, 0.0, 0.0, 1.0);
    let right = vec3f(frame.view[0].x, frame.view[1].x, frame.view[2].x);
    let up = vec3f(frame.view[0].y, frame.view[1].y, frame.view[2].y);
    var scale = vec2f(length(model[0].xyz), length(model[1].xyz));
    if (material.sprite.y < 0.5) { scale *= -(frame.view * origin).z; }
    let c = cos(material.sprite.x + spriteTurn);
    let s = sin(material.sprite.x + spriteTurn);
    let corner = position.xy * scale;
    let turned = vec2f(c * corner.x - s * corner.y, s * corner.x + c * corner.y);
    world = vec4f(origin.xyz + right * turned.x + up * turned.y, 1.0);
    normal = vec3f(0.0, 0.0, 1.0);
    normalMatrix = transpose(mat3x3f(frame.view[0].xyz, frame.view[1].xyz, frame.view[2].xyz));`:""}
    var output: VertexOutput;
    var clip = frame.viewProjection * world;
    ${n.screenSpace?`// Positions are already in normalized device coordinates; depth is remapped below.
    clip = vec4f(position.xy, -1.0, 1.0);`:""}
    // Matrices follow OpenGL clip conventions; WebGPU depth spans [0, 1].
    output.clip = vec4f(clip.xy, (clip.z + clip.w) * 0.5, clip.w);
    output.worldPosition = world.xyz;
    output.normal = normalMatrix * normal;
    let uv = vec3f(${n.uv?"input.uv":"vec2f(0.0)"}, 1.0);
    output.uv = vec2f(dot(material.uvRow0.xyz, uv), dot(material.uvRow1.xyz, uv));
    output.tangent = ${n.tangent?"vec4f(mat3x3f(model[0].xyz, model[1].xyz, model[2].xyz) * input.tangent.xyz, input.tangent.w)":"vec4f(1.0, 0.0, 0.0, 1.0)"};
    output.color = ${n.vertexColor?"input.color":"vec4f(1.0)"};
    output.uv1 = ${n.uv1?"input.uv1":"vec2f(0.0)"};
    ${n.instanceColor?"output.color *= input.instanceColor;":""}
    ${n.gpuParticles?`
    // From the instance's color to the shared end color over the particle's life, fading at both ends.
    output.color = mix(input.instanceColor, material.custom[2], particleAge);
    output.color.a *= smoothstep(0.0, max(material.custom[0].z, 0.0001), particleAge) * (1.0 - smoothstep(1.0 - max(material.custom[0].w, 0.0001), 1.0, particleAge));
    if (!particleAlive) { output.clip = vec4f(2.0, 2.0, 2.0, 1.0); }`:""}
    return output;
}
`}E(rt,"vertexSource");function st(n){let e=n.shading!=="unlit"&&n.shading!=="matcap";if(n.depthOnly)return`
@fragment
fn fragmentMain(input: VertexOutput) {
    var base = material.color * input.color;
    ${n.map?"base *= textureSample(mapTexture, mapSampler, input.uv);":""}
    ${n.alphaMask?"if (base.a < material.params.x) { discard; }":""}
    ${n.alphaBlend?"if (base.a < 0.5) { discard; }":""}
}
`;let t=n.shading==="lambert"?"return s.albedo * radiance * nl;":n.shading==="toon"?"return s.albedo * radiance * (ceil(nl * material.specular.w - 0.001) / max(material.specular.w, 1.0));":n.shading==="phong"?`
    let h = normalize(l + s.view);
    let specular = pow(max(dot(s.normal, h), 0.0), max(material.specular.w, 1.0));
    return (s.albedo + material.specular.rgb * specular) * radiance * nl;`:`
    let h = normalize(l + s.view);
    let nv = max(dot(s.normal, s.view), 0.0001);
    let nh = max(dot(s.normal, h), 0.0);
    let vh = max(dot(s.view, h), 0.0);
    let a = s.roughness * s.roughness;
    let a2 = a * a;
    let d = nh * nh * (a2 - 1.0) + 1.0;
    let distribution = a2 / (PI * d * d);
    let visibility = 0.5 / max(nl * sqrt(nv * nv * (1.0 - a2) + a2) + nv * sqrt(nl * nl * (1.0 - a2) + a2), 0.0001);
    let fresnel = s.f0 + (1.0 - s.f0) * pow(1.0 - vh, 5.0);
    let diffuse = s.albedo * (1.0 - s.metallic) * (1.0 - fresnel);
    // Light units are scaled by PI so a unit white light fully lights a white diffuse surface.
    var lit = diffuse + distribution * visibility * fresnel * PI;
    if (material.sheen.r + material.sheen.g + material.sheen.b > 0.0) {
        // Cloth lobe: an inverted Gaussian that brightens toward grazing angles.
        let inverse = 1.0 / max(material.sheen.w, 0.07);
        lit += material.sheen.rgb * ((2.0 + inverse) * pow(max(1.0 - nh * nh, 0.0), inverse * 0.5) / (2.0 * PI)) / (4.0 * (nl + nv - nl * nv)) * PI;
    }
    if (material.params.z > 0.0) {
        // A second, dielectric lobe on top; the base layer loses what the coat reflects.
        var ca = max(material.params.w, 0.045);
        ca *= ca;
        let ca2 = ca * ca;
        let cd = nh * nh * (ca2 - 1.0) + 1.0;
        let coatFresnel = (0.04 + 0.96 * pow(1.0 - vh, 5.0)) * material.params.z;
        lit = lit * (1.0 - coatFresnel) + ca2 / (PI * cd * cd) * (0.25 / max(vh * vh, 0.0001)) * coatFresnel * PI;
    }
    return lit * radiance * nl;`;return`
const PI = 3.141592653589793;
struct Surface {
    albedo: vec3f,
    normal: vec3f,
    view: vec3f,
    f0: vec3f,
    roughness: f32,
    metallic: f32,
}
fn shadowFactor(slot: i32, worldPosition: vec3f, normal: vec3f) -> f32 {
    let params = frame.shadowParams[slot];
    let clip = frame.shadowMatrix[slot] * vec4f(worldPosition + normal * params.y, 1.0);
    if (clip.w <= 0.0) { return 1.0; }
    let ndc = clip.xyz / clip.w * 0.5 + 0.5;
    if (any(ndc < vec3f(0.0)) || any(ndc > vec3f(1.0))) { return 1.0; }
    let rect = frame.shadowRect[slot];
    let depth = ndc.z - params.x;
    let corner = rect.xy + rect.zw;
    let lower = min(rect.xy, corner) + params.z;
    let upper = max(rect.xy, corner) - params.z;
    var lit = 0.0;
    // 3x3 taps on top of hardware comparison filtering.
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let uv = clamp(rect.xy + ndc.xy * rect.zw + vec2f(f32(x), f32(y)) * params.z, lower, upper);
            lit += textureSampleCompareLevel(shadowMap, shadowSampler, uv, depth);
        }
    }
    return lit / 9.0;
}
// One unfiltered lookup for a point in the air, as fog marching needs many; the flag picks the cascade for that depth.
fn volumeShadow(first: i32, at: vec3f, cascaded: bool) -> f32 {
    var slot = first;
    if (cascaded) {
        let viewDepth = -(frame.view * vec4f(at, 1.0)).z;
        let count = i32(frame.cascadeInfo.y);
        var cascade = 0;
        for (var c = 0; c < 3; c++) { if (c < count - 1 && viewDepth > frame.cascadeSplits[c]) { cascade = c + 1; } }
        if (viewDepth >= frame.cascadeSplits[cascade]) { return 1.0; }
        slot += cascade;
    }
    let clip = frame.shadowMatrix[slot] * vec4f(at, 1.0);
    if (clip.w <= 0.0) { return 1.0; }
    let ndc = clip.xyz / clip.w * 0.5 + 0.5;
    if (any(ndc < vec3f(0.0)) || any(ndc > vec3f(1.0))) { return 1.0; }
    let rect = frame.shadowRect[slot];
    return textureSampleCompareLevel(shadowMap, shadowSampler, rect.xy + ndc.xy * rect.zw, ndc.z - frame.shadowParams[slot].x);
}
fn pointShadowFactor(slot: i32, fromLight: vec3f, worldPosition: vec3f, normal: vec3f) -> f32 {
    // Faces of the tetrahedron the four maps were rendered through.
    let k = 0.5773502691896258;
    let d1 = dot(fromLight, vec3f(-k, -k, k));
    let d2 = dot(fromLight, vec3f(-k, k, -k));
    let d3 = dot(fromLight, vec3f(k, -k, -k));
    var face = 0;
    var best = dot(fromLight, vec3f(k, k, k));
    if (d1 > best) { best = d1; face = 1; }
    if (d2 > best) { best = d2; face = 2; }
    if (d3 > best) { face = 3; }
    return shadowFactor(slot + face, worldPosition, normal);
}
fn cascadedShadowFactor(slot: i32, worldPosition: vec3f, normal: vec3f) -> f32 {
    let viewDepth = -(frame.view * vec4f(worldPosition, 1.0)).z;
    let count = i32(frame.cascadeInfo.y);
    var cascade = 0;
    for (var c = 0; c < 3; c++) { if (c < count - 1 && viewDepth > frame.cascadeSplits[c]) { cascade = c + 1; } }
    let edge = frame.cascadeSplits[cascade];
    if (viewDepth >= edge) { return 1.0; }
    var visible = shadowFactor(slot + cascade, worldPosition, normal);
    // Blend into the next cascade, or out to unshadowed past the last one.
    let t = smoothstep(edge * (1.0 - frame.cascadeInfo.z), edge, viewDepth);
    if (t > 0.0) {
        var next = 1.0;
        if (cascade < count - 1) { next = shadowFactor(slot + cascade + 1, worldPosition, normal); }
        visible = mix(visible, next, t);
    }
    return visible;
}
fn rangeFalloff(dist: f32, range: f32) -> f32 {
    let inverseSquare = 1.0 / max(dist * dist, 0.0001);
    if (range <= 0.0) { return inverseSquare; }
    let ratio = dist / range;
    let window = clamp(1.0 - ratio * ratio * ratio * ratio, 0.0, 1.0);
    return inverseSquare * window * window;
}
fn shade(s: Surface, l: vec3f, radiance: vec3f) -> vec3f {
    let nl = max(dot(s.normal, l), 0.0);
    if (nl <= 0.0) { return vec3f(0.0); }
    ${e?t:"return vec3f(0.0);"}
}
fn toneMap(input: vec3f) -> vec3f {
    var color = input * frame.output.z;
    if (frame.output.w > 1.5) {
        // Filmic curve fit commonly used for ACES-like output.
        color = clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
    } else if (frame.output.w > 0.5) { color = color / (1.0 + color); }
    return color;
}
fn encodeSrgb(input: vec3f) -> vec3f {
    let color = clamp(input, vec3f(0.0), vec3f(1.0));
    return mix(color * 12.92, 1.055 * pow(color, vec3f(1.0 / 2.4)) - 0.055, step(vec3f(0.0031308), color));
}
@fragment
fn fragmentMain(input: VertexOutput, @builtin(front_facing) frontFacing: bool) -> @location(0) vec4f {
    // Implicit-derivative operations run first, before any non-uniform control flow.
    surfacePixel = input.clip.xy;
    let dpx = dpdx(input.worldPosition);
    let dpy = dpdy(input.worldPosition);
    let duvx = dpdx(input.uv);
    let duvy = dpdy(input.uv);
    var base = material.color * input.color;
    ${n.mapFromTarget?`
    let mapColor = textureSample(mapTexture, mapSampler, input.uv);
    // Target pixels carry alpha-weighted RGB. Material shading uses straight color.
    var straightColor = vec3f(0.0);
    if (mapColor.a > 0.0) { straightColor = mapColor.rgb / mapColor.a; }
    base *= vec4f(straightColor, mapColor.a);`:n.map?"base *= textureSample(mapTexture, mapSampler, input.uv);":""}
    ${n.splat?`
    {
        // Ground layers, each weighted by its channel of the weight map.
        var share = textureSample(lightTexture, lightSampler, input.uv);
        let total = share.r + share.g + share.b + share.a;
        if (total > 0.0001) { share = share / total; } else { share = vec4f(1.0, 0.0, 0.0, 0.0); }
        base = vec4f(base.rgb * (textureSample(mapTexture, mapSampler, input.uv * material.splat.x).rgb * share.r + textureSample(emissiveTexture, emissiveSampler, input.uv * material.splat.y).rgb * share.g
            + textureSample(occlusionTexture, occlusionSampler, input.uv * material.splat.z).rgb * share.b + textureSample(metallicRoughnessTexture, metallicRoughnessSampler, input.uv * material.splat.w).rgb * share.a), base.a);
    }`:""}
    ${n.softDepth?`
    {
        // Fade out over the last stretch before the solid surface behind this pixel.
        let stored = textureLoad(sceneDepthMap, vec2i(input.clip.xy), 0) * 2.0 - 1.0;
        sceneDistance = frame.pointShadow.w / (stored + frame.pointShadow.z);
        if (frame.lightCounts.w > 0.5) { sceneDistance = (frame.pointShadow.w - stored) / frame.pointShadow.z; }
        surfaceDistance = -(frame.view * vec4f(input.worldPosition, 1.0)).z;
        ${n.transmission?"":"base.a *= clamp((sceneDistance - surfaceDistance) / max(material.emissive.w, 0.0001), 0.0, 1.0);"}
    }`:""}
    ${n.normalMap?"let normalSample = textureSample(normalTexture, normalSampler, input.uv).xyz;":""}
    ${n.metallicRoughnessMap?"let mrSample = textureSample(metallicRoughnessTexture, metallicRoughnessSampler, input.uv);":""}
    ${n.occlusionMap?"let occlusionSample = textureSample(occlusionTexture, occlusionSampler, "+(n.occlusionUv1?"input.uv1":"input.uv")+").r;":""}
    ${n.lightMap?"let lightSample = textureSample(lightTexture, lightSampler, "+(n.lightUv1?"input.uv1":"input.uv")+").rgb;":""}
    ${n.emissiveMap?"let emissiveSample = textureSample(emissiveTexture, emissiveSampler, "+(n.emissiveUv1?"input.uv1":"input.uv")+").rgb;":""}
    ${n.shading==="matcap"?`
    var matcapNormal = normalize(${n.normal?"input.normal":"cross(dpx, -dpy)"});
    ${n.doubleSided?"if (!frontFacing) { matcapNormal = -matcapNormal; }":""}
    let matcapView = normalize((frame.view * vec4f(matcapNormal, 0.0)).xyz);
    let matcapSample = textureSampleLevel(emissiveTexture, emissiveSampler, matcapView.xy * 0.5 + 0.5, 0.0).rgb;`:""}
    ${n.alphaMask?"if (base.a < material.params.x) { discard; }":""}
    for (var plane = 0; plane < i32(frame.clipInfo.x); plane++) {
        if (dot(input.worldPosition, frame.clipPlanes[plane].xyz) + frame.clipPlanes[plane].w < 0.0) { discard; }
    }
    var color = base.rgb${n.shading==="matcap"?" * matcapSample":""};
    ${e?`
    var s: Surface;
    ${n.flatShading||!n.normal?"var n = normalize(cross(dpy, dpx));":`var n = normalize(input.normal);
    ${n.doubleSided?"if (!frontFacing) { n = -n; }":""}`}
    ${n.normalMap?`
    var mapped = normalSample * 2.0 - 1.0;
    mapped = vec3f(mapped.xy * material.surface.z, mapped.z);
    ${n.tangent?`
    let t = normalize(input.tangent.xyz);
    let b = cross(n, t) * input.tangent.w;`:`
    // Derive a cotangent frame from screen-space derivatives. Framebuffer Y
    // points down in WebGPU, so the Y derivatives are negated first.
    let dp2perp = cross(-dpy, n);
    let dp1perp = cross(n, dpx);
    var t = dp2perp * duvx.x - dp1perp * duvy.x;
    var b = dp2perp * duvx.y - dp1perp * duvy.y;
    let invmax = inverseSqrt(max(max(dot(t, t), dot(b, b)), 1e-12));
    t *= invmax;
    b *= invmax;`}
    n = normalize(mat3x3f(t, b, n) * mapped);`:""}
    ${n.customNormalWgsl!==void 0?"n = normalize(customNormal(n, input.worldPosition, "+(n.uv?"input.uv":"vec2f(0.0)")+"));":""}
    s.normal = n;
    s.view = normalize(frame.cameraPosition.xyz - input.worldPosition);
    s.albedo = base.rgb;
    s.metallic = material.surface.x;
    s.roughness = material.surface.y;
    ${n.metallicRoughnessMap?"s.metallic *= mrSample.b; s.roughness *= mrSample.g;":""}
    s.roughness = clamp(s.roughness, 0.045, 1.0);
    s.f0 = mix(vec3f(0.04), s.albedo, s.metallic);
    var occlusion = 1.0;
    ${n.occlusionMap?"occlusion = mix(1.0, occlusionSample, material.surface.w);":""}
    ${n.transmission?`
    // Light that passes through replaces that share of the diffuse reflection.
    // What the surface reflects at this angle does not pass through it.
    var through = material.extra.y * (1.0 - s.metallic) * (1.0 - (0.04 + 0.96 * pow(1.0 - max(dot(s.normal, s.view), 0.0), 5.0)));
    var passed = vec3f(0.0);
    {
        let bent = refract(-s.view, s.normal, 1.0 / max(material.extra.z, 1.0));
        let here = frame.viewProjection * vec4f(input.worldPosition, 1.0);
        let there = frame.viewProjection * vec4f(input.worldPosition + bent * material.extra.w, 1.0);
        let shift = (there.xy / max(there.w, 0.0001) - here.xy / here.w) * 0.5 * frame.clipInfo.zw;
        let at = input.clip.xy / vec2f(textureDimensions(sceneColor)) + vec2f(shift.x, -shift.y);
        // A rough surface scatters the view: average a spiral of taps that widens with roughness.
        let spread = s.roughness * s.roughness * 0.25 / max(here.w, 1.0);
        for (var i = 0; i < 12; i++) {
            let turn = f32(i) * 2.399963;
            let reach = sqrt((f32(i) + 0.5) / 12.0) * spread;
            // The stored image is top row first, so an upward step is a downward one in it.
            passed += textureSampleLevel(sceneColor, sceneColorSampler, clamp(at + vec2f(cos(turn), -sin(turn)) * reach, vec2f(0.0), vec2f(1.0)), 0.0).rgb;
        }
        passed /= 12.0;
    }
    // Tint of the material, deepened by the distance travelled inside it.
    var tint = s.albedo;
    // With a depth image the light's path through the material is the real gap to what lies behind.
    let travelled = ${n.softDepth?"max(sceneDistance - surfaceDistance, 0.0)":"material.extra.w"};
    if (material.attenuation.w > 0.0) { tint *= pow(max(material.attenuation.rgb, vec3f(0.0001)), vec3f(travelled / material.attenuation.w)); }
    s.albedo *= 1.0 - through;
    var clear = 1.0;`:""}
    ${n.reflectionMap?`
    var mirrorClear = 1.0;
    // The mirror camera sees the scene flipped left to right; stored images are top row first.
    let mirrorAt = frame.viewProjection * vec4f(input.worldPosition, 1.0);
    let mirrorNdc = mirrorAt.xy / max(mirrorAt.w, 0.0001);
    let mirrorUv = vec2f(0.5 - mirrorNdc.x * 0.5, 0.5 - mirrorNdc.y * 0.5) + vec2f(s.normal.x, -s.normal.z) * material.sprite.z;
    let mirrored = textureSampleLevel(reflectionTexture, reflectionSampler, clamp(mirrorUv, vec2f(0.002), vec2f(0.998)), 0.0).rgb
        * (s.f0 + (1.0 - s.f0) * pow(1.0 - max(dot(s.normal, s.view), 0.0), 5.0)) * material.sprite.w;`:""}
    var diffuseAlbedo = s.albedo;
    ${n.shading==="standard"?"diffuseAlbedo *= 1.0 - s.metallic;":""}
    var irradiance = frame.ambient.rgb + mix(frame.hemisphereGround.rgb, frame.hemisphereSky.rgb, s.normal.y * 0.5 + 0.5);
    ${n.environment?"irradiance += textureSampleLevel(environmentMap, environmentSampler, s.normal, frame.output.y).rgb * frame.output.x * material.params.y;":""}
    ${n.lightMap?"irradiance += lightSample * material.extra.x;":""}
    color = diffuseAlbedo * irradiance * occlusion;
    ${n.environment&&n.shading==="standard"&&!n.reflectionMap?`
    {
        let reflected = reflect(-s.view, s.normal);
        let nv = max(dot(s.normal, s.view), 0.0);
        let prefiltered = textureSampleLevel(environmentMap, environmentSampler, reflected, s.roughness * frame.output.y).rgb * frame.output.x * material.params.y;
        // Analytic approximation of the split-sum environment BRDF.
        let r = s.roughness * vec4f(-1.0, -0.0275, -0.572, 0.022) + vec4f(1.0, 0.0425, 1.04, -0.04);
        let a004 = min(r.x * r.x, exp2(-9.28 * nv)) * r.x + r.y;
        let scaleBias = vec2f(-1.04, 1.04) * a004 + r.zw;
        color += prefiltered * (s.f0 * scaleBias.x + scaleBias.y) * occlusion;
    }`:""}
    let directionalCount = i32(frame.lightCounts.x);
    let pointCount = i32(frame.lightCounts.y);
    let spotCount = i32(frame.lightCounts.z);
    for (var i = 0; i < directionalCount; i++) {
        var visible = 1.0;
        ${n.receiveShadow?`if (frame.directionalDirection[i].w >= 0.0) {
            if (f32(i) == frame.cascadeInfo.x) { visible = cascadedShadowFactor(i32(frame.directionalDirection[i].w), input.worldPosition, s.normal); }
            else { visible = shadowFactor(i32(frame.directionalDirection[i].w), input.worldPosition, s.normal); }
        }`:""}
        color += shade(s, -frame.directionalDirection[i].xyz, frame.directionalColor[i].rgb) * visible;
    }
    for (var i = 0; i < pointCount; i++) {
        let toLight = frame.pointPosition[i].xyz - input.worldPosition;
        let dist = length(toLight);
        var visible = 1.0;
        ${n.receiveShadow?"if (f32(i) == frame.pointShadow.x) { visible = pointShadowFactor(i32(frame.pointShadow.y), -toLight, input.worldPosition, s.normal); }":""}
        color += shade(s, toLight / max(dist, 0.0001), frame.pointColor[i].rgb * rangeFalloff(dist, frame.pointPosition[i].w)) * visible;
    }
    // Point lights past the eight: only those whose range reaches this pixel's screen tile are visited.
    if (frame.tileInfo.x > 0.5) {
        let tileAt = clamp(vec2i((input.clip.xy - vec2f(frame.tileGrid.w, frame.tileInfo.w)) / frame.tileGrid.z), vec2i(0), vec2i(frame.tileGrid.xy) - vec2i(1));
        let head = tiledLights[i32(frame.tileInfo.y) + tileAt.y * i32(frame.tileGrid.x) + tileAt.x];
        let first = i32(head.x);
        let tileCount = min(i32(head.y), 32);
        for (var k = 0; k < tileCount; k++) {
            let slot = first + k;
            let lightIndex = i32(tiledLights[i32(frame.tileInfo.z) + slot / 4][slot % 4]);
            let lightPosition = tiledLights[lightIndex * 2];
            let lightColor = tiledLights[lightIndex * 2 + 1];
            let toLight = lightPosition.xyz - input.worldPosition;
            let dist = length(toLight);
            if (dist >= lightPosition.w) { continue; }
            color += shade(s, toLight / max(dist, 0.0001), lightColor.rgb * rangeFalloff(dist, lightPosition.w));
        }
    }
    for (var i = 0; i < spotCount; i++) {
        let toLight = frame.spotPosition[i].xyz - input.worldPosition;
        let dist = length(toLight);
        let l = toLight / max(dist, 0.0001);
        let cone = smoothstep(frame.spotCone[i].x, frame.spotCone[i].y, dot(-l, frame.spotDirection[i].xyz));
        var visible = 1.0;
        ${n.receiveShadow?"if (cone > 0.0 && frame.spotDirection[i].w >= 0.0) { visible = shadowFactor(i32(frame.spotDirection[i].w), input.worldPosition, s.normal); }":""}
        color += shade(s, l, frame.spotColor[i].rgb * rangeFalloff(dist, frame.spotPosition[i].w) * cone) * visible;
    }`:""}
    ${n.shading==="matcap"?"":`
    var emissive = material.emissive.rgb;
    ${n.emissiveMap?"emissive *= emissiveSample;":""}
    color += emissive;`}
    ${n.customWgsl!==void 0?`
    let customized = customFragment(vec4f(color, base.a), input.worldPosition, normalize(input.normal), input.uv);
    color = customized.rgb;
    base.a = customized.a;
    ${n.transmission?`// On a see-through material the hook's alpha is how much still passes: 0 covers what lies behind.
    through *= clamp(customized.a, 0.0, 1.0);`:""}`:""}
    ${n.fog?`
    if (frame.fogParams.x > 0.5) {
        let dist = length(frame.cameraPosition.xyz - input.worldPosition);
        var fog = smoothstep(frame.fogParams.y, frame.fogParams.z, dist);
        if (frame.fogParams.x > 1.5) { fog = 1.0 - exp(-frame.fogParams.y * frame.fogParams.y * dist * dist); }
        color = mix(color, frame.fogColor.rgb, clamp(fog, 0.0, 1.0));
        ${n.transmission?"clear = 1.0 - clamp(fog, 0.0, 1.0);":""}
        ${n.reflectionMap?"mirrorClear = 1.0 - clamp(fog, 0.0, 1.0);":""}
    }`:""}
    ${n.toneMapped?"color = toneMap(color);":""}
    ${n.transmission?`
    // The stored scene is display-ready, so it joins after tone mapping; the canvas holds it sRGB-encoded.
    ${n.linearOutput?"":"passed = mix(passed / 12.92, pow((passed + 0.055) / 1.055, vec3f(2.4)), step(vec3f(0.04045), passed));"}
    color += passed * tint * through * clear;`:""}
    ${n.reflectionMap?"color += mirrored * mirrorClear;":""}
    ${n.linearOutput?"color = max(color, vec3f(0.0));":"color = encodeSrgb(color);"}
    ${n.premultipliedAlpha?"color *= base.a;":""}
    return vec4f(color, ${n.alphaBlend?"base.a":"1.0"});
}
`}E(st,"fragmentSource");function Ge(n){return(n.depthOnly?tt:et)+it+(n.customVertexWgsl??"")+`
`+rt(n)+(n.customWgsl??"")+`
`+(n.customNormalWgsl??"")+`
`+st(n)}E(Ge,"buildMaterialWgsl3D");function Ve(n){let e=n.shading;for(let t of Object.keys(n).sort())t!=="shading"&&n[t]===!0&&(e+=" "+t);return n.customKey!==void 0&&(e+=" custom:"+n.customKey),e}E(Ve,"shaderFeatureKey3D");var We=`
struct Sky {
    inverseViewProjection: mat4x4f,
    output: vec4f, // x: intensity, y: 1 keeps linear output, z: exposure, w: tone mapping
}
@group(0) @binding(0) var<uniform> sky: Sky;
@group(0) @binding(1) var skyMap: texture_cube<f32>;
@group(0) @binding(2) var skySampler: sampler;
struct SkyOutput {
    @builtin(position) clip: vec4f,
    @location(0) direction: vec3f,
}
@vertex
fn vertexMain(@builtin(vertex_index) index: u32) -> SkyOutput {
    let corner = vec2f(f32((index << 1u) & 2u), f32(index & 2u)) * 2.0 - 1.0;
    let far = sky.inverseViewProjection * vec4f(corner, 1.0, 1.0);
    let near = sky.inverseViewProjection * vec4f(corner, -1.0, 1.0);
    var output: SkyOutput;
    output.direction = far.xyz / far.w - near.xyz / near.w;
    output.clip = vec4f(corner, 1.0, 1.0);
    return output;
}
@fragment
fn fragmentMain(input: SkyOutput) -> @location(0) vec4f {
    var color = textureSample(skyMap, skySampler, normalize(input.direction)).rgb * sky.output.x * sky.output.z;
    if (sky.output.w > 1.5) { color = clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), vec3f(0.0), vec3f(1.0)); }
    else if (sky.output.w > 0.5) { color = color / (1.0 + color); }
    if (sky.output.y < 0.5) { color = clamp(color, vec3f(0.0), vec3f(1.0)); color = mix(color * 12.92, 1.055 * pow(color, vec3f(1.0 / 2.4)) - 0.055, step(vec3f(0.0031308), color)); }
    return vec4f(color, 1.0);
}
`,je=`
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var sourceSampler: sampler;
struct MipOutput {
    @builtin(position) clip: vec4f,
    @location(0) uv: vec2f,
}
@vertex
fn vertexMain(@builtin(vertex_index) index: u32) -> MipOutput {
    let corner = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
    var output: MipOutput;
    output.uv = vec2f(corner.x, 1.0 - corner.y);
    output.clip = vec4f(corner * 2.0 - 1.0, 0.0, 1.0);
    return output;
}
@fragment
fn fragmentMain(input: MipOutput) -> @location(0) vec4f {
    return textureSample(source, sourceSampler, input.uv);
}
`;function $e(n,e){let t=e.data;if(n==="joints")return t instanceof Uint32Array?t:Uint32Array.from(t);if(t instanceof Float32Array)return t;let i=new Float32Array(t.length);if(!e.normalized)return i.set(t),i;let o=t instanceof Int8Array||t instanceof Int16Array,a=o?t instanceof Int8Array?127:32767:t instanceof Uint8Array?255:t instanceof Uint16Array?65535:4294967295;for(let r=0;r<t.length;r++)i[r]=o?Math.max(t[r]/a,-1):t[r]/a;return i}E($e,"convertVertexAttribute3D");function qe(n,e,t){let i=new Float32Array(n.length*e*t*4);return n.forEach((o,a)=>{[o.position,o.normal].slice(0,e).forEach((r,s)=>{if(!r)return;let c=(a*e+s)*t*4;for(let l=0;l<t;l++)i[c+l*4]=r[l*3],i[c+l*4+1]=r[l*3+1],i[c+l*4+2]=r[l*3+2]})}),i}E(qe,"packMorphStorage3D");function Ye(n){let e=n.index?.data,t=Math.floor(n.drawCount/3),i=new Uint32Array(t*6);for(let o=0;o<t;o++){let a=e?e[o*3]:o*3,r=e?e[o*3+1]:o*3+1,s=e?e[o*3+2]:o*3+2;i.set([a,r,r,s,s,a],o*6)}return i}E(Ye,"packWireIndices3D");function Xe(n,e,t,i,o){let a=n.morphWeights,r=o+48,s=o+56,c=0;for(let l=0;l<a.length;l++){let u=a[l];if(u===0)continue;if(c<8){i[r+c]=l,t[s+c]=u,c++;continue}let h=0;for(let d=1;d<c;d++)Math.abs(t[s+d])<Math.abs(t[s+h])&&(h=d);Math.abs(u)>Math.abs(t[s+h])&&(i[r+h]=l,t[s+h]=u)}n instanceof N&&!n.skeleton&&(c=Math.min(8,n.animations.morphCount,n.geometry.morphTargets.length)),i[o+44]=e.morph.vertexCount,i[o+45]=e.morph.channels,i[o+46]=c,i[o+47]=0}E(Xe,"writeObjectMorph3D");var R=Object.freeze({VERTEX:1,FRAGMENT:2}),S=Object.freeze({MAP_READ:1,COPY_DST:8,INDEX:16,VERTEX:32,UNIFORM:64,STORAGE:128}),T=Object.freeze({COPY_SRC:1,COPY_DST:2,TEXTURE_BINDING:4,RENDER_ATTACHMENT:16}),at=1,ot=["position","normal","uv","tangent","color","joints","weights","uv1"],ce="rgba8unorm-srgb",ue="rgba16float",he="depth32float",ee="depth24plus",nt=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),de=600;function pe(n){let e=n;return[Math.max(1,e.videoWidth??e.width??1),Math.max(1,e.videoHeight??e.height??1)]}E(pe,"hostSize");function lt(n,e){return n.lost.then(t=>{let i=e;e=void 0,i?.(t)}),()=>{e=void 0}}E(lt,"observeDeviceLoss");var te=class{static{E(this,"WebGPURenderer3D")}canvas;device;toneMapping;exposure;shadowsEnabled;postProcess=ke();viewport;autoClear=!0;#d;#p=!1;#f="none";info={frame:0,drawCalls:0,triangles:0,visited:0,culled:0,lightsDropped:0,lightsTiled:0,shadowMaps:0,programs:0,geometries:0,textures:0};#r;#n;#t;#b;#S;#e=new Me;#s=new Float32Array(se);#l;#v=new Float32Array(oe.width*oe.rows*4);#c;#u;#w;#y;#x;#g;#k;#R;#T=new Map;#a=new Map;#i=new Map;#m=new Map;#h=new Map;#M=new Map;#O=new Map;#D=new Map;#A=new Map;#o;#H=!1;#ce=0;#ue=new WeakMap;#he=new Map;#de=new Map;#pe=new Map;#K=[];#fe;#me;#J;#Q;#ve;#P;#Z;#G;#V;#ge;#ee;#W;#be;#j;#te;#U=new Map;#we="";#E;#ie;#C=256;#z=new ArrayBuffer(256*256);#ye=new Float32Array(this.#z);#xe=new Int32Array(this.#z);#L=0;#_;#$;#Me="";#q;#Y;#re;#I=0;#se=0;#F=!1;#B=!1;#Se=new Float32Array(16);#De=new Float32Array(9);#Ae=new Float32Array(256/4);constructor(e,t,i){let o=e.canvas,a=o.getContext("webgpu");if(!a)throw new z("WORLD3D_CONTEXT_UNAVAILABLE","webgpu canvas context");this.canvas=o,this.device=t,this.#S=i,this.#r=a,this.#n=navigator.gpu.getPreferredCanvasFormat(),this.#b=e.alpha??!1,this.#t=e.antialias??!0?4:1,this.toneMapping=e.toneMapping??"aces",this.exposure=e.exposure??1,this.shadowsEnabled=e.shadows??!0,this.#ee=Math.min(e.shadowAtlasSize??2048,t.limits.maxTextureDimension2D),a.configure({device:t,format:this.#n,alphaMode:this.#b?"premultiplied":"opaque",usage:T.RENDER_ATTACHMENT|T.COPY_SRC});let r=[];for(let u=0;u<7;u++)r.push({binding:1+u*2,visibility:R.FRAGMENT,texture:{}}),r.push({binding:2+u*2,visibility:R.FRAGMENT,sampler:{}});let s=R.VERTEX|R.FRAGMENT;this.#u=t.createBindGroupLayout({entries:[{binding:0,visibility:s,buffer:{}},{binding:1,visibility:R.FRAGMENT,texture:{sampleType:"depth"}},{binding:2,visibility:R.FRAGMENT,sampler:{type:"comparison"}},{binding:3,visibility:R.FRAGMENT,texture:{viewDimension:"cube"}},{binding:4,visibility:R.FRAGMENT,sampler:{}},{binding:5,visibility:R.FRAGMENT,texture:{}},{binding:6,visibility:R.FRAGMENT,sampler:{}},{binding:7,visibility:R.FRAGMENT,texture:{sampleType:"depth"}},{binding:8,visibility:R.FRAGMENT,buffer:{type:"read-only-storage"}}]}),this.#w=t.createBindGroupLayout({entries:[{binding:0,visibility:s,buffer:{}}]}),this.#y=t.createBindGroupLayout({entries:[{binding:0,visibility:s,buffer:{}},...r]}),this.#x=t.createBindGroupLayout({entries:[{binding:0,visibility:s,buffer:{hasDynamicOffset:!0,minBindingSize:256}}]}),this.#g=t.createBindGroupLayout({entries:[{binding:0,visibility:R.VERTEX,buffer:{type:"read-only-storage"}},{binding:1,visibility:R.VERTEX,buffer:{type:"read-only-storage"}}]}),this.#k=t.createPipelineLayout({bindGroupLayouts:[this.#u,this.#y,this.#x,this.#g]}),this.#R=t.createPipelineLayout({bindGroupLayouts:[this.#w,this.#y,this.#x,this.#g]}),this.#l=t.createBuffer({size:se*4,usage:S.UNIFORM|S.COPY_DST}),this.#c=t.createBuffer({size:this.#v.byteLength,usage:S.STORAGE|S.COPY_DST}),this.#E=this.createObjectBuffer(),this.#ie=this.createObjectGroup();let c=this.#fe=t.createTexture({size:[1,1],format:"rgba8unorm",usage:T.TEXTURE_BINDING|T.COPY_DST});t.queue.writeTexture({texture:c},new Uint8Array([255,255,255,255]),{},[1,1]),this.#J=c.createView();let l=this.#me=t.createTexture({size:[1,1,6],format:"rgba8unorm",usage:T.TEXTURE_BINDING|T.COPY_DST});for(let u=0;u<6;u++)t.queue.writeTexture({texture:l,origin:[0,0,u]},new Uint8Array([255,255,255,255]),{},[1,1]);this.#Q=l.createView({dimension:"cube"}),this.#P=t.createSampler({magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"}),this.#Z=t.createSampler({compare:"less-equal",magFilter:"linear",minFilter:"linear"}),this.#te=t.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"}),this.#G=t.createBuffer({size:64,usage:S.STORAGE}),this.#V=t.createBuffer({size:16,usage:S.STORAGE}),this.#ge=this.createSkinGroup(this.#G,this.#V),this.#ve=lt(t,u=>{this.#F=!0,e.onDeviceLost?.(u.message)})}get isDeviceLost(){return this.#F}setSize(e,t,i=1){let o=Math.max(1,Math.floor(e*i)),a=Math.max(1,Math.floor(t*i));if(!Number.isFinite(o)||!Number.isFinite(a))throw new z("WORLD3D_INPUT_INVALID","size");this.canvas.width!==o&&(this.canvas.width=o),this.canvas.height!==a&&(this.canvas.height=a)}resizeToDisplaySize(e=1){let t=this.canvas;if(typeof t.clientWidth!="number")return!1;let i=Math.max(1,Math.floor(t.clientWidth*e)),o=Math.max(1,Math.floor(t.clientHeight*e));return t.width===i&&t.height===o?!1:(t.width=i,t.height=o,!0)}createObjectBuffer(){return this.device.createBuffer({size:this.#C*256,usage:S.UNIFORM|S.COPY_DST})}createObjectGroup(){return this.device.createBindGroup({layout:this.#x,entries:[{binding:0,resource:{buffer:this.#E,size:256}}]})}createSkinGroup(e,t){return this.device.createBindGroup({layout:this.#g,entries:[{binding:0,resource:{buffer:e}},{binding:1,resource:{buffer:t}}]})}writeBuffer(e,t,i,o=t.length){let a=Math.max(4,Math.ceil(o*t.BYTES_PER_ELEMENT/4)*4),r=e;if((!r||r.bytes<a)&&(r?.buffer.destroy(),r={buffer:this.device.createBuffer({size:a,usage:i|S.COPY_DST}),version:-1,bytes:a}),o*t.BYTES_PER_ELEMENT%4===0)this.device.queue.writeBuffer(r.buffer,0,t.buffer,t.byteOffset,o*t.BYTES_PER_ELEMENT);else{let s=new Uint16Array(o+1);s.set(t.subarray(0,o)),this.device.queue.writeBuffer(r.buffer,0,s)}return r}sampler(e){let t=e.magFilter==="linear"&&e.minFilter==="linear"&&e.mipmaps?Math.min(Math.max(Math.floor(e.anisotropy),1),16):1,i=e.wrapS+e.wrapT+e.magFilter+e.minFilter+e.mipmaps+t,o=this.#he.get(i);if(!o){let a=E(r=>r==="clamp"?"clamp-to-edge":r==="mirror"?"mirror-repeat":"repeat","wrap");o=this.device.createSampler({addressModeU:a(e.wrapS),addressModeV:a(e.wrapT),addressModeW:"clamp-to-edge",magFilter:e.magFilter,minFilter:e.minFilter,mipmapFilter:e.mipmaps?"linear":"nearest",maxAnisotropy:t}),this.#he.set(i,o)}return o}uploadSource(e,t,i,o){let a=this.device.queue;if(Q(t)){let c=t.data;if(o){let l=t.width*4,u=new Uint8Array(c.length);for(let h=0;h<t.height;h++)u.set(c.subarray(h*l,h*l+l),(t.height-1-h)*l);c=u}a.writeTexture({texture:e,origin:[0,0,i]},c.buffer,{offset:c.byteOffset,bytesPerRow:t.width*4,rowsPerImage:t.height},[t.width,t.height]);return}let[r,s]=pe(t);a.copyExternalImageToTexture({source:t,flipY:o},{texture:e,origin:[0,0,i]},[r,s])}generateMipmaps(e,t){let i=this.device,o=e.format,a=this.#de.get(o);if(!a){let s=i.createShaderModule({code:je});a=i.createRenderPipeline({layout:"auto",vertex:{module:s,entryPoint:"vertexMain"},fragment:{module:s,entryPoint:"fragmentMain",targets:[{format:o}]},primitive:{topology:"triangle-list"}}),this.#de.set(o,a)}let r=i.createCommandEncoder();for(let s=0;s<t;s++)for(let c=1;c<e.mipLevelCount;c++){let l=e.createView({dimension:"2d",baseMipLevel:c-1,mipLevelCount:1,baseArrayLayer:s,arrayLayerCount:1}),u=r.beginRenderPass({colorAttachments:[{view:e.createView({dimension:"2d",baseMipLevel:c,mipLevelCount:1,baseArrayLayer:s,arrayLayerCount:1}),loadOp:"clear",storeOp:"store"}]});u.setPipeline(a),u.setBindGroup(0,i.createBindGroup({layout:a.getBindGroupLayout(0),entries:[{binding:0,resource:l},{binding:1,resource:this.#P}]})),u.draw(3),u.end()}i.queue.submit([r.finish()])}createColorTexture(e,t,i,o){let a=this.device.limits.maxTextureDimension2D;if(e>a||t>a)throw new z("WORLD3D_BUDGET","texture size");return this.device.createTexture({size:[e,t,i],format:o.colorSpace==="srgb"?"rgba8unorm-srgb":"rgba8unorm",mipLevelCount:o.mipmaps?Math.floor(Math.log2(Math.max(e,t)))+1:1,usage:T.TEXTURE_BINDING|T.COPY_DST|T.RENDER_ATTACHMENT})}textureEntry(e,t){let i=this.#h.get(e);if(i&&i.version===e.version)return i;let{texture:o,view:a}=t(),r=i?.texture;if(i)i.texture=o,i.view=a;else{let s={texture:o,view:a,sampler:this.#P,version:-1,maxMip:0,unsubscribe:e.onDispose(()=>{let c=this.#h.get(e);c&&this.#h.delete(e)&&c.texture.destroy()})};this.#h.set(e,i=s)}return r?.destroy(),i.sampler=this.sampler(e),i.maxMip=o.mipLevelCount-1,i.version=e.version,i}texture2d(e){let t=e.source;if(t instanceof V)return{view:this.target(t).colorView,sampler:this.sampler(e),key:"t"+t.id+":"+t.version};let i=this.textureEntry(e,()=>{if(ye(t)){let s=this.compressedFormat(t.format,e.colorSpace==="srgb");if(!s)throw new z("WORLD3D_RESOURCE_FAILED","compressed format "+t.format+" is not supported by this device");let c=we[t.format],l=this.device.createTexture({size:[Math.ceil(t.width/4)*4,Math.ceil(t.height/4)*4],format:s,mipLevelCount:t.levels.length,usage:T.TEXTURE_BINDING|T.COPY_DST}),u=l.width,h=l.height;return t.levels.forEach((d,v)=>{let m=Math.ceil(u/4),y=Math.ceil(h/4);this.device.queue.writeTexture({texture:l,mipLevel:v},d.buffer,{offset:d.byteOffset,bytesPerRow:m*c,rowsPerImage:y},[m*4,y*4]),u=Math.max(1,u>>1),h=Math.max(1,h>>1)}),{texture:l,view:l.createView()}}let[o,a]=Q(t)?[t.width,t.height]:pe(t),r=this.createColorTexture(o,a,1,e);return this.uploadSource(r,t,0,e.flipY),r.mipLevelCount>1&&this.generateMipmaps(r,1),{texture:r,view:r.createView()}});return{view:i.view,sampler:i.sampler,key:e.id+":"+e.version}}compressedFormat(e,t){let o={bc1:["texture-compression-bc","bc1-rgba-unorm"],bc3:["texture-compression-bc","bc3-rgba-unorm"],bc7:["texture-compression-bc","bc7-rgba-unorm"],"etc2-rgb8":["texture-compression-etc2","etc2-rgb8unorm"],"etc2-rgba8":["texture-compression-etc2","etc2-rgba8unorm"],"astc-4x4":["texture-compression-astc","astc-4x4-unorm"]}[e];if(!(!o||!this.device.features.has(o[0])))return o[1]+(t?"-srgb":"")}supportsCompressedFormat(e){return this.compressedFormat(e,!1)!==void 0}textureCube(e){return this.textureEntry(e,()=>{let t=e.faces[0],i=Q(t)?t.width:pe(t)[0],o=this.createColorTexture(i,i,6,e);return e.faces.forEach((a,r)=>this.uploadSource(o,a,r,!1)),o.mipLevelCount>1&&this.generateMipmaps(o,6),{texture:o,view:o.createView({dimension:"cube"})}})}target(e){if(e.isDisposed)throw new z("WORLD3D_DISPOSED","render target");let t=this.#M.get(e);if(t&&t.version===e.version)return t;let i=this.device.limits.maxTextureDimension2D;if(e.width>i||e.height>i)throw new z("WORLD3D_BUDGET","render target size");let o=this.device.createTexture({size:[e.width,e.height],format:e.format==="rgba16f"?ue:ce,usage:T.RENDER_ATTACHMENT|T.TEXTURE_BINDING|T.COPY_SRC}),a=e.depth?this.device.createTexture({size:[e.width,e.height],format:ee,usage:e.depthTexture?T.RENDER_ATTACHMENT|T.TEXTURE_BINDING:T.RENDER_ATTACHMENT}):void 0;if(t)t.color.destroy(),t.depth?.destroy(),t.color=o,t.colorView=o.createView(),t.depth=a,t.depthView=a?.createView();else{let r={color:o,colorView:o.createView(),depth:a,depthView:a?.createView(),version:-1,unsubscribe:e.onDispose(()=>{let s=this.#M.get(e);s&&this.#M.delete(e)&&(s.color.destroy(),s.depth?.destroy())})};this.#M.set(e,t=r)}return t.version=e.version,t}convert(e,t){return $e(e,t)}geometry(e){let t=this.#i.get(e);if(t&&t.serial===this.#I)return t;if(!t){let o={buffers:new Map,index:void 0,wire:void 0,morph:void 0,layoutVersion:-1,serial:-1,unsubscribe:e.onDispose(()=>this.releaseGeometry(e))};this.#i.set(e,t=o)}for(let o of ot){let a=e.getAttribute(o),r=t.buffers.get(o);if(!a){r&&(r.buffer.destroy(),t.buffers.delete(o));continue}if(r&&r.version===a.version)continue;let s=this.writeBuffer(r,this.convert(o,a),S.VERTEX);s.version=a.version,t.buffers.set(o,s)}let i=e.index;if(i){if(!t.index||t.index.version!==i.version){let o=i.data instanceof Uint32Array||i.data instanceof Uint16Array?i.data:Uint16Array.from(i.data),a=this.writeBuffer(t.index,o,S.INDEX);t.index={buffer:a.buffer,bytes:a.bytes,version:i.version,format:o instanceof Uint32Array?"uint32":"uint16"}}}else t.index&&(t.index.buffer.destroy(),t.index=void 0);if(t.layoutVersion!==e.layoutVersion){t.morph?.buffer.destroy(),t.morph=void 0;let o=e.morphTargets;if(o.length>0){let a=e.vertexCount,r=o.some(c=>c.normal)?2:1,s=qe(o,r,a);if(s.byteLength>this.device.limits.maxStorageBufferBindingSize)throw new z("WORLD3D_BUDGET","morph target data");t.morph={buffer:this.writeBuffer(void 0,s,S.STORAGE).buffer,channels:r,vertexCount:a}}t.wire?.buffer.destroy(),t.wire=void 0,t.layoutVersion=e.layoutVersion}return t.serial=this.#I,t}wireframe(e,t){if(t.wire&&t.wire.version===e.version)return t.wire;let i=Ye(e);t.wire?.buffer.destroy();let o={buffer:this.writeBuffer(void 0,i,S.INDEX).buffer,count:i.length,version:e.version};return t.wire=o,o}releaseGeometry(e){let t=this.#i.get(e);if(t){this.#i.delete(e);for(let i of t.buffers.values())i.buffer.destroy();t.index?.buffer.destroy(),t.wire?.buffer.destroy(),t.morph?.buffer.destroy()}}uploadInstances(e,t,i){if(e?.source===t&&e.version===i)return e;let o=this.writeBuffer(e,t,S.VERTEX);return o.source=t,o.version=i,o}instances(e,t){let i=e instanceof N?e:void 0,o=i?void 0:be(e),a=i?.drawMatrices??e.instanceMatrices,r=o?.matrices??e.instanceVersion,s=this.#m.get(e),c=this.uploadInstances(s?.matrices,a,r);s?s.matrices=c:(s={matrices:c,colors:void 0,lastFrame:t},this.#m.set(e,s)),s.lastFrame=t;let l=i?i.drawColors:e.instanceColors;return l?s.colors=this.uploadInstances(s.colors,l,o?.colors??e.instanceVersion):s.colors&&(s.colors.source=void 0),i&&(s.animation=this.uploadInstances(s.animation,i.drawAnimation,e.instanceVersion)),s}skin(e,t,i,o){let a=!i&&e instanceof N?e.animations:void 0;if(!i&&!t.morph&&!a)return this.#ge;let r=this.#G;if(a){let l=this.#A.get(a);if(!l){l=this.device.createBuffer({size:a.data.byteLength,usage:S.STORAGE|S.COPY_DST}),this.device.queue.writeBuffer(l,0,a.data.buffer,a.data.byteOffset,a.data.byteLength),this.#A.set(a,l);let u=l;a.onDispose(()=>{this.#A.get(a)===u&&(u.destroy(),this.#A.delete(a))})}r=l}if(i){let l=e.skeleton,u=l.bones.length,h=this.#D.get(l);(!h||h.count!==u)&&(h?.buffer.destroy(),h={buffer:this.device.createBuffer({size:Math.max(u,1)*64,usage:S.STORAGE|S.COPY_DST}),version:-1,count:u,lastFrame:o},this.#D.set(l,h)),h.lastFrame=o,h.version!==l.version&&u>0&&(this.device.queue.writeBuffer(h.buffer,0,l.boneMatrices.buffer,l.boneMatrices.byteOffset,l.boneMatrices.byteLength),h.version=l.version),r=h.buffer}let s=t.morph?.buffer??this.#V,c=this.#ue.get(e);return(!c||c.bones!==r||c.morph!==s)&&(c={group:this.createSkinGroup(r,s),bones:r,morph:s},this.#ue.set(e,c)),c.group}material(e){let t=this.#O.get(e);if(!t){let y=this.device.createBuffer({size:256,usage:S.UNIFORM|S.COPY_DST}),g={buffer:y,group:void 0,key:"",serial:-1,unsubscribe:e.onDispose(()=>{this.#O.delete(e)&&y.destroy()})};this.#O.set(e,t=g)}if(t.serial===this.#I&&t.group)return t.group;t.serial=this.#I;let i=this.#Ae,o=e.emissiveIntensity,a=e.map;i[0]=e.color[0],i[1]=e.color[1],i[2]=e.color[2],i[3]=e.opacity,i[4]=e.emissive[0]*o,i[5]=e.emissive[1]*o,i[6]=e.emissive[2]*o,i[7]=e.softness,i[8]=e.metallic,i[9]=e.roughness,i[10]=e.normalScale,i[11]=e.occlusionStrength,i[12]=e.specular[0],i[13]=e.specular[1],i[14]=e.specular[2],i[15]=e.shading==="toon"?e.toonSteps:e.shininess,i[16]=e.alphaCutoff,i[17]=e.environmentIntensity,i[18]=e.clearcoat,i[19]=e.clearcoatRoughness;let r=1,s=0,c=0,l=0,u=1,h=0;if(a?.hasTransform){let y=Math.cos(a.rotation),g=Math.sin(a.rotation);r=y*a.repeat[0],s=-g*a.repeat[1],c=a.offset[0],l=g*a.repeat[0],u=y*a.repeat[1],h=a.offset[1]}a?.source instanceof V&&(l=-l,u=-u,h=1-h),i[20]=r,i[21]=s,i[22]=c,i[23]=0,i[24]=l,i[25]=u,i[26]=h,i[27]=0,i[28]=e.rotation,i[29]=e.sizeAttenuation?1:0,i[30]=e.reflectionDistortion,i[31]=e.reflectionStrength,e.shader?i.set(e.shader.uniforms,32):i.fill(0,32,48),i[48]=e.sheenColor[0]*e.sheen,i[49]=e.sheenColor[1]*e.sheen,i[50]=e.sheenColor[2]*e.sheen,i[51]=e.sheenRoughness,i[52]=e.lightMapIntensity,i[53]=e.transmission,i[54]=e.ior,i[55]=e.thickness,i[56]=e.attenuationColor[0],i[57]=e.attenuationColor[1],i[58]=e.attenuationColor[2],i[59]=Number.isFinite(e.attenuationDistance)?e.attenuationDistance:0;let d=e.splat;i[60]=d?.repeat[0]??1,i[61]=d?.repeat[1]??1,i[62]=d?.repeat[2]??1,i[63]=d?.repeat[3]??1,this.device.queue.writeBuffer(t.buffer,0,i);let v=[{binding:0,resource:{buffer:t.buffer}}],m="";return(d?[d.layers[0],e.normalMap,d.layers[3]??d.layers[0],d.layers[2]??d.layers[0],d.layers[1]??d.layers[0],d.weights,e.reflectionMap]:[e.map,e.normalMap,e.metallicRoughnessMap,e.occlusionMap,e.emissiveMap,e.lightMap,e.reflectionMap]).forEach((y,g)=>{let x=y&&!y.isDisposed?this.texture2d(y):void 0;v.push({binding:1+g*2,resource:x?.view??this.#J},{binding:2+g*2,resource:x?.sampler??this.#P}),m+=(x?.key??"-")+"|"}),(!t.group||t.key!==m)&&(t.group=this.device.createBindGroup({layout:this.#y,entries:v}),t.key=m),t.group}features(e,t,i,o){let{mesh:a,material:r}=e,s=i==="depth"||i==="scene-depth",c=r.shading!=="unlit"&&r.shading!=="matcap"&&!s,l=t.buffers.has("uv"),u=a.isInstanced,h=t.buffers.has("uv1")&&!s,d=h&&c&&r.occlusionMap?.channel===1,v=h&&r.shading!=="matcap"&&r.emissiveMap?.channel===1,m=h&&c&&r.lightMap?.channel===1,y=c&&r.lightMap!==void 0&&(l||m),g=a.skeleton!==void 0&&t.buffers.has("joints")&&t.buffers.has("weights"),x=u&&!g&&a instanceof N;return{shading:r.shading,depthOnly:s,normal:t.buffers.has("normal")&&(!s||r.shader?.wgslVertex!==void 0),uv:l&&(!s||r.map!==void 0&&r.alphaMode!=="opaque"||r.shader?.wgslVertex!==void 0),tangent:c&&l&&r.normalMap!==void 0&&t.buffers.has("tangent")&&!x,vertexColor:r.vertexColors&&t.buffers.has("color")&&!x,skinning:g,morph:t.morph!==void 0,morphNormals:t.morph?.channels===2,skinInstancing:u&&!g&&a instanceof N&&t.buffers.has("joints")&&t.buffers.has("weights"),splat:!s&&l&&r.splat!==void 0,gpuParticles:u&&!s&&a instanceof re,softDepth:!s&&r.softness>0&&this.#H,instancing:u,instanceColor:u&&!s&&a.instanceColors!==void 0,billboard:r.billboard&&!r.screenSpace,screenSpace:r.screenSpace,map:l&&r.map!==void 0&&(!s||r.alphaMode!=="opaque"),mapFromTarget:!s&&l&&r.map?.source instanceof V,normalMap:c&&l&&r.normalMap!==void 0,metallicRoughnessMap:c&&l&&r.metallicRoughnessMap!==void 0&&r.shading==="standard",occlusionMap:c&&(l||d)&&r.occlusionMap!==void 0,uv1:(d||v||m)&&!x,occlusionUv1:d&&!x,emissiveUv1:v&&!x,lightMap:y,lightUv1:m&&!x,transmission:!s&&this.#le&&r.shading==="standard"&&r.transmission>0,emissiveMap:!s&&(l||v)&&r.emissiveMap!==void 0&&r.shading!=="matcap",alphaMask:r.alphaMode==="mask",alphaBlend:r.alphaMode==="blend",premultipliedAlpha:!s&&r.alphaMode==="blend"&&r.blending==="premultiplied",flatShading:r.flatShading,doubleSided:r.side==="double",receiveShadow:c&&a.receiveShadow&&this.#se>0,environment:c&&o.environment,fog:!s&&o.fog&&r.fog,...!s&&r.shader?.wgsl!==void 0?{customKey:r.shader.key,customWgsl:r.shader.wgsl}:{},...r.shader?.wgslVertex!==void 0?{customKey:r.shader.key,customVertexWgsl:r.shader.wgslVertex}:{},...c&&r.shader?.wgslNormal!==void 0?{customKey:r.shader.key,customNormalWgsl:r.shader.wgslNormal}:{},reflectionMap:c&&r.shading==="standard"&&r.reflectionMap!==void 0,toneMapped:!s&&this.#f!=="none"&&r.toneMapped,linearOutput:i==="target"||i==="hdr"}}pipeline(e,t,i,o,a,r){let{geometry:s,material:c,mesh:l}=t,u=o==="depth",h=u||o==="scene-depth",d=Ve(e),v=r?"line-list":s.topology==="triangles"?"triangle-list":s.topology==="lines"?"line-list":s.topology==="line-strip"?"line-strip":"point-list",m=u||c.side==="double"||c.billboard?"none":c.side==="back"?"front":"back",y=!h&&c.alphaMode==="blend"?c.blending:"off",g=u||c.depthWrite,x=u?"1.5,2":c.polygonOffset?c.polygonOffset.join(","):"",_=s.getAttribute("color")?.itemSize??4,C=l.isInstanced?l.instanceColorSize:4,O=v==="line-strip"&&i.index?i.index.format:"",A=[d,o,v,m,a?"cw":"ccw",y,g,c.depthTest,x,_,C,O].join("/"),b=this.#a.get(A);if(b)return b;let P=this.#T.get(d);P||(P=this.device.createShaderModule({code:Ge(e),label:d}),this.#T.set(d,P));let D=[],w=E((k,j,H,K)=>{k&&D.push({arrayStride:K,attributes:[{shaderLocation:j,offset:0,format:H}]})},"add");w(!0,0,"float32x3",12),w(e.normal,1,"float32x3",12),w(e.uv,2,"float32x2",8),w(e.tangent,3,"float32x4",16),w(e.vertexColor,4,_===3?"float32x3":"float32x4",_*4),w(e.skinning||e.skinInstancing===!0,5,"uint32x4",16),w(e.skinning||e.skinInstancing===!0,6,"float32x4",16),w(e.uv1,7,"float32x2",8),e.instancing&&D.push({arrayStride:64,stepMode:"instance",attributes:[0,1,2,3].map(k=>({shaderLocation:8+k,offset:k*16,format:"float32x4"}))}),e.instanceColor&&D.push({arrayStride:C*4,stepMode:"instance",attributes:[{shaderLocation:12,offset:0,format:C===3?"float32x3":"float32x4"}]}),e.skinInstancing&&D.push({arrayStride:48,stepMode:"instance",attributes:[0,1,2].map(k=>({shaderLocation:13+k,offset:k*16,format:"float32x4"}))});let L=y==="off"?void 0:y==="additive"?{color:{srcFactor:"src-alpha",dstFactor:"one"},alpha:{srcFactor:"zero",dstFactor:"one"}}:y==="multiply"?{color:{srcFactor:"dst",dstFactor:"zero"},alpha:{srcFactor:"zero",dstFactor:"one"}}:y==="premultiplied"?{color:{srcFactor:"one",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha"}}:{color:{srcFactor:"src-alpha",dstFactor:"one-minus-src-alpha"},alpha:{srcFactor:"one",dstFactor:"one-minus-src-alpha"}},B=!h||e.alphaMask||e.alphaBlend,G=v==="triangle-list",ie={label:A,layout:h?this.#R:this.#k,vertex:{module:P,entryPoint:"vertexMain",buffers:D},primitive:{topology:v,cullMode:m,frontFace:a?"cw":"ccw",...O?{stripIndexFormat:O}:{}},depthStencil:{format:h?he:ee,depthWriteEnabled:g,depthCompare:c.depthTest||u?"less-equal":"always",...G&&u?{depthBias:2,depthBiasSlopeScale:1.5}:{},...G&&!u&&c.polygonOffset?{depthBias:Math.round(c.polygonOffset[1]),depthBiasSlopeScale:c.polygonOffset[0]}:{}},multisample:{count:o==="canvas"?this.#t:1},...B?{fragment:{module:P,entryPoint:"fragmentMain",targets:h?[]:[{format:this.colorFormat(o),...L?{blend:L}:{}}]}}:{}};return b=this.device.createRenderPipeline(ie),this.#a.set(A,b),b}writeObject(e,t,i){let o=this.#L++,a=o*(256/4),r=this.#ye,s=this.#xe;if(i)r.set(nt,a),r.set(e.bindMatrix,a+28);else{r.set(e.matrixWorld,a);let c=me(this.#De,e.matrixWorld);for(let l=0;l<3;l++)r[a+16+l*4]=c[l*3],r[a+17+l*4]=c[l*3+1],r[a+18+l*4]=c[l*3+2]}return t.morph?Xe(e,t,r,s,a):s[a+46]=0,o*256}#X;#ae;#oe;#ne;#N;#Te=new WeakMap;#le=!1;resetPassState(){this.#X=void 0,this.#ae=void 0,this.#oe=void 0,this.#ne=void 0,this.#N=void 0}draw(e,t,i,o){let{mesh:a,geometry:r,material:s}=t,c=this.#e.frame,l=this.geometry(r);if(!l.buffers.has("position"))return;let u=a.isInstanced,h=a instanceof N?a.drawCount:u?a.count:1;if(h<=0||this.#L>=this.#C)return;let d=a.matrixWorld,v=d[0]*(d[5]*d[10]-d[6]*d[9])-d[4]*(d[1]*d[10]-d[2]*d[9])+d[8]*(d[1]*d[6]-d[2]*d[5]),m=s.wireframe&&i!=="depth"&&r.topology==="triangles",y=(i==="canvas"?0:i==="target"?1:i==="depth"?2:i==="hdr"?3:65536)|(m?4:0)|(v<0?8:0)|(u?16:0)|(u&&a.instanceColors?32:0)|(a.skeleton?64:0)|(a.receiveShadow&&this.#se>0?128:0)|(o.fog?256:0)|(o.environment?512:0)|(this.#f!=="none"?1024:0)|(u&&a.instanceColorSize===4?2048:0)|(s.side==="double"?4096:s.side==="back"?8192:0)|(a instanceof N?16384:0)|(a instanceof re?32768:0),g=this.#Te.get(s);(!g||g.version!==s.version)&&this.#Te.set(s,g={version:s.version,variants:new Map});let x=s.map,C=((x?1:0)|(x?.source instanceof V?2:0)|(s.normalMap?4:0)|(s.metallicRoughnessMap?8:0)|(s.occlusionMap?16:0)|(s.emissiveMap?32:0)|(s.alphaMode==="mask"?64:s.alphaMode==="blend"?128:0)|(s.blending==="premultiplied"?256:s.blending==="additive"?32768:s.blending==="multiply"?65536:0)|(s.flatShading?512:0)|(s.vertexColors?1024:0)|(s.billboard?2048:0)|(s.screenSpace?4096:0)|(s.depthTest?8192:0)|(s.depthWrite?16384:0)|(s.fog?131072:0)|(s.toneMapped?262144:0)|(s.polygonOffset?524288:0)|(s.occlusionMap?.channel===1?1048576:0)|(s.emissiveMap?.channel===1?2097152:0)|(s.lightMap?4194304:0)|(s.lightMap?.channel===1?8388608:0)|(s.reflectionMap?16777216:0)|(s.softness>0&&this.#H?33554432:0)|(s.splat?67108864:0))*131072+y,O=g.variants.get(r.id);O||g.variants.set(r.id,O=new Map);let A=O.get(C);if(!A||A.layoutVersion!==l.layoutVersion){let w=this.features(t,l,i,o);A={features:w,pipeline:this.pipeline(w,t,l,i,v<0&&!w.skinning,m),layoutVersion:l.layoutVersion},O.set(C,A)}let b=A.features;A.pipeline!==this.#X&&(e.setPipeline(A.pipeline),this.#X=A.pipeline);let P=this.material(s);P!==this.#ae&&(e.setBindGroup(1,P),this.#ae=P),e.setBindGroup(2,this.#ie,[this.writeObject(a,l,b.skinning)]);let D=this.skin(a,l,b.skinning,c);if(D!==this.#oe&&(e.setBindGroup(3,D),this.#oe=D),u||this.#ne!==A||this.#X!==A.pipeline){let w=0,L=E((B,G)=>{B&&e.setVertexBuffer(w++,l.buffers.get(G).buffer)},"bind");if(L(!0,"position"),L(b.normal,"normal"),L(b.uv,"uv"),L(b.tangent,"tangent"),L(b.vertexColor,"color"),L(b.skinning||b.skinInstancing===!0,"joints"),L(b.skinning||b.skinInstancing===!0,"weights"),L(b.uv1,"uv1"),u){let B=this.instances(a,c);e.setVertexBuffer(w++,B.matrices.buffer),b.instanceColor&&e.setVertexBuffer(w++,B.colors.buffer),b.skinInstancing&&e.setVertexBuffer(w++,B.animation.buffer)}this.#ne=u?void 0:A,this.#N=void 0}if(m){let w=this.wireframe(r,l);e.setIndexBuffer(w.buffer,"uint32"),e.drawIndexed(w.count,h),this.#N=void 0}else l.index?(l.index.buffer!==this.#N&&(e.setIndexBuffer(l.index.buffer,l.index.format),this.#N=l.index.buffer),e.drawIndexed(t.count,h,t.start)):e.draw(t.count,h,t.start);i!=="depth"&&i!=="scene-depth"&&(this.info.drawCalls++,!m&&r.topology==="triangles"&&(this.info.triangles+=t.count/3*h))}depthItem={mesh:void 0,geometry:void 0,material:void 0,start:0,count:0,depth:0};drawDepth(e,t){let i=t.geometry,o=this.depthItem,a=i.groups,r={fog:!1,environment:!1};if(i.topology==="triangles")if(o.mesh=t,o.geometry=i,Array.isArray(t.material)&&a.length>0)for(let s of a)o.material=t.materialAt(s.materialIndex),o.start=s.start,o.count=s.count,o.material.visible&&!o.material.isDisposed&&!o.material.billboard&&this.draw(e,o,"depth",r);else o.material=t.materialAt(0),o.start=0,o.count=i.drawCount,o.material.visible&&!o.material.isDisposed&&!o.material.billboard&&this.draw(e,o,"depth",r)}ensureShadowAtlas(){if(!this.#W){let e=this.#ee;this.#W=this.device.createTexture({size:[e,e],format:he,usage:T.RENDER_ATTACHMENT|T.TEXTURE_BINDING}),this.#be=this.#W.createView()}return this.#be}canvasAttachments(e){let t=e.width+"x"+e.height;if(t!==this.#Me||!this.#_){this.#_?.destroy(),this.#$?.destroy();let i=[e.width,e.height];this.#_=this.device.createTexture({size:i,format:ee,sampleCount:this.#t,usage:T.RENDER_ATTACHMENT}),this.#$=this.#t>1?this.device.createTexture({size:i,format:this.#n,sampleCount:this.#t,usage:T.RENDER_ATTACHMENT}):void 0,this.#Me=t}return{color:this.#$?.createView(),depth:this.#_.createView()}}colorFormat(e){return e==="target"?ce:e==="hdr"?ue:this.#n}drawSkybox(e,t,i,o,a){let r=this.device,s="skybox/"+a;if(!fe(this.#Se,o.viewProjectionMatrix))return;let c=this.#a.get(s);if(!c){this.#re??=r.createBindGroupLayout({entries:[{binding:0,visibility:R.VERTEX|R.FRAGMENT,buffer:{}},{binding:1,visibility:R.FRAGMENT,texture:{viewDimension:"cube"}},{binding:2,visibility:R.FRAGMENT,sampler:{}}]});let d=r.createShaderModule({code:We,label:"skybox"});c=r.createRenderPipeline({label:s,layout:r.createPipelineLayout({bindGroupLayouts:[this.#re]}),vertex:{module:d,entryPoint:"vertexMain"},fragment:{module:d,entryPoint:"fragmentMain",targets:[{format:this.colorFormat(a)}]},primitive:{topology:"triangle-list"},depthStencil:{format:ee,depthWriteEnabled:!1,depthCompare:"less-equal"},multisample:{count:a==="canvas"?this.#t:1}}),this.#a.set(s,c)}this.#q??=r.createBuffer({size:80,usage:S.UNIFORM|S.COPY_DST});let l=new Float32Array(20);l.set(this.#Se),l[16]=i,l[17]=a==="canvas"?0:1,l[18]=this.exposure,l[19]=this.#f==="aces"?2:this.#f==="reinhard"?1:0,r.queue.writeBuffer(this.#q,0,l);let u=this.textureCube(t),h=t.id+":"+t.version;(!this.#Y||this.#Y.key!==h)&&(this.#Y={key:h,group:r.createBindGroup({layout:this.#re,entries:[{binding:0,resource:{buffer:this.#q}},{binding:1,resource:u.view},{binding:2,resource:u.sampler}]})}),e.setPipeline(c),e.setBindGroup(0,this.#Y.group),e.draw(3),this.info.drawCalls++}get tiledLights(){return this.#e.tiledLights}set tiledLights(e){this.#e.tiledLights=!!e}get autoInstancing(){return this.#e.autoInstanceThreshold>1}set autoInstancing(e){this.#e.autoInstanceThreshold=e?8:0}render(e,t,i){return this.renderView(e,t,i)}renderReflectionPass(e,t,i){return this.renderView(e,t,i.target,i)}reuseReflection(e){return!this.#B&&!this.#F&&this.#M.get(e)?.version===e.version}renderView(e,t,i,o){if(this.#B)throw new z("WORLD3D_DISPOSED","renderer");if(this.#F)return!1;if(!o&&this.postProcess.enabled&&!this.#p)return this.renderPost(e,t,i);let a=this.device,r=this.#e,s=this.info,c=i?i.format==="rgba16f"?"hdr":"target":"canvas";if(i?.isDisposed)throw new z("WORLD3D_DISPOSED","render target");this.#f=Se(o?.toneMapping??this.toneMapping,i),r.build(e,t,o),this.#I++,this.#L=0,s.frame=r.frame,s.drawCalls=s.triangles=0,s.visited=r.stats.visited,s.culled=r.stats.culled,s.lightsDropped=r.stats.lightsDropped;let l=this.ensureShadowAtlas(),u=De(this.#s,r,this.#ee,this.shadowsEnabled&&(o?.shadows??!0),!0,this.#pe,t);this.#se=u.length;let h=e.environment&&!e.environment.isDisposed?this.textureCube(e.environment):void 0;Te(this.#s,e,t,r,this.#pe,{exposure:this.exposure,toneMapping:this.#f,environmentMaxMip:h?.maxMip??0}),this.#s[ae.clipInfo+2]=this.viewport?this.viewport[2]:1,this.#s[ae.clipInfo+3]=this.viewport?this.viewport[3]:1;{let f=i?i.width:this.#r.getCurrentTexture().width,p=i?i.height:this.#r.getCurrentTexture().height,M=this.viewport,F=M?Math.max(Math.round(M[2]*f),1):f,I=M?Math.max(Math.round(M[3]*p),1):p,U=M?Math.round(M[0]*f):0,J=M?Math.max(p-Math.round(M[1]*p)-I,0):0,q=Ae(this.#s,this.#v,r.tiledPointLights,t.viewProjectionMatrix,F,I,!0,U,J);q>0&&a.queue.writeBuffer(this.#c,0,this.#v),this.info.lightsTiled=q}a.queue.writeBuffer(this.#l,0,this.#s);let d=r.transparent.some(f=>f.material.softness>0),v=i?i.width:this.#r.getCurrentTexture().width,m=i?i.height:this.#r.getCurrentTexture().height;if(d&&(!this.#o||this.#o.texture.width!==v||this.#o.texture.height!==m)){this.#o?.texture.destroy(),this.#o?.buffer.destroy();let f=a.createTexture({size:[v,m],format:he,usage:T.RENDER_ATTACHMENT|T.TEXTURE_BINDING}),p=a.createBuffer({size:128,usage:S.UNIFORM|S.COPY_DST});this.#o={texture:f,view:f.createView(),buffer:p,group:a.createBindGroup({layout:this.#w,entries:[{binding:0,resource:{buffer:p}}]})},this.#ce++}this.#H=d;let y=d?this.#o.view:l,g=(h?e.environment.id+":"+e.environment.version:"-")+(d?"|d"+this.#ce:"");(!this.#j||this.#we!==g)&&(this.#j=a.createBindGroup({layout:this.#u,entries:[{binding:0,resource:{buffer:this.#l}},{binding:1,resource:l},{binding:2,resource:this.#Z},{binding:3,resource:h?.view??this.#Q},{binding:4,resource:h?.sampler??this.#P},{binding:5,resource:this.#J},{binding:6,resource:this.#te},{binding:7,resource:y},{binding:8,resource:{buffer:this.#c}}]}),this.#we=g);let x=r.opaque.length*(d?2:1)+r.transparent.length;for(let f of u)for(let p of f.casters)x+=Array.isArray(p.material)?Math.max(p.geometry.groups.length,1):1;if(x>this.#C){for(;this.#C<x;)this.#C*=2;this.#E.destroy(),this.#E=this.createObjectBuffer(),this.#ie=this.createObjectGroup(),this.#z=new ArrayBuffer(this.#C*256),this.#ye=new Float32Array(this.#z),this.#xe=new Int32Array(this.#z)}let _=a.createCommandEncoder();if(u.length>0){this.resetPassState();let f=_.beginRenderPass({colorAttachments:[],depthStencilAttachment:{view:l,depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}});for(let p of u){let M=this.#K[p.slot];if(!M){let F=a.createBuffer({size:128,usage:S.UNIFORM|S.COPY_DST});M=this.#K[p.slot]={buffer:F,group:a.createBindGroup({layout:this.#w,entries:[{binding:0,resource:{buffer:F}}]})}}a.queue.writeBuffer(M.buffer,0,p.matrix),f.setViewport(p.x,p.y,p.tile,p.tile,0,1),f.setScissorRect(p.x,p.y,p.tile,p.tile),f.setBindGroup(0,M.group);for(let F of p.casters)this.drawDepth(f,F)}f.end()}if(d){let f=this.#o;a.queue.writeBuffer(f.buffer,0,t.viewProjectionMatrix),a.queue.writeBuffer(f.buffer,64,t.viewMatrix),this.resetPassState();let p=_.beginRenderPass({colorAttachments:[],depthStencilAttachment:{view:f.view,depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}}),M=this.viewport;if(M){let I=Math.max(Math.round(M[2]*v),1),U=Math.max(Math.round(M[3]*m),1),J=Math.min(Math.max(Math.round(M[0]*v),0),v-1),q=Math.min(Math.max(m-Math.round(M[1]*m)-U,0),m-1);p.setViewport(J,q,Math.min(I,v-J),Math.min(U,m-q),0,1)}p.setBindGroup(0,f.group);let F={fog:!1,environment:!1};for(let I of r.opaque)I.geometry.topology==="triangles"&&I.material.depthWrite&&!I.material.billboard&&!I.material.screenSpace&&this.draw(p,I,"scene-depth",F);p.end()}let C=e.background,O=i?f=>f:ve,A=Array.isArray(C)?[O(C[0]),O(C[1]),O(C[2]),1]:[0,0,0,(i||this.#b)&&!C?0:1],b,P,D,w,L,B=r.transparent.some(f=>f.material.transmission>0&&f.material.shading==="standard"),G=this.autoClear?"clear":"load";if(i){let f=this.target(i);if(b={view:f.colorView,clearValue:A,loadOp:G,storeOp:"store"},P=f.depthView,L=f.color,D=i.width,w=i.height,!P)throw new z("WORLD3D_INPUT_INVALID","the WebGPU backend requires render targets with depth")}else{let f=this.#r.getCurrentTexture(),p=this.canvasAttachments(f),M=f.createView();b=p.color?{view:p.color,resolveTarget:M,clearValue:A,loadOp:G,storeOp:"store"}:{view:M,clearValue:A,loadOp:G,storeOp:"store"},P=p.depth,L=f,D=f.width,w=f.height}this.resetPassState();let ie=i?.depthTexture||B?"store":"discard",k=_.beginRenderPass({colorAttachments:[b],depthStencilAttachment:{view:P,depthClearValue:1,depthLoadOp:"clear",depthStoreOp:ie}}),j=this.viewport,H=E(()=>{if(!j)return;let f=Math.max(Math.round(j[2]*D),1),p=Math.max(Math.round(j[3]*w),1),M=Math.min(Math.max(Math.round(j[0]*D),0),D-1),F=Math.min(Math.max(w-Math.round(j[1]*w)-p,0),w-1),I=Math.min(f,D-M),U=Math.min(p,w-F);k.setViewport(M,F,I,U,0,1),k.setScissorRect(M,F,I,U)},"frame");H();let K={fog:e.fog!==void 0,environment:h!==void 0};k.setBindGroup(0,this.#j);for(let f of r.opaque)this.draw(k,f,c,K);if(C instanceof xe&&!C.isDisposed&&(this.drawSkybox(k,C,e.backgroundIntensity,t,c),this.resetPassState(),k.setBindGroup(0,this.#j)),B){k.end();let f=this.colorFormat(c),p=this.#U.get(c);if(!p||p.texture.width!==D||p.texture.height!==w||p.texture.format!==f){p?.texture.destroy();let M=a.createTexture({size:[D,w],format:f,usage:T.TEXTURE_BINDING|T.COPY_DST});this.#U.set(c,p={texture:M,view:M.createView(),group:void 0,key:""})}(!p.group||p.key!==g)&&(p.group=a.createBindGroup({layout:this.#u,entries:[{binding:0,resource:{buffer:this.#l}},{binding:1,resource:l},{binding:2,resource:this.#Z},{binding:3,resource:h?.view??this.#Q},{binding:4,resource:h?.sampler??this.#P},{binding:5,resource:p.view},{binding:6,resource:this.#te},{binding:7,resource:y},{binding:8,resource:{buffer:this.#c}}]}),p.key=g),_.copyTextureToTexture({texture:L},{texture:p.texture},[D,w]),k=_.beginRenderPass({colorAttachments:[{...b,loadOp:"load"}],depthStencilAttachment:{view:P,depthLoadOp:"load",depthStoreOp:i?.depthTexture?"store":"discard"}}),H(),this.resetPassState(),k.setBindGroup(0,p.group),this.#le=!0}for(let f of r.transparent)this.draw(k,f,c,K);return this.#le=!1,k.end(),this.#L>0&&a.queue.writeBuffer(this.#E,0,this.#z,0,this.#L*256),a.queue.submit([_.finish()]),this.prune(r.frame),s.programs=this.#a.size,s.geometries=this.#i.size,s.textures=this.#h.size,s.shadowMaps=u.length,!0}renderPost(e,t,i){if(i?.isDisposed)throw new z("WORLD3D_DISPOSED","render target");let o=i?void 0:this.#r.getCurrentTexture(),a=i?i.width:o.width,r=i?i.height:o.height,s=this.#d??=new Z(this.device);s.scene.setSize(Math.max(a,1),Math.max(r,1)),this.#p=!0;try{if(!this.render(e,t,s.scene))return!1}finally{this.#p=!1}let c=this.device.createCommandEncoder(),l=i?this.target(i).colorView:o.createView(),u=i?i.format==="rgba16f"?ue:ce:this.#n,h;if(Ee(this.postProcess)){s.mask.setSize(Math.max(a,1),Math.max(r,1));let v={layerMask:t.layerMask,override:e.overrideMaterial,background:e.background,shadows:this.shadowsEnabled,planes:e.clippingPlanes};t.layerMask=this.postProcess.outlineLayers,e.overrideMaterial=s.maskMaterial,e.background=[0,0,0],this.shadowsEnabled=!1,this.#p=!0;let m={...this.info};try{this.render(e,t,s.mask)&&(h=this.target(s.mask).colorView)}finally{this.#p=!1,t.layerMask=v.layerMask,e.overrideMaterial=v.override,e.background=v.background,this.shadowsEnabled=v.shadows,Object.assign(this.info,m)}}let d=this.target(s.scene);return this.info.drawCalls+=s.run(c,d.colorView,d.depthView,h,Pe(t),a,r,l,u,i!==void 0,this.postProcess,i?.format==="rgba16f"?"none":this.toneMapping),this.device.queue.submit([c.finish()]),!0}prune(e){if(e%de===0){for(let[t,i]of this.#m)e-i.lastFrame<de||(i.matrices.buffer.destroy(),i.colors?.buffer.destroy(),i.animation?.buffer.destroy(),this.#m.delete(t));for(let[t,i]of this.#D)e-i.lastFrame<de||(i.buffer.destroy(),this.#D.delete(t))}}async readRenderTargetPixels(e){if(e.format==="rgba16f")throw new z("WORLD3D_INPUT_INVALID","half-float targets cannot be read back as bytes");if(this.#B)throw new z("WORLD3D_DISPOSED","renderer");if(this.#F)throw new z("WORLD3D_CONTEXT_LOST","readback");let t=this.device,i=this.target(e),o=e.width,a=e.height,r=Math.ceil(o*4/256)*256,s=t.createBuffer({size:r*a,usage:S.COPY_DST|S.MAP_READ});try{let c=t.createCommandEncoder();c.copyTextureToBuffer({texture:i.color},{buffer:s,bytesPerRow:r,rowsPerImage:a},[o,a]),t.queue.submit([c.finish()]),await s.mapAsync(at);let l=new Uint8Array(s.getMappedRange()),u=new Uint8Array(o*a*4);for(let h=0;h<a;h++)u.set(l.subarray(h*r,h*r+o*4),h*o*4);return s.unmap(),u}catch(c){throw new z("WORLD3D_RESOURCE_FAILED","render target readback",c)}finally{s.destroy()}}dispose(){if(!this.#B){this.#B=!0,this.#ve(),this.#e.clear(),this.#d?.dispose(),this.#d=void 0;for(let e of[...this.#i.keys()])this.#i.get(e).unsubscribe(),this.releaseGeometry(e);for(let e of this.#h.values())e.unsubscribe(),e.texture.destroy();for(let e of this.#M.values())e.unsubscribe(),e.color.destroy(),e.depth?.destroy();for(let e of this.#O.values())e.unsubscribe(),e.buffer.destroy();for(let e of this.#m.values())e.matrices.buffer.destroy(),e.colors?.buffer.destroy(),e.animation?.buffer.destroy();for(let e of this.#D.values())e.buffer.destroy();for(let e of this.#A.values())e.destroy();this.#A.clear();for(let e of this.#K)e?.buffer.destroy();this.#h.clear(),this.#M.clear(),this.#O.clear(),this.#m.clear(),this.#D.clear(),this.#a.clear(),this.#T.clear(),this.#l.destroy(),this.#c.destroy(),this.#E.destroy(),this.#q?.destroy(),this.#G.destroy(),this.#V.destroy(),this.#fe.destroy(),this.#me.destroy();for(let e of this.#U.values())e.texture.destroy();this.#U.clear(),this.#W?.destroy(),this.#_?.destroy(),this.#$?.destroy(),this.#o?.texture.destroy(),this.#o?.buffer.destroy(),this.#o=void 0;try{this.#r.unconfigure()}catch{}this.#S&&this.device.destroy()}}};async function Rt(n){let e=n?.canvas;if(!e||typeof e.getContext!="function")throw new z("WORLD3D_INPUT_INVALID","canvas");if(n.device)return new te(n,n.device,!1);if(typeof navigator>"u"||!navigator.gpu)throw new z("WORLD3D_CONTEXT_UNAVAILABLE","webgpu");let t=await navigator.gpu.requestAdapter({powerPreference:n.powerPreference??"high-performance"});if(!t)throw new z("WORLD3D_CONTEXT_UNAVAILABLE","webgpu adapter");let i,o=["texture-compression-bc","texture-compression-etc2","texture-compression-astc"].filter(a=>t.features.has(a));try{i=await t.requestDevice({requiredFeatures:o})}catch(a){throw new z("WORLD3D_CONTEXT_UNAVAILABLE","webgpu device",a)}try{return new te(n,i,!0)}catch(a){throw i.destroy(),a}}E(Rt,"createWebGPURenderer3D");export{te as WebGPURenderer3D,Rt as createWebGPURenderer3D};
