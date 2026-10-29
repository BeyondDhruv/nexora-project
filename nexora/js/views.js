'use strict';
/* views.js: UI state (S), route table, and one function per screen that returns an HTML string.
   To add a page: write a vSomething() here, add it to VIEWS at the bottom and to NAV. */
/* ================= STATE + ROUTER ================= */
const S={route:{name:'dashboard',id:null,q:{}},ui:{},qf:null,feedAll:false,revRange:'This Year',anim:false,clTab:'overview',soTab:'overview',menu:null,setTab:'profile'};
const UIDEF={clients:()=>({tab:'All',q:'',page:1}),products:()=>({cat:'All',q:'',page:1}),inventory:()=>({cat:'All',st:'All',q:'',page:1}),
  quotations:()=>({tab:'All',q:'',page:1}),orders:()=>({tab:'All',q:'',page:1}),deliveries:()=>({tab:'All',q:'',page:1}),
  invoices:()=>({tab:'All',q:'',page:1}),payments:()=>({q:'',page:1}),tasks:()=>({tab:'Open'})};
const NAV=[['dashboard','Dashboard','dashboard'],['clients','Clients','users'],['products','Products','package'],['inventory','Inventory','warehouse'],['quotations','Quotations','file'],['orders','Sales Orders','cart'],['deliveries','Deliveries','truck'],['invoices','Invoices','receipt'],['payments','Payments','card'],['tasks','Tasks','check'],['reports','Reports','chart'],['settings','Settings','gear']];
const TITLES=Object.fromEntries(NAV.map(n=>[n[0],n[1]]));
const parseHash=h=>{const[p,qs]=(h||'/dashboard').split('?'),s=p.split('/').filter(Boolean);return{name:s[0]||'dashboard',id:s[1]||null,q:Object.fromEntries(new URLSearchParams(qs||''))};};

/* ================= SHARED BUILDERS ================= */
const head=({crumbs=[],title,badge:b='',meta='',actions=''})=>`<div class="head">${crumbs.length?`<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map(c=>c.href?`<a href="#${c.href}">${e(c.t)}</a>`:`<span aria-current="page">${e(c.t)}</span>`).join(ic('right',14))}</nav>`:''}<div class="head-r"><div><h1>${e(title)}${b}</h1>${meta?`<p class="meta">${meta}</p>`:''}</div><div class="acts">${actions}</div></div></div>`;
const tabsHtml=(key,list,active,act='tab')=>`<div class="tabs" role="tablist">${list.map(([v,label,n])=>`<button class="tab" role="tab" aria-selected="${v===active}" data-act="${act}" data-key="${key}" data-val="${e(v)}">${e(label||v)}${n!=null?`<span class="n">(${n})</span>`:''}</button>`).join('')}</div>`;
const heads=cols=>cols.map(c=>Array.isArray(c)?`<th scope="col" class="${c[1]}">${c[0]}</th>`:`<th scope="col">${c}</th>`).join('');
const tw=(cols,rows,cls='')=>`<div class="tbl-wrap"><table class="${cls}"><thead><tr>${heads(cols)}</tr></thead><tbody>${rows}</tbody></table></div>`;
const empty=(t,s='',a='')=>`<div class="empty"><b>${t}</b>${s}${a?`<div>${a}</div>`:''}</div>`;
const PAGE=10;
const paged=(arr,page)=>arr.slice((page-1)*PAGE,page*PAGE);
function pager(key,total,page){
  if(!total)return '';const pages=Math.ceil(total/PAGE);if(pages<=1)return `<div class="pager"><span>Showing ${total} of ${num(total)}</span></div>`;
  const from=(page-1)*PAGE+1,to=Math.min(total,page*PAGE);let b='',last=0;
  for(let p=1;p<=pages;p++)if(p===1||p===pages||Math.abs(p-page)<=1){if(p-last>1)b+='<span class="gap">…</span>';b+=`<button class="pg" data-act="page" data-key="${key}" data-val="${p}"${p===page?' aria-current="page"':''} aria-label="Page ${p}">${p}</button>`;last=p;}
  return `<div class="pager"><span>Showing ${from}–${to} of ${num(total)}</span><div class="pgs"><button class="pg" data-act="page" data-key="${key}" data-val="${page-1}"${page<=1?' disabled':''} aria-label="Previous page">${ic('left',16)}</button>${b}<button class="pg" data-act="page" data-key="${key}" data-val="${page+1}"${page>=pages?' disabled':''} aria-label="Next page">${ic('right',16)}</button></div></div>`;
}
const searchBox=(key,ph,val)=>`<div class="search">${ic('search',16)}<input type="search" data-ui="${key}.q" placeholder="${e(ph)}" value="${e(val)}" aria-label="${e(ph)}"></div>`;
const notFound=w=>`${head({title:w+' not found'})}<div class="card">${empty('We couldn\'t find that record','It may have been removed, or the link is out of date.',`<a class="btn primary" href="#/dashboard">Back to dashboard</a>`)}</div>`;
const has=(hay,q)=>!q||hay.toLowerCase().includes(q.trim().toLowerCase());
const menuBtn=(id,items)=>`<div class="popwrap"><button class="btn icon" data-pop="${id}" aria-label="More actions" aria-haspopup="true">${ic('dots')}</button><div class="pop" id="${id}" hidden style="min-width:200px">${items}</div></div>`;

