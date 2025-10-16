export function splitExpenses(expenses, participants) {
  const balances = {};

  participants.forEach(p => balances[p] = 0);

  const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  const share = participants.length > 0 ? total / participants.length : 0;

  expenses.forEach(exp => {
    balances[exp.paidBy] += parseFloat(exp.amount); 
  });

  participants.forEach(p => {
    balances[p] = balances[p] - share;
  });
  
const settlements = [];
const creditors = Object.entries(balances)
  .filter(([_, amount]) => amount > 0)
  .map(([p, amt]) => ({ person: p, amount: amt }));
const debtors = Object.entries(balances)
  .filter(([_, amount]) => amount < 0)
  .map(([p, amt]) => ({ person: p, amount: -amt })); 

let i = 0, j = 0;
while (i < debtors.length && j < creditors.length) {
  const debtor = debtors[i];
  const creditor = creditors[j];
  const minAmt = Math.min(debtor.amount, creditor.amount);

  settlements.push({
    from: debtor.person,
    to: creditor.person,
    amount: minAmt,
  });

  debtor.amount -= minAmt;
  creditor.amount -= minAmt;

  if (debtor.amount === 0) i++;
  if (creditor.amount === 0) j++;
}


  return { balances, settlements };
}
