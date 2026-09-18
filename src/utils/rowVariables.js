// Copy a row and assign fresh numbers to its variable references.
export function copyRowWithNewVariables(row, rows) {
  let lastNumber = 0n;
  const visit = (value, transform) => {
    if (typeof value === 'string') return transform(value);
    if (Array.isArray(value)) return value.map((item) => visit(item, transform));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item, transform)]));
    }
    return value;
  };

  visit(rows, (value) => {
    for (const match of value.matchAll(/\{\{variable_(\d+)\}\}/g)) {
      const number = BigInt(match[1]);
      if (number > lastNumber) lastNumber = number;
    }
    return value;
  });

  const replacements = new Map();
  return visit(row, (value) => value.replace(/\{\{variable_(\d+)\}\}/g, (token) => {
    if (!replacements.has(token)) replacements.set(token, `{{variable_${++lastNumber}}}`);
    return replacements.get(token);
  }));
}
