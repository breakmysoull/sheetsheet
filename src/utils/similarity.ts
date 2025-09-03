/**
 * Calcula a distância de Levenshtein entre duas strings
 * Retorna um valor entre 0 e 1, onde 1 é idêntico
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Algoritmo de distância de Levenshtein
  const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  return (maxLength - matrix[s2.length][s1.length]) / maxLength;
}

/**
 * Verifica se é uma variação de plural/singular
 */
export function checkPluralVariation(str1: string, str2: string): boolean {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Verifica se um é plural do outro
  return (s1.endsWith('s') && s1.slice(0, -1) === s2) ||
         (s2.endsWith('s') && s2.slice(0, -1) === s1) ||
         (s1.endsWith('es') && s1.slice(0, -2) === s2) ||
         (s2.endsWith('es') && s2.slice(0, -2) === s1);
}

/**
 * Calcula similaridade fonética básica
 */
export function calculatePhoneticSimilarity(str1: string, str2: string): number {
  const phoneticMap: { [key: string]: string } = {
    'c': 'k', 'q': 'k', 'ph': 'f', 'gh': 'f',
    'b': 'p', 'd': 't', 'g': 'k', 'v': 'f',
    'z': 's', 'x': 'ks', 'y': 'i'
  };
  
  const normalize = (str: string) => {
    let normalized = str.toLowerCase();
    Object.entries(phoneticMap).forEach(([from, to]) => {
      normalized = normalized.replace(new RegExp(from, 'g'), to);
    });
    return normalized;
  };
  
  return calculateSimilarity(normalize(str1), normalize(str2));
}

/**
 * Encontra itens similares usando múltiplos critérios
 */
export function findSimilarItems(
  searchItem: string, 
  allItems: Array<{ name: string; quantity: number; category?: string }>, 
  threshold = 0.4
): Array<{ name: string; quantity: number; category?: string; similarity: number; matchType: string }> {
  const results = allItems.map(item => {
    const exactSimilarity = calculateSimilarity(searchItem, item.name);
    const phoneticSimilarity = calculatePhoneticSimilarity(searchItem, item.name);
    const isPlural = checkPluralVariation(searchItem, item.name);
    const containsMatch = item.name.toLowerCase().includes(searchItem.toLowerCase()) || 
                         searchItem.toLowerCase().includes(item.name.toLowerCase());
    
    // Pontuação ponderada
    let similarity = Math.max(exactSimilarity, phoneticSimilarity * 0.8);
    let matchType = 'similar';
    
    if (isPlural) {
      similarity = Math.max(similarity, 0.95);
      matchType = 'plural';
    } else if (containsMatch) {
      similarity = Math.max(similarity, 0.85);
      matchType = 'partial';
    } else if (phoneticSimilarity > exactSimilarity) {
      matchType = 'phonetic';
    }
    
    return {
      ...item,
      similarity,
      matchType
    };
  });
  
  return results
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => {
      // Priorizar por tipo de match, depois por similaridade
      const typeOrder = { 'plural': 3, 'partial': 2, 'phonetic': 1, 'similar': 0 };
      const aOrder = typeOrder[a.matchType as keyof typeof typeOrder] || 0;
      const bOrder = typeOrder[b.matchType as keyof typeof typeOrder] || 0;
      
      if (aOrder !== bOrder) return bOrder - aOrder;
      return b.similarity - a.similarity;
    })
    .slice(0, 5); // Top 5 matches
}

/**
 * Sugere correções automáticas para erros comuns
 */
export function suggestAutoCorrection(input: string): string | null {
  const commonMistakes: { [key: string]: string } = {
    'tomat': 'tomate',
    'batata': 'batata',
    'cebol': 'cebola',
    'alhos': 'alho',
    'piment': 'pimenta',
    'beterraba': 'beterraba',
    'berinjela': 'berinjela',
    'abobrinha': 'abobrinha'
  };
  
  const lower = input.toLowerCase();
  
  // Busca exata
  if (commonMistakes[lower]) {
    return commonMistakes[lower];
  }
  
  // Busca parcial
  for (const [mistake, correction] of Object.entries(commonMistakes)) {
    if (lower.includes(mistake) || mistake.includes(lower)) {
      return correction;
    }
  }
  
  return null;
}
