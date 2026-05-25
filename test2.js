import nodemailer from "nodemailer";

const smtp = nodemailer.createTransport({
  // host: "mail.callvise.com",
  //  port: 465,        // ✅ Secure SSL port
  // secure: true,     // ✅ Must be true for port 465
  // auth: {
  //   user: "noreply@callvise.com",
  //   pass: "rja*.AKK33T5"//.replace(/\s/g, ""),
  // },

    // host: "mail.mailerss.xyz",
    // port: 587,
    // secure: false, // TLS
    // auth: {
    //   user: "alex@mailerss.xyz",
    //   pass: "SMT393$23329",
    // },

    /*
    
SERVER_EMAIL=no-reply@mypbxnumber.com
SERVER_EMAIL_PASSWORD="Passc0de@123#"
SERVER_HOST=mail.privateemail.com
SERVER_PORT=465

     */

        host: "mail.privateemail.com",
      port: 465,
      secure: true, // TLS
      auth: {
        user: "no-reply@mypbxnumber.com",
        pass: "Passc0de@123#",
      },


  


});

async function send() {
  await smtp.sendMail({
    from: "no-reply@mypbxnumber.com",
    to: "palgautam46@gmail.com",
    subject: "SMTP test CallVise",
    text: "Gmail SMTP working",
  });

  console.log("Sent");
}

send();



// SERVER_EMAIL=noreply@callvise.com
// SERVER_EMAIL_PASSWORD="Passc0de@123#"
// SERVER_HOST=mail.callvise.com
// SERVER_PORT=465