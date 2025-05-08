import crypto from 'crypto';

const secret = crypto.randomBytes(32).toString('base64');
console.log('Generated Session Secret:');
console.log(secret);
console.log('\nAdd this to your .env file as:');
console.log(`SESSION_SECRET=${secret}`); 