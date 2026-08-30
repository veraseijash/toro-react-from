import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { getLaboratory } from '../../services/laboratoryService';
import { getPatientIdValidatedResult } from '../../services/patientsService';
import { getUserById } from '../../services/userService';
import { IMAGES_BASE_URL } from '../../config/appConfig';

const APPROVED_RESULTS_MESSAGE = 'Los exámenes reportados deben haber sido aprobados.';
const PRINT_BODY_HEIGHT = '205mm';

const normalizeResponse = (response) => {
  if (response && Object.prototype.hasOwnProperty.call(response, 'patient')) {
    return response.patient;
  }
  if (response && Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data;
  }
  return response;
};

const isEmptyResponse = (value) => (
  value == null
  || (typeof value === 'string' && value.trim() === '')
  || (Array.isArray(value) && value.length === 0)
  || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
);

const replaceMarker = (html, marker, value) => (
  html.split(marker).join(String(value ?? ''))
);

const getLogoUrl = (logo) => {
  if (!logo) return '';
  if (/^(?:https?:)?\/\//i.test(logo) || String(logo).startsWith('data:')) return logo;
  return `${IMAGES_BASE_URL}/${String(logo).replace(/^\/+/, '')}`;
};

const buildHeadHtml = (template, laboratory, patient, isPrint) => {
  if (!template) return '';

  let address = `${laboratory?.address ?? ''}<br>Teléfonos: ${laboratory?.phone_1 ?? ''}`;
  if (laboratory?.phone_2) address += `  --  ${laboratory.phone_2}`;
  address += `<br>Correo: ${laboratory?.email ?? ''}`;
  if (laboratory?.url) address += `<br>${laboratory.url}`;

  const replacements = {
    '[Label_Laboratorio]': laboratory?.business_name,
    '[Label_domicilio]': address,
    '[logo]': getLogoUrl(laboratory?.logo),
    '[NoPaciente]': patient?.patient_position,
    '[Nombre]': patient?.name,
    '[Edad]': [patient?.age, patient?.month_year].filter(Boolean).join(' '),
    '[CI]': patient?.document_number,
    '[Fecha]': patient?.admission_date,
    '[alto_body]': isPrint ? PRINT_BODY_HEIGHT : '680px',
  };

  return Object.entries(replacements).reduce(
    (html, [marker, value]) => replaceMarker(html, marker, value),
    template,
  );
};

const getApprovedExams = (patient) => {
  if (Array.isArray(patient)) return patient;
  return ['exams', 'results', 'validated_results', 'validatedResults']
    .map((key) => patient?.[key])
    .find(Array.isArray) ?? [];
};

const addResultFontSize = (result) => String(result ?? '').replace(
  /<p(\s|>)/gi,
  '<p style="font-size: 10px;"$1',
);

const addApprover = (template, user) => {
  let html = template;

  if (!user) {
    html = replaceMarker(html, '[Label_bionalista]', '');
    html = html.replace(/<img\b[^>]*\[firma\][^>]*\/?\s*>/gi, '');
    return replaceMarker(html, '[firma]', '');
  }

  html = replaceMarker(
    html,
    '[Label_bionalista]',
    `${user.name ?? ''}<br>${user.college_number ?? ''}`,
  );
  return replaceMarker(html, '[firma]', getLogoUrl(user.url_signature));
};

const buildReportContent = async (patient, headTemplate, maximumRowsReport) => {
  const exams = getApprovedExams(patient);
  const approverIds = [...new Set(exams.map((exam) => exam?.approved_id).filter(Boolean))];
  const approvers = new Map();

  await Promise.all(approverIds.map(async (approvedId) => {
    try {
      const response = await getUserById(approvedId);
      approvers.set(approvedId, response?.user ?? response?.data ?? response);
    } catch (error) {
      if (error?.response?.status !== 404) {
        console.error(`No fue posible obtener el aprobador ${approvedId}:`, error);
      }
      approvers.set(approvedId, null);
    }
  }));

  const rowLimit = Math.max(Number.parseInt(maximumRowsReport, 10) || 1, 1);
  const pages = [];
  let approvedId = null;
  let remainingRows = rowLimit;
  let resultsContent = '';

  const finishPage = () => {
    if (!resultsContent) return;
    const pageHead = addApprover(headTemplate, approvers.get(approvedId));
    const pageContent = replaceMarker(
      pageHead,
      '[body]',
      `<div class="patient-report-body">${resultsContent}</div>`,
    );
    pages.push(`<section class="patient-report-page">${pageContent}</section>`);
    resultsContent = '';
    remainingRows = rowLimit;
  };

  exams.forEach((exam) => {
    const nextApprovedId = exam?.approved_id;
    const resultSize = Math.max(Number.parseInt(exam?.size, 10) || 0, 0);

    if (approvedId !== null && approvedId !== nextApprovedId) finishPage();
    approvedId = nextApprovedId;

    if (resultsContent && remainingRows - resultSize < 1) finishPage();
    resultsContent += addResultFontSize(exam?.result);
    remainingRows -= resultSize;
  });

  finishPage();
  return pages.join('');
};

function ReportPatient({ patientId, onClose }) {
  const [patient, setPatient] = useState(null);
  const [headHtml, setHeadHtml] = useState('');
  const [reportHtml, setReportHtml] = useState('');
  const [maximumRowsReport, setMaximumRowsReport] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const reportRef = useRef(null);
  const printedPatientId = useRef(null);

  useEffect(() => {
    if (patientId == null) {
      printedPatientId.current = null;
      setPatient(null);
      setHeadHtml('');
      setReportHtml('');
      setMaximumRowsReport(0);
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (patientId == null) return undefined;

    let isActive = true;

    const loadReport = async () => {
      setIsLoading(true);
      setPatient(null);
      setHeadHtml('');
      setReportHtml('');

      try {
        const patientResponse = await getPatientIdValidatedResult(patientId);
        const loadedPatient = normalizeResponse(patientResponse);

        if (isEmptyResponse(loadedPatient) || getApprovedExams(loadedPatient).length === 0) {
          toast.warning(APPROVED_RESULTS_MESSAGE);
          onClose?.();
          return;
        }

        const laboratoryResponse = await getLaboratory();
        const laboratory = laboratoryResponse?.laboratory
          ?? laboratoryResponse?.data
          ?? laboratoryResponse;

        if (!isActive) return;
        const maximumRows = Number(laboratory?.maximum_rows_report) || 0;
        const preparedHeadHtml = buildHeadHtml(
          laboratory?.head_html ?? '',
          laboratory,
          loadedPatient,
          true,
        );
        const preparedReportHtml = await buildReportContent(
          loadedPatient,
          preparedHeadHtml,
          maximumRows,
        );

        if (!isActive) return;
        setPatient(loadedPatient);
        setMaximumRowsReport(maximumRows);
        setHeadHtml(preparedHeadHtml);
        setReportHtml(preparedReportHtml);
      } catch (error) {
        console.error('No fue posible preparar el reporte del paciente:', error);
        if (isActive) {
          toast.error('No fue posible preparar el reporte del paciente.');
          onClose?.();
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadReport();
    return () => { isActive = false; };
  }, [patientId, onClose]);

  useEffect(() => {
    if (!reportHtml || !patient || printedPatientId.current === patientId) return undefined;

    printedPatientId.current = patientId;
    let isActive = true;

    const printReport = async () => {
      const images = Array.from(reportRef.current?.querySelectorAll('img') ?? []);
      await Promise.all(images.map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      }));

      if (document.fonts?.ready) await document.fonts.ready;
      if (isActive) window.print();
    };

    const finishPrinting = () => onClose?.();
    window.addEventListener('afterprint', finishPrinting, { once: true });
    printReport();

    return () => {
      isActive = false;
      window.removeEventListener('afterprint', finishPrinting);
    };
  }, [patient, patientId, reportHtml, onClose]);

  if (patientId == null || isLoading || !patient) return null;

  return createPortal(
    <div className="patient-report-overlay patient-report-print-only" aria-label="Reporte de resultados">
      <section
        className="patient-report"
        data-maximum-rows-report={maximumRowsReport}
        ref={reportRef}
      >
        <div className="patient-report-document">
          {reportHtml
            ? <div dangerouslySetInnerHTML={{ __html: reportHtml }} />
            : headHtml && <div dangerouslySetInnerHTML={{ __html: headHtml }} />}
        </div>
      </section>
    </div>,
    document.body,
  );
}

export default ReportPatient;
