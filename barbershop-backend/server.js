// -_-_-_- Server.JS -_-_-_-

require('dotenv').config(); //importando o dotenv para variaveis de ambiente
const express = require('express'); //importando o express
const mongoose = require('mongoose'); //importando o mongoose
const cors = require('cors'); //importando o cors
const bcrypt = require('bcryptjs'); //importando o bcryptjs para criptografia de senhas
const jwt = require('jsonwebtoken'); //importando o jsonwebtoken para autenticação via tokens
const nodemailer = require('nodemailer'); //importando o nodemailer para envio de emails

// -_-_-_- Configurações Iniciais -_-_-_-

const app = express(); //iniciando o express
const PORT = 3000; //definindo a porta do servidor

// -_-_-_- MIDDLEWARE -_-_-_-

app.use(cors()); //habilitando o CORS
app.use(express.json()); //habilitando o JSON

// -_-_-_- MIDDLEWARE DE AUTENTICAÇÃO -_-_-_-

const verificarToken = (req, res, next) => { //Esta função vai "proteger" as nossas rotas de cliente
    const authHeader = req.headers['authorization']; // 1. O token virá no cabeçalho (header) da requisição
    const token = authHeader && authHeader.split (' ')[1]; // O formato é "Bearer TOKEN_LONGO_AQUI"
    // 2. Se não houver token, o acesso é negado
    if (token == null){
        return res.status(401).json({error: 'Acesso negado. Faça o login para continuar.'});
    }

    // 3. Verificamos se o token é valido
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // Caso o token for invalido ou estiver expirado
            return res.status(403).json({ error: 'Token inválido ou expirado. Faça o login novamente.'});
        }

        // 4. Token aprovado! Token passou na validação
        // Adicionamos os dados do usuário (exemplo - ID, Nome) ao 'req'
        //para fazer a rota de agendamento saber quem esta fazendo o agendamento
        req.user = user;
        next(); // prosseguir para a próxima função (rota)
    })
}

// -_-_-_- MIDDLEWARE DE AUTENTICAÇÃO ADMIN -_-_-_-
const verificarStaff = (req, res, next) => {
    // Importante: Este middleware DEVE ser usado DEPOIS do verificarToken
    const perfil = req.user.perfil;
    if (perfil !== 'admin' && perfil !== 'recepcionista') {
        return res.status(403).json({ error: 'Acesso restrito a administradores ou recepção.' });
    }
    next();
}

// -_-_-_- Conexão com o MongoDB -_-_-_-

const MONGO_URI = process.env.MONGO_URI; //pegando a URI do MongoDB do arquivo .env

mongoose.connect(MONGO_URI)
    .then(() => console.log("A conexão com o MongoDB foi concluida com sucesso! tenha um otimo dia :)")) // mensagem de conexão bem sucedida
    .catch(err => console.log("Infelizmente não conseguimos ter acesso ao MongoDB... \n", err)); // mensagem de erro na conexão

// -_-_-_- Configuração do GMAIL (Nodemailer) -_-_-_-

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// -_-_-_- Modelo de Dados (Agendamento) -_-_-_-

const AgendamentoSchema = new mongoose.Schema({
    cliente: { // referência ao cliente que fez o agendamento
        type: mongoose.Schema.Types.ObjectId, // tipo de dado ObjectId
        ref: 'User', // referenciando o modelo User
        required: false
    },
    clienteNomeWalkin: {
        type: String
    },
    valor: {
        type: Number,
        required: false // Obrigatorio apenas ao concluir
    },
    servico: {type: String, required: true}, // tipo de serviço agendado
    barbeiro:{ type: String, required:true}, 
    dataHora: {type: Date, required: true},  // data e hora do agendamento
    status: {  // status do agendamento
        type: String, // tipo de dado String
        required: true, // campo obrigatório

        enum: ['agendado', 'concluido', 'cancelado'], // tipos de status
        default: 'agendado'
    },

    pagamentoStatus: {
    type: String,
    required: true,
    enum: ['pendente', 'pago'],
    default: 'pendente'
    },

    feedbackEnviado: {
    type: Boolean,
    default: false
    }
}, {timestamps: true}); // cria automaticamente os campos createdAt e updatedAt
const Agendamento = mongoose.model('Agendamento', AgendamentoSchema);

