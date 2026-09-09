// Ejecutar UNA SOLA VEZ en VPS2:  node generate-vapid-keys.js
// Copia las claves generadas en el .env
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('\n✅ Claves VAPID generadas. Agrega estas líneas al .env:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('\n');
