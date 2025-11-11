1. 📜 Visão Geral do Projeto
1.1. Objetivo
O objetivo principal deste projeto é criar um portal web completo que substitua o gerenciamento manual (como cadernos ou planilhas) por um sistema digital integrado. Ele visa facilitar o agendamento para clientes, organizar a agenda dos barbeiros e fornecer ferramentas de gestão e análise para a recepção e administração da barbearia.
1.2. Escopo
O sistema cobre quatro principais fluxos de usuário (atores), cada um com seu próprio painel e permissões:
Cliente: Pode se cadastrar, logar, agendar, remarcar, cancelar horários e deixar feedback.
Barbeiro: Pode ver sua agenda, gerenciar seus atendimentos (concluir, adicionar "walk-in") e ver seus feedbacks.
Recepcionista: Pode ver a agenda completa do dia, gerenciar pagamentos pendentes e ver todos os feedbacks.
Administrador (Dono): Pode fazer tudo que a recepcionista faz, além de acessar um dashboard financeiro com análises de faturamento e performance.
1.3. Arquitetura do Sistema
O projeto segue uma arquitetura Cliente-Servidor clássica:
barbershop-backend (Servidor): Um servidor Node.js rodando Express. Ele atua como o cérebro da aplicação, gerenciando uma API RESTful para se comunicar com o banco de dados e o frontend. É responsável pela lógica de negócios, autenticação e segurança.
barbershop-frontend (Cliente): Uma aplicação web estática ("Vanilla JS") composta por arquivos HTML, CSS e JavaScript. Cada perfil de usuário (Cliente, Barbeiro, etc.) possui seu próprio arquivo HTML que consome a API do backend.
Banco de Dados (DB): Um banco de dados MongoDB, com o qual o backend interage através do ODM (Object Data Modeling) Mongoose.
Autenticação: A comunicação segura é garantida por Tokens JWT (JSON Web Tokens). Após o login, o frontend armazena esse token no localStorage e o envia no cabeçalho Authorization de cada requisição subsequente.
1.4. Tecnologias Utilizadas (Stack)
Área
Tecnologia
Propósito
Backend
Node.js
Ambiente de execução do servidor.


Express.js
Framework para criação da API RESTful.


Mongoose
ODM para modelagem e comunicação com o MongoDB.


dotenv
Gerenciamento de variáveis de ambiente (chaves secretas, URI do banco).


bcryptjs
Criptografia (hashing) de senhas antes de salvar no banco.


jsonwebtoken (JWT)
Geração e verificação de tokens de autenticação.


nodemailer
Envio de e-mails (ex: recuperação de senha).


cors
Habilitação do Cross-Origin Resource Sharing para o frontend.
Frontend
HTML5
Estrutura das páginas.


CSS3 (Inline)
Estilização visual (dentro das tags <style>).


JavaScript (Vanilla)
Lógica do cliente, manipulação do DOM e requisições (fetch API).
Armazenamento
localStorage
Armazenamento do token JWT e dados do usuário no navegador.
Banco de Dados
MongoDB
Banco de dados NoSQL para persistência dos dados.


