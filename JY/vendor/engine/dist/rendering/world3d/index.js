// SPDX-License-Identifier: Apache-2.0
// Optional DOM-free 3D entry: scene graph, geometry, materials, lights,
// cameras, animation, picking and glTF loading. Rendering backends live in
// separate explicit entries and consume these objects without mutating them.
export { World3DError } from './core3D.js';
export { Resource3D } from './core3D.js';
export * from './math3D.js';
export { Object3D, Scene3D, WORLD3D_LIMITS } from './Object3D.js';
export { Texture3D, CubeTexture3D, RenderTarget3D, createSolidTexture3D, createGradientCubeTexture3D, isTexturePixels3D, TEXTURE3D_LIMITS, } from './Texture3D.js';
export { Attribute3D, Geometry3D, createGeometry3D, ATTRIBUTE_3D, GEOMETRY3D_LIMITS } from './Geometry3D.js';
export { createBoxGeometry3D, createPlaneGeometry3D, createSphereGeometry3D, createCylinderGeometry3D, createConeGeometry3D, createTorusGeometry3D, createCapsuleGeometry3D, createQuadGeometry3D, } from './primitives3D.js';
export { Material3D, setColor3D, createUnlitMaterial3D, createLambertMaterial3D, createPhongMaterial3D, createStandardMaterial3D, createGlassMaterial3D, createCustomShader3D, createToonMaterial3D, createMatcapMaterial3D, createSpriteMaterial3D, } from './Material3D.js';
export { Camera3D, createPerspectiveCamera3D, createOrthographicCamera3D } from './Camera3D.js';
export { Light3D, createAmbientLight3D, createHemisphereLight3D, createDirectionalLight3D, createPointLight3D, createSpotLight3D, LIGHT3D_LIMITS, } from './Light3D.js';
export { Mesh3D, InstancedMesh3D, Sprite3D, createSprite3D, Bone3D, Skeleton3D, MESH3D_LIMITS } from './Mesh3D.js';
export { AnimationClip3D, AnimationAction3D, AnimationMixer3D, createAnimationClip3D, sampleAnimationTrack3D, ANIMATION3D_LIMITS, } from './Animation3D.js';
export { Raycaster3D } from './Raycast3D.js';
export { RenderList3D } from './RenderList3D.js';
export { loadGltf3D } from './Gltf3D.js';
export { ParticleEmitter3D, createParticleEmitter3D, PARTICLES3D_LIMITS } from './Particles3D.js';
export { Lod3D, ScreenLayer3D, createScreenLayer3D, createGridGeometry3D, createAxesGeometry3D, createBoxEdgesGeometry3D, createLineMaterial3D, createGridHelper3D, createAxesHelper3D, } from './helpers3D.js';
export { isCompressedPixels3D, COMPRESSED_BLOCK_BYTES_3D } from './Texture3D.js';
export { isKtx23D, parseKtx23D } from './Ktx23D.js';
export { SCENE_DOCUMENT_FORMAT_3D, SCENE_DOCUMENT_VERSION_3D, SERIALIZE3D_LIMITS, serializeScene3D, deserializeScene3D } from './Serialize3D.js';
export { STATE_MACHINE3D_LIMITS, AnimationStateMachine3D, createAnimationStateMachine3D } from './StateMachine3D.js';
export { Joint3D } from './Physics3D.js';
export { PHYSICS3D_LIMITS, RigidBody3D, PhysicsWorld3D, CharacterController3D, createPhysicsWorld3D, createCharacterController3D } from './Physics3D.js';
export { CURVE3D_LIMITS, Curve3D, LineCurve3D, QuadraticBezierCurve3D, CubicBezierCurve3D, CatmullRomCurve3D, CurvePath3D, Path2D3D, Shape3D, signedArea2D, triangulateShape3D, } from './Curves3D.js';
export { createCircleGeometry3D, createRingGeometry3D, createTorusKnotGeometry3D, createPolyhedronGeometry3D, createTetrahedronGeometry3D, createOctahedronGeometry3D, createIcosahedronGeometry3D, createDodecahedronGeometry3D, createLatheGeometry3D, createTubeGeometry3D, createShapeGeometry3D, createExtrudeGeometry3D, createWireframeGeometry3D, createEdgesGeometry3D, toNonIndexedGeometry3D, mergeGeometries3D, mergeVertices3D, transformGeometry3D, } from './geometries3D.js';
export { computeObjectBounds3D, LineHelper3D, BoxHelper3D, ArrowHelper3D, CameraHelper3D, LightHelper3D, SkeletonHelper3D, createBoxHelper3D, createArrowHelper3D, createCameraHelper3D, createLightHelper3D, createSkeletonHelper3D, } from './debug3D.js';
export { HDR3D_LIMITS, parseRgbe3D, createCubeTextureFromEquirect3D } from './Hdr3D.js';
export { PHYSICS_MESH3D_LIMITS, TriangleMeshShape3D, createMeshShape3D } from './PhysicsMesh3D.js';
export { BATCH3D_LIMITS, BatchedMesh3D, FatLine3D, createBatchedMesh3D, createFatLine3D } from './Batch3D.js';
export { PHYSICS_HULL3D_LIMITS, ConvexHullShape3D, createConvexHullShape3D } from './PhysicsHull3D.js';
export { TEXT3D_LIMITS, Font3D, parseTypefaceFont3D, parseTrueTypeFont3D, createTextShapes3D, createTextGeometry3D } from './Text3D.js';
export { TransformGizmo3D, createTransformGizmo3D } from './Gizmo3D.js';
//# sourceMappingURL=index.js.map