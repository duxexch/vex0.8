// =========================================================================
// Curated club ratings (Elo-style) — shared by:
//   • server.ts SEO prediction pages (/predictions...)
//   • server/forecastChain.ts upcoming-match prediction chain
// Extracted so both consumers stay in sync.
// =========================================================================

export interface TeamRating {
  name: string;
  rating: number;
  league: string;
}

export const CURATED_TEAMS: Record<string, TeamRating> = {
  ars: { name: 'Arsenal', rating: 1980, league: 'Premier League' },
  liv: { name: 'Liverpool', rating: 1995, league: 'Premier League' },
  mci: { name: 'Manchester City', rating: 2010, league: 'Premier League' },
  che: { name: 'Chelsea', rating: 1900, league: 'Premier League' },
  mun: { name: 'Manchester United', rating: 1850, league: 'Premier League' },
  tot: { name: 'Tottenham', rating: 1870, league: 'Premier League' },
  rma: { name: 'Real Madrid', rating: 2020, league: 'La Liga' },
  fcb: { name: 'Barcelona', rating: 1990, league: 'La Liga' },
  atm: { name: 'Atletico Madrid', rating: 1920, league: 'La Liga' },
  sev: { name: 'Sevilla', rating: 1820, league: 'La Liga' },
  int: { name: 'Inter Milan', rating: 1960, league: 'Serie A' },
  juv: { name: 'Juventus', rating: 1900, league: 'Serie A' },
  mil: { name: 'AC Milan', rating: 1890, league: 'Serie A' },
  nap: { name: 'Napoli', rating: 1930, league: 'Serie A' },
  bay: { name: 'Bayern Munich', rating: 2005, league: 'Bundesliga' },
  bvb: { name: 'Borussia Dortmund', rating: 1900, league: 'Bundesliga' },
  rbl: { name: 'RB Leipzig', rating: 1870, league: 'Bundesliga' },
  lev: { name: 'Bayer Leverkusen', rating: 1930, league: 'Bundesliga' },
  psg: { name: 'Paris Saint-Germain', rating: 1975, league: 'Ligue 1' },
  mrs: { name: 'Marseille', rating: 1850, league: 'Ligue 1' },
  lil: { name: 'Lille', rating: 1830, league: 'Ligue 1' },
  mon: { name: 'Monaco', rating: 1860, league: 'Ligue 1' },
  ahl: { name: 'Al Ahly', rating: 1880, league: 'Egyptian Premier League' },
  zam: { name: 'Zamalek', rating: 1820, league: 'Egyptian Premier League' },
  pyr: { name: 'Pyramids FC', rating: 1790, league: 'Egyptian Premier League' },
  sma: { name: 'Smouha', rating: 1700, league: 'Egyptian Premier League' },
  hil: { name: 'Al Hilal', rating: 1950, league: 'Saudi Pro League' },
  nss: { name: 'Al Nassr', rating: 1910, league: 'Saudi Pro League' },
  itt: { name: 'Al Ittihad', rating: 1870, league: 'Saudi Pro League' },
  ahs: { name: 'Al Ahli', rating: 1885, league: 'Saudi Pro League' },
  ajx: { name: 'Ajax', rating: 1750, league: 'Eredivisie' },
  psv: { name: 'PSV', rating: 1770, league: 'Eredivisie' },
  fey: { name: 'Feyenoord', rating: 1730, league: 'Eredivisie' },
  azl: { name: 'AZ Alkmaar', rating: 1690, league: 'Eredivisie' },
  ben: { name: 'Benfica', rating: 1840, league: 'Primeira Liga' },
  por: { name: 'Porto', rating: 1830, league: 'Primeira Liga' },
  spo: { name: 'Sporting CP', rating: 1820, league: 'Primeira Liga' },
  brg: { name: 'Braga', rating: 1740, league: 'Primeira Liga' },
  gal: { name: 'Galatasaray', rating: 1790, league: 'Turkish Super Lig' },
  fen: { name: 'Fenerbahce', rating: 1780, league: 'Turkish Super Lig' },
  bes: { name: 'Besiktas', rating: 1720, league: 'Turkish Super Lig' },
  tra: { name: 'Trabzonspor', rating: 1690, league: 'Turkish Super Lig' },
  fla: { name: 'Flamengo', rating: 1850, league: 'Brasileiro Serie A' },
  pal: { name: 'Palmeiras', rating: 1860, league: 'Brasileiro Serie A' },
  cor: { name: 'Corinthians', rating: 1760, league: 'Brasileiro Serie A' },
  flu: { name: 'Fluminense', rating: 1750, league: 'Brasileiro Serie A' },
  new: { name: 'Newcastle United', rating: 1840, league: 'Premier League' },
  avl: { name: 'Aston Villa', rating: 1810, league: 'Premier League' },
  whu: { name: 'West Ham United', rating: 1770, league: 'Premier League' },
  bha: { name: 'Brighton', rating: 1760, league: 'Premier League' },
  wol: { name: 'Wolves', rating: 1700, league: 'Premier League' },
  nfo: { name: 'Nottingham Forest', rating: 1740, league: 'Premier League' },
  bet: { name: 'Real Betis', rating: 1780, league: 'La Liga' },
  vil: { name: 'Villarreal', rating: 1810, league: 'La Liga' },
  ath: { name: 'Athletic Club', rating: 1800, league: 'La Liga' },
  rso: { name: 'Real Sociedad', rating: 1790, league: 'La Liga' },
  val: { name: 'Valencia', rating: 1760, league: 'La Liga' },
  rom: { name: 'Roma', rating: 1870, league: 'Serie A' },
  laz: { name: 'Lazio', rating: 1850, league: 'Serie A' },
  ata: { name: 'Atalanta', rating: 1880, league: 'Serie A' },
  fio: { name: 'Fiorentina', rating: 1800, league: 'Serie A' },
  sgf: { name: 'Eintracht Frankfurt', rating: 1800, league: 'Bundesliga' },
  stu: { name: 'VfB Stuttgart', rating: 1790, league: 'Bundesliga' },
  lyo: { name: 'Lyon', rating: 1790, league: 'Ligue 1' },
  nic: { name: 'Nice', rating: 1760, league: 'Ligue 1' },
};

/** Elo prior — probability the home side wins, before draw-splitting. */
export function eloWinProb(homeRating: number, awayRating: number): number {
  return 1 / (1 + Math.pow(10, (awayRating - homeRating) / 400));
}
