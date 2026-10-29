'use strict';
/* core.js: small helpers, the icon set, money maths, SVG charts, modal and toast.
   Nothing in here knows about clients or orders. */
/* ================= CORE HELPERS ================= */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
const num=n=>Math.round(n).toLocaleString('en-IN');
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fd=iso=>{if(!iso)return '—';const[y,m,d]=iso.split('-');return `${d} ${MON[+m-1]} ${y}`;};
const longDate=iso=>{const d=new Date(iso+'T00:00:00Z');return `${DAYS[d.getUTCDay()]}, ${fd(iso)}`;};
const initials=n=>n.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const lnk=(href,t)=>`<a class="lk" href="#${href}">${e(t)}</a>`;

const ICONS={
 dashboard:'<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 package:'<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
 warehouse:'<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
 file:'<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>',
 cart:'<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
 truck:'<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
 receipt:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
 card:'<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
 check:'<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
 chart:'<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
 gear:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
 search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
 plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
 edit:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
 trash:'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
 msg:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
 mail:'<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
 phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
 down:'<path d="m6 9 6 6 6-6"/>', right:'<path d="m9 18 6-6-6-6"/>', left:'<path d="m15 18-6-6 6-6"/>',
 dots:'<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
 x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
 moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
 menu:'<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
 alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
 checkc:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
 up:'<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>', dn:'<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
 tick:'<path d="M20 6 9 17l-5-5"/>'
};
const ic=(n,s=18)=>`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||''}</svg>`;

const BADGE={Active:'ok',Delivered:'ok',Paid:'ok',Accepted:'ok','In Stock':'ok',Processing:'info',Issued:'info',Sent:'info',Scheduled:'info',Pending:'violet',Draft:'neutral',Inactive:'neutral',Expired:'neutral','Partially Fulfilled':'warn',Partial:'warn','Low Stock':'warn','In Transit':'warn',Cancelled:'err',Overdue:'err','Out of Stock':'err'};
const badge=s=>`<span class="badge b-${BADGE[s]||'neutral'}">${e(s)}</span>`;

/* money maths: line = qty x price, less discount %, plus tax % on the discounted amount */
const lineCalc=l=>{const gross=l.qty*l.price,disc=gross*(l.disc||0)/100,net=gross-disc,tax=net*(l.tax||0)/100;return{gross,disc,net,tax,total:net+tax};};
const docCalc=lines=>lines.reduce((a,l)=>{const c=lineCalc(l);a.sub+=c.gross;a.disc+=c.disc;a.net+=c.net;a.tax+=c.tax;a.total+=c.total;return a;},{sub:0,disc:0,net:0,tax:0,total:0});

/* ---------- charts (inline SVG) ---------- */
const fmtK=v=>v===0?'₹0':(v>=100?'₹'+(+(v/100).toFixed(2))+'L':'₹'+Math.round(v)+'K');
function smooth(p){let d=`M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;for(let i=0;i<p.length-1;i++){const a=p[i-1]||p[i],b=p[i],c=p[i+1],f=p[i+2]||c,t=.18;d+=` C${(b[0]+(c[0]-a[0])*t).toFixed(1)},${(b[1]+(c[1]-a[1])*t).toFixed(1)} ${(c[0]-(f[0]-b[0])*t).toFixed(1)},${(c[1]-(f[1]-b[1])*t).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;}return d;}
const CH={W:560,H:240,L:48,R:14,T:14,B:30};
function lineChart(vals,actualN){
  const{W,H,L,R,T,B}=CH,n=vals.length,max=Math.max(100,Math.ceil(Math.max(...vals)/100)*100);
  const x=i=>L+(W-L-R)*i/(n-1),y=v=>T+(H-T-B)*(1-v/max);
  const pts=vals.map((v,i)=>[x(i),y(v)]),act=pts.slice(0,actualN),fc=pts.slice(actualN-1);
  let g='';
  for(let k=0;k<=4;k++){const t=max*k/4;g+=`<line x1="${L}" x2="${W-R}" y1="${y(t)}" y2="${y(t)}" class="gl"/><text x="${L-9}" y="${y(t)+4}" class="axis" text-anchor="end">${fmtK(t)}</text>`;}
  MON.forEach((m,i)=>{g+=`<text x="${x(i)}" y="${H-8}" class="axis" text-anchor="middle">${m}</text>`;});
  const line=smooth(act),area=`${line} L${act[act.length-1][0].toFixed(1)},${y(0)} L${act[0][0].toFixed(1)},${y(0)} Z`;
  const last=act[act.length-1];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly revenue chart" id="rev-svg">
  <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--primary);stop-opacity:.26"/><stop offset="1" style="stop-color:var(--primary);stop-opacity:0"/></linearGradient></defs>
  ${g}<path d="${area}" fill="url(#ga)" class="area"/>
  ${fc.length>1?`<path d="${smooth(fc)}" class="fc"/>`:''}
  <path d="${line}" class="ln" pathLength="1"/>
  <circle cx="${last[0]}" cy="${last[1]}" r="4.5" class="pt"/>
  <line id="hv-line" class="hv" y1="${T}" y2="${H-B}" style="display:none"/><circle id="hv-dot" r="5.5" class="pt" style="display:none"/>
  <rect id="hv-hit" x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent"/></svg><div class="tip" id="hv-tip" hidden></div>`;
}
function donut(segs){
  const total=segs.reduce((a,s)=>a+s.v,0),r=66,C=2*Math.PI*r;let off=0;
  const arcs=segs.map(s=>{const len=C*s.v/total,d=Math.max(len-2.5,0);const el=`<circle cx="90" cy="90" r="${r}" fill="none" style="stroke:${s.c}" stroke-width="22" stroke-dasharray="${d.toFixed(2)} ${(C-d).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 90 90)"><title>${e(s.k)}: ${s.v}</title></circle>`;off+=len;return el;}).join('');
  return `<svg viewBox="0 0 180 180" class="donut" role="img" aria-label="Orders by status, ${total} in total">${arcs}<text x="90" y="88" text-anchor="middle" class="d-num">${total}</text><text x="90" y="107" text-anchor="middle" class="d-lbl">Total</text></svg>`;
}

/* ---------- modal + toast ---------- */
let lastFocus=null;
function openModal(title,body,foot,wide){
  lastFocus=document.activeElement;
  $('#modal').innerHTML=`<div class="overlay" data-act="modal-bg"><div class="modal${wide?' wide':''}" role="dialog" aria-modal="true" aria-labelledby="mtitle"><div class="modal-h"><h2 id="mtitle">${e(title)}</h2><button class="btn icon ghost" data-act="modal-close" aria-label="Close dialog">${ic('x')}</button></div><div class="modal-b">${body}</div>${foot?`<div class="modal-f">${foot}</div>`:''}</div></div>`;
  const f=$('#modal .modal-b input:not([disabled]),#modal .modal-b select,#modal .modal-b textarea')||$('#modal .modal-f .btn.primary')||$('#modal [data-act="modal-close"]');
  f&&f.focus();
}
function closeModal(){$('#modal').innerHTML='';if(lastFocus&&lastFocus.isConnected)lastFocus.focus();}
function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;$('#toasts').append(t);setTimeout(()=>t.remove(),3400);}
function formVals(root){const o={};$$('[name]',root||$('#modal')).forEach(el=>{o[el.name]=el.type==='checkbox'?el.checked:el.value.trim();});return o;}