// -_-_-_- Modelo de Dados (User) -_-_-_-

const UserSchema = new mongoose.Schema ({ //Requisitos do cadastro do usuario
    nome: {type: String, required: true}, // campo obrigatório do NOME
    telefone: {type:String, required: true}, // campo obrigatório do TELEFONE
    dataNascimento: {type: Date, required: true}, // campo obrigatório da DATA DE NASCIMENTO
    email: {type: String, required: true, unique: true}, // campo obrigatório do EMAIL
    senha: {type: String, required: true}, // campo obrigatório da SENHA
    perfil: {
        type: String,
        required: true,
        enum: ['cliente', 'barbeiro', 'recepcionista', 'admin'], // Cria a lista de cargos
        default: 'cliente' // unico que por padrão que precisa se cadastrar
    }
});

const User = mongoose.model('User', UserSchema);

// -_-_-_- Modelo de Dados (Feedback) -_-_-_-

const FeedbackSchema = new mongoose.Schema({
    barbeiroNome: {type: String, required: true, index: true}, // 'index: true' para podermos fazer uma busca mais rapida
    clienteNome: {type: String, required: true},
    comentario: {type: String, required: true},
    agendamentoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agendamento',
        required: true,
        unique: true // Garante que só tenha 1 feedback por agendamento
    }
}, {timestamps: true}); // Salva a data de criação
const Feedback = mongoose.model('Feedback', FeedbackSchema);

// -_-_-_- Rotas -_-_-_-

// --- ROTA DE CADASTRO DE USUÁRIO ---

app.post('/register', async (req, res) => {
    try {
        const {nome, telefone, dataNascimento, email, senha} = req.body; //Requisição dos itens do cadastro do usuario

        const salt = await bcrypt.genSalt(10); //Área da criptografia da senha para evitar fraudes, não que tenha
        const hashedPassword = await bcrypt.hash(senha, salt);

        const novoUsuario = new User({ //Criação do novo usuario
            nome,
            telefone,
            dataNascimento,
            email,
            senha: hashedPassword,
        });

        await novoUsuario.save(); //Salvar o novo usuario no banco de dados

        res.status(201).json({message: 'Você foi cadastrado com sucesso! Bem vindo a nossa barbearia :)'}); //Mensagem de sucesso no cadastro
    } catch (error) {
        console.error(error);
        //caso o email ja esteja cadastrado
        if (error.code === 11000){
            return res.status(400).json({error: 'Pelo o que nossos servidores mostram, esse email já está cadastrado...'}); //mensagem do erro do email já cadastrado
        }
        res.status(500).json({error: 'Infelizmente ocorreu um erro no servidor. Tente novamente mais tarde.'}); //mensagem de erro de conexão com o servidor
    }
});

// --- ROTA DE LOGIN DE USUÁRIO ---

