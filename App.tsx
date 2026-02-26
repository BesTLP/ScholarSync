
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
import { Client, FacultyRecord, FacultyMember } from './types';
import { Construction, MessageCircle, GripHorizontal, Minimize2, Maximize2, X } from 'lucide-react';

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

  const [previousTab, setPreviousTab] = useState<TabId>('users');

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

  const deleteClient = (clientId: string) => {
    // 1. Remove from clients
    setClients(prev => prev.filter(c => c.id !== clientId));
    
    // 2. Clean up faculty database links
    setFacultyDatabase(prev => prev.map(f => {
      if (f.linkedClientIds?.includes(clientId)) {
        return {
          ...f,
          linkedClientIds: f.linkedClientIds.filter(id => id !== clientId)
        };
      }
      return f;
    }));

    // 3. Clear selected client if it was the one deleted
    if (selectedClient?.id === clientId) {
      setSelectedClient(null);
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
      setFacultyDatabase(prev => prev.map(f => {
        if (f.id === existing.id) {
          return {
            ...f,
            ...faculty,
            updatedAt: new Date().toISOString(),
            source: 'search'
          };
        }
        return f;
      }));
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
    setFacultyDatabase(prev => [...prev, newRecord]);
    return newId;
  };

  const updateFacultyRecord = (id: string, updates: Partial<FacultyRecord>) => {
    setFacultyDatabase(facultyDatabase.map(f => 
      f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f
    ));
  };

  const deleteFacultyRecord = (id: string) => {
    // 1. Remove from database
    setFacultyDatabase(prev => prev.filter(f => f.id !== id));
    
    // 2. Remove references from clients
    setClients(prev => prev.map(client => {
      if (client.linkedFacultyIds?.includes(id)) {
        return {
          ...client,
          linkedFacultyIds: client.linkedFacultyIds.filter(fid => fid !== id)
        };
      }
      return client;
    }));
    
    // Update selected client if needed
    setSelectedClient(prev => {
      if (prev?.linkedFacultyIds?.includes(id)) {
        return {
          ...prev,
          linkedFacultyIds: prev.linkedFacultyIds.filter(fid => fid !== id)
        };
      }
      return prev;
    });
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
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const currentLinks = c.linkedFacultyIds || [];
        if (!currentLinks.includes(facultyId)) {
          return { ...c, linkedFacultyIds: [...currentLinks, facultyId] };
        }
      }
      return c;
    }));

    // Update selected client if needed
    setSelectedClient(prev => {
      if (prev?.id === clientId) {
        const currentLinks = prev.linkedFacultyIds || [];
        if (!currentLinks.includes(facultyId)) {
          return { ...prev, linkedFacultyIds: [...currentLinks, facultyId] };
        }
      }
      return prev;
    });
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
        return { ...c, linkedFacultyIds: (c.linkedFacultyIds || []).filter(fid => fid !== facultyId) };
      }
      return c;
    }));

    // Update selected client if needed
    setSelectedClient(prev => {
      if (prev?.id === clientId) {
        return {
          ...prev,
          linkedFacultyIds: (prev.linkedFacultyIds || []).filter(fid => fid !== facultyId)
        };
      }
      return prev;
    });
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

  const renderContent = () => {
    if (activeTab === 'users' && selectedClient) {
      return (
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
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            onTabChange={setActiveTab} 
            clients={clients} 
            onSelectClient={(c) => { 
              setPreviousTab(activeTab);
              setSelectedClient(c); 
              setClientDetailInitialTab('profile'); 
              setActiveTab('users'); 
            }} 
          />
        );
      case 'faculty-matcher':
        return (
          <FacultyMatcher 
            clients={clients}
            selectedClient={selectedClient}
            facultyDatabase={facultyDatabase}
            onAddFacultyToDatabase={addFacultyToDatabase}
            onLinkFacultyToClient={linkFacultyToClient}
            onUpdateClient={updateClient}
            onAddClient={(name, parsedData) => addClient({ name, ...parsedData })}
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
        return (
          <ClientArchives 
            clients={clients} 
            onAddClient={(name, parsedData) => addClient({ name, ...parsedData })} 
            onSelectClient={(c) => { 
              setPreviousTab(activeTab);
              setSelectedClient(c); 
              setClientDetailInitialTab('profile'); 
            }} 
            onUpdateClient={updateClient}
            onRestoreClient={(id) => {
              const client = clients.find(c => c.id === id);
              if (client) updateClient({ ...client, status: 'active' });
            }}
          />
        );
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
              if (client) {
                setPreviousTab(activeTab);
                setSelectedClient(client);
              }
              
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
              setPreviousTab(activeTab);
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
      case 'share':
        return <ComingSoon title="推广合作" />;
      case 'settings':
        return <ComingSoon title="设置" />;
      default:
        return (
          <Dashboard 
            onTabChange={setActiveTab} 
            clients={clients} 
            onSelectClient={(c) => { 
              setPreviousTab(activeTab);
              setSelectedClient(c); 
              setClientDetailInitialTab('profile'); 
              setActiveTab('users'); 
            }} 
          />
        );
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
