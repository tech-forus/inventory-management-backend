/**
 * Synonym groups for inventory search.
 * Each inner array is a set of equivalent terms.
 * All terms are normalised (lowercase, no spaces/underscores) at build time.
 */
const SYNONYM_GROUPS = [
  // Electrical components
  ['switch', 'breaker', 'mcb', 'mccb'],
  ['panel', 'board', 'switchboard', 'db', 'distributionboard'],
  ['socket', 'plug', 'outlet', 'point'],
  ['conduit', 'pipe', 'tube', 'duct'],
  ['junctionbox', 'jbox', 'junction'],
  ['earth', 'ground', 'grounding', 'earthing'],
  ['fuse', 'fusing'],
  ['relay', 'rly'],
  ['contactor', 'cntctr'],
  ['transformer', 'xfmr'],
  ['motor', 'mtor'],
  ['resistor', 'res'],
  ['capacitor', 'cap'],
  // Lighting
  ['lamp', 'light', 'bulb', 'luminaire', 'fitting'],
  ['led', 'ledlight'],
  ['tubelight', 'fluorescent', 'tubelighting'],
  // Wiring / conductors
  ['wire', 'cable', 'conductor'],
  // Materials
  ['copper', 'cu'],
  ['aluminum', 'aluminium', 'al', 'alum'],
  ['pvc', 'polyvinyl'],
  ['steel', 'ss', 'stainless'],
  ['galvanized', 'galv', 'gis'],
  // Units (common inventory abbreviations)
  ['nos', 'no', 'piece', 'pcs', 'pc', 'number'],
  ['mtr', 'meter', 'metre'],
  ['kg', 'kilogram', 'kilograms'],
  ['mm', 'millimeter', 'millimetre'],
  ['cm', 'centimeter', 'centimetre'],
  ['ft', 'feet', 'foot'],
  ['inch', 'inches'],
];

// Build lookup: normalised term → array of all synonyms in its group
const synonymMap = new Map();
for (const group of SYNONYM_GROUPS) {
  const normalised = group.map(t => t.toLowerCase().replace(/[\s_]+/g, ''));
  for (const term of normalised) {
    synonymMap.set(term, normalised);
  }
}

/**
 * Expand a single normalised token into its synonym group.
 * Returns an array containing at least the token itself.
 * @param {string} token - already normalised (lower, no spaces/underscores)
 * @returns {string[]}
 */
function expandTokens(token) {
  const key = token.toLowerCase().replace(/[\s_]+/g, '');
  return synonymMap.get(key) || [key];
}

module.exports = { expandTokens };