/* ================= DASHBOARD ================= */
function vDashboard(){
  const cur=S.revRange==='This Year',vals=cur?DB.rev.cur:DB.rev.prev,ytd=DB.rev.cur.slice(0,9).reduce((a,b)=>a+b,0)*1000,full=DB.rev.prev.reduce((a,b)=>a+b,0)*1000;
  const openQ=DB.quotes.filter(q=>q.status==='Draft'||q.status==='Sent').length;
  const K=[['Total Clients',num(DB.clients.length),'users','vio','up','12%',1,'/clients'],['Open Quotations',openQ,'file','warn','dn','6%',0,'/quotations'],['Confirmed Orders',DB.orders.length,'cart','info','up','24%',1,'/orders'],['Outstanding Invoices',inr(DB.kpi.outstanding),'receipt','err','up','8%',0,'/invoices']];
  const SEG=[['Pending','--c1'],['Processing','--c2'],['Partially Fulfilled','--c3'],['Delivered','--c4'],['Cancelled','--c5']].map(([k,c])=>({k,c:`var(${c})`,v:DB.orders.filter(o=>o.status===k).length}));
  const low=DB.products.filter(p=>p.stock<=p.reorder).sort((a,b)=>a.stock/a.reorder-b.stock/b.reorder).slice(0,5);
  const feed=DB.feed.slice(0,S.feedAll?DB.feed.length:4);
  return `<div class="head"><div class="head-r"><div class="hello"><h1>Good morning, Rahul <span aria-hidden="true">👋</span></h1><p>Here's what's happening with your business today.</p></div><p class="meta" style="margin:0">${longDate(TODAY)}</p></div></div>
  <div class="kpis">${K.map(k=>`<a class="kpi" href="#${k[7]}"><div class="kpi-top"><span>${k[0]}</span><span class="chip ${k[3]}">${ic(k[2],18)}</span></div><div class="kpi-v">${k[1]}</div><span class="delta ${k[6]?'good':'bad'}">${ic(k[4],14)}${k[5]}</span></a>`).join('')}</div>
  <div class="g2">
    <section class="card" aria-labelledby="rev-h"><div class="card-h"><h3 id="rev-h">Revenue</h3><select data-ui="dash.range" aria-label="Revenue period" style="width:auto;height:32px"><option${cur?' selected':''}>This Year</option><option${cur?'':' selected'}>Last Year</option></select></div>
      <div style="margin-bottom:12px"><span class="big">${inr(cur?ytd:full)}</span> ${cur?`<span class="delta good" style="margin-left:6px">${ic('up',14)}16% vs last year</span>`:`<span class="sub" style="margin-left:6px">full year 2023</span>`}</div>
      <div class="chart-wrap${S.anim?'':' anim'}" id="rev-wrap">${lineChart(vals,cur?9:12)}</div>
      ${cur?`<p class="sub" style="margin-top:8px">Solid line is revenue to date. Dotted line is the forecast for Oct–Dec.</p>`:''}</section>
    <section class="card" aria-labelledby="os-h"><div class="card-h"><h3 id="os-h">Order Status</h3></div>
      <div class="donut-row">${donut(SEG)}<ul class="legend">${SEG.map(s=>`<li><a href="#/orders?tab=${encodeURIComponent(s.k)}"><i style="background:${s.c}"></i>${e(s.k)}<b>${s.v}</b></a></li>`).join('')}</ul></div></section>
  </div>
  <div class="gb">
    <section class="card" aria-labelledby="ra-h"><div class="card-h"><h3 id="ra-h">Recent Activities</h3><button class="link" data-act="feed-toggle">${S.feedAll?'Show less':'View all'}</button></div>
      <ul class="feed">${feed.map(f=>`<li><span class="chip ${f.tone}">${ic(f.icon,16)}</span><div><p>${f.html}</p><small>${e(f.time)}</small></div></li>`).join('')}</ul></section>
    <section class="card flush" aria-labelledby="ls-h"><div class="card-h pad"><h3 id="ls-h">Low Stock Products</h3><a class="link" href="#/inventory?st=Needs%20reorder">View all</a></div>
      ${low.length?tw(['Product','SKU',['Current','num'],['Reorder Level','num']],low.map(p=>`<tr class="click" data-href="/inventory?st=Needs%20reorder"><td class="strong">${e(p.name)}</td><td>${e(p.sku)}</td><td class="num red">${num(p.stock)}</td><td class="num">${num(p.reorder)}</td></tr>`).join('')):empty('Nothing is running low','Every product is above its reorder level.')}</section>
  </div>`;
}
function bindChart(){
  const svg=$('#rev-svg');if(!svg)return;const{W,H,L,R,T,B}=CH,vals=S.revRange==='This Year'?DB.rev.cur:DB.rev.prev,n=vals.length,act=S.revRange==='This Year'?9:12,max=Math.max(100,Math.ceil(Math.max(...vals)/100)*100);
  const hit=$('#hv-hit'),line=$('#hv-line'),dot=$('#hv-dot'),tip=$('#hv-tip');
  const move=ev=>{const r=svg.getBoundingClientRect(),cx=(ev.touches?ev.touches[0].clientX:ev.clientX),vx=(cx-r.left)/r.width*W;
    const i=Math.max(0,Math.min(n-1,Math.round((vx-L)/(W-L-R)*(n-1)))),x=L+(W-L-R)*i/(n-1),y=T+(H-T-B)*(1-vals[i]/max);
    line.setAttribute('x1',x);line.setAttribute('x2',x);line.style.display='';dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.style.display='';
    tip.hidden=false;tip.style.left=(x/W*r.width)+'px';tip.style.top=(y/H*r.height)+'px';
    tip.innerHTML=`<b>${MON[i]} ${S.revRange==='This Year'?2024:2023}</b> · ${inr(vals[i]*1000)}${i>=act?' (forecast)':i===8&&act===9?' (to date)':''}`;};
  const out=()=>{line.style.display='none';dot.style.display='none';tip.hidden=true;};
  hit.addEventListener('mousemove',move);hit.addEventListener('touchmove',move,{passive:true});hit.addEventListener('mouseleave',out);hit.addEventListener('touchend',out);
}

/* ================= CLIENTS ================= */
const filteredClients=()=>{const u=S.ui.clients;return DB.clients.filter(c=>(u.tab==='All'||c.status===u.tab)&&has(c.legal+c.trade+c.id+c.city,u.q));};
function tblClients(){const u=S.ui.clients,all=filteredClients();
  if(!all.length)return empty('No clients match','Try a different name, code or city.');
  return tw(['Client','Industry','City','Payment Terms',['Outstanding','num'],'Status'],paged(all,u.page).map(c=>`<tr class="click" data-href="/clients/${c.id}"><td><a class="lk strong" href="#/clients/${c.id}">${e(c.legal)}</a><div class="sub">${c.id}</div></td><td>${e(c.industry)}</td><td>${e(c.city)}</td><td>${e(c.terms)}</td><td class="num">${inr(c.outstanding)}</td><td>${badge(c.status)}</td></tr>`).join(''))+pager('clients',all.length,u.page);}
function vClients(){const u=S.ui.clients,cnt=t=>DB.clients.filter(c=>t==='All'||c.status===t).length;
  return `${head({title:'Clients',meta:`${num(DB.clients.length)} clients in your network`,actions:`<button class="btn primary" data-act="client-new">${ic('plus',16)} Add client</button>`})}
  <div class="card flush">${tabsHtml('clients',[['All','All',cnt('All')],['Active','Active',cnt('Active')],['Inactive','Inactive',cnt('Inactive')]],u.tab)}
  <div class="toolbar">${searchBox('clients','Search by name, code or city',u.q)}</div><div id="tbl">${tblClients()}</div></div>`;}

