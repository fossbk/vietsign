#!/usr/bin/env node
// Read-only CLI. apply/rollback are service APIs for an operator-controlled runner.
const fs=require('node:fs');
const path=require('node:path');
const g3a=require('../features/curriculum/services/curriculumImport.service');
const g3b=require('../features/curriculum/services/curriculumG3bImport.service');
const help=`Usage:
  node backend/src/scripts/curriculum-import.cjs validate --package <bundle.json>
  node backend/src/scripts/curriculum-import.cjs snapshot --out <state.json>
  node backend/src/scripts/curriculum-import.cjs plan --package <bundle.json> --state <state.json> --out <diff.json> [--dependency <g3a-bundle.json>]

snapshot reads only CURRICULUM_IMPORT_DB_URL (explicit mysql:// URL; no .env/default DB).
plan and validate are offline. G3B plan requires the exact G3A package.
Output files must not exist. This CLI has no apply, rollback or publish command.
`;
function load(file){return JSON.parse(fs.readFileSync(path.resolve(file),'utf8').replace(/^\uFEFF/,''));}
function output(file,value){fs.writeFileSync(path.resolve(file),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
function importer(bundle){if(bundle.phase==='G3A')return g3a;if(bundle.phase==='G3B')return g3b;throw new Error('Only G3A/G3B packages are supported');}
function argumentsFor(argv){
 const [command,...args]=argv;if(command==='--help'||!command)return {command:'help'};
 const allowed={validate:['--package'],snapshot:['--out'],plan:['--package','--state','--out','--dependency']}[command];
 if(!allowed)throw new Error('Unsupported command; use --help');
 const options={command};
 for(let i=0;i<args.length;i+=2){if(!allowed.includes(args[i])||options[args[i]]||!args[i+1]||args[i+1].startsWith('--'))throw new Error('Invalid, duplicate or missing argument');options[args[i]]=args[i+1];}
 for(const name of allowed.filter(n=>n!=='--dependency'))if(!options[name])throw new Error(`Required argument: ${name}`);
 if(options['--out']&&fs.existsSync(path.resolve(options['--out'])))throw new Error('Output already exists; choose a new file');
 return options;
}
async function main(argv=process.argv.slice(2)){
 const options=argumentsFor(argv),command=options.command;
 if(command==='help'){console.log(help);return;}
 if(command==='snapshot'){
  const configured=process.env.CURRICULUM_IMPORT_DB_URL;if(!configured)throw new Error('CURRICULUM_IMPORT_DB_URL is required; no default DB');
  const url=new URL(configured);if(url.protocol!=='mysql:'||!url.hostname||url.pathname.length<2||url.search||url.hash)throw new Error('Expected an explicit mysql:// connection URL without query/fragment');
  const mysql=require('mysql2/promise');const db=await mysql.createConnection({host:url.hostname,port:Number(url.port)||3306,user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:decodeURIComponent(url.pathname.slice(1)),charset:'utf8mb4',timezone:'Z',supportBigNumbers:true});
  try{
   await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
   await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
   const [[target]]=await db.query('SELECT DATABASE() db,@@server_uuid server_uuid');
   const state=await g3a.readState(db);await db.commit();
   const body={schema_version:1,target,state,state_hash:g3a.hash(state)};output(options['--out'],{...body,snapshot_hash:g3a.hash(body)});
   console.log(JSON.stringify({mode:'read_only_snapshot',target,output:path.resolve(options['--out'])}));
  }finally{await db.end();}
  return;
 }
 const bundle=load(options['--package']),service=importer(bundle);service.validateBundle(bundle);
 if(command==='validate'){console.log(JSON.stringify({mode:'offline_validation',phase:bundle.phase,package_hash:bundle.package_hash,lessons:bundle.lessons.length,activities:bundle.activities.length,publication_status:'draft'}));return;}
 const {snapshot_hash,...snapshot}=load(options['--state']);
 if(snapshot.schema_version!==1||!snapshot.target?.db||!snapshot.target?.server_uuid||g3a.hash(snapshot)!==snapshot_hash||g3a.hash(snapshot.state)!==snapshot.state_hash)throw new Error('Invalid snapshot checksum/target');
 const dependency=options['--dependency']?load(options['--dependency']):undefined;
 const plan=service.plan(bundle,snapshot.state,dependency);
 const envelope={schema_version:1,target:snapshot.target,snapshot_hash,plan};
 output(options['--out'],{...envelope,review_hash:g3a.hash(envelope)});
 console.log(JSON.stringify({mode:'offline_diff_no_database_writes',target:snapshot.target,phase:bundle.phase,...plan.summary,output:path.resolve(options['--out'])}));
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={main,argumentsFor};
