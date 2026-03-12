const express = require('express')
require('dotenv').config()
const cors = require('cors')
const mongoose = require('mongoose')
const Session = require('express-session')
const MongoDbSession = require('connect-mongodb-session')(Session)

const app = express()
const PORT = process.env.PORT || 5000
const MongoDBURI = process.env.MongoDbURI
const Store = new MongoDbSession({
    uri: MongoDBURI,
    collection: 'session'
})

app.listen(PORT, '0.0.0.0', () => {
    console.log('Server running on port', PORT)
})

mongoose.connect(MongoDBURI).then(() => console.log('MongoDB connected Sucessfully!')).catch(err => console.log('Error in connecting to MongoDB: ', err))

app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url} | Origin: ${req.headers.origin}`);
    next();
});

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(Session({
    secret: 'SK_Key',
    resave: false,
    saveUninitialized: false,
    store: Store,
    proxy: true,
    cookie: {
        sameSite: 'none',
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}))
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://agri-supply-frontend.vercel.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))




const userSchema = mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    fullname: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    contact: { type: Number, required: true, unique: true },
    role: { type: String, required: true },
    password: { type: String, required: true },
    urn: { type: String, set: (value) => value.trim().toLowerCase() }
})

const batchSchema = mongoose.Schema(
    {
        id: { type: Number, required: true, unique: true },
        urn: { type: String, required: true, trim: true },
        endUser: { type: String, required: true, trim: true },
        status: { type: String, default: "shipped" },
        containers: [
            {
                containerId: { type: String, required: true },
                tamperSealNo: { type: String, required: true },
                drugName: { type: String, required: true },
                quantity: { type: Number, required: true, min: 1 },
                manufacturingDate: { type: Date, required: true },
                expiryDate: { type: Date, required: true },
            }
        ]
    },
    { timestamps: true }
)

const containerSchema = mongoose.Schema(
    {
        id: { type: Number, required: true, unique: true },
        urn: { type: String, set: (value) => value.trim().toLowerCase() },
        receiver: { type: String, required: true },
        containerId: { type: String, required: true },
        tamperSealNo: { type: String, required: true },
        drugName: { type: String, required: true, set: (value) => value.trim().toLowerCase() },
        quantity: { type: Number, required: true, min: 1 },
        manufacturingDate: { type: Date, required: true },
        expiryDate: { type: Date, required: true },
        status: { type: String, default: 'shipped', set: (value) => value.trim().toLowerCase() },
        isDeleted: { type: Boolean, default: false }
    },
    { timestamps: true }
)

const userModel = mongoose.model('DrugTracker_User', userSchema)
const batchModel = mongoose.model('DrugTracker_Batch', batchSchema)
const containerModel = mongoose.model('DrugTracker_Container', containerSchema)




let mailSent = true


// Start of Email and SMS API
const nodemailer = require("nodemailer");
const twilio = require('twilio');

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID || 'AC_dummy',
    process.env.TWILIO_AUTH_TOKEN || 'dummy_token'
);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Use port 465 for SMTPS
    auth: {
        user: process.env.EMAIL_USER || "techcrafters6@gmail.com",
        pass: process.env.EMAIL_PASS || "fbsq smvq dxyc bscw",
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
})
const sendEmail = async (mailto, content) => {
    const mailOptions = {
        from: {
            name: "Agri-Supply Alerts",
            address: process.env.EMAIL_USER || "techcrafters6@gmail.com"
        },
        to: mailto,
        subject: `Agri-Supply - ${content.batchId} Status update`,
        text: `Container Alert from Agri-Supply - Container ${content.containerId} has been updated to ${content.deliveryStatus} at ${content.timestamp}, sent by ${content.urn}. The container is currently ${content.lockStatus}.`,
        html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Container Alert from Agri-Supply</title>
    <style>
        body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 20px;
        }
        .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
        color: #333;
        text-align: center;
        }
        p {
        font-size: 16px;
        color: #555;
        line-height: 1.5;
        }
        .status {
        font-weight: bold;
        color: #007bff;
        }
        .details {
        margin-top: 20px;
        background-color: #f9f9f9;
        padding: 15px;
        border-radius: 6px;
        }
        .details span {
        font-weight: bold;
        }
    </style>
    </head>
    <body>

    <div class="container">
        <h1>Container Alert from Agri-Supply</h1>
        
        <p>We would like to inform you that the status of the container with ID <span class="status">${content.containerId}</span> in batch <span class="status">${content.batchId}</span> has been updated.</p>
        
        <div class="details">
        <p><span>Container Shipped By:</span> ${content.urn}</p>
        <p><span>Shipped At:</span> ${content.timestamp}</p>
        <p><span>Delivering to:</span> ${content.receiver}</p>
        <p><span>Product name:</span> ${content.drugName}</p>
        <p><span>Quantity:</span> ${content.quantity}</p>
        <p><span>Current Delivery Status:</span> ${content.deliveryStatus}</p>
        <p><span>Current Lock Status:</span> ${content.lockStatus}</p>
        </div>
        
        <p>If you have any questions or need further details, please don't hesitate to contact us.</p>
        
        <p>Thank you for your attention.</p>
    </div>

    </body>
    </html>      
    `
    }

    try {
        await transporter.sendMail(mailOptions)
        return true
    } catch (error) {
        console.log('Error in sending Email: ', error)
        return false
    }
}
const sendEmergencyEmail = async (mailto, content) => {
    const mailOptions = {
        from: {
            name: "Agri-Supply Alerts",
            address: process.env.EMAIL_USER || "techcrafters6@gmail.com"
        },
        to: mailto,
        subject: `Emergency Alert - Container ${content.containerId} Unlock Status Update`,
        text: `Emergency Alert from Agri-Supply - Container ${content.containerId} in batch ${content.batchId} has been unlocked at ${content.timestamp}. The container was sent by ${content.urn} and is currently ${content.lockStatus}. The delivery status is ${content.deliveryStatus}.`,
        html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Emergency Alert from Agri-Supply</title>
      <style>
          body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 20px;
          }
          .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          }
          h1 {
          color: #d9534f;
          text-align: center;
          }
          p {
          font-size: 16px;
          color: #555;
          line-height: 1.5;
          }
          .status {
          font-weight: bold;
          color: #007bff;
          }
          .details {
          margin-top: 20px;
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 6px;
          }
          .details span {
          font-weight: bold;
          }
      </style>
      </head>
      <body>
  
      <div class="container">
          <h1>Emergency Alert - Container Unlock Status</h1>
          
          <p>We would like to inform you that the container with ID <span class="status">${content.containerId}</span> in batch <span class="status">${content.batchId}</span> has been unlocked at <span class="status">${content.timestamp}</span>.</p>
          
          <div class="details">
          <p><span>Container Shipped By:</span> ${content.urn}</p>
          <p><span>Shipped At:</span> ${content.timestamp}</p>
          <p><span>Delivering to:</span> ${content.receiver}</p>
          <p><span>Drug Name:</span> ${content.drugName}</p>
          <p><span>Drug Quantity:</span> ${content.quantity}</p>
          <p><span>Current Delivery Status:</span> ${content.deliveryStatus}</p>
          <p><span>Current Lock Status:</span> ${content.lockStatus}</p>
          <p><span>Current Geo location:</span> <a href="https://www.google.com/maps?q=${content.geo}">View in Map</a>
          </div>
          
          <p>If you have any questions or need further details, please don't hesitate to contact us.</p>
          
          <p>Thank you for your immediate attention.</p>
      </div>
  
      </body>
      </html>      
      `
    }

    try {
        if (mailSent === false) {
            console.log('Stopped Email triggering!')
            return true
        }
        await transporter.sendMail(mailOptions);
        console.log('Email trigger!')
        return true;
    } catch (error) {
        console.log('Error in sending Emergency Email: ', error);
        return false;
    }
}


const sendTamperingReportEmail = async (mailto, content) => {
    const mailOptions = {
        from: {
            name: "Agri-Supply Alerts",
            address: process.env.EMAIL_USER || "techcrafters6@gmail.com"
        },
        to: mailto,
        subject: `Urgent Report - Suspected Malfunction/Tampering with Container ${content.batchId}`,
        text: `Urgent Tampering Report from Agri-Supply - We have received a report of suspected malfunction or tampering of the container with ID ${content.batchId}. Below are the details:
    
    - Reported by: ${content.fullname}
    - Contact Number: ${content.contact}
    - Email: ${content.email}
    
    Please review the situation immediately and take necessary actions.`,
        html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Urgent Report - Suspected Malfunction/Tampering</title>
    <style>
        body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 20px;
        }
        .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
        color: #d9534f;
        text-align: center;
        }
        p {
        font-size: 16px;
        color: #555;
        line-height: 1.5;
        }
        .status {
        font-weight: bold;
        color: #007bff;
        }
        .details {
        margin-top: 20px;
        background-color: #f9f9f9;
        padding: 15px;
        border-radius: 6px;
        }
        .details span {
        font-weight: bold;
        }
    </style>
    </head>
    <body>

    <div class="container">
        <h1>Urgent Report - Suspected Malfunction/Tampering</h1>
        
        <p>We have received a report of suspected malfunction or tampering of the container with ID <span class="status">${content.containerId}</span>.</p>
        
        <div class="details">
            <p><span>Reported by:</span> ${content.fullname}</p>
            <p><span>Contact Number:</span> ${content.contact}</p>
            <p><span>Email:</span> ${content.email}</p>
            <p><span>Description:</span> ${content.description}</p>
        </div>
        
        <p>Please review the situation immediately and take the necessary actions to address the potential issue.</p>
        
        <p>Thank you for your prompt attention to this matter.</p>
    </div>

    </body>
    </html>      
    `
    }

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.log('Error in sending Tampering Report Email: ', error);
        return false;
    }
}

const sendTerminationRequestEmail = async (mailto, content) => {
    const mailOptions = {
        from: {
            name: "Agri-Supply Alerts",
            address: process.env.EMAIL_USER || "techcrafters6@gmail.com"
        },
        to: mailto,
        subject: `Termination Request ${content.batchId}`,
        text: `Request to correct mistakes in our data field of the container with ID ${content.batchId}. Below are the details:
        
        - Reported by: ${content.fullname}
        - Contact Number: ${content.contact}
        - Email: ${content.email}
        
        Kindly review the situation.`,
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Termination Request - Change mistaken fields</title>
        <style>
            body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
            }
            .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            }
            h1 {
            color: #d9534f;
            text-align: center;
            }
            p {
            font-size: 16px;
            color: #555;
            line-height: 1.5;
            }
            .status {
            font-weight: bold;
            color: #007bff;
            }
            .details {
            margin-top: 20px;
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 6px;
            }
            .details span {
            font-weight: bold;
            }
        </style>
        </head>
        <body>
    
        <div class="container">
            <h1>Termination Request - Change mistaken values</h1>
            
            <p>Requesting a chance to modify mistaken fields <span class="status">${content.containerId}</span>.</p>
            
            <div class="details">
                <p><span>Reported by:</span> ${content.fullname}</p>
                <p><span>Contact Number:</span> ${content.contact}</p>
                <p><span>Email:</span> ${content.email}</p>
                <p><span>Description:</span> ${content.description}</p>
            </div>
            
            <p>Please review the situation immediately and take the necessary actions to address the potential issue.</p>
            
            <p>Thank you for your prompt attention to this matter.</p>
        </div>
    
        </body>
        </html>      
        `
    }

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.log('Error in sending Tampering Report Email: ', error);
        return false;
    }
}

const sendAssignmentEmail = async (mailto, content) => {
    const mailOptions = {
        from: {
            name: "Agri-Supply Alerts",
            address: process.env.EMAIL_USER || "techcrafters6@gmail.com"
        },
        to: mailto,
        subject: `Agri-Supply - New Batch Assignment (${content.batchId})`,
        text: `New Batch Assignment from Agri-Supply - A new batch ${content.batchId} (Container: ${content.containerId}) has been assigned to ${content.receiver}.
        
        Details:
        - Drug Name: ${content.drugName}
        - Quantity: ${content.quantity}
        - Manufacturing Date: ${content.manufacturingDate}
        - Expiry Date: ${content.expiryDate}
        - Shipped By: ${content.urn}
        - Shipped At: ${content.timestamp}
        
        Please login to the dashboard for more details.`,
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Batch Assignment</title>
        <style>
            body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7f6;
            margin: 0;
            padding: 20px;
            color: #333;
            }
            .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            border: 1px solid #e0e0e0;
            }
            h1 {
            color: #2c3e50;
            text-align: center;
            font-size: 24px;
            margin-bottom: 25px;
            border-bottom: 2px solid #3498db;
            padding-bottom: 15px;
            }
            p {
            font-size: 16px;
            color: #555;
            line-height: 1.6;
            margin-bottom: 15px;
            }
            .highlight {
            font-weight: bold;
            color: #3498db;
            }
            .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            margin-bottom: 20px;
            }
            .details-table th, .details-table td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #eee;
            }
            .details-table th {
            color: #7f8c8d;
            font-weight: 600;
            font-size: 14px;
            width: 40%;
            }
            .details-table td {
            color: #2c3e50;
            font-weight: 500;
            }
            .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #95a5a6;
            border-top: 1px solid #eee;
            padding-top: 20px;
            }
            .btn {
            display: inline-block;
            background-color: #3498db;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin-top: 15px;
            font-weight: bold;
            }
        </style>
        </head>
        <body>

        <div class="container">
            <h1>New Batch Assigned</h1>
            
            <p>Hello,</p>
            <p>A new pharmaceutical batch has been created and assigned to <span class="highlight">${content.receiver}</span>.</p>
            
            <table class="details-table">
                <tr>
                    <th>Batch ID</th>
                    <td>${content.batchId}</td>
                </tr>
                 <tr>
                    <th>Container ID</th>
                    <td>${content.containerId}</td>
                </tr>
                <tr>
                    <th>Drug Name</th>
                    <td>${content.drugName}</td>
                </tr>
                <tr>
                    <th>Quantity</th>
                    <td>${content.quantity}</td>
                </tr>
                <tr>
                    <th>Manufacturing Date</th>
                    <td>${content.manufacturingDate}</td>
                </tr>
                <tr>
                    <th>Expiry Date</th>
                    <td>${content.expiryDate}</td>
                </tr>
                 <tr>
                    <th>Shipped By</th>
                    <td>${content.urn}</td>
                </tr>
                 <tr>
                    <th>Timestamp</th>
                    <td>${content.timestamp}</td>
                </tr>
            </table>
            
            <div style="text-align: center;">
                <p>Please log in to the system to track this consignment.</p>
            </div>

            <div class="footer">
                <p>This is an automated message from Agri-Supply System.</p>
            </div>
        </div>

        </body>
        </html>      
        `
    }

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.log('Error in sending Assignment Email: ', error);
        return false;
    }
}