app.post('/login', async (req, res) => {
    try {
        const {email, senha} = req.body; //Requisição dos itens do login do usuario
        const user = await User.findOne({email: email }); //Procurar o usuario no banco de dados pelo email

        if (!user) {
            return res.status(404).json({error:"Email ou senha invalidas. Tente novamente."}); //mensagem de erro do email não encontrado
        }

        const isMatch = await bcrypt.compare(senha, user.senha); // faz uma comparação da senha digitada com a senha do usuario armazanada no banco

        if (!isMatch) {
            return res.status(400).json({error:"Email ou senha invalidas. Tente novamente."}); //mensagem de erro da senha incorreta
        }

        const token = jwt.sign(
            {
                id: user._id,
                nome: user.nome,
                perfil: user.perfil
            },
            process.env.JWT_SECRET,
            {expiresIn: '8h'} // O "passe" é valido por 8 horas
        )

        res.status(200).json({
            message: "Esta tudo certo, seja bem vindo de volta :)",
            token: token,
            user: {
                nome: user.nome, // retornando o nome do usuario
                email: user.email, // retornando o email do usuario
                perfil: user.perfil  // retornando o perfil do usuario e sera enviado para o frontend
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Infelizmente ocorreu um erro no servidor. Tente novamente mais tarde.'}); //mensagem de erro de conexão com o servidor
    }
});

// --- ROTA DO ESQUECI MINHA SENHA ---
app.post('/forgot-password', async (req, res) => {
    const {email} = req.body;

    try {
        const user = await User.findOne({email});

        if (!user) {
            return res.status(200).json({message: 'Se o email existir em nossa base de dados, você receberá um email...'});
        }

        const token = jwt.sign(
            {id: user._id},
            process.env.JWT_SECRET,
            {expiresIn: '20m'} // token valido por 20 minutos
        );

        const resetLink = `http://127.0.0.1:5500/barbershop-frontend/BarberRESET.html?token=${token}`;

        await transporter.sendMail({
            from: 'BarberShop Admin <no-reply@barbershop.com>',
            to: email,
            subject: 'Recuperação de senha - BarberShop',
            html: `
            <p>Olá ${user.nome}!</p>
            <p>Recebemos um pedido de recuperação de senha. Se foi você, clique no link abaixo:</p>
            <a href="${resetLink}" target="_blank">Clique aqui para redefinir sua senha</a>
            <p>O link expira em 20 minutos.</p>
            <p>Se você não solicitou a recuperação de senha, por favor ignore este email.</p>
            <p>Atenciosamente,</p>
            <p>Equipe BarberShop</p>
            `
        });

        res.status(200).json({message: 'Se o email existir em nossa base, um link será enviado.'});

    } catch (error) {
        console.error('Erro no forgot-password:', error);
        res.status(500).json({error: 'Erro no servidor ao enviar email'});
    }
})

// --- ROTA DE REDEFINIÇÃO DE SENHA ---
app.post('/reset-password', async (req, res) => {
    const {token, novaSenha} = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(novaSenha, salt);

        await User.findByIdAndUpdate(decoded.id, {senha: hashedPassword});

        res.status(200).json({message: 'Senha atualizada com sucesso! seja bem vindo novamente :)'});

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(400).json({error: 'Link de recuperação invalido ou expirado. Por favor, solicite um novo link.'});
        }
        console.error('Erro no reset-password:', error);
        res.status(500).json({error: 'Erro no servidor ao redefinir a senha.'});
    }
})

// --- ROTA PARA CRIAR UM NOVO AGENDAMENTO ---
app.post('/agendar', verificarToken, async (req, res) => { 
    try {
        const {servico, barbeiro, dia, horario} = req.body; // 1. Recebemos os dados do formulario (do frontend)
        const clienteId = req.user.id; // 2. Pegamos o ID do cliente (que o middleware de autenticação adicionou ao req)
        // 3. Combinamos o dia e a hora
        const dataHoraAgendamento = new Date(dia + 'T' + horario);

        //4. Criamos o novo agendamento no banco de dados
        const novoAgendamento = new Agendamento({
            cliente: clienteId,
            servico,
            barbeiro,
            dataHora: dataHoraAgendamento
        });

        await novoAgendamento.save();

        res.status(201).json({message: 'Seu agendamento foi criado com sucesso! Nos vemos em breve :)'}); //mensagem de sucesso no agendamento

    } catch (error) {
        console.error('Erro ao agendar:', error);
        res.status(500).json({error: 'Infelizmente ocorreu um erro no servidor. Tente novamente mais tarde.'}); //mensagem de erro de conexão com o servidor
    }
});

// --- ROTA PARA APAGAR/CANCELAR UM AGENDAMENTO ---

// :id é um parâmetro que virá na URL (Exemplo: /agendamentos/12345abc)
app.delete('/agendamentos/:id', verificarToken, async (req, res) => {
    try {
        // 1. Pegamos o ID do cliente que vem do passe
        const clienteId = req.user.id;

        // 2. Pegamos o ID do agendamento que vem da URL
        const agendamentoId = req.params.id;

        // 3. Procuramos o agendamento no banco de dados
        const agendamento = await Agendamento.findById(agendamentoId);

        // 4. Verificamos se o agendamento existente
        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado'});
        }

        // 5. Verificação de Segurança CRITICA: O cliente logado não é o dono do agendamento
        if (agendamento.cliente.toString() !== clienteId) {
            return res.status(403).json({ error: 'Você não tem permissão para cancelar este agendamento.'});
        }

        // 6. Tudo certo! O usuário é o dono
        await Agendamento.findByIdAndDelete(agendamentoId);
        res.status(200).json({message: 'Agendamento cancelado com sucesso!'});

    } catch (error) {
        console.error('Erro ao cancelar agendamento: ', error);
        res.status(500).json({error: 'Erro no servidor ao cancelar o agendamentos.'});
    }
});

