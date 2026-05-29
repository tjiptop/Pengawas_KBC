/**
 * ==============================================================================
 * OMNIPOTENCE ETL ENGINE – PRODUCTION READY (Safe & Scalable)
 * ==============================================================================
 */

let ETL_CACHE = {};
let ETL_STATS = {};

/**
 * ==============================================================================
 * GLOBAL CONFIG
 * ==============================================================================
 */
const MASTER_CONFIG = {
  DRY_RUN: false,

  // Batas aman eksekusi (ms). GAS limit biasanya 6 menit (360.000ms).
  // Kita set 5 menit agar punya waktu untuk graceful shutdown.
  TIME_LIMIT_MS: 300000, 

  SOURCES: {
    // Masukkan ID Spreadsheet sumber jika berbeda dengan SS saat ini
    DB_CURRENT: "" 
  },

  // Target ID. Jika kosong, akan menggunakan Spreadsheet yang aktif saat ini.
  TARGET_ID: "1JqCUCtDl2khJBC9um_ZUvISrLW9S4NsYzIR2U3ntIxA",

  PIPELINES: [
{
      enabled: true,
      nama: "1. Copy Madrasah",
      source: "DB_CURRENT",
      sourceSheet: "Madrasahs",

      steps: [
        { type: "COLS", cols: "0..7" },        
        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },
        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },
        {
          type: "WRITE",
          targetSheet: "Madrasahs", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },

//###  0_1_Personil
{
      enabled: true,
      nama: "2. Copy 0_1_Personil",
      source: "DB_CURRENT",
      sourceSheet: "0_1_Personil",

      steps: [
        { type: "COLS", cols: "0..3,5..12" },

        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },

        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },

        {
          type: "REGEX_REPLACE",
          col: "no_hp", // Nama ini HARUS SAMA dengan hasil Rename di atas
          
          // Test: Pastikan isinya angka dan diawali 8 (mengabaikan spasi depan/belakang)
          test: "^8[0-9]+$", 
          
          // Regex: Cari karakter '8' di awal string
          regex: "^8",       
          
          // Replace: Ganti dengan '08 (Petik satu memaksa format Text di Sheet)
          replaceWith: "'08",
          
          flags: "" 
        },

        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },
      
        {
          type: "WRITE",
          targetSheet: "0_1_Personil", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },

//###  0_1_Personil|guru_jumlah_status
{
      enabled: true,
      nama: "3. Copy 0_1_Personil|guru_jumlah_status",
      source: "DB_CURRENT",
      sourceSheet: "0_1_Personil|guru_jumlah_status",

      steps: [
        { type: "COLS", cols: "0..5" },        
        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },

        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },
      
        {
          type: "WRITE",
          targetSheet: "0_1_Personil|guru_jumlah_status", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },

//###  0_1_Personil|daftar_guru
{
      enabled: true,
      nama: "4. Copy 0_1_Personil|daftar_guru",
      source: "DB_CURRENT",
      sourceSheet: "0_1_Personil|daftar_guru",

      steps: [
        { type: "COLS", cols: "0..6" },        
        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },

        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },
      
        {
          type: "WRITE",
          targetSheet: "0_1_Personil|daftar_guru", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },

//###  1_0_Observasi
{
      enabled: true,
      nama: "5. Copy 1_0_Observasi",
      source: "DB_CURRENT",
      sourceSheet: "1_0_Observasi",

      steps: [
        { type: "COLS", cols: "0..3,6..19,23" },

        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },

        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn",
            "refleksi": "1.refleksi_berkala",
            "pengembangan_diri": "2.pengembangan_diri",
            "bahasa_positif": "3.bahasa_positif",
            "media": "4.media_kelas",
            "lingkungan": "5.lingkungan_bersih",
            "prilaku" : "6.lingkungan_pembiasaan"
          }
        },

        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },
      
        {
          type: "WRITE",
          targetSheet: "1_0_Observasi", 
          onTargetExists: "CLEAR_AND_WRITE"
        },
       
       {
          type: "ADD_COLUMN",
          colName: "forms",
          value: "observasi"
        },

        {
          type: "UNPIVOT",
          keepCols: ["forms","npsn"], // Kolom identitas yang tetap
          pivotCols: ["1.refleksi_berkala", "2.pengembangan_diri", "3.bahasa_positif", "4.media_kelas", "5.lingkungan_bersih", "6.lingkungan_pembiasaan"], // Kolom yang akan dilipat ke bawah
          keyColName: "kelompok", // Nama header baru untuk kategori
          valueColName: "kondisi",   // Nama header baru untuk nilainya
          skipEmpty: true   // hapus row jika empty
        },

        {
          type: "WRITE",
          targetSheet: "0_UNPIVOT_Observasi", 
          onTargetExists: "CLEAR_AND_WRITE"  // Opsi: CLEAR_AND_WRITE, OVERWRITE, APPEND
        }
      ]
    },

