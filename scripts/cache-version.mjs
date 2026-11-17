import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const hash=createHash('sha256'), path=join(root,'sw.js'), sw=readFileSync(path,'utf8');
const template=sw.replace(/const CACHE=PREFIX\+'[^']+';/,"const CACHE=PREFIX+'REVISION';");
function visit(dir){
  for(const e of readdirSync(join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){
    const name=join(dir,e.name);
    if(e.isDirectory()) visit(name);
    else hash.update(name+'\0').update(name==='sw.js'?template:readFileSync(join(root,name)));
  }
}
visit('');
const version=hash.digest('hex').slice(0,20);
const result=template.replace("PREFIX+'REVISION'","PREFIX+'"+version+"'");
if(process.argv.includes('--write')) writeFileSync(path,result);
else if(result!==sw) throw Error('Обновите офлайн-версию: node scripts/cache-version.mjs --write');
