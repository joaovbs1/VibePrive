const express = require('express');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { Resend } = require('resend');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const payment = new Payment(client);
const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/processar-pagamento', async (req, res) => {
  try {
    const { token, transaction_amount, installments, payment_method_id, nomeCliente, emailCliente, tipoIngresso } = req.body;

    const result = await payment.create({
      body: {
        transaction_amount: Number(transaction_amount),
        token: token,
        description: `Vibe Privê - ${tipoIngresso}`,
        installments: Number(installments) || 1,
        payment_method_id: payment_method_id,
        payer: {
          email: emailCliente,
          first_name: nomeCliente
        },
        metadata: {
          nome_cliente: nomeCliente,
          email_cliente: emailCliente,
          tipo_ingresso: tipoIngresso
        },
        notification_url: 'https://SEU-SITE.onrender.com/webhook'
      }
    });

    res.json({
      id: result.id,
      status: result.status,
      qr_code: result.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao processar pagamento' });
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const info = await payment.get({ id: data.id });

      if (info.status === 'approved') {
        const nome = info.metadata?.nome_cliente || 'Convidado';
        const email = info.metadata?.email_cliente || info.payer.email;
        const tipo = info.metadata?.tipo_ingresso || 'Ingresso Vibe Privê';
        const codigoUnico = `VIBE-${info.id}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${codigoUnico}`;

        await resend.emails.send({
          from: 'Vibe Privê <onboarding@resend.dev>',
          to: email,
          subject: `👑 Seu Ingresso: ${tipo} - Vibe Privê`,
          html: `
            <div style="font-family: Arial, sans-serif; text-align: center; background: #111; color: #fff; padding: 30px; border-radius: 10px;">
              <h1 style="color: #d4af37;">👑 VIBE Privê</h1>
              <p>Olá, <strong>${nome}</strong>! Seu pagamento foi confirmado.</p>
              <p style="font-size: 18px; color: #d4af37;"><strong>${tipo}</strong></p>
              <div style="background: #fff; padding: 15px; display: inline-block; border-radius: 8px; margin: 20px 0;">
                <img src="${qrCodeUrl}" alt="QR Code do Ingresso" />
              </div>
              <p style="font-size: 14px; color: #aaa;">Código: ${codigoUnico}</p>
              <p>Apresente este QR Code na portaria do evento.</p>
            </div>
          `
        });
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Servidor Vibe Privê online!'));
