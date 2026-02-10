import fs from "fs";
import csv from "csv-parser";
import nodemailer from "nodemailer";

const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 587;

async function checkSMTP(email, pass) {
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: {
        user: email,
        pass: pass
      },
      tls: { rejectUnauthorized: false }
    });

    await transporter.verify();
    return true;
  } catch (err) {
    return false;
  }
}

async function processCSV(file) {
  const rows = [];

  fs.createReadStream(file)
    .pipe(csv())
    .on("data", (data) => rows.push(data))
    .on("end", async () => {
      for (const row of rows) {
        const email = row.email;
        const password = row.app_password;

        const ok = await checkSMTP(email, password);

        console.log(
          `${email} => ${ok ? "WORKING ✅" : "FAILED ❌"}`
        );
      }
    });
}

processCSV("./smtp.csv");
