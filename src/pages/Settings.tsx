import { useState } from 'react';
import { useMyName, useFriends, useAllEvents } from '../hooks';
import { addFriend, removeFriend, db, addImportedEvent, addLocalEvent } from '../db';
import { encodeEvents } from '../sharing';

export function Settings() {
  const { name, updateName } = useMyName();
  const { friends, reload: reloadFriends } = useFriends();
  const { events } = useAllEvents();
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(name ?? '');
  const [newFriend, setNewFriend] = useState('');

  const handleSaveName = async () => {
    if (newName.trim()) {
      await updateName(newName.trim());
      setEditName(false);
    }
  };

  const handleAddFriend = async () => {
    if (newFriend.trim()) {
      await addFriend(newFriend.trim());
      setNewFriend('');
      reloadFriends();
    }
  };

  const handleRemoveFriend = async (friendName: string) => {
    await removeFriend(friendName);
    reloadFriends();
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mtg-lending-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportShareCode = () => {
    if (events.length === 0) return;
    const code = encodeEvents(events);
    navigator.clipboard.writeText(code);
  };

  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const imported = JSON.parse(text);
        if (!Array.isArray(imported)) throw new Error('Invalid format');
        let added = 0;
        for (const event of imported) {
          const exists = await db.events.get(event.id);
          if (!exists) {
            if( name === event.lenderName  ) {
              await addImportedEvent(event);
            } else {
              await addLocalEvent(event);
            }
            added++;
          }
        }
        alert(`Imported ${added} events.`);
      } catch {
        alert('Invalid backup file.');
      }
    };
    input.click();
  };

  return (
    <div className="p-4 pb-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Your Name</h2>
        {editName ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white focus:outline-none focus:border-indigo-500"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
            />
            <button onClick={handleSaveName} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors">
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
            <span>{name}</span>
            <button
              onClick={() => { setNewName(name ?? ''); setEditName(true); }}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Edit
            </button>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Friends</h2>
        {friends.length === 0 ? (
          <p className="text-slate-400 text-sm mb-3">No friends added yet. They'll appear here as you lend cards.</p>
        ) : (
          <div className="space-y-2 mb-3">
            {friends.map(f => (
              <div key={f} className="flex items-center justify-between bg-slate-800 rounded-lg p-3">
                <span>{f}</span>
                <button
                  onClick={() => handleRemoveFriend(f)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newFriend}
            onChange={e => setNewFriend(e.target.value)}
            placeholder="Add a friend"
            className="flex-1 px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            onKeyDown={e => { if (e.key === 'Enter') handleAddFriend(); }}
          />
          <button
            onClick={handleAddFriend}
            disabled={!newFriend.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 rounded-lg font-semibold transition-colors"
          >
            Add
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Data</h2>
        <div className="space-y-2">
          <button
            onClick={handleExportJson}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors text-left px-4"
          >
            Export JSON Backup ({events.length} events)
          </button>
          <button
            onClick={handleImportJson}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors text-left px-4"
          >
            Import JSON Backup
          </button>
          <button
            onClick={handleExportShareCode}
            disabled={events.length === 0}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg font-semibold transition-colors text-left px-4"
          >
            Copy All Events as Share Code
          </button>
        </div>
      </section>

      <p className="text-center text-xs text-slate-600 mt-8">Lendcraft v{__APP_VERSION__}</p>
    </div>
  );
}
