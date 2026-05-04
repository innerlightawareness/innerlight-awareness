const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

// Configure a free Gmail transporter (you need an App Password if 2FA enabled)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,          // your-email@gmail.com
    pass: process.env.EMAIL_APP_PASSWORD  // generated app password
  }
});

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,              // raw body (Vercel provides req.body as buffer if you set up correctly)
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata;
    const courses = JSON.parse(metadata.courses);
    const participantName = metadata.participantName;
    const participantEmail = metadata.participantEmail;
    const participantDOB = metadata.participantDOB;
    const participantPOB = metadata.participantPOB;

    // ----- 1. Email to owner -----
    const ownerSubject = `New Course Enrollment: ${courses.map(c => c.name).join(', ')}`;
    const ownerBody = `Participant Name: ${participantName}
Email: ${participantEmail}
Date of Birth: ${participantDOB}
Place of Birth: ${participantPOB}

Courses enrolled:
${courses.map(c => `- ${c.name} (starting ${c.startDate})`).join('\n')}

Total paid: $${(session.amount_total / 100).toFixed(2)}
Enrollment date: ${new Date().toLocaleDateString()}
`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.OWNER_EMAIL,   // 'innerlightbackend@gmail.com'
      subject: ownerSubject,
      text: ownerBody
    });

    // ----- 2. Email to participant (one per course) -----
    for (const course of courses) {
      const userBody = `Hello ${participantName},

Thank you for enrolling in ${course.name}!
Start date: ${course.startDate}

Your journey with Innerlight Awareness begins soon. We'll be in touch with further details.

With light,
Innerlight Awareness Team`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: participantEmail,
        subject: `Your Course: ${course.name}`,
        text: userBody
      });
    }
  }

  res.status(200).json({ received: true });
};