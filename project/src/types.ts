export type TipoPoder = "Bélico" | "Defensivo" | "Elemental" | "Tecnológico" |
                      "Psíquico" | "Biológico" | "Espacial" | "Místico" |
                      "Sônico" | "Caótico" | "Outro";

export type RaridadePoder = "Comum" | "Incomum" | "Raro" | "Épico" | "Lendário";

export interface Superpoder {
  nome: string;
  descricao: string;
  tipo: TipoPoder;
  tipo_custom?: string;
  raridade: RaridadePoder;
  notas?: string;
  classificacao?: string[];
}

export interface Localizacao {
  cidade: string;
  pais: string;
  latitude: number;
  longitude: number;
  pontoDeReferencia?: string;
  dificuldade_terreno?: string;
}

export interface DroneInfo {
  numeroSerie: string;
  marca: string;
  fabricante: string;
  paisOrigem: string;
}

export interface DadosOriginais {
  altura: {
    valor: number;
    unidade: string;
  };
  peso: {
    valor: number;
    unidade: string;
  };
  precisao: {
    valor: number;
    unidade: string;
  };
}

export interface PatoPrimordial {
  id?: string;
  created_at?: string;
  drone?: DroneInfo;
  drone_marca_id?: string;
  drone_numero_serie?: string;
  drone_pais_origem?: string;
  marca?: DroneMarca;
  altura_cm: number;
  peso_g: number;
  localizacao: Localizacao;
  precisao_m: number;
  dados_originais?: DadosOriginais;
  status_hibernacao: 'Desperto' | 'Em Transe' | 'Hibernação Profunda';
  batimentos_cardiacos_bpm?: number | null;
  quantidade_mutacoes: number;
  superpoder?: Superpoder | null;
  capturado?: boolean;
}

export interface DroneFabricante {
  id?: string;
  created_at?: string;
  nome: string;
  unidade_medida_padrao: 'metrico' | 'imperial';
  pais_origem: string;
}

export interface DroneMarca {
  id?: string;
  created_at?: string;
  nome: string;
  fabricante_id: string;
  fabricante?: DroneFabricante;
  precisao_valor: number;
  precisao_unidade: string;
  unidade_altura_padrao?: string;
  unidade_peso_padrao?: string;
}

export interface BaseOperacional {
  id?: string;
  created_at?: string;
  nome: string;
  cidade?: string;
  pais: string;
  latitude: number;
  longitude: number;
  is_sede: boolean;
}

export type PageType = 'dashboard' | 'catalog' | 'map' | 'vision' | 'mission' | 'details' | 'new-record' | 'edit-record' | 'bases-operacionais' | 'edit-base' | 'historico-missoes' | 'detalhes-missao' | 'gerenciar-drones' | 'editar-fabricante' | 'editar-marca';
