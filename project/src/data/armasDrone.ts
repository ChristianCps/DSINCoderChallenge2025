import { TipoPoder } from '../types';

export interface ArmaDrone {
  id: string;
  nome: string;
  descricao: string;
  tipoEficazContra: TipoPoder[];
  custoBateria: number;
  cooldownTurns: number;
  danoBase: number;
}

export const armasDrone: ArmaDrone[] = [
  {
    id: 'laser_padrao',
    nome: 'Laser Padrão Mk-I',
    descricao: 'Disparo de energia focado. Arma básica sem especialização.',
    tipoEficazContra: [],
    custoBateria: 5,
    cooldownTurns: 0,
    danoBase: 10
  },
  {
    id: 'pulso_sonico',
    nome: 'Pulso Sônico Disruptor',
    descricao: 'Onda sonora de alta frequência. Eficaz contra poderes mentais e sônicos.',
    tipoEficazContra: ['Psíquico', 'Sônico'],
    custoBateria: 15,
    cooldownTurns: 1,
    danoBase: 25
  },
  {
    id: 'canhao_crio',
    nome: 'Canhão Criogênico',
    descricao: 'Rajada congelante. Eficaz contra poderes elementais e biológicos.',
    tipoEficazContra: ['Elemental', 'Biológico'],
    custoBateria: 15,
    cooldownTurns: 1,
    danoBase: 25
  },
  {
    id: 'disruptor_pem',
    nome: 'Disruptor PEM',
    descricao: 'Pulso eletromagnético. Eficaz contra tecnologia e defesas.',
    tipoEficazContra: ['Tecnológico', 'Defensivo'],
    custoBateria: 15,
    cooldownTurns: 1,
    danoBase: 25
  },
  {
    id: 'lanca_toxina',
    nome: 'Lança-Toxina Neural',
    descricao: 'Projétil com neurotoxina. Eficaz contra organismos biológicos.',
    tipoEficazContra: ['Biológico'],
    custoBateria: 15,
    cooldownTurns: 1,
    danoBase: 25
  },
  {
    id: 'mina_grav',
    nome: 'Mina Gravitacional',
    descricao: 'Anomalia gravitacional localizada. Eficaz contra manipuladores espaciais.',
    tipoEficazContra: ['Espacial'],
    custoBateria: 15,
    cooldownTurns: 1,
    danoBase: 30
  },
  {
    id: 'nulificador',
    nome: 'Campo Nulificador Arcano',
    descricao: 'Suprime energias místicas e caóticas.',
    tipoEficazContra: ['Místico', 'Caótico'],
    custoBateria: 15,
    cooldownTurns: 1,
    danoBase: 25
  },
  {
    id: 'canhao_plasma',
    nome: 'Canhão de Plasma',
    descricao: 'Disparo de plasma superaquecido. Alto dano bruto.',
    tipoEficazContra: ['Bélico', 'Defensivo'],
    custoBateria: 15,
    cooldownTurns: 1,
    danoBase: 25
  },
  {
    id: 'ondas_telepaticas',
    nome: 'Emissor de Ondas Telepáticas',
    descricao: 'Ondas que causam confusão mental. Eficaz contra poderes psíquicos.',
    tipoEficazContra: ['Psíquico'],
    custoBateria: 15,
    cooldownTurns: 1,
    danoBase: 25
  },
  {
    id: 'explosivo_ressonante',
    nome: 'Explosivo Ressonante',
    descricao: 'Explosão que ressoa com frequências específicas. Alto dano contra poderes sônicos e espaciais.',
    tipoEficazContra: ['Sônico', 'Espacial'],
    custoBateria: 15,
    cooldownTurns: 1,
    danoBase: 25
  }
];
