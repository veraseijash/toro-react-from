import '../../styles/CashClosingPrint.css';

const formatAmount = (value) => new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

export default function CashClosingPrint({ date, cashier, totals, deposits }) {
  return (
    <article className="cash-closing-print" aria-label="Cierre de caja para imprimir">
      <h1>CIERRE DE CAJA {date}</h1>
      <p>Cajero: {cashier}</p>
      <table>
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Entrada</th>
            <th>Salida</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {totals.map((total, index) => (
            <tr key={total.id ?? index}>
              <td>{total.text}</td>
              <td>{formatAmount(total.ingress)}</td>
              <td>{formatAmount(total.egress)}</td>
              <td><strong>{formatAmount((Number(total.ingress) || 0) - (Number(total.egress) || 0))}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Depósitos:</h2>
      {deposits.map((deposit, index) => (
        <section className="cash-closing-print-deposit" key={deposit.localId ?? index}>
          <span className="cash-closing-print-number">{index + 1}</span>
          <p>Banco {deposit.bank}</p>
          <p>N° de planilla {deposit.number}</p>
          <p>Total depósito {formatAmount(deposit.amount)}</p>
          <p>Total efectivo {formatAmount(deposit.cash)}</p>
        </section>
      ))}
    </article>
  );
}
