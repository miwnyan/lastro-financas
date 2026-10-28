(function (root, factory) {
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  root.LastroCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const categories=['Moradia','Alimentação','Transporte','Saúde','Lazer','Educação','Trabalho','Outros'];
  function validate(data){
    const description=String(data.description||'').trim();
    const kind=data.kind==='entrada'?'entrada':data.kind==='saida'?'saida':null;
    const amount=Number(data.amount);
    const category=String(data.category||'');
    const date=String(data.date||'');
    if(description.length<2 || description.length>100)throw Error('Descrição: entre 2 e 100 caracteres.');
    if(!kind)throw Error('Tipo de lançamento inválido.');
    if(!Number.isFinite(amount)||amount<=0||amount>1e9)throw Error('Informe um valor maior que zero e de até R$ 1 bilhão.');
    if(Math.abs(amount*100-Math.round(amount*100))>1e-6)throw Error('Use no máximo duas casas decimais.');
    if(!categories.includes(category))throw Error('Escolha uma categoria válida.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error('Informe uma data válida.');
    return {description,kind,cents:Math.round(amount*100),category,date};
  }
  function create(data,id,now){return {id:id||crypto.randomUUID(),...validate(data),createdAt:now||new Date().toISOString()};}
  function update(old,data){return {...old,...validate(data)};}
  function monthFilter(items,month){return month==='todos'?items:items.filter(x=>x.date.slice(0,7)===month);}
  function totals(items){const entries=items.filter(x=>x.kind==='entrada').reduce((n,x)=>n+x.cents,0);const exits=items.filter(x=>x.kind==='saida').reduce((n,x)=>n+x.cents,0);return {entries,exits,balance:entries-exits};}
  function byCategory(items){const map=new Map();items.filter(x=>x.kind==='saida').forEach(x=>map.set(x.category,(map.get(x.category)||0)+x.cents));return Array.from(map,([category,cents])=>({category,cents})).sort((a,b)=>b.cents-a.cents);}
  function exportCsv(items){const protect=v=>{let s=String(v);if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};const rows=[['Data','Descrição','Tipo','Categoria','Valor (BRL)'],...items.map(x=>[x.date,x.description,x.kind,x.category,(x.kind==='saida'?'-':'')+(x.cents/100).toFixed(2)])];return '\uFEFF'+rows.map(row=>row.map(protect).join(';')).join('\r\n');}
  return {categories,validate,create,update,monthFilter,totals,byCategory,exportCsv};
});