2. ⚙️ Requisitos Funcionais (RF)
Esta seção detalha o que o sistema faz, dividido por ator.
2.1. Usuário Não Autenticado (Público)
RF001: O usuário deve poder se cadastrar com nome, telefone, data de nascimento, e-mail e senha.
RF002: O sistema não deve permitir o cadastro de dois usuários com o mesmo e-mail.
RF003: O usuário deve poder fazer login usando e-mail e senha.
RF004: O sistema deve redirecionar o usuário para o painel correto com base em seu perfil (cliente, barbeiro, etc.) após o login.
RF005: O usuário deve poder solicitar um link de recuperação de senha (/forgot-password).
RF006: O usuário deve poder redefinir sua senha clicando no link enviado por e-mail (/reset-password).
2.2. Cliente (Autenticado)
RF007: O cliente deve poder visualizar seu painel (BarberCLIENTE.html).
RF008: O cliente deve poder ver seu próximo agendamento em destaque.
RF009: O cliente deve poder ver seu histórico de agendamentos (passados).
RF010: O cliente deve poder criar um novo agendamento, escolhendo serviço, barbeiro, dia e hora (/agendar).
RF011: O cliente deve poder cancelar um agendamento futuro (DELETE /agendamentos/:id).
RF012: O cliente deve poder remarcar um agendamento futuro (PUT /agendamentos/:id).
RF013: O cliente deve poder deixar um feedback (comentário) para um agendamento concluído (/deixar-feedback).
RF014: O sistema deve impedir que o cliente deixe mais de um feedback por agendamento.
RF015: O cliente deve poder ver notificações (ex: desconto de aniversário) (/minhas-notificacoes).
2.3. Barbeiro (Autenticado)
RF016: O barbeiro deve poder visualizar seu painel (BarberBARBEIRO.html).
RF017: O barbeiro deve poder ver sua agenda pessoal do dia, ordenada por hora (/minha-agenda).
RF018: O barbeiro deve poder marcar um agendamento como "concluído", informando o valor final (PUT /agendamentos/concluir/:id).
RF019: O barbeiro deve poder registrar um atendimento "walk-in" (cliente sem agendamento), informando nome, serviço e valor (/agendar/walkin).
RF020: O barbeiro deve poder ver um contador de quantos atendimentos concluiu hoje (/minha-agenda/estatisticas).
RF021: O barbeiro deve poder ver os últimos feedbacks recebidos para ele (/meus-feedbacks).
2.4. Recepcionista (Autenticado)
RF022: A recepcionista deve poder visualizar seu painel (BarberRECEPCIONISTA.html).
RF023: A recepcionista deve poder ver a agenda de todos os barbeiros para o dia atual (/agenda-do-dia).
RF024: A recepcionista deve poder ver uma lista de todos os pagamentos pendentes (atendimentos concluídos mas não pagos) (/pagamentos-pendentes).
RF025: A recepcionista deve poder "processar" um pagamento, mudando seu status para "pago" (PUT /pagamentos/processar/:id).
RF026: A recepcionista deve poder ver os feedbacks recentes de todos os barbeiros (/feedbacks-todos).
2.5. Administrador/Dono (Autenticado)
RF027: O administrador herda todas as permissões da Recepcionista (RF022 a RF026).
RF028: O administrador deve poder visualizar um painel de analytics (BarberDONO.html).
RF029: O administrador deve poder filtrar os dados do dashboard por período (data de início e fim) e/ou por barbeiro específico.
RF030: O administrador deve poder ver o Faturamento Total no período filtrado.
RF031: O administrador deve poder ver o Total de Atendimentos no período filtrado.
RF032: O administrador deve poder ver uma tabela de Performance dos Barbeiros, classificada por faturamento.

3. 🔒 Requisitos Não Funcionais (RNF)
Esta seção detalha como o sistema deve operar.
RNF001 (Segurança): Todas as senhas de usuário devem ser armazenadas no banco de dados usando hashing (via bcryptjs).
RNF002 (Segurança): O acesso às rotas de dados (ex: /meus-agendamentos) deve ser protegido e exigir um Token JWT válido (verificarToken).
RNF003 (Segurança): O acesso às rotas de gestão (ex: /dashboard-admin) deve ser restrito a perfis 'admin' ou 'recepcionista' (verificarStaff).
RNF004 (Segurança): Um cliente só pode cancelar ou remarcar agendamentos que pertençam ao seu próprio ID.
RNF005 (Segurança): O token de recuperação de senha deve ter um tempo de expiração curto (definido como '20m').
RNF006 (Segurança): Dados sensíveis (URI do MongoDB, segredo JWT, credenciais de e-mail) devem ser carregados de um arquivo .env e nunca expostos no código.
RNF007 (Performance): A busca por feedbacks de um barbeiro específico deve ser otimizada (uso de index: true no FeedbackSchema.barbeiroNome).
RNF008 (Integridade): O sistema deve garantir que só exista um feedback por agendamento (uso de unique: true no FeedbackSchema.agendamentoId).
RNF009 (Usabilidade): O sistema deve fornecer feedback claro e imediato ao usuário (via alert()) após ações de sucesso ou erro.

4. 🗃️ Estrutura do Banco de Dados (Models)
O backend define três modelos principais no Mongoose:
4.1. UserSchema
Armazena informações de login e perfil de todos os usuários (clientes e funcionários).
JavaScript
const UserSchema = new mongoose.Schema ({
    nome: {type: String, required: true},
    telefone: {type:String, required: true},
    dataNascimento: {type: Date, required: true},
    email: {type: String, required: true, unique: true},
    senha: {type: String, required: true},
    perfil: {
        type: String,
        required: true,
        enum: ['cliente', 'barbeiro', 'recepcionista', 'admin'],
        default: 'cliente'
    }
});

