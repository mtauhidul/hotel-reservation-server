const admin = require('firebase-admin');
const emailjs = require('@emailjs/nodejs');
const serviceAccountKey = require('./serviceAccountKey');

const app = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
    })
  : admin.app();

exports.fulfillOrder = async (session) => {
  const bookingDetails = JSON.parse(session.metadata.bookingDetails);

  const room = await app
    .firestore()
    .collection('rooms')
    .doc(session.metadata.roomId)
    .get();

  const { bookings } = room.data();

  const newBooking = {
    checkIn: bookingDetails.checkIn,
    checkOut: bookingDetails.checkOut,
    guests: bookingDetails.guests,
    type: bookingDetails.typeEN,
    id: session.id,
    name: session.customer_details.name,
    email: session.customer_details.email,
  };

  bookings.push(newBooking);

  await app
    .firestore()
    .collection('rooms')
    .doc(session.metadata.roomId)
    .update({
      bookings,
    });

  const templateParams = {
    name: newBooking.name,
    email: newBooking.email,
    room: room.data().titleEN,
    type: newBooking.type,
    checkIn: newBooking.checkIn,
    checkOut: newBooking.checkOut,
    guest: newBooking.guests,
    bookingDate: new Date().toLocaleDateString(),
    bookingId: newBooking.id,
  };

  const SERVICE_ID = process.env.VITE_PUBLIC_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = process.env.VITE_CONFIRMATION_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = process.env.VITE_PUBLIC_EMAILJS_USER_ID;
  const PRIVATE_KEY = process.env.VITE_PRIVATE_EMAILJS_USER_ID;

  emailjs
    .send(SERVICE_ID, TEMPLATE_ID, templateParams, {
      publicKey: PUBLIC_KEY,
      privateKey: PRIVATE_KEY,
    })
    .then(
      function (response) {
        console.log('SUCCESS!', response.status, response.text);
      },
      function (err) {
        console.log('FAILED...', err);
      }
    );

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};
