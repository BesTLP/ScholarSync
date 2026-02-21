
import React, { useState } from 'react';
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
import { TabId } from './components/Sidebar';
import { Client } from './types';
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
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<{ id: string; content: string; type: string; title: string } | null>(null);
  const [clients, setClients] = useState<Client[]>([
    { id: '1', name: '段', status: 'active', createdAt: '2026/02/21', advisor: '未分配', contact: '暂无联系方式' },
    { id: '2', name: '李同学 - 斯坦福申请', status: 'active', createdAt: '2024-03-15', advisor: '王老师' },
  ]);

  const addClient = (name: string) => {
    const newClient: Client = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      advisor: '未分配',
      contact: '暂无联系方式'
    };
    setClients([...clients, newClient]);
  };

  const updateClient = (updatedClient: Client) => {
    setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
    if (selectedClient?.id === updatedClient.id) {
      setSelectedClient(updatedClient);
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
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onTabChange={setActiveTab} clients={clients} onSelectClient={(c) => { setSelectedClient(c); setActiveTab('users'); }} />;
      case 'faculty-matcher':
        return (
          <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <FacultyMatcher />
          </div>
        );
      case 'users':
        return <ClientArchives clients={clients} onAddClient={addClient} onSelectClient={setSelectedClient} />;
      case 'projects':
        return <MyWorks clients={clients} onCreateNew={() => setActiveTab('freewrite')} />;
      case 'agent':
        return (
          <EssayAgentEntry 
            clients={clients} 
            onAddClient={addClient} 
            onSelectClient={(client) => {
              setSelectedClient(client);
              setActiveTab('users');
            }} 
          />
        );
      case 'ps':
        return <PSWorkbench clients={clients} onAddClientClick={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'PS' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} />;
      case 'essay':
        return <PromptEssayWorkbench clients={clients} onAddClient={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'Essay' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} />;
      case 'lor':
        return <LORWorkbench clients={clients} onAddClient={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'LOR' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} />;
      case 'cv':
        return <CVWorkbench clients={clients} onAddClient={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'CV' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} />;
      case 'freewrite':
        return <FreeWriteWorkbench clients={clients} onTabChange={setActiveTab} onAddClientClick={() => setIsCreateClientModalOpen(true)} onSaveDocument={saveDocument} initialDocument={editingDocument?.type === 'Free Writing' ? editingDocument : undefined} onBack={() => { setEditingDocument(null); setActiveTab('users'); }} />;
      case 'ai-shield':
        return <AIShieldWorkbench clients={clients} />;
      case 'settings':
        return <ComingSoon title="设置" />;
      default:
        return <Dashboard onTabChange={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
      <CreateClientModal 
        isOpen={isCreateClientModalOpen}
        onClose={() => setIsCreateClientModalOpen(false)}
        onConfirm={addClient}
      />
    </Layout>
  );
}

export default App;
