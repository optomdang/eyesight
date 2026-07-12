const React = require('react');
const warrantyConfig = require('../../config/warranty');
const {
  ARTICLES,
  ANNEXES,
  E_SIGN_DISCLAIMER,
  getPhaseTypeLabel,
} = require('./warrantyPolicyContent');

let pdfComponents = null;

const getPdfComponents = async () => {
  if (!pdfComponents) {
    pdfComponents = await import('@react-pdf/renderer');
  }
  return pdfComponents;
};

const buildStyles = (StyleSheet) =>
  StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 10,
      lineHeight: 1.45,
    },
    title: {
      fontSize: 16,
      fontWeight: 700,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 11,
      marginBottom: 16,
      textAlign: 'center',
      color: '#444',
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 700,
      marginTop: 12,
      marginBottom: 6,
    },
    bullet: {
      marginBottom: 4,
      paddingLeft: 8,
    },
    metaRow: {
      marginBottom: 4,
    },
    metaLabel: {
      fontWeight: 700,
    },
    signatureBlock: {
      marginTop: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#ccc',
    },
    disclaimer: {
      marginTop: 16,
      fontSize: 8,
      color: '#666',
    },
    phaseHeader: {
      marginTop: 20,
      marginBottom: 8,
      fontSize: 13,
      fontWeight: 700,
      backgroundColor: '#f0f0f0',
      padding: 6,
    },
  });

const createWarrantyPdfDocument = async ({ fontFamily, agreement, phases, singlePhase = null }) => {
  const { Document, Page, Text, View, StyleSheet } = await getPdfComponents();
  const styles = buildStyles(StyleSheet);
  const patient = agreement.patientSnapshot || {};
  const pkg = agreement.packageSnapshot || {};
  const phasesToRender = singlePhase ? [singlePhase] : phases;

  const renderPolicyArticles = () =>
    ARTICLES.map((article) =>
      React.createElement(
        View,
        { key: article.number },
        React.createElement(
          Text,
          { style: styles.sectionTitle },
          `Điều ${article.number}. ${article.title}`
        ),
        article.paragraphs.map((p) =>
          React.createElement(Text, { key: p.slice(0, 24), style: styles.bullet }, `• ${p}`)
        )
      )
    );

  const renderAnnexes = () =>
    ANNEXES.map((annex) => {
      if (annex.rows) {
        return React.createElement(
          View,
          { key: annex.id, style: { marginTop: 8 } },
          React.createElement(Text, { style: styles.sectionTitle }, annex.title),
          ...annex.rows.map((row) =>
            React.createElement(
              Text,
              { key: row.benefit, style: styles.bullet },
              `${row.benefit}: Standard/Pro ${row.standardPro}, Ultra/Ultimate ${row.ultraUltimate}`
            )
          )
        );
      }
      if (annex.fields) {
        return React.createElement(
          View,
          { key: annex.id, style: { marginTop: 8 } },
          React.createElement(Text, { style: styles.sectionTitle }, annex.title),
          ...annex.fields.map((field) =>
            React.createElement(Text, { key: field, style: styles.bullet }, `• ${field}`)
          )
        );
      }
      return React.createElement(
        View,
        { key: annex.id, style: { marginTop: 8 } },
        React.createElement(Text, { style: styles.sectionTitle }, annex.title),
        React.createElement(Text, { style: styles.bullet }, annex.note || '')
      );
    });

  const renderSignature = (label, signature) => {
    if (!signature) return null;
    return React.createElement(
      View,
      { style: styles.signatureBlock },
      React.createElement(Text, { style: styles.metaLabel }, label),
      React.createElement(Text, null, `Họ tên: ${signature.signerName}`),
      signature.signerRelation
        ? React.createElement(Text, null, `Quan hệ: ${signature.signerRelation}`)
        : null,
      React.createElement(Text, null, `Thời gian ký: ${signature.signedAt}`),
      signature.signatureHash
        ? React.createElement(Text, null, `Mã băm chữ ký: ${signature.signatureHash.slice(0, 16)}…`)
        : null
    );
  };

  const renderClinicalSummary = (clinicalData = {}) => {
    const notes = clinicalData.clinicalNotes;
    const improvement = clinicalData.improvementObserved;
    const doctorConfirmation = clinicalData.doctorConfirmation;
    const overrideReason = clinicalData.reexamEarlyOverrideReason;

    return React.createElement(
      View,
      null,
      overrideReason
        ? React.createElement(Text, { style: styles.metaRow }, `Lý do tái khám sớm: ${overrideReason}`)
        : null,
      improvement !== undefined && improvement !== null
        ? React.createElement(
            Text,
            { style: styles.metaRow },
            `Cải thiện quan sát: ${improvement ? 'Có' : 'Không'}`
          )
        : null,
      doctorConfirmation
        ? React.createElement(Text, { style: styles.metaRow }, `Xác nhận bác sĩ: ${doctorConfirmation}`)
        : null,
      notes ? React.createElement(Text, { style: styles.metaRow }, `Ghi chú lâm sàng: ${notes}`) : null
    );
  };

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: [styles.page, { fontFamily }] },
      React.createElement(Text, { style: styles.title }, 'BIÊN BẢN CAM KẾT BẢO HÀNH D-VISUP'),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Phiên bản chính sách: ${agreement.policyVersion}`
      ),
      React.createElement(Text, { style: styles.metaRow }, `Mã biên bản: #${agreement.id}`),
      React.createElement(
        Text,
        { style: styles.metaRow },
        `Họ tên bệnh nhân: ${patient.name || patient.code || agreement.patientId}`
      ),
      patient.code
        ? React.createElement(Text, { style: styles.metaRow }, `Mã BN: ${patient.code}`)
        : null,
      React.createElement(
        Text,
        { style: styles.metaRow },
        `Gói điều trị: ${pkg.name || pkg.code || 'N/A'}`
      ),
      pkg.includesRefundGuarantee
        ? React.createElement(Text, { style: styles.metaRow }, 'Gói có cam kết hoàn tiền (Ultra/Ultimate)')
        : null,
      React.createElement(Text, { style: styles.sectionTitle }, 'Nội dung Thỏa thuận (v1.0)'),
      renderPolicyArticles(),
      renderAnnexes(),
      phasesToRender.map((phase) =>
        React.createElement(
          View,
          { key: phase.id || phase.phaseNumber, wrap: false },
          React.createElement(
            Text,
            { style: styles.phaseHeader },
            `Giai đoạn ${phase.phaseNumber}: ${getPhaseTypeLabel(phase.phaseType)}`
          ),
          renderClinicalSummary(phase.clinicalData),
          renderSignature('Chữ ký phụ huynh/người giám hộ', phase.guardianSignature),
          renderSignature('Chữ ký bác sĩ/chuyên gia', phase.doctorSignature),
          phase.documentHash
            ? React.createElement(Text, { style: styles.metaRow }, `Mã băm tài liệu: ${phase.documentHash}`)
            : null
        )
      ),
      React.createElement(Text, { style: styles.disclaimer }, E_SIGN_DISCLAIMER),
      React.createElement(
        Text,
        { style: { marginTop: 8, fontSize: 8, color: '#666' } },
        `${warrantyConfig.legalEntityName} | ${warrantyConfig.legalAddress} | ${warrantyConfig.supportEmail}`
      )
    )
  );
};

module.exports = {
  createWarrantyPdfDocument,
};