//###  1_1_Observasi_Kelas
{
      enabled: true,
      nama: "6. Copy 1_1_Observasi_Kelas",
      source: "DB_CURRENT",
      sourceSheet: "1_1_Observasi_Kelas",

      steps: [
        { type: "COLS", cols: "0..3,5..6,4" },

        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },

        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },

        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },
      
        {
          type: "WRITE",
          targetSheet: "1_1_Observasi_Kelas", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },

//###  1_2_Observasi_Area_Luar
{
      enabled: true,
      nama: "7. Copy 1_2_Observasi_Area_Luar",
      source: "DB_CURRENT",
      sourceSheet: "1_2_Observasi_Area_Luar",

      steps: [
        { type: "COLS", cols: "0..3,5..6,4" },

        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },

        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },

        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },
      
        {
          type: "WRITE",
          targetSheet: "1_2_Observasi_Area_Luar", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },

//###  1_3_Observasi_Ruang_Guru
{
      enabled: true,
      nama: "8. Copy 1_3_Observasi_Ruang_Guru",
      source: "DB_CURRENT",
      sourceSheet: "1_3_Observasi_Ruang_Guru",

      steps: [
        { type: "COLS", cols: "0..3,5..6,4" },

        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },

        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },

        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },
      
        {
          type: "WRITE",
          targetSheet: "1_3_Observasi_Ruang_Guru", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },


//###  1_4_Observasi_Ruang_Kamad
{
      enabled: true,
      nama: "9. Copy 1_4_Observasi_Ruang_Kamad",
      source: "DB_CURRENT",
      sourceSheet: "1_4_Observasi_Ruang_Kamad",

      steps: [
        { type: "COLS", cols: "0..3,5..6,4" },

        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },

        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },

        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },
      
        {
          type: "WRITE",
          targetSheet: "1_4_Observasi_Ruang_Kamad", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },

//###  1_5_Observasi_Area_Umum
{
      enabled: true,
      nama: "10. Copy 1_5_Observasi_Area_Umum",
      source: "DB_CURRENT",
      sourceSheet: "1_5_Observasi_Area_Umum",

      steps: [
        { type: "COLS", cols: "0..3,5..6,4" },

        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },

        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },

        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },
      
        {
          type: "WRITE",
          targetSheet: "1_5_Observasi_Area_Umum", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },

//###  2_1_Angket_Guru 
    {
      enabled: true,
      nama: "11. Copy 2_1_Angket_Guru",
      source: "DB_CURRENT",
      sourceSheet: "2_1_Angket_Guru",

      steps: [
        // 1. Grouping & Sorting
        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id", "nama_guru"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },
        // 2. Select Columns
        { type: "COLS", cols: "0..3,5..23" },
        
        // 3. Rename Headers
        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn",
            "01_Spiritual_1_1_1": "01",
            "02_Spiritual_1_2": "02",
            "03_Spiritual_1_1_2": "03",
            "04_Personal_2_2": "04",
            "05_Intelektual_5_1_1": "05",
            "06_Intelektual_5_1_2": "06",
            "07_Intelektual_5_1_3": "07",
            "08_Personal_3_1": "08",
            "09_Personal_3_2": "09",
            "10_Sosial_4_1": "10",
            "11_Sosial_4_2_1": "11",
            "12_Spiritual_4_2_2": "12",
            "13_Ekologis_7_1_1": "13",
            "14_Ekologis_7_1_2": "14",
            "15_Ekologis_7_1_3": "15"
          }
        },

        // 5. Cleaning Data
        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },

        // 6. Writing Data
        {
          type: "WRITE",
          targetSheet: "2_1_Angket_Guru", 
          onTargetExists: "CLEAR_AND_WRITE"
        },

                {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn",
            "01": "01.merasa_kurang_diberi_kebaikan",
            "02": "02.rasa_syukur",
            "04": "04.refleksi_perbaikan",
            "05": "05.bertanya_ke_orang_lain",
            "06": "06.mencari_informasi",
            "07": "07.menggunakan_informasi_untuk_perbaiki_mengajar",
            "08": "08.menyadari_emosi",
            "09": "09.mengelola_emosi_positif",
            "10": "10.mengenali_perundungan",
            "11": "11.sikap_pada_perundungan",
            "13": "13.ikut_membangun_kepedulian_lingkungan",
            "14": "14.peduli_lingkungan_murid_lewat_pembelajaran"
          }
        },

       {
          type: "ADD_COLUMN",
          colName: "forms",
          value: "angket_guru"
        },

        {
          type: "UNPIVOT",
          keepCols: ["forms","npsn","jenis_kelamin"], // Kolom identitas yang tetap
          pivotCols: ["01.merasa_kurang_diberi_kebaikan", "02.rasa_syukur", "04.refleksi_perbaikan", "05.bertanya_ke_orang_lain", "06.mencari_informasi", "07.menggunakan_informasi_untuk_perbaiki_mengajar" , "08.menyadari_emosi", "09.mengelola_emosi_positif" , "10.mengenali_perundungan", "11.sikap_pada_perundungan", "13.ikut_membangun_kepedulian_lingkungan", "14.peduli_lingkungan_murid_lewat_pembelajaran"], // Kolom yang akan dilipat ke bawah
          keyColName: "kelompok", // Nama header baru untuk kategori
          valueColName: "kondisi",   // Nama header baru untuk nilainya
          skipEmpty: true   // hapus row jika empty
        },

        {
          type: "REPLACE",
          col: "kondisi",
          // Opsi 1: Single Replace
          // find: ", S.Pd*", replaceWith: "", 
          
          // Opsi 2: Multiple Replace (Mapping)
          mapping: {
             "Jarang": "0.Jarang",  
             "Kadang-kadang": "1.Kadang-kadang",
             "Sering": "2.Sering",
             "Hampir Selalu": "3.Hampir Selalu"
          },
          matchCase: false       // false = tidak peduli huruf besar/kecil
        },

        {
          type: "WRITE",
          targetSheet: "0_UNPIVOT_Angket", 
          onTargetExists: "CLEAR_AND_WRITE"  // Opsi: CLEAR_AND_WRITE, OVERWRITE, APPEND
        }
      ]
    },

    
