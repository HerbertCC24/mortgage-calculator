export function fundRate(home, years) {
  return home === 'first' ? (years <= 5 ? 2.1 : 2.6) : (years <= 5 ? 2.525 : 3.075);
}
export function amortize(principal, annualRate, months, method = 'annuity') {
  if (!Number.isFinite(principal) || principal < 0 || !Number.isFinite(annualRate) || annualRate < 0 || annualRate > 30 || !Number.isInteger(months) || months < 1 || months > 360 || !['annuity','equal'].includes(method)) throw new Error('贷款参数无效');
  const r = annualRate / 1200;
  const payment = r === 0 ? principal / months : principal * r / -Math.expm1(-months * Math.log1p(r));
  let balance = principal;
  return Array.from({length: months}, (_, i) => {
    const interest = balance * r;
    const capital = i === months - 1 ? balance : Math.min(balance, method === 'equal' ? principal / months : payment - interest);
    balance = Math.max(0, balance - capital);
    return {month: i + 1, principal: capital, interest, payment: capital + interest, balance};
  });
}
export function calculate(loans, months, method) {
  const parts = loans.map(l => amortize(l.amount, l.rate, months, method));
  const rows = Array.from({length: months}, (_, i) => parts.reduce((a,p) => ({month:i+1,principal:a.principal+p[i].principal,interest:a.interest+p[i].interest,payment:a.payment+p[i].payment,balance:a.balance+p[i].balance}),{principal:0,interest:0,payment:0,balance:0}));
  const interest = rows.reduce((a,r)=>a+r.interest,0);
  const principal = loans.reduce((a,l)=>a+l.amount,0);
  return {rows,interest,principal,total:principal+interest,first:rows[0].payment,last:rows.at(-1).payment,decrease:rows.length>1?rows[0].payment-rows[1].payment:0};
}
