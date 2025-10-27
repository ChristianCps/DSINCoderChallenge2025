type Efeito = 'integridade' | 'bateria' | 'combustivel';

interface EfeitoUnico {
  stat: Efeito;
  valor: number;
}

interface OpcaoEvento {
  texto: string;
  efeitos: EfeitoUnico[];
  log: string;
}

export interface EventoVoo {
  id: string;
  titulo: string;
  descricao: string;
  opcoes: OpcaoEvento[];
}

export const eventosVoo: EventoVoo[] = [
  {
    id: 'EVT_001',
    titulo: 'Tempestade Magnética Detectada',
    descricao: 'Uma forte tempestade magnética está diretamente em nossa rota. Devemos contornar, atravessar ou reforçar os escudos?',
    opcoes: [
      {
        texto: 'Contornar (Custo Alto)',
        efeitos: [{ stat: 'combustivel', valor: -25 }],
        log: 'Rota recalculada. Gasto pesado de combustível, mas chegamos em segurança.'
      },
      {
        texto: 'Atravessar (Risco Alto)',
        efeitos: [{ stat: 'integridade', valor: -30 }],
        log: 'Turbulência extrema! A blindagem sofreu danos severos!'
      },
      {
        texto: 'Reforçar Escudos e Atravessar',
        efeitos: [
          { stat: 'bateria', valor: -20 },
          { stat: 'integridade', valor: -5 }
        ],
        log: 'Escudos no máximo! Drenagem alta de bateria, mas o dano à integridade foi mínimo.'
      }
    ]
  },
  {
    id: 'EVT_002',
    titulo: 'Sinal de Drone Aliado Caído',
    descricao: 'Nossos sensores detectaram um sinal de socorro de outro drone DSIN Mk-II que caiu nas proximidades.',
    opcoes: [
      {
        texto: 'Saquear Célula de Bateria',
        efeitos: [{ stat: 'bateria', valor: 20 }],
        log: 'Canibalizamos a célula de energia. Bateria extra adquirida.'
      },
      {
        texto: 'Saquear Placas de Blindagem',
        efeitos: [{ stat: 'integridade', valor: 20 }],
        log: 'Adaptamos placas de blindagem do drone caído. Integridade restaurada.'
      },
      {
        texto: 'Ignorar (Protocolo)',
        efeitos: [],
        log: 'Sinal ignorado. Foco total na missão principal.'
      }
    ]
  },
  {
    id: 'EVT_003',
    titulo: 'Bando de Patos Comuns',
    descricao: 'Um grande bando de patos comuns está bloqueando a passagem de um cânion estreito. Eles parecem agitados.',
    opcoes: [
      {
        texto: 'Usar Buzina Sônica',
        efeitos: [{ stat: 'bateria', valor: -10 }],
        log: 'Buzina sônica ativada. Bando disperso, consumimos energia.'
      },
      {
        texto: 'Aguardar Passagem (Lento)',
        efeitos: [{ stat: 'combustivel', valor: -15 }],
        log: 'Aguardando o bando passar... Rota em espera consumiu combustível.'
      },
      {
        texto: 'Manobra Arriscada (Voo Baixo)',
        efeitos: [{ stat: 'integridade', valor: -10 }],
        log: 'Roçamos uma árvore! Dano leve na fuselagem, mas passamos.'
      }
    ]
  },
  {
    id: 'EVT_004',
    titulo: 'Rota de Voo Otimizada',
    descricao: 'A IA identificou uma corrente de ar favorável que pode economizar combustível, mas ela passa por território aéreo instável.',
    opcoes: [
      {
        texto: 'Pegar Corrente (Econômico)',
        efeitos: [{ stat: 'combustivel', valor: 20 }],
        log: 'Pegando a corrente de ar! Eficiência de combustível aumentada.'
      },
      {
        texto: 'Atalho Rápido (Pós-combustor)',
        efeitos: [
          { stat: 'bateria', valor: -15 },
          { stat: 'combustivel', valor: -10 }
        ],
        log: 'Pós-combustores ativados! Ganhamos tempo, mas com alto custo de energia.'
      },
      {
        texto: 'Manter Rota Segura (Padrão)',
        efeitos: [],
        log: 'Rota segura mantida. Sem alterações.'
      }
    ]
  },
  {
    id: 'EVT_006',
    titulo: 'Drone Corporativo Hostil',
    descricao: 'Um drone não identificado se aproxima. Logotipos da \'PatoCorp\' visíveis. Ele está em rota de interceptação!',
    opcoes: [
      {
        texto: 'Combate (Lasers)',
        efeitos: [
          { stat: 'bateria', valor: -10 },
          { stat: 'integridade', valor: -10 }
        ],
        log: 'Combate rápido! Afastamos o drone, mas sofremos danos e gastamos bateria.'
      },
      {
        texto: 'Evasão (Mergulhar)',
        efeitos: [{ stat: 'combustivel', valor: -15 }],
        log: 'Manobra evasiva no limite! Despistamos o drone inimigo, mas a rota foi longa.'
      },
      {
        texto: 'Stealth (Desligar Tudo)',
        efeitos: [{ stat: 'integridade', valor: -10 }],
        log: 'Modo silencioso. Ele passou... mas ficamos vulneráveis e sofremos um tiro de raspão.'
      }
    ]
  },
  {
    id: 'EVT_005',
    titulo: 'Vazamento de Combustível',
    descricao: 'Alerta! Um micro-meteoro perfurou uma linha de combustível secundária. Estamos perdendo combustível lentamente.',
    opcoes: [
      {
        texto: 'Desviar Energia para Selar',
        efeitos: [
          { stat: 'bateria', valor: -15 },
          { stat: 'combustivel', valor: -5 }
        ],
        log: 'Selante de emergência ativado. Vazamento contido, mas drenou a bateria.'
      },
      {
        texto: 'Ignorar e Acelerar',
        efeitos: [{ stat: 'combustivel', valor: -25 }],
        log: 'Acelerando ao máximo! Chegamos mais rápido, mas perdemos combustível no processo.'
      },
      {
        texto: 'Desligar Motor Afetado',
        efeitos: [
          { stat: 'combustivel', valor: -10 },
          { stat: 'integridade', valor: -5 }
        ],
        log: 'Motor 2 desligado. Sobrecarga no motor 1 causou dano leve. Vazamento parado.'
      }
    ]
  },
  {
    id: 'EVT_007',
    titulo: 'Sinal de Interferência Desconhecido',
    descricao: 'Os sensores estão loucos. Uma fonte de interferência poderosa está bloqueando nossos mapas e o GPS.',
    opcoes: [
      {
        texto: 'Voar Cego (Acelerar)',
        efeitos: [{ stat: 'integridade', valor: -15 }],
        log: 'Voando sem sensores! Colidimos com um obstáculo, mas passamos a zona de interferência.'
      },
      {
        texto: 'Voar Baixo (Contorno)',
        efeitos: [{ stat: 'combustivel', valor: -15 }],
        log: 'Descemos abaixo da interferência. Voo manual consumiu muito combustível.'
      },
      {
        texto: 'Triangular Fonte (Custo)',
        efeitos: [{ stat: 'bateria', valor: -15 }],
        log: 'A IA triangulou a fonte e criou um filtro. Sensores online, mas com custo de bateria.'
      }
    ]
  },
  {
    id: 'EVT_008',
    titulo: 'Transmissão de Mercenários',
    descricao: 'Interceptamos uma transmissão não criptografada. Mercenários estão na área, parecem estar caçando... algo. Não fomos detectados.',
    opcoes: [
      {
        texto: 'Observar (Coletar Dados)',
        efeitos: [{ stat: 'bateria', valor: -10 }],
        log: 'Modo de escuta. Obtivemos dados táticos, mas gastamos bateria.'
      },
      {
        texto: 'Desviar (Longo)',
        efeitos: [{ stat: 'combustivel', valor: -20 }],
        log: 'Não vale o risco. Fizemos um desvio longo para evitar o contato.'
      },
      {
        texto: 'Furtividade (Lento)',
        efeitos: [
          { stat: 'combustivel', valor: -10 },
          { stat: 'bateria', valor: -10 }
        ],
        log: 'Motores em modo silencioso. Passamos por eles sem sermos vistos. Consumiu bateria e combustível extra.'
      }
    ]
  },
  {
    id: 'EVT_009',
    titulo: 'Depósito de Suprimentos Abandonado',
    descricao: 'Nossos scanners de longo alcance encontraram uma assinatura de energia da DSIN. Parece ser um antigo depósito de suprimentos de emergência.',
    opcoes: [
      {
        texto: 'Pegar Células de Bateria',
        efeitos: [
          { stat: 'bateria', valor: 20 },
          { stat: 'combustivel', valor: -5 }
        ],
        log: 'Bingo! Células de energia de reserva. O pequeno desvio valeu a pena.'
      },
      {
        texto: 'Pegar Kits de Reparo',
        efeitos: [
          { stat: 'integridade', valor: 20 },
          { stat: 'combustivel', valor: -5 }
        ],
        log: 'Encontramos nano-selante. Aplicamos reparos de emergência na blindagem.'
      },
      {
        texto: 'Ignorar (Risco de Armadilha)',
        efeitos: [],
        log: 'Pode ser uma armadilha da PatoCorp. Ignorando.'
      }
    ]
  },
  {
    id: 'EVT_010',
    titulo: 'Clima Adverso Súbito',
    descricao: 'Uma frente fria / tempestade de areia / furacão se formou inesperadamente. A rota direta é perigosa.',
    opcoes: [
      {
        texto: 'Voar por Cima (Custo Alto)',
        efeitos: [
          { stat: 'combustivel', valor: -10 },
          { stat: 'bateria', valor: -10 }
        ],
        log: 'Subindo para ar rarefeito. Gastamos combustível e bateria extra, mas passamos.'
      },
      {
        texto: 'Voar por Baixo (Risco Alto)',
        efeitos: [{ stat: 'integridade', valor: -20 }],
        log: 'Voando baixo contra o vento. A fuselagem foi castigada, mas passamos.'
      },
      {
        texto: 'Esperar a Frente Passar',
        efeitos: [{ stat: 'combustivel', valor: -20 }],
        log: 'Pousamos e esperamos. A tempestade passou, mas manter os sistemas ligados gastou combustível.'
      }
    ]
  }
];