const clientEvents=cid=>{const ev=[];
  DB.orders.filter(o=>o.clientId===cid).forEach(o=>ev.push({date:o.date,html:`Sales Order ${lnk('/orders/'+o.id,o.id)} created`}));
  DB.quotes.filter(q=>q.clientId===cid&&q.status!=='Draft').forEach(q=>ev.push({date:q.acceptedOn||q.date,html:`Quotation ${lnk('/quotations',q.id)} ${q.status==='Accepted'?'accepted':q.status==='Expired'?'expired':'sent'}`}));
  DB.invoices.filter(i=>i.clientId===cid&&i.status!=='Draft').forEach(i=>ev.push({date:i.issue,html:`Invoice ${lnk('/invoices',i.id)} generated`}));
  DB.payments.filter(p=>p.clientId===cid).forEach(p=>ev.push({date:p.date,html:`Payment of ${inr(p.amount)} received`}));
  (cby(cid).events||[]).forEach(x=>ev.push(x));
  return ev.sort((a,b)=>b.date.localeCompare(a.date));};
const orderRow=(o,cols)=>{const t=orderTotals(o).total;return `<tr class="click" data-href="/orders/${o.id}"><td>${lnk('/orders/'+o.id,o.id)}</td>${cols==='full'?`<td>${e(cn(o.clientId))}</td>`:''}<td>${fd(o.date)}</td><td>${badge(o.status)}</td><td class="num">${inr(t)}</td></tr>`;};
const invRow=i=>`<tr class="click" data-act="inv-view" data-id="${i.id}"><td class="strong">${i.id}</td><td>${fd(i.issue)}</td><td>${fd(i.due)}</td><td>${badge(i.status)}</td><td class="num">${inr(i.amount)}</td><td class="num">${inr(i.amount-i.paid)}</td></tr>`;

function vClient(id){
  const c=cby(id);if(!c)return notFound('Client');const tab=S.clTab,orders=DB.orders.filter(o=>o.clientId===id),ev=clientEvents(id);
  const TABS=[['overview','Overview'],['contacts','Contacts'],['addresses','Addresses'],['price','Price List'],['orders','Orders'],['invoices','Invoices'],['payments','Payments'],['activity','Activity']];
  const menu=menuBtn('cl-menu',`<a href="#" data-act="client-toggle" data-id="${id}">${c.status==='Active'?'Mark as inactive':'Mark as active'}</a>`);
  let body='';
  if(tab==='overview')body=`<div class="gc">
    <section class="card"><div class="card-h"><h3>Company Information</h3></div><dl class="dl"><dt>Legal Name</dt><dd>${e(c.legal)}</dd><dt>Trade Name</dt><dd>${e(c.trade)}</dd><dt>Email</dt><dd><a class="lk" href="mailto:${e(c.email)}">${e(c.email)}</a></dd><dt>Phone</dt><dd>${e(c.phone)}</dd><dt>Industry</dt><dd>${e(c.industry)}</dd><dt>Payment Terms</dt><dd>${e(c.terms)}</dd><dt>Credit Limit</dt><dd>${inr(c.credit)}</dd><dt>Outstanding</dt><dd>${inr(c.outstanding)}</dd><dt>Available Credit</dt><dd>${inr(Math.max(0,c.credit-c.outstanding))}</dd></dl></section>
    <section class="card"><div class="card-h"><h3>Primary Contact</h3></div><div style="display:flex;gap:12px;align-items:center;margin-bottom:16px"><span class="avatar lg" aria-hidden="true">${e(initials(c.contact.name))}</span><div><div class="strong">${e(c.contact.name)}</div><div class="sub">${e(c.contact.role)}</div></div></div>
      <p style="display:flex;gap:10px;align-items:center;margin-bottom:10px;color:var(--text-2)">${ic('mail',16)}<a class="lk" href="mailto:${e(c.contact.email)}">${e(c.contact.email)}</a></p><p style="display:flex;gap:10px;align-items:center;margin-bottom:18px;color:var(--text-2)">${ic('phone',16)}${e(c.contact.phone)}</p>
      <button class="btn" data-act="client-msg" data-id="${id}">${ic('msg',16)} Message</button></section>
    <div class="stack"><section class="card"><div class="card-h"><h3>Billing Address</h3></div><p class="addr">${c.billing.map(e).join('<br>')}</p></section><section class="card"><div class="card-h"><h3>Delivery Address</h3></div><p class="addr">${c.delivery.map(e).join('<br>')}</p></section></div></div>
    <div class="ge"><section class="card"><div class="card-h"><h3>Recent Activity</h3><button class="link" data-act="dtab" data-key="clTab" data-val="activity">View all</button></div>
      ${ev.length?`<ul class="tl" style="margin:0">${ev.slice(0,5).map(x=>`<li><time>${fd(x.date)}</time><span>${x.html}</span></li>`).join('')}</ul>`:empty('No activity yet','Orders, invoices and payments will show up here.')}</section>
    <section class="card flush"><div class="card-h pad"><h3>Client Orders</h3><button class="link" data-act="dtab" data-key="clTab" data-val="orders">View all</button></div>
      ${orders.length?tw(['Order No.','Date','Status',['Amount','num']],orders.slice(0,5).map(o=>orderRow(o)).join('')):empty('No orders yet','Create a quotation to get started.')}</section></div>`;
  else if(tab==='contacts'){const all=[{...c.contact,primary:1},...c.others];body=`<section class="card flush"><div class="card-h pad"><h3>Contacts</h3><button class="btn sm" data-act="contact-new" data-id="${id}">${ic('plus',14)} Add contact</button></div>${tw(['Name','Role','Email','Phone'],all.map(p=>`<tr><td class="strong">${e(p.name)} ${p.primary?'<span class="badge b-info" style="margin-left:6px">Primary</span>':''}</td><td>${e(p.role)}</td><td><a class="lk" href="mailto:${e(p.email)}">${e(p.email)}</a></td><td>${e(p.phone)}</td></tr>`).join(''))}</section>`;}
  else if(tab==='addresses')body=`<div class="gh"><section class="card"><div class="card-h"><h3>Billing Address</h3></div><p class="addr">${c.billing.map(e).join('<br>')}</p></section><section class="card"><div class="card-h"><h3>Delivery Address</h3></div><p class="addr">${c.delivery.map(e).join('<br>')}</p></section></div>`;
  else if(tab==='price')body=`<section class="card flush"><div class="card-h pad"><h3>Price List</h3><span class="sub">Discounts are applied automatically on new quotations</span></div>${tw(['Product','SKU',['List Price','num'],['Discount','num'],['Client Price','num']],DB.products.map(p=>{const d=priceDisc(id,p.sku);return `<tr><td class="strong">${e(p.name)}</td><td>${e(p.sku)}</td><td class="num">${inr(p.price)}</td><td class="num">${d?d+'%':'—'}</td><td class="num strong">${inr(p.price*(1-d/100))}</td></tr>`;}).join(''))}</section>`;
  else if(tab==='orders')body=`<section class="card flush">${orders.length?tw(['Order No.','Date','Status',['Amount','num']],orders.map(o=>orderRow(o)).join('')):empty('No orders yet')}</section>`;
  else if(tab==='invoices'){const l=DB.invoices.filter(i=>i.clientId===id);body=`<section class="card flush">${l.length?tw(['Invoice','Issued','Due','Status',['Amount','num'],['Balance','num']],l.map(invRow).join('')):empty('No invoices yet')}</section>`;}
  else if(tab==='payments'){const l=DB.payments.filter(p=>p.clientId===id);body=`<section class="card flush">${l.length?tw(['Payment','Invoice','Date','Method',['Amount','num']],l.map(p=>`<tr><td class="strong">${p.id}</td><td>${p.invoiceId}</td><td>${fd(p.date)}</td><td>${e(p.method)}</td><td class="num">${inr(p.amount)}</td></tr>`).join('')):empty('No payments yet')}</section>`;}
  else body=`<section class="card flush"><div class="card-h pad"><h3>Activity</h3></div>${ev.length?`<ul class="tl wide">${ev.map(x=>`<li><time>${fd(x.date)}</time><span>${x.html}</span></li>`).join('')}</ul>`:empty('No activity yet')}</section>`;
  return `${head({crumbs:[{t:'Clients',href:'/clients'},{t:c.trade}],title:c.legal,badge:badge(c.status),meta:`<span>Client Code: ${c.id}</span><span>GST: ${e(c.gst)}</span><span>Industry: ${e(c.industry)}</span>`,
    actions:`<button class="btn" data-act="client-edit" data-id="${id}">${ic('edit',15)} Edit</button><a class="btn primary" href="#/quotations/new?client=${id}">${ic('plus',15)} Create Quotation</a>${menu}`})}
  <div class="card flush" style="margin-bottom:16px">${tabsHtml('clTab',TABS,tab,'dtab')}</div>${body}`;
}

