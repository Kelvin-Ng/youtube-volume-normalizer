function db2ratio(db) {
    return 10. ** (db / 20.);
}
function ratio2db(ratio) {
    return 20. * Math.log10(ratio);
}

export { db2ratio, ratio2db };
