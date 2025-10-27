import { TipoPoder } from '../types';

export const defesasPorTipo: Map<TipoPoder | 'Geral', [string, string]> = new Map([
  ['Bélico',                 ['Campo de Amortecimento Cinético', 'Contramedidas Chaff/Flare']],
  ['Defensivo',              ['Pulso de Ressonância Harmônica', 'Módulo de Ataque Fásico']],
  ['Elemental',              ['Campo de Supressão Elemental', 'Blindagem Ablativa Adaptativa']],
  ['Tecnológico',            ['Surto Localizado PEM', 'Emissor de Ruído Quântico']],
  ['Psíquico',               ['Gerador de Campo Estático Psíquico', 'Projetor de Loop de Feedback Cognitivo']],
  ['Biológico',              ['Enxame Neutralizador Nanobótico', 'Campo de Estase Metabólica']],
  ['Espacial',               ['Âncora de Realidade Quântica', 'Emissor de Interferência Espaço-Temporal']],
  ['Místico',                ['Campo de Dissipação Arcana', 'Indutor de Aterramento Energético']],
  ['Sônico',                 ['Emissor de Onda de Interferência Destrutiva', 'Escudo de Amortecimento Acústico']],
  ['Caótico',                ['Campo de Estabilização Probabilística', 'Injetor de Entropia Controlada']],
  ['Outro',                  ['Campo de Amortecimento Energético Universal', 'Salto de Micro-Dobra de Emergência']],
  ['Geral',                  ['Campo de Amortecimento Energético Universal', 'Salto de Micro-Dobra de Emergência']]
]);
