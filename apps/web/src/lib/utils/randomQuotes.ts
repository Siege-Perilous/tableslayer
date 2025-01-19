export type RandomFantasyQuote = {
  quote: string;
  author: string;
  source: string;
};
export const fantasyQuotes: RandomFantasyQuote[] = [
  {
    quote: `We are always more afraid than we wish to be, but we can always be braver than we expect.`,
    author: `Robert Jordan`,
    source: `The Wheel of Time`
  },
  {
    quote: `Courage is about learning how to function despite the fear, to put aside your instincts to run or give in completely to the anger born from fear. Courage is about using your brain and your heart when every cell of your body is screaming at you to fight or flee – and then following through on what you believe is the right thing to do.`,
    author: `Jim Butcher`,
    source: `Dresden Files`
  },
  {
    quote: `You can cry about how things aren’t fair, or you can stand tall and make things fair.`,
    author: `David Dalglish`,
    source: `Magic, Myth, & Mastery`
  },
  {
    quote: `There is no doom so black or deep that courage and clear sight may not find another truth beyond it.`,
    author: `Stephen R. Donaldson`,
    source: `The Last Chronicles of Thomas Covenant`
  },
  {
    quote: `The most important step a man can take. It’s not the first one, is it? It’s the next one. Always the next step.`,
    author: `Brandon Sanderson`,
    source: `The Stormlight Archive`
  },
  {
    quote: `I don’t need to be a hero. I’d settle for feeling that what I did every day had significance to someone besides myself.`,
    author: `Robin Hobb`,
    source: `Tawny Man`
  },
  {
    quote: `Ambition is not a dirty word. Piss on compromise. Go for the throat.`,
    author: `Steven Erikson`,
    source: `Malazan Book of the Fallen`
  },
  {
    quote: `There’s no freedom quite like the freedom of being constantly underestimated.`,
    author: `Scott Lynch`,
    source: `The Gentleman Bastards`
  },
  {
    quote: `Faith is about what you do. It’s about aspiring to be better and nobler and kinder than you are. It’s about making sacrifices for the good of others – even when there’s not going to be anyone telling you what a hero you are.`,
    author: `Jim Butcher`,
    source: `Dresden Files`
  },
  {
    quote: `I will take responsibility for what I have done. If I must fall, I will rise each time a better man.`,
    author: `Brandon Sanderson`,
    source: `The Stormlight Archive`
  },
  {
    quote: `Bones mend. Regret stays with you forever.`,
    author: `Patrick Rothfuss`,
    source: `The Kingkiller Chronicle`
  },
  {
    quote: `An ordinary archer practices until he gets it right. A ranger practices until he never gets it wrong.`,
    author: `John Flanagan`,
    source: `Ranger’s Apprentice`
  },
  {
    quote: `Take a rest and the world catches up with you. Lesson in life – keep moving.`,
    author: `Mark Lawrence`,
    source: `The Broken Empire`
  },
  {
    quote: `Never forget what you are, for surely the world will not. Make it your strength. Then it can never be your weakness. Armour yourself in it, and it will never be used to hurt you.`,
    author: `George R.R. Martin`,
    source: `A Song of Ice and Fire`
  },
  {
    quote: `If the road is easy, you’re likely going the wrong way.`,
    author: `Terry Goodkind`,
    source: `Sword of Truth`
  },
  {
    quote: `All you can do is take each day as it comes. Try and do the best you can with what you’re given. You won’t always do the right thing, but you can try. And you can try to do the right thing next time. That, and stay alive.`,
    author: `Joe Abercrombie`,
    source: `The First Law`
  },
  {
    quote: `You should act, be brave, seize life by the scruff of the neck. Believe me, you should only regret inactivity, indecisiveness, hesitation. You shouldn’t regret actions or decisions, even if they occasionally end in sadness and regret.`,
    author: `Andrej Sapkowski`,
    source: `Witcher Saga`
  }
];

export const getRandomFantasyQuote = (): RandomFantasyQuote => {
  const randomIndex = Math.floor(Math.random() * fantasyQuotes.length);
  return fantasyQuotes[randomIndex];
};
