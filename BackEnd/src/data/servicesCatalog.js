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
    { nom: 'Coupe homme',  prefixe: 'A', description: 'Coupe classique, dégradé, barbe' },
    { nom: 'Coupe enfant', prefixe: 'B', description: 'Coupe adaptée aux plus petits' },
    { nom: 'Coloration',   prefixe: 'C', description: 'Couleur, mèches, balayage' },
  ],
  tresseuses: [
    { nom: 'Défrissage',   prefixe: 'A', description: 'Lissage et défrisage professionnel' },
    { nom: 'Tresses',      prefixe: 'B', description: 'Box braids, cornrows, twists sur mesure' },
    { nom: 'Tissage',      prefixe: 'C', description: 'Pose de tissage cousu ou clipsé' },
    { nom: 'Mèche longue', prefixe: 'D', description: 'Rajout de mèches longues, effet volume' },
  ],
  pressings: [
    { nom: 'Lavage express', prefixe: 'A', description: 'Lavage rapide en 30 minutes' },
    { nom: 'Lavage normal',  prefixe: 'B', description: 'Lavage complet et soigneux' },
    { nom: 'Repassage',      prefixe: 'C', description: 'Repassage professionnel à la vapeur' },
    { nom: 'Nettoyage sec',  prefixe: 'D', description: 'Nettoyage délicat pour vêtements fragiles' },
  ],
  'lavage-auto': [
    { nom: 'Lavage extérieur',    prefixe: 'A', description: 'Carrosserie, jantes & vitres' },
    { nom: 'Lavage complet',      prefixe: 'B', description: 'Extérieur + intérieur soigné' },
    { nom: 'Nettoyage intérieur', prefixe: 'C', description: 'Aspiration, sièges & tapis' },
    { nom: 'Polish & lustrage',   prefixe: 'D', description: 'Brillance & protection carrosserie' },
  ],
  residence: [
    { nom: 'Visite de logement', prefixe: 'A', description: 'Visite guidée d\'un bien à louer ou acheter' },
    { nom: 'Dépôt de dossier',   prefixe: 'B', description: 'Constitution et dépôt de dossier locataire' },
    { nom: 'État des lieux',     prefixe: 'C', description: 'État des lieux d\'entrée ou de sortie' },
    { nom: 'Signature de bail',  prefixe: 'D', description: 'Signature du contrat de bail' },
  ],
  'agence-waves': [
    { nom: 'Dépôt d\'argent',      prefixe: 'A', description: 'Dépôt d\'espèces sur un compte Wave' },
    { nom: 'Retrait d\'argent',    prefixe: 'B', description: 'Retrait d\'espèces au guichet de l\'agence' },
    { nom: 'Ouverture de compte',  prefixe: 'C', description: 'Création et activation d\'un compte Wave' },
    { nom: 'Paiement de facture',  prefixe: 'D', description: 'Règlement de factures et abonnements' },
  ],
};
