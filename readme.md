node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

mkdir data

node lib/hash-password.js admin123

npm install bcrypt

node server.js