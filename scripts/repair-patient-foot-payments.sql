-- Repair only the empty JSON values in the patients reported during admission.
-- Inspect affected rows before applying the update.
START TRANSACTION;

SELECT id, name, foot_payments
FROM patients
WHERE id IN (135, 136);

UPDATE patients
SET foot_payments = '[]'
WHERE id IN (135, 136)
  AND foot_payments IN ('', '""');

SELECT id, name, foot_payments
FROM patients
WHERE id IN (135, 136);

COMMIT;