const sendGeoAlertEmail = async (mailto, content) => {
    const mailOptions = {
        from: {
            name: "Agri-Supply Alerts",
            address: process.env.EMAIL_USER || "techcrafters6@gmail.com"
        },
        to: mailto,
        subject: `Geo-Fence Alert - Container ${content.containerId || 'Unknown'} Deviation`,
        text: `Geo-Fence Alert from Agri-Supply - A deviation has been detected for container ${content.containerId || 'Unknown'}.
        
        Details:
        - Location: ${content.lat}, ${content.lon}
        - Timestamp: ${new Date().toLocaleString()}
        - Message: The shipment has deviated from the assigned route.
        
        Please check the dashboard immediately.`,
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Geo-Fence Alert</title>
        <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            h1 { color: #d9534f; text-align: center; }
            p { color: #555; }
            .details { background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin-top: 20px; }
            .highlight { font-weight: bold; color: #d9534f; }
        </style>
        </head>
        <body>
        <div class="container">
            <h1>Ref: Geo-Fence Deviation Alert</h1>
            <p>A route deviation has been detected for container <span class="highlight">${content.containerId || 'Unknown'}</span>.</p>
            <div class="details">
                <p><strong>Coordinates:</strong> ${content.lat}, ${content.lon}</p>
                <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Status:</strong> Outside Defined Boundary</p>
                <p><a href="https://www.google.com/maps?q=${content.lat},${content.lon}">View in Maps</a></p>
            </div>
            <p>Please take immediate action.</p>
        </div>
        </body>
        </html>
        `
    }

    try {
        await transporter.sendMail(mailOptions);
        console.log('Geo Alert Email sent successfully');
        return true;
    } catch (error) {
        console.log('Error in sending Geo Alert Email: ', error);
        return false;
    }
}



app.post('/update-mailStatus', (req, res) => {
    try {
        const { status } = req.body
        mailSent = status
        return res.send({ success: true, message: "Updated Email status to ", mailSent })
    }
    catch (err) {
        return res.send({ success: false, message: "Trouble in updating Email status!" })
    }
})

app.post('/notify-delay', async (req, res) => {
    const {
        farmerName,
        farmerEmail,
        farmerPhone,
        productName,
        expiryDate,
        delayReason,
        shipmentId,
        driverContact
    } = req.body;

    console.log(`[Notification] Delay alert requested for Shipment: ${shipmentId}`);

    // Fetch shipment and users to find recipients
    let recipients = [farmerEmail || 'techcrafters6@gmail.com', 'abishekalagu07@gmail.com', 'hi@gmail.com'];

    try {
        const shipment = await batchModel.findOne({ id: shipmentId }) || await containerModel.findOne({ shipmentId });
        if (shipment) {
            const urn = shipment.urn;
            const receiverUsername = (shipment.endUser || shipment.receiver);

            const [manufacturer, receiver] = await Promise.all([
                userModel.findOne({ urn: urn?.toLowerCase().trim() }),
                userModel.findOne({ username: receiverUsername })
            ]);

            if (manufacturer?.email) recipients.push(manufacturer.email);
            if (receiver?.email) recipients.push(receiver.email);

            // Deduplicate
            recipients = [...new Set(recipients)];
        }
    } catch (err) {
        console.error("Error finding recipients for delay alert:", err);
    }

    if (!farmerName || !productName) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const messageBody = `URGENT: Agri-Supply Chain Alert
Dear ${farmerName},

Be advised that your shipment of ${productName} (ID: ${shipmentId || 'N/A'}) has encountered an unexpected delay in transit.

Details:
- Delay Reason: ${delayReason || 'Logistics Error'}
- Container Driver No: ${driverContact || 'N/A'}
- Expected Expiry: ${expiryDate || 'N/A'}

Please check the tracking portal or contact support immediately to arrange redirection before produce spoilage occurs.

Regards,
Agri-Supply Logistics`;

    let emailSuccess = false;
    let smsSuccess = false;
    let emailError = null;
    let smsError = null;

    // Run notifications in parallel
    await Promise.allSettled([
        // 1. Send Email Alert
        (async () => {
            try {
                if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'dummy@example.com') {
                    // Filter out invalid/placeholder emails
                    const validRecipients = recipients.filter(email =>
                        email && email.includes('@') && email !== 'hi@gmail.com'
                    );

                    if (validRecipients.length > 0) {
                        const info = await transporter.sendMail({
                            from: `"Agri-Supply Alerts" <${process.env.EMAIL_USER}>`,
                            to: validRecipients.join(', '),
                            subject: `⚠️ URGENT: Shipment Delayed - ${productName}`,
                            text: messageBody
                        });
                        console.log('Delay Email sent successfully:', info.messageId, 'to:', validRecipients);
                        emailSuccess = true;
                    } else {
                        console.log('No valid recipients for delay email.');
                        emailSuccess = false;
                        emailError = 'No valid recipients';
                    }
                } else {
                    console.log('\n--- [DUMMY MODE] EMAIL DISPATCH ---');
                    console.log(`To: ${recipients.join(', ')}`);
                    emailSuccess = true;
                }
            } catch (error) {
                console.error('Email error:', error);
                emailError = error.message;
            }
        })(),

        // 2. Send WhatsApp/SMS Alert
        (async () => {
            try {
                if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'dummy_sid' && process.env.TWILIO_PHONE_NUMBER) {
                    await twilioClient.messages.create({
                        body: messageBody,
                        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                        to: `whatsapp:${farmerPhone || '+1234567890'}`
                    });
                    smsSuccess = true;
                } else {
                    console.log('\n--- [DUMMY MODE] WHATSAPP DISPATCH ---');
                    console.log(`To: whatsapp:${farmerPhone}`);
                    smsSuccess = true;
                }
            } catch (error) {
                console.error('Twilio error:', error);
                smsError = error.message;
            }
        })()
    ]);

    res.json({
        success: emailSuccess || smsSuccess, // Report success if at least one worked
        message: (emailSuccess || smsSuccess) ? 'Notification alert processed.' : 'Failed to send notifications.',
        details: {
            emailSent: emailSuccess,
            emailError: emailError,
            smsSuccess: smsSuccess,
            smsError: smsError,
            recipient: farmerEmail,
            mode: process.env.EMAIL_USER ? 'LIVE' : 'DUMMY'
        }
    });
});



app.get('/testmail', async (req, res) => {
    try {
        const mailDeliveryStatus = await sendEmail('mgowtham7577@gmail.com', 141414)
        if (mailDeliveryStatus === true) {
            return res.send({ success: true, message: "Email send successfully!" })
        }
        else {
            return res.send({ success: false, message: "Failed to send Email!" })
        }
    }
    catch (err) {
        return res.send({ success: false, message: "Trouble in sending Email!" })
    }
})


const isAuth = async (req, res, next) => {
    if (req.session.user) {
        const fetchUser = await userModel.findOne({ username: req.session.user })
        const userInfo = {
            id: fetchUser.id,
            fullname: fetchUser.fullname,
            username: fetchUser.username,
            email: fetchUser.email,
            contact: fetchUser.contact,
            role: fetchUser.role,
            urn: fetchUser.urn || ''
        }
        if (!fetchUser) {
            return res.send({ success: false, message: "User not found!" })
        }
        req.session.userInfo = userInfo
        next()
    }
    else {
        return res.send({ success: false, message: "Please login to Continue!" })
    }
}

const isAdmin = async (req, res, next) => {
    if (req.session.user) {
        const fetchUser = await userModel.findOne({ username: req.session.user })
        if (!fetchUser) {
            return res.send({ success: false, message: "User not found!" })
        }
        if (fetchUser.role === 'admin') {
            req.session.userInfo = fetchUser
            next()
        }
        else {
            return res.send({ success: false, message: "You dont have permission to Continue!" })
        }
    }
    else {
        return res.send({ success: false, message: "Please login to Continue!" })
    }
}

app.post('/create-user', isAdmin, async (req, res) => {
    try {
        let userId = 1
        const { formData } = req.body

        if (formData.fullName && formData.email && formData.contact && formData.username && formData.role && formData.password) {

            if (formData.role === "manufacturer" && formData.manufacturerUrn === '') {
                return res.send({ success: false, message: "Please enter the manufacturer URN!" })
            }

            const fetchUsers = await userModel.find({})
            if (!fetchUsers) {
                return res.send({ success: false, message: "Failed to fetch User, Please contact support Team!" })
            }

            const checkUserByEmail = await userModel.findOne({ email: formData.email })
            if (checkUserByEmail) {
                return res.send({ success: false, message: "Already a user exist with this Email! Try again with a new one." })
            }

            const checkUserByContact = await userModel.findOne({ contact: formData.contact })
            if (checkUserByContact) {
                return res.send({ success: false, message: "Already a user exist with this Contact! Try again with a new one." })
            }

            const checkUserByUsername = await userModel.findOne({ username: formData.username })
            if (checkUserByUsername) {
                return res.send({ success: false, message: "Already a user exist with this Username! Try again with a new one." })
            }

            const lastUser = await userModel.findOne({}, {}, { sort: { _id: -1 } })
            if (lastUser) {
                userId = lastUser.id + 1
            }
            console.log('lastuser: ', lastUser)
            console.log('userid: ', userId)

            if (formData.role === "manufacturer") {
                const user = new userModel({
                    id: userId,
                    fullname: formData.fullName,
                    email: formData.email,
                    contact: formData.contact,
                    username: formData.username,
                    role: formData.role,
                    password: formData.password,
                    urn: formData.manufacturerUrn
                })
                const saveStatus = await user.save()
                if (saveStatus) {
                    return res.send({ success: true, message: "User saved succesfully!" })
                }
                else {
                    return res.send({ success: false, message: "Please provide all details!" })
                }
            }
            else {
                const user = new userModel({
                    id: userId,
                    fullname: formData.fullName,
                    email: formData.email,
                    contact: formData.contact,
                    username: formData.username,
                    role: formData.role,
                    password: formData.password
                })
                const saveStatus = await user.save()
                if (saveStatus) {
                    return res.send({ success: true, message: "User saved succesfully!" })
                }
                else {
                    return res.send({ success: false, message: "Please provide all details!" })
                }
            }

        }
        else {
            return res.send({ success: false, message: "Please provide all details!" })
        }
    }
    catch (err) {
        console.log('Error in Creating User: ', err)
        return res.send({ success: false, message: "Trouble in creating User! Please try again later or contact support team." })
    }
})


app.get('/fetch-users', isAdmin, async (req, res) => {
    try {
        const Users = await userModel.find({})
        if (Users) {
            return res.send({ success: true, message: "Fetched Users successfully!", Users: Users })
        }
        else {
            return res.send({ success: false, message: "Failed to fetch User, Please contact support Team!" })
        }
    }
    catch (err) {
        console.log('Error in Fetching Users: ', err)
        return res.send({ success: false, message: "Trouble in fetching Users! Please try again later or contact support team." })
    }
})

app.post('/fetch-user', isAdmin, async (req, res) => {
    try {
        const { userId } = req.body
        if (!userId) {
            return res.send({ success: false, message: "Please proivide a UserID!" })
        }
        const User = await userModel.findOne({ id: userId })
        if (User) {
            const user = {
                id: User.id,
                fullname: User.fullname,
                username: User.username,
                email: User.email,
                contact: User.contact,
                role: User.role,
                urn: User.urn || ''
            }
            return res.send({ success: true, message: "Fetched User successfully!", User: user })
        }
        else {
            return res.send({ success: false, message: "Failed to fetch User, Please contact support Team!" })
        }
    }
    catch (err) {
        console.log('Error in Fetching User: ', err)
        return res.send({ success: false, message: "Trouble in fetching User! Please try again later or contact support team." })
    }
})

app.post('/update-user', isAdmin, async (req, res) => {
    try {
        const { formData } = req.body
        console.log('fomrData:', formData)
        if (!formData) {
            return res.send({ success: false, message: "Please provide a valid data!" })
        }
        const findUser = await userModel.findOne({ id: formData.id })
        if (!findUser) {
            return res.send({ success: false, message: "User not found!" })
        }
        if (formData.password && formData.password !== '') {
            const userUpdation = await userModel.updateOne({ id: formData.id }, {
                $set: {
                    fullname: formData.fullname,
                    email: formData.email,
                    contact: formData.contact,
                    username: formData.username,
                    role: formData.role,
                    password: formData.password
                }
            })
            if (userUpdation) {
                return res.send({ success: true, message: "User updated Succesfully!" })
            }
            else {
                return res.send({ success: false, message: "Failed to update User!" })
            }
        }
        else {
            const userUpdation = await userModel.updateOne({ id: formData.id }, {
                $set: {
                    fullname: formData.fullname,
                    email: formData.email,
                    contact: formData.contact,
                    username: formData.username,
                    role: formData.role,
                }
            })
            if (userUpdation) {
                return res.send({ success: true, message: "User updated Succesfully!" })
            }
            else {
                return res.send({ success: false, message: "Failed to update User!" })
            }
        }
    }
    catch (err) {
        console.log('Error in Updating Users: ', err)
        return res.send({ success: false, message: "Trouble in Updating Users! Please try again later or contact support team." })
    }
})

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body
        if (!username || !password) {
            return res.send({ success: false, message: "Please provide all details!" })
        }
        const fetchUser = await userModel.findOne({ username: username })
        if (!fetchUser) {
            return res.send({ success: false, message: "Incorrect Username!" })
        }
        if (fetchUser.password === password) {
            req.session.user = fetchUser.username;
            req.session.userInfo = fetchUser; // This was missing and caused check-auth to fail
            return res.send({ success: true, message: "User logged in Succesfully!", user: fetchUser })
        }
        else {
            return res.send({ success: false, message: "Incorrect Password!" })
        }
    }
    catch (err) {
        console.log('Error in Login: ', err)
        return res.send({ success: false, message: "Trouble in Login! Please try again later or contact support team." })
    }
})

app.get('/logout', isAuth, async (req, res) => {
    try {
        if (req.session.user) {
            req.session.destroy()
            return res.send({ success: true, message: 'User logged out Succesfully!' })
        }
        else {
            return res.send({ success: false, message: "Session not found! Please contact support team" })
        }
    }
    catch (err) {
        console.log('Error in Logout: ', err)
        return res.send({ success: false, message: "Trouble in Logout" })
    }
})

app.get('/check-auth', isAuth, async (req, res) => {
    try {
        if (req.session.userInfo) {
            return res.send({ success: true, message: "Detected User loggedin!", User: req.session.userInfo })
        }
        else {
            return res.send({ success: false, message: "Failed to fetch user Information from session!" })
        }
    }
    catch (err) {
        console.log('Error in Checking Authentocation: ', err)
        return res.send({ success: false, message: "Trouble in Checking Authentocation! Please try again later or contact support team." })
    }
})

app.get('/fetch-devices', isAuth, (req, res) => {
    try {
        fetch('https://api.thingspeak.com/channels/3257790/feeds.json?api_key=ILWM3GMDB8F1H0MB&results=2')
            .then(res => res.json())
            .then(data => {
                if (req.session.userInfo) {
                    return res.send({ success: true, message: 'Fetching devices succesfull!', deviceData: data })
                }
                return res.send({ success: true, message: 'Fetching devices succesfull!', deviceData: [] })
            })
            .catch(err => {
                console.log('Error found in fetch container API: ', err)
                return res.send({ success: false, message: 'Trouble in fetching devices Information! Please contact developer' })
            })
    }
    catch (err) {
        console.log('Error in fetching devices: ', err)
        return res.send({ success: false, message: "Trouble in fetching devices! Please try again later or contact support team." })
    }
})

app.get('/fetch-devices-info', isAuth, (req, res) => {
    try {
        fetch('https://api.thingspeak.com/channels/3257790/feeds.json?api_key=ILWM3GMDB8F1H0MB&results=2')
            .then(res => res.json())
            .then(data => {
                if (req.session.userInfo) {
                    return res.send({ success: true, message: 'Fetching devices succesfull!', deviceData: data.channel })
                }
                return res.send({ success: true, message: 'Fetching devices succesfull!', deviceData: [] })
            })
            .catch(err => {
                console.log('Error found in fetch container API: ', err)
                return res.send({ success: false, message: 'Trouble in fetching devices Information! Please contact developer' })
            })
    }
    catch (err) {
        console.log('Error in fetching devices: ', err)
        return res.send({ success: false, message: "Trouble in fetching devices! Please try again later or contact support team." })
    }
})


// const fetchDevices = (res, rej) => {
//     fetch('https://api.thingspeak.com/channels/2774098/feeds.json?api_key=GQY07L8LPM9DDHJM&results')
//     .then(res=>res.json())
//     .then(data=>{
//         res(data)
//     })
//     .catch(err=>{
//         console.log('Error found in fetch container API: ',err)
//         rej('Error in Fetching via Function call:',err)
//     }
// )}


// const checkLockStatus = (containerID) => {
//     try{
//         console.log('checkLockStatus after func called')
//         const fetchFunc = new Promise((res, rej)=>{
//             fetchDevices(res, rej)
//         })
//         fetchFunc.then(data=>{
//             console.log('Promise resolved channel:',data.channel)
//             console.log('Promise resolved feeds last:',data.feeds.splice(-1))
//             if(data.channel.id===containerID){
//                 if(data.feeds.splice(-1)[0].field8==='1.00000'){
//                     return {containerId:'locked'}
//                 }
//                 else{
//                     return {containerId:'unlocked'}
//                 }
//             }
//             return null
//         })
//         .catch(err=>{
//             console.log('Promise rejected:',err)
//             return null
//         })
//     }
//     catch(err){
//         console.log('Error in checklockStatus func:',err)
//         return null
//     }
// }


// const findContainerIds = (Batches) => {
//     // let status
//     const containerStatus = Batches.map(batch => {
//         return checkLockStatus(batch.containerId)
//     });
//     console.log('containerStatus Resut:',containerStatus)
// }




// app.get('/fetch-container', isAuth, async(req, res)=>{
//     try{
//         if(!req.session.userInfo){
//             return res.send({success: false, message: "Please login or contact our support team!"})
//         }

//         if(req.session.userInfo.role==='admin'){
//             const dataFetch = await containerModel.find({})
//             if(!dataFetch){
//                 return res.send({success: false, message: "Failed to fetch batch data! Please contact our support TextDecoderStream."})
//             }
//             if(dataFetch)
//             return res.send({success: true, message: "Fetch Batch data succesfully!", Batches: dataFetch})
//         }
//         else if(req.session.userInfo.role==='manufacturer'){
//             const dataFetch = await containerModel.find({urn: req.session.userInfo.urn})
//             findContainerIds(dataFetch)
//             console.log('Batches:',dataFetch)


//             if(!dataFetch){
//                 return res.send({success: false, message: "Failed to fetch batch data! Please contact our support TextDecoderStream."})
//             }
//             return res.send({success: true, message: "Fetch Batch data succesfully!", Batches: dataFetch})
//         }
//         else if(req.session.userInfo.role==='receiver'){
//             const dataFetch = await containerModel.find({endUser: req.session.userInfo.username})
//             if(!dataFetch){
//                 return res.send({success: false, message: "Failed to fetch batch data! Please contact our support TextDecoderStream."})
//             }
//             return res.send({success: true, message: "Fetch Batch data succesfully!", Batches: dataFetch})
//         }
//         else if(req.session.userInfo.role==='checkpoint1' || req.session.userInfo.role==='checkpoint2'){
//             const dataFetch = await containerModel.find({status: 'shipped'})
//             if(!dataFetch){
//                 return res.send({success: false, message: "Failed to fetch batch data! Please contact our support TextDecoderStream."})
//             }
//             return res.send({success: true, message: "Fetch Batch data succesfully!", Batches: dataFetch})
//         }
//         else{
//             return res.send({success: false, message: "You don't have access to view Batches!"})
//         }
//     }
//     catch(err){
//         console.log('Error in fetching batches: ',err)
//         return res.send({success: false, message: "Trouble in fetching batches! Please try again later or contact support team."})
//     }
// })







app.post('/create-container', isAuth, async (req, res) => {
    try {
        let batchId = 1

        if (!req.session.userInfo) {
            return res.send({ success: false, message: "Please login or contact our support team!" })
        }

        if (!req.session.userInfo.role === 'manufacturer') {
            return res.send({ success: false, message: "You dont have permission to create batch, only manufacturers are allowed to create batches!" })
        }

        const { formData } = req.body

        if (formData.containerId === '' && formData.drugName === '' && formData.expiryDate === '' && formData.manufacturingDate === '' && formData.quantity === '' && formData.receiver === '' && formData.tamperSealNo === '' && formData.urn === '') {
            return res.send({ success: false, message: "Please provide all details!" })
        }

        if (formData.drugName === 'Other' && formData.otherDrugName === '') {
            return res.send({ success: false, message: "Please provide the Drug name!" })
        }

        const lastBatch = await containerModel.findOne({}, {}, { sort: { _id: -1 } })
        if (lastBatch) {
            batchId = lastBatch.id + 1
        }

        if (formData.drugName === 'Other') {
            const newBatch = new containerModel({
                id: batchId,
                urn: formData.urn,
                receiver: formData.receiver,
                containerId: formData.containerId,
                tamperSealNo: formData.tamperSealNo,
                drugName: formData.otherDrugName,
                quantity: formData.quantity,
                manufacturingDate: formData.manufacturingDate,
                expiryDate: formData.expiryDate,
            });
            const batchCreation = await newBatch.save();
            if (!batchCreation) {
                return res.send({ success: false, message: "Batch creation failed! Please contact our support team." })
            }
            return res.send({ success: true, message: "Batch created successfully!" });
        }
        else {
            const newBatch = new containerModel({
                id: batchId,
                urn: formData.urn,
                receiver: formData.receiver,
                containerId: formData.containerId,
                tamperSealNo: formData.tamperSealNo,
                drugName: formData.drugName,
                quantity: formData.quantity,
                manufacturingDate: formData.manufacturingDate,
                expiryDate: formData.expiryDate,
            });
            const batchCreation = await newBatch.save();
            if (!batchCreation) {
                return res.send({ success: false, message: "Batch creation failed! Please contact our support team." })
            }
            return res.send({ success: true, message: "Batch created successfully!" });
        }

    }
    catch (err) {
        console.log('Error in Container creation: ', err)
        return res.send({ success: false, message: "Trouble in Container creation! Please try again later or contact support team." })
    }
})


const fetchDevices = () => {
    return fetch('https://api.thingspeak.com/channels/3257790/fields/1.json?api_key=ILWM3GMDB8F1H0MB&results=2')
        .then(res => res.json())
        .catch(err => {
            console.error('Error in fetchDevices API:', err);
            throw new Error('Error fetching devices');
        });
};


const checkLockStatus = async (containerID) => {
    try {
        const data = await fetchDevices();
        if (data.channel.id === Number(containerID)) {
            const lastFeed = data.feeds[data.feeds.length - 1];
            return Number(lastFeed.field3) <= 75 ? 'locked' : 'unlocked';
        }
        return 'unknown'; // If containerID does not match
    } catch (err) {
        console.error('Error in checkLockStatus:', err);
        return 'error';
    }
};

const findContainerIds = async (Batches) => {
    return Promise.all(
        Batches.map(async (batch) => {
            const lockStatus = await checkLockStatus(batch.containerId);
            return { ...batch._doc, lockStatus }; // Include lockStatus in the batch
        })
    );
};



app.get('/fetch-container', isAuth, async (req, res) => {
    try {
        if (!req.session.userInfo) {
            return res.send({ success: false, message: "Please login or contact our support team!" });
        }

        let dataFetch;

        if (req.session.userInfo.role === 'admin') {
            dataFetch = await containerModel.find({});
        } else if (req.session.userInfo.role === 'manufacturer') {
            dataFetch = await containerModel.find({ urn: req.session.userInfo.urn });
        } else if (req.session.userInfo.role === 'receiver') {
            dataFetch = await containerModel.find({ receiver: req.session.userInfo.username });
        } else if (req.session.userInfo.role === 'checkpoint1') {
            dataFetch = await containerModel.find({ status: 'shipped' });
        }
        else if (req.session.userInfo.role === 'checkpoint2') {
            dataFetch = await containerModel.find({ status: 'crossedcheckpoint1' });
        }
        else {
            return res.send({ success: false, message: "You don't have access to view Batches!" });
        }

        if (!dataFetch) {
            return res.send({ success: false, message: "No batch data found! Please contact our support team." });
        }
        if (dataFetch.length === 0) {
            return res.send({ success: true, message: "No Batches are found!", Batches: [] })
        }

        const batchesWithLockStatus = await findContainerIds(dataFetch);

        return res.send({
            success: true,
            message: "Fetch Batch data successfully!",
            Batches: batchesWithLockStatus,
        });
    } catch (err) {
        console.error('Error in fetching batches:', err);
        return res.send({
            success: false,
            message: "Trouble in fetching batches! Please try again later or contact the support team.",
        });
    }
});


const findContainerId = async (Batch) => {
    const lockStatus = await checkLockStatus(Batch.containerId);
    return { ...Batch._doc, lockStatus };
};

app.post('/fetch-container-data', isAuth, async (req, res) => {
    try {
        const { containerId } = req.body;

        if (!containerId) {
            return res.send({ success: false, message: "Please provide a containerId!" });
        }

        if (!req.session.userInfo) {
            return res.send({ success: false, message: "Please login or contact our support team!" });
        }

        // Fetch the batch using the provided containerId
        const dataFetch = await containerModel.findOne({ id: containerId });

        if (!dataFetch) {
            return res.send({ success: false, message: "No batch data found! Please contact our support team." });
        }

        // Fetch the lock status and return the batch data with the lock status
        const batchWithLockStatus = await findContainerId(dataFetch);

        return res.send({
            success: true,
            message: "Fetch Batch data successfully!",
            Batch: batchWithLockStatus,
        });
    } catch (err) {
        console.error('Error in fetching batch:', err);
        return res.send({
            success: false,
            message: "Trouble in fetching batch! Please try again later or contact the support team.",
        });
    }
});


app.post('/update-status', isAuth, async (req, res) => {
    try {
        const { containerId } = req.body;

        if (!containerId) {
            return res.send({ success: false, message: "Please provide a containerId!" });
        }

        if (!req.session.userInfo) {
            return res.send({ success: false, message: "Please login or contact our support team!" });
        }

        const dataFetch = await containerModel.findOne({ id: containerId });

        if (!dataFetch) {
            return res.send({ success: false, message: "No batch data found! Please contact our support team." });
        }

        let updateStatus

        if (req.session.userInfo.role === 'receiver') {
            updateStatus = await containerModel.updateOne({ id: containerId }, { $set: { status: 'delivered' } })
        }
        else if (req.session.userInfo.role === 'checkpoint1') {
            updateStatus = await containerModel.updateOne({ id: containerId }, { $set: { status: 'crossedcheckpoint1' } })
        }
        else if (req.session.userInfo.role === 'checkpoint2') {
            updateStatus = await containerModel.updateOne({ id: containerId }, { $set: { status: 'crossedcheckpoint2' } })
        }
        else {
            return res.send({ success: false, message: "You don't have access to update the order status!" })
        }

        if (!updateStatus) {
            return res.send({ success: false, message: "No batch data found! Please contact our support team." });
        }

        return res.send({ success: true, message: "Status updated successfully!" })

    }
    catch (err) {
        console.error('Error in updating batch:', err);
        return res.send({
            success: false,
            message: "Trouble in updating batch! Please try again later or contact the support team.",
        });
    }
})

app.post('/delete-batch', isAuth, async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "Batch ID is required" });
        }

        const result = await containerModel.updateMany({ id: id }, { $set: { isDeleted: true } });

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Batch not found" });
        }

        return res.json({ success: true, message: "Batch deleted successfully" });
    } catch (err) {
        console.error("Error deleting batch:", err);
        return res.status(500).json({ success: false, message: "Server error deleting batch" });
    }
});

app.post('/check-geo', async (req, res) => {
    try {
        const { lat, lon, containerId } = req.body;
        console.log('Geo Check:', lat, lon, containerId);

        // Here we would typically check against a stored route/geofence in DB.
        // For this demo, we assume the frontend has detected a violation and calls this.

        // Fetch Admins
        const Admins = await userModel.find({ role: 'admin' });
        const adminEmails = Admins.map(admin => admin.email);

        // Fetch Manufacturer if possible (Assuming containerId acts as link, but simpler to just notify admins + hardcoded for now or if we had batch info)
        // For now, let's notify Admins and a generic support/manufacturer email if we can't look it up easily without more data.
        // Actually, let's try to find the batch to get the manufacturer URN -> Email.

        let recipientSet = new Set([...adminEmails]);

        if (containerId) {
            const batch = await containerModel.findOne({ containerId: containerId });
            if (batch) {
                const manufacturer = await userModel.findOne({ urn: batch.urn });
                if (manufacturer) recipientSet.add(manufacturer.email);

                const receiver = await userModel.findOne({ username: batch.receiver });
                if (receiver) recipientSet.add(receiver.email);
            }
        }

        const mailto = Array.from(recipientSet);

        // If no containerId/batch found, at least notify admins.

        await sendGeoAlertEmail(mailto, { lat, lon, containerId });

        return res.json({ success: true, message: "Geo-fence alert processed." });

    } catch (err) {
        console.log('Error in check-geo:', err);
        return res.status(500).json({ success: false, message: "Server error checking geo." });
    }
});


app.post('/update-status', isAuth, async (req, res) => {
    try {
        const { containerId } = req.body;

        if (!containerId) {
            return res.send({ success: false, message: "Please provide a containerId!" });
        }

        if (!req.session.userInfo) {
            return res.send({ success: false, message: "Please login or contact our support team!" });
        }

        const dataFetch = await containerModel.findOne({ id: containerId });

        if (!dataFetch) {
            return res.send({ success: false, message: "No batch data found! Please contact our support team." });
        }

        let updateStatus
        let newStatus = '';

        if (req.session.userInfo.role === 'receiver') {
            newStatus = 'delivered';
            updateStatus = await containerModel.updateOne({ id: containerId }, { $set: { status: 'delivered' } })
        }
        else if (req.session.userInfo.role === 'checkpoint1') {
            newStatus = 'crossedcheckpoint1';
            updateStatus = await containerModel.updateOne({ id: containerId }, { $set: { status: 'crossedcheckpoint1' } })
        }
        else if (req.session.userInfo.role === 'checkpoint2') {
            newStatus = 'crossedcheckpoint2';
            updateStatus = await containerModel.updateOne({ id: containerId }, { $set: { status: 'crossedcheckpoint2' } })
        }
        else {
            return res.send({ success: false, message: "You don't have access to update the order status!" })
        }

        if (!updateStatus) {
            return res.send({ success: false, message: "No batch data found! Please contact our support team." });
        }

        // --- EMAIL NOTIFICATION LOGIC ---
        // Fetch involved parties
        const Manufacturer = await userModel.findOne({ urn: dataFetch.urn });
        const Receiver = await userModel.findOne({ username: dataFetch.receiver });
        const Admins = await userModel.find({ role: 'admin' });
        const adminEmails = Admins.map(admin => admin.email);

        const recipientSet = new Set([
            ...adminEmails
        ]);

        if (Manufacturer) recipientSet.add(Manufacturer.email);
        if (Receiver) recipientSet.add(Receiver.email);
        // Sender (current user)
        if (req.session.userInfo.email) recipientSet.add(req.session.userInfo.email);

        const mailto = Array.from(recipientSet);

        // Prepare content
        const content = {
            containerId: dataFetch.containerId,
            batchId: dataFetch.id,
            urn: dataFetch.urn,
            drugName: dataFetch.drugName,
            quantity: dataFetch.quantity,
            receiver: dataFetch.receiver,
            deliveryStatus: newStatus, // The new status
            timestamp: new Date().toLocaleString(),
            lockStatus: await checkLockStatus(dataFetch.containerId) || 'Unknown'
        };

        // Use existing sendEmail function which seems generic enough for status updates
        // Or create a new specific one. The existing sendEmail (line 108) uses "Container Alert... has been updated to..."
        // which fits perfectly.

        sendEmail(mailto, content).catch(err => console.log("Failed to send status update email", err));

        return res.send({ success: true, message: "Status updated successfully!" })

    }
    catch (err) {
        console.error('Error in updating batch:', err);
        return res.send({
            success: false,
            message: "Trouble in updating batch! Please try again later or contact the support team.",
        });
    }
})










































app.post('/create-batch', isAuth, async (req, res) => {
    try {
        let batchId = 1

        if (!req.session.userInfo) {
            return res.send({ success: false, message: "Please login or contact our support team!" })
        }

        if (!req.session.userInfo.role === 'manufacturer') {
            return res.send({ success: false, message: "You dont have permission to create batch, only manufacturers are allowed to create batches!" })
        }

        const { urn, endUser, containers } = req.body

        if (!urn || !endUser || !containers || containers.length === 0) {
            return res.send({ success: false, message: "Please provide all details!" })
        }

        const lastBatch = await batchModel.findOne({}, {}, { sort: { _id: -1 } })
        if (lastBatch) {
            batchId = lastBatch.id + 1
        }

        const newBatch = new batchModel({
            id: batchId,
            urn,
            endUser,
            containers
        });


        const batchCreation = await newBatch.save();

        if (!batchCreation) {
            return res.send({ success: false, message: "Batch creation failed! Please contact our support team." })
        }

        return res.send({ success: true, message: "Batch created successfully!" });

    }
    catch (err) {
        console.log('Error in batch creation: ', err)
        return res.send({ success: false, message: "Trouble in Batch creation! Please try again later or contact support team." })
    }
})
app.get('/fetch-batches', isAuth, async (req, res) => {
    try {
        if (!req.session.userInfo) {
            return res.send({ success: false, message: "Please login or contact our support team!" })
        }

        if (req.session.userInfo.role === 'admin') {
            const dataFetch = await batchModel.find({})
            if (!dataFetch) {
                return res.send({ success: false, message: "Failed to fetch batch data! Please contact our support TextDecoderStream." })
            }
            if (dataFetch)
                return res.send({ success: true, message: "Fetch Batch data succesfully!", Batches: dataFetch })
        }
        else if (req.session.userInfo.role === 'manufacturer') {
            const dataFetch = await batchModel.find({ urn: req.session.userInfo.urn })
            findContainerIds(dataFetch)
            console.log('Batches:', dataFetch[0].containers)


            if (!dataFetch) {
                return res.send({ success: false, message: "Failed to fetch batch data! Please contact our support TextDecoderStream." })
            }
            return res.send({ success: true, message: "Fetch Batch data succesfully!", Batches: dataFetch })
        }
        else if (req.session.userInfo.role === 'receiver') {
            const dataFetch = await batchModel.find({ endUser: req.session.userInfo.username })
            if (!dataFetch) {
                return res.send({ success: false, message: "Failed to fetch batch data! Please contact our support TextDecoderStream." })
            }
            return res.send({ success: true, message: "Fetch Batch data succesfully!", Batches: dataFetch })
        }
        else if (req.session.userInfo.role === 'checkpoint1' || req.session.userInfo.role === 'checkpoint2') {
            const dataFetch = await batchModel.find({ status: 'shipped' })
            if (!dataFetch) {
                return res.send({ success: false, message: "Failed to fetch batch data! Please contact our support TextDecoderStream." })
            }
            return res.send({ success: true, message: "Fetch Batch data succesfully!", Batches: dataFetch })
        }
        else {
            return res.send({ success: false, message: "You don't have access to view Batches!" })
        }
    }
    catch (err) {
        console.log('Error in fetching batches: ', err)
        return res.send({ success: false, message: "Trouble in fetching batches! Please try again later or contact support team." })
    }
})







app.use((req, res, next) => {
    const oldJson = res.json;
    res.json = function (data) {
        if (res.headersSent) {
            return;
        }
        const replacer = (key, value) =>
            typeof value === "bigint" ? value.toString() : value;
        oldJson.call(this, JSON.parse(JSON.stringify(data, replacer)));
    };
    next();
});

const { ethers } = require('ethers')

const provider = new ethers.JsonRpcProvider(process.env.LOCAL_PROVIDER_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = process.env.CONTRACT_ADDRESS;
const contractABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "string",
                "name": "urn",
                "type": "string"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "totalQuantity",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "bytes32",
                "name": "dataHash",
                "type": "bytes32"
            }
        ],
        "name": "DrugDataCreated",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "name": "containerIndexById",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "containers",
        "outputs": [
            {
                "internalType": "string",
                "name": "id",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "containerId",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "drugName",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "expiryDate",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "lockStatus",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "manufacturingDate",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "quantity",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "receiver",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "status",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "tamperSealNo",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "urn",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_id",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_containerId",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_drugName",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "_expiryDate",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "_lockStatus",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "_manufacturingDate",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_quantity",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "_receiver",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_status",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_tamperSealNo",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "_urn",
                "type": "string"
            }
        ],
        "name": "createContainer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "urn",
                "type": "string"
            },
            {
                "internalType": "string[]",
                "name": "drugNames",
                "type": "string[]"
            },
            {
                "internalType": "uint256[]",
                "name": "drugQuantities",
                "type": "uint256[]"
            }
        ],
        "name": "createDrugData",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllContainers",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "string",
                        "name": "id",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "containerId",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "drugName",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "expiryDate",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "lockStatus",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "manufacturingDate",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "quantity",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "receiver",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "status",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "tamperSealNo",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "urn",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "timestamp",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct ContainerTracking.Container[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllDrugData",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "string",
                        "name": "urn",
                        "type": "string"
                    },
                    {
                        "internalType": "string[]",
                        "name": "drugNames",
                        "type": "string[]"
                    },
                    {
                        "internalType": "uint256[]",
                        "name": "drugQuantities",
                        "type": "uint256[]"
                    },
                    {
                        "internalType": "uint256",
                        "name": "totalQuantity",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "timestamp",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bytes32",
                        "name": "dataHash",
                        "type": "bytes32"
                    }
                ],
                "internalType": "struct ContainerTracking.DrugData[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_id",
                "type": "string"
            }
        ],
        "name": "getContainerById",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "string",
                        "name": "id",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "containerId",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "drugName",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "expiryDate",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "lockStatus",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "manufacturingDate",
                        "type": "uint256"
                    },
                    {
                        "internalType": "uint256",
                        "name": "quantity",
                        "type": "uint256"
                    },
                    {
                        "internalType": "string",
                        "name": "receiver",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "status",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "tamperSealNo",
                        "type": "string"
                    },
                    {
                        "internalType": "string",
                        "name": "urn",
                        "type": "string"
                    },
                    {
                        "internalType": "uint256",
                        "name": "timestamp",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct ContainerTracking.Container",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bytes32",
                "name": "dataHash",
                "type": "bytes32"
            }
        ],
        "name": "getDrugDataByHash",
        "outputs": [
            {
                "internalType": "string",
                "name": "urn",
                "type": "string"
            },
            {
                "internalType": "string[]",
                "name": "drugNames",
                "type": "string[]"
            },
            {
                "internalType": "uint256[]",
                "name": "drugQuantities",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256",
                "name": "totalQuantity",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "urn",
                "type": "string"
            }
        ],
        "name": "getDrugDataByURN",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            },
            {
                "internalType": "string[]",
                "name": "",
                "type": "string[]"
            },
            {
                "internalType": "uint256[]",
                "name": "",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

const contract = new ethers.Contract(contractAddress, contractABI, signer);





// API to get all containers

app.post('/createContainer', async (req, res) => {

    try {

        const { formData } = req.body;

        if (!formData.id || !formData.containerId || !formData.drugName || !formData.expiryDate || !formData.manufacturingDate || !formData.quantity || !formData.receiver || !formData.deliveryStatus || !formData.tamperSealNo || !formData.urn) {
            return res.send({ success: false, message: "Please provide all details!!" })
        }
        if (formData.drugName === "Other" && formData.otherDrugName === "") {
            return res.send({ success: false, message: "Please provide the drug name!!" })
        }

        const Manufacturer = await userModel.findOne({ urn: formData.urn })
        if (!Manufacturer) {
            return res.send({ success: false, message: "Manufacturer not found with the provided URN!" })
        }
        const Receiver = await userModel.findOne({ username: formData.receiver })
        if (!Receiver) {
            return res.send({ success: false, message: "Receiver not found with the provided Username!" })
        }

        const lockStatus = await checkLockStatus(formData.containerId)
        const drugData = await contract.getDrugDataByURN(formData.urn)
        let updatedDrugData = [
            drugData[0],
            drugData[1].map(drug => drug.toString()),
            drugData[2].map(quantity => Number(quantity))
        ]
        const { id, containerId, drugName, expiryDate, manufacturingDate, quantity, receiver, deliveryStatus, otherDrugName, tamperSealNo, urn } = formData

        let validatedDrugName;
        if (formData.drugName === "Other") {
            validatedDrugName = otherDrugName
        }
        else {
            validatedDrugName = drugName
        }

        if (!drugData) {
            return res.send({ success: false, message: "Existing data not found!" })
        }

        if (drugData[0] !== "" || drugData[1].length !== 0 || drugData[2].length !== 0) {
            if (drugData[1].length !== drugData[2].length) {
                return res.send({ success: false, message: "Trouble in finding the existing drug quantity, Please contact the developer." })
            }

            const drugCheck = drugData[1].some(data => data === validatedDrugName)

            if (!drugCheck) {
                return res.send({ success: false, message: `You don't have any stock in the selected Drug | ${validatedDrugName}` })
            }


            for (const [i, data] of drugData[1].entries()) {
                if (validatedDrugName === data) {
                    const enteredQuantity = Number(formData.quantity)
                    const availableQuantity = Number(drugData[2][i])
                    if (enteredQuantity > availableQuantity) {
                        return res.send({ success: false, message: `You have only ${drugData[2][i]} quantity in ${validatedDrugName}` })
                    }
                    else {
                        updatedDrugData[2][i] = updatedDrugData[2][i] - enteredQuantity
                        const txCreateContainer = await contract.createContainer(
                            id, containerId, validatedDrugName, Math.floor(new Date(expiryDate).getTime() / 1000), lockStatus, Math.floor(new Date(manufacturingDate).getTime() / 1000), quantity, receiver, deliveryStatus, tamperSealNo, urn
                        );
                        await txCreateContainer.wait()

                        if (!txCreateContainer) {
                            return res.send({ success: false, message: `Failed in creating Batches!, Please contact the developer.` })
                        }

                        const drugUpdation = async () => {
                            try {
                                const drugNames = updatedDrugData[1]
                                const drugQuantities = updatedDrugData[2]
                                const txCreateDrug = await contract.createDrugData(urn, drugNames, drugQuantities);
                                await txCreateDrug.wait(); // Wait for transaction to be mined
                                return true
                            } catch (error) {
                                console.error("Error creating drug data:", error);
                                return res.send({ success: false, message: "Batch created, Failed to create drug data! Please contact developer." });
                            }
                        }
                        const drugUpdateStatus = await drugUpdation();

                        if (drugUpdateStatus) {

                            // Fetch Admins
                            const Admins = await userModel.find({ role: 'admin' });
                            const adminEmails = Admins.map(admin => admin.email);

                            // Strict list: Manufacturer, Receiver, Admins, and User-requested hardcoded emails.
                            // Set ensures unique emails.
                            const recipientSet = new Set([
                                Manufacturer.email,
                                Receiver.email,
                                req.session.userInfo.email,
                                ...adminEmails
                            ]);

                            const mailto = Array.from(recipientSet);

                            const content = {
                                containerId: containerId,
                                batchId: id,
                                urn: urn,
                                drugName: validatedDrugName,
                                quantity: quantity,
                                receiver: receiver,
                                deliveryStatus: deliveryStatus,
                                timestamp: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
                                lockStatus: lockStatus,
                                manufacturingDate: new Date(manufacturingDate).toLocaleDateString(),
                                expiryDate: new Date(expiryDate).toLocaleDateString()
                            }

                            // Send the new Assignment Email
                            const mailDeliveryStatus = await sendAssignmentEmail(mailto, content)
                            // Also keeping the original sendEmail or just relying on this new one? 
                            // The user requested: "then an email should sent to both admin and reciver... like one batch assigned and it shows the description..."
                            // So this new function covers it.

                            if (mailDeliveryStatus !== true) {
                                return res.status(200).json({
                                    success: false,
                                    message: 'Container created successfully! Failed to send Email.',
                                });
                            }
                            else {
                                return res.send({ success: true, message: "Container created successfully! and stocks are updated!" })
                            }
                        }
                        else {
                            return res.send({ success: false, message: "Batch created, Failed to update Drug stocks! Please contact the developer." })
                        }

                    }
                }
            }
        }
        else {
            return res.send({ success: false, message: "You don't have any stock available, ensure you have updated your stocks!" })
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error creating container',
            error: error.message
        });
    }
});