// --- ROTA PARA ATUALIZAR/REMARCAR UM AGENDAMENTO ---

app.put('/agendamentos/:id', verificarToken, async (req, res) => {
    try {
        const clienteId = req.user.id;
        const agendamentoId = req.params.id;
        
        // Receve os novos dados do formulario "Remarcar"
        const {dia, horario} = req.body;

        // Procura o agendamento
        const agendamento = await Agendamento.findById(agendamentoId);

        if (!agendamento) {
            return res.status(404).json({error: 'Agendamento não encontrado.'});
        }

        // Segurança: Verifica se o cliente é o dono do agendamento
        if (agendamento.cliente.toString() !== clienteId) {
            return res.status(403).json({ error: 'Você não tem permissão para alterar esse agendamento.'});
        }

        // Atualiza o agendamento com a nova data/hora
        const novaDataHora = new Date(dia + 'T' + horario);
        agendamento.dataHora = novaDataHora;
        agendamento.status = 'agendado'; // Garante que o status volte a ser 'agendado'

        await agendamento.save(); // Salva as alterações

        res.status(200).json({message: 'Agendamento remarcado com sucesso! Nos vemos em breve :)'});

    } catch (error) {
        console.error('Erro ao remarcar agendamento: ', error);
        res.status(500).json({error: 'Erro no servidor ao remarcar agendamento.'});
    }
})

// --- ROTA BUSCAR AGENDAMENTOS  ---
app.get('/meus-agendamentos', verificarToken, async (req, res) => {
    try {
        //1. O ID do cliente vem do passe VIP
        const clientId = req.user.id;

        //2. Procurar no MongoDB todos os agendamentos que pertencem ao cliente e ordenalos
        const agendamentos = await Agendamento.find({cliente: clientId}).sort({dataHora: 1}); // 1 = ordem crescente

        //3. Enviamos a lista de agendamentos de volta para o frontend
        res.status(200).json(agendamentos);

    } catch (error) {
        console.error('Erro ao buscar agendamentos: ',error);
        res.status(500).json({error: 'Erro no servidor ao buscar agendamentos.'})
    }
});

// --- ROTA BUSCAR NOTIFICAÇÃO ---

app.get('/minhas-notificacoes', verificarToken, async (req, res) => {
    try {
        // --- Buscar dados do usuário ---
        // Vamos precisar dos dados do usuário como a data de nascimento
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({error: 'Usuário não encontrado.'});
        }

        // --- Lógica das notificações ---
        const notificacoes = [];
        const hoje = new Date();
        const aniversario = new Date(user.dataNascimento);

        // 1. Verificar aniversario
        // Compara o Mês e o dia 
        if (aniversario.getUTCMonth() === hoje.getUTCMonth() && aniversario.getUTCDate() === hoje.getUTCDate()) {
            notificacoes.push({
                tipo: 'info', // Para a cor azul
                mensagem: `<strong>Feliz Aniversário, ${user.nome}!</strong> Você ganhou <strong>10% de desconto</strong> no seu próximo corte como presente!`
            });
        }

        res.status(200).json(notificacoes);

    } catch (error) {
        console.error('Erro ao buscar dados do dashboard: ', error);
        res.status(500).json({error: 'Erro no servidor ao buscar dados.'})
    }
});


// --- Rota CLIENTE DEIXAR FEEDBACK ---

