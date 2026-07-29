import { ExpenseCategory } from '../types';

export interface ParsedNfeData {
  nfeKey?: string;
  cnpjIssuer?: string;
  issuerName?: string;
  amount: number;
  expenseDate: string;
  category: ExpenseCategory;
  notes: string;
  rawXmlText: string;
}

/**
 * Módulo Parser de Notas Fiscais Eletrônicas (NF-e / NFC-e em XML)
 */
export function parseNfeXml(xmlString: string): ParsedNfeData {
  if (!xmlString || xmlString.trim().length === 0) {
    throw new Error('Arquivo XML vazio ou inválido.');
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const parserError = xmlDoc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    throw new Error('Falha ao processar o layout do arquivo XML da NF-e.');
  }

  // 1. Chave de Acesso NF-e (44 dígitos)
  let nfeKey: string | undefined;
  const infNfeElem = xmlDoc.getElementsByTagName('infNFe')[0];
  if (infNfeElem && infNfeElem.getAttribute('Id')) {
    nfeKey = infNfeElem.getAttribute('Id')?.replace('NFe', '');
  } else {
    const chNfeElem = xmlDoc.getElementsByTagName('chNFe')[0];
    if (chNfeElem) nfeKey = chNfeElem.textContent || undefined;
  }

  // 2. Dados do Emitente (Estabelecimento)
  let cnpjIssuer: string | undefined;
  let issuerName: string | undefined;
  const emitElem = xmlDoc.getElementsByTagName('emit')[0];
  if (emitElem) {
    const cnpj = emitElem.getElementsByTagName('CNPJ')[0];
    const xNome = emitElem.getElementsByTagName('xNome')[0];
    if (cnpj) cnpjIssuer = cnpj.textContent || undefined;
    if (xNome) issuerName = xNome.textContent || undefined;
  }

  // 3. Data de Emissão (dhEmi ou dEmi)
  let expenseDate = new Date().toISOString();
  const dhEmi = xmlDoc.getElementsByTagName('dhEmi')[0] || xmlDoc.getElementsByTagName('dEmi')[0];
  if (dhEmi && dhEmi.textContent) {
    try {
      expenseDate = new Date(dhEmi.textContent).toISOString();
    } catch (e) {}
  }

  // 4. Valor Total da Nota Fiscal (vNF ou vProd)
  let amount = 0;
  const vNFElem = xmlDoc.getElementsByTagName('vNF')[0] || xmlDoc.getElementsByTagName('vProd')[0];
  if (vNFElem && vNFElem.textContent) {
    amount = parseFloat(vNFElem.textContent.replace(',', '.'));
  }

  if (isNaN(amount) || amount <= 0) {
    throw new Error('Não foi possível identificar o valor total (tag <vNF>) no XML.');
  }

  // 5. Descrição dos Produtos/Serviços (<xProd>) para Mapeamento Automático de Categoria
  const prodElements = xmlDoc.getElementsByTagName('xProd');
  const productDescriptions: string[] = [];
  for (let i = 0; i < prodElements.length; i++) {
    if (prodElements[i].textContent) {
      productDescriptions.push(prodElements[i].textContent!);
    }
  }

  const fullProductText = productDescriptions.join(' ').toLowerCase();

  // Mapeamento Inteligente de Categorias via Dicionário NF-e
  let category: ExpenseCategory = 'MAINTENANCE';

  if (
    fullProductText.includes('gasolina') ||
    fullProductText.includes('etanol') ||
    fullProductText.includes('combustivel') ||
    fullProductText.includes('diesel') ||
    fullProductText.includes('gnv') ||
    fullProductText.includes('posto')
  ) {
    category = 'FUEL';
  } else if (
    fullProductText.includes('kwh') ||
    fullProductText.includes('eletrica') ||
    fullProductText.includes('recarga') ||
    fullProductText.includes('coelba') ||
    fullProductText.includes('energia')
  ) {
    category = 'ELECTRIC_CHARGING';
  } else if (
    fullProductText.includes('oleo') ||
    fullProductText.includes('lubrificante') ||
    fullProductText.includes('5w20') ||
    fullProductText.includes('filtro')
  ) {
    category = 'OIL_CHANGE';
  } else if (
    fullProductText.includes('pneu') ||
    fullProductText.includes('borracharia') ||
    fullProductText.includes('alinhamento') ||
    fullProductText.includes('balanceamento')
  ) {
    category = 'MAINTENANCE';
  } else if (fullProductText.includes('lava') || fullProductText.includes('lavagem') || fullProductText.includes('higienizacao')) {
    category = 'WASH';
  } else if (fullProductText.includes('seguro') || fullProductText.includes('apolice')) {
    category = 'INSURANCE';
  } else if (fullProductText.includes('pedagio') || fullProductText.includes('viaebios')) {
    category = 'TOLL';
  }

  const notesStr = issuerName
    ? `NF-e: ${issuerName} (${productDescriptions[0] || 'Despesa Veicular'})`
    : `NF-e Importada (${productDescriptions[0] || 'Despesa Veicular'})`;

  return {
    nfeKey,
    cnpjIssuer,
    issuerName,
    amount,
    expenseDate,
    category,
    notes: notesStr,
    rawXmlText: xmlString,
  };
}
