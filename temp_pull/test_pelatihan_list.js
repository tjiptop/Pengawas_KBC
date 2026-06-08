function test_getPelatihanList() {
  try {
    // Try to get with a dummy NIP or empty
    const res = apiGetPelatihanList('1234567890');
    console.log("RESULT:", JSON.stringify(res));
  } catch(e) {
    console.error("ERROR:", e.stack);
  }
}