//###  2_2_Angket_Kamad
    {
      enabled: true,
      nama: "12. Copy 2_2_Angket_Kamad",
      source: "DB_CURRENT",
      sourceSheet: "2_2_Angket_Kamad",

      steps: [
        // 1. Grouping & Sorting
        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },
        // 2. Select Columns
        { type: "COLS", cols: "0..3,5..21"  },
        
        // 3. Rename Headers
        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn",
            "01_Spiritual_1_1_1": "01",
            "02_Spiritual_1_2": "02",
            "03_Spiritual_1_1_2": "03",
            "04_Personal_2_2": "04",
            "05_Intelektual_5_1_1": "05",
            "06_Intelektual_5_1_2": "06",
            "07_Intelektual_5_1_3": "07",
            "08_Personal_3_1": "08",
            "09_Personal_3_2": "09",
            "10_Sosial_4_1": "10",
            "11_Sosial_4_2_1": "11",
            "12_Spiritual_4_2_2": "12",
            "13_Ekologis_7_1_1": "13",
            "14_Ekologis_7_1_2": "14",
            "15_Ekologis_7_1_3": "15"
          }
        },

        // 5. Cleaning Data
        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },

        // 6. Writing Data
        {
          type: "WRITE",
          targetSheet: "2_2_Angket_Kamad", 
          onTargetExists: "CLEAR_AND_WRITE"
        },
        
        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn",
            "01": "01.merasa_kurang_diberi_kebaikan",
            "02": "02.rasa_syukur",
            "04": "04.refleksi_perbaikan",
            "05": "05.bertanya_ke_orang_lain",
            "06": "06.mencari_informasi",
            "07": "07.menggunakan_informasi_untuk_perbaiki_kepemimpinan",
            "08": "08.menyadari_emosi",
            "09": "09.mengelola_emosi_positif",
            "10": "10.mengenali_perundungan",
            "11": "11.sikap_pada_perundungan",
            "13": "13.ikut_membangun_kepedulian_lingkungan",
            "14": "14.peduli_lingkungan_lewat_program"
          }
        },

       {
          type: "ADD_COLUMN",
          colName: "forms",
          value: "angket_kamad"
        },

        {
          type: "UNPIVOT",
          keepCols: ["forms","npsn","jenis_kelamin"], // Kolom identitas yang tetap
          pivotCols: ["01.merasa_kurang_diberi_kebaikan", "02.rasa_syukur", "04.refleksi_perbaikan", "05.bertanya_ke_orang_lain", "06.mencari_informasi", "07.menggunakan_informasi_untuk_perbaiki_kepemimpinan" , "08.menyadari_emosi", "09.mengelola_emosi_positif" , "10.mengenali_perundungan", "11.sikap_pada_perundungan", "13.ikut_membangun_kepedulian_lingkungan", "14.peduli_lingkungan_lewat_program"], // Kolom yang akan dilipat ke bawah
          keyColName: "kelompok", // Nama header baru untuk kategori
          valueColName: "kondisi",   // Nama header baru untuk nilainya
          skipEmpty: true   // hapus row jika empty
        },

        {
          type: "REPLACE",
          col: "kondisi",
          // Opsi 1: Single Replace
          // find: ", S.Pd*", replaceWith: "", 
          
          // Opsi 2: Multiple Replace (Mapping)
          mapping: {
             "Jarang": "0.Jarang",  
             "Kadang-kadang": "1.Kadang-kadang",
             "Sering": "2.Sering",
             "Hampir Selalu": "3.Hampir Selalu"
          },
          matchCase: false       // false = tidak peduli huruf besar/kecil
        },

        {
          type: "WRITE",
          targetSheet: "0_UNPIVOT_Angket", 
          onTargetExists: "APPEND"  // Opsi: CLEAR_AND_WRITE, OVERWRITE, APPEND
        }
      ]
    },

    