/* ================= PRODUCTS + INVENTORY ================= */
const cats=()=>[...new Set(DB.products.map(p=>p.cat))].sort();
const catSelect=(key,val)=>`<select data-ui="${key}.cat" aria-label="Category"><option value="All">All Categories</option>${cats().map(c=>`<option${c===val?' selected':''}>${e(c)}</option>`).join('')}</select>`;
function tblProducts(){const u=S.ui.products,all=DB.products.filter(p=>(u.cat==='All'||p.cat===u.cat)&&has(p.name+p.sku,u.q));
  if(!all.length)return empty('No products match','Try another name or SKU.');
  return tw(['Product','SKU','Category',['Unit Price','num'],['GST','num'],['In Stock','num'],''],paged(all,u.page).map(p=>`<tr><td class="strong">${e(p.name)}</td><td>${e(p.sku)}</td><td>${e(p.cat)}</td><td class="num">${inr(p.price)}</td><td class="num">${p.tax}%</td><td class="num">${num(p.stock)}</td><td class="num"><button class="btn sm" data-act="prod-edit" data-sku="${e(p.sku)}">${ic('edit',14)} Edit</button></td></tr>`).join(''))+pager('products',all.length,u.page);}
function vProducts(){const u=S.ui.products;return `${head({title:'Products',meta:`${DB.products.length} products across ${cats().length} categories`,actions:`<button class="btn primary" data-act="prod-new">${ic('plus',16)} Add Product</button>`})}
  <div class="card flush"><div class="toolbar">${catSelect('products',u.cat)}${searchBox('products','Search products by name or SKU',u.q)}</div><div id="tbl">${tblProducts()}</div></div>`;}
function tblInventory(){const u=S.ui.inventory,all=DB.products.filter(p=>(u.cat==='All'||p.cat===u.cat)&&(u.st==='All'||(u.st==='Needs reorder'?p.stock<=p.reorder:stockStatus(p)===u.st))&&has(p.name+p.sku,u.q));
  if(!all.length)return empty('No products match','Try clearing a filter.');
  return tw(['Product','SKU','Category',['Stock','num'],['Reorder Level','num'],'Status',''],paged(all,u.page).map(p=>{const s=stockStatus(p);return `<tr><td class="strong">${e(p.name)}</td><td>${e(p.sku)}</td><td>${e(p.cat)}</td><td class="num${s!=='In Stock'?' red':''}">${num(p.stock)}</td><td class="num">${num(p.reorder)}</td><td>${badge(s)}</td><td class="num"><button class="btn sm" data-act="stock-adj" data-sku="${e(p.sku)}">Adjust</button></td></tr>`;}).join(''))+pager('inventory',all.length,u.page);}
function vInventory(){const u=S.ui.inventory,low=DB.products.filter(p=>stockStatus(p)==='Low Stock').length,out=DB.products.filter(p=>p.stock===0).length;
  return `${head({title:'Inventory',meta:`${DB.products.length} products · ${low} low on stock · ${out} out of stock`,actions:`<button class="btn primary" data-act="prod-new">${ic('plus',16)} Add Product</button>`})}
  <div class="card flush"><div class="toolbar">${catSelect('inventory',u.cat)}<select data-ui="inventory.st" aria-label="Stock status">${['All','Needs reorder','In Stock','Low Stock','Out of Stock'].map(s=>`<option value="${s}"${s===u.st?' selected':''}>${s==='All'?'All statuses':s}</option>`).join('')}</select>${searchBox('inventory','Search products',u.q)}</div><div id="tbl">${tblInventory()}</div></div>`;}

/* ================= QUOTATIONS ================= */
const qTotal=q=>docCalc(q.lines).total;
const filteredQuotes=()=>{const u=S.ui.quotations;return DB.quotes.filter(q=>(u.tab==='All'||q.status===u.tab)&&has(q.id+cn(q.clientId)+q.ref,u.q));};
function tblQuotes(){const u=S.ui.quotations,all=filteredQuotes();if(!all.length)return empty('No quotations match','Try another tab or search.');
  return tw(['Quotation','Client','Date','Valid Till','Status',['Amount','num']],paged(all,u.page).map(q=>`<tr class="click" data-act="quote-view" data-id="${q.id}"><td class="strong">${q.id}${q.ref?`<div class="sub">Ref ${e(q.ref)}</div>`:''}</td><td>${e(cn(q.clientId))}</td><td>${fd(q.date)}</td><td>${fd(q.valid)}</td><td>${badge(q.status)}</td><td class="num">${inr(qTotal(q))}</td></tr>`).join(''))+pager('quotations',all.length,u.page);}