app.post('/deixar-feedback', verificarToken, async (req, res) => {
    try {
        const {agendamentoId, barbeiroNome, comentario} = req.body;
        const clienteNome = req.user.nome; // Pega o nome do cliente logado pelo token

        if (!agendamentoId || !barbeiroNome || !comentario) {
            return res.status(400).json({error: 'Dados incompletospara o feedback.'});
        }

        // --- VERIFICAÇÃO DE SEGURANÇA ATUALIZADA ---
        // 1. Busca o agendamento
        const agendamento = await Agendamento.findById(agendamentoId);

        // 2. Verifica se o agendamento pertence ao cliente
        if (!agendamento || agendamento.cliente.toString() !== req.user.id) {
            return res.status(403).json({error: 'Você não pode deixar feedback para esse agendamento.'});
        }

        // 3. (NOVA VERIFICAÇÃO) Verifica se o feedback já foi enviado
        if (agendamento.feedbackEnviado === true) {
            return res.status(400).json({error: 'Você já enviou um feedback para este agendamento.'});
        }
        // --- FIM DA VERIFICAÇÃO ---

        const novoFeedback = new Feedback({
            agendamentoId,
            barbeiroNome,
            comentario,
            clienteNome
        });

        await novoFeedback.save(); // Salva o feedback

        // Atualiza o agendamento original para marcar como enviado
        await Agendamento.findByIdAndUpdate(agendamentoId, { feedbackEnviado: true });

        res.status(201).json({message: 'Feedback enviado com sucesso! Obrigado!'})

    } catch (error) {
        // O catch agora é uma segunda camada de proteção caso o unique: true falhe
        if(error.code === 11000) {
            return res.status(400).json({error: 'Você já deixou um feedback para esse agendamento (erro DB).'});
        }
        console.error('Erro ao salvar feedback: ', error);
        res.status(500).json({error: 'Erro no servidor ao salvar feedback.'});
    }
})

// --- ROTA BUSCAR FEEDBACK DO BARBEIRO ---

app.get('/meus-feedbacks', verificarToken, async (req, res) => {
    try {
        const nomeBarbeiro = req.user.nome; // 1. buscamos o nome do barbeiro
        const feedbacks = await Feedback.find({barbeiroNome: nomeBarbeiro})
            .sort({createdAt: -1}) // Mais recentes primeiro
            .limit(10) // Limita aos 10 mais recentes
            .populate('agendamentoId', 'valor'); // Busca o agendamento associado e seleciona apenas o campo 'valor'

        res.status(200).json(feedbacks);
    } catch (error) {
        console.error('Erro ao buscar feedbacks: ', error);
        res.status(500).json({error: 'Erro no servidor ao buscar feedbacks'});
    }
});

// --- ROTA BUSCAR AGENDA DO BARBEIRO ---

app.get('/minha-agenda', verificarToken, async (req, res) => {
    try {
        const nomeBarbeiro = req.user.nome; // 1. buscamos o nome do barbeiro
        
        // 2. Define o "Início" de hoje (para não mostrar agendamentos passados)
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // horario definido para meia noite de hoje

        // 3. Procura no MongoDB agendamentos para o barbeiro logado
        // que sejam de hoje em diante, e que estejam 'agendados'
        const agenda = await Agendamento.find({
            barbeiro: nomeBarbeiro,
            dataHora: {$gte: hoje}, // $ gte significa maior ou igual 
            status: 'agendado' 
        })
        .sort({dataHora: 1}) // Coloca os cortes agendados em ordem, do mais cedo para o mais tarde
        .populate('cliente', 'nome'); // Estamos buscando o nome do cliente

        // 4. Mandamos a agenda para o barbeiro
        res.status(200).json(agenda);

    } catch (error) {
        console.error('Erro ao buscar agenda do barbeiro:', error);
        res.status(500).json({error: 'Erro no servidor ao buscar agenda.' })
    }
});

// --- ROTA BUSCAR LISTA DE BARBEIROS ---

app.get('/barbeiros', verificarToken, async (req, res) => {
    try {
        // 1. Procura no MongoDB todos os usuários com o perfil "barbeiro"
        const barbeiros = await User.find({perfil: 'barbeiro'}).select('nome');

        // 2. Retorna a lista de barbeiros
        // (ex: [{nome: 'Maycon'}, {nome: 'Erick'}, {nome: 'Matheus'}])
        res.status(200).json(barbeiros);

    } catch (error) {
        console.error('Erro ao buscar lista de barbeiros: ', error);
        res.status(500).json({error: 'Erro no servidor ao buscar barbeiros.'});
    }
})

// --- ROTA PARA O BARBEIRO CONCLUIR UM ATENDIMENTO ---

