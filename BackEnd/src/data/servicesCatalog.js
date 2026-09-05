// Catalogue des services par type d'entreprise.
// La clé correspond à Entreprise.type (et aux clés de route /service/:type).
export const SERVICE_TYPES = ['coiffure', 'tresseuses', 'pressings', 'lavage-auto', 'residence', 'agence-waves'];

// Catégories réservées à l'administrateur. Elles restent servies normalement par
// l'API — l'admin les consulte, et les entreprises déjà inscrites sous ces types
// continuent de fonctionner — mais elles ne sont plus proposées à l'inscription
// ni listées aux clients.
export const TYPES_ADMIN = ['residence', 'agence-waves'];

// Types qu'une entreprise peut choisir en créant son compte.
export const TYPES_INSCRIPTION = SERVICE_TYPES.filter((t) => !TYPES_ADMIN.includes(t));

export const SERVICES_BY_TYPE = {
  coiffure: [
    { nom: 'Coupe homme',  prefixe: 'A', icone: '💇🏿‍♂️', description: 'Coupe classique, dégradé, barbe' },
    { nom: 'Coupe enfant', prefixe: 'B', icone: '🧒🏿', description: 'Coupe adaptée aux plus petits' },
    { nom: 'Coloration',   prefixe: 'C', icone: '🎨', description: 'Couleur, mèches, balayage' },
  ],
  tresseuses: [
    { nom: 'Défrissage',   prefixe: 'A', icone: '💆🏿‍♀️', description: 'Lissage et défrisage professionnel' },
    { nom: 'Tresses',      prefixe: 'B', icone: '👩🏿‍🦱', description: 'Box braids, cornrows, twists sur mesure' },
    { nom: 'Tissage',      prefixe: 'C', icone: '🧵', description: 'Pose de tissage cousu ou clipsé' },
    { nom: 'Mèche longue', prefixe: 'D', icone: '📏', description: 'Rajout de mèches longues, effet volume' },
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
  'agence-waves': [
    { nom: 'Dépôt d\'argent',      prefixe: 'A', icone: '💵', description: 'Dépôt d\'espèces sur un compte Wave' },
    { nom: 'Retrait d\'argent',    prefixe: 'B', icone: '🏧', description: 'Retrait d\'espèces au guichet de l\'agence' },
    { nom: 'Ouverture de compte',  prefixe: 'C', icone: '📱', description: 'Création et activation d\'un compte Wave' },
    { nom: 'Paiement de facture',  prefixe: 'D', icone: '🧾', description: 'Règlement de factures et abonnements' },
  ],
};
