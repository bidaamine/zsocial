const fs = require('fs');
const pdf = require('pdf-parse');
let dataBuffer = fs.readFileSync('Zad Social Next generation 16.06.2026-1.pdf');
pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('pdf_text.txt', data.text);
});
