const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { lineItems, participant } = req.body;  // participant = { name, email, dob, pob, cartCourses }

    // Build line items exactly as before
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${req.headers.origin}/success.html`,   // you'll add this static page later
      cancel_url: `${req.headers.origin}`,
      customer_email: participant.email,
      metadata: {
        participantName: participant.name,
        participantEmail: participant.email,
        participantDOB: participant.dob,
        participantPOB: participant.pob,
        // Store course names and start dates as JSON
        courses: JSON.stringify(participant.courses)  // expects array of { name, startDate }
      }
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};