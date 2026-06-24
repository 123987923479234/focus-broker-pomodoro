const fs = require('node:fs');
const path = require('node:path');

const viteConfigPath = path.join(process.cwd(), 'node_modules', 'vite', 'dist', 'node', 'chunks', 'config.js');
if (!fs.existsSync(viteConfigPath)) {
  process.exit(0);
}

let text = fs.readFileSync(viteConfigPath, 'utf8');

const netUseOriginal = `\texec("net use", (error$1, stdout) => {\n\t\tif (error$1) return;\n\t\tconst lines = stdout.split("\\n");\n\t\tfor (const line of lines) {\n\t\t\tconst m = parseNetUseRE.exec(line);\n\t\t\tif (m) windowsNetworkMap.set(m[2], m[1]);\n\t\t}\n\t\tif (windowsNetworkMap.size === 0) safeRealpathSync = fs.realpathSync.native;\n\t\telse safeRealpathSync = windowsMappedRealpathSync;\n\t});`;
const netUsePatched = `\ttry {\n\t\texec("net use", (error$1, stdout) => {\n\t\t\tif (error$1) return;\n\t\t\tconst lines = stdout.split("\\n");\n\t\t\tfor (const line of lines) {\n\t\t\t\tconst m = parseNetUseRE.exec(line);\n\t\t\t\tif (m) windowsNetworkMap.set(m[2], m[1]);\n\t\t\t}\n\t\t\tif (windowsNetworkMap.size === 0) safeRealpathSync = fs.realpathSync.native;\n\t\t\telse safeRealpathSync = windowsMappedRealpathSync;\n\t\t});\n\t} catch {\n\t\tsafeRealpathSync = fs.realpathSync;\n\t}`;

const defineOriginal = `async function replaceDefine(environment, code, id, define$1) {\n\tconst result = await transform(code, {\n\t\tloader: "js",\n\t\tcharset: (environment.config.esbuild || {}).charset,\n\t\tplatform: "neutral",\n\t\tdefine: define$1,\n\t\tsourcefile: id,\n\t\tsourcemap: environment.config.command === "build" ? !!environment.config.build.sourcemap : true\n\t});\n\tif (result.map.includes("<define:")) {\n\t\tconst originalMap = new TraceMap(result.map);\n\t\tif (originalMap.sources.length >= 2) {\n\t\t\tconst sourceIndex = originalMap.sources.indexOf(id);\n\t\t\tconst decoded = decodedMap(originalMap);\n\t\t\tdecoded.sources = [id];\n\t\t\tdecoded.mappings = decoded.mappings.map((segments) => segments.filter((segment) => {\n\t\t\t\tconst index = segment[1];\n\t\t\t\tsegment[1] = 0;\n\t\t\t\treturn index === sourceIndex;\n\t\t\t}));\n\t\t\tresult.map = JSON.stringify(encodedMap(new TraceMap(decoded)));\n\t\t}\n\t}\n\treturn {\n\t\tcode: result.code,\n\t\tmap: result.map || null\n\t};\n}`;
const definePatched = (async function replaceDefine(environment, code, id, define$1) {
	let resultCode = code;
	const keys = Object.keys(define$1).sort((a, b) => b.length - a.length);
	for (const key of keys) {
		const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		resultCode = resultCode.replace(new RegExp(escaped, "g"), define$1[key]);
	}
	return { code: resultCode, map: null };
}).toString();

if (text.includes(netUseOriginal)) text = text.replace(netUseOriginal, netUsePatched);
if (text.includes(defineOriginal)) text = text.replace(defineOriginal, definePatched);

fs.writeFileSync(viteConfigPath, text);
