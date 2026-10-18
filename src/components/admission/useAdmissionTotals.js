import { useEffect, useState } from 'react';
import { getTaxs } from '../../services/admissionService';

export default function useAdmissionTotals(tariff) {
  const [taxes, setTaxes] = useState([]);
  const [taxError, setTaxError] = useState('');
  const [loadingTaxes, setLoadingTaxes] = useState(true);
  const [discount, setDiscount] = useState('0');
  const [selectedExams, setSelectedExams] = useState([]);
  const discountRate = Math.min(100, Math.max(0, Number(discount) || 0));
  const selectedRows = selectedExams.map(({ exam, quantity }) => {
    const tax = exam.tax ?? taxes.find((item) => String(item.id) === String(exam.tax_id));
    const taxRate = Number(tax?.value) || 0;
    const unitPrice = Number(exam[`cost${tariff}`]) || 0;
    const subtotal = unitPrice * quantity;
    const total = Math.round(unitPrice + unitPrice * taxRate / 100) * quantity;
    return { exam, quantity, tax, taxRate, unitPrice, subtotal, total };
  });
  const subtotal = selectedRows.reduce((sum, row) => sum + row.subtotal, 0);
  const discountAmount = subtotal * discountRate / 100;
  const taxTotals = taxes.map((tax) => {
    const rows = selectedRows.filter((row) => String(row.tax?.id ?? row.exam.tax_id) === String(tax.id));
    const base = rows.reduce((sum, row) => sum + row.unitPrice * row.quantity, 0);
    return {
      ...tax,
      base,
      amount: Math.round(base * (Number(tax.value) || 0)) / 100,
    };
  });
  const totalToPay = subtotal - discountAmount + taxTotals.reduce((sum, tax) => sum + tax.amount, 0);

  useEffect(() => {
    let active = true;
    const loadTaxes = async () => {
      try {
        const response = await getTaxs();
        const rows = Array.isArray(response) ? response : response?.taxs ?? response?.taxes ?? response?.data;
        if (response?.success === false || response?.error || !Array.isArray(rows)) throw new Error('Respuesta inválida');
        if (active) setTaxes(rows.filter((tax) => Number(tax.hide) === 0));
      } catch {
        if (active) setTaxError('No se pudieron cargar los impuestos.');
      } finally {
        if (active) setLoadingTaxes(false);
      }
    };
    loadTaxes();
    return () => { active = false; };
  }, []);

  return { selectedRows, setSelectedExams, discount, setDiscount, subtotal, discountAmount, taxTotals, totalToPay, loadingTaxes, taxError };
}
