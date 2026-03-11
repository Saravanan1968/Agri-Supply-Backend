const nodemailer = require("nodemailer");
require('dotenv').config();

console.log("Testing Nodemailer with:");
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "****" : "MISSING");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const mailOptions = {
    from: '"Agri-Supply Test" <' + process.env.EMAIL_USER + '>',
    to: "techcrafters6@gmail.com", // testing to itself
    subject: "Backend Email Test",
    text: "This is a direct test of the Nodemailer transporter from a script.",
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.log("Error occurred:", error.message);
    } else {
        console.log("Email sent successfully:", info.messageId);
    }
    process.exit();
});
