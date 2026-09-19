import {calculate,fundRate} from './mortgage.mjs';
const $ = id => document.getElementById(id);
const money = n => n.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
let type='commercial',method='annuity',commercialCustom=false,fundCustom=false,current=null;
function referenceRate(){const long=Number($('years').value)>5;return $('region').value==='suzhou' && $('home').value==='first' && long?3.05:long?3.5:3;}
function applyReferences(){
  if(!commercialCustom)$('commercial-rate').value=referenceRate();
  if(!fundCustom)$('fund-rate').value=fundRate($('home').value,Number($('years').value));
  const example=$('region').value==='suzhou'&&$('home').value==='first'&&Number($('years').value)>5;
  $('rate-badge').textContent=commercialCustom?'自定义利率':example?'苏州合同示例':'LPR 基准测算';
  $('rate-hint').textContent=example?'参考苏州官方存量首套合同示例：3.50% − 45BP = 3.05%。实际利率请填写银行报价。':'全国无统一商贷成交利率。此处以 '+(Number($('years').value)>5?'5 年期以上 LPR 3.50%':'1 年期 LPR 3.00%')+' 作测算基准，请按合同填写实际执行利率。';
  $('fund-badge').textContent=fundCustom?'自定义利率':$('home').value==='first'?'政策参考':'政策下限测算';
  $('fund-hint').textContent=($('home').value==='first'?'首套政策参考；':'二套按政策下限测算，实际利率可能更高；')+'期限 '+(Number($('years').value)<=5?'≤5 年':'>5 年')+'，参考 '+fundRate($('home').value,Number($('years').value)).toFixed(3).replace(/0+$/,'').replace(/\.$/,'')+'%。'+(fundCustom?'已保留自定义利率。':'');
}
function number(id,label,min,max,integer=false){const raw=$(id).value.trim(),v=Number(raw);if(raw===''||!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))throw new Error(label+'请填写 '+min+'–'+max+' 之间的'+(integer?'整数。':'有效数字。'));return v;}
function render(){
  applyReferences();
  try{
    const years=number('years','贷款期限',1,30,true),loans=[];
    if(type!=='fund')loans.push({amount:number('commercial-amount','商贷金额（万元）',.01,100000)*10000,rate:number('commercial-rate','商贷年利率（%）',0,30)});
    if(type!=='commercial')loans.push({amount:number('fund-amount','公积金金额（万元）',.01,100000)*10000,rate:number('fund-rate','公积金年利率（%）',0,30)});
    const annuity=calculate(loans,years*12,'annuity'),equal=calculate(loans,years*12,'equal');current=method==='annuity'?annuity:equal;
    $('error').hidden=true;$('results').classList.remove('invalid');$('results').removeAttribute('aria-hidden');$('schedule-details').hidden=false;
    $('monthly').textContent=money(current.first);$('result-title').textContent=method==='annuity'?'预计每月还款':'预计首月还款';$('result-tag').textContent=(method==='annuity'?'等额本息':'等额本金')+' · '+years*12+' 期';
    $('monthly-note').textContent=method==='annuity'?'本息合计，按当前利率固定测算':'每月递减约 ¥'+money(current.decrease)+' · 末月 ¥'+money(current.last);
    for(const [id,val] of [['total-principal',current.principal],['total-interest',current.interest],['total-payment',current.total]])$(id).innerHTML=money(val/10000)+'<small>万元</small>';
    const pct=current.principal/current.total*100;$('principal-bar').style.width=pct+'%';$('principal-pct').textContent=pct.toFixed(1)+'%';$('interest-pct').textContent=(100-pct).toFixed(1)+'%';
    for(const [key,res] of [['annuity',annuity],['equal',equal]]){ $('compare-'+key+'-payment').textContent='¥'+money(res.first);$('compare-'+key+'-interest').textContent=money(res.interest/10000)+' 万元';$('choose-'+key).classList.toggle('selected',key===method);$('choose-'+key).setAttribute('aria-pressed',String(key===method));}
    const saving=Math.max(0,annuity.interest-equal.interest);$('comparison-note').textContent=saving<.005?'当前利率为 0%，两种方式的月供和总还款相同。':'等额本金可少付利息约 '+money(saving/10000)+' 万元，首月多还 ¥'+money(Math.max(0,equal.first-annuity.first))+'。';
    const annual=Array.from({length:years},(_,i)=>current.rows.slice(i*12,(i+1)*12).reduce((a,r)=>({principal:a.principal+r.principal,interest:a.interest+r.interest}),{principal:0,interest:0}));
    const max=Math.max(...annual.map(r=>r.principal+r.interest));$('chart').replaceChildren(...annual.map((r,i)=>{const bar=document.createElement('div');bar.className='bar';bar.style.height=((r.principal+r.interest)/max*100)+'%';bar.tabIndex=0;const desc='第 '+(i+1)+' 年：本金 '+money(r.principal)+' 元，利息 '+money(r.interest)+' 元';bar.title=desc;bar.setAttribute('aria-label',desc);bar.innerHTML='<div class="interest" style="height:'+r.interest/(r.principal+r.interest)*100+'%"></div><div class="principal" style="flex:1"></div>';return bar;}));$('chart-end').textContent='第 '+years+' 年';
    const oldYear=Math.min(Number($('schedule-year').value)||1,years);$('schedule-year').innerHTML=Array.from({length:years},(_,i)=>'<option value="'+(i+1)+'">第 '+(i+1)+' 年</option>').join('');$('schedule-year').value=oldYear;renderSchedule();
  }catch(err){current=null;$('error').textContent=err.message;$('error').hidden=false;$('results').classList.add('invalid');$('results').setAttribute('aria-hidden','true');$('schedule-details').hidden=true;}
}
function renderSchedule(){if(!current)return;const y=Number($('schedule-year').value);$('schedule-body').innerHTML=current.rows.slice((y-1)*12,y*12).map(r=>'<tr><td>第 '+r.month+' 期</td><td>'+money(r.payment)+'</td><td>'+money(r.principal)+'</td><td>'+money(r.interest)+'</td><td>'+money(r.balance)+'</td></tr>').join('');}
function setType(next){type=next;document.querySelectorAll('[data-type]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===type)));$('commercial-block').hidden=$('commercial-rate-block').hidden=type==='fund';$('fund-block').hidden=$('fund-rate-block').hidden=type==='commercial';render();}
document.querySelectorAll('[data-type]').forEach(b=>b.addEventListener('click',()=>setType(b.dataset.type)));
for(const id of ['region','home'])$(id).addEventListener('change',()=>{commercialCustom=false;fundCustom=false;render();});
for(const id of ['commercial-amount','fund-amount','commercial-rate','fund-rate','years'])$(id).addEventListener('input',()=>{if(id==='commercial-rate')commercialCustom=true;if(id==='fund-rate')fundCustom=true;if(id==='years')$('year-slider').value=$('years').value;render();});
$('year-slider').addEventListener('input',()=>{$('years').value=$('year-slider').value;render();});
document.querySelectorAll('[name=method]').forEach(r=>r.addEventListener('change',()=>{method=r.value;render();}));
for(const m of ['annuity','equal'])$('choose-'+m).addEventListener('click',()=>{method=m;document.querySelector('[name=method][value='+m+']').checked=true;render();});
$('restore-rate').addEventListener('click',()=>{commercialCustom=false;render();});$('restore-fund').addEventListener('click',()=>{fundCustom=false;render();});
$('loan-form').addEventListener('submit',e=>{e.preventDefault();render();if(current){$('results').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}else{$('error').scrollIntoView({block:'center'});}});
$('schedule-year').addEventListener('change',renderSchedule);
$('schedule-details').addEventListener('toggle',()=>{document.querySelector('summary>span').innerHTML=$('schedule-details').open?'收起明细 <b>−</b>':'展开明细 <b>＋</b>';});
$('reset').addEventListener('click',()=>{$('loan-form').reset();method='annuity';commercialCustom=false;fundCustom=false;$('schedule-year').value=1;setType('commercial');});
render();
