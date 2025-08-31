import nodemailer from 'nodemailer'

const transporter = process.env.SMTP_URL
  ? nodemailer.createTransport(process.env.SMTP_URL)
  : null

export async function sendDiscountEmail(to: string, author: string) {
  const subject = `10% off on ${author}'s books`
  const text = `Congrats! You've guessed ${author} correctly 10 times. Enjoy a 10% discount on ${author}'s books.`
  if (!transporter) {
    console.log(`[email stub] To: ${to} | ${subject}\n${text}`)
    return
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@example.com',
      to,
      subject,
      text,
    })
  } catch (err) {
    console.error('sendDiscountEmail failed:', err)
    throw err
  }
}