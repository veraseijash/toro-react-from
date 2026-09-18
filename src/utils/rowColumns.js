export function getColumnWidth(column) {
  const width = Number.parseFloat(column.style?.width);
  if (Number.isFinite(width) && width > 0) return width;
  const span = Number(column.col);
  return span > 0 ? span / 12 * 100 : 1;
}

export function removeColumn(columns, index) {
  if (columns.length <= 1 || !Number.isInteger(index) || !columns[index]) return columns;
  const neighborIndex = index < columns.length - 1 ? index + 1 : index - 1;
  const width = Number((getColumnWidth(columns[index]) + getColumnWidth(columns[neighborIndex])).toFixed(4));
  return columns.map((column, currentIndex) => currentIndex === neighborIndex
    ? { ...column, style: { ...column.style, width: `${width}%` } }
    : column).filter((_, currentIndex) => currentIndex !== index);
}
