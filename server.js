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
    const { transaction_amount, nomeCliente, cpfCliente, emailCliente, tipoIngresso } = req.body;

    const result = await payment.create({
      body: {
        transaction_amount: Number(transaction_amount),
        description: `Vibe Privê - ${tipoIngresso}`,
        payment_method_id: 'pix',
        payer: {
          email: emailCliente,
          first_name: nomeCliente,
          identification: {
            type: 'CPF',
            number: cpfCliente
          }
        },
        metadata: {
          nome_cliente: nomeCliente,
          email_cliente: emailCliente,
          tipo_ingresso: tipoIngresso
        },
        notification_url: 'https://onrender.com'
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
    res.status(500).json({ error: 'Erro ao gerar Pix' });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Servidor Vibe Privê online!'));
