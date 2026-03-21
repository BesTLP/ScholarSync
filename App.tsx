
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import FacultyMatcher from './components/FacultyMatcher';
import Dashboard from './components/Dashboard';
import ClientArchives from './components/ClientArchives';
import ClientDetail from './components/ClientDetail';
import MyWorks from './components/MyWorks';
import FreeWriteWorkbench from './components/FreeWriteWorkbench';
import EssayAgentEntry from './components/EssayAgentEntry';
import PSWorkbench from './components/PSWorkbench';
import PromptEssayWorkbench from './components/PromptEssayWorkbench';
import CVWorkbench from './components/CVWorkbench';
import LORWorkbench from './components/LORWorkbench';
import AIShieldWorkbench from './components/AIShieldWorkbench';
import CreateClientModal from './components/CreateClientModal';
import FacultyDatabase from './components/FacultyDatabase';
import ChatBot from './components/ChatBot';
import { TabId } from './components/Sidebar';
import { Construction, MessageCircle, GripHorizontal, Minimize2, Maximize2, X } from 'lucide-react';
import { Client, FacultyRecord, FacultyMember, FacultyMatch, MatcherSearchFilters, SourceMode, RecommendationOrigin, MentorEvaluationSnapshot, MentorRecommendation } from './types';
import { buildFacultyRecordFromMember, migrateFacultyDatabase, normalizeFacultyRecord, upsertFacultyRecord } from './services/facultyNormalization';
import { readPersistedValue, removePersistedValue, writePersistedValue } from './services/persistentStorage';
import { buildMatcherFiltersFromClient, migrateClients, syncClientSelectionProfile } from './services/selectionProfile';

const ComingSoon = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-6">
      <Construction size={40} />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">{title} 正在开发中</h2>
    <p className="text-gray-500 max-w-md">
      我们正在全力打造这个功能，旨在为您提供更智能的留学文书服务。敬请期待！
    </p>
  </div>
);

const localStorage = {
  getItem(key: string) {
    const value = readPersistedValue<unknown | null>(key, null);
    if (value === null || typeof value === 'undefined') {
      return null;
    }
    return typeof value === 'string' ? value : JSON.stringify(value);
  },
  setItem(key: string, value: string) {
    try {
      writePersistedValue(key, JSON.parse(value));
    } catch {
      writePersistedValue(key, value);
    }
  },
  removeItem(key: string) {
    removePersistedValue(key);
  },
};

