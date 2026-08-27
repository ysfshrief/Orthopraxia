import * as XLSX from 'xlsx'

/*
  Export team standings to an .xlsx backup file — fully client-side, no
  Firestore reads/writes, so it never affects quota or stored data.
  `standings` items: { name, att, judgeSum, adminSum, bonusPoints, total }
*/
export function exportTeamScores(standings) {
  const rows = standings
    .slice()
    .sort((a, b) => b.total - a.total)
    .map((t, i) => ({
      'المركز': i + 1,
      'الفريق': t.name,
      'درجات الحضور': round(t.att),
      'درجات الحكم': round(t.judgeSum),
      'درجات الإدارة': round(t.adminSum),
      'بونص': round(t.bonusPoints || 0),
      'الإجمالي': round(t.total),
    }))

  const ws = XLSX.utils.json_to_sheet(rows)
  // column widths
  ws['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'درجات الفرق')

  const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
  XLSX.writeFile(wb, `Orthopraxia_backup_${stamp}.xlsx`)
}

function round(n) { return Math.round((Number(n) || 0) * 100) / 100 }
