const { TOTP, generateSecret } = require('otplib');
const auth = new TOTP();
console.log(auth.generateSecret());
