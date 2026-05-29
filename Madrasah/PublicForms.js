/**
 * PUBLIC / CAMPAIGN FORMS CONFIGURATION
 * These forms are intended for public distribution or district-wide campaigns.
 * They are separated from internal Forms.js for better maintenance.
 * 
 * SCHEMA: Same as Forms.js
 */

function getPublicFormDefinitions() {
  return {
    'form_survey_masyarakat': `
title: Survey Kepuasan Masyarakat (Public)
target_sheet: Data_Survey_Masyarakat
questions:
  - type: note
    label: "<b>Survey Kepuasan Masyarakat</b><br>Mohon isi data diri dan penilaian Anda."

  - type: text
    name: nama_responden
    label: "Nama Lengkap"
    required: true

  - type: select
    name: kategori_responden
    label: "Kategori"
    options:
      - Wali Murid
      - Alumni
      - Masyarakat Umum
      - Tokoh Agama
    required: true

  - type: text
    name: alamat_domisili
    label: "Alamat Domisili"
    required: true

  - type: range
    name: kepuasan_pelayanan
    label: "Tingkat Kepuasan Pelayanan Madrasah (1-10)"
    min: 1
    max: 10
    default: 8

  - type: textarea
    name: saran
    label: "Saran & Masukan"
    rows: 3
`
  };
}
