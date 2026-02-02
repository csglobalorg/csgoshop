const http = require('http');

const data = JSON.stringify({
    email: 'csgoshop@admin.com',
    password: 'admin'
});

// Note: I am trying 'admin' as password first, user didn't specify what they used. 
// If this fails, I'll ask user for password or tell them to reset. 
// Actually, user said in previous prompt 'gmail pass diye click kori'. 
// Let's assume standard '123456' or similar for testing?
// The user just sent the DB row, but not the password they typed.
// Let's try to simulate the request. 

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