//###  2_2_Angket_Ortu
    {
      enabled: true,
      nama: "13. Copy 2_2_Angket_Ortu",
      source: "DB_CURRENT",
      sourceSheet: "2_2_Angket_Ortu",

      steps: [
        // 1. Grouping & Sorting
        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id","nama_anak"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },
        // 2. Select Columns
        { type: "COLS", cols: "0..3,5..15"  },
        
        // 3. Rename Headers
        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn",
            "01_Spiritual_1_2_1": "01",
            "02_Spiritual_1_1_2": "02",
            "02_Spiritual_1_2": "03",
            "03_Intelektual_6_1": "04",
            "04_Personal_3_2": "05",
            "05_Ekologis_7_1": "06"            
          }
        },

        // 5. Cleaning Data
        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },

        // 6. Writing Data
        {
          type: "WRITE",
          targetSheet: "2_3_Angket_Ortu", 
          onTargetExists: "CLEAR_AND_WRITE"
        },

        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn",
            "01": "1.mengungkapkan_rasa_syukur",
            "02": "2.mengungkapkan_rasa_syukur",
            "04": "3.mencari_informasi",
            "05": "4.mengendalikan_emosi_dalam_mendisplinkan_anak",
            "06": "5.memberi_contoh_lingkungan_ke_anak"
          }
        },

       {
          type: "ADD_COLUMN",
          colName: "forms",
          value: "angket_ortu"
        },

        {
          type: "UNPIVOT",
          keepCols: ["forms","npsn","jenis_kelamin"], // Kolom identitas yang tetap
          pivotCols: ["1.mengungkapkan_rasa_syukur", "3.mencari_informasi", "4.mengendalikan_emosi_dalam_mendisplinkan_anak", "5.memberi_contoh_lingkungan_ke_anak"], // Kolom yang akan dilipat ke bawah
          keyColName: "kelompok", // Nama header baru untuk kategori
          valueColName: "kondisi",   // Nama header baru untuk nilainya
          skipEmpty: true   // hapus row jika empty
        },

        {
          type: "REPLACE",
          col: "kondisi",
          // Opsi 1: Single Replace
          // find: ", S.Pd*", replaceWith: "", 
          
          // Opsi 2: Multiple Replace (Mapping)
          mapping: {
             "Jarang": "0.Jarang",  
             "Kadang-kadang": "1.Kadang-kadang",
             "Sering": "2.Sering",
             "Hampir Selalu": "3.Hampir Selalu"
          },
          matchCase: false       // false = tidak peduli huruf besar/kecil
        },

        {
          type: "WRITE",
          targetSheet: "0_UNPIVOT_Angket", 
          onTargetExists: "APPEND"  // Opsi: CLEAR_AND_WRITE, OVERWRITE, APPEND
        }
      ]
    },
    
//###  3_1_FGD_Dewasa
    {
      enabled: true,
      nama: "14. Copy 3_1_FGD_Dewasa",
      source: "DB_CURRENT",
      sourceSheet: "3_1_FGD_Dewasa",

      steps: [
        // 1. Grouping & Sorting
        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },
        // 2. Select Columns
        { type: "COLS", cols: "0..18"  },
        
        // 3. Rename Headers
        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },

        // 5. Cleaning Data
        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },

        // 6. Writing Data
        {
          type: "WRITE",
          targetSheet: "3_1_FGD_Dewasa", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },

  //###  4_1_Wawancara_Guru
    {
      enabled: true,
      nama: "15. Copy 4_1_Wawancara_Guru",
      source: "DB_CURRENT",
      sourceSheet: "4_1_Wawancara_Guru",

      steps: [
        // 1. Grouping & Sorting
        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },
        // 2. Select Columns
        { type: "COLS", cols: "0..3,5..8,11..27,9..10,28"  },
        
        // 3. Rename Headers
        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },

        // 5. Cleaning Data
        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },

        // 6. Writing Data
        {
          type: "WRITE",
          targetSheet: "4_1_Wawancara_Guru", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },

  //###  4_2_Wawancara_Kepala_Madrasah
    {
      enabled: true,
      nama: "16. Copy 4_2_Wawancara_Kepala_Madrasah",
      source: "DB_CURRENT",
      sourceSheet: "4_2_Wawancara_Kepala_Madrasah",

      steps: [
        // 1. Grouping & Sorting
        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },
        // 2. Select Columns
        { type: "COLS", cols: "0..3,5..6,9..28,7..8,29"  },
        
        // 3. Rename Headers
        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },

        // 5. Cleaning Data
        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },

        // 6. Writing Data
        {
          type: "WRITE",
          targetSheet: "4_2_Wawancara_Kepala_Madrasah", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },


  //###  4_3_Wawancara_Orang_Tua
    {
      enabled: true,
      nama: "17. Copy 4_3_Wawancara_Orang_Tua",
      source: "DB_CURRENT",
      sourceSheet: "4_3_Wawancara_Orang_Tua",

      steps: [
        // 1. Grouping & Sorting
        {
          type: "GROUP_TOP_N",
          groupBy: ["madrasah_id"],
          orderBy: "timestamp",
          order: "DESC",
          limitPerGroup: 1
        },
        // 2. Select Columns
        { type: "COLS", cols: "0..3,5..9,12..21,10..11,22"  },
        
        // 3. Rename Headers
        {
          type: "RENAME_HEADERS",
          mapping: {
            "madrasah_id": "npsn"
          }
        },

        // 5. Cleaning Data
        {
          type: "CLEAN_DATA",
          cleanDataDimensions: true,
          textClean: {
            decodeHtml: true,
            decodeCols: "AUTO",
            normalizeUnicode: true
          }
        },

        // 6. Writing Data
        {
          type: "WRITE",
          targetSheet: "4_3_Wawancara_Orang_Tua", 
          onTargetExists: "CLEAR_AND_WRITE"
        }
      ]
    },

    // Tambahkan pipeline lain di sini...
  ]
};



