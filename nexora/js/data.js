'use strict';
/* data.js: deterministic sample data (128 clients, 47 orders, 42 invoices...).
   Everything lives in the DB object. Replace this file with API calls when you add a backend. */
/* ================= SAMPLE DATA (deterministic) ================= */
const TODAY='2024-09-18';
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const RND=rng(918);
const pick=a=>a[Math.floor(RND()*a.length)];
const between=(a,b)=>a+Math.floor(RND()*(b-a+1));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(RND()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const addDays=(iso,n)=>{const d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const minDate=(a,b)=>a<b?a:b;
const round500=n=>Math.round(n/500)*500;
const termDays=t=>{const m=/(\d+)/.exec(t||'');return m?+m[1]:0;};

const DB={products:[],clients:[],quotes:[],orders:[],deliveries:[],invoices:[],payments:[],tasks:[],feed:[],
  kpi:{outstanding:1240000},
  rev:{cur:[130,145,160,175,195,215,240,265,295,310,330,350],prev:[130,140,150,160,170,185,200,215,218,230,250,275]},
  settings:{name:'Rahul Mehta',role:'Operations Manager',email:'rahul.mehta@nexora.app',company:'Nexora Industrial Supplies',gstin:'27AABCN4521K1Z8',validity:15,
    terms:'1. Prices are valid for 15 days.\n2. Delivery within 7-10 business days.\n3. Payment terms: Net 30.',tax:18,
    notif:{low:true,overdue:true,orders:true,digest:false}}};

/* products: sku, name, category, price, stock, reorder level */
DB.products=[
 ['CB-10','Industrial Cable 10mm','Electrical',160,250,1000],['CC-001','Copper Connector','Electrical',42,80,500],
 ['PP-002','PVC Pipe 2inch','Plumbing',118,120,500],['CBR-01','Circuit Breaker','Electrical',385,35,200],
 ['SJB-05','Steel Junction Box','Hardware',96,60,300],['MCB-16','MCB 16A Single Pole','Electrical',210,1800,400],
 ['LED-18','LED Panel Light 18W','Electrical',345,940,300],['SW-06','Modular Switch 6A','Electrical',58,3200,1000],
 ['BV-05','Brass Ball Valve 1/2 inch','Plumbing',175,410,150],['GE-100','GI Elbow 1 inch','Plumbing',64,1250,400],
 ['EB-25','Earthing Rod 25mm','Hardware',520,150,60],['CT-200','Cable Tie 200mm (100 pcs)','Hardware',45,2600,800],
 ['HB-12','Hex Bolt Set M12','Hardware',88,760,300],['HL-01','Safety Helmet','Safety',210,180,80],['GL-02','Insulated Gloves','Safety',340,0,50]
].map(([sku,name,cat,price,stock,reorder])=>({sku,name,cat,price,stock,reorder,tax:18}));
const pby=sku=>DB.products.find(p=>p.sku===sku);
const stockStatus=p=>p.stock===0?'Out of Stock':p.stock<=p.reorder?'Low Stock':'In Stock';

/* clients */
const CITIES=[['Mumbai','Maharashtra','27','4000'],['Kolkata','West Bengal','19','7000'],['Pune','Maharashtra','27','4110'],['Delhi','Delhi','07','1100'],['Bengaluru','Karnataka','29','5600'],['Chennai','Tamil Nadu','33','6000'],['Ahmedabad','Gujarat','24','3800'],['Jaipur','Rajasthan','08','3020'],['Hyderabad','Telangana','36','5000'],['Lucknow','Uttar Pradesh','09','2260']];
const FIRST=['Aarav','Priya','Vikram','Neha','Sandeep','Anita','Rohit','Kavita','Arjun','Meera','Sourav','Ritika','Imran','Deepa'],LAST=['Sharma','Mehta','Das','Iyer','Gupta','Nair','Banerjee','Singh','Patel','Reddy','Khan','Bose'];
const ROLES=['Purchase Manager','Accounts Head','Operations Lead','Proprietor','Store Manager'],INDS=['Retail','Wholesale','Manufacturing','Construction','Real Estate','Distribution'];
const PRE=['Bengal','Kesari','Ganga','Lotus','Eastern','Prime','Vertex','Shree','Apex','Zenith','Orient','Sai','Royal','Trident','Anand','Nova','Sterling','Unity','Everest','Silverline'];
const MID=['Electricals','Hardware','Traders','Infra','Enterprises','Retail','Distributors','Industries','Supplies','Engineering'],SUF=['Pvt. Ltd.','LLP','& Co.','Ltd.'];
const STREETS=['Business Park','Trade Centre','Commerce House','Industrial Estate','Market Road'],AREAS=['Andheri East','Salt Lake','Koregaon Park','Karol Bagh','Whitefield','Guindy','Navrangpura','Malviya Nagar','Banjara Hills','Gomti Nagar'];
const LET='ABCDEFGHJKLMNPQRSTUVWXYZ',L1=()=>LET[between(0,LET.length-1)];
function mkClient(o){
  const cy=CITIES.find(c=>c[0]===o.city)||pick(CITIES),first=pick(FIRST),last=pick(LAST),slug=o.trade.toLowerCase().replace(/[^a-z0-9]+/g,''),pin=cy[3]+between(10,99);
  const phone=()=>'+91 9'+between(1000,9999)+' '+between(10000,99999);
  return Object.assign({status:'Active',industry:pick(INDS),terms:pick(['Net 15','Net 30','Net 30','Net 45']),credit:pick([300000,500000,1000000,1500000]),outstanding:0,city:cy[0],
    gst:cy[2]+L1()+L1()+L1()+L1()+L1()+between(1000,9999)+L1()+'1Z'+L1(),email:'contact@'+slug+'.in',phone:phone(),
    contact:{name:first+' '+last,role:pick(ROLES),email:(first+'.'+last).toLowerCase()+'@'+slug+'.in',phone:phone()},others:[],
    billing:[between(2,240)+' '+pick(STREETS),pick(AREAS),cy[0]+', '+cy[1]+' '+pin,'India'],delivery:['Warehouse No. '+between(1,12),'Industrial Area',cy[0]+' '+pin,'India'],events:[]},o);
}
const BASE=[
 {id:'CL-1023',legal:'ABC Retail Pvt. Ltd.',trade:'ABC Retail',industry:'Retail',city:'Mumbai',gst:'27AAACB1234F1ZV',email:'contact@abcretail.com',phone:'+91 98765 43210',terms:'Net 30',credit:1000000,outstanding:640000,
  contact:{name:'Rahul Sharma',role:'Purchase Manager',email:'rahul@abcretail.com',phone:'+91 98765 43211'},
  others:[{name:'Priya Mehta',role:'Accounts Manager',email:'priya@abcretail.com',phone:'+91 98765 43212'}],
  billing:['123 Business Park','Andheri East','Mumbai, Maharashtra 400069','India'],delivery:['Warehouse No. 5','MIDC Industrial Area','Navi Mumbai 400710','India'],
  events:[{date:'2024-09-03',html:'New contact <b>Priya Mehta</b> added'}]},
 {id:'CL-1011',legal:'Sunrise Traders',trade:'Sunrise Traders',city:'Pune',terms:'Net 30',credit:1500000,outstanding:0},
 {id:'CL-1008',legal:'Metro Distributors Pvt. Ltd.',trade:'Metro Distributors',city:'Delhi',terms:'Net 7',credit:500000,outstanding:125000},
 {id:'CL-1015',legal:'Global Suppliers Ltd.',trade:'Global Suppliers',city:'Bengaluru',terms:'Net 30',credit:1000000,outstanding:0},
 {id:'CL-1019',legal:'City Mart Retail LLP',trade:'City Mart',city:'Ahmedabad',terms:'Net 30',credit:300000,outstanding:50000}
];
BASE.forEach(b=>DB.clients.push(mkClient(b)));
{const used=new Set(DB.clients.map(c=>c.legal));
 for(let i=1;i<=128;i++){const id='CL-'+(1000+i);if(DB.clients.some(c=>c.id===id))continue;
  let trade,legal;do{trade=pick(PRE)+' '+pick(MID);legal=trade+' '+pick(SUF);}while(used.has(legal));used.add(legal);
  const c=mkClient({id,legal,trade,status:RND()<.07?'Inactive':'Active'});c.outstanding=Math.round(c.credit*pick([0,0,.1,.25,.4,.6])/5000)*5000;DB.clients.push(c);}}
DB.clients.sort((a,b)=>a.legal.localeCompare(b.legal));
const cby=id=>DB.clients.find(c=>c.id===id);
const cn=id=>(cby(id)||{trade:'—'}).trade;

/* price list: per-client discounts */
const priceDisc=(cid,sku)=>{if(cid==='CL-1023'&&sku==='CB-10')return 5;let h=0;for(const ch of cid+sku)h=(h*31+ch.charCodeAt(0))>>>0;return h%5===0?[3,5,8,10][h%4]:0;};

/* quotations */
const mkLines=(n,cid)=>shuffle(DB.products.map(p=>p.sku)).slice(0,n).map(sku=>{const p=pby(sku);return{sku,qty:pick([100,200,300,500,1000,1500,2000]),price:p.price,disc:priceDisc(cid,sku),tax:p.tax};});
DB.quotes.push({id:'QT-00124',clientId:'CL-1023',date:'2024-09-14',valid:'2024-09-29',ref:'PO-4471',status:'Accepted',acceptedOn:'2024-09-16',orderId:'SO-10231',notes:'',terms:DB.settings.terms,
  lines:[{sku:'CB-10',qty:2000,price:160,disc:0,tax:18},{sku:'CC-001',qty:1000,price:42,disc:0,tax:18}]});
{const st=[...Array(6).fill('Draft'),...shuffle([...Array(12).fill('Sent'),...Array(3).fill('Accepted')]),...shuffle([...Array(4).fill('Accepted'),...Array(4).fill('Expired')])];
 for(let k=0;k<29;k++){const n=123-k,status=st[k],cid=pick(DB.clients).id,date=addDays('2024-09-16',-Math.round((124-n)*1.5));
  DB.quotes.push({id:'QT-'+String(n).padStart(5,'0'),clientId:cid,date,valid:addDays(date,status==='Expired'?14:45),ref:RND()<.5?'PO-'+between(4000,4900):'',status,acceptedOn:status==='Accepted'?addDays(date,between(1,6)):null,orderId:null,notes:'',terms:DB.settings.terms,lines:mkLines(between(1,3),cid)});}}
DB.quotes.sort((a,b)=>b.id.localeCompare(a.id));
const qby=id=>DB.quotes.find(q=>q.id===id);

/* sales orders */
const mkItems=(status,cid)=>shuffle(DB.products.map(p=>p.sku)).slice(0,between(1,3)).map(sku=>{const p=pby(sku),ordered=pick([200,300,500,800,1000,1500,2000]);
  let delivered=0;if(status==='Delivered')delivered=ordered;else if(status==='Partially Fulfilled')delivered=Math.min(ordered-10,Math.max(10,Math.round(ordered*pick([.25,.4,.5,.6,.75])/10)*10));
  return{sku,ordered,delivered,price:Math.round(p.price*(1-priceDisc(cid,sku)/100)),tax:p.tax};});
DB.orders.push({id:'SO-10231',clientId:'CL-1023',date:'2024-09-17',expected:'2024-09-25',status:'Processing',terms:'Net 30',quoteId:'QT-00124',
  items:[{sku:'CB-10',ordered:2000,delivered:600,price:160,tax:18},{sku:'CC-001',ordered:1000,delivered:0,price:42,tax:18}]});
[['SO-10221','2024-09-05','Delivered'],['SO-10210','2024-08-22','Delivered'],['SO-10198','2024-08-10','Cancelled'],['SO-10187','2024-07-28','Delivered']].forEach(([id,date,status])=>
  DB.orders.push({id,clientId:'CL-1023',date,expected:addDays(date,8),status,terms:'Net 30',quoteId:null,items:mkItems(status,'CL-1023')}));
{const skip=[10221,10210,10198,10187],pool=[];for(let n=10230;n>=10185;n--)if(!skip.includes(n))pool.push(n);
 const st=[...Array(12).fill('Pending'),...shuffle([...Array(17).fill('Processing'),...Array(8).fill('Partially Fulfilled')]),...shuffle([...Array(4).fill('Delivered'),'Cancelled'])];
 pool.forEach((n,i)=>{const status=st[i],cid=pick(DB.clients).id,date=addDays('2024-09-17',-Math.round((10231-n)*1.22));
  DB.orders.push({id:'SO-'+n,clientId:cid,date,expected:addDays(date,between(6,14)),status,terms:cby(cid).terms,quoteId:null,items:mkItems(status,cid)});});}
DB.orders.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
const oby=id=>DB.orders.find(o=>o.id===id);
const orderTotals=o=>docCalc(o.items.map(i=>({qty:i.ordered,price:i.price,disc:0,tax:i.tax})));
const orderQty=o=>({ordered:o.items.reduce((a,i)=>a+i.ordered,0),delivered:o.items.reduce((a,i)=>a+i.delivered,0)});
const orderPct=o=>{const q=orderQty(o);return q.ordered?Math.round(q.delivered/q.ordered*100):0;};

/* deliveries (derived from orders) */
{let n=400;const add=(o,date,status,items)=>DB.deliveries.push({id:'DL-0'+(++n),orderId:o.id,clientId:o.clientId,date,status,items});
 [...DB.orders].reverse().forEach(o=>{const done=o.items.filter(i=>i.delivered>0);
  if(done.length)add(o,o.id==='SO-10231'?TODAY:minDate(TODAY,addDays(o.date,between(2,6))),'Delivered',done.map(i=>({sku:i.sku,qty:i.delivered})));});
 let s=0;DB.orders.filter(o=>o.status==='Processing'&&o.id!=='SO-10231').slice(0,9).forEach((o,i)=>{s++;
  add(o,addDays(TODAY,i<3?0:between(1,7)),i<3?'In Transit':'Scheduled',o.items.map(i=>({sku:i.sku,qty:i.ordered})));});}
DB.deliveries.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
const dby=id=>DB.deliveries.find(d=>d.id===id);

/* invoices */
DB.invoices.push(
 {id:'INV-00421',clientId:'CL-1023',orderId:null,issue:'2024-09-15',due:'2024-10-15',status:'Partial',amount:500000,paid:200000},
 {id:'INV-00420',clientId:'CL-1011',orderId:null,issue:'2024-09-10',due:'2024-10-10',status:'Paid',amount:280000,paid:280000},
 {id:'INV-00419',clientId:'CL-1008',orderId:null,issue:'2024-09-05',due:'2024-09-12',status:'Overdue',amount:125000,paid:0},
 {id:'INV-00418',clientId:'CL-1015',orderId:null,issue:'2024-08-28',due:'2024-09-28',status:'Paid',amount:340000,paid:340000},
 {id:'INV-00417',clientId:'CL-1019',orderId:null,issue:'2024-08-20',due:'2024-09-20',status:'Partial',amount:90000,paid:40000});
{const st=[...Array(5).fill('Draft'),...Array(12).fill('Issued'),...shuffle([...Array(6).fill('Partial'),...Array(12).fill('Paid')]),'Overdue','Overdue'];
 for(let k=0;k<37;k++){const n=416-k,status=st[k],issue=addDays('2024-09-15',-(421-n)),amount=round500(between(25000,650000));
  const paid=status==='Paid'?amount:status==='Partial'?round500(amount*pick([.25,.4,.5,.6])):0;
  DB.invoices.push({id:'INV-'+String(n).padStart(5,'0'),clientId:pick(DB.clients).id,orderId:null,issue,due:addDays(issue,30),status,amount,paid});}}
DB.invoices.sort((a,b)=>b.id.localeCompare(a.id));
const iby=id=>DB.invoices.find(i=>i.id===id);

/* payments (derived from invoices) */
{const M=['Bank transfer','UPI','Cheque','NEFT'];
 DB.invoices.filter(i=>i.paid>0).forEach(i=>{const date=i.id==='INV-00420'?'2024-09-18':i.id==='INV-00421'?'2024-09-17':minDate(TODAY,addDays(i.issue,between(4,24)));
  DB.payments.push({id:'',clientId:i.clientId,invoiceId:i.id,date,method:pick(M),amount:i.paid,ref:'UTR'+between(100000000,999999999)});});
 DB.payments.sort((a,b)=>a.date.localeCompare(b.date)||a.invoiceId.localeCompare(b.invoiceId)).forEach((p,i)=>p.id='PAY-'+(5001+i));DB.payments.reverse();}

/* tasks + activity feed */
DB.tasks=[
 {id:1,title:'Send payment reminder for INV-00419',due:'2024-09-18',prio:'High',done:false,rel:'Metro Distributors'},
 {id:2,title:'Reorder Circuit Breaker (CBR-01), below reorder level',due:'2024-09-19',prio:'High',done:false,rel:'Inventory'},
 {id:3,title:'Follow up on open quotation with City Mart',due:'2024-09-19',prio:'Medium',done:false,rel:'City Mart'},
 {id:4,title:'Confirm delivery slot for SO-10231',due:'2024-09-20',prio:'Medium',done:false,rel:'ABC Retail'},
 {id:5,title:'Update Electrical price list for Q4',due:'2024-09-27',prio:'Low',done:false,rel:'Products'},
 {id:6,title:'Reconcile September payments',due:'2024-09-30',prio:'Medium',done:false,rel:'Payments'},
 {id:7,title:'Share Q3 stock report with management',due:'2024-09-16',prio:'Medium',done:true,rel:'Reports'},
 {id:8,title:'Add Priya Mehta as contact for ABC Retail',due:'2024-09-03',prio:'Low',done:true,rel:'ABC Retail'}];
DB.feed=[
 {tone:'ok',icon:'checkc',html:`Sales Order ${lnk('/orders/SO-10231','SO-10231')} created`,time:'2 hours ago'},
 {tone:'info',icon:'file',html:`Quotation ${lnk('/quotations','QT-00124')} accepted by ABC Retail`,time:'4 hours ago'},
 {tone:'ok',icon:'card',html:`Payment of ₹2,80,000 received from Sunrise Traders`,time:'6 hours ago'},
 {tone:'warn',icon:'alert',html:`Product ${lnk('/inventory?st=Needs%20reorder','CB-10')} is below reorder level`,time:'8 hours ago'},
 {tone:'info',icon:'truck',html:`Delivery ${lnk('/deliveries','DL-0412')} marked as delivered`,time:'Yesterday'},
 {tone:'ok',icon:'receipt',html:`Invoice ${lnk('/invoices','INV-00421')} issued to ABC Retail`,time:'Yesterday'},
 {tone:'warn',icon:'alert',html:`Invoice ${lnk('/invoices?tab=Overdue','INV-00419')} is overdue`,time:'2 days ago'}];
const logFeed=(tone,icon,html)=>DB.feed.unshift({tone,icon,html,time:'Just now'});
