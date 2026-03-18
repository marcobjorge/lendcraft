import { useState } from 'react';
import { useMyName, useFriends } from '../hooks';
import { generateEventId, addImportedEvent, addFriend, type LendingEvent } from '../db';
import { encodeEvents } from '../sharing';
import { CardAutocomplete } from '../components/CardAutocomplete';
import { ShareModal } from '../components/ShareModal';
import { getCardImageUrl } from '../scryfall';

export function BorrowCard() {
  const { name: myName } = useMyName();
  const { friends, reload: reloadFriends } = useFriends();
  const [cards, setCards] = useState<{ name: string; qty: number }[]>([]);
  const [lender, setLender] = useState('');
  const [customLender, setCustomLender] = useState('');
  const [note, setNote] = useState('');
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareDesc, setShareDesc] = useState('');

  const effectiveLender = (lender && lender !== '__custom__') ? lender : customLender.trim();

  const addCard = (name: string) => {
    if (!name) return;
    setCards(prev => {
      const existing = prev.find(c => c.name === name);
      if (existing) return prev.map(c => c.name === name ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { name, qty: 1 }];
    });
  };

  const removeCard = (name: string) => {
    setCards(prev => prev.filter(c => c.name !== name));
  };

  const setQty = (name: string, qty: number) => {
    if (qty < 1) return removeCard(name);
    setCards(prev => prev.map(c => c.name === name ? { ...c, qty } : c));
  };

  const totalCards = cards.reduce((sum, c) => sum + c.qty, 0);

  const handleSubmit = async () => {
    if (cards.length === 0 || !effectiveLender || !myName) return;

    const baseTimestamp = Date.now();
    const events: LendingEvent[] = [];
    let offset = 0;
    let shareDescCards = [];
    for (const { name: cardName, qty } of cards) {
      for (let q = 0; q < qty; q++) {
        const partial = {
          type: 'lend' as const,
          cardName,
          lenderName: effectiveLender,
          borrowerName: myName,
          timestamp: baseTimestamp + offset++,
          note: note || undefined
        };
        const id = generateEventId(partial);
        events.push({ ...partial, id });
      }
      shareDescCards.push( qty + "x " + cardName );
    }

    for (const event of events) {
      await addImportedEvent(event);
    }

    await addFriend(effectiveLender);
    reloadFriends();

    setShareCode(encodeEvents(events));
    setShareDesc(myName + " borrowed from " + effectiveLender + ": " + shareDescCards.join(", "));
    setCards([]);
    setLender('');
    setCustomLender('');
    setNote('');
  };

  return (
    <div className="p-4 pb-4">
      <h1 className="text-2xl font-bold mb-6">Borrow a Card</h1>

      <div className="space-y-4">
        <CardAutocomplete value="" onChange={addCard} />

        {cards.length > 0 && (
          <div className="space-y-2">
            {cards.map(({ name, qty }) => (
              <div key={name} className="flex items-center gap-3 bg-slate-700 rounded-lg p-2">
                <img
                  src={getCardImageUrl(name)}
                  alt={name}
                  className="w-10 h-auto rounded"
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className="flex-1 text-sm">{name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setQty(name, qty - 1)}
                    className="w-7 h-7 rounded bg-slate-600 hover:bg-slate-500 text-sm font-bold leading-none"
                  >
                    &minus;
                  </button>
                  <span className="w-6 text-center text-sm">{qty}</span>
                  <button
                    onClick={() => setQty(name, qty + 1)}
                    className="w-7 h-7 rounded bg-slate-600 hover:bg-slate-500 text-sm font-bold leading-none"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeCard(name)}
                  className="text-red-400 hover:text-red-300 px-2 py-1 text-lg leading-none"
                  aria-label={`Remove ${name}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-300 mb-1">Borrowing from</label>
          {friends.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {friends.map(f => (
                <button
                  key={f}
                  onClick={() => { setLender(f); setCustomLender(''); }}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    lender === f ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {f}
                </button>
              ))}
              <button
                onClick={() => setLender('__custom__')}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  lender === '__custom__' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                + New
              </button>
            </div>
          )}
          {(!lender || lender === '__custom__') && (
            <input
              type="text"
              value={customLender}
              onChange={e => { setCustomLender(e.target.value); setLender('__custom__'); }}
              placeholder="Enter their name"
              className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          )}
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. for FNM tournament"
            className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={cards.length === 0 || !effectiveLender}
          className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors text-sm shrink-0"
        >
          {totalCards <= 1 ? 'Borrow Card' : `Borrow ${totalCards} Cards`}
        </button>
      </div>

      {shareCode && <ShareModal code={shareCode} desc={shareDesc} onClose={() => { setShareCode(null); setShareDesc('')}} />}
    </div>
  );
}
