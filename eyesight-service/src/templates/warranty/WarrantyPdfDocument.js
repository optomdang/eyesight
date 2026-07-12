const React = require('react');
const warrantyConfig = require('../../config/warranty');
const {
  ARTICLES,
  ANNEXES,
  E_SIGN_DISCLAIMER,
  getPhaseTypeLabel,
} = require('./warrantyPolicyContent');
const {
  EXAM_TYPE_LABELS,
  formatVisionLevel,
  eyesForExam,
  eyeLabel,
} = require('../../utils/warrantyVisionFormat');

let pdfComponents = null;

const SIGNER_RELATION_LABELS = {
  parent: 'Cha/Mẹ',
  guardian: 'Người giám hộ',
  relative: 'Người thân được ủy quyền',
  other: 'Khác',
};

const getPdfComponents = async () => {
  if (!pdfComponents) {
    pdfComponents = await import('@react-pdf/renderer');
  }
  return pdfComponents;
};

const buildStyles = (StyleSheet) =>
  StyleSheet.create({
    page: {
      padding: 34,
      fontSize: 10,
      lineHeight: 1.5,
      backgroundColor: '#F8FAFC',
      color: '#111827',
    },
    headerBox: {
      padding: 16,
      marginBottom: 14,
      backgroundColor: '#E0F2FE',
      borderWidth: 1,
      borderColor: '#7DD3FC',
      borderRadius: 10,
    },
    title: {
      fontSize: 17,
      fontWeight: 700,
      marginBottom: 4,
      textAlign: 'center',
      color: '#0F172A',
    },
    subtitle: {
      fontSize: 11,
      marginBottom: 0,
      textAlign: 'center',
      color: '#0369A1',
    },
    headerBadgeWrap: {
      alignSelf: 'center',
      marginTop: 6,
      maxWidth: '92%',
    },
    card: {
      padding: 12,
      marginBottom: 12,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 8,
    },
    compactInfoGrid: {},
    compactInfoRowPair: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    compactInfoCell: {
      width: '48%',
    },
    compactInfoLine: {
      fontSize: 9.5,
      lineHeight: 1.35,
    },
    compactInfoLabelInline: {
      fontWeight: 700,
      color: '#475569',
    },
    compactInfoValueInline: {
      color: '#0F172A',
    },
    badgeBox: {
      minHeight: 22,
      paddingTop: 5,
      paddingBottom: 5,
      paddingLeft: 8,
      paddingRight: 8,
      backgroundColor: '#FFFBEB',
      borderWidth: 1,
      borderColor: '#F59E0B',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeText: {
      fontSize: 8.5,
      fontWeight: 700,
      color: '#B45309',
      textAlign: 'center',
      lineHeight: 1.25,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 700,
      marginTop: 6,
      marginBottom: 7,
      color: '#0F172A',
      lineHeight: 1.35,
    },
    bullet: {
      marginBottom: 4,
      paddingLeft: 8,
      color: '#374151',
      lineHeight: 1.4,
    },
    metaRow: {
      marginBottom: 4,
      color: '#374151',
      lineHeight: 1.4,
    },
    metaLabel: {
      marginBottom: 6,
      fontWeight: 700,
      color: '#111827',
      lineHeight: 1.45,
    },
    phaseCard: {
      marginTop: 14,
      padding: 12,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#DBEAFE',
      borderRadius: 10,
    },
    clinicalCard: {
      padding: 8,
      marginTop: 6,
      marginBottom: 6,
      backgroundColor: '#F0F9FF',
      borderWidth: 1,
      borderColor: '#BAE6FD',
      borderRadius: 8,
    },
    examBlock: {
      marginBottom: 7,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E0F2FE',
      borderRadius: 6,
    },
    examTitle: {
      paddingTop: 7,
      paddingBottom: 7,
      paddingLeft: 8,
      paddingRight: 8,
      fontSize: 9,
      fontWeight: 700,
      color: '#075985',
      backgroundColor: '#E0F2FE',
      lineHeight: 1.35,
    },
    tableRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#F8FAFC',
      borderTopWidth: 1,
      borderTopColor: '#E5E7EB',
    },
    tableCell: {
      minHeight: 18,
      paddingTop: 5,
      paddingBottom: 5,
      paddingLeft: 8,
      paddingRight: 8,
      fontSize: 9,
      color: '#374151',
      borderRightWidth: 1,
      borderRightColor: '#E5E7EB',
      lineHeight: 1.35,
    },
    tableHeadCell: {
      minHeight: 18,
      paddingTop: 5,
      paddingBottom: 5,
      paddingLeft: 8,
      paddingRight: 8,
      fontSize: 8,
      fontWeight: 700,
      color: '#475569',
      borderRightWidth: 1,
      borderRightColor: '#E5E7EB',
      lineHeight: 1.35,
    },
    signatureBlock: {
      width: '48%',
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 10,
      paddingRight: 10,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#CBD5E1',
      borderRadius: 8,
    },
    signatureTitle: {
      fontSize: 9.5,
      fontWeight: 700,
      color: '#0F172A',
      marginBottom: 5,
      lineHeight: 1.3,
    },
    signatureMeta: {
      fontSize: 8.5,
      color: '#374151',
      marginBottom: 3,
      lineHeight: 1.3,
    },
    signatureHash: {
      fontSize: 6,
      color: '#64748B',
      marginTop: 2,
      lineHeight: 1.2,
    },
    signatureRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    signatureImage: {
      marginTop: 4,
      marginBottom: 2,
      width: 120,
      height: 44,
      borderWidth: 1,
      borderColor: '#CBD5E1',
      backgroundColor: '#FFFFFF',
    },
    disclaimer: {
      marginTop: 16,
      fontSize: 8,
      color: '#64748B',
    },
    disclaimerInline: {
      marginTop: 6,
      fontSize: 7.5,
      color: '#64748B',
      lineHeight: 1.35,
    },
    phaseHeader: {
      marginBottom: 8,
      fontSize: 13,
      fontWeight: 700,
      color: '#1E40AF',
      backgroundColor: '#DBEAFE',
      padding: 8,
      borderRadius: 6,
    },
    systemSeal: {
      marginTop: 10,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 12,
      paddingRight: 12,
      backgroundColor: '#FFFDE7',
      borderWidth: 2,
      borderColor: '#F59E0B',
      borderRadius: 10,
    },
    systemSealTitle: {
      fontSize: 10,
      fontWeight: 700,
      color: '#B45309',
      marginBottom: 12,
      lineHeight: 1.4,
    },
    systemSealLine: {
      fontSize: 9,
      color: '#374151',
      marginBottom: 5,
      lineHeight: 1.4,
    },
    noteBox: {
      marginTop: 8,
      padding: 8,
      backgroundColor: '#FFFBEB',
      borderWidth: 1,
      borderColor: '#FDE68A',
      borderRadius: 6,
    },
  });