/**
 * ==============================================================================
 * MAIN RUNNER
 * ==============================================================================
 */
function mainRunner() {
  console.log("=== ETL START ===");
  ETL_CACHE = {};
  ETL_STATS = {};
  
  const startTotal = Date.now();
  
  try {
    executeEtlEngine(MASTER_CONFIG, startTotal);
  } catch (e) {
    console.error(`FATAL ERROR: ${e.message}`);
  }
  
  console.log(`=== ETL FINISHED in ${(Date.now() - startTotal) / 1000}s ===`);
  logStatsTable(ETL_STATS);
}


/**
 * ==============================================================================
 * CORE ENGINE
 * ==============================================================================
 */
function executeEtlEngine(config, startTotal) {
  const ssCurrent = SpreadsheetApp.getActiveSpreadsheet();
  
  // Validasi Target
  let ssTarget;
  try {
    ssTarget = config.TARGET_ID && config.TARGET_ID.trim() !== ""
      ? SpreadsheetApp.openById(config.TARGET_ID)
      : ssCurrent;
  } catch (e) {
    throw new Error(`Gagal membuka Target Spreadsheet (${config.TARGET_ID}): ${e.message}`);
  }

  for (const pipe of config.PIPELINES) {
    if (!pipe.enabled) continue;

    if (Date.now() - startTotal > (config.TIME_LIMIT_MS || 300000)) {
      console.warn("⏳ Waktu eksekusi hampir habis. Menghentikan proses pipeline berikutnya untuk keamanan.");
      ETL_STATS["SYSTEM"] = { Status: "TIMEOUT_PREVENTION_TRIGGERED" };
      break; 
    }

    const start = Date.now();
    let status = "OK";
    let rowsBefore = 0;
    let rowsAfter = 0;
    let colsAfter = 0;

    try {
      console.log(`▶ Pipeline: ${pipe.nama}`);

      let data = loadData(pipe, config, ssCurrent);
      rowsBefore = Math.max(0, data.length - 1);

      if (pipe.steps && data.length > 0) {
        data = processSteps(data, pipe.steps, { ssTarget, config, pipe });
      }

      rowsAfter = Math.max(0, data ? data.length - 1 : 0);
      colsAfter = data && data[0] ? data[0].length : 0;

      if (pipe.saveToCache) {
        ETL_CACHE[pipe.targetSheet] = data; 
      }

      data = null; 

      ETL_STATS[pipe.nama] = {
        Pipeline: pipe.nama,
        Rows_Before: rowsBefore,
        Rows_After: rowsAfter,
        Cols: colsAfter,
        Duration_ms: Date.now() - start,
        Status: status
      };

    } catch (e) {
      console.error(`✖ ${pipe.nama}: ${e.message}`);
      ETL_STATS[pipe.nama] = {
        Pipeline: pipe.nama,
        Rows_Before: rowsBefore,
        Rows_After: 0,
        Cols: 0,
        Duration_ms: Date.now() - start,
        Status: `ERROR: ${e.message}`
      };
    }
  }
}

/**
 * Helper Load Data
 */
function loadData(pipe, config, ssCurrent) {
  if (pipe.source === "CACHE") {
    const cachedData = ETL_CACHE[pipe.sourceSheet];
    if (!cachedData) throw new Error("Cache source not found. Pastikan urutan pipeline benar.");
    return cachedData.map(row => [...row]); 
  } else {
    const sid = config.SOURCES[pipe.source];
    let ss, sh;
    
    try {
      ss = sid ? SpreadsheetApp.openById(sid) : ssCurrent;
    } catch(e) {
      throw new Error(`Gagal membuka Source Spreadsheet ID '${pipe.source}': ${e.message}`);
    }

    sh = ss.getSheetByName(pipe.sourceSheet);
    if (!sh) throw new Error(`Source sheet tidak ditemukan: ${pipe.sourceSheet}`);
    
    if (sh.getLastRow() === 0) return [];
    return sh.getDataRange().getValues();
  }
}

/**
 * Helper Process Steps
 */
