// Renders art-src/out/*.svg to PNG with Chromium (transparent where the SVG is). Run: node art-src/render.cjs <dir>
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
(async()=>{const dir=process.argv[2]||path.join(__dirname,'out');const files=fs.readdirSync(dir).filter(f=>f.endsWith('.svg')).filter(f=>!process.argv[3]||f.includes(process.argv[3]));
 const browser=await chromium.launch();const page=await browser.newPage();
 for(const f of files){const svg=fs.readFileSync(path.join(dir,f),'utf8');const m=svg.match(/width="(\d+)" height="(\d+)"/);const w=+m[1],h=+m[2];
  await page.setViewportSize({width:w,height:h});await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({path:path.join(dir,f.replace(/\.svg$/,'.png')),omitBackground:true,clip:{x:0,y:0,width:w,height:h}});}
 await browser.close();console.log(files.length,'rendered');})();