function App() {
  const buildDefaultClients = (): Client[] =>
    migrateClients([
      { id: '1', name: '段同学', status: 'active', createdAt: '2026-02-21', advisor: '未分配', contact: '暂无联系方式' },
      { id: '2', name: '李同学 - 斯坦福申请', status: 'active', createdAt: '2024-03-15', advisor: '王老师' },
    ]);

  // Initialize state from localStorage or defaults
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try {
      return (localStorage.getItem('scholarsync_activeTab') as TabId) || 'dashboard';
    } catch (e) {
      console.error('LocalStorage access failed:', e);
      return 'dashboard';
    }
  });

  const [previousTab, setPreviousTab] = useState<TabId>('users');

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const savedClients = localStorage.getItem('scholarsync_clients');
      return savedClients ? migrateClients(JSON.parse(savedClients)) : buildDefaultClients();
    } catch (e) {
      console.error('LocalStorage access failed:', e);
      return buildDefaultClients();
    }
  });

  const [facultyDatabase, setFacultyDatabase] = useState<FacultyRecord[]>(() => {
    try {
      const savedDB = localStorage.getItem('scholarsync_faculty_db');
      return savedDB ? migrateFacultyDatabase(JSON.parse(savedDB)) : [];
    } catch (e) {
      console.error('LocalStorage access failed:', e);
      return [];
    }
  });

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<{ id: string; content: string; type: string; title: string } | null>(null);
  const [clientDetailInitialTab, setClientDetailInitialTab] = useState<'profile' | 'documents' | 'mentors'>('profile');
  const [facultyDbContext, setFacultyDbContext] = useState<{
    clientId: string;
    filters?: MatcherSearchFilters;
  } | null>(null);

  // ChatBot State
  const [showChatBot, setShowChatBot] = useState(false);
  const [isChatBotMinimized, setIsChatBotMinimized] = useState(false);
  const [chatBotPosition, setChatBotPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 650 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = React.useRef({ x: 0, y: 0 });
  const chatBotRef = React.useRef<HTMLDivElement>(null);

  // Persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem('scholarsync_activeTab', activeTab);
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('scholarsync_clients', JSON.stringify(clients));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [clients]);

  useEffect(() => {
    try {
      localStorage.setItem('scholarsync_faculty_db', JSON.stringify(facultyDatabase));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [facultyDatabase]);

  const handleTabChange = (tab: TabId) => {
    if (tab === 'users') {
      setSelectedClient(null);
      setClientDetailInitialTab('profile');
    }
    if (tab !== 'faculty-db') {
      setFacultyDbContext(null);
    }
    setActiveTab(tab);
  };

  const navigateToWorkbench = (tab: TabId) => {
    setPreviousTab(activeTab);
    setActiveTab(tab);
  };

  const handleWorkbenchBack = () => {
    setEditingDocument(null);
    setActiveTab(previousTab || 'dashboard');
  };

  const upsertSelectedClient = (client: Client | null) => {
    setSelectedClient(client ? syncClientSelectionProfile(client) : null);
  };

  const normalizeClient = (client: Client) => syncClientSelectionProfile(client);

  const addClient = (clientData: Partial<Client> & { name: string }) => {
    const newClient = normalizeClient({
      id: Math.random().toString(36).substr(2, 9),
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      advisor: '未分配',
      contact: '暂无联系方式',
      mentorRecommendations: [],
      ...clientData
    } as Client);
    setClients((prev) => [...prev, newClient]);
    return newClient;
  };

  const batchAddClients = (newClients: Client[]) => {
    console.log('App: Batch adding clients', newClients.length);
    const processedClients = newClients.map((client) =>
      normalizeClient({
        ...client,
        id: client.id || Math.random().toString(36).substr(2, 9),
      } as Client),
    );

    setClients(prev => {
      const clientMap = new Map(prev.map(c => [c.id, c]));
      processedClients.forEach(c => {
        clientMap.set(c.id, c);
      });
      const result = Array.from(clientMap.values());
      console.log('App: Total clients after batch add', result.length);
      return result;
    });
  };

  const updateClient = (updatedClient: Client) => {
    const normalized = normalizeClient(updatedClient);
    setClients((prev) => prev.map((client) => (client.id === normalized.id ? normalized : client)));
    if (selectedClient?.id === normalized.id) {
      upsertSelectedClient(normalized);
    }
  };

  const deleteClient = (clientId: string) => {
    console.log('App: Deleting client', clientId);
    window.alert('正在删除客户: ' + clientId);
    setClients(prev => {
      const filtered = prev.filter(c => c.id !== clientId);
      console.log('App: Clients after deletion', filtered.length);
      return filtered;
    });
    
    setFacultyDatabase(prev => prev.map(f => ({
      ...f,
      linkedClientIds: f.linkedClientIds?.filter(id => id !== clientId) || []
    })));

    upsertSelectedClient(selectedClient?.id === clientId ? null : selectedClient);
  };

  // Faculty Database Operations
  const addFacultyToDatabase = (faculty: FacultyMember, manualCountry?: string, manualField?: string, extra?: Partial<FacultyRecord>): string => {
    const incomingRecord = buildFacultyRecordFromMember(faculty, {
      manualCountry,
      manualField,
      extra,
    });

    const result = upsertFacultyRecord(facultyDatabase, incomingRecord);
    setFacultyDatabase(result.records);
    return result.id;
  };

  const importFacultyRecords = (records: FacultyRecord[]) => {
    const summary = {
      createdFacultyCount: 0,
      mergedFacultyCount: 0,
      appendedProjectCount: 0,
    };

    let next = facultyDatabase;
    for (const record of records) {
      const result = upsertFacultyRecord(next, record);
      next = result.records;
      if (result.created) {
        summary.createdFacultyCount += 1;
      } else if (result.merged) {
        summary.mergedFacultyCount += 1;
      }
      summary.appendedProjectCount += result.appendedProjectCount;
    }
    
    setFacultyDatabase(next);
    return summary;
  };

  const syncWebResultsToDatabase = (
    facultyMembers: FacultyMember[],
    defaults?: { country?: string; fieldCategory?: string },
  ) => {
    const summary = {
      createdFacultyCount: 0,
      mergedFacultyCount: 0,
      appendedProjectCount: 0,
    };

    setFacultyDatabase((prev) => {
      let next = prev;
      for (const faculty of facultyMembers) {
        const incomingRecord = buildFacultyRecordFromMember(faculty, {
          manualCountry: defaults?.country,
          manualField: defaults?.fieldCategory,
          extra: { source: 'search' },
        });
        const result = upsertFacultyRecord(next, incomingRecord);
        next = result.records;
        if (result.created) {
          summary.createdFacultyCount += 1;
        } else if (result.merged) {
          summary.mergedFacultyCount += 1;
        }
        summary.appendedProjectCount += result.appendedProjectCount;
      }
      return next;
    });

    return summary;
  };

  const updateFacultyRecord = (id: string, updates: Partial<FacultyRecord>) => {
    setFacultyDatabase(prev => prev.map(f => {
      if (f.id !== id) {
        return f;
      }

      return normalizeFacultyRecord({
        ...f,
        ...updates,
        id: f.id,
        addedAt: f.addedAt,
        updatedAt: new Date().toISOString(),
        linkedClientIds: updates.linkedClientIds || f.linkedClientIds,
        projects: updates.projects || f.projects,
        legacy: updates.legacy || f.legacy,
        raw: updates.raw || f.raw,
      });
    }));
  };

  const deleteFacultyRecord = (id: string) => {
    // 1. Remove from database
    setFacultyDatabase(prev => prev.filter(f => f.id !== id));
    
    // 2. Remove references from clients
    setClients(prev => prev.map(client => {
      if (client.linkedFacultyIds?.includes(id)) {
        return {
          ...client,
          linkedFacultyIds: client.linkedFacultyIds.filter(fid => fid !== id),
          mentorRecommendations: (client.mentorRecommendations || []).filter((item) => item.facultyId !== id),
        };
      }
      return client;
    }));
    
    // Update selected client if needed
    upsertSelectedClient((() => {
      if (selectedClient?.linkedFacultyIds?.includes(id)) {
        return {
          ...selectedClient,
          linkedFacultyIds: selectedClient.linkedFacultyIds.filter(fid => fid !== id),
          mentorRecommendations: (selectedClient.mentorRecommendations || []).filter((item) => item.facultyId !== id),
        };
      }
      return selectedClient;
    })() as Client | null);
  };

  const createRecommendation = (
    facultyId: string,
    sourceModes: SourceMode[],
    addedFrom: RecommendationOrigin,
    evaluation: MentorEvaluationSnapshot | undefined,
    current: MentorRecommendation[] | undefined,
  ): MentorRecommendation[] => {
    const existing = current?.find((item) => item.facultyId === facultyId);
    const next: MentorRecommendation = existing
      ? {
          ...existing,
          sourceModes: Array.from(new Set([...(existing.sourceModes || []), ...sourceModes])) as SourceMode[],
          addedFrom,
          evaluation: evaluation || existing.evaluation,
        }
      : {
          facultyId,
          addedAt: new Date().toISOString(),
          addedFrom,
          sourceModes,
          evaluation,
        };

    return [...(current || []).filter((item) => item.facultyId !== facultyId), next];
  };

  const linkFacultyToClient = (
    facultyId: string,
    clientId: string,
    options?: { sourceModes?: SourceMode[]; addedFrom?: RecommendationOrigin; evaluation?: MentorEvaluationSnapshot },
  ) => {
    const sourceModes = (options?.sourceModes && options.sourceModes.length > 0 ? options.sourceModes : ['local']) as SourceMode[];
    const addedFrom = options?.addedFrom || 'manual';
    const evaluation = options?.evaluation;

    // 1. Update Faculty Record
    setFacultyDatabase(prev => prev.map(f => {
      if (f.id === facultyId) {
        const currentLinks = f.linkedClientIds || [];
        if (!currentLinks.includes(clientId)) {
          return { ...f, linkedClientIds: [...currentLinks, clientId] };
        }
      }
      return f;
    }));

    // 2. Update Client Record
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const currentLinks = c.linkedFacultyIds || [];
        if (!currentLinks.includes(facultyId)) {
          return {
            ...c,
            linkedFacultyIds: [...currentLinks, facultyId],
            mentorRecommendations: createRecommendation(facultyId, sourceModes, addedFrom, evaluation, c.mentorRecommendations),
          };
        }
        return {
          ...c,
          mentorRecommendations: createRecommendation(facultyId, sourceModes, addedFrom, evaluation, c.mentorRecommendations),
        };
      }
      return c;
    }));

    // Update selected client if needed
    upsertSelectedClient(
      selectedClient?.id === clientId
        ? normalizeClient({
            ...selectedClient,
            linkedFacultyIds: Array.from(new Set([...(selectedClient.linkedFacultyIds || []), facultyId])),
            mentorRecommendations: createRecommendation(facultyId, sourceModes, addedFrom, evaluation, selectedClient.mentorRecommendations),
          } as Client)
        : selectedClient,
    );
  };

  const unlinkFacultyFromClient = (facultyId: string, clientId: string) => {
    // 1. Update Faculty Record
    setFacultyDatabase(prev => prev.map(f => {
      if (f.id === facultyId) {
        return { ...f, linkedClientIds: (f.linkedClientIds || []).filter(cid => cid !== clientId) };
      }
      return f;
    }));

    // 2. Update Client Record
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          linkedFacultyIds: (c.linkedFacultyIds || []).filter(fid => fid !== facultyId),
          mentorRecommendations: (c.mentorRecommendations || []).filter((item) => item.facultyId !== facultyId),
        };
      }
      return c;
    }));

    // Update selected client if needed
    upsertSelectedClient(
      selectedClient?.id === clientId
        ? normalizeClient({
            ...selectedClient,
            linkedFacultyIds: (selectedClient.linkedFacultyIds || []).filter((id) => id !== facultyId),
            mentorRecommendations: (selectedClient.mentorRecommendations || []).filter((item) => item.facultyId !== facultyId),
          } as Client)
        : selectedClient,
    );
  };

  const batchAddFacultyToDatabase = (items: FacultyRecord[]) => {
    setFacultyDatabase(prev => [...prev, ...items]);
  };

  const batchUpdateFacultyRecords = (ids: string[], updates: Partial<FacultyRecord>) => {
    setFacultyDatabase(prev => prev.map(f => 
      ids.includes(f.id) ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
    ));
  };

  const saveDocument = (clientId: string, document: { id?: string; title: string; type: string; content: string }) => {
    let newId = document.id;
    const updatedClients = clients.map(c => {
      if (c.id === clientId) {
        let updatedDocs;
        const existingDocIndex = c.documents?.findIndex(d => d.id === document.id);

        if (document.id && existingDocIndex !== undefined && existingDocIndex !== -1) {
          // Update existing
          updatedDocs = [...(c.documents || [])];
          updatedDocs[existingDocIndex] = {
            ...updatedDocs[existingDocIndex],
            title: document.title,
            content: document.content,
            updatedAt: new Date().toISOString()
          };
        } else {
          // Create new
          newId = Math.random().toString(36).substr(2, 9);
          const newDoc = {
            id: newId,
            title: document.title,
            type: document.type,
            content: document.content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          updatedDocs = [...(c.documents || []), newDoc];
        }

        const updatedClient = {
          ...c,
          documents: updatedDocs,
          documentCount: updatedDocs.length
        };
        
        if (selectedClient?.id === clientId) {
          setSelectedClient(updatedClient);
        }
        return updatedClient;
      }
      return c;
    });
    setClients(updatedClients);
    return newId;
  };

  // Drag Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - chatBotPosition.x,
      y: e.clientY - chatBotPosition.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setChatBotPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="h-full w-full relative">
        {/* Detail View: ClientDetail (Conditional) */}
        {activeTab === 'users' && selectedClient && (
          <div className="absolute inset-0 z-20 bg-[#F7F8FA]">
            <ClientDetail 
              client={selectedClient} 
              onBack={() => {
                setSelectedClient(null);
                setActiveTab(previousTab || 'users');
              }} 
              initialTab={clientDetailInitialTab}
              onStartWriting={(type) => {
                const tabMap: Record<string, TabId> = {
                  '文书Agent': 'agent',
                  '写PS': 'ps',
                  '写命题文书': 'essay',
                  '写推荐信': 'lor',
                  '写CV': 'cv',
                  '自由创作': 'freewrite'
                };
                if (type) {
                  setActiveTab(tabMap[type] || 'freewrite');
                } else {
                  setActiveTab('freewrite');
                }
              }}
              onEditDocument={(doc) => {
                const typeMap: Record<string, TabId> = {
                  'PS': 'ps',
                  'Essay': 'essay',
                  'LOR': 'lor',
                  'CV': 'cv',
                  'Free Writing': 'freewrite'
                };
                setEditingDocument({
                  id: doc.id,
                  content: doc.content,
                  type: doc.type,
                  title: doc.title
                });
                setActiveTab(typeMap[doc.type] || 'freewrite');
              }}
              onUpdateClient={updateClient}
              onDeleteClient={deleteClient}
              facultyDatabase={facultyDatabase}
              onLinkFacultyToClient={linkFacultyToClient}
              onUnlinkFacultyFromClient={unlinkFacultyFromClient}
            />
          </div>
        )}

        {/* Main Tabs (Keep-Alive) */}
        <div className={activeTab === 'dashboard' ? 'block h-full' : 'hidden'}>
          <Dashboard 
            onTabChange={setActiveTab} 
            clients={clients} 
            onSelectClient={(c) => { 
              setPreviousTab(activeTab);
              setSelectedClient(c); 
              setClientDetailInitialTab('profile'); 
              setActiveTab('users'); 
            }} 
            onUpdateClient={updateClient}
          />
        </div>

        <div className={activeTab === 'faculty-matcher' ? 'block h-full' : 'hidden'}>
          <FacultyMatcher 
            clients={clients}
            selectedClient={selectedClient}
            facultyDatabase={facultyDatabase}
            onAddFacultyToDatabase={addFacultyToDatabase}
            onLinkFacultyToClient={linkFacultyToClient}
            onUpdateClient={updateClient}
            onAddClient={(name, parsedData) => addClient({ name, ...parsedData })}
          />
        </div>

        <div className={activeTab === 'faculty-db' ? 'block h-full' : 'hidden'}>
          <FacultyDatabase 
            facultyDatabase={facultyDatabase}
            clients={clients}
            onAddFaculty={addFacultyToDatabase}
            onBatchAddFaculty={batchAddFacultyToDatabase}
            onImportFacultyRecords={importFacultyRecords}
            onUpdateFaculty={updateFacultyRecord}
            onBatchUpdateFaculty={batchUpdateFacultyRecords}
            onDeleteFaculty={deleteFacultyRecord}
            onLinkFaculty={linkFacultyToClient}
            onUnlinkFaculty={unlinkFacultyFromClient}
          />
        </div>

        <div className={activeTab === 'users' && !selectedClient ? 'block h-full' : 'hidden'}>
          <ClientArchives 
            clients={clients} 
            onAddClient={(name, parsedData) => addClient({ name, ...parsedData })} 
            onBatchAddClients={batchAddClients}
            onSelectClient={(c) => { 
              setPreviousTab(activeTab);
              setSelectedClient(c); 
              setClientDetailInitialTab('profile'); 
            }} 
            onUpdateClient={updateClient}
            onDeleteClient={deleteClient}
            onRestoreClient={(id) => {
              const client = clients.find(c => c.id === id);
              if (client) updateClient({ ...client, status: 'active' });
            }}
          />
        </div>

        <div className={activeTab === 'projects' ? 'block h-full' : 'hidden'}>
          <MyWorks 
            clients={clients} 
            onCreateNew={() => setActiveTab('freewrite')} 
            onEditDocument={(doc) => {
              const typeMap: Record<string, TabId> = {
                'PS': 'ps',
                'Essay': 'essay',
                'LOR': 'lor',
                'CV': 'cv',
                'Free Writing': 'freewrite'
              };
              setEditingDocument({
                id: doc.id,
                content: doc.content,
                type: doc.type,
                title: doc.title
              });
              // Find client for this doc to set selectedClient
              const client = clients.find(c => c.documents?.some(d => d.id === doc.id));
              if (client) {
                setPreviousTab(activeTab);
                setSelectedClient(client);
              }
              
              setActiveTab(typeMap[doc.type] || 'freewrite');
            }}
            onTabChange={setActiveTab}
          />
        </div>

        <div className={activeTab === 'agent' ? 'block h-full' : 'hidden'}>
          <EssayAgentEntry 
            clients={clients} 
            onAddClient={(name, parsedData) => addClient({ name, ...parsedData })} 
            onSelectClient={(client) => {
              setPreviousTab(activeTab);
              setSelectedClient(client);
              setClientDetailInitialTab('documents');
              setActiveTab('users');
            }} 
          />
        </div>

        <div className={activeTab === 'ps' ? 'block h-full' : 'hidden'}>
          <PSWorkbench clients={clients} onAddClientClick={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'PS' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />
        </div>

        <div className={activeTab === 'essay' ? 'block h-full' : 'hidden'}>
          <PromptEssayWorkbench clients={clients} onAddClient={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'Essay' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />
        </div>

        <div className={activeTab === 'lor' ? 'block h-full' : 'hidden'}>
          <LORWorkbench clients={clients} onAddClient={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'LOR' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />
        </div>

        <div className={activeTab === 'cv' ? 'block h-full' : 'hidden'}>
          <CVWorkbench clients={clients} onAddClient={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'CV' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />
        </div>

        <div className={activeTab === 'freewrite' ? 'block h-full' : 'hidden'}>
          <FreeWriteWorkbench clients={clients} onTabChange={setActiveTab} onAddClientClick={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'Free Writing' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />
        </div>

        <div className={activeTab === 'ai-shield' ? 'block h-full' : 'hidden'}>
          <AIShieldWorkbench clients={clients} onSaveDocument={saveDocument} initialClientId={selectedClient?.id} onBack={() => setActiveTab('users')} />
        </div>

        <div className={activeTab === 'share' ? 'block h-full' : 'hidden'}>
          <ComingSoon title="推广合作" />
        </div>

        <div className={activeTab === 'settings' ? 'block h-full' : 'hidden'}>
          <ComingSoon title="设置" />
        </div>
      </div>

      <CreateClientModal 
        isOpen={isCreateClientModalOpen}
        onClose={() => setIsCreateClientModalOpen(false)}
        onConfirm={(name, parsedData) => addClient({ name, ...parsedData })}
      />

      {/* Floating AI Assistant */}
      {!showChatBot && (
        <button 
          onClick={() => setShowChatBot(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-green-500 text-white rounded-full shadow-2xl shadow-green-200 flex items-center justify-center hover:scale-110 transition-transform z-50"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Draggable ChatBot Window */}
      {showChatBot && (
        <div 
          ref={chatBotRef}
          style={{ 
            position: 'fixed', 
            left: chatBotPosition.x, 
            top: chatBotPosition.y,
            width: isChatBotMinimized ? '300px' : '400px',
            height: isChatBotMinimized ? 'auto' : '600px',
            zIndex: 100
          }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-200"
        >
          {/* Draggable Header */}
          <div 
            onMouseDown={handleMouseDown}
            className="h-10 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-4 cursor-move select-none"
          >
            <div className="flex items-center space-x-2 text-gray-500">
              <GripHorizontal size={16} />
              <span className="text-xs font-bold">学术助手</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsChatBotMinimized(!isChatBotMinimized)}
                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
              >
                {isChatBotMinimized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button 
                onClick={() => setShowChatBot(false)}
                className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* ChatBot Content */}
          {!isChatBotMinimized && (
            <div className="flex-1 overflow-hidden">
              <ChatBot />
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

export default App;
