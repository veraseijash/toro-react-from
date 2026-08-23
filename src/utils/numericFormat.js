export const DEFAULT_NUMERIC_FORMAT = {
  prefix: '',
  suffix: '',
  decimalPlaces: 2,
  decimalSeparator: ',',
  thousandsSeparator: '.',
  useThousandsSeparator: true,
};

const parseNumericFormat = (numericFormat) => {
  if (!numericFormat) return DEFAULT_NUMERIC_FORMAT;

  let parsedFormat = numericFormat;

  for (let attempt = 0; attempt < 2 && typeof parsedFormat === 'string'; attempt += 1) {
    try {
      parsedFormat = JSON.parse(parsedFormat);
    } catch {
      return DEFAULT_NUMERIC_FORMAT;
    }
  }

  return parsedFormat && typeof parsedFormat === 'object'
    ? { ...DEFAULT_NUMERIC_FORMAT, ...parsedFormat }
    : DEFAULT_NUMERIC_FORMAT;
};

const NUMERIC_FORMAT_STORAGE_KEY = 'numeric_format';
let currentNumericFormat = parseNumericFormat(
  localStorage.getItem(NUMERIC_FORMAT_STORAGE_KEY),
);

export const setNumericFormatConfiguration = (numericFormat) => {
  currentNumericFormat = parseNumericFormat(numericFormat);
  localStorage.setItem(NUMERIC_FORMAT_STORAGE_KEY, JSON.stringify(currentNumericFormat));
  return currentNumericFormat;
};

export const getNumericFormatConfiguration = () => currentNumericFormat;

export const clearNumericFormatConfiguration = () => {
  currentNumericFormat = DEFAULT_NUMERIC_FORMAT;
  localStorage.removeItem(NUMERIC_FORMAT_STORAGE_KEY);
};

/**
 * Formatea un numero usando la configuracion numeric_format del laboratorio.
 *
 * @param {number|string} number Numero que se desea formatear.
 * @param {number} decimalPlaces Cantidad de decimales que se mostraran.
 * @param {string} prefix Texto que se agregara antes del numero.
 * @param {string} suffix Texto que se agregara despues del numero.
 * @returns {string} Numero formateado.
 */
export const numericFormat = (
  number,
  decimalPlaces,
  prefix = '',
  suffix = '',
) => {
  const numericValue = Number(number);

  if (!Number.isFinite(numericValue)) {
    throw new TypeError('El valor entregado a numericFormat debe ser un numero valido');
  }

  const format = currentNumericFormat;
  const requestedDecimalPlaces = Number(decimalPlaces);
  const decimals = Number.isInteger(requestedDecimalPlaces) && requestedDecimalPlaces >= 0
    ? requestedDecimalPlaces
    : format.decimalPlaces;

  const [integerPart, decimalPart] = Math.abs(numericValue).toFixed(decimals).split('.');
  const formattedInteger = format.useThousandsSeparator
    ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, format.thousandsSeparator)
    : integerPart;
  const sign = numericValue < 0 ? '-' : '';
  const formattedDecimals = decimalPart
    ? `${format.decimalSeparator}${decimalPart}`
    : '';

  return `${prefix}${sign}${formattedInteger}${formattedDecimals}${suffix}`;
};

export default numericFormat;
