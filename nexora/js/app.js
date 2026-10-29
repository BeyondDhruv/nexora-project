'use strict';
/* app.js: rendering, hash router, modal forms (ACTIONS), event listeners and start-up.
   Buttons declare data-act="name" and the matching ACTIONS[name] runs on click. */
/* ================= RENDER + ROUTING ================= */
let curHash=null;
function enhance(){$$('tr.click').forEach(tr=>{tr.tabIndex=0;});}
function paint(){const t=$('#tbl'),f=TBL[S.route.name];if(t&&f){t.innerHTML=f();enhance();}}
function updateBell(){const n=notifItems().length;$('#bell-dot').style.display=n?'':'none';}
function render(scroll){
  const r=S.route,fn=VIEWS[r.name],v=$('#view');
  v.innerHTML=fn?fn(r.id):notFound('Page');
  $$('#nav a').forEach(a=>{if(a.dataset.nav===r.name)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.title=(r.id&&r.id!=='new'?r.id+' · ':'')+(TITLES[r.name]||'Nexora')+' · Nexora';
  if(r.name==='dashboard'){bindChart();S.anim=true;}
  enhance();updateBell();
  if(scroll){window.scrollTo(0,0);v.focus({preventScroll:true});}
}
function applyHash(h,force){
  h=h||'/dashboard';if(h===curHash&&!force)return;curHash=h;
  const prev=S.route,r=parseHash(h);S.route=r;
  if(UIDEF[r.name]){const u=UIDEF[r.name]();for(const k in r.q)if(k in u)u[k]=r.q[k];S.ui[r.name]=u;}
  if(r.name==='clients'&&r.id&&(prev.name!=='clients'||prev.id!==r.id))S.clTab='overview';
  if(r.name==='orders'&&r.id&&(prev.name!=='orders'||prev.id!==r.id))S.soTab='overview';
  if(r.name==='settings')S.setTab='profile';
  if(r.name==='quotations'&&r.id==='new')S.qf=newQF(r.q.client);
  $('#modal').innerHTML='';closeNav();closePops();render(true);
}
function go(h){applyHash(h,true);try{if(location.hash.slice(1)!==h)location.hash=h;}catch(_){}}
window.addEventListener('hashchange',()=>applyHash(location.hash.slice(1)||'/dashboard'));
function closeNav(){$('#side').classList.remove('open');$('#scrim').classList.remove('on');}
function closePops(){$$('.popwrap .pop').forEach(p=>{p.hidden=true;});const g=$('#gs-res');if(g)g.hidden=true;const q=$('#q-res');if(q)q.hidden=true;}

/* theme */
function effectiveTheme(){const t=document.documentElement.getAttribute('data-theme');return t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}
function applyTheme(mode){S.theme=mode;const r=document.documentElement;if(mode==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',mode);try{localStorage.setItem('nx-theme',mode);}catch(_){}
  $('#theme-btn').innerHTML=ic(effectiveTheme()==='dark'?'sun':'moon');}

/* ================= NOTIFICATIONS + GLOBAL SEARCH ================= */
function notifItems(){const s=DB.settings.notif,low=DB.products.filter(p=>p.stock<=p.reorder).length,od=DB.invoices.filter(i=>i.status==='Overdue').length,pe=DB.orders.filter(o=>o.status==='Pending').length,it=[];
  if(s.low&&low)it.push(['warn','alert',`${low} products are at or below their reorder level`,'/inventory?st=Needs%20reorder']);
  if(s.overdue&&od)it.push(['err','receipt',`${od} invoices are overdue`,'/invoices?tab=Overdue']);
  if(s.orders&&pe)it.push(['info','cart',`${pe} sales orders are waiting for confirmation`,'/orders?tab=Pending']);return it;}
function notifHtml(){const it=notifItems();return `<div class="cap">Notifications</div>${it.length?it.map(n=>`<a href="#${n[3]}"><span class="chip ${n[0]}" style="width:30px;height:30px">${ic(n[1],15)}</span><span>${n[2]}</span></a>`).join(''):'<div class="row sub">You\'re all caught up.</div>'}`;}
function gsSearch(val){const q=val.trim(),res=$('#gs-res');if(!q){res.hidden=true;return;}const G=[],add=(g,l)=>{if(l.length)G.push([g,l]);};
  add('Clients',DB.clients.filter(c=>has(c.legal+c.trade+c.id,q)).slice(0,3).map(c=>({t:c.legal,s:c.id,h:'/clients/'+c.id})));
  add('Sales orders',DB.orders.filter(o=>has(o.id+cn(o.clientId),q)).slice(0,3).map(o=>({t:o.id,s:cn(o.clientId),h:'/orders/'+o.id})));
  add('Quotations',DB.quotes.filter(x=>has(x.id+cn(x.clientId),q)).slice(0,2).map(x=>({t:x.id,s:cn(x.clientId),h:'/quotations?q='+encodeURIComponent(x.id)})));
  add('Invoices',DB.invoices.filter(i=>has(i.id+cn(i.clientId),q)).slice(0,3).map(i=>({t:i.id,s:cn(i.clientId),h:'/invoices?q='+encodeURIComponent(i.id)})));
  add('Products',DB.products.filter(p=>has(p.name+p.sku,q)).slice(0,3).map(p=>({t:p.name,s:p.sku,h:'/products?q='+encodeURIComponent(p.sku)})));
  res.innerHTML=G.length?G.map(([g,l])=>`<div class="cap">${g}</div>${l.map(x=>`<a href="#${x.h}"><span><b>${e(x.t)}</b> <span class="sub">${e(x.s)}</span></span></a>`).join('')}`).join(''):`<div class="row sub">No results for “${e(q)}”</div>`;res.hidden=false;}

/* ================= QUOTE FORM HELPERS ================= */
const refreshQuote=()=>{$('#q-lines').innerHTML=qLines();$('#q-totals').innerHTML=qTotals();};
const qMatches=q=>{q=q.trim().toLowerCase();return(q?DB.products.filter(p=>(p.name+p.sku).toLowerCase().includes(q)):DB.products).slice(0,6);};
function showQRes(){const box=$('#q-res'),v=$('#q-search').value,m=qMatches(v);
  box.innerHTML=m.length?m.map(p=>`<button type="button" data-act="line-add" data-sku="${e(p.sku)}"><span><b>${e(p.name)}</b> <span class="sub">${e(p.sku)}</span></span><span class="sub">${inr(p.price)} · ${num(p.stock)} in stock</span></button>`).join(''):'<div class="row sub">No products match</div>';box.hidden=false;}
function addLine(sku){const f=S.qf,p=pby(sku),ex=f.lines.find(l=>l.sku===sku);if(ex)ex.qty+=1;else f.lines.push({sku,qty:1,price:p.price,disc:priceDisc(f.clientId,sku),tax:p.tax});
  refreshQuote();const s=$('#q-search');s.value='';$('#q-res').hidden=true;s.focus();}
const merr=m=>{const b=$('#merr');if(b){b.textContent=m;b.hidden=false;}};
const nextId=(arr,prefix,pad)=>prefix+String(Math.max(...arr.map(x=>+x.id.slice(prefix.length)))+1).padStart(pad,'0');
function refreshOrderStatus(o){if(o.status==='Cancelled')return;const q=orderQty(o);if(q.delivered>=q.ordered)o.status='Delivered';else if(q.delivered>0)o.status='Partially Fulfilled';}
const scheduledQty=(oid,sku)=>DB.deliveries.filter(d=>d.orderId===oid&&(d.status==='Scheduled'||d.status==='In Transit')).reduce((a,d)=>a+d.items.filter(i=>i.sku===sku).reduce((b,i)=>b+i.qty,0),0);
function convertQuote(id){const q=qby(id),cl=cby(q.clientId),oid=nextId(DB.orders,'SO-',5);
  DB.orders.unshift({id:oid,clientId:q.clientId,date:TODAY,expected:addDays(TODAY,10),status:'Pending',terms:cl.terms,quoteId:q.id,items:q.lines.map(l=>({sku:l.sku,ordered:l.qty,delivered:0,price:Math.round(l.price*(1-(l.disc||0)/100)*100)/100,tax:l.tax}))});
  q.orderId=oid;logFeed('ok','cart',`Sales Order ${lnk('/orders/'+oid,oid)} created from ${e(q.id)}`);toast(`Sales order ${oid} created`);return oid;}
function clientForm(c){const v=c||{},ct=v.contact||{},opt=(list,sel)=>list.map(x=>`<option${x===sel?' selected':''}>${e(x)}</option>`).join('');
  return `<div id="merr" class="errbox" role="alert" hidden></div><div class="frm">
  <div class="field full"><label for="c-legal">Legal name *</label><input id="c-legal" name="legal" value="${e(v.legal||'')}"></div>
  <div class="field"><label for="c-trade">Trade name</label><input id="c-trade" name="trade" value="${e(v.trade||'')}"></div>
  <div class="field"><label for="c-ind">Industry</label><select id="c-ind" name="industry">${opt(INDS,v.industry)}</select></div>
  <div class="field"><label for="c-email">Company email</label><input id="c-email" name="email" type="email" value="${e(v.email||'')}"></div>
  <div class="field"><label for="c-phone">Company phone</label><input id="c-phone" name="phone" value="${e(v.phone||'')}"></div>
  <div class="field"><label for="c-terms">Payment terms</label><select id="c-terms" name="terms">${opt(['Advance','Net 7','Net 15','Net 30','Net 45','Net 60'],v.terms||'Net 30')}</select></div>
  <div class="field"><label for="c-credit">Credit limit (₹)</label><input id="c-credit" name="credit" type="number" min="0" value="${v.credit??500000}"></div>
  ${c?`<div class="field"><label for="c-status">Status</label><select id="c-status" name="status">${opt(['Active','Inactive'],v.status)}</select></div>`
   :`<div class="field"><label for="c-city">City</label><select id="c-city" name="city">${opt(CITIES.map(x=>x[0]),'Mumbai')}</select></div><div class="field"><label for="c-cn">Primary contact name</label><input id="c-cn" name="cname"></div><div class="field"><label for="c-ce">Contact email</label><input id="c-ce" name="cemail" type="email"></div><div class="field"><label for="c-cp">Contact phone</label><input id="c-cp" name="cphone"></div>`}</div>`;}
function prodForm(p){const v=p||{};return `<div id="merr" class="errbox" role="alert" hidden></div><div class="frm">
  <div class="field full"><label for="p-name">Product name *</label><input id="p-name" name="name" value="${e(v.name||'')}"></div>
  <div class="field"><label for="p-sku">SKU *</label><input id="p-sku" name="sku" value="${e(v.sku||'')}"${p?' readonly':''}></div>
  <div class="field"><label for="p-cat">Category</label><input id="p-cat" name="cat" list="cat-list" value="${e(v.cat||'')}"><datalist id="cat-list">${cats().map(c=>`<option value="${e(c)}">`).join('')}</datalist></div>
  <div class="field"><label for="p-price">Unit price (₹) *</label><input id="p-price" name="price" type="number" min="0" step="0.01" value="${v.price??''}"></div>
  <div class="field"><label for="p-tax">GST (%)</label><input id="p-tax" name="tax" type="number" min="0" step="0.5" value="${v.tax??DB.settings.tax}"></div>
  <div class="field"><label for="p-stock">${p?'Stock on hand':'Opening stock'}</label><input id="p-stock" name="stock" type="number" min="0" value="${v.stock??0}"></div>
  <div class="field"><label for="p-re">Reorder level</label><input id="p-re" name="reorder" type="number" min="0" value="${v.reorder??100}"></div></div>`;}
const quoteTable=q=>tw(['Product','SKU',['Qty','num'],['Price','num'],['Disc.','num'],['Amount','num']],q.lines.map(l=>`<tr><td class="strong">${e(pby(l.sku).name)}</td><td>${e(l.sku)}</td><td class="num">${num(l.qty)}</td><td class="num">${inr(l.price)}</td><td class="num">${l.disc?l.disc+'%':'—'}</td><td class="num">${inr(lineCalc(l).net)}</td></tr>`).join(''),'tight');
const totalsBox=t=>`<div class="totals"><div><span>Subtotal</span><span>${inr(t.sub)}</span></div><div><span>Discount</span><span>−${inr(t.disc)}</span></div><div><span>Tax (GST)</span><span>${inr(t.tax)}</span></div><div class="t"><span>Total</span><span>${inr(t.total)}</span></div></div>`;
const cancelBtn='<button class="btn" data-act="modal-close">Cancel</button>';

/* ================= ACTIONS ================= */
const ACTIONS={
 'nav-open':()=>{$('#side').classList.add('open');$('#scrim').classList.add('on');},
 'nav-close':closeNav,
 'modal-close':closeModal,
 'modal-bg':(el,ev)=>{if(ev.target===el)closeModal();},
 theme:()=>{applyTheme(effectiveTheme()==='dark'?'light':'dark');if(S.route.name==='settings')render();},
 tab:el=>{const u=S.ui[el.dataset.key];u.tab=el.dataset.val;u.page=1;render();},
 dtab:el=>{S[el.dataset.key]=el.dataset.val;render();},
 page:el=>{S.ui[el.dataset.key].page=+el.dataset.val;paint();},
 'feed-toggle':()=>{S.feedAll=!S.feedAll;render();},
 /* clients */
 'client-new':()=>openModal('Add client',clientForm(),cancelBtn+'<button class="btn primary" data-act="client-save">Add client</button>',true),
 'client-edit':el=>openModal('Edit client',clientForm(cby(el.dataset.id)),cancelBtn+`<button class="btn primary" data-act="client-save" data-id="${el.dataset.id}">Save changes</button>`,true),
 'client-save':el=>{const v=formVals(),id=el.dataset.id;if(!v.legal)return merr('Enter the client\'s legal name.');
   if(id){const c=cby(id);Object.assign(c,{legal:v.legal,trade:v.trade||v.legal,industry:v.industry,email:v.email||c.email,phone:v.phone||c.phone,terms:v.terms,credit:+v.credit||0,status:v.status});DB.clients.sort((a,b)=>a.legal.localeCompare(b.legal));closeModal();toast('Client details saved');render();}
   else{const nid=nextId(DB.clients,'CL-',4),o={id:nid,legal:v.legal,trade:v.trade||v.legal,industry:v.industry,city:v.city,terms:v.terms,credit:+v.credit||500000};
     if(v.email)o.email=v.email;if(v.phone)o.phone=v.phone;if(v.cname)o.contact={name:v.cname,role:'Primary contact',email:v.cemail||v.email||'',phone:v.cphone||v.phone||''};
     DB.clients.push(mkClient(o));DB.clients.sort((a,b)=>a.legal.localeCompare(b.legal));logFeed('info','users',`New client ${lnk('/clients/'+nid,v.legal)} added`);toast(`${v.legal} added`);closeModal();go('/clients/'+nid);}},
 'client-msg':el=>{const c=cby(el.dataset.id);openModal('Message '+c.contact.name,`<div id="merr" class="errbox" role="alert" hidden></div><div class="field"><label for="m-body">Message to ${e(c.contact.email)}</label><textarea id="m-body" name="body" rows="5" placeholder="Write your message…"></textarea></div>`,cancelBtn+`<button class="btn primary" data-act="client-msg-send" data-id="${c.id}">Send message</button>`);},
 'client-msg-send':el=>{const v=formVals(),c=cby(el.dataset.id);if(!v.body)return merr('Write a message before sending.');c.events.push({date:TODAY,html:`Message sent to <b>${e(c.contact.name)}</b>`});closeModal();toast(`Message sent to ${c.contact.name}`);render();},
 'client-toggle':(el,ev)=>{ev.preventDefault();const c=cby(el.dataset.id);c.status=c.status==='Active'?'Inactive':'Active';toast(`${c.trade} is now ${c.status.toLowerCase()}`);render();},
 'contact-new':el=>openModal('Add contact',`<div id="merr" class="errbox" role="alert" hidden></div><div class="frm"><div class="field"><label for="k-n">Name *</label><input id="k-n" name="name"></div><div class="field"><label for="k-r">Role</label><input id="k-r" name="role"></div><div class="field"><label for="k-e">Email</label><input id="k-e" name="email" type="email"></div><div class="field"><label for="k-p">Phone</label><input id="k-p" name="phone"></div></div>`,cancelBtn+`<button class="btn primary" data-act="contact-save" data-id="${el.dataset.id}">Add contact</button>`),
 'contact-save':el=>{const v=formVals();if(!v.name)return merr('Enter the contact\'s name.');const c=cby(el.dataset.id);c.others.push({name:v.name,role:v.role||'Contact',email:v.email,phone:v.phone});c.events.push({date:TODAY,html:`New contact <b>${e(v.name)}</b> added`});closeModal();toast('Contact added');render();},
 /* products + stock */
 'prod-new':()=>openModal('Add product',prodForm(),cancelBtn+'<button class="btn primary" data-act="prod-save">Add product</button>',true),
 'prod-edit':el=>openModal('Edit product',prodForm(pby(el.dataset.sku)),cancelBtn+`<button class="btn primary" data-act="prod-save" data-sku="${e(el.dataset.sku)}">Save changes</button>`,true),
 'prod-save':el=>{const v=formVals(),edit=el.dataset.sku;if(!v.name||!v.sku)return merr('Enter a product name and SKU.');if(!(+v.price>=0)||v.price==='')return merr('Enter a unit price.');
   if(!edit&&pby(v.sku))return merr(`SKU ${v.sku} already exists.`);
   const d={name:v.name,cat:v.cat||'General',price:+v.price,tax:+v.tax||0,stock:Math.max(0,Math.floor(+v.stock)||0),reorder:Math.max(0,Math.floor(+v.reorder)||0)};
   if(edit)Object.assign(pby(edit),d);else DB.products.push({sku:v.sku,...d});closeModal();toast(edit?'Product saved':`${v.name} added`);render();},
 'stock-adj':el=>{const p=pby(el.dataset.sku);openModal('Adjust stock',`<div id="merr" class="errbox" role="alert" hidden></div><p style="margin-bottom:14px"><b>${e(p.name)}</b><br><span class="sub">${e(p.sku)} · ${num(p.stock)} on hand</span></p><div class="frm"><div class="field"><label for="a-t">Adjustment</label><select id="a-t" name="type"><option value="in">Stock in</option><option value="out">Stock out</option></select></div><div class="field"><label for="a-q">Quantity</label><input id="a-q" name="qty" type="number" min="1" value="100"></div><div class="field full"><label for="a-n">Note <span class="opt">(Optional)</span></label><input id="a-n" name="note" placeholder="e.g. Supplier delivery, damaged goods"></div></div>`,cancelBtn+`<button class="btn primary" data-act="stock-save" data-sku="${e(p.sku)}">Update stock</button>`);},
 'stock-save':el=>{const v=formVals(),p=pby(el.dataset.sku),q=Math.floor(+v.qty);if(!(q>0))return merr('Enter a quantity greater than zero.');if(v.type==='out'&&q>p.stock)return merr(`Only ${num(p.stock)} units are in stock.`);
   p.stock+=v.type==='in'?q:-q;if(v.type==='out'&&p.stock<=p.reorder)logFeed('warn','alert',`Product ${lnk('/inventory?st=Needs%20reorder',p.sku)} is below reorder level`);closeModal();toast(`${p.name}: ${num(p.stock)} now in stock`);render();},
 /* quotations */
 'quote-view':el=>{const q=qby(el.dataset.id),cl=cby(q.clientId);let f=cancelBtn.replace('Cancel','Close');
   if(q.status==='Draft')f+=`<button class="btn primary" data-act="quote-status" data-id="${q.id}" data-to="Sent">Mark as sent</button>`;
   if(q.status==='Sent')f+=`<button class="btn" data-act="quote-status" data-id="${q.id}" data-to="Expired">Mark as expired</button><button class="btn primary" data-act="quote-status" data-id="${q.id}" data-to="Accepted">Mark as accepted</button>`;
   if(q.status==='Accepted')f+=q.orderId?`<a class="btn primary" href="#/orders/${q.orderId}">View ${q.orderId}</a>`:`<button class="btn primary" data-act="quote-convert" data-id="${q.id}">Convert to sales order</button>`;
   openModal(q.id,`<div class="summ" style="margin-bottom:18px"><div><span class="lbl">Client</span><a class="lk strong" href="#/clients/${cl.id}">${e(cl.trade)}</a></div><div><span class="lbl">Status</span>${badge(q.status)}</div><div><span class="lbl">Date</span><b>${fd(q.date)}</b></div><div><span class="lbl">Valid till</span><b>${fd(q.valid)}</b></div></div>${quoteTable(q)}${totalsBox(docCalc(q.lines))}${q.terms?`<p class="sub" style="margin-top:16px;white-space:pre-line">${e(q.terms)}</p>`:''}`,f,true);},
 'quote-status':el=>{const q=qby(el.dataset.id);q.status=el.dataset.to;if(q.status==='Accepted'){q.acceptedOn=TODAY;logFeed('info','file',`Quotation ${lnk('/quotations',q.id)} accepted by ${e(cn(q.clientId))}`);}closeModal();toast(`${q.id} marked as ${q.status.toLowerCase()}`);render();},
 'quote-convert':el=>{const id=convertQuote(el.dataset.id);closeModal();go('/orders/'+id);},
 'order-from-quote':()=>{const l=DB.quotes.filter(q=>q.status==='Accepted'&&!q.orderId);if(!l.length)return toast('No accepted quotations are waiting to be converted.');
   openModal('Create sales order',`<div id="merr" class="errbox" role="alert" hidden></div><div class="field"><label for="o-q">Accepted quotation</label><select id="o-q" name="qid">${l.map(q=>`<option value="${q.id}">${q.id} · ${e(cn(q.clientId))} · ${inr(qTotal(q))}</option>`).join('')}</select></div>`,cancelBtn+'<button class="btn primary" data-act="order-from-quote-save">Create order</button>');},
 'order-from-quote-save':()=>{const id=convertQuote(formVals().qid);closeModal();go('/orders/'+id);},
 'line-add':el=>addLine(el.dataset.sku),
 'line-add-first':()=>{const v=$('#q-search').value.trim();if(!v)return toast('Type a product name or SKU first.');const m=qMatches(v);if(!m.length)return toast('No products match that search.');addLine(m[0].sku);},
 'line-del':el=>{S.qf.lines.splice(+el.dataset.i,1);refreshQuote();},
 'quote-save':el=>{const f=S.qf,box=$('#qerr'),bad=m=>{box.textContent=m;box.hidden=false;box.scrollIntoView({block:'nearest'});};
   if(!f.clientId){$('#q-client').classList.add('bad');$('#q-client').focus();return bad('Choose a client for this quotation.');}
   if(!f.valid){$('#q-valid').classList.add('bad');return bad('Choose a date the quotation is valid until.');}
   if(!f.lines.length)return bad('Add at least one product.');if(f.lines.some(l=>!(l.qty>0)))return bad('Every product needs a quantity of 1 or more.');
   const id=nextId(DB.quotes,'QT-',5),mode=el.dataset.mode;DB.quotes.unshift({id,clientId:f.clientId,date:TODAY,valid:f.valid,ref:f.ref,status:mode,acceptedOn:null,orderId:null,notes:f.notes,terms:f.terms,lines:f.lines.map(l=>({...l}))});
   logFeed('info','file',`Quotation ${lnk('/quotations',id)} ${mode==='Sent'?'sent to':'drafted for'} ${e(cn(f.clientId))}`);toast(mode==='Sent'?`${id} sent to ${cn(f.clientId)}`:`${id} saved as draft`);go('/quotations');},
 /* orders + deliveries */
 'delivery-new':()=>{const o=oby(S.route.id);if(!o)return;if(['Cancelled','Delivered'].includes(o.status))return toast('This order has nothing left to deliver.');
   const rows=o.items.map(i=>{const p=pby(i.sku),open=Math.max(0,i.ordered-i.delivered-scheduledQty(o.id,i.sku)),max=Math.min(open,p.stock);
     return `<tr><td><b>${e(p.name)}</b><div class="sub">${e(i.sku)}</div></td><td class="num">${num(open)}</td><td class="num">${num(p.stock)}</td><td class="num"><input class="line-in" type="number" min="0" max="${max}" value="${max}" data-dsku="${e(i.sku)}"${max?'':' disabled'} aria-label="Quantity to ship for ${e(p.name)}"></td></tr>`;}).join('');
   openModal('Create delivery for '+o.id,`<div id="merr" class="errbox" role="alert" hidden></div><div class="field" style="max-width:220px;margin-bottom:16px"><label for="d-date">Delivery date</label><input id="d-date" type="date" value="${addDays(TODAY,1)}"></div>${tw(['Product',['Still to ship','num'],['In stock','num'],['Ship now','num']],rows,'tight')}<p class="sub" style="margin-top:12px">You can ship up to the smaller of what is still to ship and what is in stock.</p>`,cancelBtn+`<button class="btn primary" data-act="delivery-save" data-id="${o.id}">Create delivery</button>`,true);},
 'delivery-save':el=>{const o=oby(el.dataset.id),items=[];let bad='';
   $$('#modal input[data-dsku]').forEach(inp=>{if(inp.disabled)return;const q=Math.floor(+inp.value||0),max=+inp.max;if(q<0||q>max)bad=`${inp.dataset.dsku}: you can ship at most ${num(max)}.`;else if(q>0)items.push({sku:inp.dataset.dsku,qty:q});});
   if(bad)return merr(bad);if(!items.length)return merr('Enter a quantity for at least one product.');const date=$('#d-date').value;if(!date)return merr('Choose a delivery date.');
   const id=nextId(DB.deliveries,'DL-',4);DB.deliveries.unshift({id,orderId:o.id,clientId:o.clientId,date,status:'Scheduled',items});
   items.forEach(i=>{const p=pby(i.sku);p.stock=Math.max(0,p.stock-i.qty);});if(o.status==='Pending')o.status='Processing';
   logFeed('info','truck',`Delivery ${lnk('/deliveries',id)} scheduled for ${lnk('/orders/'+o.id,o.id)}`);closeModal();toast(`${id} scheduled for ${fd(date)}`);S.soTab='deliveries';render();},
 'order-edit':el=>{const o=oby(el.dataset.id);openModal('Edit '+o.id,`<div class="frm"><div class="field"><label for="e-exp">Expected delivery</label><input id="e-exp" name="expected" type="date" value="${o.expected}"></div><div class="field"><label for="e-terms">Payment terms</label><select id="e-terms" name="terms">${['Advance','Net 7','Net 15','Net 30','Net 45','Net 60'].map(t=>`<option${t===o.terms?' selected':''}>${t}</option>`).join('')}</select></div></div>`,cancelBtn+`<button class="btn primary" data-act="order-save" data-id="${o.id}">Save changes</button>`);},
 'order-save':el=>{const v=formVals(),o=oby(el.dataset.id);if(v.expected)o.expected=v.expected;o.terms=v.terms;closeModal();toast('Order updated');render();},
 'order-cancel':(el,ev)=>{ev.preventDefault();closePops();const o=oby(el.dataset.id);if(o.status==='Cancelled'||o.status==='Delivered')return toast('This order can no longer be cancelled.');if(orderQty(o).delivered>0)return toast('Orders that already have deliveries can\'t be cancelled.');
   openModal('Cancel '+o.id+'?','<p>The order will be marked as cancelled and any scheduled deliveries stay untouched. This can\'t be undone.</p>',cancelBtn.replace('Cancel','Keep order')+`<button class="btn primary danger-fill" style="background:var(--err);border-color:var(--err);color:#fff" data-act="order-cancel-yes" data-id="${o.id}">Cancel order</button>`);},
 'order-cancel-yes':el=>{const o=oby(el.dataset.id);o.status='Cancelled';o.cancelledOn=TODAY;closeModal();toast(`${o.id} cancelled`);render();},
 'order-invoice':(el,ev)=>{if(ev)ev.preventDefault();closePops();const o=oby(el.dataset.id);if(o.status==='Cancelled')return toast('Cancelled orders can\'t be invoiced.');if(DB.invoices.some(i=>i.orderId===o.id))return toast('This order already has an invoice.');
   const id=nextId(DB.invoices,'INV-',5),amt=Math.round(orderTotals(o).total);DB.invoices.unshift({id,clientId:o.clientId,orderId:o.id,issue:TODAY,due:addDays(TODAY,termDays(o.terms)),status:'Issued',amount:amt,paid:0});
   DB.kpi.outstanding+=amt;logFeed('ok','receipt',`Invoice ${lnk('/invoices',id)} issued to ${e(cn(o.clientId))}`);toast(`${id} issued for ${inr(amt)}`);S.soTab='invoices';render();},
 'dl-next':el=>{const d=dby(el.dataset.id);if(d.status==='Scheduled'){d.status='In Transit';d.date=d.date>TODAY?TODAY:d.date;toast(`${d.id} is on its way`);}
   else{d.status='Delivered';const o=oby(d.orderId);d.items.forEach(di=>{const it=o.items.find(i=>i.sku===di.sku);if(it)it.delivered=Math.min(it.ordered,it.delivered+di.qty);});refreshOrderStatus(o);logFeed('ok','truck',`Delivery ${lnk('/deliveries',d.id)} marked as delivered`);toast(`${d.id} delivered. ${o.id} is now ${o.status.toLowerCase()}.`);}render();},
 /* invoices + payments */
 'inv-view':el=>{const i=iby(el.dataset.id),cl=cby(i.clientId),bal=i.amount-i.paid,pct=Math.round(i.paid/i.amount*100),pays=DB.payments.filter(p=>p.invoiceId===i.id);let f=cancelBtn.replace('Cancel','Close');
   if(i.status==='Draft')f+=`<button class="btn primary" data-act="inv-issue" data-id="${i.id}">Issue invoice</button>`;else if(bal>0)f+=`<button class="btn primary" data-act="pay-new" data-id="${i.id}">Record payment</button>`;
   openModal(i.id,`<div class="summ" style="margin-bottom:18px"><div><span class="lbl">Client</span><a class="lk strong" href="#/clients/${cl.id}">${e(cl.trade)}</a></div><div><span class="lbl">Status</span>${badge(i.status)}</div><div><span class="lbl">Issued</span><b>${fd(i.issue)}</b></div><div><span class="lbl">Due</span><b>${fd(i.due)}</b></div></div>
   <p class="sub" style="margin-bottom:14px">Sales order: ${i.orderId?lnk('/orders/'+i.orderId,i.orderId):'not linked'}</p>
   <div class="card" style="background:var(--surface-2)"><dl class="dl" style="grid-template-columns:110px 1fr"><dt>Invoice total</dt><dd>${inr(i.amount)}</dd><dt>Paid</dt><dd>${inr(i.paid)}</dd><dt>Balance</dt><dd class="${bal>0&&i.status==='Overdue'?'red':''}">${inr(bal)}</dd></dl><div class="bar" style="margin-top:14px" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Paid"><i style="width:${pct}%"></i></div></div>
   <h3 style="font-size:14px;margin:18px 0 8px">Payments</h3>${pays.length?tw(['Payment','Date','Method',['Amount','num']],pays.map(p=>`<tr><td class="strong">${p.id}</td><td>${fd(p.date)}</td><td>${e(p.method)}</td><td class="num">${inr(p.amount)}</td></tr>`).join(''),'tight'):'<p class="sub">No payments recorded yet.</p>'}`,f,true);},
 'inv-issue':el=>{const i=iby(el.dataset.id);i.status='Issued';i.issue=TODAY;DB.kpi.outstanding+=i.amount;logFeed('ok','receipt',`Invoice ${lnk('/invoices',i.id)} issued to ${e(cn(i.clientId))}`);closeModal();toast(`${i.id} issued`);render();},
 'inv-new':()=>{const used=new Set(DB.invoices.map(i=>i.orderId)),l=DB.orders.filter(o=>o.status!=='Cancelled'&&!used.has(o.id));if(!l.length)return toast('Every open order already has an invoice.');
   openModal('Create invoice',`<div class="field"><label for="i-o">Sales order</label><select id="i-o" name="oid">${l.map(o=>`<option value="${o.id}">${o.id} · ${e(cn(o.clientId))} · ${inr(orderTotals(o).total)}</option>`).join('')}</select></div><p class="sub" style="margin-top:12px">The invoice is created as a draft for the full order value. Issue it when it is ready to send.</p>`,cancelBtn+'<button class="btn primary" data-act="inv-save">Create draft</button>');},
 'inv-save':()=>{const o=oby(formVals().oid),id=nextId(DB.invoices,'INV-',5);DB.invoices.unshift({id,clientId:o.clientId,orderId:o.id,issue:TODAY,due:addDays(TODAY,termDays(o.terms)),status:'Draft',amount:Math.round(orderTotals(o).total),paid:0});closeModal();toast(`${id} saved as draft`);render();},
 'pay-new':el=>{const l=DB.invoices.filter(i=>['Issued','Partial','Overdue'].includes(i.status));if(!l.length)return toast('There are no unpaid invoices.');const sel=el.dataset.id||l[0].id,cur=iby(sel);
   openModal('Record payment',`<div id="merr" class="errbox" role="alert" hidden></div><div class="frm"><div class="field full"><label for="p-inv">Invoice</label><select id="p-inv" name="inv">${l.map(i=>`<option value="${i.id}"${i.id===sel?' selected':''}>${i.id} · ${e(cn(i.clientId))} · balance ${inr(i.amount-i.paid)}</option>`).join('')}</select></div>
   <div class="field"><label for="p-amt">Amount (₹)</label><input id="p-amt" name="amount" type="number" min="1" value="${cur.amount-cur.paid}"></div><div class="field"><label for="p-date">Date received</label><input id="p-date" name="date" type="date" value="${TODAY}"></div>
   <div class="field"><label for="p-meth">Method</label><select id="p-meth" name="method"><option>Bank transfer</option><option>UPI</option><option>NEFT</option><option>Cheque</option></select></div><div class="field"><label for="p-ref">Reference <span class="opt">(Optional)</span></label><input id="p-ref" name="ref" placeholder="e.g. UTR number"></div></div>`,cancelBtn+'<button class="btn primary" data-act="pay-save">Record payment</button>');},
 'pay-save':()=>{const v=formVals(),i=iby(v.inv),amt=Math.round(+v.amount),bal=i.amount-i.paid;if(!(amt>0))return merr('Enter the amount received.');if(amt>bal)return merr(`The balance on ${i.id} is ${inr(bal)}.`);if(!v.date)return merr('Choose the date received.');
   i.paid+=amt;i.status=i.paid>=i.amount?'Paid':i.due<TODAY?'Overdue':'Partial';DB.payments.unshift({id:nextId(DB.payments,'PAY-',4),clientId:i.clientId,invoiceId:i.id,date:v.date,method:v.method,amount:amt,ref:v.ref||'—'});
   const c=cby(i.clientId);c.outstanding=Math.max(0,c.outstanding-amt);DB.kpi.outstanding=Math.max(0,DB.kpi.outstanding-amt);DB.rev.cur[8]+=amt/1000;
   logFeed('ok','card',`Payment of ${inr(amt)} received from ${e(c.trade)}`);closeModal();toast(`${inr(amt)} recorded against ${i.id}`);render();},
 /* tasks + settings */
 'task-toggle':el=>{const t=DB.tasks.find(x=>x.id===+el.dataset.id);t.done=!t.done;render();},
 'task-add':()=>{const inp=$('#t-title'),title=inp.value.trim();if(!title){inp.classList.add('bad');inp.focus();return toast('Give the task a title first.');}
   DB.tasks.push({id:Math.max(...DB.tasks.map(t=>t.id))+1,title,due:addDays(TODAY,3),prio:$('#t-prio').value,done:false,rel:'General'});S.ui.tasks.tab='Open';toast('Task added');render();},
 'settings-save':()=>{const v=formVals($('#set-form')),s=DB.settings,t=S.setTab;
   if(t==='profile'){Object.assign(s,{name:v.name||s.name,role:v.role||s.role,email:v.email||s.email});$('.u-t b').textContent=s.name;$('.u-t small').textContent=s.role;$('.top .avatar').textContent=initials(s.name);}
   else if(t==='company')Object.assign(s,{company:v.company,gstin:v.gstin});
   else if(t==='documents')Object.assign(s,{validity:Math.max(1,+v.validity||15),tax:+v.tax||0,terms:v.terms});
   else if(t==='alerts'){s.notif={low:v.low,overdue:v.overdue,orders:v.orders,digest:v.digest};updateBell();}
   toast('Settings saved');}
};

/* ================= EVENTS ================= */
document.addEventListener('click',ev=>{
  const t=ev.target,act=t.closest('[data-act]');
  if(act&&ACTIONS[act.dataset.act]){if(act.tagName==='A'&&act.getAttribute('href')==='#')ev.preventDefault();ACTIONS[act.dataset.act](act,ev);return;}
  const a=t.closest('a[href^="#/"]');if(a){ev.preventDefault();$('#gs').value='';go(a.getAttribute('href').slice(1));return;}
  const tr=t.closest('tr[data-href]');if(tr&&!t.closest('button,a,input,select')){go(tr.dataset.href);return;}
  const pop=t.closest('[data-pop]');
  if(pop){const box=$('#'+pop.dataset.pop),open=box.hidden;closePops();if(open){if(box.id==='notif')box.innerHTML=notifHtml();box.hidden=false;}return;}
  if(!t.closest('.gsearch'))$('#gs-res').hidden=true;
  if(!t.closest('.psearch')){const q=$('#q-res');if(q)q.hidden=true;}
  if(!t.closest('.popwrap'))$$('.popwrap .pop').forEach(p=>{p.hidden=true;});
});
document.addEventListener('input',ev=>{
  const el=ev.target,d=el.dataset;
  if(d.ui){const[k,f]=d.ui.split('.');if(k==='dash'||k==='theme')return;S.ui[k][f]=el.value;S.ui[k].page=1;paint();}
  else if(d.line!==undefined){const l=S.qf.lines[+d.line];l[d.f]=Math.max(0,parseFloat(el.value)||0);$('#ln-'+d.line).textContent=inr(lineCalc(l).net);$('#q-totals').innerHTML=qTotals();}
  else if(d.q){const f=S.qf,k=d.q;f[k]=el.value;el.classList.remove('bad');
    if(k==='clientId'){f.lines.forEach(l=>{l.disc=priceDisc(f.clientId,l.sku);});const c=cby(f.clientId);if(c&&!f.dirtyTerms){f.terms=f.terms.replace(/Payment terms: [^.\n]*\.?/,'Payment terms: '+c.terms+'.');$('#q-terms').value=f.terms;}refreshQuote();}
    if(k==='terms')f.dirtyTerms=true;}
  else if(el.id==='q-search')showQRes();
  else if(el.id==='gs')gsSearch(el.value);
  else if(el.id==='t-title')el.classList.remove('bad');
});
document.addEventListener('change',ev=>{
  const el=ev.target;
  if(el.dataset.ui==='dash.range'){S.revRange=el.value;render();}
  else if(el.dataset.ui==='theme'){applyTheme(el.value);}
  else if(el.id==='p-inv'){const i=iby(el.value);$('#p-amt').value=i.amount-i.paid;}
});
document.addEventListener('focusin',ev=>{if(ev.target.id==='q-search')showQRes();if(ev.target.id==='gs'&&ev.target.value.trim())gsSearch(ev.target.value);});
document.addEventListener('keydown',ev=>{
  const t=ev.target;
  if(ev.key==='Escape'){if($('#modal').innerHTML){closeModal();return;}closePops();closeNav();return;}
  if(ev.key==='Tab'&&$('#modal .modal')){const f=$$('#modal button:not([disabled]),#modal input:not([disabled]),#modal select,#modal textarea,#modal a[href]'),first=f[0],last=f[f.length-1];
    if(ev.shiftKey&&t===first){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&t===last){ev.preventDefault();first.focus();}}
  if((ev.key==='Enter'||ev.key===' ')&&t.matches&&t.matches('tr.click')){ev.preventDefault();t.click();}
  else if(ev.key==='Enter'&&t.id==='q-search'){ev.preventDefault();const m=qMatches(t.value);if(t.value.trim()&&m.length)addLine(m[0].sku);}
  else if(ev.key==='Enter'&&t.id==='t-title'){ev.preventDefault();ACTIONS['task-add']();}
  else if(ev.key==='Enter'&&t.id==='gs'){const a=$('#gs-res a');if(a){ev.preventDefault();a.click();}}
});

/* ================= START ================= */
$('#nav').innerHTML=NAV.map(([k,l,i])=>`<a href="#/${k}" data-nav="${k}">${ic(i)}<span>${l}</span></a>`).join('');
$$('[data-ic]').forEach(el=>{el.innerHTML=ic(el.dataset.ic);});
{let saved=null;try{saved=localStorage.getItem('nx-theme');}catch(_){}applyTheme(saved==='light'||saved==='dark'?saved:'system');}
applyHash(location.hash.slice(1)||'/dashboard',true);
