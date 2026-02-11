import fs from "fs";
import csv from "csv-parser";
import nodemailer from "nodemailer";

// Common SMTP configurations with multiple port options
const SMTP_CONFIGS = {
  "gmail.com": [
    { host: "smtp.gmail.com", port: 587, secure: false },
    { host: "smtp.gmail.com", port: 465, secure: true }
  ],
  "outlook.com": [
    { host: "smtp-mail.outlook.com", port: 587, secure: false },
    { host: "smtp.office365.com", port: 587, secure: false }
  ],
  "hotmail.com": [
    { host: "smtp-mail.outlook.com", port: 587, secure: false }
  ],
  "yahoo.com": [
    { host: "smtp.mail.yahoo.com", port: 587, secure: false },
    { host: "smtp.mail.yahoo.com", port: 465, secure: true }
  ],
  "icloud.com": [
    { host: "smtp.mail.me.com", port: 587, secure: false }
  ],
  "zoho.com": [
    { host: "smtp.zoho.com", port: 587, secure: false },
    { host: "smtp.zoho.com", port: 465, secure: true }
  ]
};

// Default configurations to try for unknown domains
const DEFAULT_CONFIGS = (domain) => [
  { host: `smtp.${domain}`, port: 587, secure: false },
  { host: `smtp.${domain}`, port: 465, secure: true },
  { host: `mail.${domain}`, port: 587, secure: false },
  { host: `mail.${domain}`, port: 465, secure: true },
  { host: `smtp.${domain}`, port: 25, secure: false },
  { host: domain, port: 587, secure: false },
  { host: domain, port: 465, secure: true }
];

function getSMTPConfigs(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  return SMTP_CONFIGS[domain] || DEFAULT_CONFIGS(domain);
}

async function checkSMTP(email, pass, customHost = null, customPort = null) {
  // If custom host/port provided, only try that
  if (customHost) {
    const configs = [{
      host: customHost,
      port: customPort || 587,
      secure: customPort === 465
    }];
    return await tryConfigs(email, pass, configs);
  }

  // Otherwise try all possible configurations
  const configs = getSMTPConfigs(email);
  return await tryConfigs(email, pass, configs);
}

async function tryConfigs(email, pass, configs) {
  for (const config of configs) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: email,
          pass: pass
        },
        tls: { 
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        },
        connectionTimeout: 20000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
        logger: false,
        debug: false
      });

      await transporter.verify();
      return { 
        success: true, 
        host: config.host, 
        port: config.port,
        secure: config.secure 
      };
    } catch (err) {
      // Continue to next config
      continue;
    }
  }
  
  // All configs failed
  return { success: false, error: "All SMTP configurations failed" };
}

async function processCSV(file) {
  const rows = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(csv())
      .on("data", (data) => {
        rows.push(data);
      })
      .on("end", async () => {
        try {
          console.log(`\n📧 Processing ${rows.length} SMTP credentials...\n`);
          
          let working = 0;
          let failed = 0;
          const results = [];

          for (const row of rows) {
            const email = row.email?.trim();
            const password = row.app_password?.trim() || row.password?.trim();
            const customHost = row.smtp_host?.trim() || null;
            const customPort = row.smtp_port ? parseInt(row.smtp_port) : null;

            if (!email || !password) {
              console.log(`⚠️  Skipping invalid row: ${email || "no email"}`);
              continue;
            }

            process.stdout.write(`🔄 Testing ${email}... `);
            
            const result = await checkSMTP(email, password, customHost, customPort);

            if (result.success) {
              console.log(`✅ WORKING (${result.host}:${result.port}${result.secure ? ' SSL' : ''})`);
              working++;
              results.push({ email, status: 'working', ...result });
            } else {
              console.log(`❌ FAILED (${result.error})`);
              failed++;
              results.push({ email, status: 'failed', error: result.error });
            }
          }

          console.log(`\n📊 Summary: ${working} working, ${failed} failed\n`);
          
          // Save results to file
          const successFile = './smtp_working.txt';
          const workingEmails = results
            .filter(r => r.status === 'working')
            .map(r => `${r.email} | ${r.host}:${r.port} | ${r.secure ? 'SSL' : 'TLS'}`)
            .join('\n');
          
          if (workingEmails) {
            fs.writeFileSync(successFile, workingEmails);
            console.log(`✓ Working credentials saved to ${successFile}\n`);
          }

          resolve({ working, failed, results });
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

// Run
processCSV("./smtp.csv")
  .then(() => console.log("✓ Process completed"))
  .catch((err) => console.error("✗ Process failed:", err.message));