4.2. AgendamentoSchema
O modelo central da aplicação, rastreia todo o ciclo de vida de um atendimento.
JavaScript
const AgendamentoSchema = new mongoose.Schema({
    cliente: { // ID do usuário (se cadastrado)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Falso para permitir walk-ins
    },
    clienteNomeWalkin: { // Nome (se for walk-in)
        type: String
    },
    valor: {
        type: Number,
        required: false // Só é obrigatório ao concluir
    },
    servico: {type: String, required: true},
    barbeiro:{ type: String, required:true}, 
    dataHora: {type: Date, required: true},
    status: {
        type: String,
        required: true,
        enum: ['agendado', 'concluido', 'cancelado'],
        default: 'agendado'
    },
    pagamentoStatus: {
        type: String,
        required: true,
        enum: ['pendente', 'pago'],
        default: 'pendente'
    },
    feedbackEnviado: { // Controla se o cliente já deu feedback
        type: Boolean,
        default: false
    }
}, {timestamps: true});

4.3. FeedbackSchema
Armazena os comentários dos clientes, vinculados a um agendamento.
JavaScript
const FeedbackSchema = new mongoose.Schema({
    barbeiroNome: {type: String, required: true, index: true}, // Indexado para performance
    clienteNome: {type: String, required: true},
    comentario: {type: String, required: true},
    agendamentoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agendamento',
        required: true,
        unique: true // Garante 1 feedback por agendamento
    }
}, {timestamps: true});