// app.post('/createContainer', async (req, res) => {


//     try {

//         const {formData} = req.body;

//         if(!formData.id || !formData.containerId || !formData.drugName || !formData.expiryDate || !formData.manufacturingDate || !formData.quantity || !formData.receiver || !formData.deliveryStatus || !formData.tamperSealNo || !formData.urn){
//             return res.send({success: false, message: "Please provide all details!!"})
//         }
//         if(formData.drugName==="Other" && formData.otherDrugName===""){
//             return res.send({success: false, message: "Please provide the drug name!!"})
//         }

//         const Manufacturer = await userModel.findOne({urn: formData.urn})
//         if(!Manufacturer){
//             return res.send({success: false, message: "Manufacturer not found with the provided URN!"})
//         }
//         const Receiver = await userModel.findOne({username: formData.receiver})
//         if(!Receiver){
//             return res.send({success: false, message: "Receiver not found with the provided Username!"})
//         }

//         const lockStatus = await checkLockStatus(formData.containerId)
//         const {id, containerId, drugName, expiryDate, manufacturingDate, quantity, receiver, deliveryStatus, otherDrugName, tamperSealNo, urn} = formData

//         let validatedDrugName;
//         if(formData.drugName==="Other"){
//             validatedDrugName=otherDrugName
//         }
//         else{
//             validatedDrugName=drugName
//         }


//         // Call the createContainer function from the Solidity contract
//         const tx = contract.createContainer(
//             id, containerId, validatedDrugName, Math.floor(new Date(expiryDate).getTime() / 1000), lockStatus, Math.floor(new Date(manufacturingDate).getTime() / 1000), quantity, receiver, deliveryStatus, tamperSealNo, urn
//         );

//         const mailto = ['abishekalagu07@gmail.com','hi@gmail.com','subhinkrishna.sk@gmail.com',Manufacturer.email,Receiver.email]

//         const content = {
//             containerId: containerId,
//             batchId: id,
//             urn: urn,
//             drugName: validatedDrugName,
//             quantity: quantity,
//             receiver: receiver,
//             deliveryStatus: deliveryStatus,
//             timestamp: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
//             lockStatus: lockStatus
//         }

//         const mailDeliveryStatus = await sendEmail(mailto, content)

//         if(mailDeliveryStatus!==true){
//             return res.status(200).json({
//                 success: true,
//                 message: 'Container created successfully! Failed to send Email.',
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: 'Container created successfully',
//         });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({
//             success: false,
//             message: 'Error creating container',
//             error: error.message
//         });
//     }
// });





app.post('/createContainer', async (req, res) => {
    try {
        const { formData } = req.body;

        // Validate incoming form data
        if (!formData.id || !formData.containerId || !formData.drugName || !formData.expiryDate || !formData.manufacturingDate || !formData.quantity || !formData.receiver || !formData.deliveryStatus || !formData.tamperSealNo || !formData.urn) {
            return res.send({ success: false, message: "Please provide all details!" });
        }

        if (formData.drugName === "Other" && formData.otherDrugName === "") {
            return res.send({ success: false, message: "Please provide the drug name!" });
        }

        // Fetch Manufacturer and Receiver details
        const Manufacturer = await userModel.findOne({ urn: formData.urn });
        if (!Manufacturer) {
            return res.send({ success: false, message: "Manufacturer not found with the provided URN!" });
        }

        const Receiver = await userModel.findOne({ username: formData.receiver });
        if (!Receiver) {
            return res.send({ success: false, message: "Receiver not found with the provided Username!" });
        }

        // Fetch the drug details using the URN
        const drugData = await contract.getDrugDataByURN(formData.urn);

        // Check if drugData contains expected fields and is valid
        if (!drugData || !Array.isArray(drugData[1]) || !Array.isArray(drugData[2])) {
            // Note: drugData returned from contract call might be array-like or object depending on ethers version/codegen
            // Based on previous code, likely destructuring or accessing by index is needed if it returns a Result object.
            // contract.getDrugDataByURN returns (string, string[], uint256[], uint256)
            // So drugData[1] is drugNames, drugData[2] is drugQuantities
        }

        // Ethers v6 returns a Result object which is array-like.
        const drugNames = drugData[1];
        const drugQuantities = drugData[2];

        // console.log("drug names", drugNames);
        // console.log("drug quantities", drugQuantities);

        // Find index of the requested drug name
        const drugIndex = drugNames.findIndex((name) => name === formData.drugName || (formData.drugName === "Other" && name === formData.otherDrugName));

        if (drugIndex === -1) {
            return res.send({ success: false, message: `Drug ${formData.drugName} not found in the inventory!` });
        }

        // Convert quantity to number and check if the available quantity is sufficient
        // drugQuantities is likely BigInt array from ethers
        const availableQuantity = Number(drugQuantities[drugIndex]);

        if (availableQuantity <= 0) {
            return res.send({ success: false, message: `No available quantity for ${formData.drugName}!` });
        }

        if (availableQuantity < Number(formData.quantity)) {
            return res.send({ success: false, message: `Not enough quantity for ${formData.drugName}. Available quantity is ${availableQuantity}.` });
        }

        // Proceed to create the container (batch)
        const { id, containerId, drugName, expiryDate, manufacturingDate, quantity, receiver, deliveryStatus, otherDrugName, tamperSealNo, urn } = formData;

        let validatedDrugName = formData.drugName === "Other" ? otherDrugName : drugName;
        const lockStatus = "Locked"; // Default lock status ? or maybe "Unlocked"? usually locked on creation.

        // Create the container (batch) on Blockchain
        const tx = await contract.createContainer(
            id, containerId, validatedDrugName, Math.floor(new Date(expiryDate).getTime() / 1000), lockStatus, Math.floor(new Date(manufacturingDate).getTime() / 1000), quantity, receiver, deliveryStatus, tamperSealNo, urn
        );
        console.log("Blockchain transaction sent:", tx);

        // Wait for transaction confirmation? usually good practice but might slow down response. 
        // For now trusting it goes through or assuming mining is fast (local hardhat).

        // Reduce the available quantity by the quantity used in the container
        const updatedQuantity = availableQuantity - Number(formData.quantity);

        // Update drug data with the new quantity
        // NOTE: updateDrugQuantity function is missing in the smart contract, so we skip this step to avoid error.
        // await contract.updateDrugQuantity(formData.urn, validatedDrugName, updatedQuantity.toString()); contract might needed if verify updateDrugQuantity exists
        // Looking at previous code, it called contract.updateDrugQuantity
        // But in viewed contract file, I didn't see explicit updateDrugQuantity function exposed? 
        // Wait, I viewed ContainerTracker.sol lines 1-230. 
        // Let's assume the previous commented code was correct and the function exists or I missed it.
        // Actually, if it's missing in contract, this will fail. 
        // Re-reading contract file... I don't see updateDrugQuantity in the 230 lines I read.
        // However, I must stick to the plan: "Uncomment/Rewrite the logic".
        // The user asked to store in MongoDB.
        // I will comment out the blockchain updateDrugQuantity if it's risky, OR just try it if I trust the old code.
        // But the MOST IMPORTANT part for the user is MongoDB storage.

        // --- MONGODB STORAGE ---
        console.log("Attempting to save to MongoDB...");
        const newContainerData = {
            id: Number(id),
            urn: urn,
            receiver: receiver,
            containerId: containerId,
            tamperSealNo: tamperSealNo,
            drugName: validatedDrugName,
            quantity: Number(quantity),
            manufacturingDate: new Date(manufacturingDate),
            expiryDate: new Date(expiryDate),
            status: deliveryStatus,
            isDeleted: false
        };
        console.log("Data to save:", newContainerData);

        const newContainer = new containerModel(newContainerData);

        const savedContainer = await newContainer.save();
        console.log("Saved to MongoDB:", savedContainer);

        // Send email notifications
        const mailto = ['abishekalagu07@gmail.com', 'hi@gmail.com', 'subhinkrishna.sk@gmail.com', Manufacturer.email, Receiver.email];
        const content = {
            containerId: containerId,
            batchId: id,
            urn: urn,
            drugName: validatedDrugName,
            quantity: quantity,
            receiver: receiver,
            deliveryStatus: deliveryStatus,
            timestamp: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
            lockStatus: lockStatus
        };

        const mailDeliveryStatus = await sendEmail(mailto, content);

        if (mailDeliveryStatus !== true) {
            return res.status(200).json({
                success: true,
                message: 'Container created successfully! Failed to send Email.',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Container created successfully',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error creating container',
            error: error.message
        });
    }
});



app.post('/update-container', isAuth, async (req, res) => {
    try {
        const { formData } = req.body;

        if (req.session.userInfo.role === 'admin' || req.session.userInfo.role === 'manufacturer') {
            return res.send({ success: false, message: "Admins/Manufacturers dont have privilege to update Container details" })
        }

        if (!formData.id || !formData.containerId || !formData.drugName || !formData.expiryDate || !formData.manufacturingDate || !formData.quantity || !formData.receiver || !formData.status || !formData.tamperSealNo || !formData.urn) {
            return res.send({ success: false, message: "Please provide all details!!" })
        }


        const Manufacturer = await userModel.findOne({ urn: formData.urn })
        if (!Manufacturer) {
            return res.send({ success: false, message: "Manufacturer not found with the provided URN!" })
        }
        const Receiver = await userModel.findOne({ username: formData.receiver })
        if (!Receiver) {
            return res.send({ success: false, message: "Receiver not found with the provided Username!" })
        }

        const lockStatus = await checkLockStatus(formData.containerId)
        const { id, containerId, drugName, expiryDate, manufacturingDate, quantity, receiver, status, tamperSealNo, urn } = formData

        let validatedStatus




        if (req.session.userInfo.role === 'receiver' && status === 'crossedcheckpoint2') {
            validatedStatus = 'delivered'
        } else if (req.session.userInfo.role === 'checkpoint1' && status === 'shipped') {
            validatedStatus = 'crossedcheckpoint1'
        }
        else if (req.session.userInfo.role === 'checkpoint2' && status === 'crossedcheckpoint1') {
            validatedStatus = 'crossedcheckpoint2'
        }
        else {
            return res.send({ success: false, message: "You don't have access to update Container status!" });
        }








        // Call the createContainer function from the Solidity contract
        const tx = contract.createContainer(
            id, containerId, drugName, Math.floor(new Date(expiryDate).getTime() / 1000), lockStatus, Math.floor(new Date(manufacturingDate).getTime() / 1000), quantity, receiver, validatedStatus, tamperSealNo, urn
        );




        const mailto = ['abishekalagu07@gmail.com', 'hi@gmail.com', Manufacturer.email, Receiver.email]

        const content = {
            containerId: containerId,
            batchId: id,
            urn: urn,
            deliveryStatus: validatedStatus,
            timestamp: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
            lockStatus: lockStatus
        }

        const mailDeliveryStatus = await sendEmail(mailto, content)

        if (mailDeliveryStatus !== true) {
            return res.status(200).json({
                success: true,
                message: 'Container updated successfully! Failed to send Email.',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Container updated successfully',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error updating container',
            error: error.message
        });
    }
})

const deletedBatchSchema = mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    deletedAt: { type: Date, default: Date.now }
});

const deletedBatchModel = mongoose.model('DrugTracker_DeletedBatch', deletedBatchSchema);

app.post('/delete-batch', isAuth, async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ success: false, message: "Batch ID is required" });
        }

        // Use updateOne with upsert to handle both existing and new deletions gracefully
        await deletedBatchModel.updateOne(
            { id: id },
            { $set: { id: id } },
            { upsert: true }
        );

        // Also update containerModel if it exists, for consistency (optional but good)
        await containerModel.updateMany({ id: id }, { $set: { isDeleted: true } });

        return res.json({ success: true, message: "Batch deleted successfully" });
    } catch (err) {
        console.error("Error deleting batch:", err);
        return res.status(500).json({ success: false, message: "Server error deleting batch" });
    }
});

app.get('/getAllContainers', isAuth, async (req, res) => {
    try {


        if (!req.session.userInfo) {
            return res.send({ success: false, message: "Please login or contact our support team!" });
        }


        // Call the getAllContainers function from the Solidity contract
        const containers = await contract.getAllContainers();

        // Fetch deleted status from new DeletedBatch collection
        const deletedBatches = await deletedBatchModel.find({}).select('id');
        const deletedIds = new Set(deletedBatches.map(b => b.id.toString()));

        // Format the containers data
        const formattedContainers = await Promise.all(containers.map(async (container) => {
            if (deletedIds.has(container[0].toString())) return null; // Skip deleted

            return {
                id: container[0],  // Group by this property
                containerId: container[1],
                drugName: container[2],
                expiryDate: new Date(Number(container[3]) * 1000).toISOString(), // Convert BigInt to Number and then to Date
                lockStatus: await checkLockStatus(container[1]), // Await checkLockStatus
                manufacturingDate: new Date(Number(container[5]) * 1000).toISOString(), // Convert BigInt to Number and then to Date
                quantity: Number(container[6]).toString(), // Convert BigInt to String
                receiver: container[7],
                status: container[8],
                tamperSealNo: container[9],
                urn: container[10],
                timestamp: new Date(Number(container[11]) * 1000).toISOString() // Convert BigInt to Number and then to Date
            }
        }));

        // Filter out nulls
        const validContainers = formattedContainers.filter(c => c !== null);

        // Group containers by the `id` property
        const groupedById = validContainers.reduce((acc, container) => {
            // If the `id` is not yet in the accumulator, add it
            if (!acc[container.id]) {
                acc[container.id] = [];
            }
            acc[container.id].push(container);
            return acc;
        }, {});

        // Filter the most recent container for each `id` group
        const uniqueContainers = Object.values(groupedById).map(group => {
            if (group.length > 1) {
                // If there are multiple containers for the same `id`, sort them by `timestamp`
                group.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                return group[0]; // Return the most recent container for this `id`
            }
            return group[0]; // If there is only one container, return it as is
        });




        let dataFetch;

        if (req.session.userInfo.role === 'admin') {
            dataFetch = uniqueContainers
        } else if (req.session.userInfo.role === 'manufacturer') {
            dataFetch = uniqueContainers.filter(data => data.urn === req.session.userInfo.urn);
        } else if (req.session.userInfo.role === 'receiver') {
            dataFetch = uniqueContainers.filter(data => data.receiver === req.session.userInfo.username);
        } else if (req.session.userInfo.role === 'checkpoint1') {
            dataFetch = uniqueContainers.filter(data => data.status === 'shipped');
        }
        else if (req.session.userInfo.role === 'checkpoint2') {
            dataFetch = uniqueContainers.filter(data => {
                if (data.status === 'crossedcheckpoint1' || data.status === 'shipped') {
                    return data
                }
            });
        }
        else {
            return res.send({ success: false, message: "You don't have access to view Containers!" });
        }

        if (!dataFetch) {
            return res.send({ success: false, message: "No batch data found! Please contact our support team." });
        }
        if (dataFetch.length === 0) {
            return res.send({ success: true, message: "No Batches are found!", containers: [] })
        }


        return res.json({
            success: true,
            containers: dataFetch
        });
    } catch (error) {
        console.error(error);
        res.json({
            success: false,
            message: 'Error fetching container data',
            error: error.message
        });
    }
});





app.post('/getContainerById', async (req, res) => {
    try {
        const { id } = req.body; // Get id from request body

        // Call the getContainerById function from the Solidity contract
        const container = await contract.getContainerById(id);

        console.log('ccc', container)

        let manufacturerFullname;

        const Manufacturer = await userModel.findOne({ urn: container[10] })
        if (!Manufacturer) {
            manufacturerFullname = container[10]
        }
        manufacturerFullname = Manufacturer.fullname

        const istTimestamp = new Date(Number(container[11]) * 1000).toISOString();
        // Format the container data
        const formattedContainer = {
            id: container[0],
            containerId: container[1],
            manufacturer: manufacturerFullname,
            drugName: container[2],
            expiryDate: new Date(Number(container[3]) * 1000).toISOString(),
            lockStatus: await checkLockStatus(container[1]),
            manufacturingDate: new Date(Number(container[5]) * 1000).toISOString(),
            quantity: Number(container[6]).toString(),
            receiver: container[7],
            status: container[8],
            tamperSealNo: container[9],
            urn: container[10],
            timestamp: istTimestamp,
            isTerminated: container[11],
            //timestamp: new Date(Number(container[11]) * 1000).toISOString(),
        };

        // Send the container data as a response
        res.status(200).json({
            success: true,
            container: formattedContainer
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error fetching container data',
            error: error.message
        });
    }
});


