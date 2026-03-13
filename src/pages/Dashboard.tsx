import { useState, useCallback } from 'react';
import { useActiveLoans } from '../hooks';
import { generateEventId, addLocalEvent, type LendingEvent } from '../db';
import { encodeEvents } from '../sharing';
import { getCardImageUrl } from '../scryfall';
import { ShareModal } from '../components/ShareModal';
import { useRegisterRefresh } from '../RefreshContext';

interface LoanGroup {
  key: string;
  cardName: string;
  person: string;
  note?: string;
  timestamp: number;
  events: LendingEvent[];
}

function groupLoans(loans: { event: LendingEvent; isLocal: boolean }[], personField: 'borrowerName' | 'lenderName'): LoanGroup[] {
  const map = new Map<string, LoanGroup>();
  for (const { event } of loans) {
    const key = `${event.cardName}|${event[personField]}`;
    const existing = map.get(key);
    if (existing) {
      existing.events.push(event);
      if (event.timestamp < existing.timestamp) existing.timestamp = event.timestamp;
      if (!existing.note && event.note) existing.note = event.note;
    } else {
      map.set(key, {
        key,
        cardName: event.cardName,
        person: event[personField],
        note: event.note,
        timestamp: event.timestamp,
        events: [event],
      });
    }
  }
  return Array.from(map.values());
}

function getShareDesc(events: LendingEvent[]) {
  const eventsByLender = Object.groupBy(events, (e) => e.lenderName);

  const shareDesc = [];
  for (let lenderName in eventsByLender) {
    const eventsForLender = eventsByLender[lenderName]!;
    const eventsForLenderByCard = Object.groupBy(eventsForLender, (e) => e.cardName);
    const shareDescRow = [];

    for (let cardName in eventsForLenderByCard) {
      shareDescRow.push(eventsForLenderByCard[cardName]!.length + "x " + cardName);
    }

    shareDesc.push(eventsForLender[0].borrowerName + " returned to " + eventsForLender[0].lenderName + ": " + shareDescRow.join(", "));
  }

  return shareDesc.join("; ");
}

export function Dashboard() {
  const { loans, reload } = useActiveLoans();
  useRegisterRefresh(reload);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareDesc, setShareDesc] = useState('');

  const lentOut = loans.filter(l => l.isLocal);
  const borrowing = loans.filter(l => !l.isLocal);

  const lentGroups = groupLoans(lentOut, 'borrowerName');
  const borrowGroups = groupLoans(borrowing, 'lenderName');

  const handleReturnGroup = useCallback(async (group: LoanGroup) => {
    const returnEvents: LendingEvent[] = [];
    const baseTimestamp = Date.now();

    for (let i = 0; i < group.events.length; i++) {
      const lendEvent = group.events[i];
      const partial = {
        type: 'return' as const,
        cardName: lendEvent.cardName,
        scryfallId: lendEvent.scryfallId,
        setCode: lendEvent.setCode,
        lenderName: lendEvent.lenderName,
        borrowerName: lendEvent.borrowerName,
        timestamp: baseTimestamp + i,
        returnOfEventId: lendEvent.id,
      };
      const id = generateEventId(partial);
      const event: LendingEvent = { ...partial, id };
      await addLocalEvent(event);
      returnEvents.push(event);
    }
    setShareCode(encodeEvents(returnEvents));
    setShareDesc(getShareDesc(returnEvents));
    reload();
  }, [reload]);

  const renderGroup = (group: LoanGroup, subtitle: string, showReturn: boolean) => (
    <div key={group.key} className="bg-slate-800 rounded-xl p-3 flex items-center gap-3">
      <div className="relative">
        <img
          src={getCardImageUrl(group.cardName)}
          alt={group.cardName}
          className="w-12 h-auto rounded"
          loading="lazy"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {group.events.length > 1 && (
          <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {group.events.length}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {group.cardName}
          {group.events.length > 1 && <span className="text-slate-400 text-sm ml-1">&times;{group.events.length}</span>}
        </p>
        <p className="text-sm text-slate-400">{subtitle}</p>
        {group.note && <p className="text-xs text-slate-500 italic">{group.note}</p>}
        <p className="text-xs text-slate-500">{new Date(group.timestamp).toLocaleDateString()}</p>
      </div>
      {showReturn && (
        <button
          onClick={() => handleReturnGroup(group)}
          className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-semibold transition-colors shrink-0"
        >
          Return{group.events.length > 1 ? ` (${group.events.length})` : ''}
        </button>
      )}
    </div>
  );

  return (
    <div className="p-4 pb-4">
      <h1 className="text-2xl font-bold mb-6">Active Loans</h1>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-indigo-400">
          Lent Out ({lentOut.length})
        </h2>
        {lentGroups.length === 0 ? (
          <p className="text-slate-400 text-sm">No cards currently lent out.</p>
        ) : (
          <div className="space-y-2">
            {lentGroups.map(g => renderGroup(g, `→ ${g.person}`, true))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3 text-amber-400">
          Borrowing ({borrowing.length})
        </h2>
        {borrowGroups.length === 0 ? (
          <p className="text-slate-400 text-sm">Not borrowing any cards.</p>
        ) : (
          <div className="space-y-2">
            {borrowGroups.map(g => renderGroup(g, `← ${g.person}`, false))}
          </div>
        )}
      </section>

      {shareCode && <ShareModal code={shareCode} desc={shareDesc} onClose={() => {setShareCode(null); setShareDesc('');}} />}
    </div>
  );
}
