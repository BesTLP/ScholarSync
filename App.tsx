
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
import { TabId } from './components/Sidebar';
import { Client, FacultyRecord, FacultyMember } from './types';
import { Construction } from 'lucide-react';

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

function App() {
  // Initialize state from localStorage or defaults
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    try {
      return (localStorage.getItem('scholarsync_activeTab') as TabId) || 'dashboard';
    } catch (e) {
      console.error('LocalStorage access failed:', e);
      return 'dashboard';
    }
  });

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const savedClients = localStorage.getItem('scholarsync_clients');
      return savedClients ? JSON.parse(savedClients) : [
        { id: '1', name: '段', status: 'active', createdAt: '2026/02/21', advisor: '未分配', contact: '暂无联系方式' },
        { id: '2', name: '李同学 - 斯坦福申请', status: 'active', createdAt: '2024-03-15', advisor: '王老师' },
      ];
    } catch (e) {
      console.error('LocalStorage access failed:', e);
      return [
        { id: '1', name: '段', status: 'active', createdAt: '2026/02/21', advisor: '未分配', contact: '暂无联系方式' },
        { id: '2', name: '李同学 - 斯坦福申请', status: 'active', createdAt: '2024-03-15', advisor: '王老师' },
      ];
    }
  });

  const [facultyDatabase, setFacultyDatabase] = useState<FacultyRecord[]>(() => {
    try {
      const savedDB = localStorage.getItem('scholarsync_faculty_db');
      return savedDB ? JSON.parse(savedDB) : [];
    } catch (e) {
      console.error('LocalStorage access failed:', e);
      return [];
    }
  });

  const [selectedClient, setSelectedClient] = useState<Client | null>(() => {
    try {
      const savedClientId = localStorage.getItem('scholarsync_selectedClientId');
      if (savedClientId) {
        const savedClientsStr = localStorage.getItem('scholarsync_clients');
        const initialClients = savedClientsStr ? JSON.parse(savedClientsStr) : [
          { id: '1', name: '段', status: 'active', createdAt: '2026/02/21', advisor: '未分配', contact: '暂无联系方式' },
          { id: '2', name: '李同学 - 斯坦福申请', status: 'active', createdAt: '2024-03-15', advisor: '王老师' },
        ];
        return initialClients.find((c: Client) => c.id === savedClientId) || null;
      }
    } catch (e) {
      console.error('LocalStorage access failed:', e);
    }
    return null;
  });

  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<{ id: string; content: string; type: string; title: string } | null>(null);
  const [clientDetailInitialTab, setClientDetailInitialTab] = useState<'profile' | 'documents'>('profile');

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

  useEffect(() => {
    try {
      if (selectedClient) {
        localStorage.setItem('scholarsync_selectedClientId', selectedClient.id);
      } else {
        localStorage.removeItem('scholarsync_selectedClientId');
      }
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [selectedClient]);

  const addClient = (clientData: Partial<Client> & { name: string }) => {
    const newClient: Client = {
      id: Math.random().toString(36).substr(2, 9),
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      advisor: '未分配',
      contact: '暂无联系方式',
      ...clientData
    };
    setClients([...clients, newClient]);
  };

  const updateClient = (updatedClient: Client) => {
    setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
    if (selectedClient?.id === updatedClient.id) {
      setSelectedClient(updatedClient);
    }
  };

  // Faculty Database Operations
  const addFacultyToDatabase = (faculty: FacultyMember, country: string, fieldCategory: string): string => {
    // Check for duplicates (Name + University)
    const existing = facultyDatabase.find(f => 
      f.name.toLowerCase() === faculty.name.toLowerCase() && 
      f.university.toLowerCase() === faculty.university.toLowerCase()
    );

    if (existing) {
      // Update existing
      const updatedRecord: FacultyRecord = {
        ...existing,
        ...faculty, // Overwrite with new data
        updatedAt: new Date().toISOString(),
        source: 'search'
      };
      setFacultyDatabase(facultyDatabase.map(f => f.id === existing.id ? updatedRecord : f));
      return existing.id;
    }

    const newId = crypto.randomUUID();
    const newRecord: FacultyRecord = {
      ...faculty,
      id: newId,
      country,
      fieldCategory,
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'search',
      linkedClientIds: []
    };
    setFacultyDatabase([...facultyDatabase, newRecord]);
    return newId;
  };

  const updateFacultyRecord = (id: string, updates: Partial<FacultyRecord>) => {
    setFacultyDatabase(facultyDatabase.map(f => 
      f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
    ));
  };

  const deleteFacultyRecord = (id: string) => {
    // 1. Remove from database
    setFacultyDatabase(facultyDatabase.filter(f => f.id !== id));
    
    // 2. Remove references from clients
    const updatedClients = clients.map(client => {
      if (client.linkedFacultyIds?.includes(id)) {
        return {
          ...client,
          linkedFacultyIds: client.linkedFacultyIds.filter(fid => fid !== id)
        };
      }
      return client;
    });
    setClients(updatedClients);
    
    // Update selected client if needed
    if (selectedClient && selectedClient.linkedFacultyIds?.includes(id)) {
      setSelectedClient({
        ...selectedClient,
        linkedFacultyIds: selectedClient.linkedFacultyIds?.filter(fid => fid !== id)
      });
    }
  };

  const linkFacultyToClient = (facultyId: string, clientId: string) => {
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
    const updatedClients = clients.map(c => {
      if (c.id === clientId) {
        const currentLinks = c.linkedFacultyIds || [];
        if (!currentLinks.includes(facultyId)) {
          return { ...c, linkedFacultyIds: [...currentLinks, facultyId] };
        }
      }
      return c;
    });
    setClients(updatedClients);

    // Update selected client if needed
    if (selectedClient?.id === clientId) {
      const currentLinks = selectedClient.linkedFacultyIds || [];
      if (!currentLinks.includes(facultyId)) {
        setSelectedClient({ ...selectedClient, linkedFacultyIds: [...currentLinks, facultyId] });
      }
    }
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
    const updatedClients = clients.map(c => {
      if (c.id === clientId) {
        return { ...c, linkedFacultyIds: (c.linkedFacultyIds || []).filter(fid => fid !== facultyId) };
      }
      return c;
    });
    setClients(updatedClients);

    // Update selected client if needed
    if (selectedClient?.id === clientId) {
      setSelectedClient({
        ...selectedClient,
        linkedFacultyIds: (selectedClient.linkedFacultyIds || []).filter(fid => fid !== facultyId)
      });
    }
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

  const renderContent = () => {
    if (activeTab === 'users' && selectedClient) {
      return (
        <ClientDetail 
          client={selectedClient} 
          onBack={() => setSelectedClient(null)} 
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
          facultyDatabase={facultyDatabase}
          onLinkFacultyToClient={linkFacultyToClient}
          onUnlinkFacultyFromClient={unlinkFacultyFromClient}
          onTabChange={setActiveTab}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onTabChange={setActiveTab} clients={clients} onSelectClient={(c) => { setSelectedClient(c); setClientDetailInitialTab('profile'); setActiveTab('users'); }} />;
      case 'faculty-matcher':
        return (
          <FacultyMatcher 
            clients={clients}
            selectedClient={selectedClient}
            facultyDatabase={facultyDatabase}
            onAddFacultyToDatabase={addFacultyToDatabase}
            onLinkFacultyToClient={linkFacultyToClient}
            onUpdateClient={updateClient}
          />
        );
      case 'faculty-db':
        return (
          <FacultyDatabase 
            facultyDatabase={facultyDatabase}
            clients={clients}
            onAddFaculty={addFacultyToDatabase}
            onUpdateFaculty={updateFacultyRecord}
            onDeleteFaculty={deleteFacultyRecord}
            onLinkFaculty={linkFacultyToClient}
            onUnlinkFaculty={unlinkFacultyFromClient}
          />
        );
      case 'users':
        return <ClientArchives clients={clients} onAddClient={(name, parsedData) => addClient({ name, ...parsedData })} onSelectClient={(c) => { setSelectedClient(c); setClientDetailInitialTab('profile'); }} />;
      case 'projects':
        return (
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
              if (client) setSelectedClient(client);
              
              setActiveTab(typeMap[doc.type] || 'freewrite');
            }}
            onTabChange={setActiveTab}
          />
        );
      case 'agent':
        return (
          <EssayAgentEntry 
            clients={clients} 
            onAddClient={(name, parsedData) => addClient({ name, ...parsedData })} 
            onSelectClient={(client) => {
              setSelectedClient(client);
              setClientDetailInitialTab('documents');
              setActiveTab('users');
            }} 
          />
        );
      case 'ps':
        return <PSWorkbench clients={clients} onAddClientClick={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'PS' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />;
      case 'essay':
        return <PromptEssayWorkbench clients={clients} onAddClient={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'Essay' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />;
      case 'lor':
        return <LORWorkbench clients={clients} onAddClient={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'LOR' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />;
      case 'cv':
        return <CVWorkbench clients={clients} onAddClient={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'CV' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />;
      case 'freewrite':
        return <FreeWriteWorkbench clients={clients} onTabChange={setActiveTab} onAddClientClick={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'Free Writing' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} initialClientId={selectedClient?.id} />;
      case 'ai-shield':
        return <AIShieldWorkbench clients={clients} onSaveDocument={saveDocument} initialClientId={selectedClient?.id} onBack={() => setActiveTab('users')} />;
      case 'settings':
        return <ComingSoon title="设置" />;
      default:
        return <Dashboard onTabChange={setActiveTab} clients={clients} onSelectClient={(c) => { setSelectedClient(c); setClientDetailInitialTab('profile'); setActiveTab('users'); }} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
      <CreateClientModal 
        isOpen={isCreateClientModalOpen}
        onClose={() => setIsCreateClientModalOpen(false)}
        onConfirm={(name, parsedData) => addClient({ name, ...parsedData })}
      />
    </Layout>
  );
}

export default App;
