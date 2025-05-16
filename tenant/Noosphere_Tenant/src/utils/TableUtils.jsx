// Export table data as CSV
export const exportTableData = (data, columns, filename) => {
    const headers = columns.map((col) => col.header).join(',');
    const rows = data
      .map((row) =>
        columns.map((col) => `"${row[col.key] || ''}"`).join(',')
      )
      .join('\n');
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };
  
  // Print table data
  export const printTableData = (data, columns) => {
    const printWindow = window.open('', '_blank');
    const headers = columns
      .map((col) => `<th>${col.header}</th>`)
      .join('');
    const rows = data
      .map(
        (row) =>
          `<tr>${columns
            .map((col) => `<td>${row[col.key] || ''}</td>`)
            .join('')}</tr>`
      )
      .join('');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Table</title>
          <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #1a56db; color: white; }
          </style>
        </head>
        <body>
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };