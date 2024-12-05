const express = require("express")
const cors = require("cors")
const nodemailer = require("nodemailer")
require("dotenv").config()

const app = express()

app.use(cors())
app.use(express.json())

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

app.post("/send-email", async (req, res) => {
  const { to, subject, text } = req.body

  try {
    const info = await transporter.sendMail({
      from: `"Notificaciones" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    })

    console.log("Correo enviado: %s", info.messageId);
    res.status(200).json({ message: "Correo enviado exitosamente" })
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    res.status(500).json({ error: "Error al enviar el correo" })
  }
})

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
