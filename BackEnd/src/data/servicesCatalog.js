// Catalogue des services par type d'entreprise.
// La clé correspond à Entreprise.type (et aux clés de route /service/:type).
export const SERVICE_TYPES = ['coiffure', 'tresseuses', 'pressings', 'lavage-auto', 'residence'];

export const SERVICES_BY_TYPE = {
  coiffure: [
    { nom: 'Coupe homme',  prefixe: 'A', icone: '💈', description: 'Coupe classique, dégradé, barbe' },
    { nom: 'Coupe enfant', prefixe: 'B', icone: '🧒', description: 'Coupe adaptée aux plus petits' },
    { nom: 'Coloration',   prefixe: 'C', icone: '🎨', description: 'Couleur, mèches, balayage' },
  ],
  tresseuses: [
    { nom: 'Tresses simples',    prefixe: 'A', icone: '💇', description: 'Tresses droites et nattes classiques' },
    { nom: 'Tresses africaines', prefixe: 'B', icone: '👑', description: 'Box braids, knotless, collées' },
    { nom: 'Entretien tresses',  prefixe: 'C', icone: '✨', description: 'Réparation, nettoyage, démêlage' },
  ],
  pressings: [
    { nom: 'Lavage express', prefixe: 'A', icone: '⚡', description: 'Lavage rapide en 30 minutes' },
    { nom: 'Lavage normal',  prefixe: 'B', icone: '🧺', description: 'Lavage complet et soigneux' },
    { nom: 'Repassage',      prefixe: 'C', icone: '♨️', description: 'Repassage professionnel à la vapeur' },
    { nom: 'Nettoyage sec',  prefixe: 'D', icone: '🧴', description: 'Nettoyage délicat pour vêtements fragiles' },
  ],
  'lavage-auto': [
    { nom: 'Lavage extérieur',    prefixe: 'A', icone: '🚿', description: 'Carrosserie, jantes & vitres' },
    { nom: 'Lavage complet',      prefixe: 'B', icone: '🧽', description: 'Extérieur + intérieur soigné' },
    { nom: 'Nettoyage intérieur', prefixe: 'C', icone: '🧹', description: 'Aspiration, sièges & tapis' },
    { nom: 'Polish & lustrage',   prefixe: 'D', icone: '💎', description: 'Brillance & protection carrosserie' },
  ],
  residence: [
    { nom: 'Visite de logement', prefixe: 'A', icone: '🏠', description: 'Visite guidée d\'un bien à louer ou acheter' },
    { nom: 'Dépôt de dossier',   prefixe: 'B', icone: '📁', description: 'Constitution et dépôt de dossier locataire' },
    { nom: 'État des lieux',     prefixe: 'C', icone: '📋', description: 'État des lieux d\'entrée ou de sortie' },
    { nom: 'Signature de bail',  prefixe: 'D', icone: '✍️', description: 'Signature du contrat de bail' },
  ],
};