function processSteps(data, steps, context) {
  let processedData = data;
  
  steps.forEach(step => {
    switch (step.type) {
      case "COLS":
        processedData = extractCols(processedData, parseCols(step.cols));
        break;

      case "GROUP_TOP_N":
        processedData = groupTopN(processedData, step);
        break;

      case "RENAME_HEADERS":
        processedData = renameHeaders(processedData, step.mapping);
        break;

      case "ADD_COLUMN":
        processedData = addColumn(processedData, step);
        break;

      case "REPLACE": // STEP BARU: Simple Replace dengan Wildcard *
        processedData = simpleReplace(processedData, step);
        break;

      case "REGEX_REPLACE":
        processedData = regexReplace(processedData, step);
        break;

      case "UNPIVOT":
        processedData = unpivotData(processedData, step);
        break;

      case "CLEAN_DATA":
        if (step.cleanDataDimensions) {
           processedData = cleanDataDimensions(processedData, step.textClean);
        }
        break;

      case "WRITE":
        const targetName = step.targetSheet || context.pipe.targetSheet;
        if (!targetName) throw new Error("Target Sheet belum ditentukan di step WRITE atau pipeline config.");

        if (!context.config.DRY_RUN) {
           if (processedData.length > 0) {
             writeCleanToSheet(
               context.ssTarget, 
               targetName, 
               processedData, 
               { onTargetExists: step.onTargetExists || "CLEAR_AND_WRITE" }
             );
             SpreadsheetApp.flush(); 
           } else {
             console.warn(`⚠ Pipeline ${context.pipe.nama}: Data kosong saat mencapai step WRITE. Skip penulisan.`);
           }
        } else {
           dryRunPreview(context.pipe, processedData);
        }
        break;

      default:
        console.warn(`Unknown step skipped: ${step.type}`);
    }
  });
  
  return processedData;
}

/**
 * ==============================================================================
 * WRITE + SHEET UTILS (UPDATED FOR APPEND)
 * ==============================================================================
 */
function writeCleanToSheet(ss, name, data, opt = {}) {
  const mode = opt.onTargetExists;
  
  // === LOGIC KHUSUS APPEND ===
  if (mode === "APPEND") {
    let sh = ss.getSheetByName(name);
    
    // 1. Jika Sheet belum ada -> Buat & Tulis Normal
    if (!sh) {
      sh = ss.insertSheet(name);
      writeDataStandard(sh, data);
      return;
    }

    // 2. Jika Sheet ada tapi kosong -> Tulis Normal
    if (sh.getLastRow() === 0) {
      writeDataStandard(sh, data);
      return;
    }

    // 3. Validasi Struktur Header
    const existingHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const newHeaders = data[0];

    if (!isHeaderMatch(existingHeaders, newHeaders)) {
      console.warn(`⚠ WRITE SKIP (APPEND): Header mismatch di sheet '${name}'.`);
      console.warn(`[Existing]: ${existingHeaders.join(" | ")}`);
      console.warn(`[New Data]: ${newHeaders.join(" | ")}`);
      return; // Skip writing
    }

    // 4. Append Data (Hanya Body, Tanpa Header)
    if (data.length > 1) {
      const dataToAppend = data.slice(1);
      
      // Resize baris jika perlu
      const lastRow = sh.getLastRow();
      const requiredRows = lastRow + dataToAppend.length;
      if (sh.getMaxRows() < requiredRows) {
        sh.insertRowsAfter(sh.getMaxRows(), requiredRows - sh.getMaxRows());
      }
      
      sh.getRange(lastRow + 1, 1, dataToAppend.length, dataToAppend[0].length).setValues(dataToAppend);
      console.log(`✔ APPEND SUKSES: ${dataToAppend.length} baris ditambahkan ke '${name}'.`);
    } else {
      console.log(`ℹ APPEND: Tidak ada data baru (hanya header).`);
    }
    return;
  }

  // === LOGIC STANDARD (OVERWRITE / CLEAR_AND_WRITE) ===
  const sh = prepareTargetSheet(ss, name, mode);
  writeDataStandard(sh, data);
}

// Helper untuk penulisan standar (full replace)
function writeDataStandard(sh, data) {
  if (!data || data.length === 0) return;
  autoTemplateSize(sh, data.length, data[0].length);
  sh.getRange(1, 1, data.length, data[0].length).setValues(data);
  trimTrailingEmpty(sh, data.length, data[0].length);
}

// Helper untuk membandingkan array header
function isHeaderMatch(h1, h2) {
  if (!h1 || !h2) return false;
  if (h1.length !== h2.length) return false;
  
  // Bandingkan setiap kolom (case-sensitive + trim)
  return h1.every((val, index) => String(val).trim() === String(h2[index]).trim());
}

function prepareTargetSheet(ss, name, mode) {
  let sh = ss.getSheetByName(name);
  
  if (!sh) {
    return ss.insertSheet(name);
  }

  if (mode === "OVERWRITE") {
    ss.deleteSheet(sh); 
    return ss.insertSheet(name);
  } else if (mode === "CLEAR_AND_WRITE") {
    sh.clear(); 
    return sh;
  } else if (mode === "CANCEL") {
    throw new Error(`Target sheet '${name}' sudah ada. Proses dibatalkan (Mode CANCEL).`);
  }
  
  return sh;
}

function autoTemplateSize(sh, r, c) {
  const maxRows = sh.getMaxRows();
  const maxCols = sh.getMaxColumns();
  
  if (maxRows < r) sh.insertRowsAfter(maxRows, r - maxRows);
  if (maxCols < c) sh.insertColumnsAfter(maxCols, c - maxCols);
}