5. 🔬 Análise Detalhada dos Arquivos
5.1. barbershop-backend/server.js
Este é o coração da aplicação.
Middlewares de Autenticação
verificarToken: Esta é a "porta de entrada" para rotas protegidas.
Ele busca o token no cabeçalho Authorization: Bearer <token>.
Se não houver token, retorna 401 (Não Autorizado).
Verifica se o token é válido (não expirou e tem a assinatura correta) usando jwt.verify.
Se inválido, retorna 403 (Proibido).
Se válido, ele extrai os dados do usuário (id, nome, perfil) do token e os anexa ao objeto req (ex: req.user = user).
Chama next() para permitir que a requisição continue para a rota final.
verificarStaff: Este middleware é uma camada adicional de segurança, usado após verificarToken.
Ele lê o perfil do usuário de req.user.perfil.
Se o perfil não for 'admin' ou 'recepcionista', ele retorna 403 (Proibido).
É usado para proteger painéis de gerenciamento (ex: /dashboard-admin).
Principais Rotas da API (Endpoints)
Autenticação (Público):
POST /register: Cria um novo usuário (User.save()) após hashear a senha com bcrypt.
POST /login: Busca o usuário pelo e-mail. Compara a senha enviada com a senha hasheada no banco usando bcrypt.compare(). Se for válido, gera um jwt.sign() e o retorna.
POST /forgot-password: Encontra o usuário pelo e-mail, gera um token JWT de curta duração ('20m') e envia um e-mail com o link de reset via nodemailer.
POST /reset-password: Verifica o token da URL (jwt.verify()), hasheia a novaSenha e atualiza o usuário no banco (User.findByIdAndUpdate()).
Rotas de Cliente (Protegido por verificarToken):
POST /agendar: Cria um novo Agendamento associado ao req.user.id.
GET /meus-agendamentos: Retorna Agendamento.find({cliente: req.user.id}).
DELETE /agendamentos/:id: Encontra o agendamento (findById). Importante: Verifica se agendamento.cliente.toString() === req.user.id antes de deletar, garantindo que o usuário só delete seus próprios agendamentos.
PUT /agendamentos/:id: Similar ao DELETE, verifica a posse e então atualiza a dataHora.
POST /deixar-feedback: Verifica se o agendamento pertence ao usuário e se feedbackEnviado é false. Se sim, salva o Feedback e atualiza o Agendamento para feedbackEnviado: true.
Rotas de Barbeiro (Protegido por verificarToken):
GET /minha-agenda: Retorna Agendamento.find({barbeiro: req.user.nome, dataHora: {$gte: hoje}, status: 'agendado'}).
GET /meus-feedbacks: Retorna Feedback.find({barbeiroNome: req.user.nome}).
PUT /agendamentos/concluir/:id: Atualiza um agendamento para status: 'concluido' e salva o valor enviado no corpo da requisição.
POST /agendar/walkin: Cria um novo agendamento com status: 'concluido' e o clienteNomeWalkin.
Rotas de Staff (Protegido por verificarToken e verificarStaff):
GET /agenda-do-dia: Retorna todos os agendamentos 'agendados' para hoje.
GET /pagamentos-pendentes: Retorna Agendamento.find({status: 'concluido', pagamentoStatus: 'pendente'}).
PUT /pagamentos/processar/:id: Atualiza um agendamento para pagamentoStatus: 'pago'.
GET /dashboard-admin: A rota mais complexa. Usa agregações do MongoDB ($match, $group, $sum) para calcular faturamentoTotal e totalAtendimentos com base nos filtros de data e barbeiro.
5.2. barbershop-frontend/ (Arquivos HTML)
BarberLOGIN.html:
Função: Ponto de entrada principal. Contém três formulários (<form>) que são alternados via JS (mostrarPainel()).
Fluxo de Login: Envia email e senha para POST /login. Se sucesso, armazena result.token, result.user.nome e result.user.perfil no localStorage. Em seguida, usa um switch (result.user.perfil) para redirecionar o usuário para o HTML correto (ex: BarberCLIENTE.html).
Fluxo de Cadastro: Envia os dados do formulário para POST /register.
Fluxo de Recuperação: Envia o e-mail para POST /forgot-password.
BarberRESET.html:
Função: Página de redefinição de senha.
Fluxo: Pega o token da URL. Envia o token e a novaSenha para POST /reset-password.
BarberCLIENTE.html:
Função: Dashboard do cliente.
Fluxo (OnLoad): No DOMContentLoaded, verifica o localStorage pelo token. Se não existir, redireciona para o Login. Se existir, faz fetch para GET /meus-agendamentos e GET /minhas-notificacoes (enviando o token no header).
Popular Dados: A função popularDashboard processa os agendamentos: separa o próximo agendamento (futuro) do histórico (passado) e atualiza o HTML dinamicamente.
Modais: Usa modais (pop-ups) para os formulários de Agendar, Remarcar e Desmarcar.
Ações:
"Confirmar Agendamento" -> POST /agendar.
"Confirmar Remarcação" -> PUT /agendamentos/:id.
"Confirmar Cancelamento" -> DELETE /agendamentos/:id.
"Deixar Feedback" -> POST /deixar-feedback (usa prompt() para simplicidade).
BarberBARBEIRO.html:
Função: Dashboard do barbeiro.
Fluxo (OnLoad): Verifica o token. Faz fetch para GET /minha-agenda, GET /meus-feedbacks e GET /minha-agenda/estatisticas.
Ações:
"Concluir Atendimento": Chama concluirAtendimento(), que usa prompt() para pedir o valor e envia para PUT /agendamentos/concluir/:id.
"+ Adicionar Corte (Walk-in)": Chama adicionarWalkin(), que usa prompt() para clienteNome, servico e valor, e envia para POST /agendar/walkin.
BarberRECEPCIONISTA.html:
Função: Dashboard da recepção.
Fluxo (OnLoad): Verifica o token e o perfil (perfilUser !== 'recepcionista' && perfilUser !== 'admin'). Faz fetch para GET /agenda-do-dia, GET /feedbacks-todos e GET /pagamentos-pendentes.
Ações:
"Processar Pagamento": Chama processarPagamento(), que envia para PUT /pagamentos/processar/:id.
BarberDONO.html:
Função: Dashboard do administrador (Dono).
Fluxo (OnLoad): Semelhante à recepção, mas com lógica de filtro.
Filtros: O botão "Filtrar" chama buscarDadosDashboard() passando os valores dos inputs de data e do dropdown de barbeiro.
Busca de Dados: A função buscarDadosDashboard() é a mais complexa do frontend. Ela constrói a URL com URLSearchParams (ex: .../dashboard-admin?dataInicio=...&barbeiro=Maycon) e faz o fetch. Também faz um fetch separado para GET /feedbacks-todos (usando os mesmos filtros).
Dropdown: Em carregarFiltrosIniciais(), ele faz um fetch para GET /barbeiros para preencher o <select> de filtro de barbeiros.

6. 🏁 Conclusão
Este projeto é um sistema de software completo e bem estruturado. Ele demonstra um forte entendimento de:
Arquitetura Full-Stack: Separação clara de responsabilidades entre backend (lógica) e frontend (apresentação).
Segurança e Autenticação: Implementação correta de hashing de senhas (bcrypt) e autenticação baseada em token (JWT).
Controle de Acesso Baseado em Perfil (RBAC): Um sistema de permissão robusto que diferencia 4 níveis de usuário, usando middlewares para proteger rotas.
Lógica de Negócios Complexa: Gerenciamento de todo o ciclo de vida de um agendamento, desde a criação até o pagamento e feedback.
Análise de Dados: Uso de agregações do MongoDB para fornecer inteligência de negócios (analytics) ao administrador.

