export const dateSlicingRule = ['error', {
  selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name=/^(slice|split|substring)$/][callee.object.type="CallExpression"][callee.object.callee.property.name="toISOString"]',
  message: 'Use todayIST()/toDateString(); toISOString shifts dates across time zones',
}];
