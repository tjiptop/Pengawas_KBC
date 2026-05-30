function checkMasterData() {
  try {
    const ss = SpreadsheetApp.openById('119pUNbQxQLaLtqcuHebrbwbzXkXUU3h7n5I1OxyMu4w');
    const sheet = ss.getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    let idxKab = headers.findIndex(h => h.toString().toUpperCase().includes('KAB') || h.toString().toUpperCase().includes('KOTA') || h.toString().toUpperCase() === 'DISTRICT');
    
    let sampleKabs = [];
    for (let i = 1; i < Math.min(data.length, 50); i++) {
      sampleKabs.push(data[i][idxKab]);
    }
    
    // Cari yang ada Parepare
    let parepareRows = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxKab]).toLowerCase().includes('pare')) {
        parepareRows.push({
          row: i + 1,
          nsm: data[i][0],
          nama: data[i][1],
          kab: data[i][idxKab]
        });
      }
    }
    
    return JSON.stringify({
      headers: headers,
      idxKab: idxKab,
      totalRows: data.length,
      sampleKabs: sampleKabs.slice(0, 10),
      parepareCount: parepareRows.length,
      parepareRows: parepareRows.slice(0, 10)
    }, null, 2);
  } catch(e) {
    return e.toString();
  }
}
