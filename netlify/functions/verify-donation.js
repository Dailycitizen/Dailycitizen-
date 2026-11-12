const { getStore } = require("@netlify/blobs");

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

exports.handler = async (event) => {

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: {
        ...headers,
        Allow: "GET"
      },
      body: JSON.stringify({
        success: false,
        message: "Method not allowed."
      })
    };
  }

  const secretKey = process.env.FLW_SECRET_KEY;

  const transactionId =
    event.queryStringParameters?.transaction_id;

  const txRef =
    event.queryStringParameters?.tx_ref;

  if (!secretKey || !transactionId || !txRef || txRef.length > 180) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Missing or invalid transaction details."
      })
    };
  }

  try {

    const store = getStore("daily-citizen-donations");

    const pending = await store.get(txRef, {
      type: "json"
    });

    if (!pending || pending.tx_ref !== txRef) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Donation reference was not found."
        })
      };
    }

    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: "application/json"
        }
      }
    );

    const result = await response.json();
    const payment = result.data;

    const valid =
      response.ok &&
      result.status === "success" &&
      payment &&
      payment.status === "successful" &&
      payment.tx_ref === pending.tx_ref &&
      payment.currency === pending.currency &&
      Number(payment.amount) >= Number(pending.amount) &&
      Number(payment.charged_amount) >= Number(pending.amount);

    if (!valid) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          status: "not_verified",
          message: "We could not confirm this donation. If your account was debited, please contact Daily Citizen with your transaction reference."
        })
      };
    }

    await store.setJSON(txRef, {
      ...pending,
      status: "successful",
      flutterwave_transaction_id: String(transactionId),
      verified_at: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        status: "successful",
        amount: pending.amount,
        currency: pending.currency,
        donor_name: pending.donor_name
      })
    };

  } catch (error) {
    console.error("verify-donation error:", error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "We could not verify the payment right now. Please refresh this page shortly."
      })
    };
  }
};