function vQuotations(){const u=S.ui.quotations,cnt=t=>DB.quotes.filter(q=>t==='All'||q.status===t).length;
  return `${head({title:'Quotations',meta:`${DB.quotes.filter(q=>q.status==='Draft'||q.status==='Sent').length} open quotations`,actions:`<a class="btn primary" href="#/quotations/new">${ic('plus',16)} New quotation</a>`})}
  <div class="card flush">${tabsHtml('quotations',['All','Draft','Sent','Accepted','Expired'].map(t=>[t,t,cnt(t)]),u.tab)}<div class="toolbar">${searchBox('quotations','Search by number, client or reference',u.q)}</div><div id="tbl">${tblQuotes()}</div></div>`;}

const newQF=cid=>({clientId:cid&&cby(cid)?cid:'',valid:addDays(TODAY,DB.settings.validity),ref:'',lines:[],terms:DB.settings.terms,notes:'',dirtyTerms:false});
function qLines(){const L=S.qf.lines;if(!L.length)return empty('No products added yet','Search by name or SKU above to add the first line.');
  return tw([['#',''],'Product','SKU',['Qty','num'],['Unit Price','num'],['Discount %','num'],['Tax %','num'],['Amount','num'],''],L.map((l,i)=>{const p=pby(l.sku),nm=e(p.name);
    const inp=(f,cls,min,step)=>`<input class="line-in ${cls}" type="number" min="${min}" ${step?`step="${step}"`:''} value="${l[f]}" data-line="${i}" data-f="${f}" aria-label="${f==='qty'?'Quantity':f==='price'?'Unit price':f==='disc'?'Discount percent':'Tax percent'} for ${nm}">`;
    return `<tr><td>${i+1}</td><td class="strong">${nm}</td><td>${e(l.sku)}</td><td class="num">${inp('qty','sm',1,1)}</td><td class="num">${inp('price','',0,'0.01')}</td><td class="num">${inp('disc','sm',0,'0.5')}</td><td class="num">${inp('tax','sm',0,'0.5')}</td><td class="num strong" id="ln-${i}">${inr(lineCalc(l).net)}</td><td class="num"><button class="btn icon ghost danger" data-act="line-del" data-i="${i}" aria-label="Remove ${nm}">${ic('trash',16)}</button></td></tr>`;}).join(''),'tight');}
function qTotals(){const t=docCalc(S.qf.lines);return `<div class="totals"><div><span>Subtotal</span><span>${inr(t.sub)}</span></div><div><span>Discount</span><span>−${inr(t.disc)}</span></div><div><span>Tax (GST)</span><span>${inr(t.tax)}</span></div><div class="t"><span>Total</span><span>${inr(t.total)}</span></div></div>`;}
function vQuoteNew(){const f=S.qf;
  return `${head({crumbs:[{t:'Quotations',href:'/quotations'},{t:'Create Quotation'}],title:'Create Quotation',actions:`<button class="btn" data-act="quote-save" data-mode="Draft">Save as Draft</button><button class="btn primary" data-act="quote-save" data-mode="Sent">${ic('file',16)} Send Quotation</button>`})}
  <div id="qerr" class="errbox" role="alert" hidden></div>
  <section class="card" style="margin-bottom:16px"><div class="qgrid">
    <div class="field"><label for="q-client">Client *</label><select id="q-client" data-q="clientId"><option value="">Select a client…</option>${DB.clients.filter(c=>c.status==='Active'||c.id===f.clientId).map(c=>`<option value="${c.id}"${c.id===f.clientId?' selected':''}>${e(c.legal)} (${c.id})</option>`).join('')}</select></div>
    <div class="field"><label for="q-valid">Valid Till *</label><input id="q-valid" type="date" data-q="valid" value="${e(f.valid)}"></div>
    <div class="field"><label for="q-ref">Reference <span class="opt">(Optional)</span></label><input id="q-ref" data-q="ref" placeholder="Enter reference" value="${e(f.ref)}"></div></div></section>
  <section class="card"><div class="card-h"><h3>Add Products</h3></div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap"><div class="psearch"><div class="search">${ic('search',16)}<input id="q-search" type="search" autocomplete="off" placeholder="Search product by name or SKU…" aria-label="Search product by name or SKU"></div><div class="pop" id="q-res" hidden></div></div><button class="btn primary" data-act="line-add-first">${ic('plus',16)} Add Product</button></div>
    <div id="q-lines">${qLines()}</div><div id="q-totals">${qTotals()}</div></section>
  <div class="gh" style="margin-top:16px"><div class="field"><label for="q-terms">Terms &amp; Conditions</label><textarea id="q-terms" rows="5" data-q="terms">${e(f.terms)}</textarea></div><div class="field"><label for="q-notes">Notes <span class="opt">(Optional)</span></label><textarea id="q-notes" rows="5" data-q="notes" placeholder="Enter any additional notes…">${e(f.notes)}</textarea></div></div>`;}

/* ================= SALES ORDERS ================= */
const filteredOrders=()=>{const u=S.ui.orders;return DB.orders.filter(o=>(u.tab==='All'||o.status===u.tab)&&has(o.id+cn(o.clientId),u.q));};
function tblOrders(){const u=S.ui.orders,all=filteredOrders();if(!all.length)return empty('No orders match','Try another status or search.');
  return tw(['Order No.','Client','Order Date','Expected Delivery','Fulfilment','Status',['Amount','num']],paged(all,u.page).map(o=>{const p=orderPct(o);return `<tr class="click" data-href="/orders/${o.id}"><td>${lnk('/orders/'+o.id,o.id)}</td><td>${e(cn(o.clientId))}</td><td>${fd(o.date)}</td><td>${fd(o.expected)}</td><td><div class="fulfil"><div class="bar sm" role="img" aria-label="${p}% delivered"><i style="width:${p}%"></i></div><span>${p}%</span></div></td><td>${badge(o.status)}</td><td class="num">${inr(orderTotals(o).total)}</td></tr>`;}).join(''))+pager('orders',all.length,u.page);}
function vOrders(){const u=S.ui.orders,cnt=t=>DB.orders.filter(o=>t==='All'||o.status===t).length;
  return `${head({title:'Sales Orders',meta:`${DB.orders.length} orders`,actions:`<button class="btn primary" data-act="order-from-quote">${ic('plus',16)} Create from quotation</button>`})}
  <div class="card flush">${tabsHtml('orders',['All','Pending','Processing','Partially Fulfilled','Delivered','Cancelled'].map(t=>[t,t,cnt(t)]),u.tab)}<div class="toolbar">${searchBox('orders','Search by order number or client',u.q)}</div><div id="tbl">${tblOrders()}</div></div>`;}

