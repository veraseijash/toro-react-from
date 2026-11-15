export const checkAdmissionResponse = (response) => {
  if (response?.success === false || response?.ok === false || response?.error) {
    throw new Error(response?.message || 'El servicio rechazó el registro.');
  }
  return response;
};

// Keep progress between retries so confirmed writes are not repeated.
export default async function saveAdmission(progress, services) {
  if (progress.patientId == null) {
    const response = checkAdmissionResponse(await services.createPatient(progress.patient));
    const data = response?.patient ?? response?.data ?? response;
    const patientId = Number(data?.patientId ?? data?.id ?? response?.patientId);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      throw new Error('El servicio no devolvió un patientId válido. Verifica el registro antes de reintentar.');
    }
    progress.patientId = patientId;
  }
  if (!progress.positioned) {
    const response = checkAdmissionResponse(await services.getPatientsTotalByDate(progress.date));
    const data = response?.data ?? response;
    const rawTotal = data?.total ?? data?.count ?? data;
    const total = rawTotal == null || rawTotal === '' ? NaN : Number(rawTotal);
    if (!Number.isInteger(total) || total < 1) throw new Error('El servicio no devolvió un total diario válido.');
    checkAdmissionResponse(await services.updatePatient(progress.patientId, { patient_position: total }));
    progress.patientPosition = total;
    progress.positioned = true;
  }
  while (progress.nextExam < progress.exams.length) {
    checkAdmissionResponse(await services.createExam({ ...progress.exams[progress.nextExam], patientsId: progress.patientId }));
    progress.nextExam += 1;
  }
  if (progress.wayPay?.id_client === 1) {
    if (progress.wayPayId == null) {
      const response = checkAdmissionResponse(await services.createWaypay({
        ...progress.wayPay, id_patients: progress.patientId,
      }));
      const data = response?.waypay ?? response?.wayPay ?? response?.data ?? response;
      const wayPayId = Number(data?.id ?? data?.wayPayId ?? response?.wayPayId);
      if (!Number.isInteger(wayPayId) || wayPayId <= 0) {
        throw new Error('El servicio no devolvió un wayPayId válido. Verifica el registro antes de reintentar.');
      }
      progress.wayPayId = wayPayId;
    }
    while (progress.nextPayment < progress.paymentItems.length) {
      checkAdmissionResponse(await services.createWaypayitems({
        ...progress.paymentItems[progress.nextPayment], id_way_pay: progress.wayPayId,
      }));
      progress.nextPayment += 1;
    }
  }
  return progress.patientId;
}
