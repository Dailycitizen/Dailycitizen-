const { randomUUID } = require("node:crypto");
const { getStore } = require("@netlify/blobs");

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        ...headers,
        Allow: "POST"
      },
      body: JSON.stringify({
        success: false,
        message: "Method not allowed."
      })
    };
  }

  const secretKey = process.env.FLW_SECRET_KEY;

  if (!secretKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Donation checkout is not configured yet."
      })
    };
  }

  try {
    const input = JSON.parse(event.body || "{}");

    const name = String(input.name || "").trim().slice(0, 100);
    const email = String(input.email || "").trim().toLowerCase().slice(0, 160);
    const amount = Number(input.amount);

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Enter your name and a valid email address."
        })
      };
    }

    if (
      !Number.isFinite(amount) ||
      amount < 100 ||
      amount > 10000000 ||
      !Number.isInteger(amount)
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Donation amount must be a whole number between ₦100 and ₦10,000,000."
        })
      };
    }

    const siteUrl = (
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      ""
    ).replace(/\/+$/, "");

    if (!siteUrl || !siteUrl.startsWith("https://")) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: "The public HTTPS site URL is not configured."
        })
      };
    }

    const txRef = `DC-${Date.now()}-${randomUUID()}`;

    const store = getStore("daily-citizen-donations");

    await store.setJSON(txRef, {
      tx_ref: txRef,
      amount,
      currency: "NGN",
      donor_name: name,
      donor_email: email,
      status: "pending",
      created_at: new Date().toISOString()
    });

    const flwResponse = await fetch(
      "https://api.flutterwave.com/v3/payments",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          tx_ref: txRef,
          amount,
          currency: "NGN",

          redirect_url: `${siteUrl}/donation-success.html`,

          customer: {
            name,
            email
          },

          customizations: {
            title: "Daily Citizen",
            description: "Support legal awareness and civic education",
            logo: `${siteUrl}/assets/logo.png`
          },

          meta: {
            platform: "Daily Citizen",
            purpose: "Donation"
          }
        })
      }
    );

    const data = await flwResponse.json();

    if (
      !flwResponse.ok ||
      data.status !== "success" ||
      !data.data?.link
    ) {
      await store.setJSON(txRef, {
        tx_ref: txRef,
        amount,
        currency: "NGN",
        donor_name: name,
        donor_email: email,
        status: "checkout_error",
        created_at: new Date().toISOString()
      });

      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Flutterwave could not create checkout. Please try again."
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        link: data.data.link,
        tx_ref: txRef
      })
    };

  } catch (error) {
    console.error("create-donation error:", error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: "Unable to start donation checkout right now."
      })
    };
  }
};