const itemsTable=(o,full)=>{const rows=o.items.map((i,n)=>{const p=pby(i.sku),pend=i.ordered-i.delivered;return `<tr><td>${n+1}</td><td class="strong">${e(p.name)}</td><td>${e(i.sku)}</td><td class="num">${num(i.ordered)}</td><td class="num">${num(i.delivered)}</td><td class="num${pend?' red':''}">${num(pend)}</td><td class="num">${inr(i.price)}</td>${full?`<td class="num">${i.tax}%</td>`:''}<td class="num">${inr(i.ordered*i.price*(full?1+i.tax/100:1))}</td></tr>`;}).join('');
  return tw(['#','Product','SKU',['Ordered','num'],['Delivered','num'],['Pending','num'],['Unit Price','num'],...(full?[['GST','num']]:[]),[full?'Total (incl. GST)':'Total','num']],rows,'tight');};
const orderTotalsBox=o=>{const t=orderTotals(o);return `<div class="totals"><div><span>Subtotal</span><span>${inr(t.net)}</span></div><div><span>GST</span><span>${inr(t.tax)}</span></div><div class="t"><span>Total</span><span>${inr(t.total)}</span></div></div>`;};
const orderEvents=o=>{const ev=[{date:o.date,html:`Order created${o.quoteId?` from quotation ${lnk('/quotations',o.quoteId)}`:''}`}];
  DB.deliveries.filter(d=>d.orderId===o.id).forEach(d=>ev.push({date:d.date,html:`Delivery ${lnk('/deliveries',d.id)} ${d.status.toLowerCase()} · ${num(d.items.reduce((a,i)=>a+i.qty,0))} units`}));
  DB.invoices.filter(i=>i.orderId===o.id).forEach(i=>ev.push({date:i.issue,html:`Invoice ${lnk('/invoices',i.id)} ${i.status==='Draft'?'drafted':'issued'}`}));
  if(o.status==='Cancelled')ev.push({date:o.cancelledOn||o.date,html:'Order cancelled'});return ev.sort((a,b)=>b.date.localeCompare(a.date));};
const deliveryRows=list=>list.map(d=>`<tr><td class="strong">${d.id}</td><td>${fd(d.date)}</td><td>${d.items.map(i=>`${num(i.qty)} × ${e(i.sku)}`).join(', ')}</td><td>${badge(d.status)}</td></tr>`).join('');

function vOrder(id){
  const o=oby(id);if(!o)return notFound('Sales order');const cl=cby(o.clientId),tab=S.soTab,q=orderQty(o),pct=orderPct(o),open=!['Cancelled','Delivered'].includes(o.status);
  const TABS=[['overview','Overview'],['items','Items'],['deliveries','Deliveries'],['invoices','Invoices'],['activity','Activity']];
  const dls=DB.deliveries.filter(d=>d.orderId===id),invs=DB.invoices.filter(i=>i.orderId===id);let body='';
  if(tab==='overview')body=`<section class="card" style="margin-bottom:16px"><div class="summ"><div><span class="lbl">Client</span><a class="lk strong" href="#/clients/${cl.id}">${e(cl.legal)}</a></div><div><span class="lbl">Order Date</span><b>${fd(o.date)}</b></div><div><span class="lbl">Expected Delivery</span><b>${fd(o.expected)}</b></div><div><span class="lbl">Payment Terms</span><b>${e(o.terms)}</b></div></div></section>
    <section class="card" style="margin-bottom:16px"><div class="card-h"><h3>Order Items</h3></div>${itemsTable(o,false)}${orderTotalsBox(o)}</section>
    <section class="card"><div class="card-h"><h3>Fulfilment Status</h3><span class="strong">${pct}%</span></div><div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Fulfilment"><i style="width:${pct}%"></i></div><p class="sub" style="margin-top:10px">${num(q.delivered)} of ${num(q.ordered)} items delivered</p></section>`;
  else if(tab==='items')body=`<section class="card"><div class="card-h"><h3>Items</h3></div>${itemsTable(o,true)}${orderTotalsBox(o)}</section>`;
  else if(tab==='deliveries')body=`<section class="card flush"><div class="card-h pad"><h3>Deliveries</h3>${open?`<button class="btn sm" data-act="delivery-new">${ic('plus',14)} Create Delivery</button>`:''}</div>${dls.length?tw(['Delivery','Date','Items','Status'],deliveryRows(dls)):empty('No deliveries yet','Create a delivery once stock is ready to ship.')}</section>`;
  else if(tab==='invoices')body=`<section class="card flush"><div class="card-h pad"><h3>Invoices</h3></div>${invs.length?tw(['Invoice','Issued','Due','Status',['Amount','num'],['Balance','num']],invs.map(invRow).join('')):empty('No invoices yet','Generate an invoice for the full order value.',o.status!=='Cancelled'?`<button class="btn primary" data-act="order-invoice" data-id="${id}">Generate invoice</button>`:'')}</section>`;
  else body=`<section class="card flush"><div class="card-h pad"><h3>Activity</h3></div><ul class="tl wide">${orderEvents(o).map(x=>`<li><time>${fd(x.date)}</time><span>${x.html}</span></li>`).join('')}</ul></section>`;
  const menu=menuBtn('so-menu',`<a href="#" data-act="order-invoice" data-id="${id}">Generate invoice</a><a href="#" data-act="order-cancel" data-id="${id}"${q.delivered>0||!open?' aria-disabled="true" style="opacity:.45"':''}>Cancel order</a>`);
  return `${head({crumbs:[{t:'Sales Orders',href:'/orders'},{t:id}],title:id,badge:badge(o.status),actions:`<button class="btn" data-act="order-edit" data-id="${id}">${ic('edit',15)} Edit</button><button class="btn primary" data-act="delivery-new"${open?'':' disabled'}>${ic('truck',15)} Create Delivery</button>${menu}`})}
  <div class="card flush" style="margin-bottom:16px">${tabsHtml('soTab',TABS,tab,'dtab')}</div>${body}`;
}

/* ================= DELIVERIES ================= */
const filteredDeliveries=()=>{const u=S.ui.deliveries;return DB.deliveries.filter(d=>(u.tab==='All'||d.status===u.tab)&&has(d.id+d.orderId+cn(d.clientId),u.q));};
function tblDeliveries(){const u=S.ui.deliveries,all=filteredDeliveries();if(!all.length)return empty('No deliveries match','Create a delivery from a sales order.');
  return tw(['Delivery','Order','Client','Date','Units','Status',''],paged(all,u.page).map(d=>`<tr><td class="strong">${d.id}</td><td>${lnk('/orders/'+d.orderId,d.orderId)}</td><td>${e(cn(d.clientId))}</td><td>${fd(d.date)}</td><td class="num">${num(d.items.reduce((a,i)=>a+i.qty,0))}</td><td>${badge(d.status)}</td><td class="num">${d.status==='Scheduled'?`<button class="btn sm" data-act="dl-next" data-id="${d.id}">Dispatch</button>`:d.status==='In Transit'?`<button class="btn sm primary" data-act="dl-next" data-id="${d.id}">Mark delivered</button>`:''}</td></tr>`).join(''))+pager('deliveries',all.length,u.page);}