function trimTrailingEmpty(sh, r, c) {
  const maxRows = sh.getMaxRows();
  const maxCols = sh.getMaxColumns();

  if (maxRows > r) sh.deleteRows(r + 1, maxRows - r);
  if (maxCols > c) sh.deleteColumns(c + 1, maxCols - c);
}

/**
 * ==============================================================================
 * UNPIVOT (WIDE TO LONG)
 * ==============================================================================
 */
function unpivotData(data, cfg) {
  if (!data || data.length <= 1) return data;

  const headers = data[0];
  const rows = data.slice(1);

  const keepIndices = cfg.keepCols.map(colName => {
    const idx = headers.indexOf(colName);
    if (idx === -1) throw new Error(`UNPIVOT Error: Kolom Keep '${colName}' tidak ditemukan.`);
    return idx;
  });

  let pivotIndices = [];
  if (cfg.pivotCols && Array.isArray(cfg.pivotCols)) {
    pivotIndices = cfg.pivotCols.map(colName => {
      const idx = headers.indexOf(colName);
      if (idx === -1) throw new Error(`UNPIVOT Error: Kolom Pivot '${colName}' tidak ditemukan.`);
      return idx;
    });
  } else {
    pivotIndices = headers.map((_, i) => i).filter(i => !keepIndices.includes(i));
  }

  const newHeaders = [
    ...cfg.keepCols, 
    cfg.keyColName || "Key", 
    cfg.valueColName || "Value"
  ];

  const resultRows = [];

  rows.forEach(row => {
    const keepValues = keepIndices.map(i => row[i]);

    pivotIndices.forEach(pIdx => {
      const pivotHeaderName = headers[pIdx];
      const pivotValue = row[pIdx];

      if (cfg.skipEmpty && (pivotValue === "" || pivotValue === null)) return;

      resultRows.push([
        ...keepValues,
        pivotHeaderName,
        pivotValue
      ]);
    });
  });

  return [newHeaders].concat(resultRows);
}

/**
 * ==============================================================================
 * GROUP_TOP_N (MULTI GROUP BY + LIMIT)
 * ==============================================================================
 */
function groupTopN(data, cfg) {
  if (!data || data.length <= 1) return data;

  const headers = data[0];
  const rows = data.slice(1);

  const groupCols = Array.isArray(cfg.groupBy) ? cfg.groupBy : [cfg.groupBy];
  
  const gIdxs = groupCols.map(col => {
    const idx = headers.indexOf(col);
    if (idx === -1) throw new Error(`Kolom groupBy '${col}' tidak ditemukan.`);
    return idx;
  });

  const oIdx = headers.indexOf(cfg.orderBy);
  if (oIdx === -1) throw new Error(`Kolom orderBy '${cfg.orderBy}' tidak ditemukan.`);

  const groups = {};

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const key = gIdxs.map(idx => r[idx]).join("||");
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  const result = [];
  const isAsc = cfg.order === "ASC";
  const limit = cfg.limitPerGroup ?? 1;

  for (const key in groups) {
    const groupRows = groups[key];
    
    groupRows.sort((a, b) => {
      const timeA = parseDateSafe(a[oIdx]);
      const timeB = parseDateSafe(b[oIdx]);
      return isAsc ? timeA - timeB : timeB - timeA;
    });

    for (let j = 0; j < Math.min(limit, groupRows.length); j++) {
      result.push(groupRows[j]);
    }
  }

  return [headers].concat(result);
}

