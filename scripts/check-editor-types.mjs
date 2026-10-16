import { createRequire } from "node:module";
import ts from "typescript";

// Plain tsc does not execute the Next.js language-service plugin used by editors.
// Run that installed plugin as well so its diagnostics are covered by validation.
const require = createRequire(import.meta.url);
const { createTSPlugin } = require("next/dist/server/typescript/index.js");
const cwd = process.cwd();
const file = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
if (file.error)
  throw new Error(
    ts.flattenDiagnosticMessageText(file.error.messageText, "\n"),
  );
const config = ts.parseJsonConfigFileContent(file.config, ts.sys, cwd);
if (config.errors.length)
  throw new Error(
    ts.formatDiagnosticsWithColorAndContext(config.errors, {
      getCurrentDirectory: () => cwd,
      getCanonicalFileName: (f) => f,
      getNewLine: () => "\n",
    }),
  );
const host = {
  ...ts.sys,
  useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
  getCompilationSettings: () => config.options,
  getScriptFileNames: () => config.fileNames,
  getScriptVersion: () => "0",
  getScriptSnapshot: (name) => {
    const text = ts.sys.readFile(name);
    return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
  },
  getCurrentDirectory: () => cwd,
  getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
};
const service = ts.createLanguageService(host);
const plugin = createTSPlugin({ typescript: ts }).create({
  config: { name: "next" },
  languageService: service,
  languageServiceHost: host,
  project: {
    getCurrentDirectory: () => cwd,
    projectService: { logger: { info: () => {} } },
  },
});
const sources = config.fileNames.filter((name) =>
  name.startsWith(`${cwd}/src/`),
);
let count = 0;
for (const name of sources) {
  for (const d of [
    ...plugin.getSyntacticDiagnostics(name),
    ...plugin.getSemanticDiagnostics(name),
  ]) {
    count++;
    const location =
      d.file && d.start !== undefined
        ? d.file.getLineAndCharacterOfPosition(d.start)
        : null;
    console.error(
      `${name.replace(`${cwd}/`, "")}${location ? `:${location.line + 1}:${location.character + 1}` : ""} TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`,
    );
  }
}
service.dispose();
console.log(
  `Next.js editor diagnostics: ${sources.length} source files, ${count} diagnostics (TypeScript ${ts.version}).`,
);
process.exitCode = count ? 1 : 0;