function vDeliveries(){const u=S.ui.deliveries,cnt=t=>DB.deliveries.filter(d=>t==='All'||d.status===t).length;
  return `${head({title:'Deliveries',meta:`${cnt('In Transit')} in transit · ${cnt('Scheduled')} scheduled`,actions:`<a class="btn primary" href="#/orders">${ic('plus',16)} Create from an order</a>`})}
  <div class="card flush">${tabsHtml('deliveries',['All','Scheduled','In Transit','Delivered'].map(t=>[t,t,cnt(t)]),u.tab)}<div class="toolbar">${searchBox('deliveries','Search by delivery, order or client',u.q)}</div><div id="tbl">${tblDeliveries()}</div></div>`;}

/* ================= INVOICES + PAYMENTS ================= */
const filteredInvoices=()=>{const u=S.ui.invoices;return DB.invoices.filter(i=>(u.tab==='All'||i.status===u.tab)&&has(i.id+cn(i.clientId),u.q));};
function tblInvoices(){const u=S.ui.invoices,all=filteredInvoices();if(!all.length)return empty('No invoices match','Try another tab or search.');
  return tw(['Invoice No.','Client','Issue Date','Due Date','Status',['Amount','num']],paged(all,u.page).map(i=>`<tr class="click" data-act="inv-view" data-id="${i.id}"><td class="strong lk">${i.id}</td><td>${e(cn(i.clientId))}</td><td>${fd(i.issue)}</td><td>${fd(i.due)}</td><td>${badge(i.status)}</td><td class="num">${inr(i.amount)}</td></tr>`).join(''))+pager('invoices',all.length,u.page);}
function vInvoices(){const u=S.ui.invoices,cnt=t=>DB.invoices.filter(i=>t==='All'||i.status===t).length;
  return `${head({title:'Invoices',actions:`<button class="btn primary" data-act="inv-new">${ic('plus',16)} Create Invoice</button>`})}
  <div class="card flush">${tabsHtml('invoices',['All','Draft','Issued','Partial','Paid','Overdue'].map(t=>[t,t,cnt(t)]),u.tab)}<div class="toolbar">${searchBox('invoices','Search by invoice number or client',u.q)}</div><div id="tbl">${tblInvoices()}</div></div>`;}
const filteredPayments=()=>{const u=S.ui.payments;return DB.payments.filter(p=>has(p.id+p.invoiceId+cn(p.clientId)+p.ref,u.q));};
function tblPayments(){const u=S.ui.payments,all=filteredPayments();if(!all.length)return empty('No payments match','Try another search.');
  return tw(['Payment','Invoice','Client','Date','Method','Reference',['Amount','num']],paged(all,u.page).map(p=>`<tr><td class="strong">${p.id}</td><td>${p.invoiceId}</td><td>${e(cn(p.clientId))}</td><td>${fd(p.date)}</td><td>${e(p.method)}</td><td class="sub">${e(p.ref)}</td><td class="num">${inr(p.amount)}</td></tr>`).join(''))+pager('payments',all.length,u.page);}
function vPayments(){const u=S.ui.payments,mtd=DB.payments.filter(p=>p.date.startsWith('2024-09')).reduce((a,p)=>a+p.amount,0),od=DB.invoices.filter(i=>i.status==='Overdue');
  return `${head({title:'Payments',actions:`<button class="btn primary" data-act="pay-new">${ic('plus',16)} Record payment</button>`})}
  <div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="kpi"><div class="kpi-top"><span>Received in September</span><span class="chip ok">${ic('card',18)}</span></div><div class="kpi-v">${inr(mtd)}</div></div><div class="kpi"><div class="kpi-top"><span>Outstanding</span><span class="chip err">${ic('receipt',18)}</span></div><div class="kpi-v">${inr(DB.kpi.outstanding)}</div></div><a class="kpi" href="#/invoices?tab=Overdue"><div class="kpi-top"><span>Overdue invoices</span><span class="chip warn">${ic('alert',18)}</span></div><div class="kpi-v">${od.length}</div><span class="sub">${inr(od.reduce((a,i)=>a+i.amount-i.paid,0))} to collect</span></a></div>
  <div class="card flush"><div class="toolbar">${searchBox('payments','Search by payment, invoice, client or reference',u.q)}</div><div id="tbl">${tblPayments()}</div></div>`;}

/* ================= TASKS ================= */
function vTasks(){const u=S.ui.tasks,list=DB.tasks.filter(t=>u.tab==='All'||(u.tab==='Done')===t.done).sort((a,b)=>a.done-b.done||a.due.localeCompare(b.due)),cnt=t=>DB.tasks.filter(x=>t==='All'||(t==='Done')===x.done).length;
  return `${head({title:'Tasks',meta:`${cnt('Open')} open · ${cnt('Done')} done`})}
  <div class="card flush">${tabsHtml('tasks',['Open','Done','All'].map(t=>[t,t,cnt(t)]),u.tab)}
  <div class="add-task"><input id="t-title" placeholder="Add a task, e.g. Call Metro about INV-00419" aria-label="New task"><select id="t-prio" aria-label="Priority" style="width:auto"><option>High</option><option selected>Medium</option><option>Low</option></select><button class="btn primary" data-act="task-add">${ic('plus',16)} Add task</button></div>
  <div id="tbl">${list.length?list.map(t=>`<div class="task${t.done?' done':''}"><button class="tick" role="checkbox" aria-checked="${t.done}" data-act="task-toggle" data-id="${t.id}" aria-label="Mark ${e(t.title)} as ${t.done?'open':'done'}">${ic('tick',14)}</button><div class="t"><b>${e(t.title)}</b><div class="sub">${e(t.rel)} · Due ${fd(t.due)}${!t.done&&t.due<TODAY?' · <span class="red">Overdue</span>':''}</div></div><span class="badge b-${t.prio==='High'?'err':t.prio==='Medium'?'warn':'neutral'}">${t.prio}</span></div>`).join(''):empty(u.tab==='Done'?'Nothing completed yet':'You\'re all caught up','New tasks you add will appear here.')}</div></div>`;}

