# Guia — como conduzir uma eleição

Passo a passo operacional do módulo de eleição, do cadastro à proclamação. O mesmo roteiro está
disponível dentro do sistema em **Administração → Tutoriais → Cadastrar e conduzir uma eleição**
(atalho: botão *Passo a passo* na tela da eleição).

Regras que o sistema garante e não dependem de disciplina do operador:

- o voto nunca fica associado ao eleitor (comparecimento e voto são registros separados);
- ninguém vê resultado parcial enquanto a votação está aberta, nem o administrador;
- cada eleitor vota uma única vez, garantido por restrição no banco;
- a urna nunca abre sozinha — a abertura é sempre uma decisão da Comissão Eleitoral.

---

## 1. Criar a eleição

1. Em **Eleições**, clique em **Nova eleição**.
2. Preencha o **título** (ex.: `Eleição da Diretoria — Triênio 2028/2030`).
3. Informe **início** e **fim da votação**. O fim precisa ser depois do início.
4. As datas de inscrição de chapas são opcionais e apenas informativas — não travam o cadastro.
5. Clique em **Criar eleição**. Ela nasce com status **Agendada**.
6. Na lista, clique em **Gerenciar** para abrir o detalhe.

Enquanto a eleição estiver **Agendada** é possível editar ou excluir. Depois de aberta, não.

## 2. Cadastrar chapas e candidatos

Aba **Chapas**.

1. **Nova chapa** → número (inteiro, único na eleição), nome e slogan opcional.
2. A chapa nasce como **Aguardando homologação**.
3. Em cada chapa, **Adicionar candidato** → nome, cargo (Presidente, Vice-presidente…) e foto opcional.
4. Repita para todas as chapas.

Depois que a urna abrir, chapas e candidatos ficam travados.

## 3. Homologar as chapas

Ainda na aba **Chapas**, em cada chapa pendente:

1. Escreva a **justificativa da decisão** (mínimo 5 caracteres) — ela fica registrada.
2. Clique em **Homologar** ou **Não homologar**.

Cada decisão abre prazo de **3 dias úteis** para contestação (o cálculo pula sábado e domingo; não
considera feriados).

## 4. Julgar impugnações e recursos

Aba **Impugnações**.

- Quem registra a contestação é o filiado, dentro do prazo: **impugnação** contra chapa homologada,
  **recurso** contra chapa não homologada.
- Cada item mostra a chapa contestada, o motivo e a data.
- Escreva a **decisão da Comissão** e clique em **Deferir** ou **Indeferir**.
- Deferir impugnação derruba a homologação; deferir recurso homologa a chapa.

A urna não abre enquanto existir contestação em aberto dentro do prazo.

## 5. Definir eleitores e registrar a Comissão

Aba **Eleitores**:

1. **Sincronizar aprovados** inclui todos os filiados aprovados que ainda não estão na lista (não
   remove ninguém).
2. Remova quem não aderiu ao voto eletrônico (Art. 38 §3º) ou inclua nome por nome pelo seletor.
3. Quem já votou não pode ser removido.
4. Use os filtros **Todos / Já votaram / Pendentes** e a busca por nome ou matrícula.

Aba **Comissão**: escolha o administrador pelo e-mail, marque **titular** ou **suplente** e
adicione. Isso é trilha de auditoria — não altera permissões de acesso.

## 6. Abrir a urna (ou declarar aclamação)

No cartão da fase atual, as quatro pendências precisam estar verdes:

| Pendência | Fica verde quando |
| --- | --- |
| Chapas cadastradas | existe ao menos uma chapa |
| Homologação decidida | nenhuma chapa está aguardando decisão |
| Impugnações e recursos resolvidos | nenhuma contestação em aberto dentro do prazo |
| Lista de eleitores definida | há ao menos um eleitor na lista |

- Com tudo pronto, clique em **Abrir votação** e confirme. A eleição passa para **Aberta**.
- **Chapa única:** se apenas uma chapa foi homologada, aparece o bloco *Chapa única* com
  **Declarar eleita por aclamação**. A eleição vai direto para apurada, sem urna (Art. 38).

## 7. Encerrar e apurar

1. Com a eleição **Aberta**, acompanhe a barra de comparecimento (aba **Eleitores**).
2. Clique em **Encerrar votação** ao fechar as urnas, ou aguarde o fim do prazo — o sistema encerra
   automaticamente depois do horário de fim.
3. Com status **Encerrada**, clique em **Apurar votos**. A contagem é registrada e não é refeita.
4. O resultado passa a aparecer para os filiados. Some os votos presenciais conferidos pela Comissão
   ao resultado eletrônico para a proclamação oficial.

---

## O que o filiado vê

- **Eleições** lista as eleições; a urna aberta aparece destacada em primeiro lugar.
- Na eleição, quem está na lista de eleitores vê a **cédula eletrônica**: escolhe uma chapa, confere
  os candidatos e confirma na barra inferior.
- Depois de votar, a tela vira **comprovante** com o protocolo — ele prova o comparecimento e não
  revela a escolha.
- Fora da votação, a mesma tela lista as chapas concorrentes e, no prazo, oferece **impugnar** ou
  **recorrer**.
- Quando a eleição é apurada, o filiado vê os votos por chapa com a mais votada destacada.

## Perguntas frequentes

**Dá para reabrir uma votação encerrada?** Não. Encerrar e apurar são ações definitivas — é o que
garante que o resultado seja auditável.

**O administrador consegue ver quem votou em quem?** Não. O sistema registra separadamente quem
compareceu e quantos votos cada chapa recebeu, sem ligação entre os dois.

**E se um eleitor perder o protocolo?** O protocolo continua registrado no comparecimento e pode ser
conferido pela Comissão Eleitoral, sem revelar o voto.
