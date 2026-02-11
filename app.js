import fs from "fs";
import csv from "csv-parser";
import nodemailer from "nodemailer";

// Common SMTP configurations
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
  ],
  "aol.com": [
    { host: "smtp.aol.com", port: 587, secure: false }
  ]
};

// Generate default configurations for unknown domains
function getDefaultConfigs(domain) {
  return [
    { host: `smtp.${domain}`, port: 587, secure: false },
    { host: `smtp.${domain}`, port: 465, secure: true },
    { host: `smtp.${domain}`, port: 25, secure: false },
    { host: `mail.${domain}`, port: 587, secure: false },
    { host: `mail.${domain}`, port: 465, secure: true },
    { host: `mail.${domain}`, port: 25, secure: false },
    { host: domain, port: 587, secure: false },
    { host: domain, port: 465, secure: true },
    { host: domain, port: 25, secure: false },
    { host: `send.${domain}`, port: 587, secure: false },
    { host: `send.${domain}`, port: 465, secure: true },
    { host: `outgoing.${domain}`, port: 587, secure: false },
    { host: `outgoing.${domain}`, port: 465, secure: true }
  ];
}

function getSMTPConfigs(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  return SMTP_CONFIGS[domain] || getDefaultConfigs(domain);
}

async function testSingleConfig(email, pass, config) {
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: email,
        pass: pass.replace(/\s/g, ""),
      },
      tls: { 
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });

    // Actually send email to test
    await transporter.sendMail({
      from: email,
      to: email,
      subject: "SMTP Test",
      text: "SMTP working",
    });

    return true;
  } catch (err) {
    return false;
  }
}

async function checkSMTP(email, pass, customHost = null, customPort = null) {
  // If custom host/port provided, only try that
  if (customHost) {
    const config = {
      host: customHost,
      port: customPort || 587,
      secure: customPort === 465
    };
    
    const success = await testSingleConfig(email, pass, config);
    
    if (success) {
      return { 
        success: true, 
        host: config.host,
        port: config.port,
        secure: config.secure
      };
    } else {
      return { success: false, error: "Custom SMTP configuration failed" };
    }
  }

  // Try all possible configurations
  const configs = getSMTPConfigs(email);
  
  for (const config of configs) {
    const success = await testSingleConfig(email, pass, config);
    
    if (success) {
      return { 
        success: true, 
        host: config.host,
        port: config.port,
        secure: config.secure
      };
    }
  }
  
  return { success: false, error: "All SMTP configurations failed" };
}

// Helper function to get password from row (supports multiple column names)
function getPassword(row) {
  return row.pass?.trim() || 
         row.password?.trim() || 
         row.app_password?.trim() || 
         row.apppassword?.trim() || 
         row.pwd?.trim() ||
         null;
}

// Helper function to get host from row
function getHost(row) {
  return row.host?.trim() || 
         row.smtp_host?.trim() || 
         row.smtphost?.trim() ||
         null;
}

// Helper function to get port from row
function getPort(row) {
  const port = row.port || row.smtp_port || row.smtpport;
  return port ? parseInt(port) : null;
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
          const workingAccounts = [];

          for (const row of rows) {
            const email = row.email?.trim();
            const password = getPassword(row);
            const customHost = getHost(row);
            const customPort = getPort(row);

            if (!email || !password) {
              console.log(`⚠️  Skipping invalid row: ${email || "no email"} (missing ${!email ? 'email' : 'password'})`);
              continue;
            }

            process.stdout.write(`🔄 Testing ${email}... `);
            
            const result = await checkSMTP(email, password, customHost, customPort);

            if (result.success) {
              console.log(`✅ WORKING (${result.host}:${result.port}${result.secure ? ' SSL' : ''})`);
              working++;
              workingAccounts.push({
                email,
                password,
                host: result.host,
                port: result.port,
                secure: result.secure
              });
            } else {
              console.log(`❌ FAILED (${result.error})`);
              failed++;
            }
          }

          console.log(`\n📊 Summary: ${working} working, ${failed} failed\n`);
          
          // Save working accounts
          if (workingAccounts.length > 0) {
            const outputFile = './smtp_working.csv';
            const csvContent = 'email,password,host,port,secure\n' + 
              workingAccounts
                .map(acc => `${acc.email},${acc.password},${acc.host},${acc.port},${acc.secure}`)
                .join('\n');
            fs.writeFileSync(outputFile, csvContent);
            console.log(`✓ Working credentials saved to ${outputFile}\n`);
          }

          resolve({ working, failed, workingAccounts });
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

processCSV("./smtp.csv")
  .then(() => console.log("✓ Process completed"))
  .catch((err) => console.error("✗ Process failed:", err.message));