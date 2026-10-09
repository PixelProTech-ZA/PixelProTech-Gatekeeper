const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let now=0,test=false;
const fmt=()=>new Intl.DateTimeFormat('en-ZA',{timeZone:'Africa/Johannesburg',dateStyle:'short',timeStyle:'medium',hour12:false}).format(new Date())+' SAST';
const ROLES={SA:'System administrator',HR:'HR administrator',RC:'Reception',SO:'Security officer',DM:'Department manager',EM:'Employee',AU:'Auditor'};
let role='RC';
const E=[];
const A=[],V=[],AL=[],att={},locks={};let emerg=false,lastReal={};
// audit
const log=[];let chain=Promise.resolve();
async function H(s){if(window.crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}let x=5381;for(const c of s)x=((x<<5)+x+c.charCodeAt(0))>>>0;return x.toString(16).padStart(16,'0')}
const hin=(p,e)=>p+e.seq+e.ts+e.actor+e.action+e.detail;
function audit(actor,action,detail){chain=chain.then(async()=>{const prev=log.length?log[log.length-1].hash:'GENESIS';const e={seq:log.length+1,ts:new Date().toISOString(),local:fmt(),actor,action,detail,prev};e.hash=(await H(hin(prev,e))).slice(0,16);log.push(e);renderLog()})}
const rn=()=>ROLES[role];
const can=a=>({visitor:'SA RC SO',alert:'SA SO RC',manual:'SA SO RC',door:'SA SO RC'}[a]||'').split(' ').includes(role);
// status
function status(p){const fr=p.door&&now-p.door.at<=15,age=t=>Math.floor(now-t)+' min ago';
if(p.ev==='out')return['Departure confirmed','ok','clock-out '+age(p.evAt)];
if(p.ev==='in'&&fr)return['Confirmed present','ok',p.door.src+', '+age(p.door.at)];
if(p.ev==='in')return['Last recorded present','warn','clock-in '+age(p.evAt)+'; no fresh door evidence'];
if(fr)return['Unknown / discrepancy','crit','door read '+age(p.door.at)+' but no clock-in'];
return['Unknown / discrepancy','crit','no current evidence'];}
const cls=c=>`tag ${c}`;
// kiosk
let ks={step:'code',code:'',who:null};
function K(){const b=$('#kb'),t=$('#kt'),m=$('#km');
if(ks.step==='code'){t.textContent='Welcome to PixelProTech';m.textContent=ks.msg||'Enter your employee code.';
b.innerHTML='<div class="dots" aria-label="Code entered">'+[0,1,2,3].map(i=>`<i class="${i<ks.code.length?'f':''}"></i>`).join('')+'</div><div class="pad">'+[1,2,3,4,5,6,7,8,9,'Clear',0,'Enter'].map(k=>`<button class="btn ${k==='Enter'?'primary':''}" data-k="${k}">${k}</button>`).join('')+'</div><div class="row" style="justify-content:center"><button class="btn sm" data-k="visitor">I am a visitor</button><button class="btn sm" data-k="help">Ask reception for help</button></div>';}
if(ks.step==='face'){t.textContent='Identity check';m.textContent='Face verification is not connected. Reception will check your photo ID.';
b.innerHTML='<div class="cam">Camera and liveness check: NOT CONNECTED</div><div class="row" style="justify-content:center"><button class="btn primary" data-f="staff">Ask reception to verify me</button><button class="btn" data-k="reset">Cancel</button></div>';}
if(ks.step==='done'){t.textContent=ks.title;m.textContent=ks.msg;b.innerHTML='<div class="row" style="justify-content:center"><button class="btn primary" data-k="reset">Done</button></div>';}
}
function reset(msg){ks={step:'code',code:'',who:null,msg};K()}
function rej(code,why,who){A.unshift({at:fmt(),p:who?who.name:'Unrecognised code',type:'Rejected',res:why});audit('Kiosk-01','attendance.rejected',(who?who.id:'unknown')+': '+why);renderAll()}
$('#kb').addEventListener('click',e=>{const k=e.target.dataset.k,f=e.target.dataset.f;
if(k!==undefined){
if(k==='reset')return reset();if(k==='Clear'){ks.code='';return K()}
if(k==='help'){raise('warn','Visitor/employee requested reception help at kiosk','K');ks.msg='Reception has been notified. Please wait.';return K()}
if(k==='visitor'){ks.msg='Visitors: reception will check you in against your appointment.';return K()}
if(k==='Enter'){const c=ks.code;if(c.length<4){ks.msg='Enter all four digits.';return K()}
if(locks[c]&&Date.now()<locks[c]){ks={step:'done',title:'Manual verification needed',msg:'Please see reception. Staff have been alerted.'};return K()}
const p=E.find(x=>x.code===c);
if(!p||p.st!=='active'){att[c]=(att[c]||0)+1;rej(c,'code not recognised or not active',null);ks.code='';ks.msg='Code not recognised. Try again or ask reception.';if(att[c]>=3){locks[c]=Date.now()+30000;raise('crit','Repeated invalid code attempts at kiosk (3)','K')}return K()}
ks.who=p;ks.step='face';return K()}
if(ks.code.length<4)ks.code+=k;return K()}
if(f==='staff'){const p=ks.who;
if(AL.some(a=>a.ref===p.id&&a.kind==='M'&&!a.res)){ks={step:'done',title:'Already requested',msg:'Reception has your request, '+p.name.split(' ')[0]+'. Please wait.'};return K()}
raise('warn','Staff verification requested for '+p.name+' ('+p.id+'). Check photo ID.','M',p.id);
ks={step:'done',title:'Please see reception',msg:'A staff member will verify your identity and record your attendance.'};K()}});
// alerts
let aid=0;function raise(sev,msg,kind,ref){AL.unshift({id:++aid,sev,msg,kind,ref,at:fmt(),ack:null,res:null});audit('System','alert.raised',msg);renderAll()}
// visitors
const reason=()=>$('#vr').value.trim();
const vAct=(id,a)=>{if(!can('visitor'))return;const v=V.find(x=>x.id===id),r=reason();
if(a==='in'){v.state='Checked in';v.inAt=now;v.exp=now+v.dur;v.warned=false;v.phys='Presence unconfirmed (check-in only)';audit(rn(),'visit.checkin',v.id+' timer started from recorded check-in')}
if(a==='out'){v.state='Checked out';v.outAt=now;v.phys='Departure confirmed (reception checkout)';resolveAl(v.id);audit(rn(),'visit.checkout',v.id)}
if(a==='ext'){if(r.length<5){$('#vr').focus();return alert('Enter a reason of at least 5 characters to extend.')}v.exp=now+15;v.state='Checked in';v.warned=false;v.phys='Presence unconfirmed (extended)';resolveAl(v.id);audit(rn(),'visit.extended',v.id+' +15 min: '+r)}
if(a==='res'){if(r.length<5){$('#vr').focus();return alert('Enter a documented reason of at least 5 characters.')}v.state='Resolved (documented)';v.phys='Departure NOT verified; resolved by '+rn()+': '+r;resolveAl(v.id);audit(rn(),'visit.resolved',v.id+': '+r)}
renderAll()};
function resolveAl(id){AL.filter(a=>a.ref===id&&!a.res).forEach(a=>{a.res=rn()+' at '+fmt()})}
$('#va').onclick=()=>{if(!can('visitor'))return;const n=$('#vn').value.trim();const h=E.find(e=>e.id===$('#vh').value);if(!n||!h)return;const v={id:'V-00'+(V.length+1),name:n,host:h,dur:30,state:'Scheduled',inAt:null,exp:null,warned:false,phys:'Not arrived'};V.push(v);$('#vn').value='';audit(rn(),'appointment.created',v.id+' host '+h.id);renderAll()};
$('#vis').addEventListener('click',e=>{if(e.target.dataset.v)vAct(e.target.dataset.v,e.target.dataset.a)});
$('#alerts').addEventListener('click',e=>{const id=+e.target.dataset.al,a=AL.find(x=>x.id===id);if(!a||!can('alert'))return;
if(e.target.dataset.op==='ack'){a.ack=rn()+' at '+fmt();audit(rn(),'alert.acknowledged',a.msg)}
if(e.target.dataset.op==='man'&&can('manual')){const p=E.find(x=>x.id===a.ref);const ty=p.ev==='in'?'out':'in';p.ev=ty;p.evAt=now;att[p.code]=0;delete locks[p.code];a.res=rn()+' at '+fmt();A.unshift({at:fmt(),p:p.name,type:(ty==='in'?'Clock-in':'Clock-out')+' (manual)',res:'photo ID checked by '+rn()});audit(rn(),'attendance.'+ty+'.manual',p.id+' identity verified by staff')}
renderAll()});
$('#roll').addEventListener('click',e=>{const p=E.find(x=>x.id===e.target.dataset.d);if(p&&can('door')){p.door={src:'Staff observation ('+rn()+')',at:now};audit(rn(),'presence.staff_confirmed',p.id);renderAll()}});
$('#em').onclick=()=>{emerg=!emerg;audit(rn(),emerg?'rollcall.started':'rollcall.ended','');renderAll()};
// ticking
setInterval(()=>{now+=test?1:1/60;V.forEach(v=>{if(v.state==='Checked in'){const r=v.exp-now;
if(r<=5&&r>0&&!v.warned){v.warned=true;raise('warn',v.name+' ('+v.id+'): 5 minutes remaining. Tell '+v.host.name+' (automatic messaging not connected).','V',v.id)}
if(r<=0){v.state='Expired: departure unconfirmed';v.phys='UNRESOLVED: expiry does not mean departure';raise('crit',v.name+' ('+v.id+') appointment expired; departure unconfirmed. Host: '+v.host.name,'V',v.id);audit('System','visit.expired',v.id)}}});renderAll()},1000);
// render
const tbl=(h,rows)=>'<table><tr>'+h.map(x=>`<th>${x}</th>`).join('')+'</tr>'+rows.join('')+'</table>';
function renderAll(){
const dm=role==='DM',dd=$('#dmd').value.trim().toLowerCase(),roll=E.filter(p=>!dm||(dd&&p.dept.toLowerCase()===dd)),S=roll.map(status);
$('#stats').innerHTML=[['Confirmed present',S.filter(s=>s[0]==='Confirmed present').length,'ok'],['Last recorded present',S.filter(s=>s[0]==='Last recorded present').length,'warn'],['Unknown / discrepancy',S.filter(s=>s[0].startsWith('Unknown')).length,'crit'],['Visitors in building (unconfirmed)',V.filter(v=>v.state==='Checked in'||v.state.startsWith('Expired')).length,'warn'],['Overdue visits',V.filter(v=>v.state.startsWith('Expired')).length,'crit'],['Open alerts',AL.filter(a=>!a.res).length,'crit']].map(s=>`<div class="stat"><b class="${s[2]}">${s[1]}</b><span>${s[0]}</span></div>`).join('');
$('#emn').textContent=emerg?'ROLL-CALL ACTIVE: '+S.filter(s=>s[0].startsWith('Unknown')||s[0]==='Last recorded present').length+' people not confirmed':'';
$('#roll').innerHTML=!roll.length?'<p class="mu">No employees to show.</p>':tbl(['Person','Status','Source and freshness',''],roll.map(p=>{const s=status(p);return `<tr><td>${esc(p.name)}<br><span class="mu">${p.dept}${p.st!=='active'?' · '+p.st:''} · biometrics: restricted</span></td><td><span class="${cls(s[1])}">${s[0]}</span></td><td>${s[2]}</td><td>${can('door')?`<button class="btn sm" data-d="${p.id}">Confirm in person</button>`:''}</td></tr>`}));
$('#vis').innerHTML=tbl(['Visitor','Status','Timer / presence',''],V.map(v=>{const r=v.exp!==null&&v.state==='Checked in'?v.exp-now:null;const btn=(a,l)=>can('visitor')?`<button class="btn sm" data-v="${v.id}" data-a="${a}">${l}</button> `:'';
const c=v.state.startsWith('Expired')?'crit':v.state==='Checked in'?(r<=5?'warn':'ok'):'mu';
return `<tr><td>${esc(v.name)}<br><span class="mu">Host: ${esc(v.host.name)}, ${v.host.dept}</span></td><td class="${c}">${v.state}</td><td>${r!==null?Math.ceil(r)+' min left<br>':''}<span class="mu">${esc(v.phys)}</span></td><td>${v.state==='Scheduled'?btn('in','Check in'):v.state==='Checked out'||v.state.startsWith('Resolved')?'':btn('out','Check out')+btn('ext','Extend 15')+(v.state.startsWith('Expired')?btn('res','Resolve'):'')}</td></tr>`}));
$('#alerts').innerHTML=AL.length?AL.map(a=>`<div style="border-left:3px solid ${a.res?'var(--ln)':a.sev==='crit'?'var(--rd)':'var(--wn)'};padding:4px 10px;margin:8px 0"><div class="${a.res?'mu':a.sev==='crit'?'crit':'warn'}">${esc(a.msg)}</div><div class="mu">${a.at}${a.ack?' · acknowledged by '+a.ack:''}${a.res?' · resolved by '+a.res:''}</div>${!a.res&&can('alert')?`<div class="row">${a.ack?'':`<button class="btn sm" data-al="${a.id}" data-op="ack">Acknowledge</button>`}${a.kind==='M'?`<button class="btn sm" data-al="${a.id}" data-op="man">Verify manually (ID checked)</button>`:''}</div>`:''}</div>`).join(''):'<p class="mu">No alerts.</p>';
$('#att').innerHTML=tbl(['Time','Person','Type','Detail'],A.slice(0,12).map(a=>`<tr><td>${a.at}</td><td>${esc(a.p)}</td><td class="${a.type==='Rejected'?'crit':a.type==='Duplicate'||a.type==='Manual'?'warn':'ok'}">${a.type}</td><td>${a.res}</td></tr>`));
}
function renderLog(){$('#log').innerHTML=tbl(['#','Time (SAST)','Actor','Action','Detail','Hash'],log.slice(-12).reverse().map(e=>`<tr><td>${e.seq}</td><td>${e.local}</td><td>${esc(e.actor)}</td><td>${e.action}</td><td>${esc(e.detail)}</td><td class="mu">${e.hash}</td></tr>`))}
$('#ver').onclick=async()=>{let prev='GENESIS';for(const e of log){if(e.prev!==prev||(await H(hin(prev,e))).slice(0,16)!==e.hash){$('#vres').innerHTML='<span class="crit">Chain broken at entry '+e.seq+'</span>';return}prev=e.hash}$('#vres').innerHTML='<span class="ok">Chain intact: '+log.length+' entries</span>'};
$('#tam').onclick=()=>{if(log[1]){log[1].detail='(edited)';renderLog();$('#vres').textContent='Entry 2 altered. Run verify.'}};
function applyRole(){$('#dmd').classList.toggle('hide',role!=='DM');$$('[data-r]').forEach(p=>p.classList.toggle('hide',!p.dataset.r.split(' ').includes(role)));$('#nop').classList.toggle('hide',$$('[data-r]:not(.hide)').length>0);$('#rn').textContent=role==='AU'?'Read-only. Privileged roles require step-up MFA in production (not implemented here).':'';renderAll()}
$('#role').innerHTML=Object.entries(ROLES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');$('#role').value=role;$('#role').onchange=e=>{role=e.target.value;audit(rn(),'session.role_switched_demo','');applyRole()};
function fillHosts(){const s=$('#vh'),v=s.value;s.innerHTML=E.filter(e=>e.st==='active').map(e=>`<option value="${e.id}">${esc(e.name)} (${esc(e.dept)})</option>`).join('')||'<option value="">Enrol an employee first</option>';s.value=v}
$('#tm').onchange=e=>{test=e.target.checked};$('#dmd').oninput=()=>renderAll();
$('#en').onclick=()=>{if(!['SA','HR'].includes(role))return;const n=$('#enn').value.trim(),d=$('#end').value.trim();let c=$('#enc').value.trim(),m=$('#enm');
if(!c&&E.length<9999){const a=new Uint32Array(1);do{crypto.getRandomValues(a);c=String(a[0]%10000).padStart(4,'0')}while(E.some(x=>x.code===c))}
if(!n||!d||!/^\d{4}$/.test(c)){m.textContent='Enter a name, department and a 4-digit code.';return}
if(E.some(x=>x.code===c)){m.textContent='That code is already in use.';return}
const p={id:'E-'+String(1001+E.length),code:c,name:n,dept:d,st:'active',ev:null,evAt:0,door:null};E.push(p);['enn','end','enc'].forEach(i=>$('#'+i).value='');m.textContent='Enrolled '+p.name+' ('+p.id+'). Kiosk code: '+c+' (give it to them privately; note it now). Biometrics: not enrolled (adapter not connected).';audit(rn(),'employee.enrolled',p.id);fillHosts();renderAll()};
$$('nav button').forEach(b=>b.onclick=()=>{$$('nav button').forEach(x=>x.setAttribute('aria-selected',x===b));['kiosk','console','blueprint'].forEach(s=>$('#'+s).classList.toggle('hide',s!==b.dataset.t))});
audit('System','session.started','in-memory prototype session');fillHosts();K();applyRole();

if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