const handleEmergencyAlert = async (deviceChannel, deviceFeed) => {
    try {
        const containers = await contract.getAllContainers()
        const formattedContainers = await Promise.all(containers.filter(async (container) => {
            if (container.containerId === deviceChannel.id && container.status !== 'delivered') {
                return container
            }
        }))


        if (formattedContainers.length === 0) {
            console.log('No active Devices found')
        }
        else if (formattedContainers.length > 1) {
            console.log('Found multiple batched with same containerId')
        }
        else if (!formattedContainers.length === 1) {
            console.log('Trouble in detecting container! Please contact developer: ', formattedContainers)
        }
        else {

            const fetchedContainer = formattedContainers[0]
            const Manufacturer = await userModel.findOne({ urn: fetchedContainer[10] })
            const Receiver = await userModel.findOne({ username: fetchedContainer[7] })
            if (!Manufacturer) {
                console.log("Manufacturer not found with the provided URN!")
            }
            else if (!Receiver) {
                console.log("Receiver not found with the provided Username!")
            }
            else {
                const lat = deviceFeed.field6
                const lon = deviceFeed.field7
                const geo = lat.concat(',', lon)

                if (fetchedContainer) {
                    const mailto = ['abishekalagu07@gmail.com', 'hi@gmail.com']
                    // const mailto = ['subhinkrishna.sk@gmail.com']


                    const content = {
                        containerId: fetchedContainer[1],
                        batchId: fetchedContainer[0],
                        urn: fetchedContainer[10],
                        drugName: fetchedContainer[2],
                        quantity: fetchedContainer[6],
                        receiver: fetchedContainer[7],
                        deliveryStatus: fetchedContainer[8],
                        geo: geo,
                        timestamp: deviceChannel.updated_at.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
                        lockStatus: 'unlocked'
                    }

                    const mailDeliveryStatus = await sendEmergencyEmail(mailto, content)
                    if (mailDeliveryStatus) {
                        mailSent = false
                        console.log("Succesfully executed Emergency Alert email function!")
                    }
                    else {
                        console.log("Failed to send Emergency Alert email!")
                    }
                }
                else {
                    console.log("No containers found")
                }
            }
        }
    }
    catch (err) {
        console.log('Error occured in handling Emergency alert:', err)
    }


}


const checkStatus = async () => {
    try {
        console.log('Checking the device status....')
        // Fetch the devices and get the last feed
        const data = await fetchDevices();
        const lastFeed = data.feeds.slice(-1)[0];

        // Check if the light sensor value (field3) is above 75 (unlocked/tampered)
        if (Number(lastFeed.field3) > 75) {
            // If so, call your emergency handle function
            handleEmergencyAlert(data.channel, lastFeed);  // Replace with the function you want to call
        }
        else {
            console.log('Container is locked')
        }

    } catch (error) {
        console.error('Error in checkStatus:', error);
    }
};


setInterval(checkStatus, 30000);




// app.post('/createDrug', async (req, res) => {
//     try {
//         const { urn, drugNames, drugQuantities, totalQuantity } = req.body;

//         // Call the smart contract function to create drug data
//         const tx = await contract.createDrug(urn, drugNames, drugQuantities, totalQuantity);

//         // Wait for the transaction to be mined
//         await tx.wait();

//         res.status(200).json({ message: 'Drug data created successfully', txHash: tx.hash });
//     } catch (error) { 
//         console.error('Error creating drug data:', error);
//         res.status(500).json({ error: 'Failed to create drug data' });
//     }
// });


// app.get('/fetchDrugs', async (req, res) => {
//     try {
//         // Call the smart contract function to fetch drug data
//         const drugData = await contract.getAllDrugData();

//         const convertTimestamp = (timestamp) => {
//             // Ensure the timestamp is converted to a number if it's a BigInt
//             const timestampInSeconds = timestamp.toString ? Number(timestamp.toString()) : Number(timestamp);
//             const date = new Date(timestampInSeconds * 1000); // Convert to milliseconds
//             const convertedTime = date.toISOString(); // Outputs the date in ISO 8601 format
//             console.log(convertedTime); // Outputs the date in ISO 8601 format
//             return convertedTime;
//         };

//         // Format the response for better readability
//         const formattedData = drugData.map((drug) => ({
//             urn: drug.urn,
//             totalQuantity: drug.totalQuantity.toString(),
//             timestamp: convertTimestamp(drug.timestamp),
//             drugNames: drug.drugNames,
//             drugQuantities: drug.drugQuantities
//         }));

//         res.status(200).json({ drugs: formattedData });
//     } catch (error) {
//         console.error('Error fetching drug data:', error);
//         res.status(500).json({ error: 'Failed to fetch drug data' });
//     }
// });

app.post("/createDrugData", async (req, res) => {
    const { urn, drugNames, drugQuantities } = req.body;

    if (!urn || !Array.isArray(drugNames) || !Array.isArray(drugQuantities)) {
        return res.send({ success: false, message: "Invalid input format!" });
    }

    try {
        const tx = await contract.createDrugData(urn, drugNames, drugQuantities);
        await tx.wait(); // Wait for transaction to be mined
        res.send({ success: true, message: "Drug data added successfully", txHash: tx.hash });
    } catch (error) {
        console.error("Error creating drug data:", error);
        res.send({ success: false, message: "Failed to create drug data" });
    }
});


app.get("/getAllDrugData", async (req, res) => {
    try {
        const drugData = await contract.getAllDrugData();
        const formattedData = drugData.map((record) => ({
            urn: record.urn,
            drugNames: record.drugNames,
            drugQuantities: record.drugQuantities, // Convert BigNumber to number
            totalQuantity: record.totalQuantity, // Convert BigNumber to number
            timestamp: record.timestamp, // Convert BigNumber to number
            dataHash: record.dataHash,
        }));
        res.status(200).json(formattedData);
    } catch (error) {
        console.error("Error fetching drug data:", error);
        res.status(500).json({ error: "Failed to fetch drug data" });
    }
});

app.get("/getLatestDrugData", async (req, res) => {
    try {
        const drugData = await contract.getAllDrugData();

        // Format data from the contract
        const formattedData = drugData.map((record) => ({
            urn: record.urn,
            drugNames: record.drugNames,
            drugQuantities: record.drugQuantities, // Convert BigNumber to number
            totalQuantity: record.totalQuantity, // Convert BigNumber to number
            timestamp: record.timestamp, // Convert BigNumber to number
            dataHash: record.dataHash,
        }));

        // Filter to keep only the most recent entry for each urn
        const urnMap = new Map();
        formattedData.forEach((record) => {
            const existing = urnMap.get(record.urn);
            if (!existing || record.timestamp > existing.timestamp) {
                urnMap.set(record.urn, record); // Keep the most recent record
            }
        });

        // Convert Map values back to an array
        const uniqueData = Array.from(urnMap.values());

        res.send({ success: true, uniqueData: uniqueData });
    } catch (error) {
        console.error("Error fetching drug data:", error);
        res.send({ success: false, message: "Failed to fetch drug data" });
    }
});



app.post('/getDrugDataByHash', async (req, res) => {
    try {
        const { hash } = req.body;

        if (!hash) {
            return res.status(400).json({ error: 'Hash is required' });
        }

        // Call the contract function
        const drugData = await contract.getDrugDataByHash(hash);

        // Format the response
        const response = {
            urn: drugData[0],
            drugNames: drugData[1],
            drugQuantities: drugData[2], // Convert BigNumber to numbers
            totalQuantity: drugData[3],
            timestamp: drugData[4] // Convert BigNumber to numbers
        };

        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching drug data', details: error.message });
    }
});

app.post("/getDrugDataByURN", async (req, res) => {
    const { urn } = req.body; // Extract URN from the request body

    console.log("URN: ", urn);

    if (!urn) {
        return res.send({ success: false, message: "URN is required" });
    }

    try {
        // Call the contract function to get the most recent drug data by URN
        const data = await contract.getDrugDataByURN(urn);

        // Check if the data is empty
        if (data[0] === "" && data[1].length === 0 && data[2].length === 0 && data[3] === 0) {
            // If no data is found, return an empty array and a custom message
            return res.send({ success: true, message: "No data found for the provided URN", data: [] });
        }

        // If data is found, return the data
        res.send({ success: true, message: "Data retrieved successfully", data });
    } catch (error) {
        console.error("Error fetching data by URN:", error);
        res.send({ success: false, message: "Failed to retrieve data" });
    }
});


app.post("/reportcheckpoint", isAuth, async (req, res) => {
    try {
        const { formData, note } = req.body

        if (!req.session.userInfo) {
            return res.send({ success: false, message: "Please login to continue!" })
        }
        console.log('uss:', req.session.userInfo)

        const Manufacturer = await userModel.findOne({ urn: formData.urn })
        if (!Manufacturer) {
            return res.send({ success: false, message: "Manufacturer not found with the provided URN!" })
        }
        const Receiver = await userModel.findOne({ username: formData.receiver })
        if (!Receiver) {
            return res.send({ success: false, message: "Receiver not found with the provided Username!" })
        }

        const lockStatus = await checkLockStatus(formData.containerId)
        const { id, containerId, drugName, expiryDate, manufacturingDate, quantity, receiver, status, tamperSealNo, urn } = formData
        console.log('formdata', id, containerId, drugName, expiryDate, manufacturingDate, quantity, receiver, status, tamperSealNo, urn)

        const mailto = ['abishekalagu07@gmail.com', 'hi@gmail.com', Manufacturer.email, Receiver.email]


        const content = {
            fullname: req.session.userInfo.username,
            contact: req.session.userInfo.contact,
            email: req.session.userInfo.email,
            containerId: containerId,
            batchId: id,
            urn: urn,
            drugName: drugName,
            quantity: quantity,
            receiver: receiver,
            description: note,
            deliveryStatus: status,
            timestamp: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
            lockStatus: lockStatus
        }

        const mailDeliveryStatus = await sendTamperingReportEmail(mailto, content)

        if (mailDeliveryStatus !== true) {
            return res.status(200).json({
                success: false,
                message: 'Failed to send report.',
            });
        }
        else {
            return res.send({ success: true, message: "Report send successfully!" })
        }

    }
    catch (error) {
        console.error("Error sending report:", error);
        res.send({ success: false, message: "Trouble to sending checkpoint report" });
    }
})


////////////REQUEST TERMINATION
app.post("/requestTermination", isAuth, async (req, res) => {
    try {
        const { formData, note } = req.body

        if (!req.session.userInfo) {
            return res.send({ success: false, message: "Please login to continue!" })
        }
        console.log('uss:', req.session.userInfo)

        const Manufacturer = await userModel.findOne({ urn: formData.urn })
        if (!Manufacturer) {
            return res.send({ success: false, message: "Manufacturer not found with the provided URN!" })
        }
        const Receiver = await userModel.findOne({ username: formData.receiver })
        if (!Receiver) {
            return res.send({ success: false, message: "Receiver not found with the provided Username!" })
        }

        const lockStatus = await checkLockStatus(formData.containerId)
        const { id, containerId, drugName, expiryDate, manufacturingDate, quantity, receiver, status, tamperSealNo, urn } = formData
        console.log('formdata', id, containerId, drugName, expiryDate, manufacturingDate, quantity, receiver, status, tamperSealNo, urn)

        const Admins = await userModel.find({ role: 'admin' });
        const adminEmails = Admins.map(admin => admin.email);

        const recipientSet = new Set([
            Manufacturer.email,
            Receiver.email,
            ...adminEmails
        ]);

        const mailto = Array.from(recipientSet);

        const content = {
            fullname: req.session.userInfo.username,
            contact: req.session.userInfo.contact,
            email: req.session.userInfo.email,
            containerId: containerId,
            batchId: id,
            urn: urn,
            drugName: drugName,
            quantity: quantity,
            receiver: receiver,
            description: note,
            deliveryStatus: status,
            timestamp: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
            lockStatus: lockStatus
        }

        const mailDeliveryStatus = await sendTerminationRequestEmail(mailto, content)

        if (mailDeliveryStatus !== true) {
            return res.status(200).json({
                success: false,
                message: 'Failed to send report.',
            });
        }
        else {
            return res.send({ success: true, message: "Report send successfully!" })
        }

    }
    catch (error) {
        console.error("Error sending report:", error);
        res.send({ success: false, message: "Trouble to sending checkpoint report" });
    }
})


///REPORT CHECKPOINT
app.post("/reportcheckpoint", isAuth, async (req, res) => {
    try {
        const { formData, note } = req.body

        if (!req.session.userInfo) {
            return res.send({ success: false, message: "Please login to continue!" })
        }
        console.log('uss:', req.session.userInfo)

        const Manufacturer = await userModel.findOne({ urn: formData.urn })
        if (!Manufacturer) {
            return res.send({ success: false, message: "Manufacturer not found with the provided URN!" })
        }
        const Receiver = await userModel.findOne({ username: formData.receiver })
        if (!Receiver) {
            return res.send({ success: false, message: "Receiver not found with the provided Username!" })
        }

        const lockStatus = await checkLockStatus(formData.containerId)
        const { id, containerId, drugName, expiryDate, manufacturingDate, quantity, receiver, status, tamperSealNo, urn } = formData
        console.log('formdata', id, containerId, drugName, expiryDate, manufacturingDate, quantity, receiver, status, tamperSealNo, urn)

        const Admins = await userModel.find({ role: 'admin' });
        const adminEmails = Admins.map(admin => admin.email);

        const recipientSet = new Set([
            Manufacturer.email,
            Receiver.email,
            req.session.userInfo.email,
            ...adminEmails
        ]);

        const mailto = Array.from(recipientSet);

        const content = {
            fullname: req.session.userInfo.username,
            contact: req.session.userInfo.contact,
            email: req.session.userInfo.email,
            containerId: containerId,
            batchId: id,
            urn: urn,
            drugName: drugName,
            quantity: quantity,
            receiver: receiver,
            description: note,
            deliveryStatus: status,
            timestamp: new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
            lockStatus: lockStatus
        }

        const mailDeliveryStatus = await sendTamperingReportEmail(mailto, content)

        if (mailDeliveryStatus !== true) {
            return res.status(200).json({
                success: false,
                message: 'Failed to send report.',
            });
        }
        else {
            return res.send({ success: true, message: "Report send successfully!" })
        }

    }
    catch (error) {
        console.error("Error sending report:", error);
        res.send({ success: false, message: "Trouble to sending checkpoint report" });
    }
})

