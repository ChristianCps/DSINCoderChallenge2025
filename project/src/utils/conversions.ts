const G_TO_KG = 0.001;
const G_TO_LBS = 0.00220462;
const LBS_TO_G = 453.592;

const CM_TO_M = 0.01;
const CM_TO_FT = 0.0328084;
const FT_TO_CM = 30.48;

const M_TO_YD = 1.09361;
const M_TO_CM = 100;
const YD_TO_M = 0.9144;
const CM_TO_YD = 0.0109361;

export function converterAlturaParaCM(valor: number, unidade: string): number {
  switch (unidade) {
    case 'cm':
      return valor;
    case 'm':
      return valor * 100;
    case 'mm':
      return valor / 10;
    case 'in':
      return valor * 2.54;
    case 'ft':
      return valor * 30.48;
    default:
      return valor;
  }
}

export function converterPesoParaG(valor: number, unidade: string): number {
  switch (unidade) {
    case 'g':
      return valor;
    case 'kg':
      return valor * 1000;
    case 'mg':
      return valor / 1000;
    case 'lb':
      return valor * 453.592;
    case 'oz':
      return valor * 28.3495;
    default:
      return valor;
  }
}

export function converterPrecisaoParaM(valor: number, unidade: string): number {
  switch (unidade) {
    case 'm':
      return valor;
    case 'km':
      return valor * 1000;
    case 'cm':
      return valor / 100;
    case 'mm':
      return valor / 1000;
    case 'ft':
      return valor * 0.3048;
    case 'mi':
      return valor * 1609.34;
    case 'yd':
      return valor * YD_TO_M;
    default:
      return valor;
  }
}

export const gParaKg = (g: number): number => g * G_TO_KG;
export const gParaLbs = (g: number): number => g * G_TO_LBS;
export const lbsParaG = (lbs: number): number => lbs * LBS_TO_G;
export const lbsParaKg = (lbs: number): number => gParaKg(lbsParaG(lbs));

export const cmParaM = (cm: number): number => cm * CM_TO_M;
export const cmParaFt = (cm: number): number => cm * CM_TO_FT;
export const ftParaCm = (ft: number): number => ft * FT_TO_CM;
export const ftParaM = (ft: number): number => cmParaM(ftParaCm(ft));

export const mParaYd = (m: number): number => m * M_TO_YD;
export const mParaCm = (m: number): number => m * M_TO_CM;
export const ydParaM = (yd: number): number => yd * YD_TO_M;
export const ydParaCm = (yd: number): number => mParaCm(ydParaM(yd));
export const cmParaYd = (cm: number): number => cm * CM_TO_YD;

export const formatarNumero = (num: number, casasDecimais = 2): string => {
  if (isNaN(num) || num === null) return 'N/A';
  return num.toFixed(casasDecimais);
};