app.put('/agendamentos/concluir/:id', verificarToken, async (req, res) => {
    try {
        const agendamentoId = req.params.id;
        const nomeBarbeiro = req.user.nome;
        const {valor} = req.body

        // Valiação do valor
        if (valor === undefined || valor === null || isNaN(valor) || valor < 0) {
            return res.status(400).json({error: 'Valor inválido.'});
        }

        // 1. Procurar o agendamento
        const agendamento = await Agendamento.findById(agendamentoId);

        if (!agendamento) {
            return res.status(404).json({error: 'Agendamento não encontrado.'});
        }

        // 2. Segurança: Verifica se o barbeiro logado é o dono desse agendamento
        if (agendamento.barbeiro !== nomeBarbeiro) {
            return res.status(403).json({error: 'Você não tem permissão para concluir esse atendimento.'});
        }

        // 3. Segurança: Verifica se já está concluido
        if (agendamento.status === 'concluido') {
            return res.status(400).json({error: 'Este atendimento já foi concluído.'})
        }

        // 4. Atualiza o status e salva
        agendamento.status = 'concluido';
        agendamento.valor = valor;
        agendamento.dataHora = new Date();
        await agendamento.save();

        res.status(200).json({message: 'Atendimento concluído com sucesso!.'});

    } catch (error) {
        console.error('Erro ao concluir agendamento: ',error);
        res.status(500).json({error: 'Erro no servidor ao concluir o atendimento.'});
        }
    })

// --- ROTA PARA O BARBEIRO ADICIONAR UM WALK-IN (PESSOA DA RUA) ---

app.post('/agendar/walkin', verificarToken, async(req, res) => {
    try{
        const {clienteNome, servico, valor} = req.body;
        const nomeBarbeiro = req.user.nome;
        if (!clienteNome || !servico || valor === undefined) {
            return res.status(400).json({error: 'Nome do cliente e serviço são obrigatorios'});
        }
        if (isNaN(valor) || valor < 0) {
            return res.status(400).json({error: 'Valor inválido.'});
        }
        const novoAgendamento = new Agendamento({
            barbeiro: nomeBarbeiro,
            clienteNomeWalkin: clienteNome, //Salva o nome do walk-in
            servico: servico,
            valor: valor,
            dataHora: new Date(),
            status: 'concluido'
        });
        await novoAgendamento.save();
        res.status(201).json({message: 'Atendimento walk-in registrado com sucesso!'});
    } catch (error) {
        console.error('Erro ao registrar walk-in: ', error);
        res.status(500).json({error: 'Erro no servidor ao registrar walk-in.'});
    }
});

// --- ROTA BUSCAR ESTATÍSTTICA DO BARBEIRO (CONTADOR) ---

app.get('/minha-agenda/estatisticas', verificarToken, async (req, res) => {
    try {
        const nomeBarbeiro = req.user.nome;

        // 1. Define o início e o fim do dia de HOJE
        const hojeInicio = new Date();
        hojeInicio.setHours(0, 0, 0, 0); // meia noite de hoje

        const hojeFim = new Date();
        hojeFim.setHours(23, 59, 59, 999);

        // 2. Conta os agendamentos concluidos Hoje por este barbeiro
        const totalConcluidos = await Agendamento.countDocuments({
            barbeiro: nomeBarbeiro,
            status: 'concluido',
            dataHora: {$gte: hojeInicio, $lte: hojeFim} // Filtra por data/hora
        });

        res.status(200).json({totalConcluidos: totalConcluidos});

    } catch (error) {
        console.error('Erro ao buscar estatísticas: ', error);
        res.status(500).json({error: 'Erro no servidor ao buscar estatísticas.'});
    }
});

// --- ROTA BUSCAR TODOS FEEDBACKS (ADMIN) ---
app.get('/feedbacks-todos', verificarToken, verificarStaff, async (req, res) => {
    try {

        const { barbeiro } = req.query; // buscar barbeiro nno filtro

        // --- 1. Cria o filtro do barbeiro ---
        const filtro = {};
        if (barbeiro) {
            filtro.barbeiroNome = barbeiro;
        };

        const feedbacks = await Feedback.find(filtro)
            .sort({ createdAt: -1 }) // Mais recentes primeiro
            .limit(5); // Limita aos 5 mais recentes para o dashboard

        res.status(200).json(feedbacks);
    } catch (error) {
        console.error('Erro ao buscar todos feedbacks:', error);
        res.status(500).json({ error: 'Erro no servidor ao buscar feedbacks.' });
    }
});

