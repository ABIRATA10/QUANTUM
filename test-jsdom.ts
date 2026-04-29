import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';

// read the latest index-*.js from dist/assets
const assetsDir = path.join(process.cwd(), 'dist/assets');
const files = fs.readdirSync(assetsDir);
const jsFile = files.find(f => f.endsWith('.js'));
if (!jsFile) throw new Error("No js file found in dist/assets");

const jsCode = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');

const virtualConsole = new VirtualConsole();
virtualConsole.on("error", (err) => {
  console.log("JSDOM Console Error:", err);
});
virtualConsole.on("jsdomError", (err) => {
  console.log("JSDOM Internal Error:", err);
});

const dom = new JSDOM('<!DOCTYPE html><html lang="en"><body><div id="root"></div></body></html>', {
  runScripts: "dangerously",
  virtualConsole
});

try {
  // simulate browser env for Vite if needed
  dom.window.eval(`
    window.__VITE_ASSETS__ = [];
  `);
  dom.window.eval(jsCode);
  console.log("Evaluated successfully without throwing a top-level error");
} catch(e) {
  console.error("DOM Error caught:", e);
}