/* ================= REPORTS ================= */
function vReports(){
  const inv=DB.invoices.filter(i=>i.status!=='Draft'),billed=inv.reduce((a,i)=>a+i.amount,0),coll=inv.reduce((a,i)=>a+i.paid,0),live=DB.orders.filter(o=>o.status!=='Cancelled');
  const aov=live.reduce((a,o)=>a+orderTotals(o).total,0)/live.length;
  const byClient={};inv.forEach(i=>byClient[i.clientId]=(byClient[i.clientId]||0)+i.amount);const top=Object.entries(byClient).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const byCat={};live.forEach(o=>o.items.forEach(i=>{const c=pby(i.sku).cat;byCat[c]=(byCat[c]||0)+i.ordered*i.price;}));const cat=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const age=[['Not yet due',0],['1–30 days late',0],['31–60 days late',0],['Over 60 days late',0]];
  inv.filter(i=>i.amount>i.paid).forEach(i=>{const late=Math.round((new Date(TODAY)-new Date(i.due))/864e5),b=late<=0?0:late<=30?1:late<=60?2:3;age[b][1]+=i.amount-i.paid;});
  const bars=(rows)=>{const m=Math.max(...rows.map(r=>r[1]));return rows.map(([k,v])=>`<div class="hbar"><span>${e(k)}</span><div class="bar"><i style="width:${Math.max(3,v/m*100)}%"></i></div><b>${inr(v)}</b></div>`).join('');};
  const mx=Math.max(...DB.rev.cur);
  return `${head({title:'Reports',meta:'Figures for 2024, up to '+fd(TODAY)})}
  <div class="kpis"><div class="kpi"><div class="kpi-top"><span>Invoiced</span><span class="chip vio">${ic('receipt',18)}</span></div><div class="kpi-v">${inr(billed)}</div></div><div class="kpi"><div class="kpi-top"><span>Collected</span><span class="chip ok">${ic('card',18)}</span></div><div class="kpi-v">${inr(coll)}</div></div><div class="kpi"><div class="kpi-top"><span>Collection rate</span><span class="chip info">${ic('chart',18)}</span></div><div class="kpi-v">${Math.round(coll/billed*100)}%</div></div><div class="kpi"><div class="kpi-top"><span>Average order value</span><span class="chip warn">${ic('cart',18)}</span></div><div class="kpi-v">${inr(aov)}</div></div></div>
  <div class="gh"><section class="card"><div class="card-h"><h3>Revenue by month</h3><span class="sub">₹ in thousands</span></div><div class="vbars" role="img" aria-label="Revenue by month">${DB.rev.cur.map((v,i)=>`<div class="${i>8?'fcst':''}"><span>${v}</span><i style="height:${v/mx*78}%"></i><span>${MON[i]}</span></div>`).join('')}</div><p class="sub" style="margin-top:8px">Dashed bars are forecast months.</p></section>
  <section class="card"><div class="card-h"><h3>Top clients by invoiced value</h3></div>${bars(top.map(([id,v])=>[cn(id),v]))}</section>
  <section class="card"><div class="card-h"><h3>Sales by category</h3></div>${bars(cat)}</section>
  <section class="card"><div class="card-h"><h3>Receivables ageing</h3></div>${bars(age)}</section></div>`;}

/* ================= SETTINGS ================= */
function vSettings(){const s=DB.settings,t=S.setTab,theme=S.theme||'system';
  const TABS=[['profile','Profile'],['company','Company'],['documents','Quotation defaults'],['alerts','Notifications'],['look','Appearance']];let b='';
  const sw=(k,l,d)=>`<div class="setrow"><div><b>${l}</b><p>${d}</p></div><label class="sw"><input type="checkbox" name="${k}" ${s.notif[k]?'checked':''} aria-label="${l}"><i></i></label></div>`;
  if(t==='profile')b=`<div class="frm"><div class="field"><label for="s-name">Full name</label><input id="s-name" name="name" value="${e(s.name)}"></div><div class="field"><label for="s-role">Role</label><input id="s-role" name="role" value="${e(s.role)}"></div><div class="field full"><label for="s-email">Email</label><input id="s-email" name="email" type="email" value="${e(s.email)}"></div></div>`;
  else if(t==='company')b=`<div class="frm"><div class="field"><label for="s-co">Company name</label><input id="s-co" name="company" value="${e(s.company)}"></div><div class="field"><label for="s-gst">GSTIN</label><input id="s-gst" name="gstin" value="${e(s.gstin)}"></div></div>`;
  else if(t==='documents')b=`<div class="frm"><div class="field"><label for="s-val">Quotation validity (days)</label><input id="s-val" name="validity" type="number" min="1" value="${s.validity}"></div><div class="field"><label for="s-tax">Default GST rate (%)</label><input id="s-tax" name="tax" type="number" min="0" value="${s.tax}"></div><div class="field full"><label for="s-terms">Default terms &amp; conditions</label><textarea id="s-terms" name="terms" rows="5">${e(s.terms)}</textarea></div></div>`;
  else if(t==='alerts')b=sw('low','Low stock alerts','Tell me when a product drops below its reorder level.')+sw('overdue','Overdue invoices','Tell me when an invoice passes its due date.')+sw('orders','New sales orders','Tell me when an order is created from a quotation.')+sw('digest','Daily summary email','Send a summary of open work every morning.');
  else b=`<div class="field" style="max-width:280px"><label for="s-theme">Colour theme</label><select id="s-theme" data-ui="theme"><option value="system"${theme==='system'?' selected':''}>Match my device</option><option value="light"${theme==='light'?' selected':''}>Light</option><option value="dark"${theme==='dark'?' selected':''}>Dark</option></select></div>`;
  return `${head({title:'Settings'})}<div class="card">${tabsHtml('setTab',TABS,t,'dtab')}<div id="set-form">${b}</div>${t!=='look'?`<div style="margin-top:20px"><button class="btn primary" data-act="settings-save">Save changes</button></div>`:''}</div>`;}

const VIEWS={dashboard:()=>vDashboard(),clients:id=>id?vClient(id):vClients(),products:()=>vProducts(),inventory:()=>vInventory(),
  quotations:id=>id==='new'?vQuoteNew():vQuotations(),orders:id=>id?vOrder(id):vOrders(),deliveries:()=>vDeliveries(),invoices:()=>vInvoices(),payments:()=>vPayments(),tasks:()=>vTasks(),reports:()=>vReports(),settings:()=>vSettings()};
const TBL={clients:tblClients,products:tblProducts,inventory:tblInventory,quotations:tblQuotes,orders:tblOrders,deliveries:tblDeliveries,invoices:tblInvoices,payments:tblPayments};
