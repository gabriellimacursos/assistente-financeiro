// ─── Conteúdo de ajuda do sistema ──────────────────────────────────────────
// Cada entrada tem: title, description, tips (opcional), example (opcional)

interface HelpEntry {
  title: string
  description: string
  tips?: string[]
  example?: string
}

export const HELP_CONTENT: Record<string, HelpEntry> = {

  // ─── DASHBOARD ──────────────────────────────────────────────────────────

  'dashboard.balance': {
    title: 'Saldo Total',
    description: 'Mostra a diferença entre todas as suas entradas e saídas confirmadas no período selecionado. Um saldo positivo (verde) significa que você recebeu mais do que gastou. Um saldo negativo (vermelho) significa que os gastos superaram as receitas.',
    tips: [
      'Lançamentos com status "Pendente" (como faturas de cartão a vencer) não são incluídos no saldo.',
      'O saldo é calculado apenas para o modo de visualização ativo (Empresa, Pessoal ou Todos).',
      'Para ver o saldo de um período específico, use os filtros no histórico.',
    ],
  },

  'dashboard.income': {
    title: 'Total de Entradas',
    description: 'Soma de todos os valores recebidos no mês atual — vendas, salários, honorários, aluguéis recebidos e qualquer outra fonte de receita registrada.',
    tips: [
      'Só são contabilizadas entradas com status "Confirmado".',
      'Entradas pendentes não entram neste total.',
    ],
  },

  'dashboard.expense': {
    title: 'Total de Saídas',
    description: 'Soma de todas as despesas confirmadas no mês atual. Inclui gastos no débito, pagamentos já realizados e qualquer saída de dinheiro que já foi efetivada.',
    tips: [
      'Faturas de cartão de crédito pendentes (ainda não vencidas) aparecem em "A Pagar", não aqui.',
      'Apenas saídas confirmadas são somadas neste total.',
    ],
  },

  'dashboard.pending': {
    title: 'A Pagar',
    description: 'Total de saídas com status "Pendente" — são despesas que você já sabe que vai pagar, mas ainda não foram efetivadas. Geralmente inclui faturas de cartão de crédito que ainda não venceram.',
    tips: [
      'Quando você paga uma fatura de cartão, clique em "Marcar como pago" para confirmar a saída.',
      'Valores pendentes não afetam o saldo atual, mas servem como previsão de gastos futuros.',
    ],
  },

  'dashboard.cards': {
    title: 'Controle de Cartões de Crédito',
    description: 'Esta seção mostra o total gasto em cada cartão de crédito no ciclo atual, agrupado por cartão. Facilita o controle de quanto será cobrado na próxima fatura de cada cartão.',
    tips: [
      'Os gastos são agrupados por período de faturamento (do dia de fechamento até o vencimento).',
      'Clique em "Marcar como pago" quando pagar a fatura para registrar a saída e limpar o ciclo.',
      'Configure o dia de fechamento e vencimento de cada cartão em Cartões → Editar.',
    ],
  },

  'dashboard.mark-paid': {
    title: 'Marcar Fatura como Paga',
    description: 'Ao clicar aqui, o sistema registra automaticamente um lançamento de saída correspondente ao total da fatura do cartão. Todos os lançamentos pendentes daquele cartão são marcados como "Confirmados".',
    tips: [
      'Esta ação cria um registro de pagamento no histórico e não pode ser desfeita facilmente.',
      'Certifique-se de que o valor exibido é o valor correto da fatura antes de confirmar.',
      'Após marcar como pago, os lançamentos do cartão saem da seção "A Pagar" e entram em "Saídas".',
    ],
  },

  'dashboard.mode-toggle': {
    title: 'Alternar entre Empresa e Pessoal',
    description: 'Permite filtrar os dados exibidos no painel por contexto financeiro. "Empresa" mostra apenas lançamentos empresariais, "Pessoal" mostra os pessoais, e "Todos" exibe ambos juntos.',
    tips: [
      'Ao registrar um lançamento, você escolhe se ele é Empresa ou Pessoal.',
      'Separar finanças empresariais e pessoais facilita o controle de cada uma individualmente.',
    ],
  },

  // ─── REGISTRAR ──────────────────────────────────────────────────────────

  'registrar.mic': {
    title: 'Registrar por Voz',
    description: 'Pressione o microfone e fale naturalmente o que aconteceu. A inteligência artificial interpreta o que você disse e preenche automaticamente todos os campos: valor, tipo (entrada/saída), categoria e modo (empresa/pessoal).',
    tips: [
      'Fale de forma natural e completa, incluindo o valor e o motivo.',
      'Mencione o modo se necessário: "empresa" ou "pessoal".',
      'Se o sistema errar, você pode corrigir qualquer campo antes de confirmar.',
    ],
    example: 'Gastei 45 reais com almoço de empresa hoje',
  },

  'registrar.text-input': {
    title: 'Registrar por Texto',
    description: 'Digite o que aconteceu no campo de texto e pressione Enter ou o botão enviar. A IA interpreta o texto da mesma forma que o comando de voz e preenche os campos automaticamente.',
    tips: [
      'Inclua o valor, o que foi (categoria) e se é empresa ou pessoal.',
      'Você pode corrigir qualquer campo na tela de confirmação antes de salvar.',
    ],
    example: 'Recebi 2500 de consultoria empresa',
  },

  'registrar.mode-toggle': {
    title: 'Empresa ou Pessoal',
    description: 'Define em qual contexto o lançamento será registrado. "Empresa" agrupa gastos e receitas do seu negócio. "Pessoal" agrupa suas finanças pessoais. Isso permite analisar cada um separadamente.',
    tips: [
      'Você pode mudar o modo na tela de confirmação também.',
      'A IA tenta detectar automaticamente com base no que você disse.',
    ],
  },

  'registrar.confirm-type': {
    title: 'Entrada ou Saída',
    description: '"Entrada" significa que você recebeu dinheiro (receita, venda, salário). "Saída" significa que você pagou algo (despesa, compra, conta).',
    tips: [
      'A IA detecta automaticamente, mas você pode corrigir antes de salvar.',
      'Entradas somam ao saldo, saídas diminuem.',
    ],
  },

  'registrar.confirm-category': {
    title: 'Categoria',
    description: 'Classifica o lançamento para facilitar análises e relatórios. Escolha a categoria que melhor representa o tipo de receita ou despesa.',
    tips: [
      'Categorias consistentes melhoram muito as análises de gastos por categoria.',
      'Você pode criar novas categorias em Configurações → Categorias.',
      'A IA sugere a categoria com base no que você disse.',
    ],
  },

  'registrar.confirm-date': {
    title: 'Data do Lançamento',
    description: 'A data em que a receita foi recebida ou a despesa foi realizada. Por padrão, é o dia atual, mas você pode alterar para registrar lançamentos de dias anteriores.',
    tips: [
      'Para cartões de crédito, a data é automaticamente ajustada para o próximo vencimento.',
      'Registrar a data correta é importante para análises mensais precisas.',
    ],
  },

  'registrar.confirm-card': {
    title: 'Cartão de Crédito',
    description: 'Selecione o cartão de crédito usado nesta compra. O lançamento ficará vinculado ao cartão e aparecerá no controle de fatura correspondente.',
    tips: [
      'A data é ajustada automaticamente para o próximo vencimento do cartão selecionado.',
      'Se não for compra no cartão, deixe em branco.',
    ],
  },

  'registrar.recurrence': {
    title: 'Recorrência',
    description: 'Marque se este lançamento se repete regularmente. O sistema criará automaticamente uma recorrência que gerará lembretes nas próximas datas.',
    tips: [
      'Use para contas fixas: aluguel, assinaturas, salários mensais.',
      'A recorrência fica visível e gerenciável na seção "Recorrências".',
    ],
    example: 'Plano de academia todo mês no dia 10',
  },

  'registrar.transfer': {
    title: 'Transferência entre Contas',
    description: 'Registra uma movimentação de dinheiro entre sua conta Empresa e conta Pessoal. Cria automaticamente dois lançamentos: uma saída na origem e uma entrada no destino.',
    tips: [
      'Use para registrar pró-labore (empresa → pessoal) ou aportes (pessoal → empresa).',
      'Os dois lançamentos aparecem no histórico como uma transferência vinculada.',
    ],
    example: 'Pró-labore: transferindo 3000 da empresa para o pessoal',
  },

  'registrar.smart-suggestions': {
    title: 'Sugestões Inteligentes',
    description: 'Atalhos baseados nos seus lançamentos mais frequentes. O sistema aprende com seu histórico e sugere os registros que você faz com mais frequência para agilizar o processo.',
    tips: [
      'Toque em uma sugestão para pré-preencher o formulário de confirmação.',
      'As sugestões atualizam automaticamente conforme você usa o sistema.',
    ],
  },

  // ─── HISTÓRICO (TIMELINE) ─────────────────────────────────────────────────

  'timeline.summary': {
    title: 'Resumo do Período',
    description: 'Mostra o total de entradas, saídas e saldo do período filtrado. "A Pagar" exibe despesas pendentes (como faturas de cartão não pagas) que ainda não impactaram o saldo.',
    tips: [
      'Os totais mudam conforme você aplica filtros de tipo, período e categoria.',
      '"A Pagar" inclui somente saídas com status Pendente.',
    ],
  },

  'timeline.filter-type': {
    title: 'Filtrar por Tipo',
    description: 'Filtra a lista para exibir apenas Entradas, apenas Saídas ou ambos. Útil para analisar receitas e despesas separadamente.',
    tips: [
      'Combine com o filtro de período para análises mais específicas.',
      'O resumo de totais se atualiza de acordo com o filtro aplicado.',
    ],
  },

  'timeline.filter-period': {
    title: 'Filtrar por Período',
    description: 'Define o intervalo de datas dos lançamentos exibidos. Inclui opções rápidas (hoje, semana, mês atual) e a opção de definir um período personalizado.',
    tips: [
      'Use "Período personalizado" para ver lançamentos entre duas datas específicas.',
      'O padrão é o mês atual.',
    ],
  },

  'timeline.filter-category': {
    title: 'Filtrar por Categoria',
    description: 'Permite selecionar uma ou mais categorias para ver apenas os lançamentos daquelas categorias. Ideal para analisar quanto gastou em alimentação, combustível, etc.',
    tips: [
      'Você pode selecionar múltiplas categorias ao mesmo tempo.',
      'Clique novamente na categoria para desmarcar.',
    ],
  },

  'timeline.transaction-row': {
    title: 'Lançamento',
    description: 'Cada linha representa uma receita ou despesa registrada. Toque no lançamento para ver os detalhes completos e ter a opção de editar ou excluir.',
    tips: [
      'O ícone de lápis aparece ao passar o mouse (computador) para indicar que é editável.',
      'Lançamentos com a tag "A pagar" em amarelo são pendentes.',
      'A tag EMP indica conta Empresa; PES indica conta Pessoal.',
    ],
  },

  'timeline.edit-modal': {
    title: 'Editar Lançamento',
    description: 'Permite corrigir qualquer informação de um lançamento já registrado: descrição, valor, tipo (entrada/saída), modo (empresa/pessoal), categoria e data.',
    tips: [
      'Todas as alterações são salvas no banco de dados imediatamente ao clicar em "Salvar".',
      'Se a conexão falhar, as alterações são revertidas automaticamente.',
      'O botão de lixeira (🗑) exclui o lançamento permanentemente.',
    ],
  },

  'timeline.delete': {
    title: 'Excluir Lançamento',
    description: 'Remove permanentemente o lançamento do sistema e do banco de dados. Esta ação não pode ser desfeita.',
    tips: [
      'Uma confirmação será solicitada antes de excluir.',
      'Se a exclusão falhar por problema de conexão, o lançamento é restaurado automaticamente.',
    ],
  },

  // ─── CARTÕES ────────────────────────────────────────────────────────────

  'cartoes.list': {
    title: 'Seus Cartões de Crédito',
    description: 'Lista todos os cartões de crédito cadastrados. Cada cartão mostra o total gasto no mês atual e o percentual do limite utilizado (se o limite estiver configurado).',
    tips: [
      'Clique no cartão para ver todos os lançamentos vinculados a ele.',
      'A barra de progresso vermelha indica que mais de 80% do limite foi utilizado.',
      'Cartões inativos aparecem com opacidade reduzida.',
    ],
  },

  'cartoes.add': {
    title: 'Adicionar Cartão',
    description: 'Cadastra um novo cartão de crédito no sistema. Após cadastrado, você poderá vincular lançamentos a ele para controlar os gastos por cartão.',
    tips: [
      'Configure o dia de fechamento e vencimento para o sistema calcular a próxima data de pagamento.',
      'Defina o limite para acompanhar o percentual utilizado.',
    ],
  },

  'cartoes.closing-day': {
    title: 'Dia de Fechamento',
    description: 'O dia do mês em que a fatura do cartão fecha, ou seja, a partir do qual os gastos entram no próximo ciclo. Após o fechamento, novas compras vão para a fatura seguinte.',
    tips: [
      'Verifique na fatura ou no app do banco qual é o seu dia de fechamento.',
      'Se não souber, deixe em branco — você ainda pode usar o cartão normalmente.',
    ],
    example: 'Se o fechamento é dia 15, uma compra no dia 16 vai para a fatura do próximo mês',
  },

  'cartoes.due-day': {
    title: 'Dia de Vencimento',
    description: 'O dia do mês em que a fatura do cartão vence e deve ser paga. Quando você seleciona este cartão em um lançamento, a data é automaticamente ajustada para o próximo vencimento.',
    tips: [
      'Verifique no app do banco qual é o seu dia de vencimento.',
      'Este campo é usado para calcular automaticamente a data dos lançamentos no cartão.',
    ],
    example: 'Se o vencimento é dia 10, compras feitas hoje serão datadas para o dia 10 do próximo mês',
  },

  'cartoes.detail': {
    title: 'Detalhe do Cartão',
    description: 'Exibe todos os lançamentos vinculados a este cartão, a análise de gastos por categoria no mês atual e o controle de limite.',
    tips: [
      'Use esta tela para revisar os gastos antes de pagar a fatura.',
      'Os lançamentos são ordenados do mais recente para o mais antigo.',
    ],
  },

  // ─── RECORRÊNCIAS ────────────────────────────────────────────────────────

  'recorrencias.what': {
    title: 'O que são Recorrências?',
    description: 'Recorrências são pagamentos ou recebimentos fixos que se repetem regularmente: aluguel, assinatura de streaming, salário mensal, mensalidade de academia, etc. O sistema as usa como referência para lembretes e previsões financeiras.',
    tips: [
      'Recorrências não geram lançamentos automaticamente — elas servem como lembretes.',
      'Você ainda precisa registrar o lançamento quando o pagamento acontecer.',
      'Use para ter visão de quanto você tem de gastos e receitas fixas por mês.',
    ],
    example: 'Aluguel de R$ 1.500 todo dia 5 do mês',
  },

  'recorrencias.toggle': {
    title: 'Pausar / Ativar Recorrência',
    description: 'Pausa uma recorrência temporariamente sem excluí-la. Útil quando um pagamento fixo foi cancelado ou suspenso por um período, mas pode voltar futuramente.',
    tips: [
      'Recorrências pausadas aparecem na seção "Pausadas" com opacidade reduzida.',
      'Para retomar, clique no botão play (▶).',
    ],
  },

  'recorrencias.frequency': {
    title: 'Frequência',
    description: 'Define com que periodicidade esta conta ou receita se repete: diariamente, semanalmente, a cada 15 dias, mensalmente ou anualmente.',
    tips: [
      'A maioria das contas fixas é mensal.',
      'A data da próxima ocorrência é calculada automaticamente com base na frequência.',
    ],
  },

  'recorrencias.summary': {
    title: 'Resumo Mensal',
    description: 'Mostra o total de entradas e saídas fixas mensais com base nas recorrências ativas. Ajuda a entender qual é o seu comprometimento financeiro fixo todo mês.',
    tips: [
      'Apenas recorrências mensais ativas são somadas aqui.',
      'Compare com seu total de receitas para saber quanto sobra de margem.',
    ],
  },

  // ─── CONFIGURAÇÕES ──────────────────────────────────────────────────────

  'config.profiles': {
    title: 'Perfis de Usuário',
    description: 'Perfis permitem que diferentes pessoas usem o mesmo sistema com acesso separado. Cada perfil pode registrar seus próprios lançamentos e ter permissões específicas configuradas pelo dono.',
    tips: [
      'O perfil principal (dono) tem acesso total ao sistema.',
      'Perfis adicionais podem ter permissões restritas — configuráveis pelo botão ⚙ de cada perfil.',
      'Cada perfil pode ter um PIN de 4 dígitos para proteção.',
    ],
  },

  'config.profile-permissions': {
    title: 'Permissões do Perfil',
    description: 'Define o que um perfil membro pode fazer no sistema. O dono pode liberar ou restringir: registrar lançamentos, editar, excluir, gerenciar categorias, cartões e recorrências.',
    tips: [
      'Por padrão, novos perfis só podem registrar lançamentos.',
      'Nunca dê permissão de Admin a perfis que não devem ter acesso à área administrativa.',
      'Clique no ícone ⚙ ao lado do perfil para configurar as permissões.',
    ],
  },

  'config.profile-pin': {
    title: 'PIN de Perfil',
    description: 'Um PIN de 4 dígitos que protege o acesso ao perfil. Quando configurado, será solicitado ao trocar para aquele perfil na tela de login.',
    tips: [
      'Use PINs diferentes para cada perfil.',
      'Se esquecer o PIN, o dono do sistema pode resetá-lo nas configurações.',
    ],
  },

  'config.categories': {
    title: 'Categorias',
    description: 'Categorias classificam seus lançamentos para facilitar análises. Você pode criar categorias personalizadas além das padrão, e definir se cada uma é para entradas, saídas ou ambas.',
    tips: [
      'Categorias Empresa e Pessoal são independentes — você pode ter a mesma categoria nos dois modos.',
      '"Ambos" significa que a categoria aparece tanto para entradas quanto para saídas.',
      'Para excluir, toque na categoria e confirme.',
    ],
  },

  'config.system-pin': {
    title: 'PIN do Sistema',
    description: 'Um PIN geral de 4 dígitos que protege o acesso ao aplicativo inteiro. Será solicitado ao abrir o sistema, antes mesmo de selecionar o perfil.',
    tips: [
      'Diferente do PIN de perfil, este protege o acesso inicial ao app.',
      'Guarde bem — se esquecer, você precisará limpar os dados do navegador para redefinir.',
    ],
  },

  // ─── ADMIN ──────────────────────────────────────────────────────────────

  'admin.panel': {
    title: 'Painel Administrativo',
    description: 'Área exclusiva para o administrador do sistema. Permite visualizar, aprovar, suspender e excluir usuários que solicitaram acesso ao sistema.',
    tips: [
      'Somente o perfil principal com status de Admin pode acessar este painel.',
      'Novos usuários ficam com status "Aguardando aprovação" até o admin aprovar.',
      'Suspender um usuário impede o acesso sem excluir os dados.',
    ],
  },

  'admin.approve': {
    title: 'Aprovar Usuário',
    description: 'Libera o acesso de um usuário que se cadastrou e está aguardando aprovação. Após aprovado, o usuário pode fazer login e usar o sistema.',
    tips: [
      'Somente aprove usuários que você conhece e deseja dar acesso ao sistema.',
      'Você pode suspender o acesso a qualquer momento depois.',
    ],
  },

  'admin.suspend': {
    title: 'Suspender Usuário',
    description: 'Bloqueia temporariamente o acesso de um usuário ao sistema sem excluir seus dados. O usuário não conseguirá fazer login enquanto estiver suspenso.',
    tips: [
      'Use para revogar acesso temporariamente sem perder os dados do usuário.',
      'Para restaurar, clique em "Reativar" no mesmo usuário.',
    ],
  },

  'admin.reset-password': {
    title: 'Resetar Senha',
    description: 'Envia um e-mail com link para o usuário redefinir sua senha de acesso. O link expira em 24 horas.',
    tips: [
      'Use quando o usuário esquecer a senha ou precisar de um novo acesso.',
      'O e-mail é enviado para o endereço cadastrado do usuário.',
    ],
  },

  'admin.delete-user': {
    title: 'Excluir Usuário Permanentemente',
    description: 'Remove completamente o usuário e TODOS os seus dados do sistema: perfis, lançamentos, cartões, categorias e recorrências. Esta ação é IRREVERSÍVEL.',
    tips: [
      'Use somente quando tiver certeza absoluta — não há como desfazer.',
      'Considere suspender ao invés de excluir caso haja dúvida.',
      'Esta ação exige confirmação adicional para evitar exclusões acidentais.',
    ],
  },

  // ─── DASHBOARD (entradas adicionais) ─────────────────────────────────────

  'dashboard.period': {
    title: 'Filtrar por Período',
    description: 'Escolha se quer ver os dados de hoje, desta semana, deste mês ou do ano inteiro. Todos os gráficos, totais e listas se atualizam de acordo com o período selecionado.',
    tips: [
      'O padrão é o mês atual.',
      'Use "Ano" para ter uma visão geral da sua saúde financeira no longo prazo.',
    ],
  },

  'dashboard.health': {
    title: 'Saúde Financeira',
    description: 'Indicador automático que avalia sua situação financeira com base na relação entre entradas e saídas do período. Pode ser: Boa (verde), Atenção (amarelo) ou Risco (vermelho).',
    tips: [
      '"Boa" significa que suas receitas estão cobrindo as despesas com margem positiva.',
      '"Atenção" indica que gastos estão se aproximando das receitas.',
      '"Risco" significa que as saídas superaram as entradas no período.',
    ],
  },

  'dashboard.trend-chart': {
    title: 'Gráfico de Tendência',
    description: 'Visualização das entradas e saídas ao longo do tempo. Mostra como seus fluxos financeiros evoluíram no período selecionado, facilitando a identificação de meses ou dias com maior movimentação.',
    tips: [
      'A linha azul representa entradas; a linha vermelha representa saídas.',
      'Quando selecionado "Mês", cada barra representa um dia.',
      'Quando selecionado "Ano", cada barra representa um mês.',
    ],
  },

  'dashboard.category-chart': {
    title: 'Maiores Gastos por Categoria',
    description: 'Mostra as 5 categorias onde você mais gastou no período. Ajuda a identificar onde o dinheiro está sendo direcionado e onde é possível economizar.',
    tips: [
      'Apenas saídas confirmadas (não pendentes) são consideradas.',
      'Clique em uma categoria para ver os lançamentos detalhados no Histórico.',
    ],
  },

  'dashboard.ai-insight': {
    title: 'Análise Inteligente',
    description: 'Um resumo gerado automaticamente com base nos seus dados financeiros do período. Destaca pontos de atenção, variações significativas e comparações com o período anterior.',
    tips: [
      'A análise é gerada localmente com base nos seus dados — não há envio de informações para servidores externos.',
      'Atualiza automaticamente quando você muda o período ou modo de visualização.',
    ],
  },

  'dashboard.bill-alerts': {
    title: 'Alertas de Fatura',
    description: 'Notificações de faturas de cartão de crédito que estão aguardando confirmação de pagamento. Quando você pagar a fatura, clique em "Marcar como pago" para registrar a saída.',
    tips: [
      'Faturas não pagas aparecem como "Pendentes" e não impactam o saldo atual.',
      'O botão "Marcar como pago" muda o status para confirmado e registra a saída.',
    ],
  },

  'dashboard.future-bills': {
    title: 'Faturas Futuras Projetadas',
    description: 'Previsão de faturas de cartão de crédito baseada em lançamentos já registrados com datas futuras. Mostra o quanto você provavelmente precisará pagar nas próximas faturas.',
    tips: [
      'Estes valores são projeções — podem mudar se você adicionar ou remover lançamentos.',
      'Ajuda a planejar o fluxo de caixa dos próximos meses.',
    ],
  },

  // ─── TIMELINE (entradas adicionais) ──────────────────────────────────────

  'timeline.mode': {
    title: 'Filtrar por Conta',
    description: 'Exibe apenas os lançamentos de Empresa, apenas os Pessoais, ou todos juntos. Útil para analisar as finanças de cada contexto separadamente.',
    tips: [
      'Afeta também os totais mostrados no resumo acima.',
    ],
  },

  'timeline.status-badge': {
    title: 'Badge "A pagar" (Pendente)',
    description: 'Indica que este lançamento ainda não foi efetivado — geralmente uma fatura de cartão que ainda não venceu. O valor aparece com opacidade reduzida para indicar que não está no saldo.',
    tips: [
      'Para confirmar o pagamento, vá ao Dashboard e clique em "Marcar como pago" no cartão correspondente.',
      'Ou edite o lançamento e mude o status para "Confirmado".',
    ],
  },

  'timeline.recurring-badge': {
    title: 'Lançamento Recorrente',
    description: 'O ícone 🔁 indica que este lançamento foi gerado a partir de uma recorrência cadastrada. É uma receita ou despesa que se repete regularmente.',
    tips: [
      'Para gerenciar a recorrência (pausar, editar, excluir), vá à seção Recorrências.',
      'Excluir o lançamento individual não afeta a recorrência — ela continuará gerando futuros lançamentos.',
    ],
  },

  // ─── CARTÕES (entradas adicionais) ────────────────────────────────────────

  'cartoes.total': {
    title: 'Total nos Cartões Este Mês',
    description: 'Soma de todos os gastos vinculados a cartões de crédito no mês atual, independente do status. Inclui gastos confirmados e pendentes (faturas ainda não pagas).',
    tips: [
      'Este valor representa o quanto você usou de crédito, não necessariamente o que já saiu da sua conta.',
      'Para ver quanto você deve pagar, verifique o Dashboard → Faturas.',
    ],
  },

  'cartoes.spending-bar': {
    title: 'Barra de Uso do Limite',
    description: 'Indica o percentual do limite do cartão que foi utilizado no mês atual. A cor muda conforme o uso: verde (até 50%), amarelo (50-80%) e vermelho (acima de 80%).',
    tips: [
      'Manter o uso abaixo de 30% do limite é considerado saudável para o crédito.',
      'Configure o limite do cartão em Editar Cartão para ver esta barra.',
    ],
  },

  'cartoes.inactive': {
    title: 'Cartão Inativo',
    description: 'Um cartão marcado como inativo não aparece nas opções de seleção ao registrar novos lançamentos. O histórico de lançamentos anteriores é mantido.',
    tips: [
      'Use "inativo" para cartões cancelados que você não usa mais mas quer manter o histórico.',
      'Você pode reativar o cartão a qualquer momento em Editar Cartão.',
    ],
  },

  // ─── RECORRÊNCIAS (entradas adicionais) ───────────────────────────────────

  'recorrencias.monthly-total': {
    title: 'Totais Mensais Fixos',
    description: 'Soma das recorrências ativas com frequência mensal. Mostra quanto você tem de receita fixa e comprometimento fixo por mês, desconsiderando recorrências semanais ou anuais.',
    tips: [
      'Compare o total de saídas fixas com suas entradas fixas para saber sua margem de segurança.',
      'Recorrências pausadas não entram neste cálculo.',
    ],
  },

  'recorrencias.next-date': {
    title: 'Próxima Data',
    description: 'A data em que este lançamento recorrente será gerado novamente. Serve como lembrete de quando você precisará pagar ou receberá o valor.',
    tips: [
      'A data é atualizada automaticamente após cada ocorrência.',
      'Você pode editar a data para adiantar ou atrasar a próxima ocorrência.',
    ],
  },

  // ─── CONFIGURAÇÕES (entradas adicionais) ──────────────────────────────────

  'config.budgets': {
    title: 'Orçamentos Mensais',
    description: 'Define um teto de gasto por categoria a cada mês. Quando você se aproxima ou ultrapassa o limite, uma barra de alerta aparece no Dashboard para avisar.',
    tips: [
      'Selecione uma categoria de saída, informe o limite mensal e salve.',
      'No Dashboard, a barra fica verde (ok), amarela (acima de 80%) ou vermelha (estourado).',
      'Cada orçamento é independente por modo — você pode ter limites diferentes para Empresa e Pessoal.',
      'Orçamentos são opcionais — funciona perfeitamente sem eles.',
    ],
    example: 'Limite de R$ 800/mês para Alimentação no pessoal',
  },

  'config.category-direction': {
    title: 'Direção da Categoria (↑↓↕)',
    description: 'Define para qual tipo de lançamento a categoria aparece: apenas Entradas (↑), apenas Saídas (↓), ou ambas (↕). Isso filtra as opções disponíveis ao registrar um lançamento.',
    tips: [
      'Por exemplo, "Salário" deve ser só ↑ Entrada.',
      '"Alimentação" geralmente é ↓ Saída.',
      '"Transferência" pode ser ↕ Ambos.',
    ],
  },

  'config.category-remove': {
    title: 'Remover Categoria',
    description: 'Remove a categoria da lista de opções ao registrar novos lançamentos. Lançamentos já registrados com esta categoria NÃO são afetados — eles mantêm a categoria original.',
    tips: [
      'Toque na categoria para ver a opção de remover.',
      'A exclusão é imediata e irreversível.',
    ],
  },

  'config.access-limited': {
    title: 'Acesso Limitado',
    description: 'Perfis que não são o dono (Membro) têm acesso restrito às configurações do sistema. Eles podem ver suas próprias informações, mas não podem alterar categorias, criar perfis ou acessar o painel administrativo.',
    tips: [
      'Para ter acesso completo, troque para o perfil principal (Dono).',
      'O dono pode configurar o que cada perfil membro pode fazer em Configurações → Perfis → ⚙.',
    ],
  },

  // ─── ADMIN (entradas adicionais) ──────────────────────────────────────────

  'admin.status-pending': {
    title: 'Status: Aguardando Aprovação',
    description: 'O usuário se cadastrou no sistema mas ainda não foi aprovado pelo administrador. Ele não consegue fazer login até ser aprovado. Você pode aprovar ou suspender diretamente.',
    tips: [
      'Somente aprove usuários que você reconhece e quer dar acesso.',
      'Você pode suspender a qualquer momento depois da aprovação.',
    ],
  },

  'admin.status-active': {
    title: 'Status: Ativo',
    description: 'O usuário está aprovado e pode acessar o sistema normalmente. Você pode suspender o acesso a qualquer momento sem excluir os dados.',
    tips: [
      'Usuários ativos podem fazer login e usar todas as funcionalidades conforme suas permissões.',
    ],
  },

  'admin.status-suspended': {
    title: 'Status: Suspenso',
    description: 'O acesso do usuário foi bloqueado temporariamente. Ele não consegue fazer login, mas todos os seus dados são mantidos no sistema.',
    tips: [
      'Use a suspensão quando precisar revogar acesso temporariamente.',
      'Clique em "Reativar" para restaurar o acesso.',
    ],
  },

  'admin.is-admin': {
    title: 'Usuário Admin',
    description: 'O badge "ADMIN" indica que este usuário tem privilégios de administrador — pode ver e gerenciar todos os usuários do sistema. Admins não podem ser suspensos ou excluídos por outros admins (proteção contra auto-suspensão).',
    tips: [
      'Cuidado ao promover usuários a admin — eles terão acesso total ao painel.',
    ],
  },

  'admin.refresh': {
    title: 'Atualizar Lista',
    description: 'Recarrega a lista de usuários do banco de dados. Os dados não atualizam em tempo real automaticamente — use este botão para ver novos cadastros.',
    tips: [
      'Se um usuário acabou de se cadastrar e não aparece na lista, clique em atualizar.',
    ],
  },

  'admin.metrics': {
    title: 'Métricas do Sistema',
    description: 'Visão geral de como o sistema está sendo utilizado: usuários ativos, dispositivos com notificações habilitadas, lançamentos registrados e usuários mais engajados.',
    tips: [
      'Dispositivos push = celulares/navegadores com notificação ativa. Um usuário pode ter vários dispositivos.',
      'Usuários mais ativos são ranqueados pelo total de lançamentos registrados.',
      'Clique em Atualizar para recarregar as métricas.',
    ],
  },

  'admin.notifications': {
    title: 'Enviar Notificação para Todos',
    description: 'Envia uma mensagem push para todos os usuários que habilitaram notificações nos dispositivos deles. Útil para comunicar novidades, manutenções, lembretes ou atualizações do sistema.',
    tips: [
      'Só chegará para usuários que ativaram notificações em Configurações → Alertas.',
      'O campo "URL de destino" define para qual página o usuário será levado ao tocar na notificação.',
      'O histórico das últimas notificações enviadas aparece abaixo do formulário.',
    ],
  },

  'config.notifications': {
    title: 'Alertas no Celular',
    description: 'Ativa notificações push neste dispositivo. Você receberá alertas automáticos sobre faturas de cartão vencendo e débitos recorrentes programados para o dia seguinte.',
    tips: [
      'No iPhone, o app precisa estar salvo na tela inicial (ícone na home) para receber notificações.',
      'No Android e em computadores, funciona diretamente pelo navegador.',
      'Você pode desativar a qualquer momento tocando novamente no botão.',
      'As notificações chegam todo dia às 8h da manhã.',
    ],
  },

  // ─── LOGIN / AUTENTICAÇÃO ────────────────────────────────────────────────

  'login.email': {
    title: 'E-mail de Acesso',
    description: 'O endereço de e-mail com o qual você se cadastrou no sistema. É usado para identificar sua conta e receber notificações.',
    tips: [
      'Use sempre o mesmo e-mail para garantir acesso à sua conta.',
      'Em caso de esquecimento de senha, o link de recuperação é enviado para este e-mail.',
    ],
  },

  'login.password': {
    title: 'Senha de Acesso',
    description: 'Sua senha de acesso ao sistema. Recomendamos usar uma senha forte com letras, números e símbolos.',
    tips: [
      'Clique em "Esqueci minha senha" para receber um link de recuperação por e-mail.',
      'Nunca compartilhe sua senha com outras pessoas.',
    ],
  },

  'login.profile-select': {
    title: 'Selecionar Perfil',
    description: 'Após o login, você escolhe com qual perfil vai usar o sistema. Cada perfil tem seus próprios lançamentos e configurações. Se o perfil tiver PIN, será solicitado.',
    tips: [
      'O perfil principal (dono) tem acesso completo ao sistema.',
      'Você pode trocar de perfil a qualquer momento indo em Configurações.',
    ],
  },

  // ─── PRODUTIVIDADE ───────────────────────────────────────────────────────

  'prod.overview': {
    title: 'Visão Geral de Produtividade',
    description: 'Painel central do seu sistema de produtividade. Reúne sua missão do dia, tarefas de hoje, entregas semanais, projetos ativos e a caixa de captura rápida em um único lugar.',
    tips: [
      'Comece o dia definindo sua missão principal — a coisa mais importante que, se concluída, tornará o dia bem-sucedido.',
      'Use a captura rápida para registrar ideias e tarefas sem interromper o que está fazendo. Processe a caixa de entrada quando tiver tempo.',
      'O alerta de projetos ativos aparece quando você excede o limite configurado — foco em poucos projetos produz mais resultado.',
    ],
  },

  'prod.mission': {
    title: 'Missão Principal do Dia',
    description: 'A tarefa ou objetivo mais importante do seu dia. Com base na pesquisa de Gary Keller (The One Thing), focar em uma única missão principal antes de qualquer outra coisa maximiza a produtividade real.',
    tips: [
      'Escolha algo que, se concluído, tornaria os outros objetivos mais fáceis ou até desnecessários.',
      'Você pode escrever a missão livremente ou vincular a uma tarefa existente no sistema.',
      'Se não souber qual é sua missão, pergunte: "O que eu preciso fazer hoje que fará diferença real nos meus resultados?"',
    ],
    example: 'Finalizar a proposta para o cliente X e enviar até as 14h',
  },

  'prod.weekly': {
    title: 'Entregas da Semana',
    description: 'Os resultados concretos que você precisa entregar nesta semana, organizados por categoria. Diferente de tarefas, são compromissos de resultado — o que vai existir no mundo quando a semana terminar.',
    tips: [
      'Defina no máximo 3 entregas por categoria para manter o foco.',
      'Clique em uma entrega para marcá-la como concluída.',
      'As categorias podem ser personalizadas em Configurações → Produtividade.',
    ],
    example: 'Entregar: relatório mensal revisado e enviado ao cliente',
  },

  'prod.tasks': {
    title: 'Gerenciamento de Tarefas',
    description: 'Lista completa das suas tarefas organizada por status. A aba Entrada mostra itens capturados que precisam ser processados. Próximas são tarefas prontas para fazer. Em espera são tarefas que dependem de outra pessoa ou evento.',
    tips: [
      'Processe a caixa de entrada diariamente: converta cada item em tarefa, projeto ou descarte.',
      'Use "Próximas" para a lista de tarefas que você vai fazer em breve, sem data específica.',
      'Tarefas em "Espera" ficam com quem está aguardando — ajuda a não perder o follow-up.',
    ],
  },

  'prod.projects': {
    title: 'Projetos',
    description: 'Um projeto é qualquer objetivo que exige mais de uma ação para ser concluído. Organizado por área de atuação, com barra de progresso baseada nas tarefas vinculadas.',
    tips: [
      'Mantenha no máximo 2-3 projetos ativos simultaneamente para não diluir a atenção.',
      'Projetos que não podem avançar agora devem ir para "Em espera" ou "Depois", não para a lixeira.',
      'O percentual de progresso é calculado automaticamente pelas tarefas concluídas vinculadas ao projeto.',
    ],
  },

  'prod.focus': {
    title: 'Sessão de Foco',
    description: 'Um bloco de tempo cronometrado dedicado a uma única tarefa, sem distrações. Baseado na técnica Pomodoro adaptada: períodos longos de foco (padrão 75 min) intercalados com pausas ativas (15 min).',
    tips: [
      'Cada interrupção que você registrar (botão "+") fica salva como dado de contexto — ajuda a identificar padrões que quebram seu foco.',
      'Durante a pausa, levante, mova o corpo, beba água. Não fique na tela.',
      'Quando encerrar a sessão, registre o próximo passo para retomar sem esforço cognitivo.',
    ],
    example: 'Abrir o arquivo de proposta → revisar os itens 3 e 4 → enviar para aprovação',
  },

  'prod.capture': {
    title: 'Captura Rápida',
    description: 'Um lugar para registrar qualquer pensamento, ideia ou tarefa sem precisar organizar na hora. O objetivo é esvaziar a mente rapidamente e processar depois com calma.',
    tips: [
      'Capture tudo que passa pela sua cabeça — é melhor registrar e descartar do que deixar na cabeça.',
      'Processe a caixa de entrada pelo menos uma vez por dia, de preferência no início ou fim do expediente.',
      'Durante o processamento, cada item vira: uma tarefa, um projeto, uma referência ou vai para o lixo.',
    ],
    example: 'Ligar para fornecedor sobre entrega atrasada',
  },
}
