const nodeMailer = require("nodemailer");

const sendEmail = async (options) => {
  const smtpMail = process.env.SMPT_MAIL || process.env.SMTP_MAIL;
  const smtpPassword = process.env.SMPT_PASSWORD || process.env.SMTP_PASSWORD;
  const smtpHost = process.env.SMPT_HOST || process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const smtpPort = process.env.SMPT_PORT || process.env.SMTP_PORT || process.env.EMAIL_PORT;
  const smtpService = process.env.SMPT_SERVICE || process.env.SMTP_SERVICE;

  const transporter = nodeMailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    service: smtpService,
    auth: {
      user: smtpMail,
      pass: smtpPassword,
    },
  });

  const mailOptions = {
    from: smtpMail,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
