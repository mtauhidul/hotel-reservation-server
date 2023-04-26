const admin = require('firebase-admin');

let serviceAccount = require('./serviceAccountKey.json');

const app = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  : admin.app();

exports.fulfillOrder = async (session) => {
  console.log('Fulfilling order', session);

  const bookingDetails = JSON.parse(session.metadata.bookingDetails);

  console.log('Booking Details', bookingDetails);

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
  };

  bookings.push(newBooking);

  await app
    .firestore()
    .collection('rooms')
    .doc(session.metadata.roomId)
    .update({
      bookings,
    });

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};