const createWarrantyPdfDocument = async ({ fontFamily, agreement, phases, singlePhase = null }) => {
  const { Document, Page, Text, View, Image, StyleSheet } = await getPdfComponents();
  const styles = buildStyles(StyleSheet);
  const patient = agreement.patientSnapshot || {};
  const pkg = agreement.packageSnapshot || {};
  const phasesToRender = singlePhase ? [singlePhase] : phases;
  const exportedAt = new Date().toLocaleString('vi-VN');

  const renderInfoLine = (label, value) =>
    React.createElement(
      Text,
      { style: styles.compactInfoLine, wrap: false },
      React.createElement(Text, { style: styles.compactInfoLabelInline }, `${label}: `),
      React.createElement(Text, { style: styles.compactInfoValueInline }, value || '—')
    );

  const renderRefundBadge = (wrapStyle) =>
    React.createElement(
      View,
      { style: [styles.badgeBox, wrapStyle] },
      React.createElement(
        Text,
        { style: styles.badgeText },
        'Gói có cam kết hoàn tiền (Ultra/Ultimate)'
      )
    );

  const renderInfoRowPair = (left, right) =>
    React.createElement(
      View,
      { style: styles.compactInfoRowPair, wrap: false },
      React.createElement(View, { style: styles.compactInfoCell }, left),
      React.createElement(View, { style: styles.compactInfoCell }, right)
    );

  const renderPolicyArticles = () =>
    ARTICLES.map((article) =>
      React.createElement(
        View,
        { key: article.number, wrap: false },
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
          { key: annex.id, style: { marginTop: 8 }, wrap: false },
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
          { key: annex.id, style: { marginTop: 8 }, wrap: false },
          React.createElement(Text, { style: styles.sectionTitle }, annex.title),
          ...annex.fields.map((field) =>
            React.createElement(Text, { key: field, style: styles.bullet }, `• ${field}`)
          )
        );
      }
      return React.createElement(
        View,
        { key: annex.id, style: { marginTop: 8 }, wrap: false },
        React.createElement(Text, { style: styles.sectionTitle }, annex.title),
        React.createElement(Text, { style: styles.bullet }, annex.note || '')
      );
    });

  const renderSignature = (label, signature) => {
    if (!signature) return null;
    const signedDate = signature.signedAt
      ? new Date(signature.signedAt).toLocaleString('vi-VN')
      : '—';
    return React.createElement(
      View,
      { style: styles.signatureBlock, wrap: false },
      React.createElement(Text, { style: styles.signatureTitle }, label),
      React.createElement(Text, { style: styles.signatureMeta }, `Họ tên: ${signature.signerName}`),
      signature.signerRelation
        ? React.createElement(
            Text,
            { style: styles.signatureMeta },
            `Quan hệ: ${SIGNER_RELATION_LABELS[signature.signerRelation] || signature.signerRelation}`
          )
        : null,
      React.createElement(Text, { style: styles.signatureMeta }, `Thời gian ký: ${signedDate}`),
      signature.signatureDataUrl
        ? React.createElement(Image, {
            style: styles.signatureImage,
            src: signature.signatureDataUrl,
          })
        : null,
      signature.signatureHash
        ? React.createElement(
            Text,
            { style: styles.signatureHash },
            `Mã xác thực: ${signature.signatureHash.slice(0, 32)}`
          )
        : null
    );
  };

  const renderSystemSeal = (phase) => {
    if (phase.status !== 'completed') return null;
    const config = warrantyConfig;
    const sealedAt = phase.completedAt
      ? new Date(phase.completedAt).toLocaleString('vi-VN')
      : new Date().toLocaleString('vi-VN');
    const responsibleLine = [config.representativeHonorific, config.representativeName]
      .filter(Boolean)
      .join(' ');

    return React.createElement(
      View,
      { style: styles.systemSeal, wrap: false },
      React.createElement(
        Text,
        { style: styles.systemSealTitle },
        '\u2713 Hệ thống D-VisUP xác nhận các cam kết và dữ liệu lâm sàng ban đầu hợp lệ'
      ),
      responsibleLine
        ? React.createElement(
            Text,
            { style: styles.systemSealLine },
            `Chịu trách nhiệm cam kết: ${responsibleLine}`
          )
        : null,
      config.representativeCCCD
        ? React.createElement(
            Text,
            { style: styles.systemSealLine },
            `CCCD: ${config.representativeCCCD}`
          )
        : null,
      React.createElement(
        Text,
        { style: styles.systemSealLine },
        `Thời điểm xác nhận: ${sealedAt}`
      )
    );
  };

  const renderClinicalSummary = (clinicalData = {}) => {
    const notes = clinicalData.clinicalNotes;
    const improvement = clinicalData.improvementObserved;
    const doctorConfirmation = clinicalData.doctorConfirmation;
    const overrideReason = clinicalData.reexamEarlyOverrideReason;
    const examResults = clinicalData.examResults || {};

    const examBlocks = Object.keys(EXAM_TYPE_LABELS)
      .map((examType) => {
        const exam = examResults[examType];
        if (!exam) return null;

        const rows = [];
        eyesForExam(examType).forEach((eye) => {
          const initial = formatVisionLevel(examType, exam.initial?.[eye]);
          const current = formatVisionLevel(examType, exam.current?.[eye]);
          rows.push(
            React.createElement(
              View,
              { key: `${examType}-${eye}`, style: styles.tableRow },
              React.createElement(
                Text,
                { style: [styles.tableCell, { width: '32%' }] },
                eyeLabel(eye)
              ),
              React.createElement(
                Text,
                { style: [styles.tableCell, { width: '34%' }] },
                initial
              ),
              React.createElement(
                Text,
                { style: [styles.tableCell, { width: '34%', borderRightWidth: 0 }] },
                current
              )
            )
          );
        });

        if (!rows.length) return null;

        return React.createElement(
          View,
          { key: examType, style: styles.examBlock, wrap: false },
          React.createElement(Text, { style: styles.examTitle }, EXAM_TYPE_LABELS[examType]),
          React.createElement(
            View,
            { style: styles.tableHeader },
            React.createElement(Text, { style: [styles.tableHeadCell, { width: '32%' }] }, 'Mắt'),
            React.createElement(
              Text,
              { style: [styles.tableHeadCell, { width: '34%' }] },
              'Ban đầu'
            ),
            React.createElement(
              Text,
              { style: [styles.tableHeadCell, { width: '34%', borderRightWidth: 0 }] },
              'Hiện tại'
            )
          ),
          ...rows
        );
      })
      .filter(Boolean);

    return React.createElement(
      View,
      null,
      examBlocks.length
        ? React.createElement(
            View,
            { style: styles.clinicalCard },
            React.createElement(Text, { style: styles.sectionTitle }, 'Dữ liệu lâm sàng'),
            ...examBlocks
          )
        : null,
      overrideReason
        ? React.createElement(
            View,
            { style: styles.noteBox, wrap: false },
            React.createElement(Text, { style: styles.metaRow }, `Lý do tái khám sớm: ${overrideReason}`)
          )
        : null,
      improvement !== undefined && improvement !== null
        ? React.createElement(
            View,
            { style: styles.noteBox, wrap: false },
            React.createElement(
              Text,
              { style: styles.metaRow },
              `Cải thiện có ý nghĩa: ${improvement ? 'Có' : 'Không'}`
            )
          )
        : null,
      doctorConfirmation
        ? React.createElement(
            View,
            { style: styles.noteBox, wrap: false },
            React.createElement(Text, { style: styles.metaRow }, `Xác nhận bác sĩ: ${doctorConfirmation}`)
          )
        : null,
      notes
        ? React.createElement(
            View,
            { style: styles.noteBox, wrap: false },
            React.createElement(Text, { style: styles.metaRow }, `Ghi chú lâm sàng: ${notes}`)
          )
        : null
    );
  };

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: [styles.page, { fontFamily }] },
      React.createElement(
        View,
        { style: styles.headerBox },
        React.createElement(Text, { style: styles.title }, 'BIÊN BẢN CAM KẾT BẢO HÀNH D-VISUP'),
        pkg.includesRefundGuarantee
          ? renderRefundBadge(styles.headerBadgeWrap)
          : React.createElement(
              Text,
              { style: styles.subtitle },
              `Phiên bản chính sách: ${agreement.policyVersion}`
            )
      ),
      React.createElement(
        View,
        { style: styles.card },
        React.createElement(Text, { style: styles.sectionTitle }, 'Thông tin biên bản'),
        React.createElement(
          View,
          { style: styles.compactInfoGrid },
          renderInfoRowPair(
            renderInfoLine('Mã biên bản', `#${agreement.id}`),
            renderInfoLine('Ngày xuất file', exportedAt)
          ),
          renderInfoRowPair(
            renderInfoLine('Mã bệnh nhân', patient.code || '—'),
            renderInfoLine('Bệnh nhân', patient.name || patient.code || agreement.patientId)
          ),
          renderInfoLine('Gói điều trị', pkg.name || pkg.code || 'N/A')
        ),
      ),
      React.createElement(
        View,
        { style: styles.card },
        React.createElement(Text, { style: styles.sectionTitle }, 'Nội dung thỏa thuận (v1.0)'),
        renderPolicyArticles(),
        renderAnnexes()
      ),
      phasesToRender.map((phase, index) =>
        React.createElement(
          View,
          {
            key: phase.id || phase.phaseNumber,
            style: styles.phaseCard,
            break: index === 0,
          },
          React.createElement(
            Text,
            { style: styles.phaseHeader },
            `Giai đoạn ${phase.phaseNumber}: ${getPhaseTypeLabel(phase.phaseType)}`
          ),
          renderClinicalSummary(phase.clinicalData),
          React.createElement(
            View,
            { wrap: false },
            React.createElement(
              View,
              { style: styles.signatureRow, wrap: false },
              renderSignature('Chữ ký phụ huynh/người giám hộ', phase.guardianSignature),
              renderSignature('Chữ ký bác sĩ/chuyên gia', phase.doctorSignature)
            ),
            React.createElement(Text, { style: styles.disclaimerInline }, E_SIGN_DISCLAIMER)
          ),
          renderSystemSeal(phase)
        )
      )
    )
  );
};

module.exports = {
  createWarrantyPdfDocument,
};
