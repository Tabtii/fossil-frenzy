import { Card } from '../types';

export interface DiscoveredDino {
  card: Card;
  discovered: boolean;
  timesPlayed: number;
}

export const discoveredDinos: DiscoveredDino[] = [
  {
    card: {
      id: 'trex',
      name: 'Tyrannosaurus Rex',
      type: 'attacker',
      damage: 12,
      era: 'kreide',
      fact: 'Der T-Rex lebte in der Kreidezeit und war einer der größten Raubtiere aller Zeiten. Mit einer Körperlänge von bis zu 13 Metern und einem Gewicht von bis zu 9 Tonnen war er ein absoluter Spitzenprädator.',
      emoji: '🦖',
      energyCost: 3,
    },
    discovered: true,
    timesPlayed: 5,
  },
  {
    card: {
      id: 'triceratops',
      name: 'Triceratops',
      type: 'defender',
      block: 8,
      era: 'kreide',
      fact: 'Der Triceratops war ein Pflanzenfresser mit markantem Drei-Horn-Schild. Er lebte in der späten Kreidezeit und konnte mit seinen Hörnern Angreifer auf Abstand halten.',
      emoji: '🦕',
      energyCost: 2,
    },
    discovered: true,
    timesPlayed: 3,
  },
  {
    card: {
      id: 'archaeopteryx',
      name: 'Archaeopteryx',
      type: 'hybrid',
      damage: 4,
      era: 'jura',
      fact: 'Der Archaeopteryx gilt als Übergangsform zwischen Dinosauriern und Vögeln. Er lebte im späten Jura und hatte sowohl reptilienartige als auch vogelartige Merkmale.',
      emoji: '🐦',
      energyCost: 1,
    },
    discovered: true,
    timesPlayed: 2,
  },
  {
    card: {
      id: 'uranfarn',
      name: 'Urweltfarn',
      type: 'support',
      heal: 5,
      era: 'trias',
      fact: 'Der Urweltfarn war eine der ersten Landpflanzen überhaupt. Er dominate die Wälder des Trias und breitete sich weltweit aus.',
      emoji: '🌿',
      energyCost: 1,
    },
    discovered: true,
    timesPlayed: 4,
  },
  {
    card: {
      id: 'stegosaurus',
      name: 'Stegosaurus',
      type: 'defender',
      block: 6,
      era: 'jura',
      fact: 'Der Stegosaurus war bekannt für seine auffälligen Rückenplatten und die Stacheln an seinem Schwanz. Er lebte im späten Jura und war ein friedlicher Pflanzenfresser.',
      emoji: '🦎',
      energyCost: 2,
    },
    discovered: false,
    timesPlayed: 0,
  },
  {
    card: {
      id: 'velociraptor',
      name: 'Velociraptor',
      type: 'attacker',
      damage: 6,
      era: 'kreide',
      fact: 'Der Velociraptor war viel kleiner als in den Filmen dargestellt - nur etwa so groß wie eine Gans. Aber er war extrem schnell und intelligent.',
      emoji: '🦕',
      energyCost: 2,
    },
    discovered: false,
    timesPlayed: 0,
  },
  {
    card: {
      id: 'mammut',
      name: 'Mammut',
      type: 'defender',
      block: 10,
      heal: 3,
      era: 'eiszeit',
      fact: 'Das Mammut war ein behaarter Riese der Eiszeit mit gewaltigen, geschwungenen Stoßzähnen. Es wanderte in großen Herden durch die Tundra.',
      emoji: '🦣',
      energyCost: 3,
    },
    discovered: false,
    timesPlayed: 0,
  },
  {
    card: {
      id: 'pteranodon',
      name: 'Pteranodon',
      type: 'attacker',
      damage: 5,
      era: 'kreide',
      fact: 'Der Pteranodon war kein Dinosaurier, sondern ein Flugsaurier. Mit einer Flügelspannweite von bis zu 7 Metern glitt er über die Kreidezeit-Landschaft.',
      emoji: '🦅',
      energyCost: 2,
    },
    discovered: false,
    timesPlayed: 0,
  },
  {
    card: {
      id: 'trilobit',
      name: 'Trilobit',
      type: 'support',
      heal: 2,
      era: 'trias',
      fact: 'Der Trilobit war ein Meerestier mit einem dreigeteilten Körperbau. Er lebte in den Urozeanen und ist heute ein beliebtes Fossil für Sammler.',
      emoji: '🦞',
      energyCost: 1,
    },
    discovered: false,
    timesPlayed: 0,
  },
  {
    card: {
      id: 'brachiosaurus',
      name: 'Brachiosaurus',
      type: 'hybrid',
      damage: 4,
      block: 4,
      era: 'jura',
      fact: 'Der Brachiosaurus war einer der längsten bekannten Dinosaurier mit einem extrem langen Hals, der ihm erlaubte, hohe Bäume zu erreichen.',
      emoji: '🦕',
      energyCost: 3,
    },
    discovered: false,
    timesPlayed: 0,
  },
];

export function getDiscoveredCount(): number {
  return discoveredDinos.filter(d => d.discovered).length;
}

export function getTotalCount(): number {
  return discoveredDinos.length;
}