// --- ROTA PRINCIPAL DO DASHBOARD ADMIN (COM FILTRO DE DATA) ---
app.get('/dashboard-admin', verificarToken, verificarStaff, async (req, res) => {
    try {
        const { dataInicio, dataFim, barbeiro } = req.query;

        // --- 1. Cria o filtro de data ---
        const filtro = { status: 'concluido' };

        // Adicionamos o barbeiro ao filtro principal
        if (barbeiro) {
            filtro.barbeiro = barbeiro;
        }

        if (dataInicio && dataFim) {
            // Adiciona +1 dia ao dataFim para incluir o dia inteiro
            const fim = new Date(dataFim);
            fim.setDate(fim.getDate() + 1);

            filtro.dataHora = {
                $gte: new Date(dataInicio),
                $lt: fim
            };
        }

        // --- 2. Cálculos de Faturamento e Atendimentos Totais ---
        const stats = await Agendamento.aggregate([
            { $match: filtro },
            {
                $group: {
                    _id: null,
                    faturamentoTotal: { $sum: "$valor" },
                    totalAtendimentos: { $sum: 1 }
                }
            }
        ]);

        // --- 3. Cálculo de Performance dos Barbeiros ---
        const performance = await Agendamento.aggregate([
            { $match: filtro },
            {
                $group: {
                    _id: "$barbeiro", // Agrupa pelo nome do barbeiro
                    faturamento: { $sum: "$valor" },
                    atendimentos: { $sum: 1 }
                }
            },
            { $sort: { faturamento: -1 } } // Ordena por quem faturou mais
        ]);

        res.status(200).json({
            stats: stats[0] || { faturamentoTotal: 0, totalAtendimentos: 0 },
            performanceBarbeiros: performance
        });

    } catch (error) {
        console.error('Erro ao buscar dados do dashboard admin:', error);
        res.status(500).json({ error: 'Erro no servidor ao buscar dados.' });
    }
});

// --- ROTAS DA RECEPÇÃO ---

// Rota para ver a agenda de HOJE (todos os barbeiros)
app.get('/agenda-do-dia', verificarToken, verificarStaff, async (req, res) => {
    try {
        const hojeInicio = new Date();
        hojeInicio.setHours(0, 0, 0, 0);
        const hojeFim = new Date();
        hojeFim.setHours(23, 59, 59, 999);

        const agenda = await Agendamento.find({
            status: 'agendado',
            dataHora: { $gte: hojeInicio, $lte: hojeFim }
        })
        .sort({ dataHora: 1 })
        .populate('cliente', 'nome');

        res.status(200).json(agenda);
    } catch (error) {
        console.error('Erro ao buscar agenda do dia:', error);
        res.status(500).json({ error: 'Erro no servidor.' });
    }
});

// Rota para ver pagamentos pendentes
app.get('/pagamentos-pendentes', verificarToken, verificarStaff, async (req, res) => {
    try {
        const pagamentos = await Agendamento.find({
            status: 'concluido',
            pagamentoStatus: 'pendente'
        })
        .sort({ updatedAt: 1 }) // Mais antigos concluídos primeiro
        .populate('cliente', 'nome');

        res.status(200).json(pagamentos);
    } catch (error) {
        console.error('Erro ao buscar pagamentos pendentes:', error);
        res.status(500).json({ error: 'Erro no servidor.' });
    }
});

// Rota para processar um pagamento 
app.put('/pagamentos/processar/:id', verificarToken, verificarStaff, async (req, res) => {
    try {
        const agendamentoId = req.params.id;

        const agendamento = await Agendamento.findById(agendamentoId);
        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }

        if (agendamento.pagamentoStatus === 'pago') {
            return res.status(400).json({ error: 'Este pagamento já foi processado.' });
        }

        agendamento.pagamentoStatus = 'pago';
        await agendamento.save();

        res.status(200).json({ message: 'Pagamento processado com sucesso!' });

    } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        res.status(500).json({ error: 'Erro no servidor.' });
    }
});

//add mais rotas acima desta linha

// -_-_-_- Iniciar o Servidor -_-_-_-
app.listen(PORT, () => {
    console.log(`Seu servidor Backend está rodando em http://localhost:${PORT} \n Tenha um ótimo dia :)`);
});