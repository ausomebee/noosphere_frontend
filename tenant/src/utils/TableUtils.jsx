// Export table data as CSV
export const exportTableData = (data, columns = [], filename = 'export.csv', tableName = '') => {
  let headers = 'S/N';
  let rows = [];

  if (columns.length > 0) {
    headers += ',' + columns.map(col => col.header).join(',');
    rows = data.map((row, index) =>
      [`"${index + 1}"`, ...columns.map(col => `"${row[col.key] || ''}"`)].join(',')
    );
  } else {
    headers += ',Key,Value';
    rows = Object.entries(data).map(
      ([key, value], index) => `"${index + 1}","${key}","${value}"`
    );
  }

  const csv = `${headers}\n${rows.join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// Export table data as PDF
export const exportTableToPDF = async (data, columns = [], filename = 'export.pdf', tableName = '') => {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape' });

  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const availableWidth = pageWidth - margin * 2;

  let headers, tableData;

  if (columns.length > 0) {
    headers = ['S/N', ...columns.map(col => col.header)];
    tableData = data.map((row, index) => [
      (index + 1).toString(),
      ...columns.map(col => row[col.key] || '')
    ]);
  } else {
    headers = ['S/N', 'Key', 'Value'];
    tableData = Object.entries(data).map(([key, value], index) => [
      (index + 1).toString(),
      key,
      typeof value === 'object' ? JSON.stringify(value) : value
    ]);
  }

  const colCount = headers.length;
  const colWidth = availableWidth / colCount;

  doc.setFontSize(14);
  doc.text(tableName, margin, 15);

  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 25,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      overflow: 'linebreak',
      halign: 'left',
      cellPadding: 2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [0, 33, 93],
      textColor: 255,
      halign: 'center',
    },
    columnStyles: headers.reduce((acc, _, i) => {
      acc[i] = { cellWidth: colWidth, minCellWidth: colWidth };
      return acc;
    }, {}),
  });

  doc.save(filename);
};

// Escape HTML to prevent XSS in print output
const escapeHtml = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Print table data
export const printTableData = (data, columns = [], tableName = '') => {
  const printWindow = window.open('', '_blank');

  let headersHtml = '<th>S/N</th>';
  let rowsHtml = '';

  if (columns.length > 0) {
    headersHtml += columns.map(col => `<th>${escapeHtml(col.header)}</th>`).join('');
    rowsHtml = data
      .map(
        (row, index) =>
          `<tr><td>${index + 1}</td>${columns
            .map(col => `<td>${escapeHtml(row[col.key])}</td>`)
            .join('')}</tr>`
      )
      .join('');
  } else {
    headersHtml += '<th>Key</th><th>Value</th>';
    rowsHtml = Object.entries(data)
      .map(
        ([key, value], index) =>
          `<tr><td>${index + 1}</td><td>${escapeHtml(key)}</td><td>${escapeHtml(typeof value === 'object' ? JSON.stringify(value) : value)}</td></tr>`
      )
      .join('');
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(tableName)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; }
          h1 { text-align: center; margin: 20px 0 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; white-space: nowrap; font-size: 10px; box-sizing: border-box; }
          th { background-color: #1a56db; color: white; }
          @media print {
            @page { size: auto; margin: 14mm; }
            table { width: 100%; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(tableName)}</h1>
        <table>
          <thead><tr>${headersHtml}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
};
