require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const express = require('express');
const cors = require('cors');
const { fulfillOrder } = require('./webhook');
const { resolveAny } = require('dns');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(express.static(path.resolve(__dirname, './wwwroot/app')));
app.use(express.static(path.join(__dirname, './wwwroot/app')));

const endpointSecret = process.env.STRIPE_SIGNING_SECRET;

const host = process.env.HOST;

app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, './wwwroot/app'));
});

app.get('/', (req, res) => {
  res.send('Hotel Reservation System');
});

app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (request, response) => {
    const sig = request.headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(paymentIntent);

        break;
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log(session);
        fulfillOrder(session)
          .then(() => response.status(200))
          .catch((err) =>
            response.status(400).send(`Webhook error: ${err.message}`)
          );
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    response.send();
  }
);
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  const {
    priceId,
    imagesEN,
    priceEN,
    thumbnailEN,
    titleEN,
    petsEN,
    id,
    bathtubEN,
    typeEN,
    breakfastEN,
    guests,
    checkIn,
    checkOut,
    descriptionEN,
  } = req.body;

  const transformedItem = {
    price_data: {
      currency: 'usd',
      unit_amount: Number(+priceEN * 100) * Number(guests),
      product_data: {
        name: titleEN,
        images: [imagesEN[0]],
        description: descriptionEN.slice(0, 100),
      },
    },
    quantity: 1,
  };
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [transformedItem],
    mode: 'payment',
    success_url: `${host}/thanks`,
    cancel_url: `${host}/rooms`,
    metadata: {
      roomId: id,
      images: JSON.stringify(thumbnailEN),
      bookingDetails: JSON.stringify({
        guests,
        checkIn,
        checkOut,
        typeEN,
      }),
    },
  });

  res.status(200).json({
    id: session.id,
    name: session.name,
    email: session.email,
  });
});

app.listen(
  process.env.PORT || 5000,
  console.log(`Server running on port ${process.env.PORT || 5000}`)
);
