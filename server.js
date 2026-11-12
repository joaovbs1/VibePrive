const express = require('express');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const client = new MercadoPagoConfig({ accessToken: 'APP_USR-4c0b6cc1-602c-461b-9af1-2cb4ed0975fa' });
const payment = new Payment(client);

// Senha para você acessar a lista na portaria (pode alterar se quiser)
const SENHA_PORTARIA = process.env.SENHA_PORTARIA || 'vibe2026';

// 1. Gera o Pix no Mercado Pago salvando Nome, CPF, E-mail e Tipo de Ingresso
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
          cpf_cliente: cpfCliente,
          email_cliente: emailCliente,
          tipo_ingresso: tipoIngresso
        }
      }
    });

    res.json({
      id: result.id,
      status: result.status,
      qr_code: result.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64
    });
    } catch (error) {
    console.error('Erro MP:', JSON.stringify(error, null, 2));
    const detalhe = error?.cause?.[0]?.description || error?.message || 'Erro desconhecido';
    res.status(500).json({ error: detalhe });
  }
  
});

// 2. Rota protegida que lista todos os ingressos PAGOS para a portaria
app.get('/api/compradores', async (req, res) => {
  const senha = req.headers['x-senha'];
  if (senha !== SENHA_PORTARIA) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  try {
    const searchResult = await payment.search({
      options: {
        status: 'approved',
        limit: 100,
        sort: 'date_created',
        criteria: 'desc'
      }
    });

    const lista = (searchResult.results || []).map(item => ({
      id: item.id,
      nome: item.metadata?.nome_cliente || item.payer?.first_name || 'Não informado',
      cpf: item.metadata?.cpf_cliente || item.payer?.identification?.number || 'Não informado',
      email: item.metadata?.email_cliente || item.payer?.email || 'Não informado',
      ingresso: item.metadata?.tipo_ingresso || item.description || 'Ingresso',
      valor: item.transaction_amount,
      data: new Date(item.date_approved || item.date_created).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    }));

    res.json(lista);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar lista de compradores' });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Servidor Vibe Privê online!'));
