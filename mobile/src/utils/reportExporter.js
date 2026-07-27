import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

function getDayStr(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  } catch {
    return '—';
  }
}

export async function exportToExcel(records, fromDate, toDate) {
  // 1. Prepare Main Table rows
  const mainHeader = [
    'Emp No', 'Employee Name', 'Date', 'Day', 'Status', 'Time In', 'Time Out',
    'OD Hours', 'Working Hours', 'Overtime', 'Total Hours', 'Remarks'
  ];
  
  const mainRows = records.map(rec => {
    const totalHrs = rec.totalHours || ((rec.hoursWorked || 0) + (rec.extraHours || 0));
    return [
      rec.empNo || '—',
      rec.workerName || '—',
      rec.date || '—',
      getDayStr(rec.date),
      rec.status || '—',
      rec.checkIn || '—',
      rec.checkOut || '—',
      rec.extraHours || 0,
      rec.hoursWorked ? Math.round(rec.hoursWorked * 100) / 100 : 0,
      rec.overtime ? Math.round(rec.overtime * 100) / 100 : 0,
      Math.round(totalHrs * 100) / 100,
      rec.remarks || '—'
    ];
  });

  // 2. Prepare Summary Table rows
  const summaryHeader = [
    'Emp No', 'Employee Name', 'Total Present', 'Total Absent', 'Total OD Hours', 'Total Working', 'Total Overtime'
  ];

  const summaryMap = {};
  records.forEach(rec => {
    const name = rec.workerName || 'Unknown';
    if (!summaryMap[name]) {
      summaryMap[name] = {
        empNo: rec.empNo || '—',
        name: name,
        present: 0,
        absent: 0,
        odHours: 0,
        working: 0,
        overtime: 0
      };
    }
    const s = rec.status ? rec.status.toLowerCase() : '';
    if (s === 'absent') {
      summaryMap[name].absent += 1;
    } else {
      summaryMap[name].present += 1;
    }
    summaryMap[name].odHours += (rec.extraHours || 0);
    summaryMap[name].working += (rec.hoursWorked || 0);
    summaryMap[name].overtime += (rec.overtime || 0);
  });

  const summaryRows = Object.values(summaryMap).map(s => [
    s.empNo,
    s.name,
    s.present,
    s.absent,
    Math.round(s.odHours * 100) / 100,
    Math.round(s.working * 100) / 100,
    Math.round(s.overtime * 100) / 100
  ]);

  // Combine into a single list of rows for the sheet
  const allRows = [
    ['Attendance Report'],
    [`Period: ${fromDate} to ${toDate}`],
    [], // Blank spacing row
    mainHeader,
    ...mainRows,
    [], // spacing
    [], // spacing
    ['Summary Table'],
    summaryHeader,
    ...summaryRows
  ];

  // Build sheet
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');

  // Convert to binary/base64
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const filename = `Attendance_Report_${fromDate}_to_${toDate}.xlsx`;
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  // Save and share
  await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(fileUri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Download Attendance Excel Report' });
}

export async function exportToPDF(records, fromDate, toDate) {
  // Group summary data
  const summaryMap = {};
  records.forEach(rec => {
    const name = rec.workerName || 'Unknown';
    if (!summaryMap[name]) {
      summaryMap[name] = {
        empNo: rec.empNo || '—',
        name: name,
        present: 0,
        absent: 0,
        odHours: 0,
        working: 0,
        overtime: 0
      };
    }
    const s = rec.status ? rec.status.toLowerCase() : '';
    if (s === 'absent') {
      summaryMap[name].absent += 1;
    } else {
      summaryMap[name].present += 1;
    }
    summaryMap[name].odHours += (rec.extraHours || 0);
    summaryMap[name].working += (rec.hoursWorked || 0);
    summaryMap[name].overtime += (rec.overtime || 0);
  });

  const mainTableRowsHtml = records.map(rec => {
    const totalHrs = rec.totalHours || ((rec.hoursWorked || 0) + (rec.extraHours || 0));
    return `
      <tr>
        <td>${rec.empNo || '—'}</td>
        <td>${rec.workerName || '—'}</td>
        <td>${rec.date || '—'}</td>
        <td>${getDayStr(rec.date)}</td>
        <td>${rec.status || '—'}</td>
        <td>${rec.checkIn || '—'}</td>
        <td>${rec.checkOut || '—'}</td>
        <td>${rec.extraHours || 0}</td>
        <td>${rec.hoursWorked ? rec.hoursWorked.toFixed(2) : 0}</td>
        <td>${rec.overtime ? rec.overtime.toFixed(2) : 0}</td>
        <td>${totalHrs ? totalHrs.toFixed(2) : 0}</td>
        <td>${rec.remarks || '—'}</td>
      </tr>
    `;
  }).join('');

  const summaryTableRowsHtml = Object.values(summaryMap).map(s => `
    <tr>
      <td>${s.empNo}</td>
      <td>${s.name}</td>
      <td>${s.present}</td>
      <td>${s.absent}</td>
      <td>${s.odHours.toFixed(2)}</td>
      <td>${s.working.toFixed(2)}</td>
      <td>${s.overtime.toFixed(2)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
          h2 { text-align: center; color: #1a56db; margin-bottom: 5px; }
          p.subtitle { text-align: center; margin-bottom: 25px; color: #666; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #f3f4f6; color: #374151; font-weight: bold; }
          h3 { color: #111827; border-bottom: 2px solid #1a56db; padding-bottom: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h2>Smart Pharma Attendance Report</h2>
        <p class="subtitle">Period: ${fromDate} to ${toDate}</p>
        
        <h3>Main Report</h3>
        <table>
          <thead>
            <tr>
              <th>Emp No</th>
              <th>Employee Name</th>
              <th>Date</th>
              <th>Day</th>
              <th>Status</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>OD Hours</th>
              <th>Working Hours</th>
              <th>Overtime</th>
              <th>Total Hours</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${mainTableRowsHtml}
          </tbody>
        </table>

        <h3>Summary Section</h3>
        <table>
          <thead>
            <tr>
              <th>Emp No</th>
              <th>Employee Name</th>
              <th>Total Present</th>
              <th>Total Absent</th>
              <th>Total OD Hours</th>
              <th>Total Working</th>
              <th>Total Overtime</th>
            </tr>
          </thead>
          <tbody>
            ${summaryTableRowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html: htmlContent });
  const filename = `Attendance_Report_${fromDate}_to_${toDate}.pdf`;
  const fileUri = `${FileSystem.documentDirectory}${filename}`;

  // Copy for clean share filename
  await FileSystem.copyAsync({ from: uri, to: fileUri });
  await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Download Attendance PDF Report' });
}
