import nodemailer from "nodemailer";

const smtp = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "khalof961@gmail.com",
    pass: "vfdn kruo pkyi lsug".replace(/\s/g, ""),
  },
});

async function send() {
  await smtp.sendMail({
    from: "khalof961@gmail.com",
    to: "palgautam46@gmail.com",
    subject: "SMTP test",
    text: "Gmail SMTP working",
  });

  console.log("Sent");
}

send();
