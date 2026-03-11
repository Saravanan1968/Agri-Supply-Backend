const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "techcrafters6@gmail.com",
        pass: "fbsq smvq dxyc bscw",
    },
});

const sendTestEmail = async () => {
    const mailOptions = {
        from: {
            name: "Drug Tracker Test",
            address: "techcrafters6@gmail.com"
        },
        to: "techcrafters6@gmail.com", // Send to self for testing
        subject: "Test Email from Drug Tracker",
        text: "This is a test email to verify the nodemailer configuration.",
    };

    try {
        console.log("Attempting to send email...");
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully!");
        console.log("Message ID:", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

sendTestEmail();
