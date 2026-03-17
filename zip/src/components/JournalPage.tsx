import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Journal } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Edit2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

export default function JournalPage({ user }: { user: any }) {
  const [text, setText] = useState('');
  const [journals, setJournals] = useState<Journal[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'users', user.uid, 'journals'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Journal[];
      setJournals(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/journals`);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!text.trim() || !user || saving) return;
    setSaving(true);
    
    try {
      await addDoc(collection(db, 'users', user.uid, 'journals'), {
        text: text.trim(),
        date: format(new Date(), 'yyyy-MM-dd'),
        createdAt: serverTimestamp()
      });
      setText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/journals`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setEntryToDelete(id);
  };

  const confirmDelete = async () => {
    if (!user || !entryToDelete) return;
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'users', user.uid, 'journals', entryToDelete));
      setEntryToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/journals/${entryToDelete}`);
    }
  };

  const startEditing = (journal: Journal) => {
    setEditingId(journal.id);
    setEditText(journal.text);
  };

  const handleUpdate = async (id: string) => {
    if (!user || !editText.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'users', user.uid, 'journals', id), {
        text: editText.trim()
      });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/journals/${id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="pt-14 px-6 pb-8 relative overflow-hidden">
        <div className="absolute -top-14 -right-14 w-[220px] h-[220px] rounded-full bg-[radial-gradient(circle,rgba(200,169,110,0.08)_0%,transparent_70%)] pointer-events-none"></div>
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="font-sans text-[11px] font-medium tracking-[1.5px] uppercase text-text-tertiary mb-3"
        >
          Today
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-serif text-[28px] font-light leading-[1.35] text-text-primary mb-2"
        >
          What actually<br/><em className="italic text-accent">happened</em> today?
        </motion.div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[13px] text-text-tertiary font-light mt-1.5"
        >
          Honest. Messy. Yours.
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mx-6 mb-6"
      >
        <div className="bg-surface border border-border rounded-2xl p-4 min-h-[120px]">
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-text-primary font-sans text-[15px] font-light leading-[1.7] resize-none min-h-[90px] placeholder:text-text-tertiary"
            placeholder="Write anything. What did you do. What stopped you. What you felt. No rules here..."
            rows={6}
          ></textarea>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || !text.trim()}
          className="mt-2.5 w-full bg-accent hover:bg-accent/90 border border-accent rounded-lg p-3 text-bg font-sans text-[14px] font-bold tracking-[0.5px] cursor-pointer transition-all duration-150 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Entry'}
        </button>
      </motion.div>

      <AnimatePresence>
        {journals.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="px-6 mb-3 flex items-center justify-between mt-2">
              <span className="text-[11px] tracking-[1.5px] uppercase text-text-tertiary font-medium">Past Entries</span>
            </div>
            <div className="mx-6 flex flex-col gap-2.5 pb-4">
              <AnimatePresence>
                {journals.map((journal, index) => (
                  <motion.div 
                    key={journal.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-surface border border-border rounded-xl p-4 group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] text-text-tertiary font-medium uppercase tracking-wider">
                        {journal.date}
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditing(journal)} className="text-text-tertiary hover:text-accent transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(journal.id)} className="text-text-tertiary hover:text-red transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {editingId === journal.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea 
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-surface-raised border border-accent rounded-lg p-3 text-text-primary text-[14px] outline-none min-h-[80px]"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingId(null)} className="text-text-tertiary text-xs font-bold uppercase px-3 py-1">Cancel</button>
                          <button onClick={() => handleUpdate(journal.id)} className="bg-accent text-bg text-xs font-bold uppercase px-3 py-1 rounded">Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[14px] text-text-secondary font-light leading-relaxed whitespace-pre-wrap">
                        {journal.text}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="h-24"></div>

      <ConfirmationModal
        isOpen={!!entryToDelete}
        title="Delete Journal Entry?"
        message="This entry will be permanently removed from your history. Are you sure?"
        onConfirm={confirmDelete}
        onCancel={() => setEntryToDelete(null)}
      />
    </motion.div>
  );
}