function parseDateSafe(val) {
    if (val instanceof Date) return val.getTime();
    if (!val) return 0;
    const parsed = Date.parse(val);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * ==============================================================================
 * CLEAN DATA + TEXT
 * ==============================================================================
 */
function cleanDataDimensions(data, textClean) {
  if (!data || data.length === 0) return data;

  const rows = [data[0]].concat(
    data.slice(1).filter(r => r.some(c => String(c).trim() !== ""))
  );

  let maxCol = 0;
  rows.forEach(r => {
    for (let i = r.length - 1; i >= 0; i--) {
      if (String(r[i]).trim() !== "") {
        if (i > maxCol) maxCol = i;
        break;
      }
    }
  });

  return rows.map((row, rIdx) => {
    const sliced = row.slice(0, maxCol + 1);
    if (!textClean || rIdx === 0) return sliced;

    return sliced.map((cell, cIdx) =>
      shouldCleanText(cell, cIdx, textClean) ? cleanText(cell, textClean) : cell
    );
  });
}

function shouldCleanText(val, colIdx, cfg) {
  if (typeof val !== "string") return false;
  if (cfg.decodeCols === "ALL") return true;
  if (cfg.decodeCols === "AUTO") return /&[#a-zA-Z0-9]+;|[\u0300-\u036f]/.test(val);
  if (Array.isArray(cfg.decodeCols)) return cfg.decodeCols.includes(colIdx);
  return false;
}

function cleanText(text, cfg) {
  let curr = text;
  
  if (cfg.decodeHtml) {
    let prev;
    let loopLimit = 5; 
    
    do {
      prev = curr;
      curr = curr
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, " ");
      loopLimit--;
    } while (curr !== prev && loopLimit > 0);
  }

  if (cfg.normalizeUnicode && curr.normalize) {
    curr = curr.normalize("NFC");
  }
  return curr.trim();
}

/**
 * ==============================================================================
 * BASIC HELPERS
 * ==============================================================================
 */
function parseCols(expr) {
  if (typeof expr === 'number') return [expr];
  if (Array.isArray(expr)) return expr;
  
  return String(expr).split(",").flatMap(p =>
    p.includes("..")
      ? Array.from({ length: p.split("..")[1] - p.split("..")[0] + 1 },
        (_, i) => Number(p.split("..")[0]) + i)
      : Number(p)
  );
}

function extractCols(data, idx) {
  if (!data || data.length === 0) return [];
  const maxIdx = data[0].length - 1;
  const validIdx = idx.filter(i => i >= 0 && i <= maxIdx);
  
  return data.map(r => validIdx.map(i => r[i]));
}

function renameHeaders(data, mapping) {
  if (!data || data.length === 0 || !mapping) return data;
  
  const headers = data[0]; 
  
  Object.keys(mapping).forEach(oldName => {
    const idx = headers.indexOf(oldName);
    if (idx !== -1) {
      headers[idx] = mapping[oldName];
    }
  });
  
  return data;
}

function addColumn(data, cfg) {
  if (!data || data.length === 0) return data;
  if (!cfg.colName) throw new Error("ADD_COLUMN Error: 'colName' harus diisi.");

  const headers = [...data[0], cfg.colName];

  const rows = data.slice(1).map(row => {
    return [...row, cfg.value]; 
  });

  return [headers].concat(rows);
}

// FUNGSI BARU: SIMPLE REPLACE (SUPPORT WILDCARD * & MAPPING)
function simpleReplace(data, cfg) {
  if (!data || data.length === 0) return data;
  
  const headers = data[0];
  const colIdx = headers.indexOf(cfg.col);
  
  if (colIdx === -1) {
    console.warn(`⚠ REPLACE SKIP: Kolom '${cfg.col}' tidak ditemukan. Header tersedia: [${headers.join(", ")}]`);
    return data;
  }

  // Helper untuk membuat Regex dari pattern wildcard
  const createRegex = (pattern, matchCase) => {
      // Escape special regex chars KECUALI *, kemudian ubah * menjadi .*
      let p = String(pattern).replace(/[.+?^${}()|[\]\\]/g, '\\$&'); 
      // Restore wildcard * menjadi .*
      p = p.replace(/\*/g, '.*');
      const flags = matchCase ? 'g' : 'gi'; 
      return new RegExp(p, flags);
  };

  // Siapkan daftar penggantian
  let replacements = [];
  
  if (cfg.mapping) {
      // Mode Multiple: Mapping
      for (const [find, replaceWith] of Object.entries(cfg.mapping)) {
          replacements.push({
              regex: createRegex(find, cfg.matchCase),
              replaceWith: replaceWith
          });
      }
  } else if (cfg.find !== undefined) {
      // Mode Single: Find/Replace
      replacements.push({
          regex: createRegex(cfg.find, cfg.matchCase),
          replaceWith: cfg.replaceWith || ""
      });
  }

  return data.map((row, i) => {
    if (i === 0) return row; 
    
    const newRow = [...row];
    let val = String(newRow[colIdx] || ""); // Pastikan string
    
    // Terapkan semua penggantian secara berurutan
    replacements.forEach(rep => {
        val = val.replace(rep.regex, rep.replaceWith);
    });

    newRow[colIdx] = val;
    return newRow;
  });
}

function regexReplace(data, cfg) {
  if (!data || data.length === 0) return data;
  const headers = data[0];
  const colIdx = headers.indexOf(cfg.col);
  
  if (colIdx === -1) {
    console.warn(`⚠ REGEX_REPLACE SKIP: Kolom '${cfg.col}' tidak ditemukan. Header tersedia: [${headers.join(", ")}]`);
    return data;
  }

  const regex = new RegExp(cfg.regex, cfg.flags || "");
  const testRegex = cfg.test ? new RegExp(cfg.test, cfg.flags || "") : null;

  return data.map((row, i) => {
    if (i === 0) return row; 
    
    const newRow = [...row];
    let val = String(newRow[colIdx] || "").trim();
    
    if (!testRegex || testRegex.test(val)) {
       newRow[colIdx] = val.replace(regex, cfg.replaceWith);
    }
    
    return newRow;
  });
}

function dryRunPreview(pipe, data) {
  console.log(`🧪 DRY-RUN: ${pipe.nama}`);
  if (data.length > 0) {
      console.log("Header:", data[0]);
      console.log(`Preview ${Math.min(3, data.length-1)} rows:`);
      data.slice(1, 4).forEach((r, i) =>
        console.log(`Row ${i + 1}:`, r)
      );
  } else {
      console.log("Data kosong.");
  }
}

function logStatsTable(stats) {
  const rows = Object.values(stats);
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  
  console.log("\n=== ETL STATS ===");
  console.log(headers.join(" | "));
  rows.forEach(r => console.log(headers.map(h => r[h]).join(" | ")));
}