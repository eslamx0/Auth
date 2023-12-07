const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure:false,
  
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  }
});

async function sendEmail(options) {
  const info = await transport.sendMail({
    from: 'hi7u3xe@gmail.com',
    to: options.emailTo,
    subject: options.subject,
    text: options.text
  });

  console.log("Message sent: %s", info.messageId);
}

module.exports = sendEmail