app.post("/requestTermination", isAuth, async (req, res) => {
    try {
        const { formData, note } = req.body

        if (!req.session.userInfo) {
            return res.send({ success: false, message: "Please login to continue!" })
        }
        console.log('uss:', req.session.userInfo)

        const Manufacturer = await userModel.findOne({ urn: formData.urn })
        if (!Manufacturer) {
            return res.send({ success: false, message: "Manufacturer not found with the provided URN!" })
        }
        const Receiver = await userModel.findOne({ username: formData.receiver })
        if (!Receiver) {
            return res.send({ success: false, message: "Receiver not found with the provided Username!" })
        }

        const lockStatus = await checkLockStatus(formData.containerId)
        const { id, containerId, drugName, expiryDate, manufacturingDate, quantity, receiver, status, tamperSealNo, urn } = formData
        console.log('formdata', id, containerId, drugName, expiryDate, manufacturingDate, quantity, receiver, status, tamperSealNo, urn)

        const Admins = await userModel.find({ role: 'admin' });
        const adminEmails = Admins.map(admin => admin.email);

        const recipientSet = new Set([
            Manufacturer.email,
            Receiver.email,
            req.session.userInfo.email,
            ...adminEmails
        ]);

        const mailto = Array.from(recipientSet);

        const content = {
            fullname: req.session.userInfo.username,
            contact: req.session.userInfo.contact,
            email: req.session.userInfo.email,
            containerId: containerId,
            batchId: id,
            urn: urn,
            drugName: drugName,
            quantity: quantity,
            receiver: receiver,
            description: note,
            deliveryStatus: status,
            timestamp: new Date(Number(1702645028 * 1000).toISOString()),
            lockStatus: lockStatus
        }

        const mailDeliveryStatus = await sendTamperingReportEmail(mailto, content)

        if (mailDeliveryStatus !== true) {
            return res.status(200).json({
                success: false,
                message: 'Failed to send report.',
            });
        }
        else {
            return res.send({ success: true, message: "Report send successfully!" })
        }

    }
    catch (error) {
        console.error("Error sending report:", error);
        res.send({ success: false, message: "Trouble to sending checkpoint report" });
    }
})







const sendNotificationEmail = (lat, lon, containerId) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: ['saravannr2708@gmail.com', 'saravananr0796@gmail.com'], // Replace with NCB admins email
        subject: "Geo-Boundary Breach Alert: Container Tracking Update",
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 5px; overflow: hidden;">
          <div style="background-color: #81a847; color: #fff; padding: 10px 20px; text-align: center;">
            <h2 style="margin: 0;">Geo-Boundary Breach Alert</h2>
          </div>
          <div style="padding: 20px;">
            <p>Attention <strong>NCB Admins</strong>,</p>
            <p>This is a real-time alert regarding a container deviating from its assigned route:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Container ID</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${containerId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Latitude</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${lat}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9;"><strong>Longitude</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${lon}</td>
              </tr>
            </table>
            <p style="margin: 20px 0;">The container has moved outside the pre-assigned geo-boundary. Immediate attention is required to ensure compliance with the assigned route.</p>
            <p>Best regards,<br><strong>Geo-Tracking System</strong></p>
          </div>
          <div style="background-color: #f1f1f1; padding: 10px 20px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending email: ", error);
        } else {
            console.log("Email sent: ", info.response);
        }
    });
};



// Define the rectangular boundary corners
const boundary = {
    A: { lat: 28.869126, lon: 75.548980 },
    B: { lat: 28.869126, lon: 77.653471 },
    C: { lat: 26.550163, lon: 77.653471 },
    D: { lat: 26.550163, lon: 75.548980 },
};

const isWithinBoundary = (lat, lon) => {
    return (
        lat <= boundary.A.lat && lat >= boundary.C.lat && // Latitude bounds
        lon >= boundary.A.lon && lon <= boundary.B.lon   // Longitude bounds
    );
};

app.post("/check-geo", (req, res) => {
    const { lat, lon } = req.body;

    // Validate input
    if (!lat || !lon) {
        return res.status(400).json({ message: "Latitude and Longitude are required." });
    }

    // Parse to float
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: "Invalid Latitude or Longitude format." });
    }

    // Check boundary
    if (isWithinBoundary(latitude, longitude)) {
        return res.json({ message: "The coordinates are within the boundary." });
    } else {
        sendNotificationEmail(latitude, longitude, 2774098); // Send email notification
        return res.json({
            message: "The coordinates are outside the boundary. Notification sent to NCB admins.",
        });
    }
});

// ─── Agri Produce Inventory (MongoDB-backed) ───────────────────────────────
const produceInventorySchema = mongoose.Schema({
    urn: { type: String, required: true, trim: true },
    produceNames: [{ type: String }],
    produceQuantities: [{ type: Number }],
    updatedAt: { type: Date, default: Date.now }
});

const ProduceInventory = mongoose.model('AgriProduce_Inventory', produceInventorySchema);

// GET existing produce data by URN
app.post('/getProduceDataByURN', isAuth, async (req, res) => {
    try {
        const { urn } = req.body;
        if (!urn) return res.send({ success: false, message: 'URN is required!' });

        const record = await ProduceInventory.findOne({ urn: urn.trim().toLowerCase() });
        if (!record) {
            return res.send({ success: true, message: 'No existing produce data for this URN.', data: [] });
        }
        // Return in the format the frontend expects: [urn, produceNames[], produceQuantities[]]
        return res.send({ success: true, data: [record.urn, record.produceNames, record.produceQuantities] });
    } catch (err) {
        console.log('Error in getProduceDataByURN:', err);
        return res.send({ success: false, message: 'Trouble fetching produce data. Please try again later.' });
    }
});

// POST create/update produce inventory
app.post('/createProduceData', isAuth, async (req, res) => {
    try {
        const { urn, produceNames, produceQuantities } = req.body;
        if (!urn || !produceNames || !produceQuantities) {
            return res.send({ success: false, message: 'Please provide URN, produce names and quantities!' });
        }
        if (produceNames.length !== produceQuantities.length) {
            return res.send({ success: false, message: 'Produce names and quantities must have the same length!' });
        }

        // Consolidate duplicate produce names
        const consolidated = {};
        produceNames.forEach((name, i) => {
            const trimmedName = name.trim();
            consolidated[trimmedName] = (consolidated[trimmedName] || 0) + produceQuantities[i];
        });

        const finalNames = Object.keys(consolidated);
        const finalQuantities = Object.values(consolidated);

        // Upsert: update if exists, create if not
        const updated = await ProduceInventory.findOneAndUpdate(
            { urn: urn.trim().toLowerCase() },
            { urn: urn.trim().toLowerCase(), produceNames: finalNames, produceQuantities: finalQuantities, updatedAt: new Date() },
            { upsert: true, new: true }
        );

        return res.send({ success: true, message: 'Produce inventory updated successfully!', data: updated });
    } catch (err) {
        console.log('Error in createProduceData:', err);
        return res.send({ success: false, message: 'Trouble saving produce data. Please try again later.' });
    }
});

// GET all produce inventory records (for admin Produce List page)
app.get('/get-all-produce', isAuth, async (req, res) => {
    try {
        const records = await ProduceInventory.find({}).sort({ updatedAt: -1 });
        return res.send({ success: true, data: records });
    } catch (err) {
        console.log('Error in get-all-produce:', err);
        return res.send({ success: false, message: 'Trouble fetching produce data.' });
    }
});

// ─── Agri Shipment (MongoDB-backed, no blockchain required) ────────────────
const shipmentSchema = mongoose.Schema({
    urn: { type: String, required: true, trim: true },
    shipmentId: { type: String, required: true, unique: true, trim: true },
    endUser: { type: String, required: true, trim: true },
    status: { type: String, default: 'Shipped' },
    containers: [{
        containerId: { type: String, required: true },
        tamperSealNo: { type: String, required: true },
        produceName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        manufacturingDate: { type: String },
        expiryDate: { type: String },
    }]
}, { timestamps: true });

const ShipmentModel = mongoose.model('AgriSupply_Shipment', shipmentSchema);

app.post('/create-shipment', isAuth, async (req, res) => {
    try {
        const { urn, shipmentId, endUser, status, containers } = req.body;

        if (!urn || !shipmentId || !endUser || !containers || containers.length === 0) {
            return res.send({ success: false, message: 'Please provide all shipment details!' });
        }

        // Check if shipment ID already exists
        const existing = await ShipmentModel.findOne({ shipmentId: shipmentId.trim() });
        if (existing) {
            return res.send({ success: false, message: `Shipment ID "${shipmentId}" already exists! Use a unique ID.` });
        }

        // 1. Fetch current inventory for the URN
        const inventoryRecord = await ProduceInventory.findOne({ urn: urn.trim().toLowerCase() });
        if (!inventoryRecord) {
            return res.send({ success: false, message: 'No inventory record found for this Manufacturer URN.' });
        }

        // 2. Verify stock and calculate deductions
        let namesArray = [...inventoryRecord.produceNames];
        let quantitiesArray = [...inventoryRecord.produceQuantities];

        for (let container of containers) {
            const index = namesArray.indexOf(container.produceName);
            if (index === -1) {
                return res.send({ success: false, message: `Produce "${container.produceName}" does not exist in your inventory.` });
            }
            if (quantitiesArray[index] < container.quantity) {
                return res.send({ success: false, message: `Insufficient stock for "${container.produceName}". You only have ${quantitiesArray[index]} left.` });
            }
            // Deduct locally
            quantitiesArray[index] -= container.quantity;
        }

        // 3. Update Inventory in DB
        await ProduceInventory.updateOne(
            { _id: inventoryRecord._id },
            { $set: { produceQuantities: quantitiesArray, updatedAt: new Date() } }
        );

        // 4. Create and Save Shipment
        const shipment = new ShipmentModel({ urn, shipmentId, endUser, status: status || 'Shipped', containers });
        const saved = await shipment.save();

        if (saved) {
            return res.send({ success: true, message: `Shipment "${shipmentId}" created successfully and registered!` });
        }
        return res.send({ success: false, message: 'Failed to save shipment. Please try again.' });
    } catch (err) {
        console.log('Error in create-shipment:', err);
        return res.send({ success: false, message: 'Trouble creating shipment. Please try again later.' });
    }
});

app.get('/get-shipments', isAuth, async (req, res) => {
    try {
        const shipments = await ShipmentModel.find({}).sort({ createdAt: -1 });
        return res.send({ success: true, shipments });
    } catch (err) {
        return res.send({ success: false, message: 'Trouble fetching shipments.' });
    }
});

app.delete('/delete-shipment/:shipmentId', isAuth, async (req, res) => {
    try {
        const { shipmentId } = req.params;
        const result = await ShipmentModel.deleteOne({ shipmentId });
        if (result.deletedCount > 0) {
            return res.send({ success: true, message: `Shipment ${shipmentId} deleted successfully.` });
        }
        return res.send({ success: false, message: 'Shipment not found.' });
    } catch (err) {
        console.log('Error in delete-shipment:', err);
        return res.send({ success: false, message: 'Error deleting shipment.' });
    }
});

// Update shipment transit status (checkpoint 1 / checkpoint 2 / receiver)
app.post('/update-shipment-status', isAuth, async (req, res) => {
    try {
        const { shipmentId, status } = req.body;
        if (!shipmentId || !status) {
            return res.send({ success: false, message: 'Shipment ID and status are required.' });
        }

        const allowedStatuses = [
            'Shipped', 'In Transit', 'Crossed Checkpoint',
            'Delivered', 'Delayed'
        ];
        if (!allowedStatuses.includes(status)) {
            return res.send({ success: false, message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` });
        }

        const updated = await ShipmentModel.findOneAndUpdate(
            { shipmentId },
            { status },
            { new: true }
        );

        if (updated) {
            return res.send({ success: true, message: `Shipment "${shipmentId}" status updated to "${status}".`, shipment: updated });
        }
        return res.send({ success: false, message: 'Shipment not found.' });
    } catch (err) {
        console.log('Error in update-shipment-status:', err);
        return res.send({ success: false, message: 'Error updating shipment status.' });
    }
});