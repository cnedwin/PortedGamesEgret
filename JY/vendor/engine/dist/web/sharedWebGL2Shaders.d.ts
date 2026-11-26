import type { SharedMaterial2D } from '@egret/contracts';
export declare const sharedWebGL2LayerVertexSource = "#version 300 es\nprecision highp float;\nuniform vec2 origin, extent, viewportSize;\nout vec2 layerUV;\nconst vec2 corners[6] = vec2[6](vec2(0,0), vec2(0,1), vec2(1,0), vec2(1,0), vec2(0,1), vec2(1,1));\nvoid main() {\n    vec2 corner = corners[gl_VertexID];\n    vec2 position = (origin + extent * corner) / viewportSize;\n    gl_Position = vec4(2.0 * position.x - 1.0, 1.0 - 2.0 * position.y, 0.0, 1.0);\n    layerUV = vec2(corner.x, 1.0 - corner.y);\n}";
export declare const sharedWebGL2LayerFragmentSource = "#version 300 es\nprecision highp float;\nuniform sampler2D layerTexture;\nin vec2 layerUV;\nout vec4 color;\nvoid main() { color = texture(layerTexture, layerUV); }";
export declare const sharedWebGL2LayerEffectFragmentSource = "#version 300 es\nprecision highp float;\nuniform sampler2D layerTexture;\nuniform vec2 viewportSize, effectMin, effectMax, multiplyRG, multiplyBAddR, addGB;\nin vec2 layerUV;\nout vec4 color;\nvoid main() {\n    color = texture(layerTexture, layerUV);\n    vec2 center = vec2(gl_FragCoord.x, viewportSize.y - gl_FragCoord.y);\n    if (all(greaterThanEqual(center, effectMin)) && all(lessThan(center, effectMax))) {\n        vec3 scale = vec3(multiplyRG, multiplyBAddR.x);\n        vec3 add = vec3(multiplyBAddR.y, addGB);\n        // Add light in linear premultiplied space and preserve coverage.\n        color.rgb = min(color.rgb * scale + color.a * add, vec3(color.a));\n    }\n}";
/**
 * Native objects, compilation, linking and all state remain owned by the Host.
 * The vertex stage of a sampled draw reads its region from the bound window of the region table and
 * hands it to every fragment of the triangle unchanged.
 */
export declare const sharedWebGL2VertexSource = "#version 300 es\nprecision highp float;\nprecision highp int;\nlayout(std140) uniform DrawUniform {\n    vec4 viewport;\n    vec4 materialLight;\n    vec4 materialDark;\n    uvec4 pageUnits0;\n    uvec4 pageUnits1;\n    uvec4 domain;\n    uvec4 samplerPolicy;\n    uvec4 pageExecution;\n};\n\nlayout(std140) uniform RegionWindow {\n    uvec4 regions[1023];\n};\n\nlayout(location = 0) in vec2 position;\nlayout(location = 1) in vec2 uv;\nlayout(location = 2) in vec4 light;\nlayout(location = 3) in vec3 dark;\nlayout(location = 4) in vec2 slotOpacity;\nout vec2 vertexUV;\nout vec4 vertexLight;\nout vec3 vertexDark;\nflat out float drawOpacity;\nflat out uvec4 logicalTrim;\nflat out uvec4 contentOrigin;\nflat out uint quarterTurn;\n// The texture unit that holds the page of the region, and the page's width and height.\nflat out uvec3 pageOfRegion;\nvoid main() {\n    // Prepared positions use top-left backing pixels; the GL viewport starts at (0, 0).\n    gl_Position = vec4(2.0 * position.x / viewport.x - 1.0,\n        1.0 - 2.0 * position.y / viewport.y, 0.0, 1.0);\n    vertexUV = uv;\n    vertexLight = light;\n    vertexDark = dark;\n    drawOpacity = slotOpacity.y;\n\n    int row = 3 * int(slotOpacity.x);\n    logicalTrim = regions[row];\n    contentOrigin = regions[row + 1];\n    uvec4 last = regions[row + 2];\n    quarterTurn = last.x;\n    uint unit = 0u;\n    for (int i = 1; i < 4; i++) { if (pageUnits0[i] == last.y) { unit = uint(i); } }\n    for (int i = 0; i < 4; i++) { if (pageUnits1[i] == last.y) { unit = uint(i + 4); } }\n    pageOfRegion = uvec3(unit, last.zw);\n}\n";
/** A draw without a region has no region table to read. */
export declare const sharedWebGL2SolidVertexSource = "#version 300 es\nprecision highp float;\nprecision highp int;\nlayout(std140) uniform DrawUniform {\n    vec4 viewport;\n    vec4 materialLight;\n    vec4 materialDark;\n    uvec4 pageUnits0;\n    uvec4 pageUnits1;\n    uvec4 domain;\n    uvec4 samplerPolicy;\n    uvec4 pageExecution;\n};\n\nlayout(location = 0) in vec2 position;\nlayout(location = 1) in vec2 uv;\nlayout(location = 2) in vec4 light;\nlayout(location = 3) in vec3 dark;\nlayout(location = 4) in vec2 slotOpacity;\nout vec2 vertexUV;\nout vec4 vertexLight;\nout vec3 vertexDark;\nflat out float drawOpacity;\nvoid main() {\n    // Prepared positions use top-left backing pixels; the GL viewport starts at (0, 0).\n    gl_Position = vec4(2.0 * position.x / viewport.x - 1.0,\n        1.0 - 2.0 * position.y / viewport.y, 0.0, 1.0);\n    vertexUV = uv;\n    vertexLight = light;\n    vertexDark = dark;\n    drawOpacity = slotOpacity.y;\n\n}\n";
/** The fragment stage of a draw without a region, for a target that mixes light or one that mixes codes. */
export declare const sharedWebGL2SolidFragment: (srgb: boolean) => string;
export declare const sharedWebGL2SolidFragmentSource: string;
/**
 * The fragment stage of a sampled draw. The program of a batch of one page has one page sampler and reads it
 * directly; the program of a batch of several pages has eight and selects by the unit of the region's page.
 */
/** The fragment stage of a sampled draw, of one page or several, for a target that mixes light or codes. */
export declare const sampledFragmentSource: (paged: boolean, srgb: boolean) => string;
export declare const sharedWebGL2FragmentSource: string;
export declare const sharedWebGL2PagedFragmentSource: string;
export declare const sharedWebGL2ResolveVertexSource = "#version 300 es\nprecision highp float;\nprecision highp int;\nvoid main() {\n    vec2 position = gl_VertexID == 0 ? vec2(-1.0, -1.0) :\n        (gl_VertexID == 1 ? vec2(3.0, -1.0) : vec2(-1.0, 3.0));\n    gl_Position = vec4(position, 0.0, 1.0);\n}\n";
/**
 * Writes the working target to the canvas as it stores colour there: light encoded at the end, or, for a target
 * that mixes codes, the codes as they are.
 */
export declare const sharedWebGL2ResolveFragment: (srgb: boolean) => string;
export declare const sharedWebGL2ResolveFragmentSource: string;
/** FUNC_ADD for RGB and alpha; admission separately restricts add-preserve to opaque output. */
export declare function sharedWebGL2BlendFactors(blend: SharedMaterial2D['blend']): readonly [number, number, number, number];
//# sourceMappingURL=sharedWebGL2Shaders.d.ts.map