export function calcularIBW(alturaCm: number, sexo: 'M' | 'F'): number {
  if (sexo === 'M') {
    return 50 + 2.3 * ((alturaCm - 152.4) / 2.54);
  } else {
    return 45.5 + 2.3 * ((alturaCm - 152.4) / 2.54);
  }
}

export function calcularABW(pesoReal: number, ibw: number): number {
  return ibw + 0.4 * (pesoReal - ibw);
}

export function calcularVolumeCorrente(ibw: number): number {
  return 6 * ibw;
}

export function calcularBSA(alturaCm: number, pesoKg: number): number {
  return 0.007184 * Math.pow(alturaCm, 0.725) * Math.pow(pesoKg, 0.425);
}

export function calcularIMC(alturaCm: number, pesoKg: number): number {
  const alturaM = alturaCm / 100;
  return pesoKg / (alturaM * alturaM);
}

export function calcularClearanceCreatinina(idade: number, pesoKg: number, creatinina: number, sexo: 'M' | 'F'): number {
  let crcl = ((140 - idade) * pesoKg) / (72 * creatinina);
  if (sexo === 'F') {
    crcl *= 0.85;
  }
  return crcl;
}
