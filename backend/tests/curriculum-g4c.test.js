const test=require('node:test'),assert=require('node:assert/strict');
const {build,seal}=require('./fixtures/g4c-group-bundle'),c=require('../src/features/curriculum/services/curriculumContent.service'),imp=require('../src/features/curriculum/services/curriculumGroupImport.service'),groups=require('../src/features/curriculum/services/curriculumGroup.service');
test('four groups retain separate synthetic alternatives; public snapshots omit editorial source',()=>{
 const b=build();imp.validate(b);assert.equal(b.groups.length,4);assert.equal(b.activities.length,16);assert.equal(b.activities.filter(a=>groups.eligible(a.config)).length,14);
 for(const a of b.activities){c.validate(a.config);assert.throws(()=>c.validate(a.config,true));const pub=c.publicConfig(c.snapshot(a.config));assert.equal(pub.compound.sourceRaw,undefined);assert.equal(pub.compound.notes,undefined);assert.equal(pub.compound.units[0].itemId,undefined);assert.equal(pub.compound.units.length,5);assert.equal(pub.sourcePackage,undefined);}
});
test('checksum alone cannot authorize changed scope, source identity, units or playable media',()=>{
 const changes=[b=>b.groups[0].lesson_codes.push('L1.BT.10'),b=>b.groups[1]=b.groups[0],b=>b.activities[1]=b.activities[0],b=>b.activities[0].config.sourcePackage.activity_code='foreign',b=>b.activities[0].config.sourcePackage.workbook_sha256='0'.repeat(64),b=>b.activities[0].config.compound.groupCode=b.groups[1].group_code,b=>b.activities[0].lesson_code='L1.BT.01',b=>b.activities[0].config.tasks.pop(),b=>b.activities[0].config.tasks.reverse(),b=>b.activities[0].config.compound.units[0].itemId=b.items[1].item_id,b=>b.items[0].label='Mismatch',b=>b.items.push({...b.items[0],item_id:'G4C-unused'}),b=>b.activities[0].config.compound.model={type:'video',content:'/unapproved.mp4'},b=>b.activities[0].config.policy.ai_enabled=true,b=>b.activities[0].config.asset_ids=[1],b=>b.activities[0].assignable=false];
 for(const change of changes){const b=build();change(b);assert.throws(()=>imp.validate(seal(b)));}
 const b=build();b.items[0].label='Unsealed';assert.throws(()=>imp.validate(b),/checksum/);
});
test('compound validator binds exact prompt, source order and speaker, with explicit blocked missing roles',()=>{
 const base=build().activities.find(a=>a.activity_level==='H').config;
 const changes=[b=>b.tasks[0].prompt.content='Invented speech',b=>b.compound.units[0].order=2,b=>b.compound.units[0].speaker=null,b=>b.compound.speakers=['Unknown'],b=>b.compound.practiceSpeaker='Speaker B'];
 for(const change of changes){const config=structuredClone(base);change(config);assert.throws(()=>c.validate(config));}
 const config=structuredClone(base);config.compound.units[0].speaker=null;config.compound.units[0].blockedReason='Role pending';config.tasks[0].blockedReason='Role pending';c.validate(config);assert.equal(groups.eligible(config),false);
 const subset=structuredClone(base);subset.tasks.pop();c.validate(subset);assert.equal(groups.eligible(subset),false);assert.deepEqual(groups.selected(base,'Speaker A'),['G1:u1','G1:u3','G1:u5']);assert.throws(()=>groups.selected(base,'Unknown'));
});
